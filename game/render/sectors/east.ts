// Décor de l'aile est de SILLO 8, étage 1 : couloir est, salle de contrôle, infirmerie, atelier et serre.
// Style « jouet en pâte » : formes rondes et trapues, moutarde, olive, cuir, crème. La serre est la pièce
// la plus douce : la nature reprend ses droits.
import {
  CatmullRomCurve3, CircleGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry,
  SphereGeometry, TorusGeometry, TubeGeometry, Vector3, type Material, type Object3D, type Texture,
} from "three";
import type { Box } from "../../collision";
import type { SiloState } from "../../state";
import { onWorldRefresh, ruin, type DecorContext, type ModelBuilder, type WorldView } from "../world";
import { decorateStory } from "../storyProps";
import { glow, toon } from "../toon";
import { PALETTE } from "../palette";
import { block, can, crate, cylinder, decal, grass, mesh, overgrowth, panel, rubble, signBoard } from "../props";
import {
  blobTexture, eastCrossTexture, eastMapTexture, eastNoteTexture, eastPegboardTexture, eastRadarTexture,
  eastScreenTexture, eastSignalTexture, eastStaticTexture, hazardTexture, paperTexture, rng,
} from "../textures";

// Teintes de la fiche personnage.
const MUSTARD = "#d8a43a";
const OLIVE = "#6b7550";
const OLIVE_DARK = "#556045";
const LEATHER = "#6a4528";
const LEATHER_LIGHT = "#7a4a2a";
const CREAM = "#e9dcc0";
const CREAM_DARK = "#cbbd98";
const CHARCOAL = "#3a3633";
const SOIL = "#5a3d24";
const LEAVES = ["#6f9a3c", "#5e9b3a", "#7fae4a", "#4f7d34", "#8cc152"];

// ——— État vivant (écrans, fente du module) : remis à zéro à chaque construction du monde ———

interface Live {
  /** Écrans des pupitres et du mur : neige/noir sans courant, bleus avec. */
  screens: { mesh: Mesh; seed: number; big: boolean }[];
  /** Écrans de la console radio : réveillés par la réparation. */
  comms: Mesh[];
  slot: Mesh | null;
  module: Mesh | null;
  powered: boolean;
  repaired: boolean;
}
const live: Live = { screens: [], comms: [], slot: null, module: null, powered: false, repaired: false };

const screenMaterials = new Map<string, MeshBasicMaterial>();
function screenMaterial(texture: Texture, tint = "#ffffff"): MeshBasicMaterial {
  const key = texture.uuid + tint;
  let material = screenMaterials.get(key);
  if (!material) {
    material = new MeshBasicMaterial({ map: texture, color: tint });
    screenMaterials.set(key, material);
  }
  return material;
}
const DARK_SCREEN = "#1f2a2e";

function refreshEast(_view: WorldView, state: SiloState): void {
  live.powered = state.has("generator_powered");
  live.repaired = state.has("comms_repaired");
  live.screens.forEach(({ mesh: m, seed, big }, i) => {
    if (live.powered) m.material = screenMaterial(big ? eastRadarTexture(seed) : eastScreenTexture(seed));
    else m.material = i % 3 === 0 ? screenMaterial(eastStaticTexture(), "#9aa6a2") : glow(DARK_SCREEN);
  });
  for (const m of live.comms) {
    m.material = live.repaired ? screenMaterial(eastSignalTexture()) : live.powered ? screenMaterial(eastStaticTexture(), "#b9c4bf") : glow(DARK_SCREEN);
  }
  if (live.slot) live.slot.material = state.has("radio_module") && !live.repaired ? glow("#ffd36b") : live.repaired ? glow("#8ff0a8") : toon(CHARCOAL);
  if (live.module) live.module.visible = live.repaired;
}

// ——— Outils ———

function place(parent: Object3D, x: number, z: number, yaw = 0, y = 0): Group {
  const g = new Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  parent.add(g);
  return g;
}

/** Collision d'une boîte w × d tournée de `yaw` (boîte englobante alignée). */
function solid(ctx: DecorContext, x: number, z: number, w: number, d: number, yaw = 0): void {
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const hx = (c * w + s * d) / 2;
  const hz = (s * w + c * d) / 2;
  const box: Box = { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz };
  ctx.colliders.push(box);
}

function ball(parent: Object3D, color: string | Material, x: number, y: number, z: number, sx: number, sy = sx, sz = sx): Mesh {
  const m = mesh(new SphereGeometry(1, 12, 9), typeof color === "string" ? toon(color) : color, x, y, z);
  m.scale.set(sx, sy, sz);
  parent.add(m);
  return m;
}

/** Écran plat face à +z local. */
function screen(parent: Object3D, x: number, y: number, z: number, w: number, h: number, seed: number, big = false): Mesh {
  const m = mesh(new PlaneGeometry(w, h), glow(DARK_SCREEN), x, y, z, false);
  parent.add(m);
  live.screens.push({ mesh: m, seed, big });
  return m;
}

/** Câble posé au sol qui serpente entre des points (x, z). */
function floorCable(parent: Object3D, points: [number, number][], color: string = CHARCOAL, radius = 0.035): void {
  const curve = new CatmullRomCurve3(points.map(([x, z]) => new Vector3(x, radius, z)));
  parent.add(mesh(new TubeGeometry(curve, points.length * 8, radius, 5, false), toon(color), 0, 0, 0, false));
}

/** Tasse de café (avec anse). */
function mug(parent: Object3D, x: number, y: number, z: number, color: string = CREAM): void {
  cylinder(parent, 0.05, 0.1, color, x, y, z, 10);
  const handle = mesh(new TorusGeometry(0.03, 0.01, 5, 8), toon(color), x + 0.055, y + 0.05, z, false);
  parent.add(handle);
  cylinder(parent, 0.042, 0.005, LEATHER, x, y + 0.092, z, 10);
}

/** Papiers posés à plat sur une surface. */
function papers(parent: Object3D, x: number, y: number, z: number, count: number, seed: number): void {
  const r = rng(seed);
  for (let i = 0; i < count; i++) decal(parent, paperTexture(1 + ((seed + i) % 4)), x + (r() - 0.5) * 0.3, z + (r() - 0.5) * 0.2, 0.2, 0.27, r() * 6, y + 0.003 + i * 0.002);
}

/** Note manuscrite punaisée sur un mur ou un panneau (décor, non interactive). */
function note(parent: Object3D, text: string, x: number, y: number, z: number, facing: number, tilt = 0): void {
  const m = panel(parent, eastNoteTexture(text), x, y, z, 0.26, 0.33, facing);
  m.rotation.z = tilt;
}

// ——— Salle de contrôle ———

/** Pupitre : caisson olive, plateau crème, pupitre incliné et deux moniteurs face à +z local. */
function consoleDesk(ctx: DecorContext, x: number, z: number, yaw: number, seed: number): void {
  const r = rng(seed);
  const g = place(ctx.root, x, z, yaw);
  block(g, 1.5, 0.72, 0.72, OLIVE, 0, 0, -0.06, 0.07);
  block(g, 1.42, 0.12, 0.05, OLIVE_DARK, 0, 0.05, 0.31, 0.02);
  block(g, 1.62, 0.07, 0.92, CREAM, 0, 0.72, 0.02, 0.035);
  const desk = block(g, 1.3, 0.07, 0.34, "#4f5741", 0, 0.78, 0.22, 0.025);
  desk.rotation.x = 0.22;
  const colors = [MUSTARD, "#c8453a", "#6de0ce", CREAM];
  for (let i = 0; i < 9; i++) block(g, 0.07, 0.04, 0.07, colors[Math.floor(r() * 4)], -0.5 + i * 0.12, 0.84, 0.22 + (i % 2) * 0.06, 0.015);
  for (const side of [-1, 1]) {
    const mon = place(g, side * 0.37, -0.2, -side * 0.12, 0.79);
    block(mon, 0.62, 0.48, 0.42, CREAM_DARK, 0, 0, 0, 0.09);
    block(mon, 0.2, 0.06, 0.2, OLIVE_DARK, 0, -0.04, 0, 0.02);
    screen(mon, 0, 0.25, 0.212, 0.5, 0.36, seed * 2 + side);
  }
  if (r() < 0.7) mug(g, 0.62 * (r() < 0.5 ? -1 : 1), 0.79, 0.28, r() < 0.5 ? MUSTARD : CREAM);
  papers(g, -0.1, 0.79, 0.3, 2, seed);
  solid(ctx, x, z, 1.62, 0.95, yaw);
}

/** Chaise pivotante : piétement étoile, assise en cuir. Dossier vers −z local. */
function swivelChair(parent: Object3D, x: number, z: number, yaw: number, tipped = false): void {
  const g = place(parent, x, z, yaw);
  for (let i = 0; i < 5; i++) {
    const leg = block(g, 0.05, 0.04, 0.3, CHARCOAL, 0, 0.04, 0, 0.015);
    leg.position.set(Math.sin((i / 5) * Math.PI * 2) * 0.13, 0.06, Math.cos((i / 5) * Math.PI * 2) * 0.13);
    leg.rotation.y = (i / 5) * Math.PI * 2;
  }
  cylinder(g, 0.03, 0.38, CHARCOAL, 0, 0.06, 0, 8);
  block(g, 0.5, 0.12, 0.48, LEATHER_LIGHT, 0, 0.42, 0, 0.05);
  block(g, 0.46, 0.5, 0.1, LEATHER, 0, 0.56, -0.22, 0.05);
  if (tipped) {
    g.rotation.set(Math.PI / 2 - 0.1, yaw, 0.2);
    g.position.y = 0.26;
  }
}

/** Banc d'écrans muraux sur pieds, face au sud. */
function monitorBank(ctx: DecorContext, x0: number, x1: number, z: number, seed: number): void {
  const w = x1 - x0;
  const g = place(ctx.root, (x0 + x1) / 2, z);
  block(g, w, 0.9, 0.5, OLIVE_DARK, 0, 0, 0, 0.06);
  block(g, w + 0.06, 0.07, 0.56, CREAM, 0, 0.9, 0, 0.03);
  block(g, w, 1.6, 0.22, CHARCOAL, 0, 0.97, -0.12, 0.05);
  block(g, w + 0.1, 0.12, 0.3, MUSTARD, 0, 2.57, -0.12, 0.04);
  const cols = Math.max(2, Math.round(w / 1.6));
  const cw = (w - 0.2) / cols;
  for (let c = 0; c < cols; c++) {
    for (let row = 0; row < 2; row++) {
      const cx = -w / 2 + 0.1 + cw * (c + 0.5);
      block(g, cw - 0.08, 0.68, 0.08, CREAM_DARK, cx, 1.05 + row * 0.74, 0.0, 0.04);
      screen(g, cx, 1.39 + row * 0.74, 0.045, cw - 0.2, 0.54, seed + c * 2 + row, true);
    }
  }
  // Boutons en façade du bas.
  for (let i = 0; i < Math.round(w * 3); i++) block(g, 0.08, 0.08, 0.04, i % 4 === 0 ? MUSTARD : CREAM_DARK, -w / 2 + 0.25 + i * 0.32, 0.45 + (i % 2) * 0.16, 0.26, 0.02);
  solid(ctx, (x0 + x1) / 2, z, w, 0.62);
}

