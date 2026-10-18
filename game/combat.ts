// Armes et SCAN ÉCHO (port de player.gd : fire, activate_scan ; world.gd : scan).
// D9 : tir automatique tant que la gâchette est tenue. ARC-3 : décharge électrique (énergie), étourdit et coupe
// le verrou électrique. SCAN ÉCHO : onde au sol, révèle les zones secrètes et marque objets et zombies pendant 5 s.
// Le moteur appelle update() à chaque image avec les commandes du joueur ; le rechargement reste dans engine.ts.
import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3, type Scene } from "three";
import { D9, type PlayerController } from "./player";
import type { SiloState } from "./state";
import type { Horde } from "./types";
import { rayDistance } from "./collision";
import { SCAN_NOISE, SCAN_RADIUS, SECRET } from "./level";
import type { WorldView } from "./render/world";
import type { OperatorRig } from "./render/operator";
import { CombatFx } from "./render/fx";

export interface CombatHost {
  scene: Scene;
  state: SiloState;
  player: PlayerController;
  operator: OperatorRig;
  horde: Horde;
  world: WorldView;
  notify(text: string): void;
  /** Propage un bruit aux zombies (tir, scan). */
  noise(x: number, z: number, radius: number): void;
  /** Dessine les marqueurs sur canvas. Par défaut : vrai si `document` existe (faux en tests). */
  visuals?: boolean;
}

export interface CombatInput {
  /** Gâchette maintenue (clic gauche, RT, bouton TIR). */
  firing: boolean;
  /** Décharge ARC-3 directe (clic droit, LT, bouton ARC). */
  arc: boolean;
  scan: boolean;
  weapon1: boolean;
  weapon2: boolean;
}

/** Caractéristiques reprises de data/weapons/*.tres. */
export const WEAPONS = {
  d9: { name: "D9 · SERVICE", damage: 28, stun: 0, cooldown: D9.cooldown, noise: D9.noiseRadius, reach: 70 },
  arc: { name: "ARC-3 · INDUCTION", damage: 39, stun: 2.3, energy: 12, cooldown: 0.52, noise: 16, reach: 22 },
} as const;

export const SCAN = { cooldown: 2.5, energy: 20, radius: SCAN_RADIUS, noise: SCAN_NOISE, markerTime: 5 } as const;

/** Distance au boîtier du verrou à laquelle la décharge le coupe. */
export const ARC_LOCK_RADIUS = 0.8;
/** Hauteur des tirs (main de l'opérateur). */
const SHOT_HEIGHT = 1.0;
/** Une pression ARC pendant la cadence d'une autre arme est gardée un court instant. */
const ARC_BUFFER = 0.3;

export interface ShotResult {
  /** Distance parcourue jusqu'au point d'impact. */
  distance: number;
  x: number;
  z: number;
  target: "zombie" | "wall" | "device" | "none";
  zombieId?: string;
}

export class Combat {
  /** 0 = D9, 1 = ARC-3. */
  weapon: 0 | 1 = 0;
  /** Temps avant le prochain SCAN ÉCHO. */
  scanCooldown = 0;
  /** Temps restant d'affichage des marqueurs d'écho. */
  markerTime = 0;
  /** Zombies marqués par le dernier scan (suivis à chaque image). */
  readonly markedZombies = new Set<string>();
  /** Objets marqués par le dernier scan. */
  readonly markedItems = new Set<string>();
  readonly fx: CombatFx;

  private flash: Mesh;
  private flashMaterial: MeshBasicMaterial;
  private flashTime = 0;
  private arcQueued = 0;
  private clock = 0;
  private lastNotice = new Map<string, number>();
  private readonly muzzle = new Vector3();
  private readonly hit = new Vector3();
  private readonly result: ShotResult = { distance: 0, x: 0, z: 0, target: "none" };

  constructor(private host: CombatHost) {
    this.flashMaterial = new MeshBasicMaterial({ color: "#ffe28a", transparent: true, opacity: 0.95, toneMapped: false });
    this.flash = new Mesh(new SphereGeometry(0.11, 8, 6), this.flashMaterial);
    this.flash.visible = false;
    this.flash.position.set(0, -0.36, 0.02);
    host.operator.gun.add(this.flash);
    this.fx = new CombatFx(host.visuals ?? typeof document !== "undefined", SCAN.radius);
    host.scene.add(this.fx.root);
  }

