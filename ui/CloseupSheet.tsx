"use client";
// Gros plan d'un objet d'enquête : on le tourne (doigt, souris, flèches, stick droit), on zoome (pincer,
// molette, + / −) et on promène la loupe (L, bouton X). Un détail caché se révèle au bon angle ou sous la
// loupe ; le carnet gagne alors une carte, avec la petite animation « nouvel indice ».
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { Engine } from "@/game/engine";
import { INDEX } from "@/game/investigation/world";
import type { Examinable, HiddenDetail } from "@/game/investigation/types";
import { Art } from "./inquiry/art";
import { PuzzlePanel } from "./inquiry/PuzzlePanel";
import { useInquiry } from "./inquiry/useInquiry";
import { useHud } from "./useHud";
import { frenchSpaces } from "./typo";
import { NewClue, ThoughtPaper } from "./InquiryLayer";
import { PaperButton } from "./Paper";
import styles from "./inquiry.module.css";

const LENS_SCALE = 2.6;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** Angle ramené entre −180 et 180. */
const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

function detailVisible(d: HiddenDetail, yaw: number, pitch: number, loupe: boolean, lens: { x: number; y: number }, back: boolean): boolean {
  const r = d.reveal;
  if (r.by === "angle") {
    const value = Math.abs(r.axis === "yaw" ? wrap(yaw) : pitch);
    return value >= r.min && value <= r.max;
  }
  if (!loupe || (r.face === "back") !== back) return false;
  return Math.hypot(lens.x - r.x, (lens.y - r.y) * 0.8) <= r.radius;
}

export function CloseupSheet({ engine, id, touch }: { engine: Engine; id: string; touch: boolean }) {
  const exam = INDEX.examinables.get(id);
  if (!exam) {
    return (
      <section className={styles.closeup} data-sheet aria-label="Gros plan">
        <p>Rien à examiner.</p>
        <PaperButton variant="primary" onClick={() => engine.resume()}>Reprendre</PaperButton>
      </section>
    );
  }
  return <Closeup key={id} engine={engine} exam={exam} touch={touch} />;
}

