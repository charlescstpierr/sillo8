// Décor de l'extérieur de SILLO 8, étage 1 : sentier d'entrée, façade du bunker, place barricadée,
// et zone extérieure (épaves, rochers, arbres, camp de survivants). Style « jouet en pâte » : formes rondes,
// couleurs terreuses passées, rouille et herbes folles. Lumières chaudes ponctuelles sous la lune.
import {
  AdditiveBlending, BoxGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, DoubleSide, Group, Mesh,
  MeshBasicMaterial, PlaneGeometry, SphereGeometry, TorusGeometry, type Material, type Object3D,
} from "three";
import type { DecorContext, ModelBuilder, WorldView } from "../world";
import { onWorldRefresh } from "../world";
import { decorateStory } from "../storyProps";
import type { SiloState } from "../../state";
import { PALETTE } from "../palette";
import { glow, toon } from "../toon";
import { block, can, cable, crate, cylinder, decal, grass, hazardStrip, mesh, overgrowth, panel, rubble, signBoard } from "../props";
import {
  blobTexture, dirtTexture, extFlowersTexture, extHaloTexture, extRustPlateTexture, extTrailTexture, hazardTexture,
  paperTexture, rng, signTexture,
} from "../textures";

// Palette du personnage (moutarde, olive, cuir, crème) et teintes passées des épaves.
const C = {
  mustard: "#d8a43a",
  olive: "#6b7550",
  oliveDark: "#556045",
  oliveLight: "#7d8a52",
  leather: "#6a4528",
  leatherLight: "#7a4a2a",
  cream: "#e9dcc0",
  charcoal: "#2e2925",
  rock: "#8b8574",
  rockDark: "#7a7465",
  burlap: "#bfa77a",
  glass: "#3a4a4c",
  tire: "#2e2925",
  bark: "#6a4528",
  warm: "#ffd9a0",
  ember: "#ff9a52",
} as const;

const geometries = new Map<string, unknown>();
function geo<T>(key: string, build: () => T): T {
  if (!geometries.has(key)) geometries.set(key, build());
  return geometries.get(key) as T;
}
const sphere = () => geo("ext-sphere", () => new SphereGeometry(1, 12, 9));
const rock = () => geo("ext-rock", () => new DodecahedronGeometry(1, 0));
const plane = () => geo("ext-plane", () => new PlaneGeometry(1, 1));

/** Obstacle aligné sur les axes, pour un rectangle tourné de `rot` (demi-largeurs locales). */
function solid(ctx: DecorContext, x: number, z: number, hw: number, hd: number, rot = 0, shrink = 0.9): void {
  const c = Math.abs(Math.cos(rot));
  const s = Math.abs(Math.sin(rot));
  const ex = (c * hw + s * hd) * shrink;
  const ez = (s * hw + c * hd) * shrink;
  ctx.colliders.push({ minX: x - ex, maxX: x + ex, minZ: z - ez, maxZ: z + ez });
}

function blob(parent: Object3D, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number): Mesh {
  const m = mesh(sphere(), toon(color), x, y, z);
  m.scale.set(sx, sy, sz);
  parent.add(m);
  return m;
}

/** Flaque de lumière additive au sol (fausse lumière, couleur modifiable). */
function halo(parent: Object3D, x: number, z: number, size: number, color: string, opacity: number, y = 0.03): MeshBasicMaterial {
  const material = new MeshBasicMaterial({ map: extHaloTexture(), color, transparent: true, opacity, depthWrite: false, blending: AdditiveBlending });
  const m = new Mesh(plane(), material);
  m.position.set(x, y, z);
  m.rotation.x = -Math.PI / 2;
  m.scale.set(size, size, 1);
  m.renderOrder = 2;
  parent.add(m);
  return material;
}

/** Bande de sentier entre deux points. */
function trail(parent: Object3D, ax: number, az: number, bx: number, bz: number, width: number): void {
  const length = Math.hypot(bx - ax, bz - az);
  const texture = extTrailTexture().clone();
  texture.needsUpdate = true;
  texture.repeat.set(1, length / 3.5);
  decal(parent, texture, (ax + bx) / 2, (az + bz) / 2, width, length + width * 0.4, Math.atan2(bx - ax, bz - az), 0.009);
}

/** Pierres plates le long d'un sentier. */
function stones(parent: Object3D, ax: number, az: number, bx: number, bz: number, half: number, count: number, seed: number): void {
  const r = rng(seed);
  const length = Math.hypot(bx - ax, bz - az);
  const nx = -(bz - az) / length, nz = (bx - ax) / length;
  for (let i = 0; i < count; i++) {
    const t = r();
    const side = r() > 0.5 ? 1 : -1;
    const off = side * (half + (r() - 0.3) * 0.5);
    const size = 0.12 + r() * 0.2;
    const m = mesh(rock(), toon(r() > 0.5 ? "#9a937f" : C.rockDark), ax + (bx - ax) * t + nx * off, size * 0.25, az + (bz - az) * t + nz * off);
    m.scale.set(size * 1.3, size * 0.5, size);
    m.rotation.y = r() * 3;
    parent.add(m);
  }
}

/** Touffe de fleurs sauvages sur deux plans croisés. */
function flowers(parent: Object3D, x: number, z: number, size: number, seed: number): void {
  const material = toon("#ffffff", { map: extFlowersTexture(1 + (seed % 4)), alphaTest: 0.5, side: DoubleSide, rim: 0 });
  for (const angle of [0.7 + seed, 0.7 + seed + Math.PI / 2]) {
    const m = mesh(plane(), material, x, size / 2 - 0.02, z, false);
    m.rotation.y = angle;
    m.scale.set(size, size, 1);
    parent.add(m);
  }
}

/** Végétation éparse dans un rectangle, en évitant les zones dégagées. */
function scatter(parent: Object3D, x0: number, x1: number, z0: number, z1: number, count: number, seed: number, avoid: (x: number, z: number) => boolean): void {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = x0 + r() * (x1 - x0);
    const z = z0 + r() * (z1 - z0);
    const roll = r();
    if (avoid(x, z)) continue;
    if (roll < 0.5) grass(parent, x, z, 0.45 + r() * 0.5);
    else if (roll < 0.8) flowers(parent, x, z, 0.4 + r() * 0.25, i);
    else overgrowth(parent, x, z, 0.6 + r() * 0.4, seed + i);
  }
}

// ——— Végétation et rochers ———