  update(dt: number, input: CombatInput): void {
    this.clock += dt;
    this.scanCooldown = Math.max(0, this.scanCooldown - dt);
    this.arcQueued = Math.max(0, this.arcQueued - dt);

    if (input.weapon1 && this.weapon !== 0) {
      this.weapon = 0;
      this.host.notify(WEAPONS.d9.name);
    }
    if (input.weapon2 && this.weapon !== 1) {
      this.weapon = 1;
      this.host.notify(WEAPONS.arc.name);
    }

    if (input.arc) this.arcQueued = ARC_BUFFER;
    if (this.arcQueued > 0 && this.fireArc()) this.arcQueued = 0;
    else if (input.firing) {
      if (this.weapon === 0) this.fireD9();
      else this.fireArc();
    }
    if (input.scan) this.scan();

    // Éclat du canon.
    this.flashTime = Math.max(0, this.flashTime - dt);
    this.flash.visible = this.flashTime > 0;
    if (this.flash.visible) this.flash.rotation.y += 2.1;
    this.updateMarkers(dt);
    this.fx.update(dt);
  }

  setLowQuality(low: boolean): void {
    this.fx.setLowQuality(low);
  }

  // ——— Armes ———

  /** Tir du D9 si la cadence le permet. Vrai si une balle part. */
  fireD9(): boolean {
    const { player, state } = this.host;
    if (player.cooldown > 0 || player.reloading) return false;
    if (!player.tryFire(() => state.fireRound())) {
      if (state.ammo === 0) this.notifyThrottled("Chargeur vide · R pour recharger", 1.5);
      return false;
    }
    const w = WEAPONS.d9;
    const shot = this.resolve(w.reach, false);
    if (shot.target === "zombie") this.host.horde.damage(shot.zombieId!, w.damage, w.stun);
    this.host.noise(player.x, player.z, w.noise);
    this.showShot(shot, false);
    return true;
  }

  /** Décharge de l'ARC-3, quelle que soit l'arme en main. Vrai si elle part. */
  fireArc(): boolean {
    const { player, state } = this.host;
    if (player.cooldown > 0 || player.reloading) return false;
    const w = WEAPONS.arc;
    if (!state.spendEnergy(w.energy)) {
      this.arcQueued = 0;
      this.notifyThrottled("Énergie insuffisante · borne de recharge ou cellule", 1.5);
      return false;
    }
    player.cooldown = w.cooldown;
    player.shotTime = 0.18;
    const shot = this.resolve(w.reach, true);
    if (shot.target === "zombie") {
      this.host.horde.damage(shot.zombieId!, w.damage, w.stun);
      this.host.notify("ÉLECTROCUTÉ");
    } else if (shot.target === "device") {
      state.addFact("arc_lock_disabled");
      state.remember("Le verrou ARC a été désactivé.");
      this.host.notify("Verrou électrique hors tension.");
    }
    this.host.noise(player.x, player.z, w.noise);
    this.showShot(shot, true);
    return true;
  }

  /**
   * Résout un tir sur le plan XZ depuis le joueur, dans la direction de son lacet : le plus proche
   * entre mur, zombie et (pour l'ARC) le boîtier du verrou électrique.
   */
  resolve(reach: number, arc: boolean): ShotResult {
    const { player, horde, world, state } = this.host;
    const dx = Math.sin(player.yaw);
    const dz = Math.cos(player.yaw);
    const r = this.result;
    r.zombieId = undefined;
    const wall = rayDistance(player.x, player.z, dx, dz, reach, world.colliders);
    let limit = wall;
    r.target = wall < reach ? "wall" : "none";
    if (arc && !state.facts.includes("arc_lock_disabled")) {
      const device = world.interactables.get("device")?.def;
      if (device) {
        // Entrée du rayon dans le disque de 0,8 m autour du boîtier (le boîtier lui-même est un obstacle).
        const ox = device.x - player.x;
        const oz = device.z - player.z;
        const along = ox * dx + oz * dz;
        const across = Math.abs(ox * dz - oz * dx);
        if (along > 0 && across <= ARC_LOCK_RADIUS) {
          const entry = Math.max(0, along - Math.sqrt(ARC_LOCK_RADIUS * ARC_LOCK_RADIUS - across * across));
          if (entry <= limit + 1e-6 && entry <= reach) {
            limit = Math.min(limit, Math.max(entry, Math.min(along, wall)));
            r.target = "device";
          }
        }
      }
    }
    const zombie = horde.raycast(player.x, player.z, dx, dz, limit);
    if (zombie && zombie.distance <= limit) {
      r.target = "zombie";
      r.zombieId = zombie.id;
      r.distance = zombie.distance;
      r.x = zombie.x;
      r.z = zombie.z;
      return r;
    }
    r.distance = limit;
    r.x = player.x + dx * limit;
    r.z = player.z + dz * limit;
    return r;
  }

