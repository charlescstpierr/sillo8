"use client";
// Conversation écrite, sur une feuille de papier : répliques, puis réponses de Lou à choisir.
// Le contenu et la logique (conditions, effets sur les faits) viennent de game/conversation.ts.
import { useEffect, useRef, useState } from "react";
import type { Engine } from "@/game/engine";
import { ConversationRun, speakerStatus, type Line } from "@/game/conversation";
import { PaperButton, Tag } from "./Paper";
import { SpeakerPortrait } from "./Portraits";
import { frenchSpaces } from "./typo";
import styles from "./sheets.module.css";

interface Shown extends Line {
  key: number;
}

let lineKey = 0;
const tag = (lines: Line[]): Shown[] => lines.map((line) => ({ ...line, key: ++lineKey }));

export function DialogueSheet({ engine, conversation, touch }: { engine: Engine; conversation: string; touch: boolean }) {
  const data = engine.conversations[conversation];
  // Le déroulé est créé une fois, à l'ouverture (il applique les effets du premier nœud).
  const [run] = useState(() => (data ? new ConversationRun(data, engine.state) : null));
  const [log, setLog] = useState<Shown[]>(() => (run ? tag(run.view().lines) : []));
  const [view, setView] = useState(() => run?.view() ?? null);
  const logRef = useRef<HTMLDivElement>(null);

  const close = () => engine.resume();

  // Échap ferme la conversation (avant le moteur, qui ouvrirait la pause).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      engine.resume();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [engine]);

  // Défile vers la dernière réplique.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  if (!run || !data || !view) {
    return (
      <section className={styles.dialogue} aria-label="Conversation" data-sheet>
        <p className={styles.text}>Personne ne répond.</p>
        <PaperButton variant="primary" autoFocus={!touch} onClick={close}>Fermer</PaperButton>
      </section>
    );
  }

  const choose = (index: number, text: string) => {
    if (!run.choose(index)) return;
    const next = run.view();
    const answer: Line = { who: "lou", text };
    setLog((list) => [...list, ...tag(run.ended ? [answer] : [answer, ...next.lines])].slice(-120));
    setView(next);
  };

  const speaker = data.speaker;
  // Sans jauge : le nom qu'on donne à Lou, ce que fait le corps (recalculés à chaque réplique).
  const status = speakerStatus(speaker.id, engine.state);
  const calls = status.calls ? (status.calls === "…" ? "Elle ne t'appelle plus. Un silence." : speaker.id === "operatrice" ? `Elle t'appelle « ${status.calls} »` : `Il t'appelle « ${status.calls} »`) : "";
  return (
    <section className={styles.dialogue} aria-label={`Conversation avec ${speaker.name}`} data-sheet>
      <header className={styles.dialogueHead}>
        <div className={styles.avatar} data-mood={status.mood}><SpeakerPortrait portrait={speaker.portrait} mood={status.mood} /></div>
        <div>
          <Tag>{status.title && speaker.portrait !== "radio" ? status.title : speaker.title}</Tag>
          <h1 className={styles.title}>{speaker.name}</h1>
          {calls && speaker.portrait !== "radio" && (
            <p className={styles.muted} data-testid="speaker-status" style={{ margin: "2px 0 0", fontSize: "0.85em" }}>
              {calls}{status.gesture ? ` · ${status.gesture}` : ""}
            </p>
          )}
        </div>
      </header>

      <div ref={logRef} className={styles.log} role="log" aria-live="polite">
        {log.map((line) => (
          <p key={line.key} className={styles.line} data-who={line.who === "lou" ? "you" : line.who === "narration" ? "system" : "char"}>
            {line.who === "lou" ? <b>LOU · </b> : line.who === "speaker" ? <b>{speaker.name} · </b> : null}
            {frenchSpaces(line.text)}
          </p>
        ))}
      </div>

      <div className={styles.quick} role="group" aria-label="Réponses">
        {view.done ? (
          <PaperButton variant="primary" arrow autoFocus={!touch} onClick={close}>Terminer</PaperButton>
        ) : (
          view.choices.map((choice, i) => (
            <PaperButton key={`${view.node}-${choice.index}`} variant={i === 0 ? "olive" : undefined} autoFocus={!touch && i === 0} onClick={() => choose(choice.index, choice.text)}>
              {choice.text}
            </PaperButton>
          ))
        )}
      </div>
    </section>
  );
}
