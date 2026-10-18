"use client";
// Fiche de lecture d'une note de survivant : papier ligné, scotch, tache de café, signature.
import type { Engine } from "@/game/engine";
import { NOTES, type Note } from "@/game/notes";
import { PaperButton } from "./Paper";
import { NOTE_TOTAL, setMode } from "./compat";
import styles from "./sheets.module.css";

/** Feuille manuscrite, réutilisée par le carnet. */
export function NotePaper({ note, compact }: { note: Note; compact?: boolean }) {
  return (
    <article className={styles.notePaper} data-compact={compact ? true : undefined} aria-label={note.title}>
      <span className={styles.tape} data-side="left" aria-hidden />
      <span className={styles.tape} data-side="right" aria-hidden />
      <span className={styles.coffee} aria-hidden />
      {note.clue ? <span className={styles.clueStamp} aria-label="Indice">INDICE</span> : null}
      <h1 className={styles.noteTitle}>{note.title}</h1>
      <p className={styles.noteText}>{note.text}</p>
      <p className={styles.noteAuthor}>— {note.author}</p>
    </article>
  );
}

export function NoteSheet({ engine, id, touch }: { engine: Engine; id: string; touch: boolean }) {
  const note = NOTES[id];
  if (!note) {
    return (
      <section className={styles.sheet} aria-label="Note illisible" data-sheet>
        <h1 className={styles.title}>Note illisible</h1>
        <p className={styles.text}>L&apos;encre a coulé. Impossible de lire quoi que ce soit.</p>
        <PaperButton variant="primary" autoFocus={!touch} onClick={() => engine.resume()}>Reprendre</PaperButton>
      </section>
    );
  }
  const found = engine.state.notes.length;
  return (
    <div className={styles.noteSheet} data-sheet>
      <p className={styles.noteCount}>Note de survivant · {Math.max(1, found)}/{NOTE_TOTAL} dans le carnet</p>
      <NotePaper note={note} />
      <div className={styles.noteButtons}>
        <PaperButton variant="primary" arrow autoFocus={!touch} hotkey={touch ? undefined : "E"} onClick={() => engine.resume()}>Ranger dans le carnet</PaperButton>
        <PaperButton variant="leather" hotkey={touch ? undefined : "J"} onClick={() => setMode(engine, "journal", id)}>Ouvrir le carnet</PaperButton>
      </div>
    </div>
  );
}