/** Baie de serveurs contre le mur est, façade vers −x. */
function serverRack(ctx: DecorContext, x: number, z: number, seed: number): void {
  const r = rng(seed);
  const g = place(ctx.root, x, z, -Math.PI / 2);
  block(g, 0.8, 1.9, 0.62, CHARCOAL, 0, 0, 0, 0.06);
  block(g, 0.84, 0.08, 0.66, MUSTARD, 0, 1.9, 0, 0.03);
  for (let i = 0; i < 6; i++) {
    block(g, 0.68, 0.2, 0.04, "#4a4541", 0, 0.2 + i * 0.27, 0.31, 0.02);
    for (let k = 0; k < 3; k++) {
      const led = mesh(new SphereGeometry(0.02, 6, 4), glow(r() < 0.3 ? "#ffb35a" : r() < 0.5 ? "#8ff0a8" : "#5a5550"), -0.25 + k * 0.06, 0.3 + i * 0.27, 0.34, false);
      g.add(led);
    }
  }
  solid(ctx, x, z, 0.8, 0.62, -Math.PI / 2);
}

function mapTable(ctx: DecorContext, x: number, z: number): void {
  const g = place(ctx.root, x, z, 0.08);
  for (const [lx, lz] of [[-0.95, -0.5], [0.95, -0.5], [-0.95, 0.5], [0.95, 0.5]]) block(g, 0.1, 0.84, 0.1, LEATHER, lx, 0, lz, 0.02);
  block(g, 2.2, 0.08, 1.3, LEATHER_LIGHT, 0, 0.84, 0, 0.03);
  const map = decal(g, eastMapTexture(), 0, 0, 1.9, 1.1, 0.04, 0.925);
  map.renderOrder = 2;
  for (const [px, pz, c] of [[0.55, -0.2, "#c8453a"], [-0.5, 0.25, "#c8453a"], [0.1, 0.1, MUSTARD]] as const) {
    cylinder(g, 0.012, 0.08, CHARCOAL, px, 0.92, pz, 5);
    ball(g, c, px, 1.0, pz, 0.035);
  }
  mug(g, -0.85, 0.92, -0.4, MUSTARD);
  mug(g, 0.8, 0.92, 0.42);
  papers(g, 0.7, 0.92, -0.35, 2, 41);
  // Lampe torche oubliée sur le plan.
  const torch = mesh(new CylinderGeometry(0.035, 0.045, 0.24, 8), toon(OLIVE_DARK), -0.3, 0.97, -0.45);
  torch.rotation.z = Math.PI / 2;
  g.add(torch);
  swivelChair(ctx.root, x - 0.4, z + 1.05, Math.PI);
  swivelChair(ctx.root, x + 1.5, z - 0.2, -Math.PI / 2 - 0.4);
  solid(ctx, x, z, 2.3, 1.4, 0.08);
}

/** Corps persistant de la console radio : caisson, tour d'écrans, fente du module, mât d'antenne. */
function commsBody(ctx: DecorContext): void {
  const g = place(ctx.root, 18, -21.2);
  block(g, 3.2, 1.0, 1.15, OLIVE_DARK, 0, 0, 0, 0.08);
  block(g, 3.3, 0.08, 1.22, MUSTARD, 0, 1.0, 0, 0.03);
  block(g, 2.7, 1.05, 0.5, OLIVE, 0, 1.08, -0.3, 0.07);
  block(g, 2.8, 0.1, 0.56, CREAM, 0, 2.13, -0.3, 0.03);
  for (const side of [-1, 1]) {
    block(g, 1.06, 0.74, 0.06, CHARCOAL, side * 0.66, 1.22, -0.04, 0.03);
    const m = mesh(new PlaneGeometry(0.92, 0.6), glow(DARK_SCREEN), side * 0.66, 1.59, -0.005, false);
    g.add(m);
    live.comms.push(m);
  }
  // Fente du module radio (s'illumine quand le module est prêt).
  block(g, 0.62, 0.05, 0.42, CHARCOAL, 0, 1.06, 0.3, 0.02);
  live.slot = mesh(new TorusGeometry(0.22, 0.03, 6, 4), toon(CHARCOAL), 0, 1.1, 0.3, false);
  live.slot.rotation.set(Math.PI / 2, 0, Math.PI / 4);
  live.slot.scale.set(1.3, 0.9, 1);
  g.add(live.slot);
  live.module = block(g, 0.4, 0.22, 0.28, MUSTARD, 0, 1.08, 0.3, 0.05);
  live.module.visible = false;
  hazard(g, 0, 0.6, 0.578, 3.0, 0.12);
  signBoard(g, "RADIO · ÉMETTEUR", 0, 0.82, 0.58, 1.1, 0.18, 0, { bg: CREAM, fg: LEATHER });
  // Mât d'antenne et petite parabole.
  const mast = place(g, 1.1, -0.3, 0, 2.2);
  cylinder(mast, 0.045, 2.2, CHARCOAL, 0, 0, 0, 8);
  for (let i = 0; i < 3; i++) {
    const bar = cylinder(mast, 0.02, 0.6 - i * 0.15, "#8a8378", 0, 0.7 + i * 0.5, 0, 6);
    bar.rotation.z = Math.PI / 2;
  }
  const tip = ball(mast, glow("#ff6a4a"), 0, 2.25, 0, 0.06);
  const dish = mesh(new SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), toon(CREAM, { side: DoubleSide }), -0.95, 2.55, -0.3);
  dish.rotation.x = 0.9;
  g.add(dish);
  cylinder(g, 0.03, 0.35, CHARCOAL, -0.95, 2.18, -0.3, 6);
  // Faisceau de câbles vers la façade interactive.
  floorCable(ctx.root, [[17.6, -20.6], [17.4, -20.2], [17.7, -19.9]], LEATHER, 0.04);
  floorCable(ctx.root, [[18.6, -20.6], [18.8, -20.1], [18.4, -19.9]], CHARCOAL, 0.03);
  ctx.animate((_dt, time) => {
    const on = live.powered && Math.sin(time * 3) > 0.2;
    tip.scale.setScalar(on ? 0.075 : 0.045);
    tip.material = glow(on ? "#ff6a4a" : "#5a2a22");
  });
  solid(ctx, 18, -21.2, 3.3, 1.25);
  note(g, "Fréquence 147.3\nmodule HS ->\nvoir l'atelier", -1.45, 0.62, 0.585, 0, 0.05);
}

function hazard(parent: Object3D, x: number, y: number, z: number, w: number, h: number): void {
  const texture = hazardTexture().clone();
  texture.needsUpdate = true;
  texture.repeat.set(w / 0.9, 1);
  panel(parent, texture, x, y, z, w, h, 0);
}

function decorateControl(ctx: DecorContext): void {
  const { root } = ctx;
  commsBody(ctx);
  monitorBank(ctx, 9.4, 14.8, -21.45, 1);
  monitorBank(ctx, 21.2, 25.6, -21.45, 4);
  // Pupitres en arc autour de la radio, écrans tournés vers le sud.
  const arc = (radius: number, deg: number) => {
    const t = (deg * Math.PI) / 180;
    return [18 + radius * Math.sin(t), -24.4 + radius * Math.cos(t), t] as const;
  };
  let seed = 11;
  for (const deg of [-50, -28, 28, 50]) {
    const [x, z, t] = arc(6.8, deg);
    consoleDesk(ctx, x, z, t, seed++);
  }
  for (const deg of [-48, -30]) {
    const [x, z, t] = arc(9.6, deg);
    consoleDesk(ctx, x, z, t, seed++);
  }
  // Chaises pivotantes devant les pupitres, dossier vers le sud.
  for (const [radius, deg] of [[8.0, -50], [8.0, -28], [10.8, -48], [10.8, -30], [8.0, 50]] as const) {
    const [x, z, t] = arc(radius, deg);
    swivelChair(root, x, z, t + Math.PI + (deg % 7) * 0.05);
  }
  swivelChair(root, 23.6, -13.2, 1.2, true);
  // Câbles au sol, des pupitres vers la radio.
  floorCable(root, [[12.6, -19], [14, -20.2], [16.2, -20.4]], CHARCOAL);
  floorCable(root, [[14.8, -17.6], [15.8, -18.6], [16.4, -20.1]], LEATHER);
  floorCable(root, [[21.2, -17.6], [20.4, -18.9], [19.6, -20.4]], CHARCOAL);
  floorCable(root, [[23.2, -19.4], [21.8, -20.6], [19.7, -20.9]], OLIVE_DARK);
  floorCable(root, [[10.9, -17.2], [10.2, -18.8], [10.6, -20.8]], CHARCOAL, 0.03);
  // Baies de serveurs, armoires et casiers.
  // Les baies du fond ont laissé la place au local technique (storyProps.ts).
  for (const [i, z] of [-17.0, -16.1, -14.4, -13.4].entries()) serverRack(ctx, 29.45, z, 70 + i);
  for (let i = 0; i < 3; i++) {
    block(root, 0.6, 1.3, 0.5, i === 1 ? OLIVE : CREAM_DARK, 12.3 + i * 0.64, 0, -8.45, 0.05);
    block(root, 0.5, 0.05, 0.04, CHARCOAL, 12.3 + i * 0.64, 1.0, -8.72, 0.01);
  }
  solid(ctx, 12.94, -8.45, 1.95, 0.55);
  crate(root, 28.6, -9.0, 0.6, 0.3);
  crate(root, 28.0, -9.1, 0.45, -0.2);
  solid(ctx, 28.4, -9.05, 1.4, 0.75);
  mapTable(ctx, 25.6, -11.2);
  // Plantes en pot sur les casiers (des survivants ont voulu égayer la salle).
  cylinder(root, 0.13, 0.2, LEATHER_LIGHT, 13.58, 1.3, -8.45, 10);
  ball(root, LEAVES[2], 13.58, 1.62, -8.45, 0.2, 0.18, 0.2);
  // Moniteur tombé, cartons et classeurs éventrés.
  const fallen = place(root, 15.8, -11.6, 0.7);
  block(fallen, 0.62, 0.48, 0.42, CREAM_DARK, 0, 0, 0, 0.09).rotation.x = -1.2;
  fallen.position.y = 0.1;
  for (const [x, z, yaw, s] of [[10.4, -11.0, 0.3, 0.5], [10.9, -10.2, -0.2, 0.4], [27.4, -14.6, 0.5, 0.45]] as const) {
    const box = place(root, x, z, yaw);
    block(box, s, s * 0.7, s * 0.8, "#b8955f", 0, 0, 0, 0.02);
    block(box, s + 0.02, 0.04, 0.08, "#c9a874", 0, s * 0.7, 0, 0.01);
  }
  papers(root, 10.6, 0, -11.8, 4, 61);
  papers(root, 22.5, 0, -12.2, 3, 62);
  papers(root, 16.6, 0, -10.6, 3, 63);
  decal(root, blobTexture("puddle"), 24.6, -15.2, 0.5, 0.35, 1.2).renderOrder = 1;
  note(root, "Canal 2 :\nréservé\nDr O. / Sgt B.", 9.25, 1.2, -8.18, Math.PI, 0.06);
  ruin(root, 7, 30, -22, -8, 801, 2, 0.8);
  rubble(root, 28.4, -16.5, 6, 812, 0.5);
  decal(root, blobTexture("puddle"), 15.2, -11, 1.6, 1.1, 0.4);
  // Lumières : écrans bleutés et néon fatigué.
  ctx.light(18, 2.6, -17.2, "#8fcfff", 8, 11, 0.25, 21);
  ctx.light(11.5, 2.4, -12.5, "#ffe2b0", 5, 8, 0.6, 22);
  ctx.dust(18, 2.2, -15);
}

