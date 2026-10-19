"use client";
// Tableau d'enquête (onglet « Enquête » du carnet) : cartes rangées par question ouverte, mode « relier deux
// cartes » pour les contradictions, phrases à trous à compléter depuis la banque de mots (validées en entier),
// tampon quand c'est juste, pensée de Lou quand c'est faux, bouton « Réfléchir » (aide en trois paliers).
// Tout se fait au toucher : toucher une carte, puis l'autre ; toucher une case, puis un mot.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Engine } from "@/game/engine";
import { CONTENT, INDEX } from "@/game/investigation/world";
import { recordOf } from "@/game/investigation/record";
import { cluesFound, conditionMet, parseSentence, visibleDeductions, wordBank } from "@/game/investigation/logic";
import type { Card, CardIcon, Contradiction, Deduction, Question, Sentence } from "@/game/investigation/types";
import { useInquiry } from "./inquiry/useInquiry";
import { ThoughtPaper } from "./InquiryLayer";
import styles from "./inquiry.module.css";

const TIER = ["", "orienter", "pointer", "relier"];

export function InquiryBoard({ engine, touch, close }: { engine: Engine; touch: boolean; close: ReactNode }) {
  const inquiry = useInquiry(engine.inquiry.store);
  const record = recordOf(engine.state);
  const [linking, setLinking] = useState(false);
  const [first, setFirst] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, (string | null)[]>>({});
  const [slot, setSlot] = useState<{ id: string; slot: number } | null>(null);
  const [success, setSuccess] = useState<{ id: string; lines: string[]; key: number } | null>(null);
  const [tier, setTier] = useState(0);

  useEffect(() => {
    engine.inquiry.clearBoardThought();
    const timer = window.setInterval(() => engine.inquiry.refreshHint(), 5000);
    return () => window.clearInterval(timer);
  }, [engine]);

  // Recalculé à chaque progrès (version).
  const view = useMemo(() => {
    void inquiry.version;
    const deductions = visibleDeductions(INDEX, record, engine.state);
    const questions = CONTENT.questions
      .filter((q) => (q.requires ? conditionMet(q.requires, record, engine.state) : CONTENT.cards.some((c) => c.question === q.id && record.cards.includes(c.id))))
      .sort((a, b) => a.layer - b.layer);
    return { deductions, questions, bank: wordBank(INDEX, record) };
  }, [inquiry.version, record, engine.state]);

  const cardsOf = (q: Question) => record.cards.map((id) => INDEX.cards.get(id)).filter((c): c is Card => Boolean(c && c.question === q.id));

  const tapCard = (id: string) => {
    if (!linking) {
      setExpanded((e) => (e === id ? null : id));
      return;
    }
    if (!first) {
      setFirst(id);
      engine.inquiry.clearBoardThought();
      return;
    }
    if (first === id) {
      setFirst(null);
      return;
    }
    const verdict = engine.inquiry.link(first, id);
    setFirst(null);
    if (verdict.ok) {
      setLinking(false);
      setSuccess({ id: verdict.deduction.id, lines: unlockLines(verdict.applied?.unlocked ?? []), key: Date.now() });
      setTier(0);
    } else setSuccess(null);
  };

  const words = (s: Sentence) => drafts[s.id] ?? parseSentence(s.text).filter((p) => typeof p !== "string").map(() => null);
  const setWords = (s: Sentence, next: (string | null)[]) => setDrafts((d) => ({ ...d, [s.id]: next }));

  const pickWord = (s: Sentence, word: string) => {
    const current = [...words(s)];
    const target = slot?.id === s.id ? slot.slot : current.findIndex((w) => w === null);
    if (target < 0) return;
    current[target] = word;
    setWords(s, current);
    const nextEmpty = current.findIndex((w) => w === null);
    setSlot(nextEmpty >= 0 ? { id: s.id, slot: nextEmpty } : null);
    engine.inquiry.clearBoardThought();
  };

  const tapSlot = (s: Sentence, index: number) => {
    const current = [...words(s)];
    if (current[index] !== null && slot?.id === s.id && slot.slot === index) {
      current[index] = null;
      setWords(s, current);
    }
    setSlot({ id: s.id, slot: index });
  };

  const submit = (s: Sentence) => {
    const verdict = engine.inquiry.submit(s.id, words(s));
    if (verdict.ok) {
      setSuccess({ id: s.id, lines: unlockLines(verdict.applied?.unlocked ?? []), key: Date.now() });
      setSlot(null);
      setTier(0);
    } else setSuccess(null);
  };

  const think = () => {
    const hint = engine.inquiry.hint();
    setTier(hint?.tier ?? 0);
    setSuccess(null);
  };

  const thought = inquiry.boardThought;
  return (
    <div className={styles.board} role="tabpanel" aria-label="Enquête" data-linking={linking}>
      <div className={styles.boardBar}>
        <h1 className={styles.boardTitle}>Tableau d&apos;enquête</h1>
        <span className={styles.boardCount}>{record.cards.length} indice{record.cards.length > 1 ? "s" : ""} · {record.deductions.length} déduction{record.deductions.length > 1 ? "s" : ""}</span>
        <div className={styles.boardTools}>
          <button type="button" className={styles.boardTool} aria-pressed={linking} aria-label={linking ? "Annuler" : "Relier deux cartes"} onClick={() => { setLinking((l) => !l); setFirst(null); setExpanded(null); }}>
            <ThreadIcon />
            {linking ? <span>Annuler</span> : <span>Relier<span className={styles.longLabel}> deux cartes</span></span>}
          </button>
          <button type="button" className={styles.boardTool} data-suggested={inquiry.hintSuggested || undefined} onClick={think}>
            <BulbIcon />
            <span>Réfléchir</span>
          </button>
          <div className={styles.boardClose} data-touch={touch || undefined} data-board-close>{close}</div>
        </div>
        {linking ? (
          <p className={styles.linkHelp} role="note">{first ? <>Et maintenant, la carte qui <b>contredit</b> « {INDEX.cards.get(first)?.title} ».</> : <>Touchez une carte, puis celle qui la <b>contredit</b>.</>}</p>
        ) : null}
        {thought ? (
          <div className={styles.boardThought} data-kind={thought.kind}>
            {thought.kind === "hint" && tier ? <span className={styles.hintTier}>Réfléchir · {tier}/3 · {TIER[tier]}</span> : null}
            <ThoughtPaper key={thought.key} text={thought.text} />
          </div>
        ) : null}
      </div>

      <div className={styles.boardScroll}>
        {view.questions.length === 0 ? (
          <p className={styles.boardEmpty}>Rien au tableau pour l&apos;instant. Examinez ce qui vous intrigue : chaque indice viendra se ranger ici.</p>
        ) : null}
        {view.questions.map((q) => {
          const cards = cardsOf(q);
          const deductions = view.deductions.filter((d) => d.question === q.id);
          return (
            <section key={q.id} className={styles.question} data-dormant={q.dormant || undefined} aria-label={q.title}>
              <h2 className={styles.questionTitle}>{q.dormant ? <small>Question sans réponse</small> : null}{q.title}</h2>
              <ul className={styles.cards}>
                {cards.map((c) => (
                  <li key={c.id} data-expanded={expanded === c.id || undefined}>
                    <CardButton card={c} selected={first === c.id} expanded={!linking && expanded === c.id} linking={linking} onTap={() => tapCard(c.id)} />
                  </li>
                ))}
              </ul>
              {deductions.map((d) => (d.kind === "contradiction"
                ? <Thread key={d.id} d={d} solved={record.deductions.includes(d.id)} fresh={success?.id === d.id ? success : null} known={record.cards} />
                : (
                  <SentenceBox
                    key={d.id}
                    d={d}
                    solved={record.deductions.includes(d.id)}
                    fresh={success?.id === d.id ? success : null}
                    words={words(d)}
                    activeSlot={slot?.id === d.id ? slot.slot : -1}
                    bank={view.bank}
                    clues={cluesFound(d, record)}
                    onSlot={(i) => tapSlot(d, i)}
                    onWord={(w) => pickWord(d, w)}
                    onSubmit={() => submit(d)}
                    onClear={() => { setWords(d, words(d).map(() => null)); setSlot({ id: d.id, slot: 0 }); }}
                  />
                )))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function unlockLines(keys: string[]): string[] {
  const lines: string[] = [];
  for (const key of keys) {
    const [kind, ...rest] = key.split(":");
    const id = rest.join(":");
    if (kind === "examinable") lines.push(`Nouveau : ${INDEX.examinables.get(id)?.name ?? id}, à examiner.`);
    else if (kind === "word") lines.push(`Nouveau mot dans la banque : « ${id} ».`);
    else if (kind === "door") lines.push("Une porte s'est ouverte.");
    else if (kind === "dialogue") lines.push("Une nouvelle question à poser.");
    else if (kind === "card") lines.push(`Nouvel indice : ${INDEX.cards.get(id)?.title ?? id}.`);
  }
  return lines;
}

function CardButton({ card, selected, expanded, linking, onTap }: { card: Card; selected: boolean; expanded: boolean; linking: boolean; onTap: () => void }) {
  return (
    <button
      type="button"
      className={styles.card}
      data-icon={card.icon}
      aria-pressed={linking ? selected : undefined}
      aria-expanded={linking ? undefined : expanded}
      aria-label={`Carte : ${card.title}`}
      onClick={onTap}
    >
      <span className={styles.pin} aria-hidden />
      <span className={styles.cardHead}>
        <CardGlyph icon={card.icon} />
        <span className={styles.cardTitle}>{card.title}</span>
      </span>
      <span className={styles.cardSource}>{card.source}</span>
      {expanded ? <span className={styles.cardText}>{card.text}</span> : null}
    </button>
  );
}

function Thread({ d, solved, fresh, known }: { d: Contradiction; solved: boolean; fresh: { lines: string[]; key: number } | null; known: readonly string[] }) {
  // Une contradiction tout juste trouvée apparaît sous les cartes : on la fait venir à l'écran (sur téléphone, le
  // tampon « Juste » restait hors de vue, sous la dernière carte).
  const ref = useRef<HTMLDivElement>(null);
  const freshKey = fresh?.key;
  useEffect(() => {
    if (freshKey !== undefined) ref.current?.scrollIntoView({ block: "nearest" });
  }, [freshKey]);
  if (!solved) return null;
  const pair = d.pairs.find(([a, b]) => known.includes(a) && known.includes(b)) ?? d.pairs[0];
  return (
    <div ref={ref} className={styles.thread} data-fresh={fresh ? true : undefined} aria-label={`Contradiction : ${d.title}`}>
      <p className={styles.threadPair}>
        <span>{INDEX.cards.get(pair[0])?.title}</span>
        <svg viewBox="0 0 60 12" aria-hidden><path d="M2 6c10-6 18 6 28 0s18-6 28 0" fill="none" stroke="#c4412a" strokeWidth="2.4" strokeLinecap="round" /></svg>
        <span>{INDEX.cards.get(pair[1])?.title}</span>
      </p>
      <p className={styles.threadText}>{d.text}</p>
      <Stamp fresh={Boolean(fresh)}>Juste</Stamp>
      {fresh?.lines.map((l) => <p key={l} className={styles.unlock}>{l}</p>)}
    </div>
  );
}

function SentenceBox(props: {
  d: Sentence; solved: boolean; fresh: { lines: string[]; key: number } | null; words: (string | null)[]; activeSlot: number;
  bank: string[]; clues: number; onSlot(i: number): void; onWord(w: string): void; onSubmit(): void; onClear(): void;
}) {
  const { d, solved, fresh, words, activeSlot, bank, clues } = props;
  const parts = parseSentence(d.text);
  const full = words.every((w) => w !== null);
  // Phrase tout juste résolue : le tampon « Résolu » vient à l'écran, sous la barre des outils (scroll-margin).
  const ref = useRef<HTMLDivElement>(null);
  const freshKey = fresh?.key;
  useEffect(() => {
    if (freshKey !== undefined) ref.current?.scrollIntoView({ block: "nearest" });
  }, [freshKey]);
  return (
    <div ref={ref} className={styles.sentence} data-solved={solved || undefined} aria-label={`Phrase à compléter : ${d.title}`}>
      <p className={styles.sentenceLabel}>{d.title}</p>
      <p className={styles.sentenceText}>
        {parts.map((p, i) => {
          if (typeof p === "string") return <span key={i}>{p}</span>;
          if (solved) return <b key={i} className={styles.slotDone}>{p.answers[0]}</b>;
          const w = words[p.slot];
          return (
            <button key={i} type="button" className={styles.slot} data-active={activeSlot === p.slot || undefined} data-empty={w === null || undefined} onClick={() => props.onSlot(p.slot)} aria-label={w ? `Case ${p.slot + 1} : ${w}` : `Case ${p.slot + 1}, vide`}>
              {w ?? "…"}
            </button>
          );
        })}
      </p>
      {solved ? (
        <>
          <Stamp fresh={Boolean(fresh)}>Résolu</Stamp>
          {fresh?.lines.map((l) => <p key={l} className={styles.unlock}>{l}</p>)}
        </>
      ) : (
        <>
          <p className={styles.clueCount} data-enough={clues >= d.minClues || undefined}>Indices trouvés : {clues} · il en faut {d.minClues}</p>
          <div className={styles.bank} role="group" aria-label="Banque de mots">
            {bank.map((w) => (
              <button key={w} type="button" className={styles.word} data-used={words.includes(w) || undefined} onClick={() => props.onWord(w)}>{w}</button>
            ))}
          </div>
          <div className={styles.sentenceButtons}>
            <button type="button" className={styles.clearBtn} onClick={props.onClear} disabled={words.every((w) => w === null)}>Effacer</button>
            <button type="button" className={styles.validate} onClick={props.onSubmit} disabled={!full}>Valider la phrase</button>
          </div>
        </>
      )}
    </div>
  );
}

function Stamp({ children, fresh }: { children: ReactNode; fresh: boolean }) {
  return <span className={styles.rubber} data-fresh={fresh || undefined} role="img" aria-label={`Tampon : ${children}`}>{children}</span>;
}

function CardGlyph({ icon }: { icon: CardIcon }) {
  const common = { stroke: "currentColor", strokeWidth: 1.8, strokeLinejoin: "round" as const, strokeLinecap: "round" as const, fill: "none" };
  switch (icon) {
    case "photo": return <svg viewBox="0 0 24 24" aria-hidden><rect x="3" y="5" width="18" height="14" rx="1.5" {...common} /><path d="M6 16l4-5 3 3 2-2 3 4" {...common} /></svg>;
    case "trace": return <svg viewBox="0 0 24 24" aria-hidden><path d="M5 18c2-6 6-3 7-8s5-6 7-5" {...common} stroke="#8a5ad8" strokeWidth="3" /></svg>;
    case "poster": return <svg viewBox="0 0 24 24" aria-hidden><rect x="5" y="3" width="14" height="18" {...common} /><path d="M5 7h14" {...common} stroke="#b4532a" strokeWidth="3" /><path d="M8 12h8M8 15h6" {...common} /></svg>;
    case "object": return <svg viewBox="0 0 24 24" aria-hidden><circle cx="10" cy="10" r="6" {...common} /><path d="M15 15l5 5" {...common} strokeWidth="2.6" /></svg>;
    case "chalk": return <svg viewBox="0 0 24 24" aria-hidden><path d="M4 8h16M4 13h11" {...common} strokeDasharray="2.5 1.5" /><rect x="15" y="15" width="6" height="3" rx="1" {...common} /></svg>;
    case "audio": return <svg viewBox="0 0 24 24" aria-hidden><path d="M5 10v4M9 7v10M13 9v6M17 5v14" {...common} /></svg>;
    default: return <svg viewBox="0 0 24 24" aria-hidden><path d="M6 3h9l3 3v15H6z" {...common} /><path d="M9 10h6M9 13h6M9 16h4" {...common} /></svg>;
  }
}

function ThreadIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden><circle cx="5" cy="6" r="2.6" fill="#c4412a" /><circle cx="19" cy="18" r="2.6" fill="#c4412a" /><path d="M5 6c6 0 4 12 14 12" fill="none" stroke="#c4412a" strokeWidth="2" /></svg>;
}

function BulbIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden><path d="M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3z" fill="#ffe39a" stroke="currentColor" strokeWidth="1.8" /><path d="M9.5 20h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

export type { Deduction };
