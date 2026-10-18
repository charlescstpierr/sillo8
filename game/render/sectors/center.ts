// Décor de la zone « center » de SILLO 8, étage 1 : poste de sécurité, hub central rond,
// couloir nord et accès à l'étage 2 (escalier qui plonge dans le noir).
import {
  BufferAttribute, CylinderGeometry, Group, Mesh, MeshBasicMaterial, Path, PlaneGeometry, Shape, ShapeGeometry,
  SphereGeometry, TorusGeometry, type Object3D,
} from "three";
import { onWorldRefresh, ruin, type DecorContext, type ModelBuilder, type WorldView } from "../world";
import { decorateStory } from "../storyProps";
import type { SiloState } from "../../state";
import type { Box } from "../../collision";
import { toon } from "../toon";
import { PALETTE } from "../palette";
import {
  block, can, crate, cylinder, decal, grass, hazardStrip, mesh, panel, rubble, signBoard, stringLights,
} from "../props";
import {
  blobTexture, centerArrowTexture, centerEmblemTexture, centerMonitorTexture, centerNoteTexture, centerPadlockTexture,
  centerRingTexture, hazardTexture, paperTexture, rng, signTexture,
} from "../textures";

// Teintes « jouet en pâte » de la fiche personnage.
const MUSTARD = "#d8a43a";
const OLIVE = "#6b7550";
const OLIVE_DARK = "#556045";
const LEATHER = "#6a4528";
const LEATHER_LIGHT = "#7a4a2a";
const CREAM = "#e9dcc0";
const CHARCOAL = "#3a332c";
const BURLAP = "#b39a6a";

const WARM = "#ffd98a";
const EMERGENCY = "#ff3b2a";
const DEAD = "#3a2f28";
const KEY_OK = "#7ee07a";

/** Ampoules qui changent avec le courant : éteintes ou rouge de secours, puis chaudes. */
interface Bulb { material: MeshBasicMaterial; off: string; on: string; }
const bulbs: Bulb[] = [];
/** Voyants de lecteur de carte : rouge tant que la clé d'accès manque. */
const readers: MeshBasicMaterial[] = [];
let shutters: Group[] = [];
let booms: Group[] = [];
let powered = false;
let unlocked = false;

function bulb(off: string, on = WARM): MeshBasicMaterial {
  const material = new MeshBasicMaterial({ color: off });
  bulbs.push({ material, off, on });
  return material;
}

function centerRefresh(_view: WorldView, state: SiloState): void {
  powered = state.has("generator_powered");
  unlocked = state.has("keycard");
  for (const b of bulbs) b.material.color.set(powered ? b.on : b.off);
  for (const m of readers) m.color.set(unlocked ? KEY_OK : EMERGENCY);
  // Le rideau de fer de l'accès remonte dans le linteau.
  for (const s of shutters) s.scale.y = unlocked ? 0.12 : 1;
  for (const b of booms) b.rotation.z = unlocked ? 1.25 : 0;
}

function collide(ctx: DecorContext, cx: number, cz: number, w: number, d: number): void {
  const box: Box = { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 };
  ctx.colliders.push(box);
}

/** Point sur un cercle centré sur le hub (angle en radians, x = cos, z = sin). */
function polar(r: number, a: number): [number, number] {
  return [Math.cos(a) * r, Math.sin(a) * r];
}

/** Arc de tore couché au sol entre deux angles (rambarde, banc, liseré). */
function torusArc(parent: Object3D, r: number, tube: number, a0: number, a1: number, color: string | MeshBasicMaterial, y: number, flatten = 1): Mesh {
  const material = typeof color === "string" ? toon(color) : color;
  const m = mesh(new TorusGeometry(r, tube, 8, Math.max(8, Math.round((a1 - a0) * r * 4)), a1 - a0), material, 0, y, 0);
  m.rotation.set(Math.PI / 2, 0, a0);
  m.scale.z = flatten;
  parent.add(m);
  return m;
}

/** Perce le sol (et le fond sombre) pour laisser voir un escalier qui descend. */
function punchHole(root: Group, x0: number, x1: number, z0: number, z1: number): void {
  for (const child of root.children) {
    if (!(child instanceof Mesh) || !(child.geometry instanceof PlaneGeometry)) continue;
    const { width: w, height: d } = child.geometry.parameters;
    if (w < 8 || child.scale.x !== 1) continue;
    const px = child.position.x, pz = child.position.z;
    if (x0 < px - w / 2 || x1 > px + w / 2 || z0 < pz - d / 2 || z1 > pz + d / 2) continue;
    // Repère local du plan couché : u = x − px, v = pz − z.
    const shape = new Shape();
    shape.moveTo(-w / 2, -d / 2); shape.lineTo(w / 2, -d / 2); shape.lineTo(w / 2, d / 2); shape.lineTo(-w / 2, d / 2); shape.closePath();
    const hole = new Path();
    hole.moveTo(x0 - px, pz - z1); hole.lineTo(x1 - px, pz - z1); hole.lineTo(x1 - px, pz - z0); hole.lineTo(x0 - px, pz - z0); hole.closePath();
    shape.holes.push(hole);
    const geometry = new ShapeGeometry(shape);
    const pos = geometry.getAttribute("position") as BufferAttribute;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) + w / 2) / w;
      uv[i * 2 + 1] = (pos.getY(i) + d / 2) / d;
    }
    geometry.setAttribute("uv", new BufferAttribute(uv, 2));
    child.geometry = geometry;
  }
}

