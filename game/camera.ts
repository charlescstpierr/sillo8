// Caméra en plongée qui suit le joueur, avec lissage et zoom.
import { PerspectiveCamera, Vector3 } from "three";

export const CAMERA = {
  pitchDeg: 56,
  fov: 30,
  minDistance: 9,
  maxDistance: 24,
  defaultDistance: 14,
  followRate: 6,
  zoomRate: 10,
  lookAhead: 1.4,
  /** Tremblement : amplitude maximale (m) et vitesse du bruit. */
  shakeMax: 0.45,
  shakeFreq: 31,
  /** Recul (coup, tir) : amplitude maximale (m) et retour élastique. */
  kickMax: 0.5,
  kickRate: 16,
};

/** Rapproche exponentiellement `current` de `target`, indépendamment du nombre d'images par seconde. */
export function damp(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.exp(-rate * dt);
}

export function cameraOffset(distance: number, pitchDeg = CAMERA.pitchDeg): Vector3 {
  const pitch = (pitchDeg * Math.PI) / 180;
  return new Vector3(0, Math.sin(pitch) * distance, Math.cos(pitch) * distance);
}

export function clampDistance(distance: number): number {
  return Math.min(CAMERA.maxDistance, Math.max(CAMERA.minDistance, distance));
}

export class CameraRig {
  readonly focus = new Vector3();
  distance = CAMERA.defaultDistance;
  desiredDistance = CAMERA.defaultDistance;
  /** Décalage de « ressenti » (tremblement + recul) ajouté à la caméra, sans toucher au suivi. */
  readonly shake = new Vector3();
  private readonly goal = new Vector3();
  private readonly offset = new Vector3();
  private shakeStrength = 0;
  private shakeDuration = 0;
  private shakeTime = 0;
  private shakeClock = 0;
  private kickX = 0;
  private kickZ = 0;

  constructor(readonly camera: PerspectiveCamera) {}

  /** Place immédiatement la caméra (chargement, téléportation). */
  snap(target: Vector3): void {
    this.focus.copy(target);
    this.distance = this.desiredDistance;
    this.shakeTime = this.kickX = this.kickZ = 0;
    this.shake.set(0, 0, 0);
    this.apply();
  }

  /** `zoomSteps` > 0 éloigne la caméra, < 0 la rapproche. */
  zoom(zoomSteps: number): void {
    this.desiredDistance = clampDistance(this.desiredDistance * Math.pow(1.12, zoomSteps));
  }

  /** Tremblement (m) qui s'éteint en `duration` s ; le plus fort des tremblements en cours l'emporte. */
  addShake(strength: number, duration: number): void {
    const left = this.shakeTime > 0 ? this.shakeStrength * (this.shakeTime / this.shakeDuration) : 0;
    if (strength <= left || duration <= 0) return;
    this.shakeStrength = Math.min(CAMERA.shakeMax, strength);
    this.shakeDuration = this.shakeTime = duration;
  }

  /** Petit à-coup de la caméra dans la direction (dirX, dirZ), qui revient tout seul. */
  kick(dirX: number, dirZ: number, amount: number): void {
    const length = Math.hypot(dirX, dirZ);
    if (length < 1e-6) return;
    this.kickX += (dirX / length) * amount;
    this.kickZ += (dirZ / length) * amount;
    const total = Math.hypot(this.kickX, this.kickZ);
    if (total > CAMERA.kickMax) {
      this.kickX *= CAMERA.kickMax / total;
      this.kickZ *= CAMERA.kickMax / total;
    }
  }

  update(dt: number, player: Vector3, aimPoint: Vector3 | null): void {
    this.goal.copy(player);
    if (aimPoint) {
      const dx = aimPoint.x - player.x;
      const dz = aimPoint.z - player.z;
      const length = Math.hypot(dx, dz);
      if (length > 0.001) {
        const reach = Math.min(CAMERA.lookAhead, length * 0.25);
        this.goal.x += (dx / length) * reach;
        this.goal.z += (dz / length) * reach;
      }
    }
    this.focus.x = damp(this.focus.x, this.goal.x, CAMERA.followRate, dt);
    this.focus.y = damp(this.focus.y, this.goal.y, CAMERA.followRate, dt);
    this.focus.z = damp(this.focus.z, this.goal.z, CAMERA.followRate, dt);
    this.distance = damp(this.distance, this.desiredDistance, CAMERA.zoomRate, dt);
    this.updateShake(dt);
    this.apply();
  }

  /** Bruit déterministe (sommes de sinus) : pas de hasard, rejouable dans les tests. */
  private updateShake(dt: number): void {
    this.kickX = damp(this.kickX, 0, CAMERA.kickRate, dt);
    this.kickZ = damp(this.kickZ, 0, CAMERA.kickRate, dt);
    this.shake.set(this.kickX, 0, this.kickZ);
    if (this.shakeTime <= 0) return;
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    this.shakeClock += dt * CAMERA.shakeFreq;
    const k = this.shakeTime / this.shakeDuration;
    const a = this.shakeStrength * k * k;
    const t = this.shakeClock;
    this.shake.x += a * (Math.sin(t * 1.0) * 0.6 + Math.sin(t * 2.3 + 1.7) * 0.4);
    this.shake.y += a * 0.5 * Math.sin(t * 1.7 + 0.4);
    this.shake.z += a * (Math.sin(t * 1.3 + 2.1) * 0.6 + Math.sin(t * 2.9) * 0.4);
  }

  private apply(): void {
    // Le décalage déplace caméra et point visé ensemble : l'image glisse sans pivoter.
    this.offset.copy(this.focus).add(this.shake);
    this.camera.position.copy(this.offset).add(cameraOffset(this.distance));
    this.camera.lookAt(this.offset);
    this.camera.updateMatrixWorld();
  }
}
