// Décor de l'aile ouest de SILLO 8, étage 1 : couloir ouest, dortoirs (et pièce cachée), entrepôt,
// cafétéria, génératrice. Style « jouet en pâte » : formes rondes et trapues, moutarde, olive, cuir, crème.
import {
  AdditiveBlending, CylinderGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SphereGeometry,
  TorusGeometry, Vector3, type Material, type Object3D,
} from "three";
import type { DecorContext, ModelBuilder, WorldView } from "../world";
import { onWorldRefresh, ruin } from "../world";
import type { SiloState } from "../../state";
import { glow, toon } from "../toon";
import { PALETTE } from "../palette";
import {
  block, can, crate, cylinder, decal, hazardStrip, mesh, overgrowth, panel, rubble, signBoard, stringLights,
} from "../props";
import {
  blobTexture, drawingTexture, paperTexture, rng, signTexture, sprayTexture, westBoardTexture, westFlourTexture,
  westGlowTexture, westKnitTexture, westMapTexture, westMuralTexture, westScratchTexture,
} from "../textures";

/** Teintes de la fiche personnage (moutarde, olive, cuir, crème, charbon). */
const C = {
  mustard: "#d8a43a",
  mustardDark: "#b8862a",
  olive: "#6b7550",
  oliveDark: "#556045",
  leather: "#6a4528",
  leatherLight: "#7a4a2a",
  cream: "#e9dcc0",
  charcoal: "#3a3633",
  brick: "#b5523b",
  wood: "#b07a48",
  cardboard: "#c49a64",
  teal: "#4f8a8b",
} as const;

const KNITS: [string, string][] = [
  [C.mustard, C.cream], [C.olive, C.mustard], [C.brick, C.cream], [C.cream, C.olive], [C.teal, C.cream], [C.leatherLight, C.mustard],
];

// ——— Petites briques locales ———

const geometries = new Map<string, any>();
function geo<T>(key: string, build: () => T): T {
  if (!geometries.has(key)) geometries.set(key, build());
  return geometries.get(key);
}

function knit(a: string, b: string): Material {
  return toon("#ffffff", { map: westKnitTexture(a, b) });
}

function group(parent: Object3D, x: number, z: number, rotation = 0, y = 0): Group {
  const g = new Group();
  g.position.set(x, y, z);
  g.rotation.y = rotation;
  parent.add(g);
  return g;
}

/** Obstacle rectangulaire centré en (x, z). */
function solid(ctx: DecorContext, x: number, z: number, w: number, d: number): void {
  ctx.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
}

function ball(parent: Object3D, radius: number, color: string, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): Mesh {
  const m = mesh(geo("ball", () => new SphereGeometry(1, 12, 9)), toon(color), x, y, z);
  m.scale.set(radius * sx, radius * sy, radius * sz);
  parent.add(m);
  return m;
}

const UP = new Vector3(0, 1, 0);
/** Tube entre deux points (tuyaux, cordes, échelles). */
function rod(parent: Object3D, a: [number, number, number], b: [number, number, number], radius: number, color: string | Material, segments = 8): Mesh {
  const dir = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const length = dir.length();
  const material = typeof color === "string" ? toon(color) : color;
  const m = mesh(geo(`rod:${radius}:${segments}`, () => new CylinderGeometry(radius, radius, 1, segments)), material, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  m.scale.y = length;
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  parent.add(m);
  return m;
}

/** Disque dont l'axe suit X (volant, cadrans de côté). */
function diskX(parent: Object3D, radius: number, depth: number, color: string | Material, x: number, y: number, z: number): Mesh {
  const material = typeof color === "string" ? toon(color) : color;
  const m = mesh(geo(`disk:${radius}:${depth}`, () => new CylinderGeometry(radius, radius, depth, 18)), material, x, y, z);
  m.rotation.z = Math.PI / 2;
  parent.add(m);
  return m;
}

/** Disque dont l'axe suit Z (cadrans de face). */
function diskZ(parent: Object3D, radius: number, depth: number, color: string | Material, x: number, y: number, z: number): Mesh {
  const m = diskX(parent, radius, depth, color, x, y, z);
  m.rotation.set(Math.PI / 2, 0, 0);
  return m;
}

function ring(parent: Object3D, radius: number, tube: number, color: string, x: number, y: number, z: number, flat = true): Mesh {
  const m = mesh(geo(`ring:${radius}:${tube}`, () => new TorusGeometry(radius, tube, 6, 18)), toon(color), x, y, z);
  if (flat) m.rotation.x = Math.PI / 2;
  parent.add(m);
  return m;
}

/** Halo additif posé au sol (flaque de lumière). Matériau propre : sa couleur change avec l'état. */
function glowPool(parent: Object3D, x: number, z: number, w: number, d: number, color: string, opacity: number): MeshBasicMaterial {
  const material = new MeshBasicMaterial({ map: westGlowTexture(), color, transparent: true, opacity, depthWrite: false, blending: AdditiveBlending });
  const m = new Mesh(geo("plane", () => new PlaneGeometry(1, 1)), material);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.04, z);
  m.scale.set(w, d, 1);
  m.renderOrder = 3;
  parent.add(m);
  return material;
}

// ——— Mobilier ———

/** Lit superposé (ou lit de camp bas) : tête vers −Z local, couverture tricotée, oreiller. */
function bunk(parent: Object3D, x: number, z: number, rotation: number, seed: number, top: boolean): Group {
  const g = group(parent, x, z, rotation);
  const r = rng(seed);
  const frame = r() > 0.5 ? C.olive : C.leather;
  const W = 0.95, L = 2.0, H = top ? 1.72 : 0.5;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) block(g, 0.09, H, 0.09, frame, sx * (W / 2 - 0.045), 0, sz * (L / 2 - 0.045), 0.03);
  (top ? [0.26, 1.06] : [0.26]).forEach((y, i) => {
    block(g, W, 0.07, L, frame, 0, y, 0, 0.02);
    block(g, W - 0.08, 0.14, L - 0.1, PALETTE.mattress, 0, y + 0.07, 0, 0.06);
    const [a, b] = KNITS[(seed + i * 3) % KNITS.length];
    const blanket = block(g, W - 0.02, 0.07, 1.15, "#ffffff", (r() - 0.5) * 0.06, y + 0.19, 0.36, 0.035);
    blanket.material = knit(a, b);
    blanket.rotation.y = (r() - 0.5) * 0.18;
    // Bord replié de la couverture
    block(g, W - 0.04, 0.08, 0.16, b, blanket.position.x, y + 0.2, -0.22, 0.04);
    block(g, 0.55, 0.13, 0.32, C.cream, (r() - 0.5) * 0.12, y + 0.2, -0.7, 0.065);
  });
  if (top) {
    // Échelle au pied
    for (const sx of [-0.2, 0.2]) rod(g, [sx, 0, L / 2 + 0.04], [sx, 1.4, L / 2 + 0.04], 0.025, frame, 6);
    for (const y of [0.45, 0.8, 1.15]) rod(g, [-0.2, y, L / 2 + 0.04], [0.2, y, L / 2 + 0.04], 0.02, frame, 6);
  }
  return g;
}

function locker(parent: Object3D, x: number, z: number, rotation: number, color: string, open: boolean, y = 0): Group {
  const g = group(parent, x, z, rotation, y);
  block(g, 0.56, 1.5, 0.5, color, 0, 0, 0, 0.05);
  if (!open) {
    block(g, 0.47, 1.34, 0.04, color, 0, 0.08, 0.24, 0.02);
    for (let i = 0; i < 3; i++) block(g, 0.28, 0.025, 0.02, C.charcoal, 0, 1.18 + i * 0.06, 0.27, 0.005);
    block(g, 0.04, 0.15, 0.05, PALETTE.steel, 0.17, 0.65, 0.27, 0.015);
  } else {
    block(g, 0.47, 1.34, 0.02, C.charcoal, 0, 0.08, 0.245, 0.005);
    block(g, 0.3, 0.62, 0.12, C.mustard, 0, 0.62, 0.12, 0.05);
    ball(g, 0.07, C.oliveDark, 0, 1.3, 0.1, 1.4, 0.8, 1.2);
    const pivot = group(g, 0.24, 0.25, 1.9);
    block(pivot, 0.47, 1.34, 0.035, color, -0.235, 0.08, 0, 0.02);
    for (let i = 0; i < 3; i++) block(pivot, 0.28, 0.025, 0.02, C.charcoal, -0.235, 1.18 + i * 0.06, 0.025, 0.005);
    panel(pivot, drawingTexture(), -0.235, 0.85, -0.025, 0.3, 0.24, Math.PI);
  }
  return g;
}

function teddy(parent: Object3D, x: number, y: number, z: number, rotation: number): void {
  const g = group(parent, x, z, rotation, y);
  const fur = "#b07a45";
  ball(g, 0.13, fur, 0, 0.13, 0, 1, 1.05, 0.9);
  ball(g, 0.07, C.cream, 0, 0.12, 0.09, 1, 1.1, 0.5);
  ball(g, 0.075, C.mustard, 0, 0.24, 0, 1.25, 0.4, 1.25);
  ball(g, 0.105, fur, 0, 0.34, 0.01);
  for (const s of [-1, 1]) {
    ball(g, 0.042, fur, s * 0.078, 0.43, 0);
    ball(g, 0.022, C.cream, s * 0.078, 0.43, 0.025, 1, 1, 0.5);
    ball(g, 0.014, PALETTE.outline, s * 0.04, 0.36, 0.093);
    ball(g, 0.046, fur, s * 0.13, 0.16, 0.04, 1, 1.35, 1);
    ball(g, 0.055, fur, s * 0.07, 0.04, 0.1, 1, 0.9, 1.2);
  }
  ball(g, 0.042, C.cream, 0, 0.315, 0.09, 1, 0.8, 0.8);
  ball(g, 0.016, PALETTE.outline, 0, 0.335, 0.13);
}

