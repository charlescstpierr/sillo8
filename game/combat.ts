// Armes du bricoleur (docs/MECHANICS.md) : clé à molette au corps à corps, lance-clous, et lampe qui éblouit.
// Le moteur appelle update() à chaque image avec les commandes du joueur ; le rechargement reste dans engine.ts.
import { Vector3, type Scene } from "three";
import { NAILGUN, type PlayerController } from "./player";
import type { SiloState } from "./state";
import type { Horde } from "./types";
import { angleDifference, yawTowards } from "./aim";
import { rayDistance, segmentClear, type Box } from "./collision";
import { CombatFx } from "./render/fx";
import { INTERACTABLES } from "./level";

export interface CombatHost {
  scene: Scene;
  state: SiloState;
  player: PlayerController;
  horde: Horde;
  /** Murs, portes fermées et décor solide (lu à chaque coup). */
  world: { colliders: readonly Box[] };
  notify(text: string): void;
  /** Propage un bruit aux zombies. */
  noise(x: number, z: number, radius: number): void;
}

export interface CombatInput {
  /** Gâchette maintenue (clic gauche, RT, bouton FRAPPER / TIRER). */
  firing: boolean;
  /** Lampe : éblouir (clic droit, LT, bouton LAMPE). */
  light: boolean;
  /** Arme suivante (LB / RB, boutons 4-5 de la souris, ⇄ au tactile). */
  swap: boolean;
  weapon1: boolean;
  weapon2: boolean;
}

export type WeaponIndex = 0 | 1;

/** Ce que le combat demande à la caméra (CameraRig) : tremblement et à-coup. */
export interface CameraFeel {
  addShake(strength: number, duration: number): void;
  kick(dirX: number, dirZ: number, amount: number): void;
}

/**
 * Ressenti des coups (aucun effet sur les dégâts) : recul des zombies (m), arrêt sur image (s),
 * à-coups (m) et tremblements (m, s) de la caméra.
 */
export const FEEL = {
  wrenchPush: 0.8, wrenchFreeze: 0.05, wrenchKick: 0.22, wrenchShake: 0.1, wrenchShakeTime: 0.16, wrenchMissKick: 0.06,
  nailPush: 0.2, nailKick: 0.07, nailShake: 0.03, nailShakeTime: 0.08,
  hurtShake: 0.28, hurtShakeTime: 0.3, deathShake: 0.14, deathShakeTime: 0.2,
} as const;

/** Hauteur de la tête d'un zombie quand la horde ne la donne pas. */
const HEAD_DEFAULT = 1.85;

const DEG = Math.PI / 180;

export const WRENCH = { name: "Clé à molette", damage: 26, stun: 0.25, cooldown: 0.5, noise: 4, reach: 1.7, halfAngle: 35 * DEG, swing: 0.32 } as const;
export const NAIL = { name: "Lance-clous", damage: 16, stun: 0, cooldown: NAILGUN.cooldown, noise: NAILGUN.noiseRadius, reach: 16 } as const;
export const LAMP = { energy: 15, halfAngle: 20 * DEG, range: 8, stun: 1.8, cooldown: 1.2, flash: 0.25 } as const;
export const WEAPONS = [WRENCH, NAIL] as const;

/** Hauteur des coups (main du bricoleur). */
const HAND_HEIGHT = 1.0;

export interface ShotResult {
  /** Distance parcourue jusqu'au point d'impact. */
  distance: number;
  x: number;
  z: number;
  target: "zombie" | "wall" | "none";
  zombieId?: string;
}

export class Combat {
  /** 0 = clé à molette, 1 = lance-clous. */
  weapon: WeaponIndex = 0;
  /** Secondes restantes du coup de clé (0,32 s → 0). */
  swingTime = 0;
  /** Secondes restantes de l'éclair de la lampe (0,25 s → 0). */
  dazzleTime = 0;
  /** Temps avant de pouvoir éblouir à nouveau. */
  lightCooldown = 0;
  readonly fx: CombatFx;

  private clock = 0;
  private lastNotice = new Map<string, number>();
  private readonly muzzle = new Vector3();
  private readonly hit = new Vector3();
  private readonly result: ShotResult = { distance: 0, x: 0, z: 0, target: "none" };
  private readonly targets: string[] = [];
  private readonly normal = { x: 0, z: 0 };
  /** Demandes de caméra en attente, transmises par applyCamera(). */
  private shakeStrength = 0;
  private shakeDuration = 0;
  private kickX = 0;
  private kickZ = 0;
  private lastHealth: number;
  private lastCollected: number;