function boulder(ctx: DecorContext, x: number, z: number, size: number, seed: number): void {
  const r = rng(seed);
  const main = blob(ctx.root, r() > 0.5 ? C.rock : C.rockDark, x, size * 0.5, z, size * 1.15, size * 0.8, size);
  main.rotation.y = r() * 3;
  blob(ctx.root, C.rockDark, x + size * 0.8, size * 0.25, z + size * 0.35, size * 0.5, size * 0.4, size * 0.45);
  // Mousse sur le dessus, comme un bonnet.
  blob(ctx.root, C.olive, x - size * 0.1, size * 1.05, z - size * 0.1, size * 0.75, size * 0.22, size * 0.65);
  grass(ctx.root, x - size * 0.9, z + size * 0.6, 0.6);
  grass(ctx.root, x + size * 0.4, z + size * 0.9, 0.5);
  solid(ctx, x + size * 0.15, z, size * 1.15, size * 0.95, 0, 1);
}

function tree(ctx: DecorContext, x: number, z: number, s: number, seed: number): void {
  const r = rng(seed);
  const trunk = mesh(geo("ext-trunk", () => new CylinderGeometry(0.17, 0.28, 1.4, 8)), toon(C.bark), x, 0.7 * s, z);
  trunk.scale.setScalar(s);
  trunk.rotation.z = (r() - 0.5) * 0.15;
  ctx.root.add(trunk);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + r();
    const root = blob(ctx.root, C.bark, x + Math.cos(a) * 0.25 * s, 0.05, z + Math.sin(a) * 0.25 * s, 0.22 * s, 0.12 * s, 0.12 * s);
    root.rotation.y = -a;
  }
  // Houppier rond en trois boules, la plus claire au sommet.
  const tones = [C.oliveDark, C.olive, C.oliveLight];
  const puffs: [number, number, number, number][] = [[-0.45, 1.75, 0.15, 0.85], [0.5, 1.8, -0.1, 0.8], [0, 2.3, 0, 0.95]];
  puffs.forEach(([px, py, pz, pr], i) => blob(ctx.root, tones[i], x + px * s, py * s, z + pz * s, pr * s, pr * s * 0.9, pr * s));
  blob(ctx.root, "#8e9a5c", x + 0.1 * s, 2.65 * s, z + 0.25 * s, 0.45 * s, 0.3 * s, 0.4 * s);
  solid(ctx, x, z, 0.32 * s, 0.32 * s, 0, 1);
}

function deadTree(ctx: DecorContext, x: number, z: number, seed: number): void {
  const r = rng(seed);
  const trunk = mesh(geo("ext-dead", () => new CylinderGeometry(0.1, 0.22, 2.2, 7)), toon("#7a6a58"), x, 1.1, z);
  trunk.rotation.z = 0.08;
  ctx.root.add(trunk);
  const branch = geo("ext-branch", () => new CylinderGeometry(0.03, 0.07, 0.9, 5));
  for (let i = 0; i < 4; i++) {
    const m = mesh(branch, toon("#7a6a58"), x + (r() - 0.5) * 0.3, 1.3 + i * 0.25, z + (r() - 0.5) * 0.3);
    m.rotation.set((r() - 0.5) * 1.6, r() * 3, 0.6 + r() * 0.6 * (i % 2 ? 1 : -1));
    ctx.root.add(m);
  }
  overgrowth(ctx.root, x, z, 0.7, seed);
  solid(ctx, x, z, 0.25, 0.25, 0, 1);
}

function bush(parent: Object3D, x: number, z: number, size: number, seed: number): void {
  const r = rng(seed);
  const tones = [C.oliveDark, C.olive, C.oliveLight];
  for (let i = 0; i < 4; i++) {
    const s = size * (0.45 + r() * 0.35);
    blob(parent, tones[i % 3], x + (r() - 0.5) * size, s * 0.7, z + (r() - 0.5) * size * 0.8, s, s * 0.85, s);
  }
  if (r() > 0.5) for (let i = 0; i < 5; i++) blob(parent, i % 2 ? PALETTE.fabric : C.cream, x + (r() - 0.5) * size, size * 0.75 + r() * 0.2, z + (r() - 0.2) * size * 0.6, 0.05, 0.05, 0.05);
}

// ——— Épaves ———

function wheel(parent: Object3D, x: number, z: number, radius: number, width: number, flat: number): void {
  const w = new Group();
  w.position.set(x, radius * flat, z);
  w.scale.y = flat;
  const tire = mesh(geo(`ext-tire:${radius}:${width}`, () => new CylinderGeometry(radius, radius, width, 14)), toon(C.tire), 0, 0, 0);
  tire.rotation.z = Math.PI / 2;
  w.add(tire);
  const hub = mesh(geo(`ext-hub:${radius}`, () => new CylinderGeometry(radius * 0.45, radius * 0.45, width + 0.04, 10)), toon("#b9a27a"), 0, 0, 0);
  hub.rotation.z = Math.PI / 2;
  w.add(hub);
  parent.add(w);
}

/** Plaques de rouille sur les flancs. */
function rustPatches(parent: Object3D, half: number, y0: number, y1: number, length: number, seed: number, count = 4): void {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const side = r() > 0.5 ? 1 : -1;
    const s = 0.12 + r() * 0.2;
    blob(parent, r() > 0.5 ? PALETTE.rust : C.leatherLight, side * half, y0 + r() * (y1 - y0), (r() - 0.5) * length, 0.03, s, s * 1.4);
  }
}

/** Herbes qui ont poussé autour d'une épave. */
function weeds(parent: Object3D, hw: number, hd: number, seed: number): void {
  const r = rng(seed);
  for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2;
    grass(parent, Math.cos(a) * (hw + 0.1), Math.sin(a) * (hd + 0.1), 0.5 + r() * 0.4);
  }
}

/** Petite voiture bombée, rouge passé, pneus à plat. */
function car(ctx: DecorContext, x: number, z: number, rot: number): void {
  const g = new Group();
  g.position.set(x, 0, z);
  g.rotation.set(0, rot, 0.04);
  const body = "#b8644e";
  for (const [wx, wz, flat] of [[-0.85, 1.15, 0.7], [0.85, 1.15, 1], [-0.85, -1.15, 0.65], [0.85, -1.15, 0.95]]) wheel(g, wx, wz, 0.36, 0.28, flat);
  block(g, 1.8, 0.62, 3.5, body, 0, 0.26, 0, 0.28);
  block(g, 1.6, 0.34, 1.94, C.glass, 0, 0.86, -0.2, 0.14);
  block(g, 1.52, 0.62, 1.86, body, 0, 0.84, -0.2, 0.3).scale.y = 0.95;
  block(g, 1.56, 0.12, 1.5, C.cream, 0, 1.44, -0.2, 0.06);
  for (const s of [-1, 1]) block(g, 1.86, 0.18, 0.2, "#9a9a8c", 0, 0.3, s * 1.76, 0.08);
  blob(g, C.cream, -0.55, 0.66, 1.75, 0.13, 0.13, 0.06);
  blob(g, C.charcoal, 0.55, 0.66, 1.75, 0.13, 0.13, 0.06);
  rustPatches(g, 0.91, 0.35, 0.8, 3, 11, 6);
  // Capot entrouvert, lierre sur le toit.
  const hood = block(g, 1.5, 0.06, 0.9, body, 0, 0.88, 1.15, 0.03);
  hood.rotation.x = -0.35;
  blob(g, C.olive, 0.3, 1.5, -0.6, 0.35, 0.12, 0.4);
  blob(g, C.oliveLight, -0.3, 1.5, 0.1, 0.25, 0.1, 0.3);
  weeds(g, 0.9, 1.8, 12);
  ctx.root.add(g);
  solid(ctx, x, z, 0.95, 1.8, rot);
}