// ——— Petits objets ———

function sandbags(ctx: DecorContext, x0: number, x1: number, z: number, seed: number): void {
  const r = rng(seed);
  const geometry = new SphereGeometry(1, 10, 6);
  const count = Math.round((x1 - x0) / 0.62);
  for (let row = 0; row < 2; row++) {
    const n = row === 0 ? count : count - 1;
    for (let i = 0; i < n; i++) {
      const x = x0 + 0.31 + i * ((x1 - x0 - 0.62) / Math.max(1, count - 1)) + (row ? 0.31 : 0);
      const bag = mesh(geometry, toon(r() > 0.4 ? BURLAP : "#9c8558"), x, 0.13 + row * 0.24, z + (r() - 0.5) * 0.06);
      bag.scale.set(0.33, 0.14, 0.24);
      bag.rotation.y = (r() - 0.5) * 0.3;
      ctx.root.add(bag);
    }
  }
  collide(ctx, (x0 + x1) / 2, z, x1 - x0, 0.55);
}

function plank(parent: Object3D, x: number, y: number, z: number, length: number, rx: number, ry: number, rz: number, color: string = PALETTE.wood): void {
  const m = block(parent, 0.18, length, 0.04, color, x, y, z, 0.015);
  m.rotation.set(rx, ry, rz);
}

function locker(parent: Object3D, x: number, z: number, facing: number, color: string, open = false): void {
  const g = new Group();
  g.position.set(x, 0, z);
  g.rotation.y = facing;
  block(g, 0.72, 1.75, 0.46, color, 0, 0, 0, 0.06);
  // Fentes d'aération, poignée, étiquette.
  for (let i = 0; i < 3; i++) block(g, 0.36, 0.035, 0.02, CHARCOAL, 0, 1.38 + i * 0.08, 0.235, 0.01);
  block(g, 0.05, 0.18, 0.04, CREAM, 0.24, 0.85, 0.24, 0.015);
  panel(g, signTexture(open ? "VIDE" : "N° " + Math.round(Math.abs(z * 7)) % 40, { bg: CREAM, fg: CHARCOAL, width: 128, height: 48 }), 0, 1.15, 0.236, 0.28, 0.1, 0);
  if (open) {
    const door = block(g, 0.68, 1.6, 0.04, color, 0, 0.06, 0, 0.02);
    door.position.set(-0.3 - 0.22, 0.86, 0.45);
    door.rotation.y = -1.3;
    block(g, 0.6, 1.55, 0.02, CHARCOAL, 0, 0.08, 0.22, 0.01);
  }
  parent.add(g);
}

function boxStack(parent: Object3D, x: number, z: number, levels: number, seed: number): void {
  const r = rng(seed);
  for (let i = 0; i < levels; i++) {
    const b = block(parent, 0.5, 0.32, 0.38, r() > 0.5 ? "#c9a878" : "#b8956a", x + (r() - 0.5) * 0.08, i * 0.32, z + (r() - 0.5) * 0.08, 0.03);
    b.rotation.y = (r() - 0.5) * 0.4;
    panel(parent, signTexture(["ARCHIVES", "DOSSIERS", "BADGES", "RAPPORTS"][i % 4], { bg: CREAM, fg: CHARCOAL, width: 192, height: 64 }), b.position.x, i * 0.32 + 0.16, b.position.z + 0.195, 0.3, 0.1, 0);
  }
}

/** Tas de ferraille (tôles, tuyaux, boulons) pour l'ambiance bricoleur. */
function scrapPile(parent: Object3D, x: number, z: number, seed: number): void {
  const r = rng(seed);
  for (let i = 0; i < 6; i++) {
    const sheet = block(parent, 0.4 + r() * 0.3, 0.03, 0.3 + r() * 0.2, r() > 0.5 ? PALETTE.steel : PALETTE.rust, x + (r() - 0.5) * 0.5, 0.02 + i * 0.03, z + (r() - 0.5) * 0.4, 0.01);
    sheet.rotation.set((r() - 0.5) * 0.4, r() * 3, (r() - 0.5) * 0.4);
  }
  for (let i = 0; i < 3; i++) {
    const pipe = mesh(new CylinderGeometry(0.04, 0.04, 0.7, 8), toon(PALETTE.steelDark), x + (r() - 0.5) * 0.5, 0.1, z + (r() - 0.5) * 0.4);
    pipe.rotation.set(Math.PI / 2, 0, r() * 3);
    parent.add(pipe);
  }
}

/** Bougie consumée, éteinte depuis longtemps : mèche noire, cire coulée. */
function candle(parent: Object3D, x: number, z: number, height = 0.14): void {
  cylinder(parent, 0.04, height, CREAM, x, 0, z, 8);
  cylinder(parent, 0.06, 0.012, CREAM, x + 0.02, 0, z, 10);
  cylinder(parent, 0.006, 0.03, CHARCOAL, x, height, z, 4);
}

// ——— Sécurité ———