function suitcase(parent: Object3D, x: number, z: number, rotation: number, color: string, y = 0): Group {
  const g = group(parent, x, z, rotation, y);
  block(g, 0.7, 0.24, 0.46, color, 0, 0, 0, 0.07);
  for (const s of [-0.18, 0.18]) block(g, 0.06, 0.25, 0.48, C.leather, s, -0.005, 0, 0.02);
  block(g, 0.22, 0.05, 0.05, C.leather, 0, 0.1, 0.25, 0.02);
  return g;
}

/** Étagère métallique remplie de cartons, conserves, piles et boîtes de clous. */
function shelf(ctx: DecorContext, x: number, z: number, length: number, height: number, levels: number, seed: number): void {
  const g = group(ctx.root, x, z);
  const r = rng(seed);
  const depth = 0.6;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) block(g, 0.06, height, 0.06, PALETTE.steelDark, sx * (length / 2 - 0.03), 0, sz * (depth / 2 - 0.03), 0.01);
  const gap = (height - 0.1) / levels;
  for (let l = 0; l <= levels; l++) {
    const y = 0.08 + l * gap;
    block(g, length, 0.05, depth, l % 2 ? C.olive : C.oliveDark, 0, y, 0, 0.015);
    if (l === levels && height > 1.5) continue;
    let cx = -length / 2 + 0.1;
    while (cx < length / 2 - 0.3) {
      const pick = r();
      const top = y + 0.05;
      if (pick < 0.15) { cx += 0.25; continue; }
      if (pick < 0.5) {
        // Carton scotché
        const w = 0.3 + r() * 0.2, h = Math.min(gap - 0.08, 0.22 + r() * 0.14);
        const box = block(g, w, h, 0.42, r() > 0.5 ? C.cardboard : "#b8875a", cx + w / 2, top, (r() - 0.5) * 0.06, 0.02);
        box.rotation.y = (r() - 0.5) * 0.15;
        block(g, w + 0.005, 0.01, 0.08, "#e2c58f", cx + w / 2, top + h, box.position.z, 0.003);
        cx += w + 0.06;
      } else if (pick < 0.72) {
        // Conserves en rang
        for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) cylinder(g, 0.06, 0.13, [PALETTE.rustLight, C.cream, C.olive][(k + j) % 3], cx + 0.07 + k * 0.13, top, -0.1 + j * 0.16, 10);
        cx += 0.42;
      } else if (pick < 0.86) {
        // Boîte de piles (couvercle moutarde, éclair peint)
        block(g, 0.32, 0.14, 0.24, C.charcoal, cx + 0.16, top, 0, 0.02);
        block(g, 0.33, 0.04, 0.25, C.mustard, cx + 0.16, top + 0.14, 0, 0.015);
        cx += 0.38;
      } else {
        // Boîte de clous (fer-blanc)
        cylinder(g, 0.11, 0.16, PALETTE.steel, cx + 0.12, top, 0, 12);
        cylinder(g, 0.115, 0.03, C.brick, cx + 0.12, top + 0.16, 0, 12);
        cx += 0.28;
      }
    }
  }
  solid(ctx, x, z, length, depth);
}

function barrel(parent: Object3D, x: number, z: number, color: string, tipped = false, rotation = 0): Group {
  const g = group(parent, x, z, rotation, tipped ? 0.32 : 0);
  const body = group(g, 0, 0);
  if (tipped) {
    body.rotation.z = Math.PI / 2;
    body.position.x = 0.45;
  }
  cylinder(body, 0.32, 0.9, color, 0, 0, 0, 14);
  for (const y of [0.22, 0.66]) ring(body, 0.322, 0.025, C.charcoal, 0, y, 0);
  cylinder(body, 0.28, 0.02, C.charcoal, 0, 0.9, 0, 14);
  cylinder(body, 0.05, 0.04, PALETTE.steel, 0.15, 0.9, 0.05, 8);
  return g;
}

function pallet(parent: Object3D, x: number, z: number, rotation = 0): Group {
  const g = group(parent, x, z, rotation);
  for (const s of [-0.45, 0, 0.45]) block(g, 0.1, 0.1, 1.0, PALETTE.woodDark, s, 0, 0, 0.01);
  for (let i = 0; i < 5; i++) block(g, 1.2, 0.04, 0.16, PALETTE.wood, 0, 0.1, -0.4 + i * 0.2, 0.01);
  return g;
}

/** Tabouret rond de cantine, parfois renversé. */
function stool(parent: Object3D, x: number, z: number, tipped: boolean, seed: number): void {
  const g = group(parent, x, z, seed);
  if (tipped) {
    g.rotation.set(0, seed, Math.PI / 2 - 0.15);
    g.position.y = 0.18;
  }
  cylinder(g, 0.035, 0.44, C.charcoal, 0, 0, 0, 6);
  cylinder(g, 0.13, 0.03, C.charcoal, 0, 0.01, 0, 10);
  cylinder(g, 0.18, 0.07, seed % 2 > 1 ? C.mustard : C.brick, 0, 0.44, 0, 12);
}

function mug(parent: Object3D, x: number, y: number, z: number, color: string, rotation = 0): void {
  const g = group(parent, x, z, rotation, y);
  cylinder(g, 0.05, 0.1, color, 0, 0, 0, 10);
  const handle = mesh(geo("mug-handle", () => new TorusGeometry(0.03, 0.01, 4, 8)), toon(color), 0.055, 0.05, 0);
  g.add(handle);
}

/** Longue table de cantine (axe X) avec tabourets des deux côtés, plateaux et tasses. */
function cafeTable(ctx: DecorContext, x0: number, x1: number, z: number, seed: number): void {
  const r = rng(seed);
  const length = x1 - x0;
  const cx = (x0 + x1) / 2;
  block(ctx.root, length, 0.08, 0.95, C.wood, cx, 0.72, z, 0.03);
  for (let t = 0; t <= Math.floor(length / 2.5); t++) {
    const lx = x0 + 0.3 + (t * (length - 0.6)) / Math.max(1, Math.floor(length / 2.5));
    block(ctx.root, 0.1, 0.72, 0.7, PALETTE.woodDark, lx, 0, z, 0.02);
  }
  const trays = ["#8a9a7e", C.teal, "#c9b48a"];
  for (let sx = x0 + 0.45; sx < x1 - 0.3; sx += 0.9) {
    for (const side of [-1, 1]) {
      const tipped = r() < 0.12;
      stool(ctx.root, sx + (r() - 0.5) * 0.15 + (tipped ? 0.2 : 0), z + side * (0.66 + (tipped ? 0.25 : r() * 0.06)), tipped, Math.floor(r() * 7) + 0.3);
      if (r() < 0.45) {
        const tray = block(ctx.root, 0.42, 0.03, 0.3, trays[Math.floor(r() * 3)], sx, 0.8, z + side * 0.24, 0.01);
        tray.rotation.y = (r() - 0.5) * 0.4;
        if (r() < 0.6) cylinder(ctx.root, 0.09, 0.03, C.cream, sx - 0.06, 0.83, z + side * 0.24, 12);
      }
      if (r() < 0.35) mug(ctx.root, sx + 0.18, 0.8, z + side * 0.1, r() > 0.5 ? C.cream : C.mustard, r() * 6);
    }
  }
  if (r() < 0.8) can(ctx.root, cx + (r() - 0.5) * length * 0.6, z, PALETTE.rustLight);
  solid(ctx, cx, z, length + 0.1, 1.8);
}

/** Note de survivant punaisée au mur. */
function pinnedNote(parent: Object3D, text: string, x: number, y: number, z: number, facing: number, tilt: number): void {
  const note = panel(parent, signTexture(text, { bg: "#f4ecd6", fg: "#3a2a1c", font: "'Patrick Hand', cursive", width: 256, height: 300 }), x, y, z, 0.34, 0.4, facing);
  note.rotation.z = tilt;
  const pin = ball(parent, 0.025, "#d8322a", x, y + 0.17, z, 1, 1, 1);
  pin.position.x += Math.sin(facing) * 0.02;
  pin.position.z += Math.cos(facing) * 0.02;
}

// ——— État de la génératrice (animée après la remise en route) ———

interface GeneratorView {
  powered: boolean;
  shake: Group;
  wheel: Group;
  needles: Group[];
  gears: Mesh[];
  puffs: Mesh[];
  puffOrigin: Vector3;
  beacon: MeshBasicMaterial;
  pool: MeshBasicMaterial;
  screen: MeshBasicMaterial;
  signOff: Mesh;
  signOn: Mesh;
}

let gen: GeneratorView | null = null;
/** Indices du mur creux (rayures, marque à la craie) : disparaissent une fois le passage ouvert. */
let hollowHints: Object3D[] = [];
let slotLed: Mesh | null = null;
let keycard: Group | null = null;

function refreshWest(_view: WorldView, state: SiloState): void {
  for (const hint of hollowHints) hint.visible = !state.has("secret_revealed");
  if (!gen) return;
  const powered = state.has("generator_powered");
  gen.powered = powered;
  for (const gear of gen.gears) gear.visible = powered;
  for (const puff of gen.puffs) puff.visible = powered;
  gen.signOff.visible = !powered;
  gen.signOn.visible = powered;
  gen.beacon.color.set(powered ? "#ffd27a" : "#ff3a24");
  gen.pool.color.set(powered ? "#ffc46a" : "#ff3a24");
  gen.screen.color.set(powered ? "#a8f0a0" : "#ff5a36");
  if (!powered) {
    gen.shake.position.set(0, 0, 0);
    for (const n of gen.needles) n.rotation.z = 1.1;
  }
}

