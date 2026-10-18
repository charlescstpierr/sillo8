// Réglages persistés (localStorage « sillo8-settings ») et leur application au moteur.
import type { Engine } from "@/game/engine";
import { SERVER_ROUTE } from "@/game/dialogue";

export const SETTINGS_KEY = "sillo8-settings";

export interface Settings {
  lowQuality: boolean | null;
  endpoint: string;
  model: string;
  useServer: boolean;
}

export const DEFAULT_SETTINGS: Settings = { lowQuality: null, endpoint: "", model: "", useServer: false };

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
export function applyStartupSettings(engine: Engine, urlLow: string | null): void {
  const settings = loadSettings();
  if (urlLow === null && settings.lowQuality !== null && settings.lowQuality !== engine.lowQuality) {
    engine.setLowQuality(settings.lowQuality);
  }
  if (settings.useServer) {
    serverDialogueAvailable().then((enabled) => applyDialogue(engine, settings, enabled));
  } else if (!applyDialogue(engine, settings, false)) {
    engine.dialogue.configure("", "");
  }
}