function decorateSecurity(ctx: DecorContext): void {
  const { root } = ctx;
  ruin(root, -5, 5, 7, 22, 701, 1, 0.8);

  // Ligne de contrôle (z = 15.5) : comptoir, portique détecteur de métaux, tourniquet.
  const lineZ = 15.5;
  block(root, 3.2, 0.95, 0.55, OLIVE, -3.25, 0, lineZ, 0.06);
  block(root, 3.35, 0.08, 0.7, PALETTE.wood, -3.25, 0.95, lineZ, 0.03);
  panel(root, signTexture("CONTRÔLE\nDES SACS", { bg: CREAM, fg: CHARCOAL, border: MUSTARD, width: 256, height: 128 }), -3.25, 0.55, lineZ + 0.28, 0.7, 0.35, 0);
  boxStack(root, -4.3, lineZ - 0.95, 2, 31);
  collide(ctx, -3.25, lineZ, 3.3, 0.7);
  // Portique.
  for (const side of [-1, 1]) {
    block(root, 0.26, 2.1, 0.5, CREAM, side * 1.32, 0, lineZ, 0.08);
    block(root, 0.28, 0.3, 0.52, OLIVE_DARK, side * 1.32, 0, lineZ, 0.05);
    collide(ctx, side * 1.32, lineZ, 0.3, 0.55);
  }
  block(root, 2.92, 0.32, 0.54, CREAM, 0, 2.06, lineZ, 0.1);
  panel(root, signTexture("DÉTECTEUR", { bg: CHARCOAL, fg: CREAM, width: 256, height: 64 }), 0, 2.22, lineZ + 0.28, 1.0, 0.22, 0);
  root.add(mesh(new SphereGeometry(0.06, 8, 6), bulb(EMERGENCY, KEY_OK), -0.75, 2.42, lineZ, false));
  root.add(mesh(new SphereGeometry(0.06, 8, 6), bulb(DEAD, MUSTARD), 0.75, 2.42, lineZ, false));
  // Tourniquet et barrière.
  block(root, 0.4, 0.95, 0.5, PALETTE.steelDark, 2.05, 0, lineZ, 0.08);
  block(root, 0.42, 0.06, 0.52, MUSTARD, 2.05, 0.95, lineZ, 0.02);
  for (let i = 0; i < 3; i++) {
    const arm = mesh(new CylinderGeometry(0.03, 0.03, 0.6, 6), toon(PALETTE.steel), 2.05, 0.8, lineZ);
    arm.rotation.set(Math.PI / 2, (i * Math.PI * 2) / 3, 0);
    arm.rotateX(0.35);
    arm.translateY(0.3);
    root.add(arm);
  }
  for (let x = 2.7; x <= 4.85; x += 0.7) cylinder(root, 0.045, 0.95, CHARCOAL, x, 0, lineZ, 8);
  const rail = mesh(new CylinderGeometry(0.04, 0.04, 2.3, 8), toon(MUSTARD), 3.75, 0.95, lineZ);
  rail.rotation.z = Math.PI / 2;
  root.add(rail);
  collide(ctx, 3.15, lineZ, 3.4, 0.55);

  // Poste de garde : bureau, écrans de surveillance, chaise, tasse.
  block(root, 2.6, 0.78, 0.8, LEATHER_LIGHT, -3.45, 0, 10.4, 0.05);
  block(root, 2.75, 0.08, 0.9, PALETTE.wood, -3.45, 0.78, 10.4, 0.03);
  block(root, 0.6, 0.78, 1.5, LEATHER_LIGHT, -2.2, 0, 11.2, 0.05);
  block(root, 0.7, 0.08, 1.6, PALETTE.wood, -2.2, 0.78, 11.2, 0.03);
  collide(ctx, -3.45, 10.4, 2.75, 0.9);
  collide(ctx, -2.2, 11.2, 0.7, 1.6);
  const screens = ["CAM 01 HUB", "CAM 02 ENTRÉE", "CAM 03 NORD"];
  screens.forEach((label, i) => {
    const x = -4.3 + i * 0.85;
    const y = 0.86 + (i === 1 ? 0.45 : 0);
    block(root, 0.72, 0.56, 0.42, i === 1 ? CREAM : "#cfc2a2", x, y, 10.2, 0.09);
    panel(root, centerMonitorTexture(label, i + 1), x, y + 0.29, 10.415, 0.56, 0.42, 0, true);
  });
  block(root, 0.5, 0.05, 0.2, CHARCOAL, -3.4, 0.86, 10.65, 0.02);
  cylinder(root, 0.05, 0.1, CREAM, -2.3, 0.86, 10.9, 10);
  // Chaise de bureau tournée vers les écrans.
  cylinder(root, 0.06, 0.42, CHARCOAL, -3.4, 0, 11.5, 8);
  block(root, 0.55, 0.12, 0.5, OLIVE_DARK, -3.4, 0.42, 11.5, 0.05);
  block(root, 0.5, 0.55, 0.1, OLIVE_DARK, -3.4, 0.54, 11.78, 0.05);
  collide(ctx, -3.4, 11.5, 0.6, 0.6);
  // Paperasse renversée.
  boxStack(root, -4.45, 8.0, 3, 7);
  boxStack(root, -3.75, 7.85, 1, 8);
  const tipped = block(root, 0.5, 0.32, 0.38, "#c9a878", -4.2, 0, 13.2, 0.03);
  tipped.rotation.set(0, 0.6, Math.PI / 2);
  tipped.position.y = 0.25;
  for (let i = 0; i < 7; i++) decal(root, paperTexture(1 + (i % 4)), -4.1 + (i % 3) * 0.35, 12.7 + i * 0.12, 0.22, 0.28, i * 1.3, 0.021);
  collide(ctx, -4.15, 7.95, 1.1, 0.6);

  // Enseigne et cadenas sur le mur nord, côté sud (face caméra).
  signBoard(root, "POSTE DE SÉCURITÉ", -2.95, 1.2, 7.17, 2.3, 0.42, 0, { bg: CREAM, fg: CHARCOAL, border: MUSTARD });
  panel(root, centerPadlockTexture(), -4.55, 1.2, 7.17, 0.48, 0.48, 0);
  // Râtelier d'armes vide : un seul outil oublié.
  block(root, 1.8, 1.05, 0.08, LEATHER, 3.2, 0.35, 7.2, 0.02);
  for (let i = 0; i < 5; i++) {
    block(root, 0.06, 0.06, 0.16, CREAM, 2.5 + i * 0.35, 1.1, 7.3, 0.02);
    block(root, 0.06, 0.06, 0.16, CREAM, 2.5 + i * 0.35, 0.55, 7.3, 0.02);
  }
  const wrench = block(root, 0.06, 0.55, 0.03, PALETTE.steel, 3.9, 0.55, 7.32, 0.015);
  wrench.rotation.z = 0.15;
  panel(root, signTexture("ARMES\nRESTITUÉES", { bg: CREAM, fg: PALETTE.danger, width: 256, height: 128 }), 2.85, 0.8, 7.27, 0.5, 0.25, 0.1);
  stringLights(root, 1.6, 7.35, 4.8, 7.35, 1.55, 8);

  // Coin de la borne de recharge (piles) : bandes, câbles, caisse de piles, tabouret.
  hazardStrip(root, 3.6, 11.75, 1.4, 0.18);
  hazardStrip(root, 3.6, 10.25, 1.4, 0.18);
  const lead = mesh(new CylinderGeometry(0.035, 0.035, 2.0, 6), toon(CHARCOAL), 4.4, 0.04, 10.0);
  lead.rotation.set(Math.PI / 2, 0, 0.9);
  root.add(lead);
  crate(root, 4.4, 12.5, 0.5, 0.3);
  collide(ctx, 4.4, 12.5, 0.6, 0.6);
  cylinder(root, 0.2, 0.45, LEATHER, 2.5, 0, 12.3, 10);
  cylinder(root, 0.24, 0.06, MUSTARD, 2.5, 0.45, 12.3, 12);

  // Casiers contre le mur est, l'un forcé.
  const lockerColors = [OLIVE, OLIVE_DARK, OLIVE, OLIVE_DARK];
  lockerColors.forEach((color, i) => locker(root, 4.6, 16.6 + i * 0.76, -Math.PI / 2, color, i === 2));
  collide(ctx, 4.6, 17.75, 0.5, 3.1);
  plank(root, 4.1, 0, 15.95, 1.5, 0, 0, 0.35, PALETTE.woodDark);

  // Barricade de sacs de sable et de planches derrière la porte sud.
  sandbags(ctx, -4.7, -2.0, 20.8, 11);
  sandbags(ctx, 2.0, 4.2, 20.8, 12);
  plank(root, -3.6, 0.45, 20.55, 1.6, 0, 0, 1.45);
  plank(root, -3.0, 0.45, 20.5, 1.4, 0, 0, 1.75, PALETTE.woodDark);
  plank(root, 3.1, 0.45, 20.55, 1.6, 0, 0, 1.6);
  can(root, -2.4, 19.9, PALETTE.rustLight, true);
  rubble(root, 4.5, 21.3, 5, 77, 0.3);

  ctx.light(-3.2, 2.3, 12.0, "#ffd08a", 2.4, 7.5, 0.3, 21);
}