// ——— Couloir est ———

function decorateCorridor(ctx: DecorContext): void {
  const { root } = ctx;
  // Conduites le long du mur est, coupées par la porte de l'infirmerie.
  for (const [z0, z1] of [[-7.8, -1.5], [1.5, 7.8]]) {
    for (const [y, color, r] of [[1.22, LEATHER_LIGHT, 0.07], [1.42, OLIVE, 0.05]] as const) {
      const pipe = mesh(new CylinderGeometry(r, r, z1 - z0, 10), toon(color), 9.68, y, (z0 + z1) / 2);
      pipe.rotation.x = Math.PI / 2;
      root.add(pipe);
    }
    for (let z = z0 + 0.5; z < z1; z += 1.6) block(root, 0.12, 0.34, 0.08, CHARCOAL, 9.78, 1.12, z, 0.02);
  }
  const wheel = mesh(new TorusGeometry(0.13, 0.03, 6, 12), toon("#c8453a"), 9.55, 1.22, -4.2);
  wheel.rotation.y = Math.PI / 2;
  root.add(wheel);
  decal(root, blobTexture("puddle"), 9.1, -4.1, 0.9, 0.7, 0.3);
  decal(root, blobTexture("rust"), 9.5, 4.6, 0.8, 1.2, 0.1);
  // Tableau d'affichage sur le mur ouest.
  const board = place(root, 7.2, -4.2, Math.PI / 2);
  block(board, 1.5, 0.95, 0.05, LEATHER_LIGHT, 0, 0.7, 0, 0.02);
  block(board, 1.38, 0.83, 0.03, "#b78b5a", 0, 0.76, 0.02, 0.01);
  note(board, "Chambre 1 :\ncondamnée\n(humidité).\n— Dr O.", -0.4, 1.2, 0.045, 0, -0.05);
  note(board, "Couvre-feu\n22 h", 0.05, 1.18, 0.045, 0, 0.04);
  note(board, "Graines dans\nle bac bleu", 0.45, 1.0, 0.045, 0, -0.08);
  signBoard(board, "AVIS", -0.05, 1.5, 0.05, 0.6, 0.16, 0, { bg: MUSTARD, fg: CHARCOAL });
  signBoard(root, "INFIRMERIE →", 7.17, 1.15, 1.8, 0.9, 0.2, Math.PI / 2, { bg: CREAM, fg: "#c8453a" });
  ruin(root, 7, 10, -8, 8, 820, 0, 0.7);
}

// ——— Infirmerie ———

function cot(ctx: DecorContext, x: number, z: number, yaw: number, blanket: string, seed: number): void {
  const r = rng(seed);
  const g = place(ctx.root, x, z, yaw);
  for (const [lx, lz] of [[-0.4, -0.9], [0.4, -0.9], [-0.4, 0.9], [0.4, 0.9]]) block(g, 0.06, 0.4, 0.06, "#a9b2ad", lx, 0, lz, 0.02);
  block(g, 0.94, 0.06, 2.0, "#a9b2ad", 0, 0.38, 0, 0.02);
  block(g, 0.86, 0.12, 1.9, CREAM, 0, 0.44, 0, 0.05);
  // Tête de lit vers −z local.
  block(g, 0.94, 0.45, 0.06, "#a9b2ad", 0, 0.38, -0.98, 0.02);
  block(g, 0.6, 0.12, 0.34, "#f4ecd6", 0, 0.56, -0.7, 0.06);
  const cover = block(g, 0.9, 0.14, 1.25 + r() * 0.1, blanket, 0, 0.5, 0.3, 0.07);
  cover.rotation.z = (r() - 0.5) * 0.06;
  block(g, 0.92, 0.05, 0.22, CREAM, 0, 0.6, -0.26, 0.02);
  solid(ctx, x, z, 0.95, 2.05, yaw);
}

function ivStand(parent: Object3D, x: number, z: number): void {
  const g = place(parent, x, z);
  for (let i = 0; i < 4; i++) {
    const foot = block(g, 0.04, 0.03, 0.22, CHARCOAL, 0, 0.02, 0, 0.01);
    foot.rotation.y = (i * Math.PI) / 2 + 0.4;
  }
  cylinder(g, 0.018, 1.75, "#a9b2ad", 0, 0, 0, 6);
  const bar = cylinder(g, 0.012, 0.36, "#a9b2ad", 0, 1.72, 0, 6);
  bar.rotation.z = Math.PI / 2;
  block(g, 0.14, 0.22, 0.05, "#d8ecef", 0.12, 1.42, 0, 0.04);
  cylinder(g, 0.006, 0.9, "#d8ecef", 0.12, 0.52, 0.0, 4);
}

function medicineCabinet(ctx: DecorContext, x: number, z: number, yaw: number, seed: number): void {
  const r = rng(seed);
  const g = place(ctx.root, x, z, yaw);
  block(g, 1.0, 1.85, 0.45, CREAM, 0, 0, 0, 0.06);
  block(g, 0.86, 1.4, 0.04, "#7b8a80", 0, 0.32, 0.2, 0.02);
  for (let s = 0; s < 3; s++) {
    block(g, 0.84, 0.03, 0.3, CREAM_DARK, 0, 0.42 + s * 0.45, 0.04, 0.01);
    for (let k = 0; k < 4; k++) {
      if (r() < 0.3) continue;
      const color = ["#c8453a", MUSTARD, "#f4ecd6", "#7fae4a"][Math.floor(r() * 4)];
      cylinder(g, 0.045, 0.12 + r() * 0.1, color, -0.3 + k * 0.19, 0.45 + s * 0.45, 0.08, 8);
    }
  }
  // Vitre (laisse voir les flacons) et petite croix.
  const glass = mesh(new PlaneGeometry(0.82, 1.32), toon("#cfe9ee", { transparent: true }), 0, 1.02, 0.235, false);
  (glass.material as Material).opacity = 0.28;
  g.add(glass);
  panel(g, eastCrossTexture(), 0, 1.62, 0.24, 0.18, 0.18, 0);
  solid(ctx, x, z, 1.0, 0.5, yaw);
}

/** Rideau d'intimité sur rail, orienté selon z, plis ondulés. */
function curtain(ctx: DecorContext, x: number, z0: number, z1: number, color: string): void {
  const len = z1 - z0;
  const g = place(ctx.root, x, (z0 + z1) / 2, Math.PI / 2);
  for (const s of [-1, 1]) cylinder(g, 0.025, 2.0, "#a9b2ad", (s * len) / 2, 0, 0, 6);
  const rail = cylinder(g, 0.02, len, "#a9b2ad", 0, 1.98, 0, 6);
  rail.rotation.z = Math.PI / 2;
  const geometry = new PlaneGeometry(len * 0.92, 1.35, 24, 1);
  const pos = geometry.getAttribute("position");
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 9) * 0.06);
  geometry.computeVertexNormals();
  g.add(mesh(geometry, toon(color, { side: DoubleSide }), 0, 1.25, 0, false));
  solid(ctx, x, (z0 + z1) / 2, 0.14, len);
}

function wheelchair(parent: Object3D, x: number, z: number, yaw: number): void {
  const g = place(parent, x, z, yaw);
  for (const s of [-1, 1]) {
    const wheel = mesh(new TorusGeometry(0.28, 0.035, 8, 18), toon(CHARCOAL), s * 0.3, 0.3, -0.05);
    wheel.rotation.y = Math.PI / 2;
    g.add(wheel);
    const hub = cylinder(g, 0.04, 0.06, "#a9b2ad", s * 0.3, 0.27, -0.05, 8);
    hub.rotation.z = Math.PI / 2;
    ball(g, CHARCOAL, s * 0.2, 0.06, 0.3, 0.06);
    cylinder(g, 0.018, 0.9, "#a9b2ad", s * 0.22, 0.1, -0.22, 6);
    block(g, 0.06, 0.06, 0.16, CHARCOAL, s * 0.22, 0.98, -0.3, 0.02);
  }
  block(g, 0.44, 0.08, 0.42, LEATHER, 0, 0.45, 0.02, 0.03);
  block(g, 0.44, 0.42, 0.06, LEATHER, 0, 0.53, -0.22, 0.03);
  block(g, 0.3, 0.03, 0.12, "#a9b2ad", 0, 0.12, 0.34, 0.01);
  // Couverture moutarde oubliée sur le siège.
  const throwBlanket = block(g, 0.42, 0.1, 0.36, MUSTARD, 0.02, 0.5, 0.03, 0.05);
  throwBlanket.rotation.z = 0.12;
}

function bandageBox(parent: Object3D, x: number, y: number, z: number, yaw: number): void {
  const g = place(parent, x, z, yaw, y);
  block(g, 0.26, 0.14, 0.18, "#f4ecd6", 0, 0, 0, 0.02);
  const cross = decal(g, eastCrossTexture(), 0, 0, 0.11, 0.11, 0, 0.142);
  cross.renderOrder = 2;
}

