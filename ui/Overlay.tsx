"use client";
// Écrans d'interface selon engine.ui (menu, pause, réglages, sac, note, carnet, dialogue, fin, mort).
import { useEffect, useState } from "react";
import type { Engine } from "@/game/engine";
import { useUi } from "./useUi";
import { useHud } from "./useHud";
import { MainMenu } from "./MainMenu";
import { PauseSheet } from "./PauseSheet";
import { SettingsSheet } from "./SettingsSheet";
import { InventorySheet } from "./InventorySheet";
import { DialogueSheet } from "./DialogueSheet";
import { ConclusionSheet, DeathSheet, EndingSheet } from "./OutcomeSheets";
import { NoteSheet } from "./NoteSheet";
import { JournalSheet, PLAN_PAGE } from "./JournalSheet";
import { heal, openJournal, setMode, useCell, type AnyMode } from "./compat";
import styles from "./sheets.module.css";

function useTouch(engine: Engine): boolean {
  const hud = useHud(engine.hud);
  const [coarse, setCoarse] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return hud.device === "touch" || (coarse && hud.device !== "gamepad");
}

/**
 * Clavier dans les fiches. Le moteur écoute window en phase de bouillonnement :
 * on passe avant lui (capture) pour rendre Tab et les flèches à la navigation.
 */
function useSheetKeys(engine: Engine, mode: string) {
  useEffect(() => {
    if (mode === "playing") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      if (e.code === "Tab" && mode !== "inventory") {
        e.stopImmediatePropagation(); // focus suivant, pas d'inventaire
        return;
      }
      if (typing) return;
      if (mode === "inventory" && (e.code === "KeyH" || e.code === "KeyB")) {
        e.stopImmediatePropagation();
        if (!e.repeat) (e.code === "KeyH" ? heal(engine) : useCell(engine));
        return;
      }
      if (mode === "note" && e.code === "KeyE") {
        e.stopImmediatePropagation();
        if (!e.repeat) engine.resume();
        return;
      }
      if (e.code === "ArrowDown" || e.code === "ArrowUp") {
        const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-sheet] button:not(:disabled)")];
        if (buttons.length === 0) return;
        e.stopImmediatePropagation();
        e.preventDefault();
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = index < 0 ? 0 : (index + (e.code === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next].focus();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [engine, mode]);
}

/**
 * J ouvre le carnet sur les notes (ou le ferme s'il y est), M l'ouvre sur le plan (ou le ferme s'il y est),
 * en jeu comme depuis une note (géré ici, avant le moteur).
 */
function useJournalKey(engine: Engine) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyJ" && e.code !== "KeyM") return;
      const target = e.target as HTMLElement | null;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      const mode = engine.ui.get().mode as AnyMode;
      if (mode !== "playing" && mode !== "journal" && mode !== "note") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (e.repeat) return;
      const onPlan = engine.ui.get().character === PLAN_PAGE;
      if (e.code === "KeyM") {
        if (mode === "journal" && onPlan) engine.resume();
        else setMode(engine, "journal", PLAN_PAGE);
      } else if (mode === "journal" && !onPlan) engine.resume();
      else if (mode === "note") setMode(engine, "journal");
      else if (onPlan) setMode(engine, "journal", "");
      else openJournal(engine);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [engine]);
}

export function Overlay({ engine }: { engine: Engine }) {
  const ui = useUi(engine.ui);
  const touch = useTouch(engine);
  const mode = ui.mode as AnyMode;
  useSheetKeys(engine, mode);
  useJournalKey(engine);
  // Rafraîchit les fiches quand l'état change (sauvegarde présente, compteurs…).
  useHud(engine.hud);

  switch (mode) {
    case "playing":
      return null;
    case "menu":
      return <div className={styles.backdrop} data-tone="menu"><MainMenu engine={engine} touch={touch} /></div>;
    case "pause":
      return <div className={styles.backdrop}><PauseSheet engine={engine} touch={touch} /></div>;
    case "settings":
      return <div className={styles.backdrop}><SettingsSheet engine={engine} touch={touch} /></div>;
    case "inventory":
      return <div className={styles.backdrop}><InventorySheet engine={engine} touch={touch} /></div>;
    case "note":
      return (
        <div className={styles.backdrop} data-tone="note">
          <NoteSheet key={ui.character} engine={engine} id={ui.character} touch={touch} />
        </div>
      );
    case "journal":
      return (
        <div className={styles.backdrop} data-tone="journal">
          <JournalSheet engine={engine} initial={ui.character} touch={touch} />
        </div>
      );
    case "dialogue":
      return (
        <div className={styles.backdrop} data-tone="dialogue">
          <DialogueSheet key={ui.character} engine={engine} character={ui.character} touch={touch} />
        </div>
      );
    case "ending":
      return <div className={styles.backdrop}><EndingSheet engine={engine} touch={touch} /></div>;
    case "conclusion":
      return <div className={styles.backdrop}><ConclusionSheet engine={engine} choice={ui.character} touch={touch} /></div>;
    case "death":
      return <div className={styles.backdrop} data-tone="death"><DeathSheet engine={engine} touch={touch} /></div>;
    default:
      return null;
  }
}
