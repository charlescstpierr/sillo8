// Mode d'interface courant (port des modes de main.gd). La simulation ne tourne qu'en mode "playing".
import type { Character } from "./state";

export type UiMode =
  | "menu" | "playing" | "pause" | "settings" | "inventory" | "dialogue" | "conclusion" | "death"
  /** Fiche de lecture d'une note (identifiant dans `character`) et carnet des notes lues. */
  | "note" | "journal"
  /** Gros plan d'un objet d'enquête (identifiant dans `character`). */
  | "closeup";

export interface UiSnapshot {
  mode: UiMode;
  /** Mode d'où l'on vient (retour depuis les réglages). */
  previous: UiMode;
  /** Conversation ouverte (identifiant de game/conversation.ts), note lue (ex. "note_storage"), ou identifiant de la conclusion (ex. "floor2"). */
  character: Character;
}

export class UiStore {
  private snapshot: UiSnapshot = { mode: "playing", previous: "playing", character: "" };
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  get = (): UiSnapshot => this.snapshot;

  set(mode: UiMode, character?: Character): void {
    this.snapshot = { mode, previous: this.snapshot.mode, character: character ?? this.snapshot.character };
    for (const listener of this.listeners) listener();
  }
}