function Closeup({ engine, exam, touch }: { engine: Engine; exam: Examinable; touch: boolean }) {
  const inquiry = useInquiry(engine.inquiry.store);
  const details = exam.closeup.details ?? [];
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loupe, setLoupe] = useState(false);
  const [lens, setLens] = useState({ x: 0.5, y: 0.45 });
  const [revealed, setRevealed] = useState(() => details.map((_, i) => engine.inquiry.isRevealed(exam.id, i)));
  const [found, setFound] = useState<{ text: string; card: string | null; key: number } | null>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const pinch = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);
  const objectRef = useRef<HTMLDivElement>(null);
  const notice = useCloseupNotice(engine);

  const back = Math.abs(wrap(yaw)) > 90;
  const hasBack = Boolean(exam.closeup.back);

  // Révélation : dès que l'angle ou la loupe montre le détail.
  useEffect(() => {
    details.forEach((d, i) => {
      if (revealed[i] || !detailVisible(d, yaw, pitch, loupe, lens, back)) return;
      const card = engine.inquiry.reveal(exam.id, i);
      setRevealed((prev) => prev.map((v, j) => (j === i ? true : v)));
      setFound({ text: d.text, card, key: Date.now() });
    });
  }, [details, engine, exam.id, yaw, pitch, loupe, lens, back, revealed]);

  const toggleLoupe = useCallback(() => {
    setLoupe((on) => {
      if (!on) {
        // À la loupe, l'objet se remet de face (recto ou verso).
        setPitch(0);
        setYaw((y) => (Math.abs(wrap(y)) > 90 ? 180 : 0));
      }
      return !on;
    });
  }, []);

  const lensFromEvent = (e: { clientX: number; clientY: number }) => {
    const rect = objectRef.current?.getBoundingClientRect();
    if (!rect) return;
    setLens({ x: clamp((e.clientX - rect.left) / rect.width, 0, 1), y: clamp((e.clientY - rect.top) / rect.height, 0, 1) });
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.size === 2) {
      const [a, b] = [...pinch.current.values()];
      pinchStart.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      drag.current = null;
      return;
    }
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    if (loupe) lensFromEvent(e);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pinch.current.has(e.pointerId)) pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchStart.current && pinch.current.size === 2) {
      const [a, b] = [...pinch.current.values()];
      setZoom(clamp(pinchStart.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinchStart.current.distance)), 1, 2.4));
      return;
    }
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (loupe) {
      lensFromEvent(e);
      return;
    }
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    drag.current = { id: d.id, x: e.clientX, y: e.clientY };
    setYaw((y) => (hasBack ? y + dx * 0.6 : clamp(y + dx * 0.6, -60, 60)));
    setPitch((p) => clamp(p - dy * 0.6, -80, 80));
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    pinch.current.delete(e.pointerId);
    if (pinch.current.size < 2) pinchStart.current = null;
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  // Molette : zoom.
  useEffect(() => {
    const el = objectRef.current?.parentElement;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => clamp(z - Math.sign(e.deltaY) * 0.15, 1, 2.4));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Clavier : flèches (tourner, ou déplacer la loupe), + / − (zoom), L (loupe), R (remettre de face).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Champ de saisie d'une énigme : les lettres vont au champ.
      if (e.target instanceof HTMLInputElement) return;
      const step = e.shiftKey ? 20 : 10;
      let handled = true;
      switch (e.code) {
        case "ArrowLeft": case "ArrowRight": {
          const sign = e.code === "ArrowLeft" ? -1 : 1;
          if (loupe) setLens((l) => ({ ...l, x: clamp(l.x + sign * 0.04, 0, 1) }));
          else setYaw((y) => (hasBack ? y + sign * step : clamp(y + sign * step, -60, 60)));
          break;
        }
        case "ArrowUp": case "ArrowDown": {
          const sign = e.code === "ArrowUp" ? -1 : 1;
          if (loupe) setLens((l) => ({ ...l, y: clamp(l.y + sign * 0.04, 0, 1) }));
          else setPitch((p) => clamp(p - sign * step, -80, 80));
          break;
        }
        case "Equal": case "NumpadAdd": setZoom((z) => clamp(z + 0.2, 1, 2.4)); break;
        case "Minus": case "Digit6": case "NumpadSubtract": setZoom((z) => clamp(z - 0.2, 1, 2.4)); break;
        case "KeyL": if (!e.repeat) toggleLoupe(); break;
        case "KeyR": setYaw(0); setPitch(0); setZoom(1); break;
        default: handled = false;
      }
      if (handled) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [loupe, hasBack, toggleLoupe]);

  // Manette : stick droit pour tourner, stick gauche pour la loupe, X pour la loupe, B pour fermer.
  useEffect(() => {
    let frame = 0;
    let previous: boolean[] = [];
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const input = engine.input;
      if (input.device !== "gamepad") return;
      const aim = input.aimStick;
      const move = input.move;
      if (Math.hypot(aim.x, aim.y) > 0.2) {
        setYaw((y) => (hasBack ? y + aim.x * 4 : clamp(y + aim.x * 4, -60, 60)));
        setPitch((p) => clamp(p + aim.y * 4, -80, 80));
      }
      if (loupe && Math.hypot(move.x, move.y) > 0.2) setLens((l) => ({ x: clamp(l.x + move.x * 0.015, 0, 1), y: clamp(l.y - move.y * 0.015, 0, 1) }));
      const pad = typeof navigator !== "undefined" && navigator.getGamepads ? [...navigator.getGamepads()].find((p) => p?.connected) : null;
      if (pad) {
        const pressed = pad.buttons.map((b) => b.pressed);
        if (pressed[2] && !previous[2]) toggleLoupe();
        if (pressed[1] && !previous[1]) engine.resume();
        if (pressed[12]) setZoom((z) => clamp(z + 0.03, 1, 2.4));
        if (pressed[13]) setZoom((z) => clamp(z - 0.03, 1, 2.4));
        previous = pressed;
      }
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [engine, loupe, hasBack, toggleLoupe]);

  const next = details.findIndex((_, i) => !revealed[i]);
  const cue = next >= 0 ? details[next].cue : null;
  const face = back && exam.closeup.back ? exam.closeup.back : exam.closeup.front;
  // inquiry.version change à chaque progrès : le dessin suit l'énigme (cadenas ouvert…).
  const solved = Boolean(exam.puzzle && inquiry.version >= 0 && engine.inquiry.puzzleSolved(exam.puzzle));
  const artProps = { pitch, revealed, solved };
  const objectStyle: CSSProperties = {
    aspectRatio: String(exam.closeup.aspect),
    ["--aspect" as string]: String(exam.closeup.aspect),
    transform: `scale(${zoom}) rotateX(${pitch}deg) rotateY(${yaw}deg)`,
    transition: drag.current ? "none" : "transform 0.18s ease-out",
  };
  const orientation = exam.closeup.aspect >= 1 ? "wide" : "tall";

  return (
    <section className={styles.closeup} data-sheet aria-label={`Gros plan : ${exam.name}`} data-loupe={loupe} data-puzzle={exam.puzzle ? INDEX.puzzles.get(exam.puzzle)?.kind ?? "puzzle" : undefined}>
      <header className={styles.closeupHead}>
        <span className={styles.closeupTag}>Gros plan</span>
        <h1 className={styles.closeupTitle}>{exam.name}</h1>
        <p className={styles.glance}>{exam.closeup.glance}</p>
      </header>

      <div
        className={styles.stage}
        data-orientation={orientation}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        aria-label={loupe ? "Glissez pour déplacer la loupe" : "Glissez pour tourner l'objet"}
        role="img"
      >
        <div ref={objectRef} className={styles.object} style={objectStyle} data-testid="closeup-object">
          <div className={styles.face} data-face="front">
            <Art name={exam.closeup.front.art} lines={exam.closeup.front.lines} {...artProps} />
          </div>
          {exam.closeup.back ? (
            <div className={styles.face} data-face="back">
              <Art name={exam.closeup.back.art} lines={exam.closeup.back.lines} {...artProps} />
            </div>
          ) : (
            <div className={styles.face} data-face="back" data-blank />
          )}
          {loupe ? (
            <Lens objectRef={objectRef} lens={lens} back={back}>
              <Art name={face.art} lines={face.lines} {...artProps} />
            </Lens>
          ) : null}
        </div>
        {/* Énigme : l'avis se pose sur la scène (sans pousser la pensée de Lou hors de la vue au téléphone). */}
        {notice && exam.puzzle ? <p key={notice.id} className={styles.closeupNotice} data-over-stage role="status" data-testid="closeup-notice">{frenchSpaces(notice.text)}</p> : null}
        {!loupe && !(notice && exam.puzzle) ? <span className={styles.stageHint} aria-hidden>{touch ? "glisser pour tourner · pincer pour zoomer" : "glisser pour tourner · molette pour zoomer"}</span> : null}
      </div>

      <div className={styles.closeupInfo}>
        {exam.puzzle ? <PuzzlePanel engine={engine} id={exam.puzzle} touch={touch} /> : null}
        {details.map((d, i) => (revealed[i] ? (
          <p key={i} className={styles.revealed} data-revealed><span className={styles.revealStamp}>Vu</span>{d.text}</p>
        ) : null))}
        {cue ? <p className={styles.cue} role="note" aria-label="Consigne">{cue}</p> : details.length || exam.puzzle ? null : <p className={styles.cue}>Noté au carnet.</p>}
        {inquiry.thought ? <ThoughtPaper text={inquiry.thought.text} key={inquiry.thought.key} /> : null}
      </div>

      <div className={styles.tools}>
        {notice && !exam.puzzle ? <p key={notice.id} className={styles.closeupNotice} role="status" data-testid="closeup-notice">{frenchSpaces(notice.text)}</p> : null}
        <button type="button" className={styles.tool} onClick={() => setZoom((z) => clamp(z - 0.3, 1, 2.4))} aria-label="Dézoomer" disabled={zoom <= 1}>−</button>
        <button type="button" className={styles.tool} onClick={() => setZoom((z) => clamp(z + 0.3, 1, 2.4))} aria-label="Zoomer" disabled={zoom >= 2.4}>+</button>
        {hasBack ? (
          <button type="button" className={styles.tool} data-wide onClick={() => { setLoupe(false); setPitch(0); setYaw((y) => (Math.abs(wrap(y)) > 90 ? 0 : 180)); }} aria-label="Retourner">⟲ <span>Retourner</span></button>
        ) : null}
        <button type="button" className={styles.tool} data-wide aria-pressed={loupe} onClick={toggleLoupe} aria-label="Loupe">
          <svg viewBox="0 0 24 24" aria-hidden><circle cx="10" cy="10" r="6.5" fill="#fff6e2" stroke="currentColor" strokeWidth="2.2" /><path d="M15 15l6 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
          <span>Loupe</span>{touch ? null : <kbd>L</kbd>}
        </button>
        <PaperButton variant="primary" className={styles.closeBtn} autoFocus={!touch} hotkey={touch ? undefined : "E"} onClick={() => engine.resume()}>Reposer</PaperButton>
      </div>

      {found ? <NewClue key={found.key} card={found.card} /> : inquiry.toast && !found ? <NewClue key={inquiry.toast.key} card={inquiry.toast.card} /> : null}
    </section>
  );
}

