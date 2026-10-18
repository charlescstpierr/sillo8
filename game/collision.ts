// Collisions du plan : un cercle (joueur, robot) contre des boîtes alignées sur les axes.

export interface Box { minX: number; maxX: number; minZ: number; maxZ: number; }

/** Repousse un cercle hors des boîtes qu'il chevauche. Retourne la position corrigée. */
export function resolveCircle(x: number, z: number, radius: number, boxes: readonly Box[]): { x: number; z: number } {
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const box of boxes) {
      if (x + radius <= box.minX || x - radius >= box.maxX || z + radius <= box.minZ || z - radius >= box.maxZ) continue;
      const cx = Math.max(box.minX, Math.min(x, box.maxX));
      const cz = Math.max(box.minZ, Math.min(z, box.maxZ));
      const dx = x - cx;
      const dz = z - cz;
      const distSq = dx * dx + dz * dz;
      if (distSq >= radius * radius) continue;
      if (distSq > 1e-10) {
        const dist = Math.sqrt(distSq);
        const push = radius - dist;
        x += (dx / dist) * push;
        z += (dz / dist) * push;
      } else {
        // Centre à l'intérieur : sortie par l'axe le moins pénétré.
        const left = x - box.minX + radius;
        const right = box.maxX - x + radius;
        const down = z - box.minZ + radius;
        const up = box.maxZ - z + radius;
        const least = Math.min(left, right, down, up);
        if (least === left) x -= left;
        else if (least === right) x += right;
        else if (least === down) z -= down;
        else z += up;
      }
      moved = true;
    }
    if (!moved) break;
  }
  return { x, z };
}

/** Déplace un cercle par petits pas pour ne jamais traverser un mur fin. */
export function moveCircle(x: number, z: number, dx: number, dz: number, radius: number, boxes: readonly Box[]): { x: number; z: number } {
  const distance = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(distance / (radius * 0.5)));
  let px = x;
  let pz = z;
  for (let i = 0; i < steps; i++) {
    const next = resolveCircle(px + dx / steps, pz + dz / steps, radius, boxes);
    px = next.x;
    pz = next.z;
  }
  return { x: px, z: pz };
}

/** Segment [a, b] libre de toute boîte (ligne de vue sur le plan). */
export function segmentClear(ax: number, az: number, bx: number, bz: number, boxes: readonly Box[]): boolean {
  for (const box of boxes) {
    let t0 = 0;
    let t1 = 1;
    const dx = bx - ax;
    const dz = bz - az;
    const clip = (p: number, q: number) => {
      if (Math.abs(p) < 1e-12) return q >= 0;
      const r = q / p;
      if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
      else { if (r < t0) return false; if (r < t1) t1 = r; }
      return true;
    };
    if (clip(-dx, ax - box.minX) && clip(dx, box.maxX - ax) && clip(-dz, az - box.minZ) && clip(dz, box.maxZ - az)) return false;
  }
  return true;
}