function animateWest(dt: number, time: number): void {
  if (gen) {
    if (gen.powered) {
      gen.wheel.rotation.x -= dt * 7;
      gen.shake.position.set(Math.sin(time * 57) * 0.012, Math.abs(Math.sin(time * 43)) * 0.01, Math.cos(time * 61) * 0.008);
      gen.needles.forEach((n, i) => { n.rotation.z = -0.3 + i * 0.25 + Math.sin(time * (5 + i * 2)) * 0.08; });
      gen.puffs.forEach((puff, i) => {
        const phase = (time * 0.55 + i / gen!.puffs.length) % 1;
        puff.position.set(gen!.puffOrigin.x + phase * 0.35, gen!.puffOrigin.y + phase * 1.3, gen!.puffOrigin.z - phase * 0.1);
        puff.scale.setScalar(0.1 + phase * 0.32);
        (puff.material as MeshBasicMaterial).opacity = 0.55 * (1 - phase);
      });
      gen.pool.opacity = 0.26 + Math.sin(time * 2.2) * 0.03;
    } else {
      // Gyrophares d'urgence : rouge qui clignote.
      const on = Math.sin(time * 4.5) > -0.2;
      gen.beacon.color.set(on ? "#ff3a24" : "#5a1a12");
      gen.pool.opacity = on ? 0.42 : 0.12;
    }
  }
  if (slotLed) slotLed.visible = Math.sin(time * 6) > 0;
  if (keycard) {
    keycard.position.y = 0.66 + Math.sin(time * 2) * 0.025;
    keycard.rotation.y = Math.sin(time * 0.8) * 0.35;
  }
}

// ——— Salles ———

function westCorridor(ctx: DecorContext): void {
  const root = ctx.root;
  ruin(root, -11, -7, -20, 20, 701, 1, 0.8);
  // Tuyaux le long du mur est, avec colliers.
  for (const [z0, z1] of [[-19.8, -1.6], [1.6, 19.8]]) {
    rod(root, [-7.27, 1.3, z0], [-7.27, 1.3, z1], 0.07, C.mustard);
    rod(root, [-7.25, 1.06, z0], [-7.25, 1.06, z1], 0.05, PALETTE.rust);
    for (let z = z0 + 0.6; z < z1; z += 3) block(root, 0.12, 0.4, 0.08, PALETTE.steelDark, -7.24, 0.95, z, 0.01);
  }
  // Lampes de secours murales.
  for (const [z, color] of [[-17, "#ffb347"], [-6.5, PALETTE.danger], [8.6, "#ffb347"], [17.5, PALETTE.danger]] as [number, string][]) {
    block(root, 0.1, 0.2, 0.16, C.charcoal, -10.8, 1.2, z, 0.02);
    const bulb = mesh(geo("ebulb", () => new SphereGeometry(0.07, 10, 8)), glow(color), -10.72, 1.31, z, false);
    root.add(bulb);
  }
  // Distributeur de boissons cassé, penché contre le mur.
  const vend = group(root, -10.42, 6.2, Math.PI / 2);
  vend.rotation.x = -0.08;
  vend.rotation.z = 0.06;
  block(vend, 1.0, 1.75, 0.75, C.brick, 0, 0, 0, 0.1);
  block(vend, 0.62, 1.15, 0.04, C.charcoal, -0.12, 0.42, 0.37, 0.02);
  const r = rng(61);
  for (let row = 0; row < 4; row++) for (let k = 0; k < 4; k++) {
    if (r() < 0.3) continue;
    cylinder(vend, 0.045, 0.12, [C.mustard, C.teal, C.cream, PALETTE.rustLight][(row + k) % 4], -0.36 + k * 0.16, 0.5 + row * 0.27, 0.36, 8);
  }
  rod(vend, [-0.4, 1.4, 0.4], [0.05, 0.6, 0.4], 0.012, "#f0f6f2", 4);
  rod(vend, [0.05, 1.2, 0.4], [-0.3, 0.55, 0.4], 0.012, "#f0f6f2", 4);
  block(vend, 0.2, 0.5, 0.05, C.cream, 0.33, 0.8, 0.37, 0.02);
  for (let i = 0; i < 6; i++) ball(vend, 0.018, i % 2 ? PALETTE.danger : C.charcoal, 0.29 + (i % 2) * 0.08, 1.15 - Math.floor(i / 2) * 0.07, 0.41);
  panel(vend, signTexture("BOISSONS", { bg: C.mustard, fg: PALETTE.outline, width: 256, height: 64 }), 0, 1.58, 0.38, 0.8, 0.18, 0);
  const tag = panel(vend, signTexture("HORS\nSERVICE", { bg: PALETTE.paper, fg: PALETTE.danger, border: PALETTE.danger, width: 192, height: 128 }), -0.1, 0.95, 0.4, 0.34, 0.22, 0);
  tag.rotation.z = 0.2;
  solid(ctx, -10.45, 6.2, 0.95, 1.1);
  for (let i = 0; i < 7; i++) {
    const shard = block(root, 0.08 + r() * 0.1, 0.01, 0.06 + r() * 0.08, "#cfe6e2", -9.7 + (r() - 0.5) * 0.9, 0, 6.2 + (r() - 0.5) * 1.2, 0.004);
    shard.rotation.y = r() * 3;
  }
  can(root, -9.5, 5.5, C.teal, true);
  can(root, -9.2, 6.9, C.mustard, true);
  // Caisses au cul-de-sac nord, banc avec couverture au sud.
  crate(root, -10.3, -19.3, 0.65, 0.2);
  crate(root, -9.55, -19.4, 0.5, -0.3);
  crate(root, -10.25, -19.3, 0.45, 0.5, 0.65);
  solid(ctx, -9.95, -19.35, 1.3, 0.8);
  block(root, 0.5, 0.45, 1.7, C.wood, -7.55, 0, 9.6, 0.05);
  const throwBlanket = block(root, 0.52, 0.05, 0.7, "#ffffff", -7.55, 0.45, 9.3, 0.03);
  throwBlanket.material = knit(C.olive, C.mustard);
  cylinder(root, 0.05, 0.22, C.oliveDark, -7.5, 0.47, 10.1, 10);
  solid(ctx, -7.55, 9.6, 0.55, 1.75);
  signBoard(root, "AILE OUEST", -7.18, 1.0, -3.2, 1.1, 0.3, -Math.PI / 2, { bg: C.olive, fg: C.cream });
  decal(root, blobTexture("puddle"), -9.2, -9.5, 1.4, 1.0, 0.4);
  overgrowth(root, -10.6, -9.8, 0.5, 71);
  ctx.light(-9, 2.1, -4.5, "#ffcf8a", 5, 9, 0.5, 25, true);
}