// ——— Hub central ———

function decorateHub(ctx: DecorContext): void {
  const { root } = ctx;
  const deg = Math.PI / 180;
  // Anneaux peints : la salle carrée se lit comme un hall rond.
  decal(root, centerRingTexture(), 0, 0, 13.6, 13.6, 0, 0.006);
  ruin(root, -7, 7, -7, 7, 702, 1, 0.35);

  // Plots lumineux encastrés sur le grand cercle.
  const studGeometry = new CylinderGeometry(0.08, 0.1, 0.04, 10);
  for (let i = 0; i < 24; i++) {
    const [x, z] = polar(6.05, (i / 24) * Math.PI * 2);
    root.add(mesh(studGeometry, bulb(i % 3 === 0 ? EMERGENCY : DEAD, WARM), x, 0.02, z, false));
  }

  // Estrade ronde centrale, emblème du silo et anneau qui s'illumine.
  cylinder(root, 2.6, 0.06, "#6b6a5e", 0, 0, 0, 48);
  cylinder(root, 2.3, 0.12, OLIVE_DARK, 0, 0, 0, 48);
  decal(root, centerEmblemTexture(), 0, 0, 3.6, 3.6, 0, 0.125);
  torusArc(root, 2.02, 0.05, 0, Math.PI * 2, bulb("#5a2620", "#ffe2a0"), 0.125, 0.6);
  for (let i = 0; i < 16; i++) {
    const [x, z] = polar(2.45, (i / 16) * Math.PI * 2);
    root.add(mesh(new SphereGeometry(0.05, 8, 6), bulb(i % 4 === 0 ? EMERGENCY : DEAD, MUSTARD), x, 0.07, z, false));
  }

  // Couronne de 8 lampadaires-piliers entre les portes.
  for (let i = 0; i < 8; i++) {
    const a = (22.5 + i * 45) * deg;
    const [x, z] = polar(5.0, a);
    cylinder(root, 0.34, 0.3, CHARCOAL, x, 0, z, 14);
    cylinder(root, 0.2, 1.6, CREAM, x, 0.3, z, 14);
    cylinder(root, 0.23, 0.12, MUSTARD, x, 0.95, z, 14);
    cylinder(root, 0.3, 0.12, CHARCOAL, x, 1.9, z, 14);
    root.add(mesh(new SphereGeometry(0.2, 12, 10), bulb(i % 4 === 1 ? EMERGENCY : DEAD, WARM), x, 2.15, z, false));
    const cage = mesh(new TorusGeometry(0.21, 0.025, 6, 14), toon(CHARCOAL), x, 2.15, z);
    cage.rotation.x = Math.PI / 2;
    root.add(cage);
    collide(ctx, x, z, 0.7, 0.7);
  }

  // Rambardes courbes sur le grand cercle, ouvertes face aux quatre portes.
  for (let q = 0; q < 4; q++) {
    const a0 = (24 + q * 90) * deg;
    const a1 = (66 + q * 90) * deg;
    torusArc(root, 6.4, 0.05, a0, a1, MUSTARD, 0.95);
    torusArc(root, 6.4, 0.035, a0, a1, CHARCOAL, 0.55);
    for (let a = a0; a <= a1 + 0.001; a += (a1 - a0) / 5) {
      const [x, z] = polar(6.4, a);
      cylinder(root, 0.05, 0.95, CHARCOAL, x, 0, z, 8);
      collide(ctx, x, z, 0.55, 0.55);
    }
  }

  // Bancs courbes tournés vers l'estrade.
  for (let q = 0; q < 4; q++) {
    const mid = (45 + q * 90) * deg;
    const a0 = mid - 11 * deg, a1 = mid + 11 * deg;
    torusArc(root, 5.75, 0.24, a0, a1, q % 2 ? LEATHER_LIGHT : OLIVE, 0.42, 0.45);
    torusArc(root, 6.05, 0.09, a0, a1, LEATHER, 0.78, 1.2);
    for (const a of [a0 + 0.04, mid, a1 - 0.04]) {
      const [x, z] = polar(5.8, a);
      block(root, 0.16, 0.36, 0.16, CHARCOAL, x, 0, z, 0.03);
      collide(ctx, x, z, 0.75, 0.75);
    }
  }

  // Poteau indicateur, côté sud-ouest, lisible en arrivant de la sécurité.
  const [sx, sz] = [-2.7, 2.7];
  cylinder(root, 0.08, 2.7, LEATHER, sx, 0, sz, 8);
  cylinder(root, 0.22, 0.12, CHARCOAL, sx, 0, sz, 10);
  panel(root, centerArrowTexture("ACCÈS ÉTAGE 2", "up", CREAM), sx, 2.38, sz + 0.06, 1.7, 0.53, 0);
  panel(root, centerArrowTexture("DORTOIRS\nENTREPÔT · CAFÉTÉRIA", "left"), sx - 0.8, 1.82, sz + 0.06, 1.95, 0.61, 0.05);
  panel(root, centerArrowTexture("INFIRMERIE · ATELIER\nSALLE DE CONTRÔLE", "right", OLIVE, CREAM), sx + 0.8, 1.2, sz + 0.06, 1.95, 0.61, -0.05);
  collide(ctx, sx, sz, 0.4, 0.4);

  // Panneau des survivants contre le mur nord : liège couvert de mots.
  const bx = -4.25, bz = -6.82;
  block(root, 2.5, 1.15, 0.1, LEATHER, bx, 0.42, bz, 0.04);
  block(root, 2.3, 0.97, 0.04, "#b98a5a", bx, 0.51, bz + 0.05, 0.01);
  signBoard(root, "MOTS DES SURVIVANTS", bx, 1.48, bz + 0.08, 1.6, 0.2, 0, { bg: MUSTARD, fg: CHARCOAL });
  // Mots griffonnés le matin de la descente, de travers, autour de l'avis officiel (storyProps.ts) bien droit.
  const notes = [
    "Ne remontez\npas !", "Lila, on\nt'attend\nen bas", "PILES :\nvoir Cuisine", "Descente\nà 6 h",
    "J'ai laissé\nle chat.\nPardon.", "Rendez-vous\nétage 2", "On revient\nvous chercher", "Pas de bruit\ndans le\nnord !",
  ];
  const nr = rng(55);
  notes.forEach((text, i) => {
    const col = [-0.95, -0.57, 0.57, 0.95][i % 4], row = Math.floor(i / 4);
    const note = panel(root, centerNoteTexture(text, i + 1), bx + col + (nr() - 0.5) * 0.06, 1.12 - row * 0.44 + (nr() - 0.5) * 0.06, bz + 0.08 + i * 0.001, 0.33, 0.38, 0);
    note.rotation.z = (nr() - 0.5) * 0.4;
  });
  // Bougies et fleurs séchées au pied du panneau.
  candle(root, bx - 0.7, bz + 0.35);
  candle(root, bx - 0.5, bz + 0.45, 0.1);
  candle(root, bx + 0.6, bz + 0.38, 0.18);
  grass(root, bx + 0.1, bz + 0.35, 0.35);
  collide(ctx, bx, bz + 0.1, 2.5, 0.4);

  // Campement d'un survivant (sud-ouest, derrière la rambarde) : sac de couchage, lanterne, tasse.
  const camp = new Group();
  camp.position.set(-5.55, 0, 5.35);
  camp.rotation.y = 0.6;
  decal(camp, blobTexture("shadow"), 0, 0, 1.6, 2.4, 0, 0.007);
  block(camp, 0.85, 0.2, 1.75, OLIVE, 0, 0, 0, 0.1);
  block(camp, 0.8, 0.08, 0.9, OLIVE_DARK, 0, 0.18, 0.35, 0.04);
  const pillow = mesh(new CylinderGeometry(0.17, 0.17, 0.75, 12), toon(CREAM), 0, 0.2, -0.75);
  pillow.rotation.z = Math.PI / 2;
  camp.add(pillow);
  block(camp, 0.18, 0.24, 0.18, LEATHER, 0.65, 0, -0.6, 0.04);
  camp.add(mesh(new SphereGeometry(0.08, 8, 6), bulb("#ffb35a", "#ffcf6a"), 0.65, 0.3, -0.6, false));
  cylinder(camp, 0.05, 0.1, MUSTARD, 0.6, 0, -0.15, 10);
  block(camp, 0.24, 0.05, 0.32, PALETTE.fabric, 0.6, 0, 0.3, 0.02);
  ctx.root.add(camp);
  can(root, -4.7, 6.3, PALETTE.rustLight);
  can(root, -4.5, 6.4, PALETTE.steel, true);
  collide(ctx, -5.55, 5.35, 1.3, 1.6);

  // Coin nord-est : ferraille, caisses, bâche.
  crate(root, 5.6, -5.7, 0.7, 0.2);
  crate(root, 5.75, -5.6, 0.5, 0.5, 0.7);
  crate(root, 4.7, -6.2, 0.55, -0.3);
  scrapPile(root, 5.3, -4.4, 9);
  block(root, 0.9, 0.04, 0.7, PALETTE.tarp, 4.8, 0.55, -6.1, 0.02).rotation.z = 0.2;
  collide(ctx, 5.4, -5.9, 1.6, 1.4);
  // Coin sud-est : plante en pot, caisse, piles.
  cylinder(root, 0.3, 0.42, PALETTE.rust, 5.9, 0, 5.9, 12);
  grass(root, 5.9, 5.9, 0.75);
  grass(root, 5.8, 6.0, 0.6);
  crate(root, 5.1, 6.15, 0.55, 0.4);
  collide(ctx, 5.5, 6.0, 1.3, 1.0);
  // Guirlande de fortune entre les piliers nord.
  const [lx0, lz0] = polar(5.0, 247.5 * deg);
  const [lx1, lz1] = polar(5.0, 292.5 * deg);
  stringLights(root, lx0, lz0, lx1, lz1, 2.0, 10);

  ctx.light(0, 2.7, 0.2, "#ffd59a", 2.6, 9, 0.12, 31, false);
  ctx.light(-4.4, 1.8, 4.6, "#ffb46a", 1.6, 6, 0.35, 32, false);
  ctx.beam(0, 2.7, 0.2, 1.6, "#ffe6b0");
  ctx.dust(0, 2.4, 0);
  ctx.animate((_dt, time) => {
    // Avant le courant, les feux de secours clignotent doucement.
    if (powered) return;
    const on = Math.sin(time * 2.4) > 0;
    for (const b of bulbs) if (b.off === EMERGENCY) b.material.color.set(on ? EMERGENCY : "#6a1e16");
  });
}