/** Camion bâché militaire olive, bâche déchirée, une roue à plat. */
function truck(ctx: DecorContext, x: number, z: number, rot: number): void {
  const g = new Group();
  g.position.set(x, 0, z);
  g.rotation.set(0, rot, -0.05);
  const body = "#7d8160";
  for (const [wx, wz, flat] of [[-1, 2.1, 1], [1, 2.1, 0.68], [-1, -0.6, 1], [1, -0.6, 1], [-1, -1.7, 0.7], [1, -1.7, 1]]) wheel(g, wx, wz, 0.46, 0.34, flat);
  block(g, 1.9, 0.32, 5.0, C.charcoal, 0, 0.42, 0, 0.06);
  // Cabine et capot arrondis.
  block(g, 2.04, 0.46, 1.64, C.glass, 0, 1.2, 1.55, 0.16);
  block(g, 2.0, 1.3, 1.6, body, 0, 0.7, 1.55, 0.32);
  block(g, 1.9, 0.75, 1.0, body, 0, 0.62, 2.75, 0.3);
  block(g, 1.4, 0.4, 0.08, C.charcoal, 0, 0.75, 3.26, 0.03);
  for (const s of [-1, 1]) blob(g, s < 0 ? C.cream : C.charcoal, s * 0.7, 1.05, 3.24, 0.14, 0.14, 0.06);
  for (const s of [-1, 1]) panel(g, signTexture("S-8", { bg: "rgba(0,0,0,0)", fg: "rgba(233,220,192,0.85)", width: 256, height: 128 }), s * 1.01, 1.25, 1.55, 0.7, 0.35, s * Math.PI / 2);
  // Plateau et bâche en demi-cylindre, affaissée et trouée.
  block(g, 2.1, 0.25, 2.9, PALETTE.woodDark, 0, 0.62, -0.95, 0.04);
  const tarp = mesh(geo("ext-tarp", () => new CylinderGeometry(1.02, 1.02, 2.8, 14, 1, true, -Math.PI / 2, Math.PI)), toon(C.oliveDark, { side: DoubleSide }), 0, 0.87, -0.95);
  tarp.rotation.x = -Math.PI / 2;
  tarp.scale.set(1, 1, 0.82);
  g.add(tarp);
  for (const zz of [-2.3, -0.95, 0.4]) {
    const hoop = mesh(geo("ext-hoop", () => new TorusGeometry(1.03, 0.04, 5, 14, Math.PI)), toon(C.charcoal), 0, 0.87, -0.95 + (zz + 0.95) * 0.98);
    hoop.scale.y = 0.82;
    g.add(hoop);
  }
  blob(g, C.charcoal, 0.55, 1.55, -1.4, 0.32, 0.12, 0.42);
  blob(g, C.olive, -0.4, 1.68, -0.3, 0.45, 0.14, 0.5);
  rustPatches(g, 1.01, 0.8, 1.7, 1.2, 21, 4);
  weeds(g, 1.1, 2.6, 22);
  ctx.root.add(g);
  solid(ctx, x, z, 1.1, 2.55, rot);
}

/** Pick-up moutarde passée, hayon tombé, benne pleine de ferraille. */
function pickup(ctx: DecorContext, x: number, z: number, rot: number): void {
  const g = new Group();
  g.position.set(x, 0, z);
  g.rotation.set(0, rot, 0.05);
  const body = "#c99a45";
  for (const [wx, wz, flat] of [[-0.9, 1.35, 1], [0.9, 1.35, 1], [-0.9, -1.3, 0.62], [0.9, -1.3, 1]]) wheel(g, wx, wz, 0.4, 0.3, flat);
  block(g, 1.9, 0.62, 4.2, body, 0, 0.32, 0, 0.26);
  block(g, 1.84, 0.38, 1.44, C.glass, 0, 0.98, 0.45, 0.14);
  block(g, 1.78, 0.72, 1.38, body, 0, 0.92, 0.45, 0.28);
  block(g, 1.6, 0.18, 1.1, body, 0, 0.92, 1.55, 0.08);
  for (const s of [-1, 1]) block(g, 0.12, 0.42, 1.9, body, s * 0.88, 0.92, -1.1, 0.05);
  block(g, 1.94, 0.18, 0.2, "#9a9a8c", 0, 0.38, 2.12, 0.08);
  blob(g, C.cream, -0.6, 0.72, 2.1, 0.13, 0.13, 0.06);
  blob(g, C.cream, 0.6, 0.72, 2.1, 0.13, 0.13, 0.06);
  rustPatches(g, 0.96, 0.4, 0.85, 3.6, 31, 6);
  // Ferraille dans la benne.
  scrapPile(g, 0, -1.1, 41, 0.8, 0.92);
  // Hayon tombé au sol, derrière.
  const gate = block(g, 1.7, 0.08, 0.45, body, 0, 0, -2.45, 0.03);
  gate.rotation.x = 0.15;
  weeds(g, 1, 2.1, 32);
  ctx.root.add(g);
  solid(ctx, x, z, 0.95, 2.15, rot);
}

/** Caravane crème écrasée, couchée de biais, fenêtre condamnée. */
function trailer(ctx: DecorContext, x: number, z: number, rot: number): void {
  const g = new Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  const tilt = new Group();
  tilt.position.set(1.1, 0, 0);
  tilt.rotation.set(0.05, 0, -1.22);
  g.add(tilt);
  const box = new Group();
  box.position.set(-1.1, 0, 0);
  tilt.add(box);
  block(box, 2.2, 1.9, 3.8, C.cream, 0, 0.3, 0, 0.5);
  block(box, 2.24, 0.22, 3.84, C.mustard, 0, 0.95, 0, 0.1);
  block(box, 2.26, 0.1, 3.86, C.leatherLight, 0, 1.25, 0, 0.04);
  for (const s of [-1, 1]) {
    block(box, 0.06, 0.55, 0.9, C.glass, s * 1.1, 1.35, 0.8, 0.12);
    // Planches clouées en travers de la fenêtre.
    for (const a of [0.5, -0.4]) {
      const plank = block(box, 0.08, 0.12, 1.1, PALETTE.wood, s * 1.13, 1.55, 0.8, 0.02);
      plank.rotation.x = a;
    }
  }
  block(box, 0.08, 1.2, 0.7, C.leather, 1.1, 0.4, -0.9, 0.05);
  wheel(box, -1.1, 0.2, 0.36, 0.26, 1);
  blob(box, C.charcoal, 1.12, 1.0, 0.2, 0.05, 0.35, 0.5);
  blob(box, PALETTE.rust, -1.12, 0.6, -1.2, 0.05, 0.3, 0.45);
  // Timon planté dans le sol.
  const hitch = cylinder(box, 0.06, 1.1, C.charcoal, 0, 0.2, 2.35, 6);
  hitch.rotation.x = Math.PI / 2 + 0.3;
  ctx.root.add(g);
  const tufts = new Group();
  tufts.position.x = 2.2;
  g.add(tufts);
  weeds(tufts, 1.2, 2.0, 52);
  solid(ctx, x + 2.2, z, 1.3, 1.95, rot);
}