function dorms(ctx: DecorContext): void {
  const root = ctx.root;
  ruin(root, -32, -11, -20, -6, 811, 1, 0.75);
  // Tapis rond tricoté au centre, sous la lampe.
  const rug = mesh(geo("rug", () => new CylinderGeometry(1.6, 1.6, 0.03, 28)), knit(C.mustard, C.brick), -22.5, 0.015, -13.2, false);
  root.add(rug);
  // Rangée nord : lits superposés, tête contre le mur.
  for (const [i, x] of [-29.8, -27.2, -24.6, -18.6].entries()) {
    bunk(root, x, -18.8, 0, 3 + i, true);
    solid(ctx, x, -18.8, 1.0, 2.1);
  }
  teddy(root, -27.05, 1.33, -18.95, 0.25);
  // Rangée sud : lits de camp bas (la caméra voit par-dessus).
  for (const [i, x] of [-27.0, -24.6, -22.2, -19.8].entries()) {
    bunk(root, x, -7.2, Math.PI, 11 + i, false);
    solid(ctx, x, -7.2, 1.0, 2.1);
  }
  // Dessins d'enfants entre les lits et notes punaisées.
  for (const [x, tilt] of [[-28.5, 0.08], [-25.9, -0.1], [-21.7, 0.05]] as [number, number][]) {
    const d = panel(root, drawingTexture(), x, 1.05, -19.82, 0.5, 0.4, 0);
    d.rotation.z = tilt;
  }
  pinnedNote(root, "Tour de garde :\nLéa · Marco\nmoi ce soir", -22.6, 1.1, -19.82, 0, -0.06);
  // Casiers personnels (un ouvert, veste moutarde dedans).
  [C.olive, C.mustard, C.teal, C.olive, C.brick].forEach((color, i) => locker(root, -14.6 + i * 0.6, -19.55, 0, color, i === 2));
  solid(ctx, -13.4, -19.55, 3.0, 0.6);
  // Corde à linge dans le coin sud-est.
  const line = (t: number) => 1.55 - Math.sin(t * Math.PI) * 0.13;
  for (const x of [-17.6, -12.4]) {
    cylinder(root, 0.045, 1.6, PALETTE.woodDark, x, 0, -7.3, 8);
    cylinder(root, 0.16, 0.06, C.charcoal, x, 0, -7.3, 10);
    solid(ctx, x, -7.3, 0.2, 0.2);
  }
  rod(root, [-17.6, 1.55, -7.3], [-15, line(0.5), -7.3], 0.012, C.cream, 4);
  rod(root, [-15, line(0.5), -7.3], [-12.4, 1.55, -7.3], 0.012, C.cream, 4);
  const lr = rng(91);
  for (let x = -17.1; x < -12.8; x += 0.48) {
    const t = (x + 17.6) / 5.2;
    const sock = lr() < 0.3;
    const w = sock ? 0.1 : 0.36, h = sock ? 0.22 : 0.42 + lr() * 0.12;
    const cloth = block(root, w, h, 0.03, [C.mustard, C.cream, C.olive, C.brick, C.teal][Math.floor(lr() * 5)], x, line(t) - h + 0.02, -7.3, 0.015);
    cloth.rotation.z = (lr() - 0.5) * 0.15;
    ball(root, 0.02, C.leather, x, line(t), -7.3);
  }
  // Valises empilées et une valise ouverte, vêtements qui débordent.
  suitcase(root, -25.8, -6.75, 0, C.brick);
  suitcase(root, -25.75, -6.75, 0.15, C.mustard, 0.24);
  solid(ctx, -25.8, -6.8, 0.8, 0.6);
  const open = suitcase(root, -20.8, -9.2, 0.4, C.olive);
  const lid = block(open, 0.7, 0.06, 0.46, C.oliveDark, 0, 0.1, -0.4, 0.03);
  lid.rotation.x = -1.2;
  block(open, 0.3, 0.06, 0.3, C.cream, -0.1, 0.24, 0.05, 0.03);
  block(open, 0.35, 0.05, 0.2, C.mustard, 0.25, 0.02, 0.38, 0.02).rotation.y = 0.5;
  // Coin saccagé (sud-ouest) : lit renversé, matelas éventré, casier tombé, brûlure.
  const fallen = bunk(root, -31.65, -7.6, 0, 7, true);
  fallen.rotation.z = -Math.PI / 2;
  fallen.position.y = 0.48;
  solid(ctx, -30.8, -7.6, 1.8, 2.1);
  const torn = block(root, 0.85, 0.12, 1.6, PALETTE.mattress, -28.9, 0, -9.0, 0.05);
  torn.rotation.y = 0.7;
  const tr = rng(17);
  for (let i = 0; i < 6; i++) ball(root, 0.06 + tr() * 0.05, C.cream, -28.9 + (tr() - 0.5) * 1.2, 0.08, -9.0 + (tr() - 0.5) * 1.2, 1.2, 0.6, 1);
  const tipped = locker(root, -28.4, -8.3, 0, C.olive, false, 0.25);
  tipped.rotation.x = Math.PI / 2;
  solid(ctx, -28.4, -7.55, 0.6, 1.55);
  rubble(root, -29.6, -6.9, 9, 77, 0.6);
  decal(root, blobTexture("scorch"), -30.2, -8.4, 2.2, 1.8, 0.6);
  // Coin jeux : table basse sur caisse, jeu de plateau, cartes, deux poufs.
  crate(root, -17, -14.3, 0.6, 0.2);
  block(root, 1.0, 0.06, 0.8, C.wood, -17, 0.6, -14.3, 0.02).rotation.y = 0.2;
  const boardGame = block(root, 0.42, 0.02, 0.42, "#ffffff", -17.1, 0.66, -14.3, 0.005);
  boardGame.material = knit(C.cream, C.brick);
  for (let i = 0; i < 4; i++) ball(root, 0.03, [C.mustard, C.teal, C.brick, C.olive][i], -17.25 + i * 0.1, 0.7, -14.2 + (i % 2) * 0.1);
  block(root, 0.14, 0.02, 0.2, C.cream, -16.75, 0.66, -14.0, 0.005).rotation.y = 0.5;
  mug(root, -16.7, 0.66, -14.55, C.mustard, 0.3);
  ball(root, 0.3, C.olive, -17.9, 0.22, -14.0, 1, 0.65, 1);
  ball(root, 0.3, C.mustard, -16.2, 0.22, -14.8, 1, 0.65, 1);
  solid(ctx, -17, -14.3, 1.3, 1.2);
  // Poêle à bois bricolé dans un fût, bouilloire, chaussettes qui sèchent.
  barrel(root, -29.6, -11.3, PALETTE.rust);
  block(root, 0.3, 0.22, 0.04, C.charcoal, -29.6, 0.2, -10.97, 0.02);
  block(root, 0.22, 0.12, 0.03, "#ff9a3a", -29.6, 0.25, -10.95, 0.02).material = glow("#ff9a3a");
  rod(root, [-29.75, 0.9, -11.4], [-29.75, 1.7, -11.4], 0.06, C.charcoal);
  cylinder(root, 0.12, 0.16, PALETTE.steel, -29.5, 0.92, -11.2, 10);
  rod(root, [-29.5, 1.12, -11.3], [-29.5, 1.12, -11.1], 0.015, C.charcoal, 4);
  rod(root, [-30.3, 1.25, -11.9], [-29.0, 1.25, -11.9], 0.01, C.cream, 4);
  for (let i = 0; i < 3; i++) block(root, 0.08, 0.2, 0.03, [C.mustard, C.brick, C.cream][i], -30.1 + i * 0.4, 1.06, -11.9, 0.015);
  solid(ctx, -29.6, -11.3, 0.8, 0.8);
  // Fauteuil défoncé avec plaid et livre.
  const chair = group(root, -25.8, -10.0, -0.3);
  block(chair, 0.85, 0.42, 0.75, C.leatherLight, 0, 0, 0, 0.12);
  block(chair, 0.85, 0.5, 0.2, C.leather, 0, 0.4, -0.3, 0.1);
  for (const s of [-1, 1]) block(chair, 0.16, 0.32, 0.7, C.leather, s * 0.38, 0.38, 0, 0.07);
  const plaid = block(chair, 0.6, 0.06, 0.55, "#ffffff", 0.05, 0.42, 0.05, 0.03);
  plaid.material = knit(C.olive, C.cream);
  block(chair, 0.2, 0.04, 0.26, C.teal, -0.1, 0.48, 0.15, 0.01).rotation.y = 0.6;
  solid(ctx, -25.8, -10.0, 0.95, 0.9);
  // Pile de couvertures pliées sur une caisse.
  crate(root, -24.5, -16.6, 0.65, 0.1);
  for (let i = 0; i < 4; i++) {
    const [a, b] = KNITS[i + 1];
    block(root, 0.6, 0.1, 0.48, "#ffffff", -24.5 + (i % 2) * 0.03, 0.65 + i * 0.1, -16.6, 0.04).material = knit(a, b);
  }
  solid(ctx, -24.5, -16.6, 0.8, 0.8);
  // Mur creux (passage vers la pièce cachée) : panneau un peu différent, rayures en arc, marque à la craie.
  const patch = group(root, -31.8, -14);
  block(patch, 0.04, 1.42, 1.62, "#9aa38f", 0, 0.12, 0, 0.01);
  for (const dz of [-0.75, 0.75]) block(patch, 0.05, 1.42, 0.05, C.charcoal, 0.01, 0.12, dz, 0.01);
  for (const [y, dz] of [[0.3, -0.7], [1.4, -0.7], [0.3, 0.7], [1.4, 0.7]]) ball(patch, 0.025, PALETTE.steel, 0.03, y, dz);
  const scratches = decal(root, westScratchTexture(), -31.0, -14, 1.7, 1.9, 0, 0.018);
  const chalk = panel(root, sprayTexture("X ?", "#f3eedf"), -31.77, 1.1, -15.45, 0.6, 0.2, Math.PI / 2);
  const tally = panel(root, sprayTexture("||||", "#f3eedf"), -31.77, 0.7, -12.6, 0.4, 0.14, Math.PI / 2);
  hollowHints = [patch, scratches, chalk, tally];
  ctx.light(-22.5, 2.3, -13.2, "#ffd9a0", 7, 11, 0.15, 21, true);
  ctx.beam(-22.5, 2.3, -13.2, 1.3, "#ffe6b0");
}