/**
 * Avis du moteur arrivé PENDANT le gros plan (disjoncteur qui claque, bruit qui attire les mordus, porte fermée…).
 * L'avis flottant du jeu (Notice, ui/Hud.tsx) est masqué en gros plan pour ne pas couvrir le titre : on le montre
 * ici, en petite ligne au-dessus des boutons, 6 s réelles (le temps du jeu est figé pendant le gros plan).
 * Un avis plus ancien que l'ouverture du gros plan n'est pas repris.
 */
function useCloseupNotice(engine: Engine): { text: string; id: number } | null {
  const hud = useHud(engine.hud);
  const [openedAt] = useState(() => engine.hud.get().noticeId);
  const [expired, setExpired] = useState(-1);
  useEffect(() => {
    if (hud.noticeId <= openedAt) return;
    const timer = window.setTimeout(() => setExpired(hud.noticeId), 6000);
    return () => window.clearTimeout(timer);
  }, [hud.noticeId, openedAt]);
  if (!hud.notice || hud.noticeId <= openedAt || expired === hud.noticeId) return null;
  return { text: hud.notice, id: hud.noticeId };
}

/**
 * Loupe ronde, posée DANS l'objet (elle suit sa place et son zoom) : montre la face visible en grand,
 * centrée sur le point visé. Au verso, l'objet est retourné : la loupe se retourne aussi.
 */
