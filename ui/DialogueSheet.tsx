"use client";
// Conversation radio, générique : nom et rôle viennent de story.ts.
import { useEffect, useRef, useState } from "react";
import type { Engine } from "@/game/engine";
import type { Character } from "@/game/state";
import { PaperButton, Tag } from "./Paper";
import { CharacterPortrait } from "./Portraits";
import { characterSheet } from "./story";
import styles from "./sheets.module.css";

interface Line {
  id: number;
  who: "char" | "you" | "system";
  text: string;
  tag?: string;
}

let lineId = 0;

export function DialogueSheet({ engine, character, touch }: { engine: Engine; character: Character; touch: boolean }) {
  const [lines, setLines] = useState<Line[]>(() => [
    { id: ++lineId, who: "char", text: engine.dialogue.offlineReply(character, "bonjour") },
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const push = (line: Omit<Line, "id">) => setLines((list) => [...list, { ...line, id: ++lineId }].slice(-80));

  useEffect(() => {
    const off = engine.dialogue.onReply((who, text, mode) => {
      if (who !== character) return;
      setBusy(false);
      push({ who: "char", text, tag: `[${mode}]` });
    });
    return () => {
      off();
      engine.dialogue.cancel();
    };
  }, [engine, character]);

  // Défile vers la dernière réplique.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [lines, busy]);

  const close = () => {
    engine.dialogue.cancel();
    engine.resume();
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    if (engine.dialogue.busy) {
      push({ who: "system", text: "Réponse en cours. L'indice immédiat reste disponible." });
      return;
    }
    push({ who: "you", text });
    setDraft("");
    engine.dialogue.ask(character, text);
    setBusy(engine.dialogue.busy);
  };

  const hint = (question: string) => {
    push({ who: "char", text: engine.dialogue.offlineReply(character, question), tag: "[dialogue scénarisé]" });
  };

  const sheet = characterSheet(character);
  const name = sheet.name;
  return (
    <section className={styles.dialogue} aria-label={`Radio avec ${name}`} data-sheet>
      <header className={styles.dialogueHead}>
        <div className={styles.avatar}><CharacterPortrait character={character} /></div>
        <div>
          <Tag>RADIO · {sheet.title}</Tag>
          <h1 className={styles.title}>{name}</h1>
        </div>
      </header>

      <div ref={logRef} className={styles.log} role="log" aria-live="polite">
        {lines.map((line) => (
          <p key={line.id} className={styles.line} data-who={line.who}>
            {line.who === "you" ? <b>VOUS · </b> : line.who === "char" ? <b>{name} · </b> : null}
            {line.text}
            {line.tag ? <span className={styles.modeTag}>{line.tag}</span> : null}
          </p>
        ))}
        {busy ? <p className={styles.busy}>{name} compose une réponse</p> : null}
      </div>

      <form
        className={styles.compose}
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="on"
          maxLength={600}
          placeholder="Parlez dans la radio…"
          aria-label={`Message pour ${name}`}
          value={draft}
          autoFocus={!touch}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Le moteur ignore les touches tapées dans un champ : Échap ferme ici.
            if (e.key === "Escape") { e.preventDefault(); close(); }
          }}
        />
        <PaperButton type="submit" variant="primary" disabled={!draft.trim()}>Transmettre</PaperButton>
      </form>

      <div className={styles.quick}>
        <PaperButton variant="olive" onClick={() => hint("Que dois-je faire ?")}>Indice de mission • réponse immédiate</PaperButton>
        <PaperButton onClick={() => hint("surface")}>Et dehors, à la surface ?</PaperButton>
        <PaperButton variant="ghost" onClick={close}>Fermer la liaison</PaperButton>
      </div>
    </section>
  );
}