function secretRoom(ctx: DecorContext): void {
  const root = ctx.root;
  ruin(root, -37, -32, -18, -10, 911, 0, 0.4);
  // Bureau contre le mur ouest, lampe, papiers, radio.
  const dx = -36.3, dz = -16.3;
  block(root, 0.8, 0.07, 1.5, C.leatherLight, dx, 0.72, dz, 0.025);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) block(root, 0.07, 0.72, 0.07, C.leather, dx + sx * 0.33, 0, dz + sz * 0.68, 0.015);
  block(root, 0.68, 0.2, 0.55, C.leather, dx, 0.5, dz + 0.4, 0.03);
  for (const [px, pz, rot] of [[-0.05, -0.1, 0.2], [0.1, 0.15, -0.3], [-0.15, 0.3, 0.6]]) block(root, 0.24, 0.006, 0.31, PALETTE.paper, dx + px, 0.79, dz + pz, 0.002).rotation.y = rot;
  cylinder(root, 0.09, 0.04, C.mustard, dx - 0.15, 0.79, dz - 0.5, 12);
  rod(root, [dx - 0.15, 0.82, dz - 0.5], [dx + 0.02, 1.18, dz - 0.38], 0.02, C.mustard, 6);
  const shade = mesh(geo("shade", () => new CylinderGeometry(0.05, 0.15, 0.17, 12)), toon(C.mustard), dx + 0.08, 1.12, dz - 0.33);
  shade.rotation.z = -0.5;
  root.add(shade);
  root.add(mesh(geo("lampbulb", () => new SphereGeometry(0.05, 8, 6)), glow("#fff1c4"), dx + 0.12, 1.06, dz - 0.31, false));
  mug(root, dx + 0.18, 0.79, dz + 0.05, C.cream, 1);
  block(root, 0.26, 0.15, 0.12, C.olive, dx - 0.1, 0.79, dz + 0.55, 0.03);
  rod(root, [dx - 0.18, 0.92, dz + 0.55], [dx - 0.25, 1.3, dz + 0.5], 0.008, C.charcoal, 4);
  cylinder(root, 0.2, 0.05, C.leather, -35.55, 0.46, -16.3, 12);
  for (const [sx, sz] of [[-0.1, -0.1], [0.1, -0.1], [0, 0.12]]) rod(root, [-35.55 + sx, 0, -16.3 + sz], [-35.55, 0.46, -16.3], 0.02, C.leather, 5);
  solid(ctx, dx, dz, 0.85, 1.55);
  solid(ctx, -35.55, -16.3, 0.4, 0.4);
  // Plans épinglés au mur ouest, tableau au fil rouge au mur nord.
  panel(root, westMapTexture(), -36.82, 1.12, -16.4, 0.75, 0.58, Math.PI / 2);
  const map2 = panel(root, westMapTexture(), -36.82, 1.0, -15.4, 0.42, 0.33, Math.PI / 2);
  map2.rotation.z = 0.12;
  panel(root, westBoardTexture(), -34.6, 1.0, -17.82, 1.5, 1.0, 0);
  stringLights(root, -36.7, -17.75, -32.5, -17.75, 1.62, 9);
  // Coffre-fort (cadran en laiton).
  block(root, 0.72, 0.8, 0.6, C.charcoal, -33.0, 0, -17.35, 0.06);
  block(root, 0.6, 0.66, 0.03, "#4a4642", -33.0, 0.07, -17.05, 0.02);
  diskZ(root, 0.09, 0.04, C.mustard, -32.9, 0.48, -17.02);
  rod(root, [-33.2, 0.3, -17.0], [-33.2, 0.5, -17.0], 0.018, C.mustard, 6);
  for (let i = 0; i < 3; i++) cylinder(root, 0.06, 0.13, [PALETTE.rustLight, C.cream, C.olive][i], -33.2 + i * 0.15, 0.8, -17.4, 10);
  solid(ctx, -33.0, -17.35, 0.75, 0.65);
  // Couchage : natte, sac de couchage tricoté, oreiller, livres, bougie.
  block(root, 2.0, 0.05, 0.85, C.oliveDark, -35.4, 0, -11.0, 0.02);
  const bag = block(root, 1.45, 0.13, 0.72, "#ffffff", -35.15, 0.05, -11.0, 0.06);
  bag.material = knit(C.brick, C.cream);
  block(root, 0.32, 0.13, 0.5, C.cream, -36.15, 0.05, -11.0, 0.06);
  for (let i = 0; i < 3; i++) block(root, 0.3 - i * 0.03, 0.06, 0.22, [C.teal, C.mustard, C.brick][i], -34.0, i * 0.06, -10.55, 0.015).rotation.y = i * 0.25;
  cylinder(root, 0.045, 0.12, C.cream, -34.0, 0, -11.55, 10);
  root.add(mesh(geo("flame", () => new SphereGeometry(0.025, 6, 5)), glow("#ffd27a"), -34.0, 0.15, -11.55, false));
  crate(root, -32.85, -10.75, 0.6, 0.2);
  crate(root, -32.85, -10.75, 0.45, 0.6, 0.6);
  solid(ctx, -32.85, -10.75, 0.8, 0.8);
  ctx.light(-36.0, 1.3, -16.0, "#ffc27a", 5, 6.5, 0.1, 22, false);
}

function storage(ctx: DecorContext): void {
  const root = ctx.root;
  ruin(root, -32, -11, -6, 6, 1011, 1, 0.8);
  // Hautes étagères au nord, étagères basses au sud (la caméra voit par-dessus).
  [-29.5, -27.1, -24.7, -22.3, -19.9].forEach((x, i) => shelf(ctx, x, -5.45, 2.3, 2.1, 4, 40 + i));
  [-29.4, -27.0, -22.2, -19.8].forEach((x, i) => shelf(ctx, x, 5.45, 2.3, 1.05, 2, 50 + i));
  pinnedNote(root, "INVENTAIRE\npiles : 3 boîtes\nclous : ok\nconserves : 41", -17.6, 1.05, -5.82, 0, 0.07);
  // Cage grillagée (ouest) et son contenu.
  const cx0 = -31.85, cx1 = -29.2, cz0 = -3.5, cz1 = 2.5;
  for (const [x, z] of [[cx1, cz0], [cx1, cz1], [cx0 + 0.05, cz0], [cx0 + 0.05, cz1]]) block(root, 0.08, 2.0, 0.08, PALETTE.steelDark, x, 0, z, 0.01);
  for (const y of [0.05, 1.0, 1.95]) {
    rod(root, [cx1, y, cz0], [cx1, y, cz1], 0.025, PALETTE.steelDark, 6);
    rod(root, [cx0, y, cz0], [cx1, y, cz0], 0.025, PALETTE.steelDark, 6);
    rod(root, [cx0, y, cz1], [cx1, y, cz1], 0.025, PALETTE.steelDark, 6);
  }
  for (let z = cz0 + 0.3; z < cz1 - 0.1; z += 0.3) rod(root, [cx1, 0.05, z], [cx1, 1.95, z], 0.012, PALETTE.steel, 4);
  for (let x = cx0 + 0.3; x < cx1 - 0.1; x += 0.3) {
    rod(root, [x, 0.05, cz0], [x, 1.95, cz0], 0.012, PALETTE.steel, 4);
    rod(root, [x, 0.05, cz1], [x, 1.95, cz1], 0.012, PALETTE.steel, 4);
  }
  block(root, 0.12, 0.16, 0.1, C.mustard, cx1 + 0.06, 0.95, -0.5, 0.03);
  crate(root, -31.2, -2.7, 0.6, 0.1);
  crate(root, -31.2, -2.7, 0.5, -0.2, 0.6);
  crate(root, -30.3, -2.8, 0.55, 0.4);
  for (let i = 0; i < 3; i++) {
    block(root, 0.32, 0.42, 0.16, PALETTE.danger, -31.4 + i * 0.38, 0, 1.9, 0.04);
    block(root, 0.1, 0.06, 0.06, C.charcoal, -31.4 + i * 0.38, 0.42, 1.9, 0.02);
  }
  block(root, 0.5, 0.3, 0.36, C.cream, -30.2, 0, 0.6, 0.05);
  panel(root, signTexture("+", { bg: C.cream, fg: PALETTE.danger, width: 64, height: 64 }), -30.2, 0.17, 0.79, 0.2, 0.2, 0);
  for (let i = 0; i < 3; i++) block(root, 0.34, 0.12, 0.26, C.charcoal, -31.2, i * 0.12, -0.6, 0.02);
  block(root, 0.35, 0.04, 0.27, C.mustard, -31.2, 0.36, -0.6, 0.015);
  solid(ctx, (cx0 + cx1) / 2, (cz0 + cz1) / 2, cx1 - cx0 + 0.1, cz1 - cz0 + 0.1);
  // Palette chargée près de la porte, caisse isolée.
  pallet(root, -12.5, -4.6, 0.1);
  crate(root, -12.8, -4.6, 0.55, 0.1, 0.14);
  crate(root, -12.2, -4.55, 0.5, -0.2, 0.14);
  crate(root, -12.5, -4.6, 0.45, 0.3, 0.69);
  solid(ctx, -12.5, -4.6, 1.3, 1.1);
  crate(root, -15.3, -5.4, 0.55, 0.3);
  solid(ctx, -15.3, -5.4, 0.7, 0.7);
  // Fûts au sud-est, un renversé dans sa flaque de rouille.
  barrel(root, -12.2, 4.9, C.olive);
  barrel(root, -12.9, 5.25, C.mustard);
  barrel(root, -12.3, 4.15, C.brick);
  solid(ctx, -12.55, 4.7, 1.3, 1.6);
  barrel(root, -14.4, 5.2, PALETTE.rust, true, 0.3);
  decal(root, blobTexture("rust"), -13.9, 4.9, 1.4, 1.0, 0.3);
  solid(ctx, -14.0, 5.35, 1.0, 0.7);
  // Transpalette jaune chargé de caisses.
  const cart = group(root, -19.5, 3.4);
  for (const s of [-0.25, 0.25]) block(cart, 1.15, 0.07, 0.17, C.mustard, -0.1, 0.02, s, 0.02);
  for (const s of [-0.25, 0.25]) diskZ(cart, 0.06, 0.06, C.charcoal, -0.6, 0.06, s);
  block(cart, 0.26, 0.38, 0.55, C.mustard, 0.6, 0, 0, 0.06);
  diskZ(cart, 0.1, 0.12, C.charcoal, 0.6, 0.1, 0);
  rod(cart, [0.62, 0.38, 0], [1.0, 1.15, 0], 0.03, C.charcoal, 6);
  rod(cart, [1.0, 1.15, -0.15], [1.0, 1.15, 0.15], 0.035, C.brick, 6);
  pallet(cart, -0.1, 0, Math.PI / 2).position.y = 0.09;
  crate(cart, -0.3, 0, 0.5, 0.1, 0.23);
  crate(cart, 0.15, 0.05, 0.4, -0.2, 0.23);
  solid(ctx, -19.4, 3.4, 1.8, 1.1);
  // Sacs de farine, dont un éventré.
  const sack = (x: number, z: number, y: number, rot: number, squash = 1) => {
    const s = block(root, 0.55, 0.3 * squash, 0.4, "#efe4c8", x, y, z, 0.12 * squash);
    s.rotation.y = rot;
    block(root, 0.56, 0.06, 0.41, "#3f6f86", x, y + 0.12 * squash, z, 0.02).rotation.y = rot;
  };
  decal(root, westFlourTexture(), -23.4, 4.3, 2.0, 1.6, 0.4);
  sack(-24.4, 4.6, 0, 0.1);
  sack(-24.0, 4.2, 0, -0.3);
  sack(-24.2, 4.4, 0.3, 0.2);
  sack(-23.2, 4.0, 0, 0.9, 0.45);
  solid(ctx, -24.2, 4.4, 1.1, 1.0);
  // Lignes de baies peintes au sol, usées.
  for (const z of [-4.75, 4.95]) block(root, 12, 0.006, 0.09, C.mustard, -24.6, 0.004, z, 0.001).castShadow = false;
  // Tas de ferraille triée : tôles, tuyaux, pneu, ressorts.
  const sr = rng(303);
  for (let i = 0; i < 9; i++) {
    const plate = block(root, 0.3 + sr() * 0.4, 0.04 + sr() * 0.12, 0.2 + sr() * 0.4, [PALETTE.steel, PALETTE.rust, PALETTE.steelDark, PALETTE.rustLight][i % 4], -26 + (sr() - 0.5) * 0.9, sr() * 0.25, -3.6 + (sr() - 0.5) * 0.6, 0.02);
    plate.rotation.set((sr() - 0.5) * 0.8, sr() * 3, (sr() - 0.5) * 0.8);
  }
  ring(root, 0.28, 0.1, C.charcoal, -25.6, 0.12, -3.4).rotation.x = Math.PI / 2 + 0.2;
  rod(root, [-26.6, 0.15, -3.9], [-25.4, 0.45, -3.2], 0.05, PALETTE.rust);
  rod(root, [-26.4, 0.1, -3.2], [-25.6, 0.3, -4.0], 0.04, PALETTE.steel);
  panel(root, signTexture("FERRAILLE", { bg: C.cream, fg: PALETTE.outline, width: 256, height: 64 }), -26, 0.75, -3.0, 0.5, 0.13, 0).rotation.z = -0.1;
  rod(root, [-26, 0, -3.05], [-26, 0.7, -3.05], 0.02, PALETTE.woodDark, 4);
  solid(ctx, -26, -3.6, 1.2, 0.9);
  // Table de tri : boîtes de piles, bocaux de clous, conserves alignées.
  block(root, 2.0, 0.07, 0.7, C.wood, -21, 0.78, -4.0, 0.02);
  for (const [sx, sz] of [[-0.9, -0.28], [0.9, -0.28], [-0.9, 0.28], [0.9, 0.28]]) block(root, 0.07, 0.78, 0.07, PALETTE.woodDark, -21 + sx, 0, -4.0 + sz, 0.01);
  for (let i = 0; i < 3; i++) {
    block(root, 0.3, 0.13, 0.22, C.charcoal, -21.7 + i * 0.33, 0.85, -4.1, 0.02);
    block(root, 0.31, 0.04, 0.23, C.mustard, -21.7 + i * 0.33, 0.98, -4.1, 0.015);
  }
  for (let i = 0; i < 3; i++) {
    cylinder(root, 0.08, 0.2, "#cfe0dc", -20.6 + i * 0.2, 0.85, -3.85, 10);
    cylinder(root, 0.085, 0.04, C.brick, -20.6 + i * 0.2, 1.05, -3.85, 10);
  }
  for (let i = 0; i < 5; i++) cylinder(root, 0.06, 0.13, [PALETTE.rustLight, C.cream, C.olive][i % 3], -21.6 + i * 0.15, 0.85, -3.75, 10);
  crate(root, -21.6, -4.0, 0.5, 0.3);
  solid(ctx, -21, -4.0, 2.1, 0.8);
  // Caisses de conserves près de l'entrée.
  crate(root, -16.8, 4.6, 0.6, 0.15);
  crate(root, -16.15, 4.7, 0.55, -0.1);
  crate(root, -16.5, 4.65, 0.5, 0.4, 0.6);
  panel(root, signTexture("CONSERVES", { bg: C.cream, fg: PALETTE.outline, width: 256, height: 64 }), -16.8, 0.35, 4.29, 0.45, 0.12, 0);
  solid(ctx, -16.5, 4.65, 1.3, 0.8);
  ctx.light(-21.5, 2.3, 0.6, "#ffdca8", 6, 11, 0.35, 23, true);
  ctx.dust(-21.5, 2.2, 0.4);
}

