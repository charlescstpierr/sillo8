"use client";
// Plan de l'étage 1 croqué au crayon dans le carnet : traits d'encre brune un peu tremblés, hachures,
// noms des pièces à la main. Généré d'après game/level.ts (pièces, portes) et ce que l'héroïne connaît
// (game/plan.ts). Se déplace au doigt ou à la souris, se zoome au pincement, à la molette ou aux boutons.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { DOORS, type Door, type Room } from "@/game/level";
import { PLAN_BOUNDS, type PlanModel, type PlanRoom } from "@/game/plan";
import styles from "./sheets.module.css";

const INK = "#4a3220";
const RED = "#c4412a";
const RUST = "#b4532a";
const MARGIN = 3;
const VB = {
  x: PLAN_BOUNDS.x0 - MARGIN,
  z: PLAN_BOUNDS.z0 - MARGIN,
  w: PLAN_BOUNDS.x1 - PLAN_BOUNDS.x0 + MARGIN * 2,
  h: PLAN_BOUNDS.z1 - PLAN_BOUNDS.z0 + MARGIN * 2,
};
const MAX_ZOOM = 4;

// ——— Trait à main levée ———

/** Petit générateur pseudo-aléatoire : le même trait tremble toujours de la même façon. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedOf(...values: number[]): number {
  let h = 2166136261;
  for (const v of values) {
    h ^= Math.round(v * 97);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const f = (n: number) => Math.round(n * 100) / 100;

/** Segment tremblé, qui dépasse un peu aux extrémités comme un croquis d'architecte. */
function sketchLine(x0: number, z0: number, x1: number, z1: number, pass = 0, wobble = 0.14, overshoot = 0.35): string {
  const rnd = random(seedOf(x0, z0, x1, z1, pass));
  const len = Math.hypot(x1 - x0, z1 - z0);
  if (len < 0.01) return "";
  const ux = (x1 - x0) / len;
  const uz = (z1 - z0) / len;
  const nx = -uz;
  const nz = ux;
  const start = -overshoot * (0.4 + rnd());
  const end = len + overshoot * (0.4 + rnd());
  const steps = Math.max(2, Math.round((end - start) / 2.2));
  const bow = (rnd() - 0.5) * wobble * 2.2;
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const along = start + (end - start) * t;
    const off = (rnd() - 0.5) * wobble + Math.sin(t * Math.PI) * bow + (pass ? 0.12 : 0);
    points.push(`${f(x0 + ux * along + nx * off)},${f(z0 + uz * along + nz * off)}`);
  }
  return `M${points.join("L")}`;
}

/** Arc de cercle tremblé (hub rond), angles en radians, 0 = est, sens horaire à l'écran. */
function sketchArc(cx: number, cz: number, r: number, a0: number, a1: number, pass = 0): string {
  const rnd = random(seedOf(cx, cz, r, a0, a1, pass));
  const steps = Math.max(4, Math.round(((a1 - a0) * r) / 1.6));
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    const rr = r + (rnd() - 0.5) * 0.22 + (pass ? 0.12 : 0);
    points.push(`${f(cx + Math.cos(a) * rr)},${f(cz + Math.sin(a) * rr)}`);
  }
  return `M${points.join("L")}`;
}

/** Cercle ou ellipse fait d'un seul geste, qui ne se referme pas tout à fait. */
function scribbleEllipse(cx: number, cz: number, rx: number, rz: number, seed: number): string {
  const rnd = random(seed);
  const start = rnd() * Math.PI * 2;
  const turn = Math.PI * 2 * 1.12;
  const steps = 28;
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = start + turn * t;
    const k = 1 + (rnd() - 0.5) * 0.06 + t * 0.08;
    points.push(`${f(cx + Math.cos(a) * rx * k)},${f(cz + Math.sin(a) * rz * k)}`);
  }
  return `M${points.join("L")}`;
}

// ——— Géométrie d'après level.ts ———

type Seg = { x0: number; z0: number; x1: number; z1: number; fence: boolean };

const ROOM_DOORS = (room: Room, shown: Set<string>) => DOORS.filter((d) => d.rooms.includes(room.id) && shown.has(d.id));