// ——— Couloir nord et accès à l'étage 2 ———

function decorateNorth(ctx: DecorContext): void {
  const { root } = ctx;
  ruin(root, -2, 2, -14, -7, 703, 0, 0.6);
  // Tuyaux le long du mur ouest, avec colliers.
  for (const [y, color] of [[1.2, PALETTE.rust], [1.42, OLIVE]] as const) {
    const pipe = mesh(new CylinderGeometry(0.07, 0.07, 6.6, 10), toon(color), -1.72, y, -10.5);
    pipe.rotation.x = Math.PI / 2;
    root.add(pipe);
  }
  for (let z = -8; z >= -13; z -= 1.6) block(root, 0.12, 0.42, 0.08, CHARCOAL, -1.74, 1.05, z, 0.02);
  // Appliques murales grillagées.
  for (const x of [-1.78, 1.78]) {
    block(root, 0.12, 0.2, 0.2, CHARCOAL, x, 1.2, -10.4, 0.03);
    root.add(mesh(new SphereGeometry(0.09, 8, 6), bulb(x < 0 ? EMERGENCY : DEAD, WARM), x * 0.96, 1.3, -10.4, false));
  }
  // Flèche peinte au sol et caisse abandonnée.
  decal(root, centerArrowTexture("ÉTAGE 2", "up"), 0, -10.6, 1.9, 0.6, 0, 0.018);
  crate(root, -1.5, -12.6, 0.55, 0.3);
  collide(ctx, -1.5, -12.6, 0.6, 0.6);
  scrapPile(root, 1.4, -8.6, 21);

  // Linteau « ACCÈS ÉTAGE 2 » au-dessus de la porte à clé, lecteur de carte à droite.
  block(root, 3.5, 0.42, 0.34, OLIVE_DARK, 0, 1.78, -13.95, 0.05);
  panel(root, signTexture("ACCÈS ÉTAGE 2", { bg: CHARCOAL, fg: MUSTARD, width: 512, height: 80 }), 0, 1.99, -13.775, 2.6, 0.32, 0, true);
  block(root, 0.22, 0.34, 0.08, CHARCOAL, 1.72, 0.92, -13.8, 0.03);
  block(root, 0.12, 0.02, 0.02, CREAM, 1.72, 1.0, -13.755, 0.005);
  const reader = new MeshBasicMaterial({ color: EMERGENCY });
  readers.push(reader);
  root.add(mesh(new SphereGeometry(0.04, 8, 6), reader, 1.72, 1.17, -13.75, false));
}

