"use client";
// Réglages (port de open_settings / _apply_settings de main.gd).
import { useEffect, useState } from "react";
import type { Engine } from "@/game/engine";
import { PaperButton, Stamp, Tag } from "./Paper";
import { applyDialogue, loadSettings, saveSettings, serverDialogueAvailable, type Settings } from "./settings";
import styles from "./sheets.module.css";

export function SettingsSheet({ engine, touch }: { engine: Engine; touch: boolean }) {
  // Mode d'origine figé à l'ouverture (menu ou pause).
  const [origin] = useState<"menu" | "pause">(() => (engine.ui.get().previous === "menu" ? "menu" : "pause"));
  const [initial] = useState<Settings>(() => loadSettings());
  const [lowQuality, setLowQuality] = useState(engine.lowQuality);
  const [endpoint, setEndpoint] = useState(initial.endpoint);
  const [model, setModel] = useState(initial.model);
  const [useServer, setUseServer] = useState(initial.useServer);
  const [serverEnabled, setServerEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    serverDialogueAvailable().then((enabled) => { if (alive) setServerEnabled(enabled); });
    return () => { alive = false; };
  }, []);

  const back = () => engine.setMode(origin);

  // Échap revient à l'écran d'origine (le moteur, lui, reprendrait la partie).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      engine.setMode(origin);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [engine, origin]);

  const apply = () => {
    const next: Settings = { lowQuality, endpoint: endpoint.trim(), model: model.trim(), useServer: useServer && serverEnabled === true };
    if (!applyDialogue(engine, next, serverEnabled === true)) {
      setError("Adresse refusée. Utilisez localhost ou un proxy HTTPS, sans identifiants.");
      return;
    }
    if (engine.lowQuality !== lowQuality) engine.setLowQuality(lowQuality);
    if (!saveSettings(next)) engine.notify("Les réglages ne seront pas conservés dans ce navigateur.");
    back();
  };

  const serverActive = useServer && serverEnabled === true;
  return (
    <section className={styles.settings} aria-label="Réglages" data-sheet>
      <Stamp>RÉGLAGES</Stamp>
      <Tag>CARNET DE SURVIE</Tag>
      <h1 className={styles.title}>Réglages</h1>

      <label className={styles.toggle}>
        <input type="checkbox" checked={lowQuality} onChange={(e) => setLowQuality(e.target.checked)} autoFocus={!touch} />
        <span className={styles.switch} aria-hidden />
        <span>Mode performance · sans ombres portées ni poussière, résolution réduite</span>
      </label>

      <h2 className={styles.section}>Dialogues par IA (facultatif, histoire à venir)</h2>
      <p className={styles.text} style={{ fontSize: 15 }}>
        Sans serveur, les survivants répondent hors ligne. Pour llama.cpp : http://127.0.0.1:8080.
        Un service distant doit passer par un proxy HTTPS, sans clé dans le jeu.
      </p>

      <label className={styles.toggle}>
        <input type="checkbox" checked={serverActive} disabled={serverEnabled !== true} onChange={(e) => { setUseServer(e.target.checked); setError(""); }} />
        <span className={styles.switch} aria-hidden />
        <span>
          Utiliser le serveur du jeu
          {serverEnabled === null ? " · vérification…" : serverEnabled ? "" : " · indisponible sur ce serveur"}
        </span>
      </label>

      <label className={styles.field}>
        Adresse locale ou proxy HTTPS
        <input
          className={styles.input}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="http://127.0.0.1:8080"
          maxLength={512}
          value={endpoint}
          disabled={serverActive}
          onChange={(e) => { setEndpoint(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
        />
      </label>
      <label className={styles.field}>
        Identifiant du modèle (selon le serveur)
        <input
          className={styles.input}
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="ex. qwen2.5-3b-instruct"
          maxLength={128}
          value={model}
          disabled={serverActive}
          onChange={(e) => { setModel(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
        />
      </label>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <div className={styles.buttons} style={{ marginTop: 12 }}>
        <PaperButton variant="primary" arrow onClick={apply}>Appliquer et revenir</PaperButton>
        <PaperButton variant="ghost" onClick={back}>Annuler</PaperButton>
      </div>
    </section>
  );
}
