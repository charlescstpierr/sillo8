"use client";
// « Nouvelle descente » avec confirmation quand une sauvegarde existe : on ne perd jamais une partie d'un clic.
import { useState } from "react";
import type { Engine } from "@/game/engine";
import { PaperButton, type Variant } from "./Paper";
import styles from "./sheets.module.css";

interface Props {
  engine: Engine;
  label: string;
  variant?: Variant;
  arrow?: boolean;
  autoFocus?: boolean;
}

export function NewGameButton({ engine, label, variant, arrow, autoFocus }: Props) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <PaperButton variant={variant} arrow={arrow} autoFocus={autoFocus} onClick={() => (engine.hasSave() ? setAsking(true) : engine.newGame())}>
        {label}
      </PaperButton>
    );
  }
  return (
    <div className={styles.confirm} role="alertdialog" aria-label="Confirmer la nouvelle descente">
      <p className={styles.text}>
        Recommencer depuis l&apos;entrée ? Les sauvegardes automatiques seront remplacées. La sauvegarde
        « Manuel » reste disponible tant que vous ne sauvegardez pas par-dessus.
      </p>
      <div className={styles.confirmButtons}>
        <PaperButton variant="primary" autoFocus onClick={() => engine.newGame()}>Oui, recommencer</PaperButton>
        <PaperButton variant="ghost" onClick={() => setAsking(false)}>Annuler</PaperButton>
      </div>
    </div>
  );
}