  constructor(private host: CombatHost) {
    this.fx = new CombatFx();
    host.scene.add(this.fx.root);
    this.lastHealth = host.state.health;
    this.lastCollected = host.state.collected.length;
  }

  /** Transmet tremblements et à-coups à la caméra (appelé par le moteur à chaque image, avant rig.update). */
  applyCamera(rig: CameraFeel): void {
    if (this.shakeStrength > 0) rig.addShake(this.shakeStrength, this.shakeDuration);
    if (this.kickX !== 0 || this.kickZ !== 0) rig.kick(this.kickX, this.kickZ, Math.hypot(this.kickX, this.kickZ));
    this.shakeStrength = this.shakeDuration = this.kickX = this.kickZ = 0;
  }

  /** Demande un tremblement (le plus fort de l'image l'emporte). */
  shake(strength: number, duration: number): void {
    if (strength <= this.shakeStrength) return;
    this.shakeStrength = strength;
    this.shakeDuration = duration;
  }

  /** Demande un à-coup de caméra dans la direction (dirX, dirZ) normalisée. */
  kick(dirX: number, dirZ: number, amount: number): void {
    this.kickX += dirX * amount;
    this.kickZ += dirZ * amount;
  }

  /** Tremblement en attente (tests). */
  get pendingShake(): number {
    return this.shakeStrength;
  }

  /** À-coup en attente (tests). */
  get pendingKick(): { x: number; z: number } {
    return { x: this.kickX, z: this.kickZ };
  }

  update(dt: number, input: CombatInput): void {
    this.clock += dt;
    this.swingTime = Math.max(0, this.swingTime - dt);
    this.dazzleTime = Math.max(0, this.dazzleTime - dt);
    this.lightCooldown = Math.max(0, this.lightCooldown - dt);

    if (input.swap) this.select(this.weapon === 0 ? 1 : 0);
    if (input.weapon1) this.select(0);
    if (input.weapon2) this.select(1);
    if (input.light) this.dazzle();
    if (input.firing) {
      if (this.weapon === 0) this.swing();
      else this.fireNail();
    }
    this.watchState();
    this.followDizzy();
    this.fx.update(dt);
  }

  /** Blessure → tremblement ; objet ramassé → étincelles et étiquette (sans toucher au moteur). */
  private watchState(): void {
    const { state } = this.host;
    if (state.health < this.lastHealth) {
      const k = Math.min(1, (this.lastHealth - state.health) / 10);
      this.shake(FEEL.hurtShake * (0.5 + 0.5 * k), FEEL.hurtShakeTime);
    }
    this.lastHealth = state.health;
    const collected = state.collected;
    // Un saut de plusieurs objets d'un coup est un chargement de partie : pas d'effet.
    if (collected.length > this.lastCollected && collected.length - this.lastCollected <= 2) {
      for (let i = this.lastCollected; i < collected.length; i++) {
        // Seuls les objets posés dans le niveau ont un effet (pas les dons du scénario).
        const def = INTERACTABLES.find((d) => d.id === collected[i]);
        if (!def) continue;
        const amount = def.amount ?? 1;
        const text = def.kind === "components" ? `+${amount} ⚙` : def.kind === "ammo" ? `+${amount} clous` : `+${amount} ${def.name.toLowerCase()}`;
        this.fx.pickup(def.x, def.z, text);
      }
    }
    this.lastCollected = collected.length;
  }

  /** Les étoiles d'étourdissement suivent leur zombie (recul, poussée) et s'éteignent s'il meurt. */
  private followDizzy(): void {
    let candidates: readonly { id: string; x: number; z: number }[] | null = null;
    for (let i = 0; i < this.fx.dizzyCount; i++) {
      const id = this.fx.dizzyId(i);
      if (!id) continue;
      candidates ??= this.host.horde.aimCandidates();
      let found = false;
      for (const c of candidates) {
        if (c.id !== id) continue;
        this.fx.follow(i, c.x, c.z);
        found = true;
        break;
      }
      if (!found) this.fx.follow(i, Number.NaN, 0);
    }
  }

  setLowQuality(low: boolean): void {
    this.fx.setLowQuality(low);
  }

  /** Change d'arme ; un rechargement en cours est abandonné. Vrai si l'arme change. */
  select(weapon: WeaponIndex): boolean {
    if (weapon === this.weapon) return false;
    this.weapon = weapon;
    this.host.player.cancelReload();
    this.swingTime = 0;
    this.host.notify(WEAPONS[weapon].name);
    return true;
  }

  // ——— Clé à molette ———