/** Côtés d'une pièce, percés aux portes connues. Les bords extérieurs deviennent des clôtures. */
function roomWalls(room: Room, shown: Set<string>, roomAtFn: (x: number, z: number) => Room | null): Seg[] {
  const doors = ROOM_DOORS(room, shown);
  const sides: { fixed: number; from: number; to: number; horizontal: boolean; out: number }[] = [
    { fixed: room.z0, from: room.x0, to: room.x1, horizontal: true, out: -1 },
    { fixed: room.z1, from: room.x0, to: room.x1, horizontal: true, out: 1 },
    { fixed: room.x0, from: room.z0, to: room.z1, horizontal: false, out: -1 },
    { fixed: room.x1, from: room.z0, to: room.z1, horizontal: false, out: 1 },
  ];
  const segs: Seg[] = [];
  for (const side of sides) {
    const gaps = doors
      .filter((d) => (side.horizontal ? d.axis === "x" && d.z === side.fixed : d.axis === "z" && d.x === side.fixed))
      .map((d) => {
        const c = side.horizontal ? d.x : d.z;
        return [c - d.width / 2, c + d.width / 2] as const;
      })
      .sort((a, b) => a[0] - b[0]);
    let cursor = side.from;
    const push = (a: number, b: number) => {
      if (b - a < 0.2) return;
      const mid = (a + b) / 2;
      const other = side.horizontal ? roomAtFn(mid, side.fixed + side.out * 0.4) : roomAtFn(side.fixed + side.out * 0.4, mid);
      const fence = Boolean(room.outdoor) && (!other || Boolean(other.outdoor));
      segs.push(side.horizontal ? { x0: a, z0: side.fixed, x1: b, z1: side.fixed, fence } : { x0: side.fixed, z0: a, x1: side.fixed, z1: b, fence });
    };
    for (const [g0, g1] of gaps) {
      push(cursor, Math.max(cursor, g0));
      cursor = Math.max(cursor, g1);
    }
    push(cursor, side.to);
  }
  return segs;
}