function cafeteria(ctx: DecorContext): void {
  const root = ctx.root;
  ruin(root, -32, -11, 6, 20, 1211, 1, 0.7);
  // Comptoir de service (nord-sud) qui sépare la cuisine.
  block(root, 0.7, 0.9, 5.2, C.olive, -28.95, 0, 8.8, 0.05);
  block(root, 0.82, 0.07, 5.3, C.cream, -28.95, 0.9, 8.8, 0.03);
  for (let i = 0; i < 4; i++) block(root, 0.42, 0.03, 0.3, i % 2 ? C.teal : "#8a9a7e", -28.95, 0.97 + i * 0.035, 6.9, 0.01);
  cylinder(root, 0.22, 0.28, PALETTE.steel, -28.95, 0.97, 8.4, 14);
  cylinder(root, 0.23, 0.03, PALETTE.steelDark, -28.95, 1.25, 8.4, 14);
  ball(root, 0.035, C.charcoal, -28.95, 1.3, 8.4);
  for (let i = 0; i < 4; i++) mug(root, -29.05 + (i % 2) * 0.2, 0.97, 9.6 + Math.floor(i / 2) * 0.2, [C.cream, C.mustard, C.teal, C.brick][i], i);
  block(root, 0.4, 0.18, 0.3, C.leather, -28.95, 0.97, 10.6, 0.04);
  for (let i = 0; i < 3; i++) ball(root, 0.08, "#d9a86a", -29.05 + i * 0.1, 1.14, 10.6, 1.3, 0.7, 1);
  solid(ctx, -28.95, 8.8, 0.85, 5.3);
  // Cuisine : frigo ouvert, cuisinière et casseroles, évier.
  block(root, 0.72, 1.8, 0.8, C.cream, -31.45, 0, 7.0, 0.08);
  block(root, 0.05, 1.6, 0.68, "#cdd8d0", -31.1, 0.1, 7.0, 0.01);
  for (const y of [0.55, 1.0, 1.4]) block(root, 0.5, 0.03, 0.66, "#e8f0ea", -31.38, y, 7.0, 0.005);
  cylinder(root, 0.06, 0.22, C.olive, -31.3, 1.03, 6.85, 8);
  block(root, 0.18, 0.14, 0.14, C.mustard, -31.35, 0.58, 7.15, 0.03);
  const hinge = group(root, -31.08, 6.62, 1.3);
  block(hinge, 0.06, 1.7, 0.78, C.cream, 0, 0.05, 0.39, 0.03);
  for (const y of [0.5, 1.1]) block(hinge, 0.12, 0.04, 0.6, "#e8f0ea", 0.08, y, 0.39, 0.01);
  cylinder(hinge, 0.04, 0.12, C.brick, 0.1, 1.14, 0.25, 8);
  solid(ctx, -31.45, 7.0, 0.75, 0.85);
  solid(ctx, -30.75, 6.75, 0.75, 0.35);
  block(root, 0.72, 0.9, 1.0, PALETTE.steelDark, -31.45, 0, 8.95, 0.05);
  block(root, 0.03, 0.4, 0.6, "#2a2522", -31.08, 0.25, 8.95, 0.01);
  for (const [px, pz] of [[-31.6, 8.7], [-31.3, 8.7], [-31.6, 9.2], [-31.3, 9.2]]) cylinder(root, 0.11, 0.02, C.charcoal, px, 0.9, pz, 12);
  cylinder(root, 0.2, 0.26, PALETTE.steel, -31.55, 0.92, 8.75, 14);
  ring(root, 0.2, 0.02, PALETTE.steelDark, -31.55, 1.18, 8.75);
  cylinder(root, 0.14, 0.06, C.charcoal, -31.3, 0.92, 9.25, 12);
  rod(root, [-31.18, 0.97, 9.3], [-30.85, 0.97, 9.45], 0.02, C.leather, 5);
  solid(ctx, -31.45, 8.95, 0.75, 1.05);
  block(root, 0.72, 0.9, 1.0, C.cream, -31.45, 0, 10.6, 0.05);
  block(root, 0.45, 0.04, 0.55, "#8a9a9a", -31.45, 0.88, 10.5, 0.01);
  for (let i = 0; i < 4; i++) cylinder(root, 0.13, 0.025, C.cream, -31.5, 0.91 + i * 0.03, 11.0, 14);
  mug(root, -31.3, 0.9, 10.2, PALETTE.steel, 2);
  solid(ctx, -31.45, 10.6, 0.75, 1.05);
  // Étagère murale à tasses.
  block(root, 0.2, 0.04, 2.6, C.wood, -31.75, 1.3, 8.8, 0.01);
  for (let i = 0; i < 6; i++) mug(root, -31.72, 1.34, 7.8 + i * 0.4, [C.cream, C.mustard, C.teal][i % 3], 0);
  // Pile de conserves en pyramide et caisses.
  for (let layer = 0; layer < 4; layer++) {
    for (let k = 0; k < 4 - layer; k++) for (let j = 0; j < 2; j++) {
      cylinder(root, 0.09, 0.17, [PALETTE.rustLight, C.mustard, C.olive, C.cream][(k + layer) % 4], -31.15 + j * 0.19, layer * 0.175, 12.3 + k * 0.19 + layer * 0.095, 12);
    }
  }
  solid(ctx, -31.05, 12.6, 0.5, 0.85);
  crate(root, -30.75, 14.5, 0.6, 0.3);
  crate(root, -31.35, 15.3, 0.55, -0.1);
  solid(ctx, -31.0, 14.9, 1.2, 1.5);
  // Longues tables.
  cafeTable(ctx, -25.5, -14.0, 9.4, 31);
  cafeTable(ctx, -30.0, -22.8, 18.4, 32);
  cafeTable(ctx, -17.2, -12.4, 18.4, 33);
  // Chariot de plateaux sales et plante en pot qui s'accroche.
  const trolley = group(root, -13, 15.8, 0.2);
  for (const y of [0.15, 0.5, 0.85]) block(trolley, 0.9, 0.04, 0.55, PALETTE.steel, 0, y, 0, 0.01);
  for (const [sx, sz] of [[-0.42, -0.25], [0.42, -0.25], [-0.42, 0.25], [0.42, 0.25]]) block(trolley, 0.04, 0.9, 0.04, PALETTE.steelDark, sx, 0, sz, 0.01);
  for (let i = 0; i < 5; i++) block(trolley, 0.42, 0.03, 0.3, i % 2 ? C.teal : "#8a9a7e", (i % 2) * 0.2 - 0.1, 0.89 + i * 0.03, 0, 0.01);
  for (let i = 0; i < 3; i++) mug(trolley, -0.25 + i * 0.2, 0.54, 0.05, [C.cream, C.mustard, C.brick][i]);
  solid(ctx, -13, 15.8, 1.0, 0.75);
  cylinder(root, 0.22, 0.35, C.brick, -11.6, 0, 19.4, 12);
  ball(root, 0.32, PALETTE.leaf, -11.6, 0.55, 19.4, 1, 0.9, 1);
  ball(root, 0.2, PALETTE.grass, -11.45, 0.78, 19.3);
  solid(ctx, -11.6, 19.4, 0.5, 0.5);
  // Désordre au sol.
  block(root, 0.42, 0.03, 0.3, C.teal, -18.5, 0, 14.2, 0.01).rotation.y = 0.7;
  mug(root, -17.9, 0, 14.5, C.mustard, 1);
  stool(root, -24.6, 15.2, true, 2.2);
  decal(root, blobTexture("puddle"), -16.3, 11.6, 1.2, 0.9, 1.2);
  // Fresque des survivants, ardoise du menu, guirlande.
  panel(root, westMuralTexture(), -19.5, 0.95, 6.19, 2.6, 1.3, 0);
  signBoard(root, "SOUPE DU JOUR\n(encore)", -25.6, 1.12, 6.19, 1.0, 0.5, 0, { bg: "#2f3a2e", fg: C.cream, border: C.wood });
  stringLights(root, -28.2, 6.35, -12.2, 6.35, 1.66, 14);
  ctx.light(-20, 2.3, 13.0, "#ffd39a", 7, 12, 0.2, 24, true);
  ctx.beam(-20, 2.3, 13.0, 1.3, "#ffe6b0");
}

