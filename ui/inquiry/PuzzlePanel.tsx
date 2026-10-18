"use client";
// Énigmes de l'enquête, jouées dans le gros plan (données : game/investigation/content/deductions.ts, PUZZLES) :
// cadenas à molettes de lettres, mot de passe au clavier à lettres, leviers à abaisser dans l'ordre.
// Style papier, tout au toucher ; au clavier, on peut aussi taper le mot dans le champ (le moteur ignore les champs).
import { useEffect, useRef, useState } from "react";
import type { Engine } from "@/game/engine";
import { INDEX } from "@/game/investigation/world";
import type { Puzzle } from "@/game/investigation/types";
import { ThoughtPaper } from "../InquiryLayer";
import styles from "./puzzle.module.css";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function PuzzlePanel({ engine, id, touch }: { engine: Engine; id: string; touch: boolean }) {
  const puzzle = INDEX.puzzles.get(id);
  const [solved, setSolved] = useState(() => engine.inquiry.puzzleSolved(id));
  const [thought, setThought] = useState<{ text: string; key: number } | null>(null);
  const [flash, setFlash] = useState(0);
  if (!puzzle) return null;

  const attempt = (input: string[]) => {
    const verdict = engine.inquiry.solvePuzzle(id, input);
    if (verdict.ok) {
      setSolved(true);
      setThought(null);
      return true;
    }
    setThought({ text: verdict.thought, key: Date.now() });
    if (puzzle.kind === "levers") setFlash(Date.now());
    return false;
  };

  return (
    <section className={styles.panel} aria-label={`Énigme : ${puzzle.prompt}`} data-kind={puzzle.kind} data-solved={solved || undefined}>
      {solved ? (
        <p className={styles.solved} role="status"><span className={styles.solvedStamp}>Ouvert</span>{puzzle.solved}</p>
      ) : (
        <>
          <p className={styles.prompt}>{puzzle.prompt}</p>
          {puzzle.kind === "levers" ? <Levers puzzle={puzzle} onTry={attempt} flash={flash} /> : <Word puzzle={puzzle} onTry={attempt} touch={touch} />}
          {thought ? <div className={styles.thought}><ThoughtPaper key={thought.key} text={thought.text} /></div> : null}
        </>
      )}
      {flash ? <div key={flash} className={styles.blackout} aria-hidden /> : null}
    </section>
  );
}

/** Cadenas à molettes (lettres) ou mot de passe (clavier à lettres). */
function Word({ puzzle, onTry, touch }: { puzzle: Puzzle; onTry: (input: string[]) => boolean; touch: boolean }) {
  const wheels = puzzle.kind === "letters";
  const size = wheels ? puzzle.answer.length : 12;
  const [value, setValue] = useState(() => (wheels ? "A".repeat(size) : ""));
  /** Lettres tapées au clavier (cadenas) : elles remplissent les molettes depuis la gauche. */
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!touch) inputRef.current?.focus({ preventScroll: true });
  }, [touch]);

  const clean = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, size);
  const type = (s: string) => {
    const t = clean(s);
    if (wheels) {
      setTyped(t);
      setValue(t + value.slice(t.length));
    } else setValue(t);
  };
  const roll = (i: number, step: number) => {
    const letters = value.split("");
    letters[i] = LETTERS[(LETTERS.indexOf(letters[i]) + step + 26) % 26];
    setValue(letters.join(""));
    setTyped("");
  };
  const submit = () => {
    if (!value) return;
    if (!onTry(wheels ? value.split("") : [value]) && !wheels) setValue("");
  };

  const screen = <p className={styles.screen} aria-live="polite">{value || "_"}<span className={styles.caret} aria-hidden>▌</span></p>;

  return (
    <div className={styles.word}>
      {wheels ? (
        <div className={styles.wheels} role="group" aria-label="Molettes du cadenas">
          {value.split("").map((letter, i) => (
            <div key={i} className={styles.wheel}>
              <button type="button" className={styles.roll} onClick={() => roll(i, -1)} aria-label={`Molette ${i + 1} : lettre précédente`}>▲</button>
              <span className={styles.letter} aria-label={`Molette ${i + 1} : ${letter}`}>{letter}</span>
              <button type="button" className={styles.roll} onClick={() => roll(i, 1)} aria-label={`Molette ${i + 1} : lettre suivante`}>▼</button>
            </div>
          ))}
        </div>
      ) : touch ? null : screen}
      <form
        className={styles.typeRow}
        data-touch={touch || undefined}
        onSubmit={(e) => { e.preventDefault(); submit(); }}
      >
        {/* Au doigt, l'écran du terminal et « Valider » tiennent sur une seule ligne. */}
        {!wheels && touch ? screen : null}
        {/* Au doigt, le champ ne sert à rien (pas de clavier du téléphone) : molettes ou clavier à lettres. */}
        {touch ? null : (
          <input
            ref={inputRef}
            className={styles.field}
            value={wheels ? typed : value}
            placeholder={wheels ? "ou tapez les lettres" : "tapez le mot"}
            aria-label={wheels ? "Taper les lettres du cadenas" : "Mot de passe"}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            onChange={(e) => type(e.target.value)}
          />
        )}
        <button type="submit" className={styles.go}>{wheels ? "Ouvrir" : "Valider"}</button>
      </form>
      {!wheels ? (
        <div className={styles.keys} role="group" aria-label="Clavier" data-touch={touch || undefined}>
          {LETTERS.map((l) => (
            <button key={l} type="button" className={styles.key} onClick={() => setValue((v) => clean(v + l))} aria-label={`Lettre ${l}`}>{l}</button>
          ))}
          <button type="button" className={styles.key} data-wide onClick={() => setValue((v) => v.slice(0, -1))} aria-label="Effacer une lettre">⌫</button>
        </div>
      ) : null}
    </div>
  );
}

/** Leviers à abaisser un par un ; à la fin de la série, le tableau dit si l'ordre tient. */
function Levers({ puzzle, onTry, flash }: { puzzle: Puzzle; onTry: (input: string[]) => boolean; flash: number }) {
  const options = puzzle.options ?? [];
  const [pulled, setPulled] = useState<string[]>([]);
  useEffect(() => { if (flash) setPulled([]); }, [flash]);
  const pull = (label: string) => {
    if (pulled.includes(label)) return;
    const next = [...pulled, label];
    setPulled(next);
    if (next.length === puzzle.answer.length && !onTry(next)) window.setTimeout(() => setPulled([]), 350);
  };
  return (
    <div className={styles.levers} role="group" aria-label="Leviers">
      {options.map((label) => {
        const rank = pulled.indexOf(label);
        return (
          <button key={label} type="button" className={styles.lever} data-down={rank >= 0 || undefined} onClick={() => pull(label)} aria-pressed={rank >= 0} aria-label={`Levier ${label}`}>
            <span className={styles.leverSlot} aria-hidden><span className={styles.leverKnob} /></span>
            <span className={styles.leverLabel}>{label}</span>
            <span className={styles.leverRank} aria-hidden>{rank >= 0 ? rank + 1 : ""}</span>
          </button>
        );
      })}
      <button type="button" className={styles.reset} onClick={() => setPulled([])} disabled={!pulled.length}>Tout relever</button>
    </div>
  );
}