function decorateInfirmary(ctx: DecorContext): void {
  const { root } = ctx;
  const blankets = [MUSTARD, OLIVE, LEATHER_LIGHT, "#9aa67c"];
  // Lits contre le mur nord (tête au nord) séparés par des rideaux.
  [11.6, 14.2, 16.8, 19.4].forEach((x, i) => cot(ctx, x, -6.75, 0, blankets[i], 900 + i));
  for (const x of [12.9, 15.5, 18.1]) curtain(ctx, x, -7.75, -5.65, x === 15.5 ? "#9aa67c" : CREAM);
  ivStand(root, 12.45, -7.4);
  ivStand(root, 17.3, -7.4);
  // Lits du sud (tête au sud).
  cot(ctx, 13.4, 6.7, Math.PI, OLIVE, 910);
  cot(ctx, 16.2, 6.7, Math.PI, MUSTARD, 911);
  curtain(ctx, 14.8, 5.65, 7.75, CREAM);
  ivStand(root, 12.6, 7.4);
  // Armoires à pharmacie sur le mur ouest.
  medicineCabinet(ctx, 10.45, -4.3, Math.PI / 2, 920);
  medicineCabinet(ctx, 10.45, -3.1, Math.PI / 2, 921);
  medicineCabinet(ctx, 10.45, 3.6, Math.PI / 2, 922);
  // Croix rouge au mur nord, au-dessus du dernier lit libre.
  panel(root, eastCrossTexture(), 21.1, 1.15, -7.83, 0.8, 0.8, 0);
  signBoard(root, "INFIRMERIE", 21.1, 0.6, -7.83, 0.9, 0.2, 0, { bg: CREAM, fg: "#c8453a" });
  decal(root, eastCrossTexture(), 16, 1.6, 1.4, 1.4, 0, 0.012).renderOrder = 1;
  // Chariot de soins.
  const trolley = place(root, 20.4, 2.3, 0.2);
  for (const [lx, lz] of [[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]]) cylinder(trolley, 0.025, 0.85, "#a9b2ad", lx, 0, lz, 6);
  block(trolley, 1.0, 0.04, 0.6, "#a9b2ad", 0, 0.3, 0, 0.01);
  block(trolley, 1.0, 0.04, 0.6, "#a9b2ad", 0, 0.83, 0, 0.01);
  bandageBox(trolley, -0.25, 0.87, 0, 0.1);
  bandageBox(trolley, 0.12, 0.87, 0.05, -0.2);
  bandageBox(trolley, -0.1, 1.01, 0.02, 0.3);
  bandageBox(trolley, 0.2, 0.34, 0, 0);
  cylinder(trolley, 0.05, 0.16, "#c8453a", 0.38, 0.87, -0.15, 8);
  solid(ctx, 20.4, 2.3, 1.1, 0.75, 0.2);
  const exam = place(root, 18.2, -3.3);
  for (const lx of [-0.8, 0.8]) block(exam, 0.12, 0.7, 0.6, "#a9b2ad", lx, 0, 0, 0.03);
  block(exam, 1.9, 0.14, 0.75, OLIVE, 0, 0.7, 0, 0.06);
  block(exam, 0.5, 0.12, 0.6, CREAM, -0.65, 0.84, 0, 0.05);
  decal(exam, paperTexture(2), 0.2, 0, 1.2, 0.6, 0, 0.85);
  solid(ctx, 18.2, -3.3, 1.95, 0.8);
  const desk = place(root, 13.4, 3.4);
  for (const [lx, lz] of [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]]) block(desk, 0.07, 0.76, 0.07, LEATHER, lx, 0, lz, 0.02);
  block(desk, 1.4, 0.07, 0.75, LEATHER_LIGHT, 0, 0.76, 0, 0.03);
  papers(desk, -0.2, 0.83, 0, 3, 71);
  mug(desk, 0.45, 0.83, -0.15);
  const lampArm = cylinder(desk, 0.015, 0.4, CHARCOAL, -0.5, 0.83, -0.2, 5);
  lampArm.rotation.z = 0.25;
  ball(desk, MUSTARD, -0.42, 1.22, -0.2, 0.09, 0.07, 0.09);
  swivelChair(root, 13.4, 4.25, Math.PI);
  solid(ctx, 13.4, 3.4, 1.45, 0.8);
  bandageBox(root, 11.2, 0, 1.9, 0.6);
  bandageBox(root, 18.6, 0, -4.9, -0.3);
  wheelchair(root, 12.3, -3.6, 2.3);
  ctx.colliders.push({ minX: 11.9, maxX: 12.7, minZ: -4.0, maxZ: -3.2 });
  // Presse-papiers suspendu au pied d'un lit (dossier de patient).
  const clip = place(root, 14.2, -5.68, 0, 0.42);
  block(clip, 0.26, 0.34, 0.02, LEATHER_LIGHT, 0, 0, 0, 0.01);
  panel(clip, eastNoteTexture("Lit 3\nfièvre, calme\nmorsure ? non"), 0, 0.16, 0.012, 0.22, 0.27, 0);
  ruin(root, 10, 22, -8, 8, 830, 1, 0.8);
  decal(root, blobTexture("rust"), 20.4, -1.4, 1.2, 0.9, 0.5);
  // Néon froid au plafond.
  block(root, 1.4, 0.06, 0.2, "#a9b2ad", 16, 2.62, -2, 0.02);
  ctx.light(16, 2.55, -2, "#d7f0ff", 7, 10, 0.8, 31);
  ctx.beam(16, 2.55, -2, 1.3, "#d7f0ff");
}

// ——— Atelier ———

function workbenchBody(ctx: DecorContext, x: number, z: number): void {
  const g = place(ctx.root, x, z);
  block(g, 2.2, 0.1, 0.95, LEATHER_LIGHT, 0, 0.82, 0, 0.03);
  for (const [lx, lz] of [[-1.0, -0.38], [1.0, -0.38], [-1.0, 0.38], [1.0, 0.38]]) block(g, 0.1, 0.82, 0.1, LEATHER, lx, 0, lz, 0.02);
  block(g, 2.0, 0.06, 0.8, LEATHER, 0, 0.22, 0, 0.02);
  crate(g, -0.55, 0, 0.42, 0.2, 0.25);
  // Boîtes de clous sur l'étagère du bas.
  for (const [bx, c] of [[0.2, "#c8453a"], [0.48, MUSTARD], [0.75, "#c8453a"]] as const) {
    block(g, 0.22, 0.14, 0.16, c, bx, 0.28, 0.1, 0.02);
    block(g, 0.18, 0.02, 0.12, CHARCOAL, bx, 0.42, 0.1, 0.01);
  }
  // Étau sur le coin du plateau.
  block(g, 0.2, 0.16, 0.2, OLIVE_DARK, -0.9, 0.92, 0.32, 0.03);
  block(g, 0.22, 0.1, 0.06, OLIVE_DARK, -0.9, 1.0, 0.44, 0.02);
  const screw = cylinder(g, 0.015, 0.3, "#a9b2ad", -0.9, 1.02, 0.5, 6);
  screw.rotation.x = Math.PI / 2;
  solid(ctx, x, z, 2.25, 1.0);
}

function pegboard(ctx: DecorContext, x: number, z: number, w: number): void {
  const g = place(ctx.root, x, z);
  for (const s of [-1, 1]) block(g, 0.08, 2.1, 0.08, LEATHER, (s * w) / 2, 0, -0.04, 0.02);
  const tex = eastPegboardTexture().clone();
  tex.needsUpdate = true;
  tex.repeat.set(w / 2, 0.55);
  block(g, w, 1.1, 0.04, "#8a6a45", 0, 0.95, -0.02, 0.01);
  panel(g, tex, 0, 1.5, 0.005, w - 0.04, 1.06, 0);
  const fz = 0.04;
  // Clés plates.
  for (let i = 0; i < 4; i++) {
    block(g, 0.04, 0.3 - i * 0.04, 0.02, "#a9b2ad", -1.5 + i * 0.12, 1.55, fz, 0.01);
    const head = mesh(new TorusGeometry(0.035, 0.012, 5, 8), toon("#a9b2ad"), -1.5 + i * 0.12, 1.74 - i * 0.02, fz, false);
    g.add(head);
  }
  // Marteau, scie, tournevis.
  block(g, 0.04, 0.34, 0.03, LEATHER_LIGHT, -0.8, 1.3, fz, 0.01);
  block(g, 0.2, 0.07, 0.05, CHARCOAL, -0.8, 1.62, fz, 0.02);
  block(g, 0.4, 0.16, 0.01, "#c9ccc6", -0.3, 1.66, fz, 0.004);
  block(g, 0.12, 0.12, 0.04, LEATHER_LIGHT, -0.06, 1.66, fz, 0.02);
  for (let i = 0; i < 4; i++) {
    cylinder(g, 0.022, 0.1, i % 2 ? MUSTARD : "#c8453a", 0.25 + i * 0.1, 1.72, fz, 6);
    cylinder(g, 0.007, 0.16, "#a9b2ad", 0.25 + i * 0.1, 1.56, fz, 4);
  }
  // Cloueuse accrochée au panneau (arme du héros).
  const nailGun = place(g, 0.95, fz + 0.04, 0, 1.5);
  block(nailGun, 0.42, 0.14, 0.1, MUSTARD, 0, 0.0, 0, 0.04);
  block(nailGun, 0.1, 0.24, 0.08, CHARCOAL, -0.1, -0.2, 0, 0.03);
  block(nailGun, 0.08, 0.06, 0.08, CHARCOAL, 0.22, 0.04, 0, 0.02);
  block(nailGun, 0.18, 0.08, 0.06, "#a9b2ad", 0.06, -0.08, 0, 0.02);
  signBoard(g, "CLOUEUSE", 0.95, 1.25, fz, 0.42, 0.1, 0, { bg: CREAM, fg: LEATHER });
  // Masque de soudeur accroché.
  const maskG = place(g, 1.55, fz + 0.06, 0, 1.45);
  block(maskG, 0.3, 0.36, 0.14, CHARCOAL, 0, 0, 0, 0.1);
  block(maskG, 0.2, 0.08, 0.02, "#2f4a3a", 0, 0.2, 0.07, 0.01);
  note(g, "Module radio :\n2 pièces, la\nbobine + l'ampli", 2.0, 1.15, fz, 0, 0.04);
}