/** Tas de ferraille : tôles tordues, tuyaux, pneu, engrenage. */
function scrapPile(parent: Object3D, x: number, z: number, seed: number, scale = 1, y = 0): void {
  const r = rng(seed);
  const g = new Group();
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  for (let i = 0; i < 5; i++) {
    const sheet = block(g, 0.5 + r() * 0.4, 0.04, 0.35 + r() * 0.3, r() > 0.5 ? PALETTE.steel : PALETTE.rust, (r() - 0.5) * 0.7, 0.05 + i * 0.05, (r() - 0.5) * 0.6, 0.02);
    sheet.rotation.set((r() - 0.5) * 0.8, r() * 3, (r() - 0.5) * 0.8);
  }
  for (let i = 0; i < 3; i++) {
    const pipe = cylinder(g, 0.04, 0.7, r() > 0.5 ? PALETTE.steelDark : PALETTE.rustLight, (r() - 0.5) * 0.6, 0.1, (r() - 0.5) * 0.6, 7);
    pipe.rotation.set(Math.PI / 2, 0, r() * 3);
  }
  const tire = mesh(geo("ext-tire-flat", () => new TorusGeometry(0.22, 0.09, 6, 12)), toon(C.tire), 0.35, 0.09, 0.2);
  tire.rotation.x = Math.PI / 2;
  g.add(tire);
  const gear = cylinder(g, 0.13, 0.05, PALETTE.amber, -0.25, 0.3, 0.05, 8);
  gear.rotation.x = 0.6;
  parent.add(g);
}

// ——— Place d'entrée ———

/** Mur de sacs de sable sur trois rangées, le long de X. */
function sandbags(ctx: DecorContext, x0: number, x1: number, z: number): void {
  const tones = [C.burlap, "#b09868", "#c9b48a"];
  const count = Math.round((x1 - x0) / 0.6);
  for (let row = 0; row < 3; row++) {
    const n = count - row;
    for (let i = 0; i < n; i++) {
      const x = x0 + 0.3 + row * 0.3 + i * ((x1 - x0 - 0.6 - row * 0.6) / Math.max(1, n - 1));
      const bag = block(ctx.root, 0.6, 0.26, 0.4, tones[(i + row) % 3], x, row * 0.24, z + (row % 2) * 0.04, 0.12);
      bag.rotation.y = ((i * 7 + row * 3) % 5 - 2) * 0.05;
    }
  }
  solid(ctx, (x0 + x1) / 2, z, (x1 - x0) / 2, 0.3, 0, 1);
}

/** Lanterne de survivant (verre ambré, anse). Renvoie son matériau lumineux. */
function lantern(parent: Object3D, x: number, y: number, z: number): MeshBasicMaterial {
  const g = new Group();
  g.position.set(x, y, z);
  cylinder(g, 0.1, 0.05, C.charcoal, 0, 0, 0, 10);
  const light = new MeshBasicMaterial({ color: "#ffc870" });
  g.add(mesh(geo("ext-lantern-glass", () => new CylinderGeometry(0.075, 0.075, 0.2, 10)), light, 0, 0.15, 0, false));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    cylinder(g, 0.012, 0.2, C.charcoal, Math.cos(a) * 0.085, 0.05, Math.sin(a) * 0.085, 4);
  }
  g.add(mesh(geo("ext-lantern-cap", () => new ConeGeometry(0.11, 0.1, 10)), toon(C.charcoal), 0, 0.3, 0));
  const handle = mesh(geo("ext-lantern-handle", () => new TorusGeometry(0.07, 0.012, 4, 10, Math.PI)), toon(C.charcoal), 0, 0.34, 0);
  g.add(handle);
  parent.add(g);
  return light;
}

/** Projecteur sur poteau, orienté vers (tx, tz). Renvoie le matériau de la lentille. */
function floodlight(ctx: DecorContext, x: number, z: number, tx: number, tz: number, height = 3.4): MeshBasicMaterial {
  block(ctx.root, 0.45, 0.25, 0.45, PALETTE.concreteDark, x, 0, z, 0.06);
  cylinder(ctx.root, 0.07, height, PALETTE.steelDark, x, 0.2, z, 8);
  cable(ctx.root, x + 0.1, z + 0.05, height * 0.7);
  const head = new Group();
  head.position.set(x, height + 0.1, z);
  head.rotation.y = Math.atan2(tx - x, tz - z);
  const pitch = new Group();
  pitch.rotation.x = 0.55;
  head.add(pitch);
  block(pitch, 0.7, 0.48, 0.38, "#3b4248", 0, -0.24, 0, 0.1);
  const lens = new MeshBasicMaterial({ color: C.warm });
  pitch.add(mesh(geo("ext-lens", () => new BoxGeometry(0.56, 0.34, 0.04)), lens, 0, 0, 0.2, false));
  for (let i = 0; i < 3; i++) block(pitch, 0.6, 0.03, 0.05, C.charcoal, 0, -0.13 + i * 0.1, 0.22, 0.01);
  ctx.root.add(head);
  solid(ctx, x, z, 0.25, 0.25, 0, 1);
  return lens;
}

/** Panneau d'avertissement sur deux piquets. */
function warning(parent: Object3D, text: string, x: number, z: number, facing: number, tilt = 0): void {
  const g = new Group();
  g.position.set(x, 0, z);
  g.rotation.set(0, facing, tilt);
  for (const s of [-1, 1]) block(g, 0.08, 1.5, 0.08, PALETTE.woodDark, s * 0.62, 0, -0.03, 0.02);
  block(g, 1.62, 0.9, 0.05, C.charcoal, 0, 0.7, -0.06, 0.02);
  signBoard(g, text, 0, 1.15, 0, 1.55, 0.82, 0, { bg: PALETTE.yellow, fg: C.charcoal, border: C.charcoal });
  parent.add(g);
}