function Lens({ objectRef, lens, back, children }: { objectRef: React.RefObject<HTMLDivElement | null>; lens: { x: number; y: number }; back: boolean; children: React.ReactNode }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const measure = () => {
      const el = objectRef.current;
      if (el) setSize((old) => (old && old.w === el.offsetWidth && old.h === el.offsetHeight ? old : { w: el.offsetWidth, h: el.offsetHeight }));
    };
    measure();
    const timer = window.setInterval(measure, 250);
    return () => window.clearInterval(timer);
  }, [objectRef]);
  if (!size) return null;
  const d = Math.round(Math.min(150, Math.max(104, size.w * 0.42)));
  // Coordonnées dans l'objet (non retourné) : au verso, x est en miroir.
  const x = (back ? 1 - lens.x : lens.x) * size.w;
  const y = lens.y * size.h;
  return (
    <div className={styles.lens} style={{ width: d, height: d, left: x - d / 2, top: y - d / 2, transform: back ? "translateZ(2px) rotateY(180deg)" : "translateZ(2px)" }} data-testid="loupe">
      <div
        className={styles.lensContent}
        style={{
          width: size.w,
          height: size.h,
          transform: `translate(${d / 2 - lens.x * size.w * LENS_SCALE}px, ${d / 2 - lens.y * size.h * LENS_SCALE}px) scale(${LENS_SCALE})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
