"use client";
// HUD du bricoleur : vie, charge de la lampe, arme en main, sacoche (compteurs), objectifs.
import { useEffect, useState } from "react";
import type { Engine } from "@/game/engine";
import { NAIL_CAPACITY } from "@/game/state";
import { useHud } from "./useHud";
import { useUi } from "./useUi";
import { hudExtra } from "./compat";
import { Icon, type IconName } from "./icons";
import styles from "./hud.module.css";

function Gauge({ value, max, tone }: { value: number; max: number; tone: "health" | "lamp" }) {
  const ratio = Math.max(0, Math.min(1, value / max));
  return (
    <div className={styles.gauge} data-tone={tone} data-low={ratio < 0.25}>
      <div className={styles.gaugeFill} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

const OBJECTIVES_KEY = "sillo8-objectives-open";
const VITALS_KEY = "sillo8-vitals-open";

/** Jauge verticale fine : se remplit du bas vers le haut. */
function VGauge({ value, max, tone }: { value: number; max: number; tone: "health" | "lamp" }) {
  const ratio = Math.max(0, Math.min(1, value / max));
  return (
    <div className={styles.vgauge} data-tone={tone} data-low={ratio < 0.25}>
      <div className={styles.vgaugeFill} style={{ height: `${ratio * 100}%` }} />
    </div>
  );
}

/**
 * Barre d'état du téléphone, collée au bord gauche. Repliée : deux jauges verticales (vie, lampe) et l'arme.
 * Un toucher la déplie (arme, clous, sacoche) ; le choix est mémorisé.
 */
function VitalsRail({ hud, nailgun, counters, danger }: {
  hud: ReturnType<typeof useHud>;
  nailgun: boolean;
  counters: [IconName, number, string][];
  danger: string | null;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try { setOpen(window.localStorage.getItem(VITALS_KEY) === "1"); } catch { /* stockage indisponible */ }
  }, []);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { window.localStorage.setItem(VITALS_KEY, next ? "1" : "0"); } catch { /* stockage indisponible */ }
  };
  const summary = `Vie ${hud.health}, lampe ${hud.energy} sur ${hud.maxEnergy}`;
  return (
    <section className={styles.rail} aria-label="Vie et lampe" data-open={open} data-danger={danger ?? undefined}>
      <button type="button" className={styles.railToggle} onClick={toggle} aria-expanded={open} aria-controls="etat-details" aria-label={`${summary}. ${open ? "Replier" : "Déplier"} l'état`}>
        <span className={styles.railGauges}>
          <span className={styles.railGauge}><Icon name="heart" className={styles.railIcon} /><VGauge value={hud.health} max={100} tone="health" /></span>
          <span className={styles.railGauge}><Icon name="cell" className={styles.railIcon} /><VGauge value={hud.energy} max={hud.maxEnergy} tone="lamp" /></span>
        </span>
        <Icon name={nailgun ? "nailgun" : "wrench"} className={styles.railWeapon} />
        {nailgun ? <b className={styles.railAmmo}>{hud.ammo}</b> : null}
        <span className={styles.railChevron} aria-hidden>{open ? "◂" : "▸"}</span>
      </button>
      {open ? (
        <div id="etat-details" className={styles.railPanel}>
          <p className={styles.railNumbers}><span>Vie <b>{hud.health}</b></span><span>Lampe <b>{hud.energy}</b></span></p>
          <p className={styles.railWeaponName}>
            {nailgun
              ? <>LANCE-CLOUS <b>{hud.ammo}</b>/{NAIL_CAPACITY} · réserve {hud.reserve}{hud.reloading ? " …" : ""}</>
              : <>CLÉ À MOLETTE</>}
          </p>
          <ul className={styles.miniCounts}>
            {counters.map(([icon, value, label]) => (
              <li key={icon} title={label} data-empty={value <= 0}><Icon name={icon} />{value}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** Panneau d'objectifs pliable : le titre le replie ou le déplie ; replié, il ne montre que la prochaine étape. */
function Objectives({ hud, touch }: { hud: ReturnType<typeof useHud>; touch: boolean }) {
  const [open, setOpen] = useState<boolean | null>(null);
  const [flash, setFlash] = useState(false);
  const steps = hud.objective.steps;
  const done = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done);

  // Choix mémorisé ; par défaut replié sur téléphone pour dégager l'écran.
  useEffect(() => {
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(OBJECTIVES_KEY); } catch { /* stockage indisponible */ }
    const phone = window.matchMedia("(pointer: coarse)").matches;
    setOpen(saved === null ? !phone : saved === "1");
  }, []);

  // Un objectif accompli fait clignoter l'en-tête.
  const [seen, setSeen] = useState(done);
  useEffect(() => {
    if (done > seen) {
      setFlash(true);
      const timer = window.setTimeout(() => setFlash(false), 1600);
      setSeen(done);
      return () => window.clearTimeout(timer);
    }
    setSeen(done);
  }, [done, seen]);

  const expanded = open ?? !touch;
  const toggle = () => {
    const next = !expanded;
    setOpen(next);
    try { window.localStorage.setItem(OBJECTIVES_KEY, next ? "1" : "0"); } catch { /* stockage indisponible */ }
  };

  return (
    <section className={styles.objectives} aria-label="Objectifs" data-open={expanded} data-flash={flash}>
      <button type="button" className={styles.objectivesToggle} onClick={toggle} aria-expanded={expanded} aria-controls="objectifs-liste">
        <span className={styles.objectivesTitle}>{hud.sector.split(" / ").pop()}</span>
        <span className={styles.objectivesCount}>{done}/{steps.length}</span>
        <span className={styles.chevron} aria-hidden>{expanded ? "▴" : "▾"}</span>
      </button>
      {expanded ? (
        <ul id="objectifs-liste">
          {steps.map((step) => (
            <li key={step.label} data-done={step.done}>
              <span className={styles.check} aria-hidden>{step.done ? "✓" : ""}</span>
              {step.label}
            </li>
          ))}
        </ul>
      ) : next ? (
        <p className={styles.objectivesNext}>
          <span className={styles.check} aria-hidden />
          {next.label}
        </p>
      ) : null}
    </section>
  );
}

const HINT: [string, string][] = [
  ["Clic", "frapper/tirer"], ["Clic droit", "éblouir"], ["1/2", "arme"], ["R", "recharger"],
  ["E", "interagir"], ["J", "carnet"], ["M", "plan"], ["Tab", "sac"],
];

export function Hud({ engine }: { engine: Engine }) {
  const hud = useHud(engine.hud);
  const ui = useUi(engine.ui);
  const extra = hudExtra(engine, hud);
  const touch = hud.device === "touch";
  const playing = ui.mode === "playing";
  const danger = hud.health <= 15 ? "critical" : hud.health <= 35 ? "low" : null;
  const nailgun = extra.weapon === 1;

  const counters: [IconName, number, string][] = [
    ["scrap", hud.components, "Ferraille"],
    ["cell", extra.cells, "Piles"],
    ["bandage", extra.bandages, "Bandages"],
    ["medkit", extra.medkits, "Trousses"],
    ["can", extra.cans, "Conserves"],
  ];

  return (
    <div className={styles.layer} data-hidden={!playing}>
      <div className={styles.vignette} />
      {danger ? <div className={styles.hurt} data-level={danger} /> : null}

      <Objectives hud={hud} touch={touch} />

      {hud.autosaved ? <div className={styles.autosave} role="status">Sauvegardé</div> : null}

      {!touch && hud.device === "keyboard" ? (
        <p className={styles.hint} aria-label={HINT.map(([k, a]) => `${k} : ${a}`).join(" · ")}>
          {HINT.map(([key, action]) => (
            <span key={key}><kbd>{key}</kbd> : {action}</span>
          ))}
        </p>
      ) : null}

      <section className={styles.vitals} aria-label="État du survivant">
        <div className={styles.stamp}>{hud.sector}</div>
        <div className={styles.row}>
          <Icon name="heart" className={styles.rowIcon} />
          <span>VIE</span>
          <Gauge value={hud.health} max={100} tone="health" />
          <b>{hud.health}</b>
        </div>
        <div className={styles.row}>
          <Icon name="cell" className={styles.rowIcon} />
          <span>LAMPE</span>
          <Gauge value={hud.energy} max={hud.maxEnergy} tone="lamp" />
          <b>{hud.energy}</b>
        </div>
        <div className={styles.weapon} data-weapon={extra.weapon}>
          <Icon name={nailgun ? "nailgun" : "wrench"} className={styles.weaponIcon} />
          <div className={styles.weaponText}>
            <span className={styles.weaponName}>{nailgun ? "LANCE-CLOUS" : "CLÉ À MOLETTE"}</span>
            {nailgun ? (
              <span className={styles.ammo}>
                <b>{hud.ammo}</b>/{NAIL_CAPACITY} <small>· réserve {hud.reserve}</small>
                {hud.reloading ? <em> · recharge…</em> : null}
              </span>
            ) : (
              <span className={styles.ammo}><small>corps à corps · silencieuse</small></span>
            )}
          </div>
        </div>
        <ul className={styles.counts}>
          {counters.map(([icon, value, label]) => (
            <li key={icon} title={label} data-empty={value <= 0}>
              <Icon name={icon} className={styles.countIcon} />
              <b>{value}</b>
            </li>
          ))}
        </ul>
      </section>

      {/* Téléphone : barre verticale rétractable au bord gauche (vie, lampe, arme) */}
      <VitalsRail hud={hud} nailgun={nailgun} counters={counters} danger={danger} />

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
  const mode = ui.mode as string;
  if (!hud.notice || expired === hud.noticeId || mode === "dialogue" || mode === "note" || mode === "journal") return null;
  return <p key={hud.noticeId} className={styles.notice} data-mode={ui.mode} role="status">{hud.notice}</p>;
}
