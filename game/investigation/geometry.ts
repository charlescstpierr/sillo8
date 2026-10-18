// Géométrie pure de l'enquête : cône de la lampe UV et placement de la bulle de pensée à l'écran.
import type { Point, TraceShape } from "./types";

/** Lampe UV : portée (m), demi-angle du cône (radians), charge consommée par seconde (la lampe blanche n'en consomme pas ; éblouir coûte 15). */
export const UV = { range: 9, halfAngle: (30 * Math.PI) / 180, drain: 3.2, minEnergy: 4, revealTime: 0.45 } as const;

/** Points représentatifs d'une trace (tous les ~0,6 m le long d'un trajet). */
export function tracePoints(shape: TraceShape): Point[] {
  switch (shape.kind) {
    case "none": return [[shape.x, shape.z]];
    case "stamp": return [[shape.x, shape.z]];
    default: {
      const out: Point[] = [];
      const pts = shape.points;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i];
        const [bx, bz] = pts[i + 1];
        const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.6));
        for (let s = 0; s < steps; s++) out.push([ax + ((bx - ax) * s) / steps, az + ((bz - az) * s) / steps]);
      }
      if (pts.length) out.push(pts[pts.length - 1]);
      return out;
    }
  }
}

/** Le point (px, pz) est-il dans le cône de la lampe tenue en (x, z), tournée vers `yaw` (0 = +Z) ? */
export function inCone(x: number, z: number, yaw: number, px: number, pz: number, range: number = UV.range, halfAngle: number = UV.halfAngle): boolean {
  const dx = px - x;
  const dz = pz - z;
  const d = Math.hypot(dx, dz);
  if (d > range) return false;
  if (d < 0.6) return true;
  let diff = Math.atan2(dx, dz) - yaw;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  return Math.abs(diff) <= halfAngle;
}

/** Part (0 → 1) des points de la trace éclairés. */
export function litFraction(points: readonly Point[], x: number, z: number, yaw: number): number {
  if (points.length === 0) return 0;
  let lit = 0;
  for (const [px, pz] of points) if (inCone(x, z, yaw, px, pz)) lit++;
  return lit / points.length;
}

// ——— Bulle de pensée ———

export interface Rect { x: number; y: number; w: number; h: number }

export const overlaps = (a: Rect, b: Rect, gap = 0) =>
  a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

function overlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

export type BubbleSide = "above" | "below" | "left" | "right";

/**
 * Place la bulle (w × h) près de la tête de Lou (hx, hy) sans chevaucher les obstacles (rail de vie,
 * objectifs, commandes tactiles, bulles du tutoriel) et dans l'écran. Essaie au-dessus, puis décalée,
 * puis sur les côtés, puis dessous ; à défaut, la place qui chevauche le moins.
 */
export function placeBubble(hx: number, hy: number, w: number, h: number, viewW: number, viewH: number, obstacles: readonly Rect[], margin = 8): { x: number; y: number; side: BubbleSide } {
  const gap = 14;
  const candidates: { x: number; y: number; side: BubbleSide }[] = [];
  const above = hy - gap - h;
  for (const shift of [0, -0.3, 0.3, -0.6, 0.6, -0.9, 0.9]) candidates.push({ x: hx - w / 2 + shift * w, y: above, side: "above" });
  for (const lift of [0, -0.6, 0.6]) {
    candidates.push({ x: hx + 26, y: hy - h / 2 + lift * h, side: "right" });
    candidates.push({ x: hx - 26 - w, y: hy - h / 2 + lift * h, side: "left" });
  }
  for (const shift of [0, -0.4, 0.4]) candidates.push({ x: hx - w / 2 + shift * w, y: hy + 100, side: "below" });
  let best = candidates[0];
  let bestCost = Infinity;
  for (const c of candidates) {
    const clamped = {
      ...c,
      x: Math.min(Math.max(c.x, margin), viewW - w - margin),
      y: Math.min(Math.max(c.y, margin), viewH - h - margin),
    };
    const rect = { x: clamped.x, y: clamped.y, w, h };
    let cost = 0;
    for (const o of obstacles) cost += overlapArea(rect, { x: o.x - 4, y: o.y - 4, w: o.w + 8, h: o.h + 8 });
    // Petite pénalité quand la bulle s'éloigne de la tête.
    cost += Math.hypot(clamped.x + w / 2 - hx, clamped.y + h / 2 - hy) * 0.01;
    if (cost < bestCost) {
      bestCost = cost;
      best = clamped;
    }
    if (cost < 5) break;
  }
  return best;
}
