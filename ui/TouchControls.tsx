"use client";
import { useEffect, useRef, useState } from "react";
import type { Engine } from "@/game/engine";
import type { Action } from "@/game/input";
import { useHud } from "./useHud";
import styles from "./touch.module.css";

const STICK_RADIUS = 56;

/** Commandes tactiles : stick gauche, gros boutons à droite. Visée assistée côté moteur. */
export function TouchControls({ engine }: { engine: Engine }) {
  const hud = useHud(engine.hud);
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

  if (!coarse && hud.device !== "touch") return null;
  const input = engine.input;

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

  const tap = (action: Action) => (e: React.PointerEvent) => {
    e.preventDefault();
    input.device = "touch";
    input.trigger(action);
  };

  return (
    <div className={styles.layer}>
      <div className={styles.stickZone} onPointerDown={onStickDown} onPointerMove={onStickMove} onPointerUp={onStickUp} onPointerCancel={onStickUp}>
        {stick ? (
          <div className={styles.stickBase} style={{ left: stick.ox, top: stick.oy }}>
            <div className={styles.stickKnob} style={{ transform: `translate(${stick.dx}px, ${stick.dy}px)` }} />
          </div>
        ) : (
          <div className={styles.stickHint}>déplacer</div>
        )}
      </div>
      <div className={styles.buttons}>
        <button
          className={styles.fire}
          onPointerDown={(e) => { e.preventDefault(); input.device = "touch"; input.touchFiring = true; }}
          onPointerUp={() => { input.touchFiring = false; }}
          onPointerCancel={() => { input.touchFiring = false; }}
          onPointerLeave={() => { input.touchFiring = false; }}
        >TIR</button>
        <button className={styles.small} data-slot="arc" onPointerDown={tap("arc")}>ARC</button>
        <button className={styles.small} data-slot="scan" onPointerDown={tap("scan")}>ÉCHO</button>
        <button className={styles.small} data-slot="use" data-ready={hud.prompt !== null} onPointerDown={tap("interact")}>✋</button>
        <button className={styles.small} data-slot="reload" onPointerDown={tap("reload")}>R</button>
        <button
          className={styles.small}
          data-slot="crouch"
          data-ready={input.touchCrouch}
          onPointerDown={(e) => { e.preventDefault(); input.touchCrouch = !input.touchCrouch; }}
        >⤓</button>
      </div>
      <button className={styles.pause} onPointerDown={tap("pause")} aria-label="Pause">❚❚</button>
    </div>
  );
}
