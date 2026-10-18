// Logique de mixage du son, sans Web Audio (testée sous Node) : tension selon les zombies proches,
// niveaux des bus selon les réglages et le mode, spatialisation simple, ambiance de chaque zone.

export interface SoundSettings {
  /** Volume général, musique et effets : 0 → 1. */
  master: number;
  music: number;
  sfx: number;
  vibration: boolean;
}

export const DEFAULT_SOUND: SoundSettings = { master: 0.8, music: 0.55, sfx: 0.8, vibration: true };

export interface Threat {
  /** Distance au joueur, en mètres. */
  distance: number;
  /** Le zombie poursuit, enquête ou cherche (en alerte). */
  alert: boolean;
  /** Il poursuit le joueur. */
  chasing: boolean;
}

/** Au-delà de cette distance, un zombie en alerte ne crée aucune tension (seulement quand ils sont vraiment proches). */
export const TENSION_RANGE = 10;

export function clamp01(value: number): number {
  return value <= 0 ? 0 : value >= 1 ? 1 : Number.isFinite(value) ? value : 0;
}

/** Tension 0 → 1 : chaque zombie proche en alerte ajoute sa part, combinée sans dépasser 1. */
export function computeTension(threats: readonly Threat[]): number {
  let calm = 1;
  for (const t of threats) {
    if (t.distance >= TENSION_RANGE) continue;
    const near = 1 - t.distance / TENSION_RANGE;
    let part = 0;
    if (t.chasing) part = 0.9 * near ** 1.4;
    else if (t.alert) part = 0.45 * near ** 1.6;
    else if (t.distance < 4) part = 0.15 * near;
    calm *= 1 - clamp01(part);
  }
  return clamp01(1 - calm);
}

/** Battement de cœur 0 → 1 sous 30 de vie (et à 0 si mort). */
export function heartbeatLevel(health: number): number {
  if (health <= 0 || health >= 30) return 0;
  return clamp01(0.35 + 0.65 * (1 - health / 30));
}

/** Intervalle entre deux battements, en secondes (plus rapide quand la vie baisse). */
export function heartbeatInterval(health: number): number {
  return 0.62 + 0.5 * clamp01(health / 30);
}

/** Rapproche `current` de `target` en fondu exponentiel (montée et descente à des vitesses différentes). */
export function approach(current: number, target: number, dt: number, riseRate: number, fallRate = riseRate): number {
  const rate = target > current ? riseRate : fallRate;
  return target + (current - target) * Math.exp(-rate * Math.max(0, dt));
}

export type MixMode = "playing" | "paused" | "menu" | "death" | "hidden";

export interface BusLevels {
  master: number;
  music: number;
  sfx: number;
  ambience: number;
}

/** Niveaux cibles des bus : la musique baisse en pause, s'arrête à la mort ou onglet caché. */
export function busLevels(settings: SoundSettings, mode: MixMode): BusLevels {
  const master = clamp01(settings.master);
  const music = clamp01(settings.music) * 0.5;
  const sfx = clamp01(settings.sfx);
  switch (mode) {
    case "hidden": return { master: 0, music: 0, sfx: 0, ambience: 0 };
    case "paused": return { master, music: music * 0.35, sfx, ambience: sfx * 0.25 };
    case "menu": return { master, music: music * 0.7, sfx, ambience: sfx * 0.2 };
    case "death": return { master, music: 0, sfx, ambience: sfx * 0.3 };
    default: return { master, music, sfx, ambience: sfx * 0.7 };
  }
}

/** Gain selon la distance : plein jusqu'à `ref`, nul au-delà de `max`. */
export function distanceGain(distance: number, ref = 2, max = 18): number {
  if (distance <= ref) return 1;
  if (distance >= max) return 0;
  const t = 1 - (distance - ref) / (max - ref);
  return t * t;
}

/** Panoramique gauche/droite d'après l'écart en X (le haut de l'écran est le nord, +X à droite). */
export function panFor(dx: number, distance: number): number {
  if (distance < 0.5) return 0;
  return Math.max(-0.85, Math.min(0.85, dx / Math.max(4, distance)));
}

/** Volume d'un pas selon la pose. Accroupi : beaucoup plus doux. */
export function footstepGain(pose: string): number {
  switch (pose) {
    case "run": return 1;
    case "walk": return 0.6;
    case "crouch-walk": return 0.22;
    default: return 0;
  }
}

// ——— Ambiance de chaque zone ———

export type BedLayer = "wind" | "hum" | "rumble" | "room";
export type SpotSound = "drip" | "pipe_creak" | "creak" | "clock_tick" | "electric_buzz" | "wind_gust" | "leaves";

export interface ZoneAmbience {
  beds: Partial<Record<BedLayer, number>>;
  /** Petits bruits ponctuels du lieu, et leur fréquence moyenne (par minute). */
  spots: Partial<Record<SpotSound, number>>;
}

/** Ambiance par salle (id de ROOMS) ; `powered` : la génératrice tourne. */
export function zoneAmbience(roomId: string | null, powered: boolean): ZoneAmbience {
  const hum = powered ? 0.5 : 0;
  switch (roomId) {
    case "plaza":
    case "exterior":
      return { beds: { wind: 0.9 }, spots: { wind_gust: 3, creak: 1.5 } };
    case "greenhouse":
      return { beds: { wind: 0.35, room: 0.3 }, spots: { drip: 6, leaves: 3 } };
    case "generator":
      return { beds: powered ? { rumble: 0.9, room: 0.3 } : { room: 0.6 }, spots: powered ? { pipe_creak: 2 } : { drip: 5, pipe_creak: 2 } };
    case "security":
    case "hub":
    case "north":
    case "stairs":
      return { beds: { room: 0.5, hum: hum * 1.2 }, spots: { electric_buzz: powered ? 2 : 0, pipe_creak: 1.5, drip: 1 } };
    case "control":
      return { beds: { room: 0.4, hum: hum * 1.4 }, spots: { electric_buzz: 3, clock_tick: 1 } };
    case "infirmary":
      return { beds: { room: 0.45, hum: hum }, spots: { electric_buzz: 4, drip: 2 } };
    case "workshop":
    case "storage":
      return { beds: { room: 0.6, hum: hum * 0.5 }, spots: { pipe_creak: 4, creak: 2 } };
    case "cafeteria":
      return { beds: { room: 0.6 }, spots: { drip: 6, creak: 1 } };
    case "dorms":
    case "secret":
      return { beds: { room: 0.55 }, spots: { clock_tick: 2, creak: 3 } };
    case "west":
    case "east":
      return { beds: { room: 0.7, hum: hum * 0.6 }, spots: { drip: 3, pipe_creak: 2 } };
    default:
      return { beds: { room: 0.5 }, spots: { drip: 2 } };
  }
}

/** Petits bruits inexpliqués, rares et lointains, qui font planer le mystère. */
export const MYSTERY_CUES = ["distant_steps", "door_slam", "radio_static", "metal_clang", "distant_knock"] as const;
export type MysteryCue = (typeof MYSTERY_CUES)[number];

/** Délai avant le prochain bruit mystérieux (secondes), d'après un tirage 0 → 1. Jamais pendant la tension. */
export function nextMysteryDelay(random: number): number {
  return 50 + clamp01(random) * 70;
}
