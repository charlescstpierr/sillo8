"use client";
// Carnet de cuir, deux onglets : « Notes » (objectif en cours, notes trouvées à gauche, note choisie à droite)
// et « Plan » (plan de l'étage 1 croqué à la main, touche M). L'onglet ouvert suit engine.ui : "plan" ouvre le plan.
import { useMemo, useState, type ReactNode } from "react";
import type { Engine } from "@/game/engine";
import { NOTES } from "@/game/notes";
import { buildPlan } from "@/game/plan";
import { PaperButton } from "./Paper";
import { NotePaper } from "./NoteSheet";
import { PlanSketch } from "./PlanSketch";
import { useHud } from "./useHud";
import { NOTE_TOTAL, setMode } from "./compat";
import styles from "./sheets.module.css";

const ORDER = Object.keys(NOTES);

/** Valeur de engine.ui.character qui ouvre le carnet sur le plan. */
export const PLAN_PAGE = "plan";

export function JournalSheet({ engine, initial, touch }: { engine: Engine; initial: string; touch: boolean }) {
  const hud = useHud(engine.hud);
  const found = engine.state.notes.filter((id) => id in NOTES);
  const [selected, setSelected] = useState<string | null>(() =>
    found.includes(initial) ? initial : found[found.length - 1] ?? null,
  );
  const view = initial === PLAN_PAGE ? "plan" : "notes";
  const show = (next: "notes" | "plan") => {
    if (next !== view) setMode(engine, "journal", next === "plan" ? PLAN_PAGE : selected ?? "");
  };
  const note = selected ? NOTES[selected] : null;
  const close = (
    <PaperButton variant="primary" autoFocus={!touch} hotkey={touch ? undefined : view === "plan" ? "M" : "J"} onClick={() => engine.resume()}>
      Fermer le carnet
    </PaperButton>
  );
  return (
    <section className={styles.journal} aria-label="Carnet" data-sheet data-view={view}>
      <span className={styles.strap} aria-hidden />
      <div className={styles.journalTabs} role="tablist" aria-label="Pages du carnet">
        <JournalTab active={view === "notes"} onSelect={() => show("notes")} hotkey={touch ? undefined : "J"} icon={<NotesIcon />}>Notes</JournalTab>
        <JournalTab active={view === "plan"} onSelect={() => show("plan")} hotkey={touch ? undefined : "M"} icon={<MapIcon />}>Plan</JournalTab>
      </div>
      {view === "plan" ? (
        <PlanPage engine={engine} objective={hud.objective.title} close={close} />
      ) : (
        <div className={styles.journalPages} role="tabpanel" aria-label="Notes">
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
          <div className={styles.journalFoot}>{close}</div>
        </div>
      )}
    </section>
  );
}

function PlanPage({ engine, objective, close }: { engine: Engine; objective: string; close: ReactNode }) {
  // Le jeu est figé tant que le carnet est ouvert : le plan se calcule une fois.
  const plan = useMemo(() => buildPlan(engine.state), [engine]);
  return (
    <div className={styles.journalPages} data-view="plan" role="tabpanel" aria-label="Plan">
      <div className={styles.planPage}>
        <header className={styles.planHead}>
          <h1 className={styles.journalTitle}>Plan · étage 1</h1>
          <span className={styles.journalCount}>{plan.known} / {plan.total} pièces visitées</span>
        </header>
        <PlanSketch plan={plan} />
        <div className={styles.planSide}>
          <p className={styles.planObjective}><small>Objectif</small>{objective}</p>
          <ul className={styles.planLegend} aria-label="Légende">
            <li><svg viewBox="-2.4 -2.4 4.8 4.8" aria-hidden><path d="M0,-1.9 L1.25,1.15 L0,0.45 L-1.25,1.15 Z" fill="#d8a43a" stroke="#4a3220" strokeWidth="0.3" strokeLinejoin="round" /></svg>Vous</li>
            <li><svg viewBox="-2 -2 4 4" aria-hidden><path d="M-1.1,-1.1 L1.1,1.1 M1.1,-1.1 L-1.1,1.1" stroke="#c4412a" strokeWidth="0.5" strokeLinecap="round" /></svg>Objectif</li>
            <li><svg viewBox="-1.4 -1.7 2.8 3" aria-hidden><path d="M-0.55,-0.25 L-0.55,-0.75 Q-0.55,-1.35 0,-1.35 Q0.55,-1.35 0.55,-0.75 L0.55,-0.25" fill="none" stroke="#b4532a" strokeWidth="0.26" /><rect x="-0.85" y="-0.35" width="1.7" height="1.35" rx="0.25" fill="#fff6e2" stroke="#b4532a" strokeWidth="0.26" /></svg>Verrouillé</li>
            <li><svg viewBox="-1.2 -1.2 2.4 2.4" aria-hidden><path d="M-0.7,-0.9 L0.35,-0.9 L0.7,-0.55 L0.7,0.9 L-0.7,0.9 Z" fill="#fffaf0" stroke="#4a3220" strokeWidth="0.16" /><path d="M-0.42,-0.3 L0.42,-0.3 M-0.42,0.08 L0.42,0.08 M-0.42,0.46 L0.18,0.46" stroke="#466e8c" strokeWidth="0.12" /></svg>Note lue</li>
          </ul>
        </div>
        <div className={styles.planClose}>{close}</div>
      </div>
    </div>
  );
}

function JournalTab({ active, onSelect, hotkey, icon, children }: { active: boolean; onSelect: () => void; hotkey?: string; icon: ReactNode; children: ReactNode }) {
  return (
    <button type="button" role="tab" aria-selected={active} className={styles.journalTab} onClick={onSelect}>
      {icon}
      <span>{children}</span>
      {hotkey ? <kbd className={styles.tabKey}>{hotkey}</kbd> : null}
    </button>
  );
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M6 3.5h9l3.5 3.5v13.5H6z" fill="#fffaf0" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 10h7M9 13.5h7M9 17h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M3 6l6-2.5 6 2.5 6-2.5v14.5l-6 2.5-6-2.5-6 2.5z" fill="#fffaf0" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 3.5v14.5M15 6v14.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M16.5 9.5l2.5 2.5M19 9.5l-2.5 2.5" stroke="#c4412a" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
