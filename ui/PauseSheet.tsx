"use client";
// Pause (port de open_pause de main.gd).
import type { Engine } from "@/game/engine";
import { PaperButton, Stamp, Tag } from "./Paper";
import styles from "./sheets.module.css";

export function PauseSheet({ engine, touch }: { engine: Engine; touch: boolean }) {
  return (
    <section className={styles.sheet} aria-label="Pause" data-sheet>
      <Stamp>SILLO 8 · PAUSE</Stamp>
      <Tag>CONSOLE OPÉRATEUR</Tag>
      <h1 className={styles.title}>Signal suspendu</h1>
      <div className={styles.buttons}>
        <PaperButton variant="primary" arrow autoFocus={!touch} onClick={() => engine.resume()}>Reprendre</PaperButton>
        <PaperButton variant="olive" hotkey={touch ? undefined : "F5"} onClick={() => engine.saveGame()}>Sauvegarder</PaperButton>
        <PaperButton hotkey={touch ? undefined : "F9"} disabled={!engine.hasSave()} onClick={() => engine.loadGame()}>Charger la sauvegarde</PaperButton>
        <PaperButton onClick={() => engine.setMode("settings")}>Réglages</PaperButton>
        <PaperButton variant="ghost" onClick={() => engine.setMode("menu")}>Menu principal</PaperButton>
      </div>
      <p className={styles.muted}>
        {touch
          ? "Touchez « Reprendre » pour relancer la simulation."
          : "F5 : sauvegarde rapide • F9 : chargement rapide. Échap reprend la simulation."}
      </p>
    </section>
  );
}
