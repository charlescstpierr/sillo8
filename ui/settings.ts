// Réglages persistés (localStorage « sillo8-settings ») et leur application au moteur.
import type { Engine } from "@/game/engine";
import { SERVER_ROUTE } from "@/game/dialogue";
import type { ArrowMode } from "@/game/tutorial";
import { DEFAULT_SOUND } from "@/game/mix";

export const SETTINGS_KEY = "sillo8-settings";

export interface Settings {
  lowQuality: boolean | null;
  endpoint: string;
  model: string;
  useServer: boolean;
  /** Flèche d'objectif : "auto" après ~45 s sans progrès (par défaut), toujours, ou jamais. */
  objectiveArrow: ArrowMode;
  /** Son : volumes 0 → 1 et vibration (absents des anciennes sauvegardes de réglages). */
  master: number;
  music: number;
  sfx: number;
  vibration: boolean;
}

export const DEFAULT_SETTINGS: Settings = { lowQuality: null, endpoint: "", model: "", useServer: false, objectiveArrow: "auto", ...DEFAULT_SOUND };

/** Anciens réglages sans le champ, ou booléen oui/non : repli sur "auto" (false → jamais). */
export function arrowMode(value: unknown): ArrowMode {
  if (value === "always" || value === "never" || value === "auto") return value;
  if (value === false) return "never";
  return "auto";
}

function volume(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

export function loadSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw || raw.length > 4096) return { ...DEFAULT_SETTINGS };
    const data = JSON.parse(raw) as Partial<Settings>;
    return {
      lowQuality: typeof data.lowQuality === "boolean" ? data.lowQuality : null,
      endpoint: typeof data.endpoint === "string" ? data.endpoint.slice(0, 512) : "",
      model: typeof data.model === "string" ? data.model.slice(0, 128) : "",
      useServer: data.useServer === true,
      objectiveArrow: arrowMode(data.objectiveArrow),
      master: volume(data.master, DEFAULT_SOUND.master),
      music: volume(data.music, DEFAULT_SOUND.music),
      sfx: volume(data.sfx, DEFAULT_SOUND.sfx),
      vibration: typeof data.vibration === "boolean" ? data.vibration : DEFAULT_SOUND.vibration,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): boolean {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/** Le serveur du jeu propose-t-il un proxy IA ? (GET /api/dialogue → {enabled}) */
export async function serverDialogueAvailable(): Promise<boolean> {
  try {
    const response = await fetch(SERVER_ROUTE, { method: "GET", cache: "no-store" });
    if (!response.ok) return false;
    const data = (await response.json()) as { enabled?: unknown };
    return data.enabled === true;
  } catch {
    return false;
  }
}

/** Configure la conversation : proxy serveur, adresse personnalisée, ou hors ligne. */
export function applyDialogue(engine: Engine, settings: Settings, serverEnabled: boolean): boolean {
  if (settings.useServer && serverEnabled) return engine.dialogue.configure(SERVER_ROUTE, "");
  if (settings.useServer) return engine.dialogue.configure("", "");
  return engine.dialogue.configure(settings.endpoint, settings.model);
}

/** Au démarrage : réglages enregistrés appliqués au moteur (l'adresse ?low= reste prioritaire). */
/** Volumes et vibration appliqués au son du moteur. */
export function applySound(engine: Engine, settings: Pick<Settings, "master" | "music" | "sfx" | "vibration">): void {
  engine.audio.configure({ master: settings.master, music: settings.music, sfx: settings.sfx, vibration: settings.vibration });
}

export function applyStartupSettings(engine: Engine, urlLow: string | null): void {
  const settings = loadSettings();
  engine.tutorial.arrowMode = settings.objectiveArrow;
  applySound(engine, settings);
  if (urlLow === null && settings.lowQuality !== null && settings.lowQuality !== engine.lowQuality) {
    engine.setLowQuality(settings.lowQuality);
  }
  if (settings.useServer) {
    serverDialogueAvailable().then((enabled) => applyDialogue(engine, settings, enabled));
  } else if (!applyDialogue(engine, settings, false)) {
    engine.dialogue.configure("", "");
  }
}
