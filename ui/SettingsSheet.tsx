"use client";
// Réglages (port de open_settings / _apply_settings de main.gd).
import { useEffect, useState } from "react";
import type { Engine } from "@/game/engine";
import { PaperButton, Stamp, Tag } from "./Paper";
import { applySound, loadSettings, saveSettings, type Settings } from "./settings";
import { SaveCodeSection } from "./SaveCodeSection";
import type { ArrowMode } from "@/game/tutorial";
import { applyA11y, type A11ySettings } from "./accessibility";
import { AccessibilityFields, DisplayFields } from "./AccessibilitySettings";
import styles from "./sheets.module.css";

export function SettingsSheet({ engine, touch }: { engine: Engine; touch: boolean }) {
  // Mode d'origine figé à l'ouverture (menu ou pause).
  const [origin] = useState<"menu" | "pause">(() => (engine.ui.get().previous === "menu" ? "menu" : "pause"));
  const [initial] = useState<Settings>(() => loadSettings());
  const [lowQuality, setLowQuality] = useState(engine.lowQuality);
  const [arrow, setArrow] = useState<ArrowMode>(initial.objectiveArrow);
  const [replayed, setReplayed] = useState(false);
  const [sound, setSound] = useState(() => ({ master: initial.master, music: initial.music, sfx: initial.sfx, vibration: initial.vibration }));
  const canVibrate = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  // Affichage et accessibilité : appliqués tout de suite (aperçu), rétablis par Annuler / Échap.
  const [a11y, setA11y] = useState<A11ySettings>(() => ({
    textSize: initial.textSize, readableFont: initial.readableFont, captions: initial.captions,
    safeColors: initial.safeColors, gentle: initial.gentle, motion: initial.motion,
  }));
  const changeA11y = (patch: Partial<A11ySettings>) => {
    const next = { ...a11y, ...patch };
    setA11y(next);
    applyA11y(next);
  };

  // Les curseurs s'entendent tout de suite ; Annuler / Échap rétablit les réglages d'avant.
  const changeSound = (patch: Partial<typeof sound>) => {
    const next = { ...sound, ...patch };
    setSound(next);
    applySound(engine, next);
  };
  const preview = () => engine.audio.play("pickup");

  const back = () => engine.setMode(origin);
  const cancel = () => {
    applySound(engine, initial);
    applyA11y(initial);
    back();
  };

  // Échap revient à l'écran d'origine (le moteur, lui, reprendrait la partie).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      applySound(engine, initial);
      applyA11y(initial);
      engine.setMode(origin);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [engine, origin, initial]);

  const apply = () => {
    const next: Settings = { lowQuality, objectiveArrow: arrow, ...sound, ...a11y };
    if (engine.lowQuality !== lowQuality) engine.setLowQuality(lowQuality);
    engine.tutorial.arrowMode = arrow;
    applySound(engine, sound);
    applyA11y(a11y);
    if (!saveSettings(next)) engine.notify("Les réglages ne seront pas conservés dans ce navigateur.");
    back();
  };

  return (
    <section className={styles.settings} aria-label="Réglages" data-sheet>
      <Stamp>RÉGLAGES</Stamp>
      <Tag>CARNET DE SURVIE</Tag>
      <h1 className={styles.title}>Réglages</h1>

      {/* ——— Section : Affichage ——— */}
      <h2 className={styles.section}>Affichage</h2>
      <label className={styles.toggle}>
        <input type="checkbox" checked={lowQuality} onChange={(e) => setLowQuality(e.target.checked)} autoFocus={!touch} />
        <span className={styles.switch} aria-hidden />
        <span>Mode performance · sans ombres portées ni poussière, résolution réduite</span>
      </label>
      <DisplayFields value={a11y} onChange={changeA11y} />

      {/* ——— Section : Son ——— */}
      <h2 className={styles.section}>Son</h2>
      {([
        ["master", "Volume général"],
        ["music", "Musique"],
        ["sfx", "Effets et ambiance"],
      ] as const).map(([key, label]) => (
        <label key={key} className={styles.slider}>
          <span className={styles.sliderLabel}>
            {label}
            <b>{Math.round(sound[key] * 100)} %</b>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(sound[key] * 100)}
            onChange={(e) => changeSound({ [key]: Number(e.target.value) / 100 })}
            onPointerUp={key === "music" ? undefined : preview}
            onKeyUp={key === "music" ? undefined : preview}
          />
        </label>
      ))}
      <label className={styles.toggle}>
        <input type="checkbox" checked={sound.vibration} onChange={(e) => changeSound({ vibration: e.target.checked })} />
        <span className={styles.switch} aria-hidden />
        <span>Vibration quand on est frappé{canVibrate ? "" : " · non prise en charge ici"}</span>
      </label>

      {/* ——— Section : Accessibilité ——— */}
      <h2 className={styles.section}>Accessibilité</h2>
      <AccessibilityFields value={a11y} onChange={changeA11y} />

      {/* ——— Section : Aide ——— */}
      <h2 className={styles.section}>Aide</h2>
      <label className={styles.field}>
        Flèche d'objectif
        <select className={styles.input} value={arrow} onChange={(e) => setArrow(e.target.value as ArrowMode)}>
          <option value="auto">Après 45 s sans progrès (conseillé)</option>
          <option value="always">Toujours</option>
          <option value="never">Jamais</option>
        </select>
      </label>
      <PaperButton onClick={() => { engine.tutorial.replay(); setReplayed(true); }} disabled={replayed}>
        {replayed ? "Tutoriel relancé" : "Revoir le tutoriel"}
      </PaperButton>

      <SaveCodeSection engine={engine} />

      <div className={styles.buttons} style={{ marginTop: 12 }}>
        <PaperButton variant="primary" arrow onClick={apply}>Appliquer et revenir</PaperButton>
        <PaperButton variant="ghost" onClick={cancel}>Annuler</PaperButton>
      </div>
    </section>
  );
}