  /** Coup en arc devant le bricoleur : touche tous les zombies à portée. Retourne le nombre touché, −1 si pas de coup. */
  swing(): number {
    const { player, horde, world } = this.host;
    if (player.cooldown > 0 || player.reloading) return -1;
    player.cooldown = WRENCH.cooldown;
    this.swingTime = WRENCH.swing;
    const ids = this.targets;
    ids.length = 0;
    let hx = 0;
    let hz = 0;
    for (const c of horde.aimCandidates()) {
      const distance = Math.hypot(c.x - player.x, c.z - player.z);
      if (distance > WRENCH.reach) continue;
      if (distance > 0.2 && Math.abs(angleDifference(player.yaw, yawTowards(player.x, player.z, c.x, c.z))) > WRENCH.halfAngle) continue;
      if (!segmentClear(player.x, player.z, c.x, c.z, world.colliders)) continue;
      ids.push(c.id);
      hx += c.x;
      hz += c.z;
    }
    const fx = Math.sin(player.yaw);
    const fz = Math.cos(player.yaw);
    const deaths = this.host.state.defeated.length;
    for (const id of ids) {
      // Recul dans l'axe joueur → zombie (repli sur l'avant du bricoleur s'ils se touchent).
      const c = this.locate(id);
      const ox = c ? c.x - player.x : fx;
      const oz = c ? c.z - player.z : fz;
      const far = Math.hypot(ox, oz) > 0.1;
      horde.damage(id, WRENCH.damage, WRENCH.stun);
      horde.push?.(id, far ? ox : fx, far ? oz : fz, FEEL.wrenchPush, FEEL.wrenchFreeze);
    }
    this.host.noise(player.x, player.z, WRENCH.noise);
    if (ids.length > 0) {
      // Point d'impact : entre le joueur et le centre des cibles.
      const x = (player.x + hx / ids.length) / 2 + fx * 0.3;
      const z = (player.z + hz / ids.length) / 2 + fz * 0.3;
      this.fx.bonk(x, HAND_HEIGHT + 0.2, z);
      this.fx.impact(x, HAND_HEIGHT, z, "zombie", -fx, -fz);
      this.kick(fx, fz, FEEL.wrenchKick);
      this.shake(FEEL.wrenchShake, FEEL.wrenchShakeTime);
      // Le corps tombe un peu plus loin, poussé par le coup.
      this.poofDeaths(deaths, hx / ids.length + fx * FEEL.wrenchPush * 0.6, hz / ids.length + fz * FEEL.wrenchPush * 0.6);
    } else this.kick(fx, fz, FEEL.wrenchMissKick);
    return ids.length;
  }

  // ——— Lance-clous ———

  /** Un clou si la cadence et le chargeur le permettent. Vrai si un clou part. */
  fireNail(): boolean {
    const { player, state } = this.host;
    if (player.cooldown > 0 || player.reloading) return false;
    if (!player.tryFire(() => state.fireRound())) {
      if (state.ammo === 0 && state.reserve === 0) this.notifyThrottled("Plus de clous · presse à clous ou boîte de clous", 1.5);
      return false;
    }
    const shot = this.resolve(NAIL.reach);
    const fx = Math.sin(player.yaw);
    const fz = Math.cos(player.yaw);
    if (shot.target === "zombie") {
      const deaths = state.defeated.length;
      const c = this.locate(shot.zombieId!);
      const cx = c ? c.x : shot.x;
      const cz = c ? c.z : shot.z;
      this.host.horde.damage(shot.zombieId!, NAIL.damage, NAIL.stun);
      this.host.horde.push?.(shot.zombieId!, fx, fz, FEEL.nailPush, 0);
      this.poofDeaths(deaths, cx, cz);
    }
    this.host.noise(player.x, player.z, NAIL.noise);
    this.showShot(shot);
    // Recul : la caméra part vers l'arrière, à peine.
    this.kick(-fx, -fz, FEEL.nailKick);
    this.shake(FEEL.nailShake, FEEL.nailShakeTime);
    return true;
  }

  /** Résout un tir sur le plan XZ depuis le joueur, dans la direction de son lacet : le plus proche entre mur et zombie. */
  resolve(reach: number): ShotResult {
    const { player, horde, world } = this.host;
    const dx = Math.sin(player.yaw);
    const dz = Math.cos(player.yaw);
    const r = this.result;
    r.zombieId = undefined;
    const wall = rayDistance(player.x, player.z, dx, dz, reach, world.colliders);
    r.target = wall < reach ? "wall" : "none";
    const zombie = horde.raycast(player.x, player.z, dx, dz, wall);
    if (zombie && zombie.distance <= wall) {
      r.target = "zombie";
      r.zombieId = zombie.id;
      r.distance = zombie.distance;
      r.x = zombie.x;
      r.z = zombie.z;
      return r;
    }
    r.distance = wall;
    r.x = player.x + dx * wall;
    r.z = player.z + dz * wall;
    return r;
  }