function lathe(ctx: DecorContext, x: number, z: number): void {
  const g = place(ctx.root, x, z);
  block(g, 1.8, 0.75, 0.7, OLIVE, 0, 0, 0, 0.06);
  block(g, 1.9, 0.08, 0.78, OLIVE_DARK, 0, 0.75, 0, 0.03);
  block(g, 0.5, 0.45, 0.5, OLIVE, -0.62, 0.83, 0, 0.06);
  const chuck = cylinder(g, 0.13, 0.14, "#a9b2ad", -0.3, 1.05, 0, 12);
  chuck.rotation.z = Math.PI / 2;
  chuck.position.y = 1.05;
  const shaft = cylinder(g, 0.035, 0.6, "#c9ccc6", 0.05, 1.05, 0, 8);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.y = 1.05;
  block(g, 0.22, 0.3, 0.3, OLIVE, 0.6, 0.83, 0, 0.04);
  block(g, 1.5, 0.05, 0.12, "#a9b2ad", 0.1, 0.83, 0.15, 0.01);
  cylinder(g, 0.05, 0.05, "#c8453a", -0.62, 1.28, 0.2, 8);
  rubble(ctx.root, x + 0.4, z + 0.6, 3, 1201, 0.25);
  solid(ctx, x, z, 1.95, 0.85);
}

/** Caisse de ferraille : planches, tôles et engrenages qui dépassent. */
function scrapCrate(ctx: DecorContext, x: number, z: number, size: number, yaw: number, seed: number): void {
  const r = rng(seed);
  const g = crate(ctx.root, x, z, size, yaw);
  for (let i = 0; i < 4; i++) {
    const piece = block(g, 0.1 + r() * 0.25, 0.04, 0.12 + r() * 0.2, r() < 0.5 ? "#8a8378" : PALETTE.rustLight, (r() - 0.5) * size * 0.6, size - 0.04, (r() - 0.5) * size * 0.6, 0.01);
    piece.rotation.set(r() - 0.5, r() * 3, r() - 0.5);
  }
  const gear = mesh(new TorusGeometry(0.09, 0.04, 5, 8), toon(PALETTE.rust), 0, size + 0.06, 0);
  gear.rotation.set(1.1, 0, r());
  g.add(gear);
  solid(ctx, x, z, size + 0.05, size + 0.05, yaw);
}

function decorateWorkshop(ctx: DecorContext): void {
  const { root } = ctx;
  workbenchBody(ctx, 29, -6);
  pegboard(ctx, 29.4, -7.72, 4.6);
  lathe(ctx, 25.2, -6.7);
  for (const [x, z, s, yaw, seed] of [[35.15, -6.6, 0.8, 0.1, 1210], [35.25, -5.5, 0.6, -0.2, 1211], [35.15, -2.6, 0.7, 0.3, 1212], [35.25, 0.9, 0.6, 0, 1213]] as const) {
    scrapCrate(ctx, x, z, s, yaw, seed);
  }
  // Bidons rouillés et bouteilles de gaz.
  for (const [x, z] of [[35.2, 6.9], [34.5, 7.25]]) {
    cylinder(root, 0.3, 0.9, PALETTE.rust, x, 0, z, 12);
    cylinder(root, 0.31, 0.04, CHARCOAL, x, 0.6, z, 12);
  }
  ctx.colliders.push({ minX: 34.15, maxX: 35.6, minZ: 6.55, maxZ: 7.6 });
  const cart = place(root, 30.6, 7.2, -0.15);
  block(cart, 0.8, 0.1, 0.5, CHARCOAL, 0, 0.1, 0, 0.02);
  for (const [cx, color] of [[-0.18, "#c8453a"], [0.18, OLIVE]] as const) {
    cylinder(cart, 0.15, 1.1, color, cx, 0.2, 0, 12);
    ball(cart, color, cx, 1.3, 0, 0.15, 0.1, 0.15);
    cylinder(cart, 0.03, 0.1, "#a9b2ad", cx, 1.38, 0, 6);
  }
  floorCable(root, [[30.5, 7.0], [29.6, 6.6], [28.9, 7.2], [28.2, 6.8]], CHARCOAL, 0.025);
  solid(ctx, 30.6, 7.2, 0.9, 0.6, -0.15);
  // Bâche olive tendue sur un tas de matériel, cordes en cuir.
  const tarpGeo = new SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = tarpGeo.getAttribute("position");
  const tr = rng(1220);
  for (let i = 0; i < pos.count; i++) {
    const k = 1 + (tr() - 0.5) * 0.12;
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * (0.9 + tr() * 0.15), pos.getZ(i) * k);
  }
  tarpGeo.computeVertexNormals();
  const tarp = mesh(tarpGeo, toon(OLIVE, { side: DoubleSide }), 23.6, 0, 6.4);
  tarp.scale.set(1.1, 0.85, 0.85);
  root.add(tarp);
  for (const dz of [-0.3, 0.3]) {
    const rope = mesh(new TorusGeometry(0.86, 0.02, 4, 20, Math.PI), toon(LEATHER), 23.6, 0, 6.4 + dz);
    rope.scale.set(1.12, 0.88, 1);
    root.add(rope);
  }
  crate(root, 22.9, 5.2, 0.5, 0.4);
  ctx.colliders.push({ minX: 22.4, maxX: 24.8, minZ: 4.9, maxZ: 7.3 });
  // Tréteaux avec une planche à découper, pile de pneus.
  const horse = place(root, 27.2, 2.3, 0.3);
  for (const lx of [-0.6, 0.6]) {
    for (const s of [-1, 1]) {
      const leg = block(horse, 0.06, 0.72, 0.06, PALETTE.wood, lx, 0, s * 0.14, 0.01);
      leg.rotation.x = s * 0.25;
    }
    block(horse, 0.1, 0.06, 0.12, LEATHER, lx, 0.68, 0, 0.01);
  }
  block(horse, 1.8, 0.05, 0.42, PALETTE.wood, 0.1, 0.74, 0, 0.01);
  block(horse, 0.5, 0.04, 0.3, "#8a8378", -0.3, 0.79, 0.02, 0.01);
  solid(ctx, 27.2, 2.3, 1.85, 0.6, 0.3);
  for (let i = 0; i < 3; i++) {
    const tire = mesh(new TorusGeometry(0.3, 0.13, 8, 14), toon(CHARCOAL), 23.0 + (i % 2) * 0.05, 0.13 + i * 0.24, -4.3);
    tire.rotation.x = Math.PI / 2;
    root.add(tire);
  }
  ctx.colliders.push({ minX: 22.55, maxX: 23.5, minZ: -4.75, maxZ: -3.85 });
  // Boîtes de clous et ferraille au sol.
  for (const [x, z, c] of [[27.4, -4.7, "#c8453a"], [27.7, -4.5, MUSTARD]] as const) block(root, 0.24, 0.14, 0.17, c, x, 0, z, 0.02);
  rubble(root, 32.2, -6.8, 5, 1230, 0.3);
  can(root, 31.4, -4.6, PALETTE.rustLight, true);
  // Boîte de dérivation arrachée au mur nord : elle crache des étincelles.
  const jbox = place(root, 23.3, -7.78, 0, 1.25);
  block(jbox, 0.4, 0.3, 0.12, "#8a8378", 0, 0, 0, 0.03);
  block(jbox, 0.36, 0.05, 0.02, MUSTARD, 0, 0.12, 0.065, 0.01);
  const hanging = mesh(new CylinderGeometry(0.018, 0.018, 0.5, 5), toon(CHARCOAL), 0.08, -0.22, 0.12);
  hanging.rotation.z = 0.3;
  jbox.add(hanging);
  decal(root, blobTexture("scorch"), 23.4, -7.1, 1.0, 0.8, 0.2);
  sparkFountain(ctx, 23.42, 1.0, -7.62);
  signBoard(root, "ATELIER", 25.6, 1.3, -7.83, 1.0, 0.24, 0, { bg: MUSTARD, fg: CHARCOAL });
  ruin(root, 22, 36, -8, 8, 840, 1, 1);
  decal(root, blobTexture("rust"), 31, -2, 1.6, 1.2, 0.8);
  // Lampe d'atelier suspendue (abat-jour moutarde).
  const shade = mesh(new CylinderGeometry(0.1, 0.32, 0.26, 12, 1, true), toon(MUSTARD, { side: DoubleSide }), 29, 2.48, -5.4);
  root.add(shade);
  cylinder(root, 0.01, 1.0, CHARCOAL, 29, 2.6, -5.4, 4);
  ctx.light(29, 2.38, -5.4, "#ffc77a", 8, 10, 0.15, 41);
  ctx.beam(29, 2.38, -5.4, 1.1, "#ffc77a");
}

/** Gerbe d'étincelles qui retombent (animée, coût constant). */
function sparkFountain(ctx: DecorContext, x: number, y: number, z: number): void {
  const count = 14;
  const sparks: { m: Mesh; vx: number; vy: number; vz: number; life: number }[] = [];
  const geo = new SphereGeometry(0.022, 5, 4);
  const r = rng(77);
  for (let i = 0; i < count; i++) {
    const m = mesh(geo, glow(i % 3 ? "#ffd36b" : "#fff2c0"), x, y, z, false);
    ctx.root.add(m);
    sparks.push({ m, vx: 0, vy: 0, vz: 0, life: -r() * 1.5 });
  }
  let burst = 0;
  ctx.animate((dt, time) => {
    burst = Math.sin(time * 1.3) + Math.sin(time * 3.7) > 0.6 ? 1 : 0;
    for (const s of sparks) {
      s.life -= dt;
      if (s.life <= 0) {
        if (!burst) { s.m.visible = false; continue; }
        s.m.visible = true;
        s.m.position.set(x, y, z);
        s.vx = (r() - 0.5) * 1.2;
        s.vy = r() * 0.8;
        s.vz = 0.3 + r() * 0.9;
        s.life = 0.5 + r() * 0.5;
      }
      s.vy -= 6 * dt;
      s.m.position.x += s.vx * dt;
      s.m.position.y = Math.max(0.02, s.m.position.y + s.vy * dt);
      s.m.position.z += s.vz * dt;
    }
  });
}

// ——— Serre ———

