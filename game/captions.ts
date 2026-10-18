// Sous-titres des sons : traduit un son demandé (GameAudio.listen, alimenté par game/sound.ts et audio.cue) en une
// courte ligne entre crochets, avec sa direction : « [grognement à gauche] », « [radio qui grésille au loin] ».
// Seuls les sons utiles au joueur sont sous-titrés (menaces, portes, indices, bruits mystérieux) ; les pas, gouttes et
// clics d'interface restent muets pour ne pas noyer l'écran. Logique pure, testée sous Node.
import type { HeardSound } from "./audio";

export interface CaptionText {
  /** Clé de regroupement : un même bruit répété rafraîchit sa ligne au lieu d'en ajouter une. */
  key: string;
  text: string;
  /** Menace (grognement, morsure) : la ligne est mise en avant. */
  danger: boolean;
}

/** Au-delà de cette distance (m), un son placé dans le monde est « au loin » ; en deçà de NEAR, « tout près ». */
const FAR = 13;
const NEAR = 3.5;
/** Écart gauche / droite à partir duquel on précise le côté. */
const SIDE = 0.3;

/** « à gauche », « à droite », « tout près », « au loin, à droite »… ou "" si rien d'utile à dire. */
export function direction(sound: Pick<HeardSound, "pan" | "distance" | "placed" | "far">, farByDefault = false): string {
  const side = sound.pan <= -SIDE ? "à gauche" : sound.pan >= SIDE ? "à droite" : "";
  if (sound.placed && sound.distance < NEAR) return "tout près";
  const far = sound.far || farByDefault || (sound.placed && sound.distance > FAR);
  if (far) return side ? `au loin, ${side}` : "au loin";
  return side;
}

function line(label: string, where: string): string {
  return `[${where ? `${label} ${where}` : label}]`;
}

type Recipe = (sound: HeardSound) => Omit<CaptionText, "key"> | null;

const RECIPES: Record<string, Recipe> = {
  growl: (s) => ({ text: line(s.intensity >= 1 ? "grognement furieux" : "grognement", direction(s)), danger: true }),
  zombie_fall: (s) => ({ text: line("un mordu s'effondre", direction(s)), danger: false }),
  player_hurt: () => ({ text: "[morsure]", danger: true }),
  door_open: (s) => ({ text: line("porte qui s'ouvre", direction(s)), danger: false }),
  locked: () => ({ text: "[verrou bloqué]", danger: false }),
  wall_break: () => ({ text: "[le mur cède]", danger: false }),
  generator: () => ({ text: "[la génératrice démarre en grondant]", danger: false }),
  // Bruits mystérieux (audio.cue) : toujours lointains, d'un côté.
  door_slam: (s) => ({ text: line("porte qui claque", direction(s, true)), danger: false }),
  radio_static: (s) => ({ text: line("radio qui grésille", direction(s, s.far)), danger: false }),
  distant_steps: (s) => ({ text: line("pas lents", direction(s, true)), danger: false }),
  metal_clang: (s) => ({ text: line("choc métallique", direction(s, true)), danger: false }),
  distant_knock: (s) => ({ text: line("trois coups, réguliers", direction(s, true)), danger: false }),
  creak: (s) => (s.placed ? { text: line("grincement", direction(s)), danger: false } : null),
};

/** Noms des sons sous-titrés. */
export const CAPTIONED = Object.keys(RECIPES);

/** Sous-titre d'un son, ou null s'il n'en mérite pas. */
export function captionFor(sound: HeardSound): CaptionText | null {
  const recipe = RECIPES[sound.name];
  if (!recipe) return null;
  const caption = recipe(sound);
  return caption ? { key: sound.name, ...caption } : null;
}
