"use client";
// En jeu : bulle de pensée de Lou au-dessus de sa tête (placée par le moteur pour ne rien recouvrir),
// petite carte « nouvel indice » qui file vers le carnet, et voile violet quand la lampe UV est allumée.
import { useEffect, useState } from "react";
import type { Engine } from "@/game/engine";
import { INDEX } from "@/game/investigation/world";
import { useInquiry } from "./inquiry/useInquiry";
import { useUi } from "./useUi";
import { frenchSpaces } from "./typo";
import styles from "./inquiry.module.css";

/** Bulle de pensée papier (« … » quand Lou se tait). */
export function ThoughtPaper({ text }: { text: string | null }) {
  return (
    <p className={styles.thoughtPaper} role="status" aria-label="Pensée de Lou" data-silent={text === null ? true : undefined}>
      {text === null ? "…" : frenchSpaces(text)}
    </p>
  );
}

/** Carte « nouvel indice » (titre de la carte), qui glisse vers le carnet. */
export function NewClue({ card }: { card: string | null }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setDone(true), 2600);
    return () => window.clearTimeout(timer);
  }, []);
  const title = card ? INDEX.cards.get(card)?.title : null;
  if (!title || done) return null;
  return (
    <div className={styles.newClue} role="status" aria-label={`Nouvel indice : ${title}`}>
      <span className={styles.newClueTag}>Nouvel indice</span>
      <b>{title}</b>
      <small>rangé au carnet</small>
    </div>
  );
}

export function InquiryLayer({ engine }: { engine: Engine }) {
  const ui = useUi(engine.ui);
  const inquiry = useInquiry(engine.inquiry.store);
  const playing = ui.mode === "playing";
  return (
    <div className={styles.layer} data-hidden={!playing}>
      {inquiry.uv && playing ? <div className={styles.uvVeil} aria-hidden /> : null}
      {inquiry.uv && playing ? <p className={styles.uvBadge} role="status">Lampe UV</p> : null}
      <div
        ref={(el) => { engine.inquiry.thoughtEl = el; }}
        className={styles.thought}
        data-visible={Boolean(inquiry.thought) && playing}
        aria-hidden={!inquiry.thought || !playing}
      >
        {inquiry.thought && playing ? <ThoughtPaper key={inquiry.thought.key} text={inquiry.thought.text} /> : null}
      </div>
      {inquiry.toast && playing ? <NewClue key={inquiry.toast.key} card={inquiry.toast.card} /> : null}
    </div>
  );
}