function decorateStairs(ctx: DecorContext): void {
  const { root } = ctx;
  // Cage d'escalier : x [-1.4, 1.4], z [-21.5, -19.55], qui plonge sous le sol.
  const hx = 1.4, top = -19.55, end = -21.5;
  punchHole(root, -hx, hx, end, top);
  const steps = 7, tread = 0.26, rise = 0.2;
  for (let i = 0; i < steps; i++) {
    const y = -(i + 1) * rise;
    const t = i / (steps - 1);
    const shade = Math.round(195 - t * 150);
    const color = `rgb(${shade},${Math.round(shade * 0.95)},${Math.round(shade * 0.85)})`;
    block(root, hx * 2, 2 + y, tread, color, 0, -2, top - tread * (i + 0.5), 0.02);
    // Nez de marche jaune, de plus en plus éteint.
    block(root, hx * 2, 0.03, 0.05, t < 0.5 ? MUSTARD : "#5a4a2a", 0, y - 0.01, top - tread * i - 0.03, 0.01);
  }
  block(root, hx * 2, 0.5, 0.4, "#121110", 0, -2.0, end + 0.05, 0.02);
  // Parois de la fosse, sombres.
  for (const side of [-1, 1]) block(root, 0.15, 2.2, top - end + 0.4, "#2e2b26", side * (hx + 0.075), -2.2, (top + end) / 2, 0.01);
  block(root, hx * 2 + 0.3, 2.2, 0.15, "#1e1c19", 0, -2.2, end - 0.075, 0.01);
  block(root, hx * 2 + 0.3, 2.2, 0.15, "#2e2b26", 0, -2.2, top + 0.075, 0.01);
  // Veilleuses de secours le long des parois.
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
    root.add(mesh(new SphereGeometry(0.035, 6, 5), bulb("#ff5a36", "#ffb35a"), side * (hx - 0.02), -0.5 - k * 0.35, top - 0.35 - k * 0.55, false));
  }
  // Bordure surélevée à bandes de danger, rambardes.
  const curb = (cx: number, cz: number, w: number, d: number) => {
    block(root, w, 0.3, d, OLIVE_DARK, cx, 0, cz, 0.04);
    const stripes = hazardTexture().clone();
    stripes.needsUpdate = true;
    stripes.repeat.set(Math.max(w, d) / 0.9, 1);
    decal(root, stripes, cx, cz, Math.max(w, d), Math.min(w, d) * 0.7, w > d ? 0 : Math.PI / 2, 0.305);
  };
  curb(-hx - 0.225, (top + end) / 2 - 0.1, 0.45, top - end + 0.5);
  curb(hx + 0.225, (top + end) / 2 - 0.1, 0.45, top - end + 0.5);
  for (const side of [-1, 1]) {
    for (let z = top - 0.1; z >= end - 0.2; z -= 0.6) cylinder(root, 0.04, 0.7, CHARCOAL, side * (hx + 0.22), 0.3, z, 8);
    const rail = mesh(new CylinderGeometry(0.045, 0.045, top - end + 0.3, 8), toon(MUSTARD), side * (hx + 0.22), 1.0, (top + end) / 2 - 0.05);
    rail.rotation.x = Math.PI / 2;
    root.add(rail);
  }
  collide(ctx, 0, (top + end) / 2 - 0.1, hx * 2 + 0.9, top - end + 0.6);
  for (const side of [-1, 1]) collide(ctx, side * 1.65, -19.45, 0.4, 0.5);

  // Grand panneau sur le mur nord, au-delà de la fosse.
  signBoard(root, "ACCÈS ÉTAGE 2", -2.75, 1.2, -21.82, 2.0, 0.4, 0, { bg: MUSTARD, fg: CHARCOAL, border: CHARCOAL });
  panel(root, centerArrowTexture("DESCENTE", "down", CREAM), 2.75, 1.2, -21.82, 1.3, 0.4, 0);
  // Abords : coffre à outils, bidons, caisses, flaque.
  ruin(root, -4, -1.9, -22, -14, 704, 0, 0.8);
  ruin(root, 1.9, 4, -22, -14, 705, 0, 0.8);
  ruin(root, -1.9, 1.9, -18.2, -14, 706, 0, 0.6);
  block(root, 1.1, 0.75, 0.55, PALETTE.danger, -3.25, 0, -16.2, 0.07);
  block(root, 1.12, 0.1, 0.57, CHARCOAL, -3.25, 0.75, -16.2, 0.03);
  collide(ctx, -3.25, -16.2, 1.15, 0.6);
  cylinder(root, 0.3, 0.85, OLIVE, 3.3, 0, -15.3, 14);
  cylinder(root, 0.31, 0.05, CHARCOAL, 3.3, 0.6, -15.3, 14);
  collide(ctx, 3.3, -15.3, 0.65, 0.65);
  crate(root, 3.1, -20.9, 0.65, 0.3);
  crate(root, 3.35, -20.0, 0.5, -0.2);
  collide(ctx, 3.2, -20.5, 0.9, 1.5);
  decal(root, blobTexture("puddle"), -2.8, -19.5, 1.3, 1.0, 0.4);
  scrapPile(root, -3.0, -21.0, 33);
  hazardStrip(root, 0, -17.9, 3.0, 0.22);

  ctx.light(2.6, 2.2, -17.4, "#ffc070", 2.0, 7, 0.55, 41);
  ctx.light(0, -0.5, -20.6, "#ff4a2a", 1.4, 3.2, 0.25, 42, false);
  ctx.dust(0, 1.8, -20.2);
  ctx.animate((_dt, time) => {
    // Le voyant du lecteur clignote tant que la clé manque.
    if (unlocked) return;
    const on = Math.sin(time * 5) > -0.2;
    for (const m of readers) m.color.set(on ? EMERGENCY : "#5a1a12");
  });
}

