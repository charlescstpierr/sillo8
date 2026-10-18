// Contrôleur du bricoleur vu de dessus : déplacement, course, accroupi, orientation vers la visée,
// cadence des armes et rechargement du lance-clous.
import type { Box } from "./collision";
import { NAIL_CAPACITY } from "./state";
import { moveCircle } from "./collision";
import { turnTowards } from "./aim";

export const PLAYER = {
  radius: 0.35,
  walkSpeed: 3.4,
  runSpeed: 5.6,
  crouchSpeed: 1.7,
  acceleration: 14,
  turnSpeed: 14,
};

/** Lance-clous : cadence, durée de rechargement, chargeur, rayon du bruit. */
export const NAILGUN = { cooldown: 0.16, reloadDuration: 1.1, capacity: NAIL_CAPACITY, noiseRadius: 10 };

export interface MoveIntent {
  /** Direction monde (x, z), longueur ≤ 1. */
  x: number;
  z: number;
  sprint: boolean;
  crouch: boolean;
  /** Lacet visé, ou null pour regarder dans le sens de la marche. */
  aimYaw: number | null;
}

export type Pose = "idle" | "walk" | "run" | "crouch" | "crouch-walk";

export class PlayerController {
  x: number;
  z: number;
  yaw: number;
  vx = 0;
  vz = 0;
  crouched = false;
  running = false;
  /** Temps restant de l'animation de tir. */
  shotTime = 0;
  cooldown = 0;
  reloadTime = 0;
  /** Phase de foulée, en radians, pour l'animation. */
  stride = 0;

  constructor(x: number, z: number, yaw: number) {
    this.x = x;
    this.z = z;
    this.yaw = yaw;
  }

  get speed(): number {
    return Math.hypot(this.vx, this.vz);
  }

  get reloading(): boolean {
    return this.reloadTime > 0;
  }

  get pose(): Pose {
    const moving = this.speed > 0.25;
    if (this.crouched) return moving ? "crouch-walk" : "crouch";
    if (!moving) return "idle";
    return this.running ? "run" : "walk";
  }

  update(dt: number, intent: MoveIntent, colliders: readonly Box[]): void {
    this.crouched = intent.crouch;
    const length = Math.min(1, Math.hypot(intent.x, intent.z));
    this.running = intent.sprint && !this.crouched && length > 0.1 && !this.reloading;
    const top = this.crouched ? PLAYER.crouchSpeed : this.running ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const tx = length > 0 ? (intent.x / Math.max(length, 1e-6)) * length * top : 0;
    const tz = length > 0 ? (intent.z / Math.max(length, 1e-6)) * length * top : 0;
    const blend = 1 - Math.exp(-PLAYER.acceleration * dt);
    this.vx += (tx - this.vx) * blend;
    this.vz += (tz - this.vz) * blend;
    if (Math.abs(this.vx) < 1e-3) this.vx = 0;
    if (Math.abs(this.vz) < 1e-3) this.vz = 0;
    const before = { x: this.x, z: this.z };
    const next = moveCircle(this.x, this.z, this.vx * dt, this.vz * dt, PLAYER.radius, colliders);
    this.x = next.x;
    this.z = next.z;
    // Vitesse réelle après collision, pour ne pas « patiner » contre un mur.
    if (dt > 0) {
      this.vx = (this.x - before.x) / dt;
      this.vz = (this.z - before.z) / dt;
    }
    const facing = intent.aimYaw ?? (this.speed > 0.3 ? Math.atan2(this.vx, this.vz) : this.yaw);
    this.yaw = turnTowards(this.yaw, facing, PLAYER.turnSpeed * dt);
    this.stride += dt * (this.speed > 0.1 ? this.speed * (this.crouched ? 3.4 : 2.6) : 0);
    this.shotTime = Math.max(0, this.shotTime - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.reloadTime > 0) {
      this.reloadTime = Math.max(0, this.reloadTime - dt);
      if (this.reloadTime === 0) this.reloadCompleted = true;
    }
  }

  /** Vrai une seule fois quand un rechargement se termine. */
  reloadCompleted = false;

  takeReloadCompleted(): boolean {
    const done = this.reloadCompleted;
    this.reloadCompleted = false;
    return done;
  }

  /** Tente un tir du lance-clous. `spendRound` décrémente le chargeur de l'état de partie. */
  tryFire(spendRound: () => boolean): boolean {
    if (this.cooldown > 0 || this.reloading) return false;
    if (!spendRound()) return false;
    this.cooldown = NAILGUN.cooldown;
    this.shotTime = 0.18;
    return true;
  }

  startReload(canReload: boolean): boolean {
    if (this.reloading || !canReload) return false;
    this.reloadTime = NAILGUN.reloadDuration;
    return true;
  }

  /** Interrompt le rechargement (changement d'arme) : aucun clou n'est chargé. */
  cancelReload(): void {
    this.reloadTime = 0;
    this.reloadCompleted = false;
  }

  /** Avancement du rechargement, de 0 à 1. */
  get reloadProgress(): number {
    return this.reloading ? 1 - this.reloadTime / NAILGUN.reloadDuration : 0;
  }
}