function roomAtLocal(rooms: Room[]) {
  return (x: number, z: number) => rooms.find((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) ?? null;
}

const isHub = (room: Room) => room.id === "hub";

// ——— Petits dessins ———

function Padlock({ x, z }: { x: number; z: number }) {
  return (
    <g transform={`translate(${x} ${z}) rotate(-8) scale(1.45)`} data-mark="lock">
      <path d="M-0.55,-0.25 L-0.55,-0.75 Q-0.55,-1.35 0,-1.35 Q0.55,-1.35 0.55,-0.75 L0.55,-0.25" fill="none" stroke={RUST} strokeWidth={0.26} strokeLinecap="round" />
      <rect x={-0.85} y={-0.35} width={1.7} height={1.35} rx={0.25} fill="#fff6e2" stroke={RUST} strokeWidth={0.26} />
      <circle cx={0} cy={0.25} r={0.17} fill={RUST} />
    </g>
  );
}

function NoteGlyph({ x, z, seed }: { x: number; z: number; seed: number }) {
  const tilt = (random(seed)() - 0.5) * 30;
  return (
    <g transform={`translate(${x} ${z}) rotate(${f(tilt)})`} data-mark="note">
      <path d="M-0.7,-0.9 L0.35,-0.9 L0.7,-0.55 L0.7,0.9 L-0.7,0.9 Z" fill="#fffaf0" stroke={INK} strokeWidth={0.16} strokeLinejoin="round" />
      <path d="M0.35,-0.9 L0.35,-0.55 L0.7,-0.55" fill="none" stroke={INK} strokeWidth={0.12} />
      <path d="M-0.42,-0.3 L0.42,-0.3 M-0.42,0.08 L0.42,0.08 M-0.42,0.46 L0.18,0.46" stroke="#466e8c" strokeWidth={0.1} strokeLinecap="round" />
    </g>
  );
}

function Player({ x, z, yaw }: { x: number; z: number; yaw: number }) {
  const deg = ((Math.PI - yaw) * 180) / Math.PI;
  return (
    <g transform={`translate(${f(x)} ${f(z)})`} data-mark="player" aria-label="Vous êtes ici">
      <circle r={2.1} fill="rgba(216,164,58,0.28)" stroke="rgba(185,135,34,0.7)" strokeWidth={0.14} strokeDasharray="0.5 0.4" />
      <g transform={`rotate(${f(deg)})`}>
        <path d="M0,-1.9 L1.25,1.15 L0,0.45 L-1.25,1.15 Z" fill="#d8a43a" stroke={INK} strokeWidth={0.26} strokeLinejoin="round" />
      </g>
    </g>
  );
}

function Compass({ x, z }: { x: number; z: number }) {
  return (
    <g transform={`translate(${x} ${z}) rotate(4)`} aria-hidden>
      <path d={sketchLine(0, 3.2, 0, -3.2, 0, 0.08, 0.1)} stroke={INK} strokeWidth={0.2} fill="none" strokeLinecap="round" />
      <path d={sketchLine(-2.2, 0, 2.2, 0, 0, 0.08, 0.1)} stroke={INK} strokeWidth={0.14} fill="none" strokeLinecap="round" opacity={0.7} />
      <path d="M0,-3.6 L0.9,-1.4 L0,-1.9 L-0.9,-1.4 Z" fill={INK} />
      <text y={-4.3} textAnchor="middle" fontSize={2.4} fill={INK} className={styles.planHand}>N</text>
    </g>
  );
}

// ——— Plan ———

interface View {
  zoom: number;
  cx: number;
  cz: number;
}

const HOME: View = { zoom: 1, cx: VB.x + VB.w / 2, cz: VB.z + VB.h / 2 };
/** Échelle maximale de la vue de départ, en pixels par mètre (au-delà, on perd le contexte). */
const AUTO_PPM = 7;

/**
 * Vue de départ : cadre les pièces connues, l'héroïne et l'objectif, selon la forme du cadre
 * (un téléphone en portrait zoome davantage). Le reste du plan se découvre en le faisant glisser.
 */
function fitView(plan: PlanModel, width: number, height: number): View {
  if (width <= 0 || height <= 0) return HOME;
  const pts: [number, number][] = [[plan.player.x, plan.player.z]];
  for (const r of plan.rooms) if (r.state !== "hint") pts.push([r.room.x0, r.room.z0], [r.room.x1, r.room.z1]);
  if (plan.objective) pts.push([plan.objective.x, plan.objective.z]);
  const pad = 5;
  const x0 = Math.min(...pts.map((p) => p[0])) - pad;
  const x1 = Math.max(...pts.map((p) => p[0])) + pad;
  const z0 = Math.min(...pts.map((p) => p[1])) - pad;
  const z1 = Math.max(...pts.map((p) => p[1])) + pad;
  const base = Math.min(width / VB.w, height / VB.h);
  const ppm = Math.min(width / (x1 - x0), height / (z1 - z0), AUTO_PPM);
  return clampView({ zoom: ppm / base, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 });
}

function clampView(v: View): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, v.zoom));
  const w = VB.w / zoom;
  const h = VB.h / zoom;
  const cx = Math.min(VB.x + VB.w - w / 2, Math.max(VB.x + w / 2, v.cx));
  const cz = Math.min(VB.z + VB.h - h / 2, Math.max(VB.z + h / 2, v.cz));
  return { zoom, cx, cz };
}