function generatorRoom(ctx: DecorContext): void {
  const root = ctx.root;
  ruin(root, -32, -11, 20, 32, 1411, 1, 0.6);
  // ——— Corps de la génératrice (décor permanent, derrière le pupitre interactif) ———
  const gx = -22.4, gz = 24.15;
  const base = group(root, gx, gz);
  block(base, 3.4, 0.16, 2.05, PALETTE.steelDark, 0, 0, 0, 0.04);
  for (const s of [-1, 1]) block(base, 3.42, 0.06, 0.12, C.mustard, 0, 0.1, s * 0.98, 0.02);
  const shake = group(base, 0, 0);
  const body = group(shake, 0, 0, 0, 0.16);
  block(body, 2.0, 1.15, 1.5, C.olive, -0.35, 0, 0, 0.16);
  block(body, 1.7, 0.36, 1.1, C.mustard, -0.35, 1.13, 0, 0.13);
  for (let i = 0; i < 3; i++) block(body, 0.42, 0.16, 0.8, C.oliveDark, -0.95 + i * 0.6, 1.46, 0, 0.07);
  block(body, 0.45, 1.25, 1.4, C.oliveDark, -1.55, 0, 0, 0.09);
  for (let i = 0; i < 6; i++) block(body, 0.03, 0.06, 1.2, C.charcoal, -1.79, 0.2 + i * 0.16, 0, 0.01);
  diskX(body, 0.5, 0.6, C.mustard, 0.95, 0.65, 0);
  diskX(body, 0.52, 0.06, C.mustardDark, 0.7, 0.65, 0);
  // Volant d'inertie
  const wheel = group(body, 1.4, 0, 0, 0.75);
  diskX(wheel, 0.68, 0.12, PALETTE.steelDark, 0, 0, 0);
  const rim = mesh(geo("fly-rim", () => new TorusGeometry(0.68, 0.07, 8, 24)), toon(C.mustard), 0, 0, 0);
  rim.rotation.y = Math.PI / 2;
  wheel.add(rim);
  diskX(wheel, 0.15, 0.26, C.charcoal, 0, 0, 0);
  for (let i = 0; i < 4; i++) block(wheel, 0.05, 1.28, 0.08, C.mustardDark, 0.07, -0.64, 0, 0.02).rotation.x = (i * Math.PI) / 4;
  ball(wheel, 0.08, C.brick, 0.1, 0.52, 0);
  // Cadrans en façade
  block(body, 1.0, 0.42, 0.05, C.cream, -0.65, 0.55, 0.76, 0.03);
  const needles: Group[] = [];
  for (let i = 0; i < 3; i++) {
    const x = -1.0 + i * 0.33;
    diskZ(body, 0.13, 0.04, C.charcoal, x, 0.76, 0.79);
    diskZ(body, 0.11, 0.03, "#f6efd9", x, 0.76, 0.81);
    const pivot = group(body, x, 0.83, 0, 0.76);
    block(pivot, 0.015, 0.09, 0.01, PALETTE.danger, 0, 0, 0, 0.004);
    pivot.rotation.z = 1.1;
    needles.push(pivot);
  }
  // Logements des 3 pièces : vides avant, engrenages dorés après.
  const gears: Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const x = -1.0 + i * 0.33;
    ring(body, 0.1, 0.03, C.charcoal, x, 0.3, 0.76, false);
    const gear = diskZ(body, 0.09, 0.06, toon(C.mustard, { emissive: C.mustard, emissiveIntensity: 0.5 }), x, 0.3, 0.78);
    gear.visible = false;
    gears.push(gear);
  }
  panel(body, signTexture("DIESEL 8 · 40 kVA", { bg: C.cream, fg: PALETTE.outline, width: 384, height: 64 }), -0.35, 1.32, 0.57, 0.9, 0.15, 0);
  // Pot d'échappement
  cylinder(body, 0.15, 0.5, PALETTE.rust, -0.95, 1.5, -0.45, 12);
  rod(body, [-0.95, 1.9, -0.45], [-0.95, 2.45, -0.45], 0.07, C.charcoal);
  block(body, 0.2, 0.03, 0.2, C.charcoal, -0.95, 2.45, -0.45, 0.01).rotation.z = 0.4;
  const puffOrigin = new Vector3(gx - 0.95, 2.75, gz - 0.45);
  const puffs: Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const puff = new Mesh(geo("puff", () => new SphereGeometry(1, 10, 8)), new MeshBasicMaterial({ color: "#efe7d6", transparent: true, opacity: 0, depthWrite: false }));
    puff.visible = false;
    root.add(puff);
    puffs.push(puff);
  }
  solid(ctx, gx, gz, 3.5, 2.1);
  // Durite vers les cuves, gaine vers le pupitre.
  rod(root, [gx - 1.75, 0.15, gz - 0.4], [-30.1, 0.15, gz - 0.4], 0.08, C.leather);
  rod(root, [-21.6, 0.12, gz + 0.9], [-21.75, 0.12, 25.75], 0.06, C.charcoal);
  // Bandes de sécurité et taches d'huile autour du socle.
  hazardStrip(root, gx, 22.85, 4.4, 0.24);
  hazardStrip(root, gx, 26.75, 4.4, 0.24);
  hazardStrip(root, gx - 2.2, 24.8, 3.9, 0.24, Math.PI / 2);
  hazardStrip(root, gx + 2.2, 24.8, 3.9, 0.24, Math.PI / 2);
  decal(root, blobTexture("shadow"), -21.4, 25.6, 1.6, 1.2, 0.3);
  decal(root, blobTexture("scorch"), -23.6, 23.0, 1.0, 0.8, 1.1);
  decal(root, blobTexture("shadow"), -26.5, 27.5, 1.3, 1.0, 2.0);
  // Cuves de gazole (ouest).
  for (const [z, color] of [[21.3, C.mustard], [23.25, C.olive]] as [number, string][]) {
    const tank = group(root, -30.95, z);
    for (const [sx, sz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) block(tank, 0.1, 0.3, 0.1, C.charcoal, sx, 0, sz, 0.02);
    cylinder(tank, 0.75, 1.5, color, 0, 0.25, 0, 18);
    ball(tank, 0.75, color, 0, 1.75, 0, 1, 0.38, 1);
    for (const y of [0.55, 1.4]) ring(tank, 0.755, 0.035, C.charcoal, 0, y, 0);
    ring(tank, 0.13, 0.025, PALETTE.danger, 0.55, 0.6, 0.5, false).rotation.y = 0.8;
    panel(tank, signTexture("GAZOLE", { bg: C.cream, fg: PALETTE.outline, width: 256, height: 80 }), 0.4, 1.0, 0.66, 0.6, 0.19, 0.55);
  }
  solid(ctx, -30.95, 22.28, 1.6, 3.6);
  for (let i = 0; i < 2; i++) {
    block(root, 0.32, 0.42, 0.16, PALETTE.danger, -29.6, 0, 20.6 + i * 0.25, 0.04);
    block(root, 0.1, 0.06, 0.06, C.charcoal, -29.6, 0.42, 20.6 + i * 0.25, 0.02);
  }
  solid(ctx, -29.6, 20.73, 0.4, 0.5);
  // Tuyauteries le long des murs nord et sud.
  for (const [x0, x1] of [[-31.6, -21.3], [-18.7, -11.4]]) {
    rod(root, [x0, 1.25, 20.33], [x1, 1.25, 20.33], 0.08, C.olive);
    rod(root, [x0, 0.95, 20.3], [x1, 0.95, 20.3], 0.055, PALETTE.rust);
    for (let x = x0 + 0.5; x < x1; x += 2.5) block(root, 0.08, 0.5, 0.12, PALETTE.steelDark, x, 0.85, 20.25, 0.01);
  }
  rod(root, [-31.6, 0.55, 31.67], [-11.4, 0.55, 31.67], 0.08, C.mustard);
  rod(root, [-31.6, 0.85, 31.7], [-11.4, 0.85, 31.7], 0.05, PALETTE.steel);
  // Pupitre de contrôle (nord-est) : écran qui passe du rouge au vert.
  block(root, 2.0, 0.95, 0.7, PALETTE.steelDark, -13.5, 0, 20.55, 0.05);
  const desk = block(root, 2.0, 0.08, 0.5, C.olive, -13.5, 0.95, 20.6, 0.02);
  desk.rotation.x = 0.35;
  const screen = new MeshBasicMaterial({ color: "#ff5a36" });
  for (const x of [-14.1, -12.9]) {
    block(root, 0.55, 0.42, 0.1, C.charcoal, x, 1.02, 20.3, 0.03);
    root.add(mesh(geo("screen", () => new PlaneGeometry(0.44, 0.3)), screen, x, 1.23, 20.36, false));
  }
  for (let i = 0; i < 6; i++) root.add(mesh(geo("btn", () => new SphereGeometry(0.035, 8, 6)), glow([PALETTE.danger, C.mustard, "#8fe08a"][i % 3]), -14.2 + i * 0.25, 1.02, 20.72, false));
  rod(root, [-12.7, 0.95, 20.75], [-12.6, 1.3, 20.9], 0.02, C.charcoal, 5);
  ball(root, 0.05, PALETTE.danger, -12.6, 1.3, 20.9);
  solid(ctx, -13.5, 20.55, 2.1, 0.8);
  cylinder(root, 0.18, 0.06, C.brick, -13.6, 0.46, 21.6, 12);
  cylinder(root, 0.035, 0.46, C.charcoal, -13.6, 0, 21.6, 6);
  mug(root, -14.35, 0.98, 20.9, C.cream, 0.5);
  // Gyrophares d'urgence (matériau partagé, recoloré selon l'état).
  const beacon = new MeshBasicMaterial({ color: "#ff3a24" });
  for (const [x, z] of [[-26.0, 20.3], [-16.5, 20.3], [-12.0, 31.7]]) {
    block(root, 0.18, 0.12, 0.14, C.charcoal, x, 1.3, z, 0.02);
    root.add(mesh(geo("beacon", () => new SphereGeometry(0.1, 10, 8)), beacon, x, 1.47, z, false));
    ring(root, 0.105, 0.012, C.charcoal, x, 1.47, z);
  }
  const pool = glowPool(root, -22.2, 25.6, 9, 7, "#ff3a24", 0.35);
  // Pancartes d'état au mur nord.
  const signOff = signBoard(root, "GÉNÉRATRICE\nEN PANNE", -24.3, 1.05, 20.2, 1.2, 0.45, 0, { bg: PALETTE.paper, fg: PALETTE.danger, border: PALETTE.danger });
  const signOn = signBoard(root, "GÉNÉRATRICE\nEN MARCHE", -24.3, 1.05, 20.2, 1.2, 0.45, 0, { bg: C.cream, fg: C.oliveDark, border: C.olive });
  signOn.visible = false;
  // Établi de maintenance : étau, clés, bidons, chiffon.
  block(root, 1.8, 0.08, 0.75, C.wood, -17.5, 0.82, 22.0, 0.02);
  for (const [sx, sz] of [[-0.82, -0.3], [0.82, -0.3], [-0.82, 0.3], [0.82, 0.3]]) block(root, 0.08, 0.82, 0.08, PALETTE.woodDark, -17.5 + sx, 0, 22.0 + sz, 0.01);
  block(root, 1.7, 0.05, 0.6, PALETTE.woodDark, -17.5, 0.25, 22.0, 0.01);
  block(root, 0.22, 0.18, 0.16, C.brick, -18.1, 0.9, 21.9, 0.03);
  block(root, 0.35, 0.03, 0.06, PALETTE.steel, -17.6, 0.9, 22.1, 0.01).rotation.y = 0.4;
  block(root, 0.3, 0.03, 0.05, PALETTE.steel, -17.3, 0.9, 21.85, 0.01).rotation.y = -0.3;
  block(root, 0.25, 0.04, 0.2, C.mustard, -16.9, 0.9, 22.15, 0.02).rotation.y = 0.8;
  cylinder(root, 0.06, 0.13, C.olive, -16.8, 0.9, 21.8, 10);
  for (let i = 0; i < 2; i++) block(root, 0.32, 0.42, 0.16, PALETTE.danger, -17.9 + i * 0.45, 0.3, 22.0, 0.04);
  solid(ctx, -17.5, 22.0, 1.9, 0.85);
  // Fûts de carburant.
  barrel(root, -12.1, 31.3, C.olive);
  barrel(root, -12.8, 31.4, C.mustard);
  barrel(root, -12.2, 30.6, C.brick);
  barrel(root, -13.5, 31.35, C.olive);
  solid(ctx, -12.8, 31.0, 2.2, 1.5);
  barrel(root, -14.95, 30.9, PALETTE.rust, true, 0.4);
  decal(root, blobTexture("shadow"), -14.2, 30.6, 1.8, 1.2, 0.5);
  solid(ctx, -14.6, 30.9, 1.0, 0.75);
  barrel(root, -31.25, 31.25, C.mustard);
  barrel(root, -30.55, 31.35, C.olive);
  solid(ctx, -30.9, 31.3, 1.4, 0.8);
  gen = { powered: false, shake, wheel, needles, gears, puffs, puffOrigin, beacon, pool, screen, signOff, signOn };
  ctx.light(-22.4, 2.4, 27.0, "#ff7a45", 7, 10, 0.55, 26, false);
  ctx.dust(-22.4, 2.2, 25.8);
}