/** Chevaux de frise en bois rayé et fil barbelé. */
function barricade(ctx: DecorContext, x: number, z: number, rot: number): void {
  const g = new Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  for (const s of [-1, 1]) {
    for (const a of [-0.45, 0.45]) {
      const leg = block(g, 0.1, 1.0, 0.1, PALETTE.woodDark, s * 1.1, 0, 0, 0.02);
      leg.rotation.x = a;
    }
  }
  const stripes = hazardTexture().clone();
  stripes.needsUpdate = true;
  stripes.repeat.set(3, 1);
  for (const y of [0.55, 0.85]) {
    block(g, 2.6, 0.2, 0.06, PALETTE.yellow, 0, y, 0.05, 0.03);
    panel(g, stripes, 0, y + 0.1, 0.09, 2.5, 0.16, 0);
  }
  const wire = geo("ext-wire", () => new TorusGeometry(0.22, 0.012, 4, 14));
  for (let i = 0; i < 6; i++) {
    const coil = mesh(wire, toon(PALETTE.steelDark), -1.2 + i * 0.48, 1.15, 0);
    coil.rotation.y = Math.PI / 2;
    g.add(coil);
  }
  ctx.root.add(g);
  solid(ctx, x, z, 1.35, 0.4, rot, 1);
}

/** Barrière de contrôle tombée sur le chemin (la guérite, elle, tient encore debout près de la porte). */
function fallenBarrier(ctx: DecorContext, x: number, z: number): void {
  block(ctx.root, 0.3, 0.9, 0.3, C.oliveDark, x - 0.1, 0, z - 1.05, 0.04);
  solid(ctx, x - 0.1, z - 1.05, 0.3, 0.3, 0, 1);
  const arm = new Group();
  arm.position.set(x - 0.1, 0.08, z - 1.05);
  arm.rotation.set(0, 0.1, Math.PI / 2);
  for (let i = 0; i < 5; i++) cylinder(arm, 0.06, 0.44, i % 2 ? C.cream : PALETTE.danger, 0, i * 0.44, 0, 8);
  ctx.root.add(arm);
  rubble(ctx.root, x + 0.6, z - 0.4, 5, 77, 0.4);
}

/** Bidons rouillés. */
function barrels(ctx: DecorContext, x: number, z: number, seed: number): void {
  const r = rng(seed);
  const tones = [PALETTE.rust, C.olive, "#3f6f7a"];
  for (let i = 0; i < 2; i++) {
    const bx = x + i * 0.62, bz = z + (r() - 0.5) * 0.3;
    const drum = cylinder(ctx.root, 0.3, 0.85, tones[(seed + i) % 3], bx, 0, bz, 14);
    drum.rotation.z = (r() - 0.5) * 0.08;
    for (const y of [0.22, 0.6]) cylinder(ctx.root, 0.315, 0.04, C.charcoal, bx, y, bz, 14);
    blob(ctx.root, PALETTE.rust, bx + 0.29, 0.45, bz, 0.03, 0.15, 0.12);
  }
  const fallen = cylinder(ctx.root, 0.3, 0.85, PALETTE.rustLight, x + 0.4, -0.13, z + 0.75, 14);
  fallen.rotation.set(0, 0.6, Math.PI / 2);
  fallen.position.y = 0.3;
  solid(ctx, x + 0.4, z + 0.3, 0.75, 0.75, 0, 1);
}

// ——— Façade du bunker ———

interface FacadeView {
  lamps: MeshBasicMaterial;
  halo: MeshBasicMaterial;
  signDark: Mesh;
  signLit: Mesh;
  bulbs: MeshBasicMaterial;
  powered: boolean;
}
let facade: FacadeView | null = null;
let panelLight: MeshBasicMaterial | null = null;

function facadeHook(_view: WorldView, state: SiloState): void {
  const powered = state.has("generator_powered");
  if (panelLight) panelLight.color.set(powered ? "#7fe08a" : "#5a1e16");
  if (!facade) return;
  facade.powered = powered;
  facade.signDark.visible = !powered;
  facade.signLit.visible = powered;
  facade.bulbs.color.set(powered ? "#ffe2a6" : "#4a3626");
  facade.halo.color.set(powered ? C.warm : PALETTE.danger);
  facade.halo.opacity = powered ? 0.55 : 0.12;
  if (powered) facade.lamps.color.set(C.warm);
}

