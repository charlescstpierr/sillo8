// Armes du bricoleur (docs/MECHANICS.md) : clé à molette au corps à corps, lance-clous, et lampe qui éblouit.
// Le moteur appelle update() à chaque image avec les commandes du joueur ; le rechargement reste dans engine.ts.
import { Vector3, type Scene } from "three";
import { NAILGUN, type PlayerController } from "./player";
import type { SiloState } from "./state";
import type { Horde } from "./types";
import { angleDifference, yawTowards } from "./aim";
import { rayDistance, segmentClear, type Box } from "./collision";
import { CombatFx } from "./render/fx";

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

  constructor(private host: CombatHost) {
    this.fx = new CombatFx();
    host.scene.add(this.fx.root);
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
    this.fx.update(dt);
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
    for (const id of ids) horde.damage(id, WRENCH.damage, WRENCH.stun);
    this.host.noise(player.x, player.z, WRENCH.noise);
    if (ids.length > 0) {
      // Point d'impact : entre le joueur et le centre des cibles.
      const x = (player.x + hx / ids.length) / 2 + Math.sin(player.yaw) * 0.3;
      const z = (player.z + hz / ids.length) / 2 + Math.cos(player.yaw) * 0.3;
      this.fx.bonk(x, HAND_HEIGHT + 0.2, z);
      this.fx.impact(x, HAND_HEIGHT, z, "zombie", -Math.sin(player.yaw), -Math.cos(player.yaw));
    }
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
    if (shot.target === "zombie") this.host.horde.damage(shot.zombieId!, NAIL.damage, NAIL.stun);
    this.host.noise(player.x, player.z, NAIL.noise);
    this.showShot(shot);
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
    this.fx.tracer(this.muzzle, this.hit);
    if (shot.target !== "none") this.fx.impact(this.hit.x, this.hit.y, this.hit.z, shot.target, -fx, -fz);
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
    for (const id of ids) horde.damage(id, 0, LAMP.stun);
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
