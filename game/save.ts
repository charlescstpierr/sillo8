// Emplacements de sauvegarde et code de sauvegarde (export / import).
// Trois emplacements, chacun dans sa clé du navigateur :
// - « Début d'étage » : écrit en entrant dans un étage, jamais écrasé en cours d'étage ;
// - « Lieu sûr »      : automatique, seulement dans une pièce sûre et hors danger (voir safety.ts) ;
// - « Manuel »        : F5 et menu pause. Garde la clé historique « sillo8-save » (les anciennes v2 y sont).
import { sectorAt } from "./level";
import { SiloState, type KeyValueStore, type LoadResult } from "./state";

export type SlotId = "floor" | "safe" | "manual";

export interface SlotDef {
  id: SlotId;
  key: string;
  label: string;
  /** Quand l'emplacement est écrit. */
  hint: string;
}

export const SLOTS: readonly SlotDef[] = [
  { id: "safe", key: "sillo8-save-safe", label: "Lieu sûr", hint: "Automatique, dans une pièce sûre, loin des mordus" },
  { id: "manual", key: "sillo8-save", label: "Manuel", hint: "F5 ou menu pause" },
  { id: "floor", key: "sillo8-save-floor", label: "Début d'étage", hint: "En entrant dans l'étage" },
];

export function slotDef(id: SlotId): SlotDef {
  return SLOTS.find((s) => s.id === id)!;
}

/** Résumé d'un emplacement, pour le menu « Continuer ». */
export interface SlotInfo {
  id: SlotId;
  label: string;
  hint: string;
  /** "ok" : chargeable ; "corrupt" / "newer" : présent mais illisible par cette version. */
  status: Exclude<LoadResult, "missing">;
  savedAt: number;
  floor: number;
  sector: string;
  objective: string;
  elapsed: number;
  health: number;
}

function read(store: KeyValueStore, key: string): string | null {
  try {
    const raw = store.getItem(key);
    return raw === null || raw === "" ? null : raw;
  } catch {
    return null;
  }
}

/** Lit un emplacement sans toucher à la partie en cours ; null s'il est vide. */
export function slotInfo(store: KeyValueStore, id: SlotId): SlotInfo | null {
  const def = slotDef(id);
  const raw = read(store, def.key);
  if (raw === null) return null;
  const probe = new SiloState();
  const status = probe.loadText(raw);
  let savedAt = 0;
  try {
    const at = (JSON.parse(raw) as { saved_at?: unknown }).saved_at;
    if (typeof at === "number" && Number.isFinite(at)) savedAt = at;
  } catch {
    // illisible : statut "corrupt" déjà connu
  }
  return {
    id, label: def.label, hint: def.hint, status, savedAt,
    floor: probe.floor,
    sector: status === "ok" ? sectorAt(probe.playerPosition[0], probe.playerPosition[2]) : "",
    objective: status === "ok" ? probe.objective() : "",
    elapsed: probe.elapsed,
    health: Math.round(probe.health),
  };
}

export function listSlots(store: KeyValueStore): SlotInfo[] {
  return SLOTS.map((s) => slotInfo(store, s.id)).filter((s): s is SlotInfo => s !== null);
}

/**
 * Emplacement chargeable le plus récent. À date égale (anciennes v2 sans date), le temps de jeu départage,
 * puis l'ordre de SLOTS.
 */
export function latestSlot(store: KeyValueStore): SlotId | null {
  let best: SlotInfo | null = null;
  for (const info of listSlots(store)) {
    if (info.status !== "ok") continue;
    if (!best || info.savedAt > best.savedAt || (info.savedAt === best.savedAt && info.elapsed > best.elapsed)) best = info;
  }
  return best?.id ?? null;
}

export function anySave(store: KeyValueStore): boolean {
  return SLOTS.some((s) => read(store, s.key) !== null);
}

export function writeSlot(state: SiloState, store: KeyValueStore, id: SlotId, now = Date.now()): boolean {
  return state.saveGame(store, slotDef(id).key, now) === "ok";
}

export function loadSlot(state: SiloState, store: KeyValueStore, id: SlotId): LoadResult {
  return state.loadGame(store, slotDef(id).key);
}

export function clearSlot(store: KeyValueStore, id: SlotId): void {
  try {
    if (store.removeItem) store.removeItem(slotDef(id).key);
    else store.setItem(slotDef(id).key, "");
  } catch {
    // stockage indisponible : rien à effacer
  }
}

// ——— Code de sauvegarde (changer d'appareil, se protéger d'un effacement du navigateur) ———

export const CODE_PREFIX = "SILLO8-";

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function fromBase64(code: string): string | null {
  try {
    const binary = atob(code);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Code texte de l'emplacement `id` (par défaut : le plus récent), ou null s'il n'y a rien à exporter. */
export function exportCode(store: KeyValueStore, id: SlotId | null = latestSlot(store)): string | null {
  if (!id) return null;
  const raw = read(store, slotDef(id).key);
  if (raw === null || new SiloState().loadText(raw) !== "ok") return null;
  return CODE_PREFIX + toBase64(raw);
}

/** Décode un code collé (espaces et retours à la ligne tolérés) en état de partie, sans rien écrire. */
export function decodeCode(code: string): { result: Exclude<LoadResult, "missing">; state: SiloState | null } {
  const clean = code.replace(/\s+/g, "");
  const body = clean.startsWith(CODE_PREFIX) ? clean.slice(CODE_PREFIX.length) : clean;
  const text = body.length > 0 && body.length < 400000 ? fromBase64(body) : null;
  if (text === null) return { result: "corrupt", state: null };
  const state = new SiloState();
  const result = state.loadText(text);
  return { result, state: result === "ok" ? state : null };
}

/**
 * Importe un code dans l'emplacement « Manuel », daté de maintenant : « Continuer » le reprend ensuite.
 * Un code d'une ancienne version est migré au passage.
 */
export function importCode(store: KeyValueStore, code: string, now = Date.now()): Exclude<LoadResult, "missing"> | "write_failed" {
  const decoded = decodeCode(code);
  if (!decoded.state) return decoded.result;
  return decoded.state.saveGame(store, slotDef("manual").key, now) === "ok" ? "ok" : "write_failed";
}