/** Bac surélevé en bois rempli de légumes. Grand axe selon x si w > d. */
function planterBed(ctx: DecorContext, x: number, z: number, w: number, d: number, seed: number, wilted = true): void {
  const r = rng(seed);
  const g = place(ctx.root, x, z);
  const h = 0.45;
  block(g, w, h, d, LEATHER_LIGHT, 0, 0, 0, 0.05);
  for (const s of [-1, 1]) {
    block(g, w + 0.06, 0.08, 0.1, PALETTE.wood, 0, h, (s * d) / 2, 0.02);
    block(g, 0.1, 0.08, d + 0.06, PALETTE.wood, (s * w) / 2, h, 0, 0.02);
  }
  for (let k = 1; k < Math.round(w / 0.8); k++) block(g, 0.04, h - 0.1, 0.02, LEATHER, -w / 2 + k * (w / Math.round(w / 0.8)), 0.05, d / 2 + 0.005, 0.01);
  block(g, w - 0.12, 0.04, d - 0.12, SOIL, 0, h - 0.02, 0, 0.02);
  const long = w > d;
  const n = Math.round((long ? w : d) / 0.45);
  for (let i = 0; i < n; i++) {
    const t = -0.5 + (i + 0.5) / n;
    for (const lane of [-0.22, 0.22]) {
      const px = long ? t * (w - 0.3) : lane * (w - 0.3);
      const pz = long ? lane * (d - 0.3) : t * (d - 0.3);
      if (wilted && r() < 0.35) continue;
      vegetable(g, px + (r() - 0.5) * 0.08, h + 0.02, pz + (r() - 0.5) * 0.08, r, wilted);
    }
  }
  solid(ctx, x, z, w + 0.1, d + 0.1);
}

/** Feuilles sèches des bacs qu'on n'arrose plus. */
const DRY = ["#8a7444", "#9a8250", "#7a6438", "#a08a58", "#8f7a4a"];

function vegetable(parent: Object3D, x: number, y: number, z: number, r: () => number, wilted = false): void {
  const kind = Math.floor(r() * 5);
  const leaf = (wilted ? DRY : LEAVES)[Math.floor(r() * LEAVES.length)];
  if (wilted) {
    // Plant desséché : touffe affaissée, tige penchée, un fruit flétri parfois.
    ball(parent, leaf, x, y + 0.04, z, 0.15, 0.05, 0.15);
    const stem = cylinder(parent, 0.01, 0.3, DRY[2], x, y, z, 4);
    stem.rotation.z = 0.9 * (r() > 0.5 ? 1 : -1);
    if (r() < 0.3) ball(parent, "#7a4a2a", x + 0.1, y + 0.03, z + 0.05, 0.04);
    return;
  }
  if (kind === 0) {
    // Salade : boules aplaties superposées.
    ball(parent, leaf, x, y + 0.08, z, 0.17, 0.11, 0.17);
    ball(parent, LEAVES[4], x, y + 0.15, z, 0.1, 0.08, 0.1);
  } else if (kind === 1) {
    // Tomates sur tuteur.
    cylinder(parent, 0.012, 0.6, LEATHER, x, y, z, 4);
    ball(parent, leaf, x, y + 0.35, z, 0.15, 0.22, 0.15);
    for (let i = 0; i < 3; i++) ball(parent, "#d9573a", x + (r() - 0.5) * 0.2, y + 0.2 + r() * 0.3, z + 0.1, 0.05);
  } else if (kind === 2) {
    // Courge.
    ball(parent, leaf, x, y + 0.08, z, 0.2, 0.1, 0.2);
    ball(parent, "#e08a2e", x + 0.08, y + 0.1, z + 0.06, 0.1, 0.08, 0.1);
  } else if (kind === 3) {
    // Fanes de carottes.
    for (let i = 0; i < 3; i++) {
      const top = mesh(new CylinderGeometry(0.0, 0.05, 0.22, 5), toon(LEAVES[4]), x + (i - 1) * 0.07, y + 0.11, z);
      top.rotation.z = (i - 1) * 0.3;
      parent.add(top);
    }
    ball(parent, "#e08a2e", x, y + 0.01, z, 0.04);
  } else {
    // Chou.
    ball(parent, "#9cc06a", x, y + 0.11, z, 0.14);
    ball(parent, leaf, x, y + 0.05, z, 0.2, 0.07, 0.2);
  }
}

/** Arbre trapu et rond. */
function tree(ctx: DecorContext, x: number, z: number, s: number, seed: number): void {
  const r = rng(seed);
  const g = place(ctx.root, x, z, r() * 3);
  g.add(mesh(new CylinderGeometry(0.16 * s, 0.3 * s, 1.8 * s, 9), toon(LEATHER_LIGHT), 0, 0.9 * s, 0));
  for (let i = 0; i < 3; i++) {
    const root = mesh(new CylinderGeometry(0.04 * s, 0.11 * s, 0.5 * s, 6), toon(LEATHER_LIGHT), Math.sin(i * 2.1) * 0.25 * s, 0.08, Math.cos(i * 2.1) * 0.25 * s);
    root.rotation.set(Math.cos(i * 2.1) * 1.2, 0, -Math.sin(i * 2.1) * 1.2);
    g.add(root);
  }
  const puffs: [number, number, number, number][] = [[0, 2.3, 0, 0.95], [0.6, 2.0, 0.2, 0.7], [-0.55, 2.1, -0.15, 0.72], [0.1, 2.0, 0.6, 0.65], [-0.1, 2.85, -0.1, 0.62]];
  puffs.forEach(([px, py, pz, pr], i) => ball(g, LEAVES[(i + seed) % 4], px * s, py * s, pz * s, pr * s));
  for (let i = 0; i < 6; i++) {
    const a = r() * Math.PI * 2;
    ball(g, i % 2 ? "#e08a2e" : MUSTARD, Math.cos(a) * 0.8 * s, (1.9 + r() * 0.8) * s, Math.sin(a) * 0.8 * s, 0.07 * s);
  }
  overgrowth(ctx.root, x, z, 0.9, seed);
  solid(ctx, x, z, 0.7 * s, 0.7 * s);
}

function wateringCan(parent: Object3D, x: number, z: number, yaw: number, color: string): void {
  const g = place(parent, x, z, yaw);
  cylinder(g, 0.13, 0.26, color, 0, 0, 0, 12);
  const spout = mesh(new CylinderGeometry(0.02, 0.03, 0.32, 6), toon(color), 0.2, 0.2, 0);
  spout.rotation.z = -0.9;
  g.add(spout);
  cylinder(g, 0.04, 0.03, color, 0.33, 0.28, 0, 8);
  const handle = mesh(new TorusGeometry(0.1, 0.018, 5, 10, Math.PI), toon(color), -0.02, 0.26, 0);
  g.add(handle);
}

function hangingPlant(parent: Object3D, x: number, z: number, top: number, drop: number, seed: number): void {
  const r = rng(seed);
  cylinder(parent, 0.008, drop, LEATHER, x, top - drop, z, 4);
  const y = top - drop - 0.2;
  cylinder(parent, 0.16, 0.2, "#b8673e", x, y, z, 10);
  ball(parent, LEAVES[seed % 4], x, y + 0.24, z, 0.22, 0.14, 0.22);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + r();
    const len = 0.25 + r() * 0.35;
    const vine = mesh(new CylinderGeometry(0.02, 0.012, len, 4), toon(LEAVES[(i + seed) % 5]), x + Math.cos(a) * 0.16, y - len / 2 + 0.1, z + Math.sin(a) * 0.16, false);
    parent.add(vine);
    ball(parent, LEAVES[i % 5], x + Math.cos(a) * 0.17, y - len + 0.1, z + Math.sin(a) * 0.17, 0.05);
  }
}

/** Charpente de la verrière : seules les poutrelles restent, quelques vitres pendent encore. */
function glassRoof(ctx: DecorContext): void {
  const { root } = ctx;
  const y = 3.4;
  const steel = "#7d7a6e";
  for (const [x, z] of [[7.3, 8.3], [29.7, 8.3], [7.3, 21.7], [29.7, 21.7], [18.4, 8.3], [7.3, 15]]) block(root, 0.12, y, 0.12, steel, x, 0, z, 0.02);
  // Cadre le long des murets ; une seule poutrelle traverse encore, cassée, un bout pend.
  block(root, 22.4, 0.1, 0.1, steel, 18.5, y, 8.3, 0.02);
  block(root, 0.1, 0.1, 13.4, steel, 7.3, y, 15, 0.02);
  block(root, 0.1, 0.1, 13.4, steel, 29.7, y, 15, 0.02);
  block(root, 4.6, 0.08, 0.08, steel, 9.6, y, 15, 0.02);
  const bent = block(root, 1.6, 0.08, 0.08, steel, 12.5, y - 0.35, 15, 0.02);
  bent.rotation.z = -0.45;
  const glass = toon("#cfe9ee", { transparent: true, side: DoubleSide });
  glass.opacity = 0.22;
  for (const [x, z, rx, rz] of [[10, 9.4, 0, 0], [27.5, 9.4, 0.2, -0.1]]) {
    const pane = mesh(new PlaneGeometry(2.4, 1.6), glass, x, y + 0.05, z, false);
    pane.rotation.set(-Math.PI / 2 + rx, 0, rz);
    pane.renderOrder = 3;
    root.add(pane);
  }
  // Éclats de verre au sol.
  const r = rng(1300);
  for (let i = 0; i < 18; i++) {
    const shard = mesh(new CircleGeometry(0.06 + r() * 0.08, 3), glass, 14 + r() * 12, 0.015, 13 + r() * 6, false);
    shard.rotation.set(-Math.PI / 2, 0, r() * 6);
    root.add(shard);
  }
}

/** Buisson touffu (boules de feuillage et quelques fleurs), sans collision. */
function bush(parent: Object3D, x: number, z: number, s: number, seed: number): void {
  const r = rng(seed);
  for (let i = 0; i < 4; i++) {
    const a = r() * Math.PI * 2;
    const d = i === 0 ? 0 : 0.3 * s;
    ball(parent, LEAVES[(i + seed) % 5], x + Math.cos(a) * d, (0.28 + r() * 0.15) * s, z + Math.sin(a) * d, (0.32 + r() * 0.12) * s, (0.28 + r() * 0.1) * s, (0.32 + r() * 0.12) * s);
  }
  for (let i = 0; i < 3; i++) ball(parent, ["#f2c230", CREAM, "#e07a5f"][(i + seed) % 3], x + (r() - 0.5) * 0.6 * s, 0.5 * s, z + (r() - 0.5) * 0.6 * s, 0.05);
  grass(parent, x + 0.4 * s, z + 0.2 * s, 0.5);
}