function bunkerFacade(ctx: DecorContext): void {
  const root = ctx.root;
  // Ailes de béton de part et d'autre de la porte, couronnées de la tranche colorée.
  for (const s of [-1, 1]) {
    const x0 = 2.47, x1 = 7;
    const cx = s * (x0 + x1) / 2;
    block(root, x1 - x0, 2.3, 0.85, PALETTE.concrete, cx, 0, 22.5, 0.08);
    block(root, x1 - x0 + 0.04, 0.12, 0.93, PALETTE.wallCap, cx, 2.3, 22.5, 0.03);
    block(root, x1 - x0 + 0.02, 0.42, 0.9, PALETTE.wainscot, cx, 0, 22.5, 0.04);
    hazardStrip(root, cx, 23.1, x1 - x0, 0.22);
    // Coulures, fissures et lierre sur le béton.
    for (let i = 0; i < 3; i++) block(root, 0.08, 0.6 + i * 0.25, 0.02, "#7d8576", cx + s * (i - 1) * 1.2, 1.2 - i * 0.2, 22.93, 0.01);
    for (let i = 0; i < 4; i++) blob(root, i % 2 ? C.olive : C.oliveDark, cx + (i - 1.5) * 0.9, 2.3 - (i % 2) * 0.35, 22.95, 0.35, 0.28 + (i % 2) * 0.2, 0.08);
    sandbags(ctx, s < 0 ? -5.6 : 2.7, s < 0 ? -2.7 : 5.6, 23.65);
    solid(ctx, cx, 22.5, (x1 - x0) / 2, 0.45, 0, 1);
  }
  // Encadrement massif de la porte.
  for (const s of [-1, 1]) {
    block(root, 0.85, 3.0, 1.0, PALETTE.concreteDark, s * 2.05, 0, 22.5, 0.1);
    block(root, 0.9, 0.14, 1.04, PALETTE.yellow, s * 2.05, 1.75, 22.5, 0.03);
    solid(ctx, s * 2.05, 22.5, 0.43, 0.5, 0, 1);
  }
  block(root, 5.0, 0.55, 1.05, PALETTE.concrete, 0, 2.55, 22.5, 0.1);
  block(root, 5.04, 0.08, 1.09, PALETTE.wallCap, 0, 3.08, 22.5, 0.02);
  // Enseigne rouillée « SILLO 8 » (éteinte / rétroéclairée selon le courant).
  block(root, 2.9, 0.95, 0.12, C.charcoal, 0, 2.95, 23.0, 0.04);
  const signDark = panel(root, extRustPlateTexture("SILLO 8"), 0, 3.42, 23.07, 2.75, 0.86, 0);
  const signLit = panel(root, extRustPlateTexture("SILLO 8", true), 0, 3.42, 23.07, 2.75, 0.86, 0, true);
  signLit.visible = false;
  for (const s of [-1, 1]) cylinder(root, 0.025, 0.4, C.charcoal, s * 1.2, 3.85, 23.0, 5);
  // Ampoules autour de l'enseigne.
  const bulbs = new MeshBasicMaterial({ color: "#4a3626" });
  const bulbGeo = geo("ext-bulb", () => new SphereGeometry(0.05, 8, 6));
  for (let i = 0; i < 9; i++) root.add(mesh(bulbGeo, bulbs, -1.4 + i * 0.35, 3.92, 23.1, false));
  // Lampes grillagées sur les montants : rouge nerveux avant le courant, chaud après.
  const lamps = new MeshBasicMaterial({ color: "#5a1e16" });
  for (const s of [-1, 1]) {
    block(root, 0.3, 0.3, 0.2, C.charcoal, s * 2.05, 2.05, 23.02, 0.05);
    root.add(mesh(geo("ext-cage-lamp", () => new SphereGeometry(0.11, 10, 8)), lamps, s * 2.05, 2.2, 23.16, false));
    const cage = mesh(geo("ext-cage", () => new TorusGeometry(0.12, 0.012, 4, 10)), toon(C.charcoal), s * 2.05, 2.2, 23.2);
    root.add(cage);
  }
  const glowMat = halo(root, 0, 24.2, 5, PALETTE.danger, 0.12);
  facade = { lamps, halo: glowMat, signDark, signLit, bulbs, powered: false };
  onWorldRefresh(facadeHook);
  const view = facade;
  ctx.animate((_dt, time) => {
    if (view.powered) return;
    const blink = Math.sin(time * 2.2) > 0.6 && Math.sin(time * 37) > -0.3;
    view.lamps.color.set(blink ? PALETTE.danger : "#5a1e16");
  });
  // Papiers envolés et gravats tombés de la façade.
  const r = rng(808);
  for (let i = 0; i < 7; i++) decal(root, paperTexture(1 + (i % 4)), -5 + r() * 10, 24.3 + r() * 4, 0.22, 0.28, r() * 6, 0.02).renderOrder = 2;
  rubble(root, -2.6, 24.6, 5, 809, 0.35);
  rubble(root, 6.6, 24.4, 6, 810, 0.4);
  overgrowth(root, -6.3, 23.4, 0.9, 81);
  overgrowth(root, 6.4, 23.5, 0.8, 82);
}

// ——— Camp de survivants ———

function satchel(parent: Object3D, x: number, z: number, rot: number): void {
  const g = new Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  block(g, 0.44, 0.32, 0.18, C.leather, 0, 0, 0, 0.07);
  block(g, 0.45, 0.17, 0.2, C.leatherLight, 0, 0.17, 0.01, 0.05);
  block(g, 0.09, 0.08, 0.03, C.cream, 0, 0.15, 0.11, 0.015);
  const strap = mesh(geo("ext-strap", () => new TorusGeometry(0.32, 0.02, 4, 16)), toon(C.leather), 0.15, 0.02, -0.25);
  strap.rotation.x = Math.PI / 2;
  strap.scale.y = 0.6;
  g.add(strap);
  parent.add(g);
}

function toolbox(parent: Object3D, x: number, z: number, rot: number): void {
  const g = new Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  block(g, 0.55, 0.22, 0.26, PALETTE.fabric, 0, 0, 0, 0.04);
  block(g, 0.57, 0.06, 0.28, "#a8473a", 0, 0.22, 0, 0.02);
  const handle = mesh(geo("ext-handle", () => new TorusGeometry(0.1, 0.02, 4, 10, Math.PI)), toon(C.charcoal), 0, 0.28, 0);
  g.add(handle);
  // Clé à molette posée dessus.
  block(g, 0.32, 0.03, 0.05, PALETTE.steel, 0.05, 0.3, 0.06, 0.01).rotation.y = 0.4;
  parent.add(g);
}

function campfire(ctx: DecorContext, x: number, z: number): void {
  const root = ctx.root;
  decal(root, blobTexture("scorch"), x, z, 1.8, 1.8, 0.4, 0.013);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const m = mesh(rock(), toon(i % 2 ? C.rock : C.rockDark), x + Math.cos(a) * 0.55, 0.08, z + Math.sin(a) * 0.55);
    m.scale.set(0.16, 0.12, 0.14);
    m.rotation.y = a;
    root.add(m);
  }
  for (let i = 0; i < 3; i++) {
    const log = cylinder(root, 0.07, 0.75, C.bark, x, 0.05, z, 7);
    log.rotation.set(Math.PI / 2 - 0.5, (i / 3) * Math.PI * 2, 0);
    log.position.y = 0.18;
  }
  const flames = new Group();
  flames.position.set(x, 0.12, z);
  const outer = mesh(geo("ext-flame", () => new ConeGeometry(0.28, 0.75, 8)), glow(C.ember), 0, 0.37, 0, false);
  const inner = mesh(geo("ext-flame-in", () => new ConeGeometry(0.16, 0.5, 8)), glow("#ffd27a"), 0.03, 0.27, 0.02, false);
  flames.add(outer, inner);
  root.add(flames);
  halo(root, x, z, 5.5, C.ember, 0.45);
  ctx.animate((_dt, time) => {
    outer.scale.set(1 + Math.sin(time * 11) * 0.08, 1 + Math.sin(time * 7.3) * 0.18, 1 + Math.cos(time * 9) * 0.08);
    inner.scale.y = 1 + Math.sin(time * 13 + 1) * 0.22;
    outer.rotation.y = time * 0.8;
  });
  // Bûches pour s'asseoir, marmite et conserves.
  for (const [lx, lz, rot] of [[-1.5, 0.7, 0.4], [1.5, 0.9, -0.3]]) {
    const seat = cylinder(root, 0.2, 1.1, C.bark, x + lx, 0, z + lz, 9);
    seat.rotation.set(0, rot, Math.PI / 2);
    seat.position.y = 0.2;
  }
  cylinder(root, 0.16, 0.2, C.charcoal, x + 0.85, 0, z - 0.45, 10);
  can(root, x + 1.1, z - 0.2, PALETTE.rustLight);
  can(root, x + 1.2, z + 0.05, C.mustard, true);
  can(root, x - 0.9, z + 1.1, "#9a9a8c", true);
  solid(ctx, x, z, 0.55, 0.55, 0, 1);
}

