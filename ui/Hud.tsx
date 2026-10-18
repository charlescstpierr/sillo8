"use client";
import type { Engine } from "@/game/engine";
import { useHud } from "./useHud";
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
  const touch = hud.device === "touch";
  return (
    <div className={styles.layer}>
      <div className={styles.vignette} />

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
        <div className={styles.ammo}>
          D9 <b>{String(hud.ammo).padStart(2, "0")}</b> / {hud.reserve}
          {hud.reloading ? <em> · rechargement…</em> : null}
          <span className={styles.parts}>⚙ {hud.components}</span>
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

      {hud.notice ? <p key={hud.noticeId} className={styles.notice}>{hud.notice}</p> : null}

      {hud.showPerf ? <p className={styles.perf}>{hud.fps} i/s</p> : null}

      {hud.paused ? (
        <div className={styles.pause}>
          <div className={styles.sheet}>
            <div className={styles.sheetStamp}>SILO 9 · PAUSE</div>
            <h1>Signal suspendu</h1>
            <p>Échap ou le bouton ❚❚ pour reprendre. F5 sauvegarde, F9 recharge.</p>
            <button onClick={() => engine.setPaused(false)}>Reprendre →</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
