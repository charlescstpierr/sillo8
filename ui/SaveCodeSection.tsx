"use client";
// Réglages → Sauvegarde : code texte à copier (changer d'appareil, se protéger d'un effacement du navigateur)
// et import d'un code dans l'emplacement « Manuel ».
import { useState } from "react";
import type { Engine } from "@/game/engine";
import { exportCode, importCode } from "@/game/save";
import { PaperButton } from "./Paper";
import styles from "./sheets.module.css";

export function SaveCodeSection({ engine }: { engine: Engine }) {
  const [code, setCode] = useState("");
  const [paste, setPaste] = useState("");
  const [message, setMessage] = useState("");
  const store = engine.storage;

  const copy = async () => {
    const text = store ? exportCode(store) : null;
    if (!text) {
      setCode("");
      setMessage("Aucune sauvegarde à copier pour l'instant.");
      return;
    }
    setCode(text);
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Code copié. Gardez-le dans vos notes ou envoyez-le sur votre autre appareil.");
    } catch {
      setMessage("Copie automatique impossible : sélectionnez le code ci-dessous et copiez-le.");
    }
  };

  const load = () => {
    if (!store) {
      setMessage("Sauvegarde indisponible dans ce navigateur.");
      return;
    }
    const result = importCode(store, paste);
    if (result === "ok") {
      setPaste("");
      setMessage("Code importé dans l'emplacement « Manuel ». Menu principal → Continuer pour reprendre.");
    } else if (result === "newer") setMessage("Ce code vient d'une version plus récente du jeu.");
    else if (result === "write_failed") setMessage("Écriture impossible : le stockage du navigateur est plein ou bloqué.");
    else setMessage("Code illisible. Vérifiez qu'il est complet (il commence par SILLO8-).");
  };

  return (
    <>
      <h2 className={styles.section}>Sauvegarde</h2>
      <p className={styles.text} style={{ fontSize: 15 }}>
        Sur iPhone et iPad, Safari peut effacer les données d&apos;un site non ouvert depuis 7 jours, sauf s&apos;il est
        ajouté à l&apos;écran d&apos;accueil. Gardez un code de sauvegarde : il sert aussi à changer d&apos;appareil.
      </p>
      <PaperButton variant="olive" onClick={copy}>Copier le code de sauvegarde</PaperButton>
      {code ? (
        <textarea
          className={styles.input}
          aria-label="Code de sauvegarde"
          readOnly
          value={code}
          rows={3}
          style={{ width: "100%", marginTop: 8, fontSize: 12, resize: "vertical", wordBreak: "break-all" }}
          onFocus={(e) => e.currentTarget.select()}
        />
      ) : null}
      <label className={styles.field} style={{ marginTop: 10 }}>
        Importer un code
        <textarea
          className={styles.input}
          aria-label="Coller un code de sauvegarde"
          autoComplete="off"
          spellCheck={false}
          rows={2}
          placeholder="SILLO8-…"
          value={paste}
          style={{ width: "100%", fontSize: 12, resize: "vertical" }}
          onChange={(e) => { setPaste(e.target.value); setMessage(""); }}
        />
      </label>
      <PaperButton disabled={!paste.trim()} onClick={load}>Importer dans « Manuel »</PaperButton>
      {message ? <p className={styles.muted} aria-live="polite">{message}</p> : null}
    </>
  );
}
