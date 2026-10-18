"use client";
// Fin, conclusion et mort. Les textes narratifs viennent de story.ts.
import type { Engine } from "@/game/engine";
import type { Character } from "@/game/state";
import { PaperButton, Stamp, Tag } from "./Paper";
import { CharacterPortrait } from "./Portraits";
import { ENDINGS, ENDING_ORDER, ENDING_PROMPT, characterSheet } from "./story";
import styles from "./sheets.module.css";

export function EndingSheet({ engine, touch }: { engine: Engine; touch: boolean }) {
  return (
    <section className={styles.ending} aria-label="Décision finale" data-sheet>
      <Stamp>{ENDING_PROMPT.stamp}</Stamp>
      <Tag>{ENDING_PROMPT.tag}</Tag>
      <h1 className={styles.title}>{ENDING_PROMPT.title}</h1>
      <p className={styles.text}>{ENDING_PROMPT.text}</p>
      <div className={styles.choices}>
        {ENDING_ORDER.map((id, index) => (
          <div key={id} className={styles.choice}>
            <div className={styles.choiceHead}>
              <div className={styles.avatar}><CharacterPortrait character={id} /></div>
              <Tag>{characterSheet(id).name} · {characterSheet(id).title}</Tag>
            </div>
            <p>{ENDINGS[id]?.description}</p>
            <PaperButton variant={index === 0 ? "olive" : "primary"} autoFocus={!touch && index === 0} onClick={() => engine.chooseEnding(id)}>
              {ENDINGS[id]?.choice}
            </PaperButton>
          </div>
        ))}
      </div>
      <PaperButton variant="ghost" onClick={() => engine.resume()}>J&apos;ai besoin de réfléchir</PaperButton>
    </section>
  );
}

export function ConclusionSheet({ engine, choice, touch }: { engine: Engine; choice: Character; touch: boolean }) {
  const story = ENDINGS[choice] ?? ENDINGS.floor2;
  return (
    <section className={styles.conclusion} aria-label={story.stamp} data-sheet>
      <Tag>CARNET DE SURVIE / SILLO 8</Tag>
      <div><Stamp className={styles.bigStamp}>{story.stamp}</Stamp></div>
      {story.conclusion.map((text) => <p key={text} className={styles.text}>{text}</p>)}
      <p className={styles.muted} style={{ marginTop: 0, marginBottom: 12 }}>
        Votre progression est conservée dans la sauvegarde.
      </p>
      <div className={styles.buttons}>
        <PaperButton variant="primary" arrow autoFocus={!touch} onClick={() => engine.resume()}>Continuer d&apos;explorer</PaperButton>
        <PaperButton variant="olive" onClick={() => engine.newGame()}>Recommencer une descente</PaperButton>
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
        Votre dernière sauvegarde reste intacte. Avancez accroupi, gardez la lampe chargée : un faisceau en pleine face fige les mordus le temps de filer.
      </p>
      <div className={styles.buttons}>
        <PaperButton variant="primary" arrow autoFocus={!touch} disabled={!engine.hasSave()} onClick={() => engine.loadGame()}>Recharger la sauvegarde</PaperButton>
        <PaperButton variant="olive" onClick={() => engine.newGame()}>Recommencer</PaperButton>
        <PaperButton variant="ghost" onClick={() => engine.setMode("menu")}>Menu principal</PaperButton>
      </div>
    </section>
  );
}
