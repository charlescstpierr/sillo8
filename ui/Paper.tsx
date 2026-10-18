"use client";
// Briques communes des fiches : bouton cousu, étiquette de toile, tampon.
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./sheets.module.css";

export type Variant = "primary" | "olive" | "leather" | "ghost";

interface PaperButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Raccourci clavier affiché à droite. */
  hotkey?: string;
  arrow?: boolean;
}

export function PaperButton({ variant, hotkey, arrow, children, className, ...rest }: PaperButtonProps) {
  return (
    <button type="button" {...rest} className={className ? `${styles.btn} ${className}` : styles.btn} data-variant={variant}>
      <span>{children}</span>
      {hotkey ? <kbd className={styles.kbd}>{hotkey}</kbd> : null}
      {arrow ? <span className={styles.arrow} aria-hidden>→</span> : null}
    </button>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <div className={styles.tag}>{children}</div>;
}

export function Stamp({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className ?? styles.stamp} aria-hidden>{children}</div>;
}