/** Papillons et lucioles : la vie revient dans la serre. */
function critters(ctx: DecorContext): void {
  const { root } = ctx;
  const wingGeo = new CircleGeometry(0.09, 7);
  const butterflies: { g: Group; left: Mesh; right: Mesh; cx: number; cz: number; rad: number; speed: number; phase: number }[] = [];
  const wingColors = [MUSTARD, CREAM, "#e08a2e", "#f2c230", "#c9d9f2"];
  for (let i = 0; i < 6; i++) {
    const g = new Group();
    const material = toon(wingColors[i % wingColors.length], { side: DoubleSide });
    const left = mesh(wingGeo, material, -0.07, 0, 0, false);
    const right = mesh(wingGeo, material, 0.07, 0, 0, false);
    g.add(left, right);
    const body = mesh(new CylinderGeometry(0.012, 0.012, 0.12, 4), toon(CHARCOAL), 0, 0, 0, false);
    body.rotation.x = Math.PI / 2;
    g.add(body);
    root.add(g);
    const spots: [number, number][] = [[12, 12], [17.5, 10.5], [24, 11], [27.5, 15], [14, 19.5], [22, 19]];
    butterflies.push({ g, left, right, cx: spots[i][0], cz: spots[i][1], rad: 0.8 + (i % 3) * 0.4, speed: 0.5 + (i % 4) * 0.15, phase: i * 1.7 });
  }
  const fireGeo = new SphereGeometry(0.035, 6, 4);
  const flies: { m: Mesh; x: number; y: number; z: number; phase: number }[] = [];
  const r = rng(1400);
  for (let i = 0; i < 16; i++) {
    const x = 8.5 + r() * 20.5, y = 0.5 + r() * 1.8, z = 9 + r() * 12;
    const m = mesh(fireGeo, glow("#ffe48a"), x, y, z, false);
    root.add(m);
    flies.push({ m, x, y, z, phase: r() * 10 });
  }
  ctx.animate((_dt, time) => {
    for (const b of butterflies) {
      const t = time * b.speed + b.phase;
      const x = b.cx + Math.cos(t) * b.rad + Math.sin(t * 2.3) * 0.3;
      const z = b.cz + Math.sin(t * 1.3) * b.rad;
      b.g.position.set(x, 1.0 + Math.sin(t * 2.1) * 0.35, z);
      b.g.rotation.y = Math.atan2(-Math.sin(t) * b.rad, Math.cos(t * 1.3) * b.rad * 1.3);
      const flap = Math.sin(time * 16 + b.phase) * 0.9;
      b.left.rotation.set(-Math.PI / 2, -0.2 - flap, 0);
      b.right.rotation.set(-Math.PI / 2, 0.2 + flap, 0);
    }
    for (const f of flies) {
      const t = time * 0.4 + f.phase;
      f.m.position.set(f.x + Math.sin(t) * 0.4, f.y + Math.sin(t * 1.7) * 0.2, f.z + Math.cos(t * 0.8) * 0.4);
      f.m.scale.setScalar(Math.max(0.15, Math.sin(time * 2.2 + f.phase * 3)) * 1.3);
    }
  });
}

function decorateGreenhouse(ctx: DecorContext): void {
  const { root } = ctx;
  // Bacs surélevés (allées libres vers les portes, la pièce et le parcours du rôdeur).
  planterBed(ctx, 11.6, 11.6, 1.2, 3.2, 1501);
  planterBed(ctx, 15.6, 10.2, 3.0, 1.2, 1502);
  planterBed(ctx, 19.9, 10.2, 2.8, 1.2, 1503);
  planterBed(ctx, 28.4, 11.9, 1.2, 3.0, 1504, false);
  planterBed(ctx, 28.4, 15.9, 1.2, 2.4, 1505);
  planterBed(ctx, 9.25, 15.6, 1.1, 3.0, 1506);
  planterBed(ctx, 14.6, 20.6, 3.2, 1.2, 1507);
  planterBed(ctx, 25.7, 20.6, 3.0, 1.2, 1508);
  tree(ctx, 9.3, 20.4, 1.1, 1601);
  tree(ctx, 28.6, 20.6, 1.0, 1602);
  tree(ctx, 24.6, 9.4, 0.95, 1603);
  glassRoof(ctx);
  for (const [x, z, d, s] of [[13.2, 13.4, 0.9, 1], [23.5, 15.6, 0.8, 2], [18.6, 18.6, 0.9, 3], [11.2, 16.6, 0.7, 5]] as const) hangingPlant(root, x, z, 3.4, d, s);
  for (const [x, z, s, seed] of [[7.75, 18.2, 1.1, 1], [7.7, 21.2, 0.9, 2], [22.3, 8.75, 1.0, 3], [29.3, 18.4, 1.0, 4], [11.7, 21.35, 0.9, 5], [17.6, 21.35, 1.0, 6], [29.3, 9.1, 0.8, 7], [24.1, 21.4, 0.7, 8], [13.6, 8.7, 0.6, 9], [10.3, 9.1, 0.7, 10]] as const) bush(root, x, z, s, seed + 1750);
  // Arrosoirs et tuyau d'arrosage sur son enrouleur.
  wateringCan(root, 13.9, 9.25, 0.4, OLIVE);
  wateringCan(root, 22.7, 20.9, 2.4, MUSTARD);
  wateringCan(root, 27.3, 14.0, -1.2, "#5f8a96");
  const reel = place(root, 7.5, 12.6, Math.PI / 2);
  block(reel, 0.5, 0.06, 0.3, LEATHER, 0, 0, 0, 0.02);
  for (let i = 0; i < 3; i++) {
    const coil = mesh(new TorusGeometry(0.24 - i * 0.03, 0.035, 6, 16), toon("#4f7d34"), 0, 0.42, 0);
    reel.add(coil);
  }
  floorCable(root, [[7.7, 12.4], [8.6, 12.9], [8.4, 14], [8.9, 13.6], [10.3, 13.9], [10.9, 13.3]], "#4f7d34", 0.035);
  ctx.colliders.push({ minX: 7.15, maxX: 7.8, minZ: 12.3, maxZ: 12.9 });
  // Allée de planches vers la verrière brisée et l'extérieur.
  for (let i = 0; i < 9; i++) {
    const plank = block(root, 1.7, 0.05, 0.3, i % 2 ? PALETTE.wood : LEATHER_LIGHT, 21 + Math.sin(i) * 0.08, 0, 21.6 - i * 0.55, 0.02);
    plank.rotation.y = Math.sin(i * 1.7) * 0.06;
  }
  // La nature reprend : herbes, mousse, fleurs, lierre sur les murets.
  const r = rng(1700);
  for (let i = 0; i < 26; i++) {
    const x = 7.6 + r() * 21.8, z = 8.6 + r() * 12.8;
    grass(root, x, z, 0.35 + r() * 0.4);
  }
  for (const [x, z, s] of [[8.2, 9.6, 0.8], [17.4, 15.6, 0.7], [23, 21.2, 0.9], [29.2, 9.2, 0.8], [12.5, 21.3, 0.7], [20.3, 13.3, 0.6]] as const) overgrowth(root, x, z, s, Math.round(x * z));
  for (let i = 0; i < 22; i++) {
    const x = 7.6 + r() * 21.8, z = 8.6 + r() * 12.8;
    cylinder(root, 0.01, 0.25, LEAVES[3], x, 0, z, 4);
    ball(root, ["#f2c230", CREAM, "#e07a5f", "#c9d9f2"][i % 4], x, 0.27, z, 0.045);
  }
  for (const [x0, x1, z] of [[7.2, 19, 21.85], [23, 29.8, 21.85], [10, 29.8, 8.15]] as const) {
    for (let x = x0; x < x1; x += 0.6 + r() * 0.7) {
      const ivy = ball(root, LEAVES[Math.floor(r() * 4)], x, 1.0 + r() * 0.6, z, 0.18 + r() * 0.12, 0.25 + r() * 0.2, 0.12);
      ivy.castShadow = false;
    }
  }
  // Tapis de mousse et fougères basses au milieu (le rôdeur les traverse).
  for (let i = 0; i < 5; i++) decal(root, blobTexture("moss"), 11 + r() * 16, 11 + r() * 9, 1.6 + r() * 1.4, 1.2 + r() * 1.2, r() * 3);
  for (let i = 0; i < 40; i++) grass(root, 10 + r() * 18, 10.5 + r() * 10, 0.3 + r() * 0.35);
  for (let i = 0; i < 7; i++) bush(root, 12 + r() * 14, 12 + r() * 7, 0.45, 1780 + i);
  // Banc de jardin avec coussin et lanterne : un coin pour souffler.
  const bench = place(root, 16.6, 18.5, 0.05);
  for (const lx of [-0.7, 0.7]) block(bench, 0.1, 0.42, 0.42, LEATHER, lx, 0, 0, 0.02);
  block(bench, 1.7, 0.07, 0.5, PALETTE.wood, 0, 0.42, 0, 0.02);
  block(bench, 1.7, 0.36, 0.06, PALETTE.wood, 0, 0.5, -0.24, 0.02);
  block(bench, 0.55, 0.1, 0.42, MUSTARD, -0.4, 0.49, 0.02, 0.05);
  const lantern = place(bench, 0.55, 0, 0, 0.49);
  block(lantern, 0.14, 0.2, 0.14, CHARCOAL, 0, 0, 0, 0.03);
  ball(lantern, glow("#ffd27a"), 0, 0.1, 0, 0.05);
  solid(ctx, 16.6, 18.5, 1.8, 0.55);
  // Brouette pleine de terre.
  const barrow = place(root, 17.0, 12.3, -0.5);
  block(barrow, 0.7, 0.3, 0.55, OLIVE, 0, 0.2, 0, 0.08);
  block(barrow, 0.6, 0.06, 0.45, SOIL, 0, 0.47, 0, 0.03);
  const wheel = mesh(new TorusGeometry(0.14, 0.05, 6, 12), toon(CHARCOAL), 0.45, 0.16, 0);
  barrow.add(wheel);
  for (const s of [-1, 1]) {
    const handle = cylinder(barrow, 0.025, 0.6, LEATHER, -0.5, 0.3, s * 0.2, 6);
    handle.rotation.z = Math.PI / 2 - 0.3;
  }
  vegetable(barrow, 0.1, 0.5, 0.05, r);
  solid(ctx, 17.0, 12.3, 1.3, 0.75, -0.5);
  // Pancarte et note des jardiniers.
  signBoard(root, "SERRE · NE PAS PIÉTINER", 15.6, 0.7, 9.52, 1.0, 0.2, 0, { bg: CREAM, fg: OLIVE_DARK });
  const stake = place(root, 26.6, 13.6);
  cylinder(stake, 0.025, 0.75, LEATHER, 0, 0, 0, 5);
  panel(stake, eastNoteTexture("Arroser le soir.\nLes tomates\nreviennent !"), 0, 0.72, 0.03, 0.28, 0.34, 0);
  ruin(root, 7, 30, 8, 22, 850, 1, 0.3);
  // Soleil doux qui passe par la verrière et lampe horticole.
  ctx.light(18, 4.6, 15, "#ffd89a", 11, 15, 0, 51, false);
  ctx.light(26.5, 2.9, 12.5, "#ffcf7a", 6, 8, 0.1, 52);
  ctx.beam(18, 4.6, 15, 2.2, "#ffe2a8");
  ctx.dust(17, 2.5, 14);
  critters(ctx);
}