export function decorateCenter(ctx: DecorContext): void {
  bulbs.length = 0;
  readers.length = 0;
  shutters = [];
  booms = [];
  onWorldRefresh(centerRefresh);
  decorateSecurity(ctx);
  decorateHub(ctx);
  decorateNorth(ctx);
  decorateStairs(ctx);
  decorateStory(ctx, "center");
}

/**
 * Accès à l'étage 2 : borne à carte et barrière levante en haut des marches,
 * portique blindé à rideau de fer au fond de la fosse.
 */
function stairsGate(): { group: Group; height: number } {
  const g = new Group();
  g.position.set(0, 0, -19);
  // Portique au bas de l'escalier (z local −2.45), ancré dans les parois de la fosse.
  const zf = -2.45;
  for (const side of [-1, 1]) {
    block(g, 0.36, 3.3, 0.44, OLIVE_DARK, side * 1.65, -1.5, zf, 0.09);
    for (const y of [0.4, 1.1]) cylinder(g, 0.04, 0.04, CREAM, side * 1.65 + 0.1, y, zf + 0.23, 8).rotation.x = Math.PI / 2;
  }
  block(g, 3.75, 0.4, 0.52, OLIVE, 0, 1.6, zf, 0.1);
  panel(g, signTexture("ÉTAGE 2", { bg: CHARCOAL, fg: MUSTARD, width: 384, height: 96 }), 0, 1.8, zf + 0.265, 1.1, 0.27, 0, true);
  for (const side of [-1, 1]) {
    const stripes = hazardTexture().clone();
    stripes.needsUpdate = true;
    stripes.repeat.set(1.2, 1);
    panel(g, stripes, side * 1.3, 1.8, zf + 0.265, 0.95, 0.22, 0);
  }
  // Rideau de fer : lames suspendues au linteau, remonté par la clé d'accès.
  const shutter = new Group();
  shutter.position.set(0, 1.6, zf);
  for (let i = 0; i < 15; i++) block(shutter, 2.95, 0.19, 0.06, i % 2 ? "#8f978c" : "#7f8a7e", 0, -0.21 * (i + 1), 0, 0.02);
  block(shutter, 3.0, 0.1, 0.1, MUSTARD, 0, -3.15, 0, 0.03);
  g.add(shutter);
  shutters.push(shutter);

  // Borne à carte (droite) et barrière levante en travers du haut des marches.
  const zb = -0.4;
  block(g, 0.34, 1.0, 0.34, CHARCOAL, 1.65, 0, zb, 0.06);
  block(g, 0.42, 0.36, 0.32, MUSTARD, 1.65, 1.0, zb, 0.08);
  block(g, 0.16, 0.025, 0.03, CHARCOAL, 1.65, 1.12, zb + 0.16, 0.005);
  const reader = new MeshBasicMaterial({ color: EMERGENCY });
  readers.push(reader);
  g.add(mesh(new SphereGeometry(0.07, 8, 6), reader, 1.65, 1.28, zb + 0.15, false));
  block(g, 0.3, 0.95, 0.3, CHARCOAL, -1.65, 0, zb, 0.06);
  const boom = new Group();
  boom.position.set(-1.65, 0.85, zb);
  for (let i = 0; i < 6; i++) block(boom, 0.5, 0.12, 0.1, i % 2 ? CREAM : PALETTE.danger, 0.3 + i * 0.5, -0.06, 0, 0.04);
  g.add(boom);
  booms.push(boom);
  decal(g, blobTexture("shadow"), 0, zb + 0.4, 3.6, 1.0, 0, 0.008);
  return { group: g, height: 1.8 };
}

/** Modèles des objets interactifs propres à cette zone, par identifiant (voir game/level.ts). */
export const CENTER_MODELS: Record<string, ModelBuilder> = {
  stairs: () => stairsGate(),
};
