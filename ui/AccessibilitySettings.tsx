"use client";
// Réglages d'affichage (taille du texte, police) et d'accessibilité (sous-titres, couleurs, confort, animations),
// rangés à part pour garder SettingsSheet.tsx court et facile à fusionner.
import { useEffect, useState } from "react";
import { TEXT_SIZE_LABELS, type A11ySettings, type CaptionMode, type MotionMode } from "./accessibility";
import styles from "./sheets.module.css";

type Change = (patch: Partial<A11ySettings>) => void;

/** Section Affichage : taille du texte (4 crans) et police lisible. */
export function DisplayFields({ value, onChange }: { value: A11ySettings; onChange: Change }) {
  return (
    <>
      <div className={styles.field} role="radiogroup" aria-label="Taille du texte">
        <span>Taille du texte</span>
        <div className={styles.segments}>
          {TEXT_SIZE_LABELS.map(([size, label], i) => (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={value.textSize === size}
              className={styles.segment}
              data-size={size}
              onClick={() => onChange({ textSize: size })}
            >
              <span className={styles.segmentSample} aria-hidden style={{ fontSize: `${1 + i * 0.18}em` }}>Aa</span>
              {label}
            </button>
          ))}
        </div>
      </div>
      <label className={styles.toggle}>
        <input type="checkbox" checked={value.readableFont} onChange={(e) => onChange({ readableFont: e.target.checked })} />
        <span className={styles.switch} aria-hidden />
        <span>Police plus lisible · lettres d&apos;imprimerie au lieu de l&apos;écriture à la main</span>
      </label>
    </>
  );
}

/** Section Accessibilité : sous-titres, couleurs adaptées, mode moins effrayant, animations. */
export function AccessibilityFields({ value, onChange }: { value: A11ySettings; onChange: Change }) {
  // Le réglage du système n'est connu qu'au navigateur : lu après le premier rendu.
  const [systemReduced, setSystemReduced] = useState<boolean | null>(null);
  useEffect(() => {
    setSystemReduced(typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return (
    <>
      <label className={styles.field}>
        Sous-titres des sons
        <select className={styles.input} value={value.captions} onChange={(e) => onChange({ captions: e.target.value as CaptionMode })}>
          <option value="auto">Auto · sur téléphone quand le son est coupé</option>
          <option value="on">Toujours</option>
          <option value="off">Jamais</option>
        </select>
      </label>
      <label className={styles.toggle}>
        <input type="checkbox" checked={value.safeColors} onChange={(e) => onChange({ safeColors: e.target.checked })} />
        <span className={styles.switch} aria-hidden />
        <span>Couleurs adaptées · yeux des mordus et jauges lisibles avec un daltonisme</span>
      </label>
      <label className={styles.toggle}>
        <input type="checkbox" checked={value.gentle} onChange={(e) => onChange({ gentle: e.target.checked })} />
        <span className={styles.switch} aria-hidden />
        <span>Moins effrayant · grognements adoucis, mordus plus lents, ni vibration ni secousse (l&apos;histoire ne change pas)</span>
      </label>
      <label className={styles.field}>
        Animations
        <select className={styles.input} value={value.motion} onChange={(e) => onChange({ motion: e.target.value as MotionMode })}>
          <option value="auto">
            Comme le système{systemReduced === null ? "" : systemReduced ? " · réduites" : " · complètes"}
          </option>
          <option value="reduced">Réduites · sans secousses, arrêts sur image ni éclairs</option>
          <option value="full">Complètes</option>
        </select>
      </label>
    </>
  );
}
