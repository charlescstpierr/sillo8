// Danger et lieux sûrs : quand la sauvegarde automatique a le droit de s'écrire.
// Règle d'or : jamais de sauvegarde automatique en danger, pour ne pas enfermer le joueur dans une
// boucle « je recharge, je meurs ». Pur (sans rendu), testé dans tests/unit/save.test.ts.
import { SAFE_ROOMS, roomAt } from "./level";

/** Un mordu vivant, et s'il est en alerte (poursuite, enquête sur un bruit, recherche). */
export interface Threat {
  x: number;
  z: number;
  alert: boolean;
}

export const DANGER = {
  /** Un mordu en alerte à moins de cette distance (m) : danger. */
  alertRadius: 20,
  /** N'importe quel mordu à moins de cette distance (m) : danger, même calme. */
  nearRadius: 7,
  /** Vie basse (sur 100)… */
  lowHealth: 30,
  /** …et blessé il y a moins de tant de secondes : en plein combat. */
  hurtWindow: 12,
} as const;

export interface DangerInput {
  x: number;
  z: number;
  health: number;
  /** Secondes depuis le dernier coup reçu (Infinity si jamais). */
  sinceHurt: number;
  threats: readonly Threat[];
}

/** Vrai en danger : mordu en alerte proche, mordu tout près, ou vie basse en plein combat. */
export function inDanger(input: DangerInput): boolean {
  if (input.health <= 0) return true;
  if (input.health < DANGER.lowHealth && input.sinceHurt < DANGER.hurtWindow) return true;
  for (const t of input.threats) {
    const d = Math.hypot(t.x - input.x, t.z - input.z);
    if (d < DANGER.nearRadius || (t.alert && d < DANGER.alertRadius)) return true;
  }
  return false;
}

export function inSafeRoom(x: number, z: number): boolean {
  const room = roomAt(x, z);
  return room !== null && SAFE_ROOMS.includes(room.id);
}

/** Lieu sûr : pièce sûre et hors danger. Seule condition d'une sauvegarde automatique « Lieu sûr ». */
export function safeSpot(input: DangerInput): boolean {
  return inSafeRoom(input.x, input.z) && !inDanger(input);
}
