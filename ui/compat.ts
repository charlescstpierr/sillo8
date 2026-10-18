// Accès défensif au moteur pendant sa réécriture : nouveaux modes ("note", "journal"),
// nouveaux champs du HUD et nouvelles méthodes, avec repli sur SiloState.
import type { Engine } from "@/game/engine";
import type { HudSnapshot } from "@/game/hud";
import type { UiMode } from "@/game/ui";
import type { Action } from "@/game/input";
import { NOTES } from "@/game/notes";

export type AnyMode = UiMode | "note" | "journal";

/** Nombre total de notes de l'étage. */
export const NOTE_TOTAL = Object.keys(NOTES).length;

/** Champs ajoutés au HUD par le nouveau moteur, avec repli sur l'état. */
export interface HudExtra {
  bandages: number;
  cans: number;
  medkits: number;
  cells: number;
  notesCount: number;
  /** 0 = clé à molette, 1 = lance-clous. */
  weapon: 0 | 1;
}

export function hudExtra(engine: Engine, hud: HudSnapshot): HudExtra {
  const h = hud as HudSnapshot & Partial<HudExtra>;
  const s = engine.state;
  return {
    bandages: h.bandages ?? s.bandages ?? 0,
    cans: h.cans ?? s.cans ?? 0,
    medkits: h.medkits ?? s.medkits ?? 0,
    cells: h.cells ?? s.cells ?? 0,
    notesCount: h.notesCount ?? s.notes?.length ?? 0,
    weapon: h.weapon === 1 ? 1 : 0,
  };
}

export function setMode(engine: Engine, mode: AnyMode, character?: string): void {
  engine.setMode(mode as UiMode, character);
}

type Loose = Record<string, unknown>;

/** Appelle engine[name]() si la méthode existe ; sinon `fallback`, avec un avis. */
function call(engine: Engine, name: string, fallback: () => boolean, ok: string, ko: string): boolean {
  const method = (engine as unknown as Loose)[name];
  if (typeof method === "function") return Boolean((method as () => unknown).call(engine));
  const done = fallback();
  engine.notify(done ? ok : ko);
  return done;
}

export const useBandage = (e: Engine) => call(e, "useBandage", () => e.state.useBandage(), "Bandage posé · +30.", "Pas de bandage utile.");
export const useMedkit = (e: Engine) => call(e, "useMedkit", () => e.state.useMedkit(), "Trousse utilisée · +60.", "Aucune trousse utilisable.");
export const eatCan = (e: Engine) => call(e, "eatCan", () => e.state.eatCan(), "Conserve avalée · +15.", "Rien à manger d'utile.");
export const useCell = (e: Engine) => call(e, "useCell", () => e.state.useCell(), "Pile neuve dans la lampe.", "Aucune pile utilisable.");
export const heal = (e: Engine) => call(e, "heal", () => e.state.heal(), "Soins appliqués.", "Rien pour se soigner.");

/** Déclenche une action d'entrée, même si le type Action ne la connaît pas encore. */
export function trigger(engine: Engine, action: string): void {
  engine.input.trigger(action as Action);
}

/** Ouvre le carnet : méthode du moteur si elle existe, sinon changement de mode direct. */
export function openJournal(engine: Engine): void {
  const method = (engine as unknown as Loose).openJournal;
  if (typeof method === "function") (method as () => void).call(engine);
  else setMode(engine, "journal");
}