export function PlanSketch({ plan }: { plan: PlanModel }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>(HOME);
  /** Vrai tant qu'on n'a ni glissé ni zoomé : la vue suit alors la taille du cadre. */
  const auto = useRef(true);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const fit = () => {
      const rect = svg.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
      if (auto.current) setView(fitView(plan, rect.width, rect.height));
    };
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fit);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [plan]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const drawing = useMemo(() => {
    const shownRooms = plan.rooms.filter((r) => r.state !== "hint").map((r) => r.room);
    const shownDoors = new Set(plan.doors.map((d) => d.door.id));
    const atRoom = roomAtLocal(shownRooms.concat(plan.rooms.filter((r) => r.state === "hint").map((r) => r.room)));
    const walls: Seg[] = [];
    const arcs: string[] = [];
    for (const room of shownRooms) {
      if (isHub(room)) {
        const cx = (room.x0 + room.x1) / 2;
        const cz = (room.z0 + room.z1) / 2;
        const r = (room.x1 - room.x0) / 2;
        // Portes aux quatre points cardinaux : on laisse des trous dans le cercle.
        const doorAngles = ROOM_DOORS(room, shownDoors).map((d) => ({ a: Math.atan2(d.z - cz, d.x - cx), half: Math.asin(Math.min(0.9, d.width / 2 / r)) }));
        doorAngles.sort((p, q) => p.a - q.a);
        if (doorAngles.length === 0) arcs.push(sketchArc(cx, cz, r, 0, Math.PI * 2));
        for (let i = 0; i < doorAngles.length; i++) {
          const from = doorAngles[i].a + doorAngles[i].half;
          const next = doorAngles[(i + 1) % doorAngles.length];
          let to = next.a - next.half;
          if (to <= from) to += Math.PI * 2;
          arcs.push(sketchArc(cx, cz, r, from, to), sketchArc(cx, cz, r, from + 0.05, to - 0.04, 1));
        }
        continue;
      }
      walls.push(...roomWalls(room, shownDoors, atRoom));
    }
    return { walls, arcs };
  }, [plan]);

  // Molette (non passive pour garder la page immobile).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      auto.current = false;
      const at = toPlan(svg, e.clientX, e.clientY, view);
      setView((v) => zoomAround(v, v.zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2), at));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [view]);

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    auto.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom };
    }
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !svgRef.current) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);
    const scale = pixelsPerMeter(svgRef.current, view);
    if (pointers.current.size === 1) {
      setView((v) => clampView({ ...v, cx: v.cx - (next.x - prev.x) / scale, cz: v.cz - (next.y - prev.y) / scale }));
    } else if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const target = pinch.current.zoom * (dist / Math.max(1, pinch.current.dist));
      const at = toPlan(svgRef.current, (a.x + b.x) / 2, (a.y + b.y) / 2, view);
      setView((v) => zoomAround(v, target, at));
    }
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const w = VB.w / view.zoom;
  const h = VB.h / view.zoom;
  const viewBox = `${f(view.cx - w / 2)} ${f(view.cz - h / 2)} ${f(w)} ${f(h)}`;
  const { player, objective } = plan;
  // Partie du plan réellement à l'écran (le cadre n'a pas forcément la forme du plan).
  const ppm = size.width > 0 ? view.zoom * Math.min(size.width / VB.w, size.height / VB.h) : 0;
  const seen = (x0: number, z0: number, x1: number, z1: number) =>
    ppm > 0 && Math.abs((x0 + x1) / 2 - view.cx) * 2 + (x1 - x0) <= size.width / ppm && Math.abs((z0 + z1) / 2 - view.cz) * 2 + (z1 - z0) <= size.height / ppm;

  return (
    <div className={styles.planFrame}>
      <svg
        ref={svgRef}
        className={styles.planSvg}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Plan de l'étage 1"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-zoom={f(view.zoom)}
      >
        <defs>
          <pattern id="plan-hatch" patternUnits="userSpaceOnUse" width={1.1} height={1.1} patternTransform="rotate(38)">
            <line x1={0} y1={0} x2={0} y2={1.1} stroke={INK} strokeWidth={0.12} opacity={0.32} />
          </pattern>
          <pattern id="plan-hatch-here" patternUnits="userSpaceOnUse" width={0.9} height={0.9} patternTransform="rotate(-42)">
            <line x1={0} y1={0} x2={0} y2={0.9} stroke="#9a6a14" strokeWidth={0.14} opacity={0.5} />
          </pattern>
          <pattern id="plan-dots" patternUnits="userSpaceOnUse" width={2.3} height={2.1}>
            <circle cx={0.4} cy={0.5} r={0.11} fill={INK} opacity={0.38} />
            <circle cx={1.6} cy={1.5} r={0.09} fill={INK} opacity={0.3} />
            <circle cx={1.9} cy={0.3} r={0.07} fill={INK} opacity={0.25} />
          </pattern>
        </defs>

        {/* Cartouche et rose des vents dans les coins vides du plan */}
        {seen(-36, 34, -21, 46.5) ? <g aria-hidden>
          <text x={-35} y={38.5} fontSize={3.4} fill={INK} className={styles.planTitle} transform="rotate(-3 -35 38.5)">SILLO 8</text>
          <text x={-35} y={42} fontSize={2.3} fill={INK} className={styles.planHand} transform="rotate(-3 -35 42)">étage 1 · relevé à la main</text>
          <path d={sketchLine(-34.5, 44.6, -24.5, 44.6, 0, 0.08, 0.15)} stroke={INK} strokeWidth={0.22} fill="none" strokeLinecap="round" />
          <path d="M-34.5,44 L-34.5,45.2 M-29.5,44.2 L-29.5,45 M-24.5,44 L-24.5,45.2" stroke={INK} strokeWidth={0.18} strokeLinecap="round" />
          <text x={-23.4} y={45.4} fontSize={1.8} fill={INK} className={styles.planHand}>10 m</text>
        </g> : null}
        {seen(41, -20, 47, -10) ? <Compass x={44} z={-14} /> : null}

        {/* Lavis et hachures des pièces connues, contours pointillés des voisines */}
        {plan.rooms.map((r) => <RoomFill key={r.room.id} r={r} />)}

        {/* Murs à l'encre (deux passes de plume) */}
        <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {drawing.walls.map((s, i) =>
            s.fence ? (
              <path key={`f${i}`} d={sketchLine(s.x0, s.z0, s.x1, s.z1, 0, 0.2, 0)} strokeWidth={0.22} strokeDasharray="0.9 0.55" opacity={0.75} />
            ) : (
              <g key={`w${i}`}>
                <path d={sketchLine(s.x0, s.z0, s.x1, s.z1)} strokeWidth={0.5} />
                <path d={sketchLine(s.x0, s.z0, s.x1, s.z1, 1)} strokeWidth={0.16} opacity={0.6} />
              </g>
            ),
          )}
          {drawing.arcs.map((d, i) => <path key={`a${i}`} d={d} strokeWidth={i % 2 ? 0.16 : 0.5} opacity={i % 2 ? 0.6 : 1} />)}
        </g>

        {/* Portes : battant au crayon, ou barre et cadenas si verrouillée */}
        {plan.doors.map(({ door, locked }) => <DoorMark key={door.id} door={door} locked={locked} />)}

        {/* Noms des pièces */}
        {plan.rooms.map((r) => <RoomLabel key={r.room.id} r={r} player={player} />)}

        {plan.notes.map((n) => <NoteGlyph key={n.id} x={n.x} z={n.z} seed={seedOf(n.x, n.z)} />)}

        {objective ? (
          <g data-mark="objective" aria-label={`Objectif : ${objective.label}`} fill="none" stroke={RED} strokeLinecap="round">
            {objective.room ? (
              <path d={scribbleEllipse(objective.x, objective.z, 8.6, 8.6, 7)} strokeWidth={0.4} />
            ) : (
              <>
                <path d={sketchLine(objective.x - 1.1, objective.z - 1.1, objective.x + 1.1, objective.z + 1.1, 0, 0.1, 0.15)} strokeWidth={0.48} />
                <path d={sketchLine(objective.x + 1.1, objective.z - 1.1, objective.x - 1.1, objective.z + 1.1, 0, 0.1, 0.15)} strokeWidth={0.48} />
                <path d={scribbleEllipse(objective.x, objective.z, 2.6, 2.3, seedOf(objective.x, objective.z))} strokeWidth={0.26} opacity={0.85} />
              </>
            )}
          </g>
        ) : null}

        <Player x={player.x} z={player.z} yaw={player.yaw} />
      </svg>
      <div className={styles.planZoom} onPointerDown={() => { auto.current = false; }}>
        <button type="button" aria-label="Zoomer" onClick={() => setView((v) => clampView({ ...v, zoom: v.zoom * 1.5 }))} disabled={view.zoom >= MAX_ZOOM}>+</button>
        <button type="button" aria-label="Dézoomer" onClick={() => setView((v) => clampView({ ...v, zoom: v.zoom / 1.5 }))} disabled={view.zoom <= 1}>−</button>
        <button type="button" aria-label="Centrer sur moi" onClick={() => setView(clampView({ zoom: Math.max(view.zoom, 2.2), cx: player.x, cz: player.z }))}>
          <svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" /><circle cx="12" cy="12" r="2.2" fill="currentColor" /><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );
}

