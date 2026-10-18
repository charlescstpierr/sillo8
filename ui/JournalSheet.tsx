"use client";
// Carnet de cuir : objectif en cours, notes trouvées à gauche, note choisie à droite.
import { useState } from "react";
import type { Engine } from "@/game/engine";
import { NOTES } from "@/game/notes";
import { PaperButton } from "./Paper";
import { NotePaper } from "./NoteSheet";
import { useHud } from "./useHud";
import { NOTE_TOTAL } from "./compat";
import styles from "./sheets.module.css";

const ORDER = Object.keys(NOTES);

export function JournalSheet({ engine, initial, touch }: { engine: Engine; initial: string; touch: boolean }) {
  const hud = useHud(engine.hud);
  const found = engine.state.notes.filter((id) => id in NOTES);
  const [selected, setSelected] = useState<string | null>(() =>
    found.includes(initial) ? initial : found[found.length - 1] ?? null,
  );
  const note = selected ? NOTES[selected] : null;
  return (
    <section className={styles.journal} aria-label="Carnet" data-sheet>
      <span className={styles.strap} aria-hidden />
      <div className={styles.journalPages}>
        <div className={styles.page} data-side="left">
          <header className={styles.journalHead}>
            <h1 className={styles.journalTitle}>Carnet</h1>
            <span className={styles.journalCount}>{found.length} / {NOTE_TOTAL} notes trouvées</span>
          </header>
          <div className={styles.objectiveBox}>
            <small>Objectif</small>
            <p>{hud.objective.title}</p>
          </div>
          <ol className={styles.noteList}>
            {ORDER.map((id, index) => {
              const known = found.includes(id);
              return (
                <li key={id}>
                  {known ? (
                    <button type="button" data-active={id === selected} onClick={() => setSelected(id)}>
                      <span className={styles.noteNum}>{index + 1}.</span>
                      <span>{NOTES[id].title}</span>
                      {NOTES[id].clue ? <span className={styles.clueDot} title="Indice">!</span> : null}
                    </button>
                  ) : (
                    <span className={styles.missing}><span className={styles.noteNum}>{index + 1}.</span> · · · note manquante</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
        <div className={styles.page} data-side="right">
          {note ? (
            <NotePaper key={note.id} note={note} compact />
          ) : (
            <p className={styles.emptyPage}>Aucune note pour l&apos;instant. Fouillez les pièces : les survivants laissent des mots partout.</p>
          )}
        </div>
        <div className={styles.journalFoot}>
          <PaperButton variant="primary" autoFocus={!touch} hotkey={touch ? undefined : "J"} onClick={() => engine.resume()}>Fermer le carnet</PaperButton>
        </div>
      </div>
    </section>
  );
}
