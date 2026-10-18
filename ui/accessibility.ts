// Réglages d'accessibilité et de confort (public visé : 12 ans et plus) : taille du texte, police lisible,
// sous-titres des sons, couleurs adaptées, mode moins effrayant, réduire les animations.
// Lus et validés ici (rétrocompatibles : un ancien réglage sans ces champs prend les valeurs par défaut), appliqués
// à la page (attributs sur <html>, variables CSS) et au moteur (multiplicateurs de game/comfort.ts).
import { setComfort } from "@/game/comfort";

export type TextSize = "small" | "normal" | "large" | "xlarge";
export type CaptionMode = "auto" | "on" | "off";
export type MotionMode = "auto" | "reduced" | "full";

export interface A11ySettings {
  /** Taille du texte de toute l'interface (variable CSS --text-scale). */
  textSize: TextSize;
  /** Police d'imprimerie à la place de l'écriture manuscrite pour les longs textes. */
  readableFont: boolean;
  /** Sous-titres des sons : « auto » = activés sur téléphone quand le son est coupé. */
  captions: CaptionMode;
  /** Couleurs adaptées au daltonisme pour les états importants. */
  safeColors: boolean;
  /** Mode moins effrayant (paramètres seulement, l'histoire ne change pas). */
  gentle: boolean;
  /** Réduire les animations : « auto » suit le réglage du système (prefers-reduced-motion). */
  motion: MotionMode;
}

export const DEFAULT_A11Y: A11ySettings = {
  textSize: "normal", readableFont: false, captions: "auto", safeColors: false, gentle: false, motion: "auto",
};

export const TEXT_SCALE: Record<TextSize, number> = { small: 0.9, normal: 1, large: 1.15, xlarge: 1.3 };

export const TEXT_SIZE_LABELS: [TextSize, string][] = [
  ["small", "Petit"], ["normal", "Normal"], ["large", "Grand"], ["xlarge", "Très grand"],
];

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Lit les champs d'accessibilité d'un objet de réglages quelconque (anciens réglages, données abîmées). */
export function parseA11y(data: unknown): A11ySettings {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  return {
    textSize: pick(d.textSize, ["small", "normal", "large", "xlarge"] as const, DEFAULT_A11Y.textSize),
    readableFont: d.readableFont === true,
    // Ancien booléen éventuel : true → toujours, false → jamais.
    captions: d.captions === true ? "on" : d.captions === false ? "off" : pick(d.captions, ["auto", "on", "off"] as const, "auto"),
    safeColors: d.safeColors === true,
    gentle: d.gentle === true,
    motion: d.motion === true ? "reduced" : pick(d.motion, ["auto", "reduced", "full"] as const, "auto"),
  };
}

/** Animations réduites ? « auto » suit le système. */
export function motionReduced(motion: MotionMode, systemPrefersReduced: boolean): boolean {
  return motion === "reduced" || (motion === "auto" && systemPrefersReduced);
}

/** Sous-titres affichés ? « auto » : seulement sur téléphone, et seulement si le son est coupé. */
export function captionsActive(mode: CaptionMode, touch: boolean, muted: boolean): boolean {
  return mode === "on" || (mode === "auto" && touch && muted);
}

/** Le son du jeu est-il coupé (volume à zéro ou son indisponible) ? */
export function soundMuted(audio: { supported: boolean; settings: { master: number; sfx: number } }): boolean {
  return !audio.supported || audio.settings.master <= 0.001 || audio.settings.sfx <= 0.001;
}

// ——— Réglages en vigueur (partagés entre les réglages, le HUD et les sous-titres) ———

type Listener = () => void;
let current: A11ySettings = { ...DEFAULT_A11Y };
const listeners = new Set<Listener>();
let systemQuery: MediaQueryList | null = null;

export const a11yStore = {
  get: (): A11ySettings => current,
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

function systemReduced(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  if (!systemQuery) {
    systemQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Le système change d'avis en cours de partie : on suit, si le réglage est sur « auto ».
    systemQuery.addEventListener?.("change", () => applyA11y(current));
  }
  return systemQuery.matches;
}

/** Applique les réglages à la page et au moteur ; immédiat (aperçu dans les réglages) et au démarrage. */
export function applyA11y(settings: A11ySettings): void {
  current = { ...settings };
  const reduced = motionReduced(settings.motion, systemReduced());
  setComfort({ reduceMotion: reduced, gentle: settings.gentle, safeColors: settings.safeColors });
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.style.setProperty("--text-scale", String(TEXT_SCALE[settings.textSize]));
    root.dataset.textSize = settings.textSize;
    root.dataset.font = settings.readableFont ? "readable" : "hand";
    root.dataset.motion = reduced ? "reduced" : "full";
    root.dataset.palette = settings.safeColors ? "safe" : "default";
    root.dataset.gentle = settings.gentle ? "true" : "false";
  }
  for (const listener of listeners) listener();
}
