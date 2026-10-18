"use client";
// Menu principal de SILLO 8.
import type { Engine } from "@/game/engine";
import { PaperButton, Stamp, Tag } from "./Paper";
import { OperatorPortrait } from "./Portraits";
import styles from "./sheets.module.css";

const DESKTOP: [string, string][] = [
  ["ZQSD / WASD", "se déplacer"],
  ["Souris", "viser · clic : tirer"],
  ["Clic droit", "décharge ARC-3"],
  ["E", "interagir"],
  ["Q / A", "SCAN ÉCHO"],
  ["R", "recharger"],
  ["Tab", "inventaire"],
  ["Échap", "pause"],
];

const TOUCH: [string, string][] = [
  ["Stick gauche", "se déplacer (à fond : courir)"],
  ["TIR", "visée assistée"],
  ["ARC · ÉCHO", "décharge · scan"],
  ["✋", "interagir"],
  ["Sac", "inventaire"],
  ["❚❚", "pause"],
];

export function MainMenu({ engine, touch }: { engine: Engine; touch: boolean }) {
  const canResume = engine.state.elapsed > 0 && engine.state.health > 0;
  const controls = touch ? TOUCH : DESKTOP;
  return (
    <>
      <div className={styles.menuBg} aria-hidden />
      <div className={styles.menu}>
        <section className={styles.menuCard} aria-label="Menu principal" data-sheet>
          <div className={styles.portrait}><OperatorPortrait /></div>
          <div className={styles.portraitTag}><Tag>OPÉRATRICE 08</Tag></div>
          <Tag>PROTOCOLE DE CONFINEMENT / 08</Tag>
          <h1 className={styles.logo}>SILLO 8</h1>
          <p className={styles.subtitle}>ÉTAGE 1</p>
          <p className={styles.tagline}>
            Le silo est tombé. Les morts marchent encore.<br />
            Descendez.
          </p>
          <div className={styles.menuButtons}>
            <PaperButton variant="primary" arrow autoFocus={!touch} onClick={() => engine.newGame()}>NOUVELLE DESCENTE</PaperButton>
            <PaperButton variant="olive" disabled={!engine.hasSave()} onClick={() => engine.loadGame()}>CONTINUER LA SAUVEGARDE</PaperButton>
            {canResume ? <PaperButton onClick={() => engine.resume()}>Reprendre la session</PaperButton> : null}
            <PaperButton variant="leather" onClick={() => engine.setMode("settings")}>Réglages</PaperButton>
          </div>
        </section>
        <aside className={styles.controls} aria-label="Commandes">
          <h2>{touch ? "Commandes tactiles" : "Commandes"}</h2>
          <dl>
            {controls.map(([key, action]) => (
              <div key={key} style={{ display: "contents" }}>
                <dt><kbd>{key}</kbd></dt>
                <dd>{action}</dd>
              </div>
            ))}
          </dl>
          <Stamp className={styles.controlsStamp}>CASQUE CONSEILLÉ</Stamp>
        </aside>
      </div>
      <p className={styles.version}>Un étage à la fois. {touch ? "" : "· F3 : performances"}</p>
    </>
  );
}