export function decorateWest(ctx: DecorContext): void {
  gen = null;
  slotLed = null;
  keycard = null;
  hollowHints = [];
  onWorldRefresh(refreshWest);
  westCorridor(ctx);
  dorms(ctx);
  secretRoom(ctx);
  storage(ctx);
  cafeteria(ctx);
  generatorRoom(ctx);
  ctx.animate(animateWest);
}

/** Modèles des objets interactifs propres à cette zone, par identifiant (voir game/level.ts). */
export const WEST_MODELS: Record<string, ModelBuilder> = {
  // Pupitre d'alimentation devant la génératrice : 3 logements vides, voyant rouge.
  generator: (def) => {
    const g = new Group();
    g.position.set(def.x, 0, def.z);
    block(g, 1.0, 0.9, 0.42, C.oliveDark, 0, 0, 0, 0.07);
    block(g, 1.06, 0.06, 0.46, C.mustard, 0, 0.02, 0, 0.02);
    const top = group(g, 0, 0, 0, 0.92);
    top.rotation.x = 0.45;
    block(top, 1.08, 0.08, 0.56, C.mustard, 0, 0, 0, 0.03);
    for (let i = 0; i < 3; i++) {
      const x = -0.33 + i * 0.33;
      block(top, 0.2, 0.03, 0.2, C.charcoal, x, 0.07, 0.02, 0.01);
      ring(top, 0.12, 0.025, PALETTE.steelDark, x, 0.09, 0.02);
    }
    slotLed = mesh(new SphereGeometry(0.045, 8, 6), glow(PALETTE.danger), 0.44, 0.1, -0.18, false);
    top.add(slotLed);
    panel(g, signTexture("INSÉRER\n3 PIÈCES", { bg: C.cream, fg: PALETTE.outline, border: C.mustard, width: 256, height: 128 }), 0, 0.55, 0.215, 0.5, 0.25, 0);
    return { group: g, height: 1.6 };
  },
  // Clé d'accès moutarde, posée sur un napperon tricoté au sommet d'une caisse.
  keycard: (def) => {
    const g = new Group();
    g.position.set(def.x, 0, def.z);
    crate(g, 0, 0, 0.55, 0.3);
    const doily = block(g, 0.42, 0.02, 0.42, "#ffffff", 0, 0.55, 0, 0.008);
    doily.material = knit(C.cream, C.mustard);
    block(g, 0.12, 0.06, 0.1, C.leather, 0, 0.57, -0.02, 0.02);
    const holder = group(g, 0, 0, 0, 0.66);
    holder.rotation.x = -0.35;
    block(holder, 0.32, 0.21, 0.025, C.mustard, 0, 0, 0, 0.02).material = toon(C.mustard, { emissive: C.mustard, emissiveIntensity: 0.65 });
    block(holder, 0.32, 0.04, 0.03, C.charcoal, 0, 0.14, 0, 0.005);
    block(holder, 0.07, 0.055, 0.03, C.cream, -0.08, 0.05, 0.004, 0.01);
    keycard = holder;
    return { group: g, height: 1.0 };
  },
};