  /** Visuels d'un clou : éclat, trait, impact. */
  private showShot(shot: ShotResult): void {
    const { player } = this.host;
    const fx = Math.sin(player.yaw);
    const fz = Math.cos(player.yaw);
    // Bouche du lance-clous : main droite (côté −X local), devant le bricoleur.
    this.muzzle.set(player.x + fx * 0.55 - fz * 0.18, HAND_HEIGHT, player.z + fz * 0.55 + fx * 0.18);
    this.hit.set(shot.x, HAND_HEIGHT, shot.z);
    this.fx.flash(this.muzzle, "#ffe2a8", 2.5);
    this.fx.muzzle(this.muzzle, fx, fz);
    this.fx.tracer(this.muzzle, this.hit);
    if (shot.target === "wall") {
      this.wallNormal(shot.x, shot.z, fx, fz);
      this.fx.impact(this.hit.x, this.hit.y, this.hit.z, "wall", this.normal.x, this.normal.z);
    } else if (shot.target === "zombie") this.fx.impact(this.hit.x, this.hit.y, this.hit.z, "zombie", -fx, -fz);
  }

  /** Normale de la face de mur touchée en (x, z) ; à défaut, l'opposé du tir. */
  private wallNormal(x: number, z: number, dx: number, dz: number): void {
    const n = this.normal;
    n.x = -dx;
    n.z = -dz;
    const eps = 0.03;
    for (const b of this.host.world.colliders) {
      if (x < b.minX - eps || x > b.maxX + eps || z < b.minZ - eps || z > b.maxZ + eps) continue;
      if (Math.abs(x - b.minX) < eps && dx > 0) { n.x = -1; n.z = 0; return; }
      if (Math.abs(x - b.maxX) < eps && dx < 0) { n.x = 1; n.z = 0; return; }
      if (Math.abs(z - b.minZ) < eps && dz > 0) { n.x = 0; n.z = -1; return; }
      if (Math.abs(z - b.maxZ) < eps && dz < 0) { n.x = 0; n.z = 1; return; }
    }
  }

  /** Position d'un zombie vivant (avant le coup), ou null. */
  private locate(id: string): { x: number; z: number } | null {
    for (const c of this.host.horde.aimCandidates()) if (c.id === id) return c;
    return null;
  }

  /** Un zombie vient de tomber (nouvelle entrée dans `defeated`) : pouf de poussière et petite secousse. */
  private poofDeaths(before: number, x: number, z: number): void {
    if (this.host.state.defeated.length <= before) return;
    this.fx.death(x, z);
    this.shake(FEEL.deathShake, FEEL.deathShakeTime);
  }

  // ——— Lampe ———

  /** Éblouit les zombies du cône (ligne de vue). Retourne le nombre figé, −1 si la lampe ne s'allume pas. */
  dazzle(): number {
    const { player, state, horde, world } = this.host;
    if (this.lightCooldown > 0) return -1;
    if (!state.spendEnergy(LAMP.energy)) {
      this.notifyThrottled("Pas assez de charge · pile ou borne de recharge", 1.5);
      return -1;
    }
    this.lightCooldown = LAMP.cooldown;
    this.dazzleTime = LAMP.flash;
    const ids = this.targets;
    ids.length = 0;
    for (const c of horde.aimCandidates()) {
      const distance = Math.hypot(c.x - player.x, c.z - player.z);
      if (distance > LAMP.range) continue;
      if (distance > 0.2 && Math.abs(angleDifference(player.yaw, yawTowards(player.x, player.z, c.x, c.z))) > LAMP.halfAngle) continue;
      if (!segmentClear(player.x, player.z, c.x, c.z, world.colliders)) continue;
      ids.push(c.id);
    }
    // Silencieux : aucun bruit propagé.
    for (const id of ids) {
      horde.damage(id, 0, LAMP.stun);
      const c = this.locate(id);
      if (c) this.fx.stun(id, c.x, c.z, (horde.headHeight?.(id) ?? HEAD_DEFAULT) + 0.25, LAMP.stun);
    }
    this.fx.dazzle(player.x, player.z, player.yaw);
    return ids.length;
  }

  private notifyThrottled(text: string, interval: number): void {
    const last = this.lastNotice.get(text);
    if (last !== undefined && this.clock - last < interval) return;
    this.lastNotice.set(text, this.clock);
    this.host.notify(text);
  }
}
