"use client";
// Conclusion d'étage et mort. Les textes narratifs viennent de story.ts.
import type { Engine } from "@/game/engine";
import type { Character } from "@/game/state";
import { PaperButton, Stamp, Tag } from "./Paper";
import { NewGameButton } from "./NewGameButton";
import { endingFor } from "./story";
import { frenchSpaces } from "./typo";
import styles from "./sheets.module.css";

export function ConclusionSheet({ engine, choice, touch }: { engine: Engine; choice: Character; touch: boolean }) {
  const story = endingFor(choice, engine.state);
  return (
    <section className={styles.conclusion} aria-label={story.stamp} data-sheet>
      <Tag>CARNET DE SURVIE / SILLO 8</Tag>
      <div><Stamp className={styles.bigStamp}>{story.stamp}</Stamp></div>
      {story.conclusion.map((text) => <p key={text} className={styles.text} data-ending-line>{frenchSpaces(text)}</p>)}
      <p className={styles.muted} style={{ marginTop: 0, marginBottom: 12 }}>
        Votre progression est conservée dans la sauvegarde.
      </p>
      <div className={styles.buttons}>
        <PaperButton variant="primary" arrow autoFocus={!touch} onClick={() => engine.resume()}>Continuer d&apos;explorer</PaperButton>
        <NewGameButton engine={engine} label="Recommencer une descente" variant="olive" />
        <PaperButton variant="ghost" onClick={() => engine.setMode("menu")}>Menu principal</PaperButton>
      </div>
    </section>
  );
}

export function DeathSheet({ engine, touch }: { engine: Engine; touch: boolean }) {
  return (
    <section className={styles.sheet} aria-label="Mordu" data-sheet style={{ ["--tilt" as string]: "1.2deg" }}>
      <Stamp>MORDU</Stamp>
      <Tag>SILLO 8 / ÉTAGE 1</Tag>
      <h1 className={styles.title}>Vous êtes tombé</h1>
      <p className={styles.text}>
        Vos sauvegardes restent intactes. Avancez accroupi, gardez la lampe chargée : un faisceau en pleine face fige les mordus le temps de filer.
      </p>
      <div className={styles.buttons}>
        <PaperButton variant="primary" arrow autoFocus={!touch} disabled={!engine.hasSave()} onClick={() => engine.loadGame()}>Recharger la sauvegarde</PaperButton>
        <NewGameButton engine={engine} label="Recommencer" variant="olive" />
        <PaperButton variant="ghost" onClick={() => engine.setMode("menu")}>Menu principal</PaperButton>
      </div>
    </section>
  );
}