// ——— Point d'entrée ———

export function decorateEast(ctx: DecorContext): void {
  live.screens = [];
  live.comms = [];
  live.slot = null;
  live.module = null;
  decorateCorridor(ctx);
  decorateControl(ctx);
  decorateInfirmary(ctx);
  decorateWorkshop(ctx);
  decorateGreenhouse(ctx);
  decorateStory(ctx, "east");
  // Écrans neigeux : la neige défile ; écrans bleus : les données montent doucement.
  ctx.animate((_dt, time) => {
    const noise = eastStaticTexture();
    noise.offset.set(Math.floor(time * 24) * 0.37 % 1, Math.floor(time * 24) * 0.61 % 1);
    if (live.powered) for (let s = 0; s < 3; s++) eastScreenTexture(s).offset.y = (time * 0.04) % 1;
  });
  onWorldRefresh(refreshEast);
}

// ——— Objets interactifs ———

/** Façade de la console radio : gros cadran, molettes, haut-parleur, micro sur col de cygne. */
function commsModel(): ModelBuilder {
  return (def) => {
    const g = new Group();
    g.position.set(def.x, 0, def.z);
    block(g, 1.6, 0.85, 0.62, OLIVE, 0, 0, 0, 0.08);
    block(g, 1.5, 0.12, 0.05, OLIVE_DARK, 0, 0.05, 0.3, 0.02);
    const top = place(g, 0, 0.05, 0, 0.88);
    top.rotation.x = 0.35;
    block(top, 1.62, 0.1, 0.6, CREAM, 0, -0.06, 0, 0.04);
    // Gros cadran de fréquence.
    cylinder(top, 0.22, 0.06, CREAM_DARK, -0.35, 0.03, 0, 20);
    const ring = mesh(new TorusGeometry(0.22, 0.03, 6, 20), toon(MUSTARD), -0.35, 0.09, 0);
    ring.rotation.x = Math.PI / 2;
    top.add(ring);
    block(top, 0.02, 0.02, 0.18, "#c8453a", -0.35, 0.1, -0.06, 0.005).rotation.y = 0.6;
    cylinder(top, 0.04, 0.05, CHARCOAL, -0.35, 0.09, 0, 10);
    for (let i = 0; i < 3; i++) cylinder(top, 0.05, 0.07, i === 1 ? MUSTARD : CHARCOAL, 0.05 + i * 0.16, 0.03, 0.12, 10);
    // Vu-mètre et interrupteurs.
    block(top, 0.36, 0.03, 0.16, "#f4ecd6", 0.22, 0.03, -0.12, 0.01);
    block(top, 0.01, 0.02, 0.12, "#c8453a", 0.26, 0.05, -0.12, 0.003).rotation.y = 0.5;
    for (let i = 0; i < 4; i++) block(top, 0.04, 0.06, 0.06, CREAM_DARK, 0.5 + (i % 2) * 0.1, 0.03, -0.1 + Math.floor(i / 2) * 0.14, 0.01);
    // Haut-parleur en façade.
    const grille = mesh(new CylinderGeometry(0.17, 0.17, 0.04, 16), toon(CHARCOAL), 0.42, 0.48, 0.31);
    grille.rotation.x = Math.PI / 2;
    g.add(grille);
    for (const rr of [0.06, 0.11, 0.15]) {
      const ringG = mesh(new TorusGeometry(rr, 0.012, 4, 14), toon("#5a5550"), 0.42, 0.48, 0.335, false);
      g.add(ringG);
    }
    signBoard(g, "RADIO", -0.35, 0.55, 0.315, 0.5, 0.14, 0, { bg: MUSTARD, fg: CHARCOAL });
    // Micro sur col de cygne.
    const neck = new CatmullRomCurve3([new Vector3(-0.65, 0.95, -0.1), new Vector3(-0.68, 1.25, -0.05), new Vector3(-0.55, 1.45, 0.1)]);
    g.add(mesh(new TubeGeometry(neck, 10, 0.018, 5, false), toon(CHARCOAL), 0, 0, 0, false));
    ball(g, CHARCOAL, -0.53, 1.48, 0.13, 0.06, 0.08, 0.06);
    // Casque posé sur le côté.
    const band = mesh(new TorusGeometry(0.12, 0.018, 5, 12, Math.PI), toon(LEATHER), 0.6, 1.08, 0.15);
    band.rotation.set(-1.2, 0, 0);
    g.add(band);
    for (const s of [-1, 1]) ball(g, LEATHER_LIGHT, 0.6 + s * 0.12, 1.04, 0.12, 0.05, 0.05, 0.03);
    return { group: g, height: 1.7 };
  };
}

/** Objets posés sur l'établi : module radio à moitié monté, fer à souder, loupe-lampe. */
function workbenchModel(): ModelBuilder {
  return (def) => {
    const root = new Group();
    root.position.set(def.x, 0, def.z);
    const g = place(root, 0, 0, 0, 0.92);
    // Châssis ouvert du module.
    block(g, 0.5, 0.06, 0.36, MUSTARD, 0.15, 0, 0.02, 0.02);
    for (const s of [-1, 1]) block(g, 0.5, 0.18, 0.03, MUSTARD, 0.15, 0, 0.02 + s * 0.17, 0.01);
    block(g, 0.4, 0.02, 0.28, "#4f7d34", 0.15, 0.07, 0.02, 0.005);
    for (let i = 0; i < 5; i++) block(g, 0.05, 0.05, 0.05, ["#c8453a", CHARCOAL, CREAM, MUSTARD, "#6de0ce"][i], 0.0 + i * 0.07, 0.09, -0.04 + (i % 2) * 0.1, 0.01);
    const coil = mesh(new TorusGeometry(0.05, 0.022, 6, 10), toon("#c9773f"), 0.33, 0.13, 0.08);
    coil.rotation.x = Math.PI / 2;
    g.add(coil);
    cylinder(g, 0.008, 0.35, "#c9ccc6", 0.38, 0.06, -0.1, 4);
    floorCable(g, [[0.2, 0.2], [0.0, 0.33], [-0.25, 0.25]], "#c8453a", 0.008);
    const front = block(g, 0.5, 0.2, 0.03, MUSTARD, -0.25, 0, 0.3, 0.01);
    front.rotation.set(-1.3, 0.3, 0);
    // Fer à souder sur son support.
    block(g, 0.14, 0.04, 0.12, CHARCOAL, -0.45, 0, -0.2, 0.01);
    const iron = cylinder(g, 0.02, 0.28, LEATHER_LIGHT, -0.45, 0.1, -0.2, 6);
    iron.rotation.z = 1.0;
    // Loupe-lampe articulée.
    cylinder(g, 0.08, 0.04, CHARCOAL, -0.75, 0, -0.25, 10);
    const arm1 = cylinder(g, 0.015, 0.45, CHARCOAL, -0.72, 0.04, -0.25, 5);
    arm1.rotation.z = -0.3;
    const lens = mesh(new TorusGeometry(0.09, 0.025, 6, 14), toon(MUSTARD), -0.55, 0.5, -0.1);
    lens.rotation.x = -0.9;
    g.add(lens);
    ball(g, glow("#fff2c0"), -0.55, 0.47, -0.08, 0.05);
    // Bobine de fil et pinces.
    const spool = cylinder(g, 0.06, 0.08, "#c9773f", 0.65, 0, 0.2, 10);
    spool.rotation.x = Math.PI / 2;
    spool.position.y = 0.06;
    block(g, 0.16, 0.02, 0.03, "#c8453a", 0.6, 0, -0.22, 0.008).rotation.y = 0.5;
    note(g, "module radio\n= 2 pièces", 0.75, 0.01, -0.05, 0, 0);
    g.children[g.children.length - 1].rotation.set(-Math.PI / 2, 0, 0.3);
    return { group: root, height: 1.4 };
  };
}

/** Banc de batteries : trois accus trapus, câbles et voyants de charge ambrés. */
function upgradeModel(): ModelBuilder {
  return (def) => {
    const g = new Group();
    g.position.set(def.x, 0, def.z);
    g.rotation.y = -0.15;
    block(g, 1.3, 0.08, 0.7, LEATHER_LIGHT, 0, 0.7, 0, 0.03);
    for (const [x, z] of [[-0.58, -0.28], [0.58, -0.28], [-0.58, 0.28], [0.58, 0.28]]) block(g, 0.08, 0.7, 0.08, LEATHER, x, 0, z, 0.02);
    block(g, 1.2, 0.05, 0.6, LEATHER, 0, 0.2, 0, 0.02);
    for (let i = 0; i < 3; i++) {
      const x = -0.4 + i * 0.4;
      block(g, 0.3, 0.36, 0.38, OLIVE_DARK, x, 0.78, 0, 0.06);
      block(g, 0.3, 0.06, 0.38, MUSTARD, x, 1.14, 0, 0.03);
      for (const s of [-1, 1]) cylinder(g, 0.025, 0.05, s < 0 ? "#c8453a" : CHARCOAL, x + s * 0.08, 1.2, 0, 8);
      block(g, 0.2, 0.05, 0.01, i < 2 ? "#ffb35a" : "#5a4a30", x, 0.95, 0.195, 0.005).material = glow(i < 2 ? "#ffb35a" : "#5a4a30");
    }
    block(g, 0.4, 0.3, 0.3, CREAM_DARK, 0.3, 0.25, 0, 0.04);
    cylinder(g, 0.08, 0.02, CHARCOAL, 0.3, 0.42, 0.16, 12).rotation.x = Math.PI / 2;
    floorCable(g, [[-0.4, 0.1], [-0.2, 0.4], [0.3, 0.3]], CHARCOAL, 0.02);
    return { group: g, height: 1.4 };
  };
}

/** Modèles des objets interactifs propres à cette zone, par identifiant (voir game/level.ts). */
export const EAST_MODELS: Record<string, ModelBuilder> = {
  comms: commsModel(),
  workbench: workbenchModel(),
  upgrade: upgradeModel(),
};