function RoomFill({ r }: { r: PlanRoom }) {
  const { room, state } = r;
  const hub = isHub(room);
  const cx = (room.x0 + room.x1) / 2;
  const cz = (room.z0 + room.z1) / 2;
  const shape = (props: Record<string, unknown>) =>
    hub ? <circle cx={cx} cy={cz} r={(room.x1 - room.x0) / 2} {...props} /> : <rect x={room.x0} y={room.z0} width={room.x1 - room.x0} height={room.z1 - room.z0} {...props} />;
  if (state === "hint") {
    return (
      <g data-room={room.id} data-state={state} aria-hidden>
        {shape({ fill: "none", stroke: INK, strokeWidth: 0.2, strokeDasharray: "0.7 0.8", opacity: 0.5 })}
      </g>
    );
  }
  const wash = state === "current" ? "rgba(216,164,58,0.3)" : room.outdoor ? "rgba(150,120,70,0.07)" : "rgba(185,135,34,0.09)";
  const texture = room.outdoor ? "url(#plan-dots)" : state === "current" ? "url(#plan-hatch-here)" : "url(#plan-hatch)";
  return (
    <g data-room={room.id} data-state={state}>
      {shape({ fill: wash })}
      {shape({ fill: texture })}
    </g>
  );
}

function RoomLabel({ r, player }: { r: PlanRoom; player: { x: number; z: number } }) {
  const { room, state, name } = r;
  const cx = (room.x0 + room.x1) / 2;
  const cz = (room.z0 + room.z1) / 2;
  const w = room.x1 - room.x0;
  const h = room.z1 - room.z0;
  if (state === "hint") {
    return <text x={cx} y={cz + 1} textAnchor="middle" fontSize={3.4} fill={INK} opacity={0.42} className={styles.planHand} aria-hidden>?</text>;
  }
  const vertical = w < 6 && h > w;
  const span = (vertical ? h : w) - 1.5;
  const size = Math.min(3.4, (span / Math.max(name.length, 3)) * 1.85, vertical ? w * 0.75 : h * 0.4);
  const tilt = vertical ? -90 : ((seedOf(cx, cz) % 7) - 3) * 0.8;
  if (size < 1.7) return null; // trop étroit pour y écrire
  // Le nom s'écarte de la flèche de l'héroïne quand elle se tient au milieu de la pièce.
  const near = !vertical && Math.abs(player.x - cx) < size * name.length * 0.3 + 1.5 && Math.abs(player.z - cz) < size + 1.5;
  const dz = near ? (player.z >= cz ? -1 : 1) * (size + 1.2) : 0;
  return (
    <text
      x={cx}
      y={cz + dz}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={f(size)}
      fill={INK}
      transform={`rotate(${f(tilt)} ${cx} ${cz + dz})`}
      className={state === "current" ? styles.planTitle : styles.planHand}
      data-label={room.id}
    >
      {name}
    </text>
  );
}

