"use client";
// Commandes tactiles : stick à gauche, frappe / tir, lampe, changement d'arme, interaction à droite ;
// pause, sac et carnet en haut à gauche. Visée assistée côté moteur.
import { useEffect, useRef, useState } from "react";
import type { Engine } from "@/game/engine";
import { useHud } from "./useHud";
import { useUi } from "./useUi";
import { hudExtra, openJournal, trigger } from "./compat";
import { Icon } from "./icons";
import styles from "./touch.module.css";

const STICK_RADIUS = 56;

export function TouchControls({ engine }: { engine: Engine }) {
  const hud = useHud(engine.hud);
  const ui = useUi(engine.ui);
  const [coarse, setCoarse] = useState(false);
  const [stick, setStick] = useState<{ ox: number; oy: number; dx: number; dy: number } | null>(null);
  const pointerId = useRef<number | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Uniquement en jeu : les fiches ont leurs propres boutons.
  if ((!coarse && hud.device !== "touch") || ui.mode !== "playing") return null;
  const input = engine.input;
  const extra = hudExtra(engine, hud);
  const nailgun = extra.weapon === 1;

  const onStickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== null) return;
    input.device = "touch";
    pointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setStick({ ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 });
  };
  const onStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerId.current || !stick) return;
    let dx = e.clientX - stick.ox;
    let dy = e.clientY - stick.oy;
    const length = Math.hypot(dx, dy);
    if (length > STICK_RADIUS) {
      dx = (dx / length) * STICK_RADIUS;
      dy = (dy / length) * STICK_RADIUS;
    }
    input.touchMove.x = dx / STICK_RADIUS;
    input.touchMove.y = -dy / STICK_RADIUS;
    setStick({ ...stick, dx, dy });
  };
  const onStickUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerId.current) return;
    pointerId.current = null;
    input.touchMove.x = input.touchMove.y = 0;
    setStick(null);
  };

  const tap = (action: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    input.device = "touch";
    trigger(engine, action);
  };
  const press = (run: () => void) => (e: React.PointerEvent) => {
    e.preventDefault();
    input.device = "touch";
    run();
  };
  // Choix explicite de l'autre arme : fonctionne avec « 1 / 2 » comme avec un échange.
  const swap = press(() => trigger(engine, nailgun ? "weapon1" : "weapon2"));
  // Bouton désigné par la bulle du tutoriel : anneau pointillé qui respire.
  const tutorial = hud.tutorial?.target ?? null;
  const cue = (target: string) => (tutorial === target ? true : undefined);
  const fireUp = () => { input.touchFiring = false; };

  return (
    <div className={styles.layer}>
      <div className={styles.stickZone} onPointerDown={onStickDown} onPointerMove={onStickMove} onPointerUp={onStickUp} onPointerCancel={onStickUp}>
        {stick ? (
          <div className={styles.stickBase} style={{ left: stick.ox, top: stick.oy }}>
            <div className={styles.stickKnob} style={{ transform: `translate(${stick.dx}px, ${stick.dy}px)` }} />
          </div>
        ) : (
          <div className={styles.stickHint} data-tutorial={cue("stick")}>déplacer</div>
        )}
      </div>
      <div className={styles.buttons}>
        <button
          className={styles.fire}
          data-weapon={extra.weapon}
          data-tutorial={cue("fire")}
          aria-label={nailgun ? "Tirer" : "Frapper"}
          onPointerDown={(e) => { e.preventDefault(); input.device = "touch"; input.touchFiring = true; }}
          onPointerUp={fireUp}
          onPointerCancel={fireUp}
          onPointerLeave={fireUp}
        >
          <Icon name={nailgun ? "nailgun" : "wrench"} />
          <span>{nailgun ? "TIRER" : "FRAPPER"}</span>
        </button>
        <button className={styles.small} data-slot="lamp" data-tutorial={cue("lamp")} aria-label="Éblouir" onPointerDown={tap("light")}>
          <Icon name="lamp" />
          <span>LAMPE</span>
        </button>
        <button className={styles.small} data-slot="swap" aria-label="Changer d'arme" onPointerDown={swap}>⇄</button>
        {nailgun ? <button className={styles.small} data-slot="reload" aria-label="Recharger" onPointerDown={tap("reload")}>R</button> : null}
        <button className={styles.small} data-slot="use" data-tutorial={cue("use")} aria-label="Interagir" data-ready={hud.prompt !== null} onPointerDown={tap("interact")}>✋</button>
        <button
          className={styles.small}
          data-slot="crouch"
          data-tutorial={cue("crouch")}
          aria-label="S'accroupir"
          data-ready={input.touchCrouch}
          onPointerDown={(e) => { e.preventDefault(); input.touchCrouch = !input.touchCrouch; }}
        >⤓</button>
      </div>
      <div className={styles.menu}>
        <button className={styles.pause} onPointerDown={tap("pause")} aria-label="Pause">❚❚</button>
        <button className={styles.bag} onPointerDown={tap("inventory")} aria-label="Sac">
          <Icon name="bag" />
          <span>SAC</span>
        </button>
        <button className={styles.journal} data-tutorial={cue("journal")} onPointerDown={press(() => openJournal(engine))} aria-label="Carnet">
          <Icon name="journal" />
          <span>CARNET</span>
        </button>
      </div>
    </div>
  );
}