function camp(ctx: DecorContext, x: number, z: number): void {
  const root = ctx.root;
  campfire(ctx, x, z);
  // Bâche moutarde tendue entre deux perches, nouée à des piquets.
  const tz = z - 2.2;
  for (const s of [-1, 1]) cylinder(root, 0.05, 1.6, PALETTE.woodDark, x + s * 1.4, 0, tz, 6);
  const tarp = block(root, 3.1, 0.04, 2.4, C.mustard, x, 0.93, tz - 1.0, 0.02);
  tarp.rotation.x = -0.5;
  block(root, 3.12, 0.05, 0.12, C.leatherLight, x, 1.5, tz + 0.02, 0.02);
  for (const s of [-1, 1]) {
    cylinder(root, 0.03, 0.25, PALETTE.woodDark, x + s * 1.45, 0, tz - 2.3, 5);
    const rope = cylinder(root, 0.01, 0.5, C.cream, x + s * 1.45, 0.12, tz - 2.15, 4);
    rope.rotation.x = -0.9;
  }
  // Couchage, sacoche en cuir, caisses, boîte à outils, lanterne.
  const bedroll = mesh(geo("ext-bedroll", () => new CylinderGeometry(0.2, 0.2, 1.4, 12)), toon(C.olive), x - 0.4, 0.2, tz - 0.6);
  bedroll.rotation.z = Math.PI / 2;
  root.add(bedroll);
  block(root, 1.3, 0.06, 0.7, C.cream, x - 0.4, 0, tz - 0.6, 0.03);
  satchel(root, x - 1.15, z + 0.05, 0.5);
  crate(root, x + 2.4, z - 1.2, 0.6, 0.2);
  crate(root, x + 2.45, z - 1.2, 0.45, 0.6, 0.6);
  crate(root, x + 2.6, z - 0.4, 0.5, -0.3);
  panel(root, signTexture("CLOUS", { bg: C.cream, fg: C.charcoal, width: 128, height: 64 }), x + 2.6, 0.3, z - 0.13, 0.3, 0.14, 0);
  toolbox(root, x + 1.9, z + 0.7, 0.3);
  // Bandages et piles sur une caisse.
  cylinder(root, 0.07, 0.1, C.cream, x + 2.45, 1.05, z - 1.25, 10);
  for (let i = 0; i < 3; i++) cylinder(root, 0.03, 0.1, i % 2 ? C.mustard : C.charcoal, x + 2.3 + i * 0.07, 1.05, z - 1.05, 6);
  lantern(root, x + 1.4, 1.42, tz + 0.12);
  halo(root, x + 1.2, tz + 0.3, 2.4, "#ffc870", 0.3);
  solid(ctx, x, tz - 1.0, 1.55, 1.1, 0, 1);
  solid(ctx, x + 2.5, z - 0.8, 0.5, 0.75, 0, 1);
  ctx.light(x, 0.9, z, C.ember, 8, 9, 0.45, 31, false);
  ctx.light(x + 1.4, 1.5, tz + 0.2, "#ffc870", 4, 5, 0.12, 32, false);
  ctx.dust(x, 2, z);
}

