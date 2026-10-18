"use client";
import { useEffect, useState } from "react";
import type { Engine } from "@/game/engine";
import { useHud } from "./useHud";
import { useUi } from "./useUi";
import styles from "./hud.module.css";

function Gauge({ value, max, tone }: { value: number; max: number; tone: "health" | "energy" }) {
  return (
    <div className={styles.gauge} data-tone={tone}>
      <div className={styles.gaugeFill} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  );
}

export function Hud({ engine }: { engine: Engine }) {
  const hud = useHud(engine.hud);
  const ui = useUi(engine.ui);
  const touch = hud.device === "touch";
  const playing = ui.mode === "playing";
  const danger = hud.health <= 15 ? "critical" : hud.health <= 35 ? "low" : null;
  return (
    <div className={styles.layer} data-hidden={!playing}>
      <div className={styles.vignette} />
      {danger ? <div className={styles.hurt} data-level={danger} /> : null}

      <section className={styles.objectives} aria-label="Objectifs">
        <h2 className={styles.objectivesTitle}>{hud.sector.split(" / ").pop()}</h2>
        <ul>
          {hud.objective.steps.map((step) => (
            <li key={step.label} data-done={step.done}>
              <span className={styles.check} aria-hidden>{step.done ? "✓" : ""}</span>
              {step.label}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.vitals} aria-label="État de l'opérateur">
        <div className={styles.stamp}>{hud.sector}</div>
        <div className={styles.row}><span>VIE</span><Gauge value={hud.health} max={100} tone="health" /><b>{hud.health}</b></div>
        <div className={styles.row}><span>ÉNERGIE</span><Gauge value={hud.energy} max={hud.maxEnergy} tone="energy" /><b>{hud.energy}</b></div>
        <div className={styles.weapon} data-weapon={hud.weapon}>
          {hud.weapon === 0 ? (
            <>
              <span className={styles.weaponName}>D9</span>
              <b>{String(hud.ammo).padStart(2, "0")}</b> / {hud.reserve}
              {hud.reloading ? <em> · rechargement…</em> : null}
            </>
          ) : (
            <>
              <span className={styles.weaponName}>ARC-3</span>
              <span>12 ÉNERGIE / DÉCHARGE</span>
            </>
          )}
        </div>
        <div className={styles.counts}>
          <span title="Trousses de soin">✚ {hud.medkits}</span>
          <span title="Cellules d'énergie">ϟ {hud.cells}</span>
          <span title="Composants">⚙ {hud.components}</span>
        </div>
      </section>

      {/* Version compacte pour les écrans bas (téléphone en paysage) */}
      <section className={styles.mini} aria-hidden>
        <div className={styles.miniRow}><Gauge value={hud.health} max={100} tone="health" /><b>{hud.health}</b></div>
        <div className={styles.miniRow}><Gauge value={hud.energy} max={hud.maxEnergy} tone="energy" /><b>{hud.energy}</b></div>
        <div className={styles.miniWeapon}>
          <i>{hud.weapon === 0 ? <>D9 <b>{String(hud.ammo).padStart(2, "0")}</b>/{hud.reserve}{hud.reloading ? " …" : ""}</> : <>ARC-3 · 12 ÉN.</>}</i>
          <span>✚{hud.medkits} ϟ{hud.cells} ⚙{hud.components}</span>
        </div>
      </section>

      <div ref={(el) => { engine.tooltipEl = el; }} className={styles.tooltip} style={{ opacity: 0 }}>
        {hud.prompt ? (
          <>
            <strong>{hud.prompt.name}</strong>
            <span><kbd>{touch ? "✋" : hud.device === "gamepad" ? "A" : "E"}</kbd> {hud.prompt.action}</span>
          </>
        ) : null}
      </div>

      {hud.showPerf ? <p className={styles.perf}>{hud.fps} i/s</p> : null}
    </div>
  );
}

/** Avis du moteur, visible aussi hors jeu (sauvegarde, chargement…) sauf pendant un dialogue. */
export function Notice({ engine }: { engine: Engine }) {
  const hud = useHud(engine.hud);
  const ui = useUi(engine.ui);
  const [expired, setExpired] = useState(-1);
  useEffect(() => {
    // Hors jeu, le temps du moteur est figé : on efface l'avis au bout de 6 s réelles.
    const timer = setTimeout(() => setExpired(hud.noticeId), 6000);
    return () => clearTimeout(timer);
  }, [hud.noticeId]);
  if (!hud.notice || expired === hud.noticeId || ui.mode === "dialogue") return null;
  return <p key={hud.noticeId} className={styles.notice} data-mode={ui.mode} role="status">{hud.notice}</p>;
}
