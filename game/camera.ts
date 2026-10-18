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
  private readonly goal = new Vector3();

  constructor(readonly camera: PerspectiveCamera) {}

  /** Place immédiatement la caméra (chargement, téléportation). */
  snap(target: Vector3): void {
    this.focus.copy(target);
    this.distance = this.desiredDistance;
    this.apply();
  }

  /** `zoomSteps` > 0 éloigne la caméra, < 0 la rapproche. */
  zoom(zoomSteps: number): void {
    this.desiredDistance = clampDistance(this.desiredDistance * Math.pow(1.12, zoomSteps));
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
    this.apply();
  }

  private apply(): void {
    this.camera.position.copy(this.focus).add(cameraOffset(this.distance));
    this.camera.lookAt(this.focus);
    this.camera.updateMatrixWorld();
  }
}
