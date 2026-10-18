"use client";
// Choix d'un emplacement de sauvegarde (menu principal, pause) : Lieu sûr, Manuel, Début d'étage.
import type { Engine } from "@/game/engine";
import { PaperButton } from "./Paper";
import styles from "./sheets.module.css";

function when(savedAt: number): string {
  if (!savedAt) return "date inconnue";
  try {
    return new Date(savedAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "date inconnue";
  }
}

function playTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

export function SaveSlots({ engine, onCancel }: { engine: Engine; onCancel: () => void }) {
  const slots = engine.saveSlots();
  return (
    <div className={styles.slots} role="group" aria-label="Emplacements de sauvegarde">
      {slots.length === 0 ? <p className={styles.muted}>Aucune sauvegarde.</p> : null}
      {slots.map((slot) => (
        <div key={slot.id} className={styles.slot} data-slot={slot.id}>
          <div className={styles.slotText}>
            <b>{slot.label}</b>
            {slot.status === "ok" ? (
              <span>
                {when(slot.savedAt)} · étage {slot.floor} · {slot.sector.toLowerCase()} · {playTime(slot.elapsed)} de jeu
                <br />
                <em>{slot.objective}</em>
              </span>
            ) : (
              <span>{slot.status === "newer" ? "Faite avec une version plus récente du jeu." : "Illisible."}</span>
            )}
          </div>
          <PaperButton variant="olive" aria-label={`Charger ${slot.label}`} disabled={slot.status !== "ok"} onClick={() => engine.loadGame(slot.id)}>
            Charger
          </PaperButton>
        </div>
      ))}
      <PaperButton variant="ghost" onClick={onCancel}>Retour</PaperButton>
    </div>
  );
}