function DoorMark({ door, locked }: { door: Door; locked: boolean }) {
  if (door.open) return null;
  const half = door.width / 2;
  const along = door.axis === "x" ? [1, 0] : [0, 1];
  const a = { x: door.x - along[0] * half, z: door.z - along[1] * half };
  const b = { x: door.x + along[0] * half, z: door.z + along[1] * half };
  if (locked) {
    return (
      <g data-door={door.id} data-locked="true">
        <path d={sketchLine(a.x, a.z, b.x, b.z, 0, 0.06, 0)} stroke={RUST} strokeWidth={0.36} fill="none" strokeLinecap="round" />
        <Padlock x={door.x} z={door.z} />
      </g>
    );
  }
  // Battant d'architecte : un quart de cercle depuis le gond.
  const r = door.width;
  const sweep = door.axis === "x" ? `M${a.x},${a.z} L${a.x},${a.z - r} A${r} ${r} 0 0 1 ${b.x},${b.z}` : `M${a.x},${a.z} L${a.x + r},${a.z} A${r} ${r} 0 0 1 ${b.x},${b.z}`;
  return (
    <g data-door={door.id} aria-hidden>
      <path d={sweep} fill="none" stroke={INK} strokeWidth={0.1} opacity={0.5} />
    </g>
  );
}

function pixelsPerMeter(svg: SVGSVGElement, view: View): number {
  const rect = svg.getBoundingClientRect();
  return Math.min(rect.width / (VB.w / view.zoom), rect.height / (VB.h / view.zoom)) || 1;
}

function toPlan(svg: SVGSVGElement, clientX: number, clientY: number, view: View): { x: number; z: number } {
  const rect = svg.getBoundingClientRect();
  const scale = pixelsPerMeter(svg, view);
  return { x: view.cx + (clientX - rect.left - rect.width / 2) / scale, z: view.cz + (clientY - rect.top - rect.height / 2) / scale };
}

/** Zoome en gardant le point `at` sous le doigt (ou le curseur). */
function zoomAround(v: View, zoom: number, at: { x: number; z: number }): View {
  const next = Math.min(MAX_ZOOM, Math.max(1, zoom));
  const k = v.zoom / next;
  return clampView({ zoom: next, cx: at.x + (v.cx - at.x) * k, cz: at.z + (v.cz - at.z) * k });
}
