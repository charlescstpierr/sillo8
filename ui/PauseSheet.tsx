"use client";
// Pause : reprendre, sauvegarder, carnet, réglages.
import type { Engine } from "@/game/engine";
import { PaperButton, Stamp, Tag } from "./Paper";
import { setMode } from "./compat";
import styles from "./sheets.module.css";

export function PauseSheet({ engine, touch }: { engine: Engine; touch: boolean }) {
  return (
    <section className={styles.sheet} aria-label="Pause" data-sheet>
      <Stamp>SILLO 8 · PAUSE</Stamp>
      <Tag>CARNET DE SURVIE</Tag>
      <h1 className={styles.title}>On souffle un peu</h1>
      <div className={styles.buttons}>
        <PaperButton variant="primary" arrow autoFocus={!touch} onClick={() => engine.resume()}>Reprendre</PaperButton>
        <PaperButton variant="olive" hotkey={touch ? undefined : "F5"} onClick={() => engine.saveGame()}>Sauvegarder</PaperButton>
        <PaperButton hotkey={touch ? undefined : "F9"} disabled={!engine.hasSave()} onClick={() => engine.loadGame()}>Charger la sauvegarde</PaperButton>
        <PaperButton variant="leather" hotkey={touch ? undefined : "J"} onClick={() => setMode(engine, "journal")}>Ouvrir le carnet</PaperButton>
        <PaperButton onClick={() => engine.setMode("settings")}>Réglages</PaperButton>
        <PaperButton variant="ghost" onClick={() => engine.setMode("menu")}>Menu principal</PaperButton>
      </div>
      <p className={styles.muted}>
        {touch
          ? "Touchez « Reprendre » pour retourner dans le silo."
          : "F5 : sauvegarde rapide • F9 : chargement rapide. Échap pour reprendre."}
      </p>
    </section>
  );
}