/** Clôture de piquets cassée : poteaux penchés, lisses manquantes, une tombée au sol. */
function fence(parent: Object3D, x0: number, x1: number, z: number, seed: number): void {
  const r = rng(seed);
  const step = 1.6;
  const n = Math.floor((x1 - x0) / step);
  for (let i = 0; i <= n; i++) {
    if (r() < 0.15) continue;
    const post = block(parent, 0.14, 1.0, 0.14, PALETTE.woodDark, x0 + i * step, 0, z, 0.03);
    post.rotation.set((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.35);
    if (i === n) break;
    for (const y of [0.4, 0.8]) {
      if (r() < 0.3) continue;
      const rail = block(parent, step, 0.09, 0.06, PALETTE.wood, x0 + i * step + step / 2, y, z + 0.06, 0.02);
      rail.rotation.z = (r() - 0.5) * 0.12;
    }
    if (r() < 0.25) {
      const fallen = block(parent, step, 0.06, 0.09, PALETTE.wood, x0 + i * step + step / 2, 0, z + 0.5, 0.02);
      fallen.rotation.y = (r() - 0.5) * 0.6;
    }
  }
}

// ——— Assemblage ———

export function decorateExterior(ctx: DecorContext): void {
  const root = ctx.root;
  bunkerFacade(ctx);

  // Sentiers : allée principale vers la porte, embranchements vers la génératrice, la zone extérieure et la serre.
  trail(root, 0, 46, 0, 23.4, 3.4);
  stones(root, 0, 45.5, 0, 24, 1.8, 26, 5);
  trail(root, -1.5, 28.6, -11, 27, 2.2);
  trail(root, 1.5, 36.6, 13, 35.4, 2.4);
  trail(root, 13, 35.4, 26, 35.8, 2.4);
  trail(root, 26, 35.8, 34, 31.5, 2);
  trail(root, 34, 31.5, 41, 28.6, 1.8);
  trail(root, 21, 22.6, 22.5, 35.5, 2);
  stones(root, 13, 35.4, 26, 35.8, 1.3, 12, 6);

  // Place d'entrée.
  ctx.light(-5.6, 3.4, 25.0, C.warm, 10, 12, 0.08, 21, false);
  floodlight(ctx, -6.3, 24.1, 0, 23);
  ctx.beam(-5.4, 3.3, 25.2, 1.0, C.warm);
  halo(root, -2.5, 26, 6, C.warm, 0.25);
  ctx.light(7.6, 3.4, 26.6, "#ffe6b8", 8, 10, 0.85, 22, false);
  const nervousLens = floodlight(ctx, 8.2, 26.2, 1.5, 24);
  const nervousHalo = halo(root, 5.5, 25.5, 5, "#ffe6b8", 0.22);
  ctx.animate((_dt, time) => {
    // Même rythme que la lampe ponctuelle (graine 22, très nerveuse).
    const cut = Math.sin(time * 1.7 + 22 * 11) > 0.93 - 0.085 && Math.sin(time * 41 + 22) > 0;
    const level = cut ? 0.15 : 0.85 + Math.sin(time * 9 + 154) * 0.08;
    nervousLens.color.set("#ffe6b8").multiplyScalar(0.35 + level * 0.65);
    nervousHalo.opacity = 0.22 * level;
  });
  ctx.dust(0, 2.5, 25);

  barricade(ctx, -5.2, 31.6, 0.35);
  fallenBarrier(ctx, 5.0, 32.4);
  warning(root, "ZONE\nCONTAMINÉE", -3.3, 29.8, 0.15);
  warning(root, "ZONE\nCONTAMINÉE", 11.0, 38.2, -0.5, 0.12);
  barrels(ctx, 7.4, 35.6, 1);
  // Lanterne de chemin sur une perche en crochet, et une autre posée sur les sacs.
  block(root, 0.07, 1.5, 0.07, PALETTE.woodDark, -2.7, 0, 36.2, 0.02);
  block(root, 0.4, 0.06, 0.06, PALETTE.woodDark, -2.55, 1.48, 36.2, 0.02);
  lantern(root, -2.38, 1.08, 36.2);
  halo(root, -2.4, 36.3, 2.2, "#ffc870", 0.3);
  lantern(root, -3.3, 0.72, 23.6);
  lantern(root, 4.9, 0.72, 23.6);
  tree(ctx, -9.3, 34.2, 1.1, 1);
  tree(ctx, -8.8, 44.0, 1.25, 2);
  tree(ctx, 9.8, 44.6, 1.0, 3);
  deadTree(ctx, 10.4, 29.4, 4);
  boulder(ctx, -9.4, 39.6, 1.0, 5);
  boulder(ctx, 5.9, 44.7, 0.75, 6);
  boulder(ctx, -4.8, 45.1, 0.55, 7);
  bush(root, -7.2, 41.8, 1.1, 8);
  bush(root, 3.6, 45.2, 0.9, 9);
  bush(root, -10.1, 30.6, 0.9, 10);
  bush(root, 9.2, 33.2, 0.8, 11);
  decal(root, blobTexture("puddle"), 3.9, 30.6, 1.6, 1.1, 0.3, 0.012);
  decal(root, dirtTexture(2), 3.9, 30.6, 2.4, 1.8, 0.3, 0.01);
  scatter(root, -10.5, 11.5, 24, 45.5, 70, 900, (x, z) =>
    Math.abs(x) < 2 || (x < -6 && z > 24.5 && z < 29.8) || Math.hypot(x + 6, z - 36) < 1 || Math.hypot(x - 8, z - 39) < 1 || (Math.abs(x) < 7.2 && z < 24.6)
    // Parvis, guérite, dalle de la porte de service (narration par le décor).
    || (Math.abs(x) < 3.5 && z < 26.5) || (x > 4.3 && x < 7.6 && z < 28) || (x < -8.4 && z > 25.6 && z < 30));
  decorateStory(ctx, "exterior");

  // Zone extérieure.
  truck(ctx, 44.3, 26.0, 0.25);
  car(ctx, 34.5, 25.6, 1.2);
  pickup(ctx, 16.8, 42.2, -0.5);
  trailer(ctx, 43.4, 42.6, 0.2);
  scrapPile(root, 41.4, 23.5, 61);
  scrapPile(root, 36.9, 27.9, 62, 0.9);
  scrapPile(root, 46.6, 38.6, 63, 0.8);
  scrapPile(root, 14.3, 39.6, 64, 0.7);
  camp(ctx, 21.5, 40.8);
  boulder(ctx, 27.2, 44.0, 1.3, 71);
  boulder(ctx, 29.6, 24.8, 1.0, 72);
  boulder(ctx, 14.3, 24.6, 0.9, 73);
  boulder(ctx, 47.0, 34.6, 0.85, 74);
  boulder(ctx, 36.4, 37.6, 0.75, 75);
  boulder(ctx, 38.6, 45.0, 0.55, 76);
  tree(ctx, 31.0, 42.4, 1.2, 81);
  tree(ctx, 47.0, 30.0, 1.0, 82);
  tree(ctx, 25.6, 24.4, 1.15, 83);
  tree(ctx, 13.4, 31.0, 0.95, 84);
  deadTree(ctx, 39.2, 23.7, 85);
  for (const [bx, bz, bs, seed] of [[24.3, 45.1, 1, 91], [33.6, 44.6, 0.9, 92], [17.2, 23.3, 0.9, 93], [28.6, 27.9, 0.8, 94], [46.9, 32.2, 0.8, 95], [42.4, 45.2, 1, 96], [12.8, 27.5, 0.8, 97], [35.5, 23.2, 0.9, 98]]) bush(root, bx, bz, bs, seed);
  fence(root, 28.6, 38.2, 45.3, 99);
  warning(root, "ZONE\nCONTAMINÉE", 14.6, 27.8, -0.3, -0.1);
  decal(root, blobTexture("puddle"), 31.0, 34.0, 2.8, 1.9, 0.6, 0.012);
  decal(root, dirtTexture(3), 31.0, 34.0, 4, 3, 0.6, 0.01);
  decal(root, blobTexture("rust"), 44.0, 27.5, 3, 2, 0.2, 0.011);
  decal(root, blobTexture("rust"), 34.4, 26.2, 2.2, 1.6, 1.0, 0.011);
  ctx.dust(30, 2, 34);
  scatter(root, 12.5, 47.5, 23, 45.5, 120, 901, (x, z) =>
    (x > 18.5 && x < 23.5 && z < 26) || Math.hypot(x - 25, z - 35) < 1 || Math.hypot(x - 41, z - 28) < 1 || Math.hypot(x - 21.5, z - 40.8) < 1.2 || Math.hypot(x - 40.1, z - 29.05) < 0.9);
}

// ——— Objets interactifs ———

/** Boîtier de commande de la porte de sécurité : voyant rouge mort, câble jusqu'au montant. */
function securityPanel(def: Parameters<ModelBuilder>[0]): { group: Group; height: number } {
  const g = new Group();
  g.position.set(def.x, 0, def.z);
  const px = 2.05, pz = -0.05;
  block(g, 0.14, 0.85, 0.14, PALETTE.steelDark, px, 0, pz, 0.03);
  block(g, 0.56, 0.52, 0.24, C.olive, px, 0.78, pz, 0.07);
  block(g, 0.44, 0.3, 0.04, C.cream, px, 0.86, pz + 0.12, 0.02);
  for (let i = 0; i < 6; i++) block(g, 0.08, 0.06, 0.03, C.charcoal, px - 0.12 + (i % 3) * 0.12, 0.9 + Math.floor(i / 3) * 0.1, pz + 0.145, 0.01);
  block(g, 0.6, 0.06, 0.28, C.mustard, px, 1.3, pz, 0.02);
  const light = new MeshBasicMaterial({ color: "#5a1e16" });
  panelLight = light;
  g.add(mesh(geo("ext-panel-led", () => new SphereGeometry(0.06, 10, 8)), light as Material, px, 1.22, pz + 0.13, false));
  // Câble au sol vers le montant de la porte.
  const wire = mesh(geo("ext-panel-wire", () => new CylinderGeometry(0.025, 0.025, 0.9, 5)), toon(C.charcoal), px - 0.3, 0.03, pz - 0.5);
  wire.rotation.set(Math.PI / 2, 0, 0.6);
  g.add(wire);
  return { group: g, height: 1.5 };
}

/** Modèles des objets interactifs propres à cette zone, par identifiant (voir game/level.ts). */
export const EXTERIOR_MODELS: Record<string, ModelBuilder> = {
  security_door: securityPanel,
};
