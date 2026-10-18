// Confort et accessibilité côté moteur : de simples multiplicateurs lus par la caméra, les effets, les zombies et le
// son. Aucun réglage ne change l'histoire ni les règles : seulement l'intensité de ce qu'on voit et entend.
// Les réglages du joueur (ui/settings.ts) passent par setComfort() ; la valeur par défaut ne change rien.

export interface ComfortOptions {
  /** Réduire les animations : ni tremblement de caméra, ni arrêt sur image, éclairs et grésillements adoucis. */
  reduceMotion: boolean;
  /** Mode moins effrayant : grognements et sursauts atténués, mordus plus lents, ni vibration ni tremblement. */
  gentle: boolean;
  /** Couleurs adaptées (daltonisme) pour les états importants : yeux des mordus, jauges. */
  safeColors: boolean;
}

export const DEFAULT_COMFORT: ComfortOptions = { reduceMotion: false, gentle: false, safeColors: false };

export interface ComfortScales {
  /** Tremblement de la caméra (coups reçus, coups donnés). */
  shake: number;
  /** À-coups de la caméra (recul du tir, coup de clé). */
  kick: number;
  /** Arrêt sur image (« hit-stop ») des zombies touchés. */
  hitStop: number;
  /** Éclairs : bouche du lance-clous, lampe, flash blanc d'un zombie touché. */
  flash: number;
  /** Grésillement des lampes « nerveuses » et crépitement des zombies étourdis. */
  flicker: number;
  /** Vitesse des mordus (toutes allures). */
  zombiePace: number;
  /** Volume des sons qui font sursauter (grognements, morsures, chute, bruits brusques). */
  scare: number;
  /** Vibration du téléphone permise. */
  vibration: boolean;
  /** Petits mouvements décoratifs (marque au-dessus des mordus qui flotte, clignement des yeux). */
  motion: boolean;
  /** Palette sûre pour le daltonisme. */
  safeColors: boolean;
}

/** Multiplicateurs pour une combinaison de réglages (le plus doux l'emporte). */
export function comfortScales(options: Partial<ComfortOptions> = {}): ComfortScales {
  const reduce = options.reduceMotion === true;
  const gentle = options.gentle === true;
  return {
    shake: reduce || gentle ? 0 : 1,
    kick: reduce || gentle ? 0 : 1,
    hitStop: reduce ? 0 : 1,
    flash: reduce ? 0.3 : gentle ? 0.6 : 1,
    flicker: reduce ? 0.15 : 1,
    zombiePace: gentle ? 0.75 : 1,
    scare: gentle ? 0.4 : 1,
    vibration: !gentle,
    motion: !reduce,
    safeColors: options.safeColors === true,
  };
}

/** Multiplicateurs en vigueur (lus à chaque image par les modules de rendu, de son et de zombies). */
export const COMFORT: ComfortScales = comfortScales();
let current: ComfortOptions = { ...DEFAULT_COMFORT };

export function setComfort(options: Partial<ComfortOptions>): ComfortScales {
  current = { ...current, ...options };
  Object.assign(COMFORT, comfortScales(current));
  return COMFORT;
}

export function getComfort(): ComfortOptions {
  return { ...current };
}

/** Sons atténués par le mode moins effrayant (les indices sonores, comme les coups lointains, restent intacts). */
export const SCARY_SOUNDS: ReadonlySet<string> = new Set([
  "growl", "player_hurt", "death", "zombie_hit", "zombie_fall", "door_slam", "metal_clang", "wall_break",
]);
