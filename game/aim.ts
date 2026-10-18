// Visée : curseur projeté sur le sol, stick droit, ou visée assistée au téléphone.
import { Camera, Plane, Raycaster, Vector2, Vector3 } from "three";

/** Hauteur de l'arme : le plan visé passe à hauteur de main pour que le tir parte vers le curseur. */
export const AIM_HEIGHT = 1.0;

const raycaster = new Raycaster();
const plane = new Plane(new Vector3(0, 1, 0), 0);
const ndc = new Vector2();

/** Point du plan horizontal y = height sous le curseur (coordonnées normalisées −1..1). */
export function groundPoint(camera: Camera, ndcX: number, ndcY: number, height = AIM_HEIGHT, out = new Vector3()): Vector3 | null {
  ndc.set(ndcX, ndcY);
  raycaster.setFromCamera(ndc, camera);
  plane.constant = -height;
  return raycaster.ray.intersectPlane(plane, out);
}

/** Lacet tel que l'avant (sin yaw, 0, cos yaw) pointe de `from` vers `to`. */
export function yawTowards(fromX: number, fromZ: number, toX: number, toZ: number): number {
  return Math.atan2(toX - fromX, toZ - fromZ);
}

export function angleDifference(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Tourne `current` vers `target` d'au plus `maxStep` radians. */
export function turnTowards(current: number, target: number, maxStep: number): number {
  const d = angleDifference(current, target);
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}

export interface AimCandidate { id: string; x: number; z: number; }

/**
 * Visée assistée : choisit la cible la plus pertinente devant le joueur.
 * Pondère la distance et l'écart angulaire ; `visible` filtre la ligne de vue.
 */
export function assistTarget<T extends AimCandidate>(
  x: number, z: number, facingYaw: number, candidates: readonly T[],
  range = 11, coneDeg = 75, visible: (c: T) => boolean = () => true,
): T | null {
  const halfCone = (coneDeg * Math.PI) / 180;
  let best: T | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const distance = Math.hypot(c.x - x, c.z - z);
    if (distance > range || distance < 0.01) continue;
    const off = Math.abs(angleDifference(facingYaw, yawTowards(x, z, c.x, c.z)));
    if (off > halfCone) continue;
    const score = distance / range + off / halfCone;
    if (score < bestScore && visible(c)) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}
