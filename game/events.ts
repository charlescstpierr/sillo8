// Événements de jeu émis par le moteur (directement, ou déduits par game/sound.ts à chaque image).
// Le son les écoute ; de futurs systèmes (enquête, succès…) peuvent s'y abonner aussi.
import type { Pose } from "./player";

export type GameEvent =
  | { type: "step"; pose: Pose; floor: string }
  | { type: "swing"; hits: number }
  | { type: "shot" }
  | { type: "reload" }
  | { type: "reloaded" }
  | { type: "lamp" }
  | { type: "weapon"; weapon: number }
  | { type: "zombie_growl"; id: string; x: number; z: number; chasing: boolean }
  | { type: "zombie_hit"; id: string; x: number; z: number }
  | { type: "zombie_down"; id: string; x: number; z: number }
  | { type: "player_hit"; amount: number }
  | { type: "player_death" }
  | { type: "heal" }
  | { type: "pickup"; kind: string }
  | { type: "note_open" }
  | { type: "note_found"; clue: boolean }
  | { type: "door_open"; id: string; x: number; z: number }
  /** Touche E sur un objet ; `changed` faux : refus (porte verrouillée, pièces manquantes…). */
  | { type: "interact"; id: string; changed: boolean }
  | { type: "objective"; fact: string }
  | { type: "generator" }
  | { type: "autosave" }
  | { type: "sheet" }
  /** Bruit d'ambiance nommé (enquête, mystère), facultativement placé dans le monde. */
  | { type: "cue"; name: string; x?: number; z?: number };

export type GameEventListener = (event: GameEvent) => void;

export class GameEvents {
  private listeners: GameEventListener[] = [];

  on(listener: GameEventListener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter((l) => l !== listener); };
  }

  emit(event: GameEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Un auditeur fautif (son indisponible…) ne doit jamais casser la boucle de jeu.
      }
    }
  }
}