  /** Visuels d'un tir : éclat, traçante ou éclair, impact. */
  private showShot(shot: ShotResult, arc: boolean): void {
    const { operator, player } = this.host;
    operator.gun.updateWorldMatrix(true, false);
    operator.gun.localToWorld(this.muzzle.set(0, -0.3, 0.02));
    // Repli si l'arme n'est pas encore placée (premier tir) : main devant l'opérateur.
    if (Math.hypot(this.muzzle.x - player.x, this.muzzle.z - player.z) > 1.5) {
      this.muzzle.set(player.x + Math.sin(player.yaw) * 0.5, SHOT_HEIGHT, player.z + Math.cos(player.yaw) * 0.5);
    }
    this.hit.set(shot.x, shot.target === "device" ? 0.9 : SHOT_HEIGHT, shot.z);
    this.flashMaterial.color.set(arc ? "#9ffcff" : "#ffe28a");
    this.flash.scale.setScalar(arc ? 1.5 : 1);
    this.flashTime = arc ? 0.1 : 0.06;
    this.fx.flash(this.muzzle, arc ? "#3fe6ff" : "#ffa94d", arc ? 5 : 3.5);
    if (arc) this.fx.bolt(this.muzzle, this.hit);
    else this.fx.tracer(this.muzzle, this.hit);
    if (shot.target !== "none") {
      const bx = -Math.sin(player.yaw);
      const bz = -Math.cos(player.yaw);
      this.fx.impact(this.hit.x, this.hit.y, this.hit.z, arc ? "arc" : shot.target === "zombie" ? "zombie" : "wall", bx, bz);
    }
  }

  // ——— SCAN ÉCHO ———

  /** Vrai si le scan part (cadence et énergie). */
  scan(): boolean {
    const { player, state, horde, world } = this.host;
    if (this.scanCooldown > 0) return false;
    if (!state.spendEnergy(SCAN.energy)) {
      this.host.notify("SCAN ÉCHO requiert 20 énergie · borne de recharge ou cellule");
      return false;
    }
    this.scanCooldown = SCAN.cooldown;
    this.host.notify("SCAN ÉCHO · signatures révélées");
    if (Math.hypot(player.x - SECRET.x, player.z - SECRET.z) <= SCAN.radius && state.revealSecret()) {
      this.host.notify("ÉCHO : un mur creux derrière les dortoirs. Une pièce cachée s'ouvre.");
    }
    this.host.noise(player.x, player.z, SCAN.noise);
    this.fx.scanWave(player.x, player.z);
    this.markerTime = SCAN.markerTime;
    this.markedItems.clear();
    this.markedZombies.clear();
    for (const view of world.interactables.values()) {
      const def = view.def;
      // La visibilité suit l'état : un objet révélé à l'instant n'apparaît qu'au prochain rafraîchissement.
      const visible = view.group.visible || (def.id === "keycard" && state.has("secret_revealed"));
      if (!visible || Math.hypot(def.x - player.x, def.z - player.z) > SCAN.radius) continue;
      this.markedItems.add(def.id);
      this.fx.mark("i:" + def.id, "item", def.x, view.tooltipHeight + 0.55, def.z);
    }
    for (const z of horde.aimCandidates()) {
      if (Math.hypot(z.x - player.x, z.z - player.z) >= SCAN.radius) continue;
      this.markedZombies.add(z.id);
      this.fx.mark("z:" + z.id, "zombie", z.x, 2.1, z.z);
    }
    return true;
  }

  /** Les marqueurs de zombies suivent leur cible ; un zombie disparu perd le sien. */
  private updateMarkers(dt: number): void {
    if (this.markerTime <= 0) return;
    this.markerTime = Math.max(0, this.markerTime - dt);
    if (this.markerTime === 0) {
      this.markedItems.clear();
      this.markedZombies.clear();
      return;
    }
    if (this.markedZombies.size === 0) return;
    const alive = this.host.horde.aimCandidates();
    for (const id of this.markedZombies) {
      let found = false;
      for (const c of alive) {
        if (c.id !== id) continue;
        this.fx.moveMarker("z:" + id, c.x, c.z);
        found = true;
        break;
      }
      if (!found) {
        this.markedZombies.delete(id);
        this.fx.hideMarker("z:" + id);
      }
    }
  }

  private notifyThrottled(text: string, interval: number): void {
    const last = this.lastNotice.get(text);
    if (last !== undefined && this.clock - last < interval) return;
    this.lastNotice.set(text, this.clock);
    this.host.notify(text);
  }
}
