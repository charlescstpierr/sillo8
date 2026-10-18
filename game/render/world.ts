// Construction 3D du silo : sols, murets coupés à mi-hauteur, portes, décor post-apocalyptique,
// objets interactifs, lumières qui grésillent, poussière dans les faisceaux.
import {
  AdditiveBlending, BufferAttribute, Color, BufferGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial,
  PlaneGeometry, PointLight, Points, PointsMaterial, BoxGeometry, SphereGeometry, CylinderGeometry, TorusGeometry,
  type Scene,
} from "three";
import {
  DOORS, INTERACTABLES, ROOMS, WALL_HEIGHT, WALL_THICKNESS, buildWalls, doorBox, wallBox,
  type Door, type InteractableDef, type Room,
} from "../level";
import { doorOpen, interactableAvailable } from "../rules";
import type { SiloState } from "../state";
import { CENTER_MODELS, decorateCenter } from "./sectors/center";
import { EAST_MODELS, decorateEast } from "./sectors/east";
import { EXTERIOR_MODELS, decorateExterior } from "./sectors/exterior";
import { WEST_MODELS, decorateWest } from "./sectors/west";
import type { Box } from "../collision";
import { glow, toon } from "./toon";
import { PALETTE } from "./palette";
import {
  beamTexture, blobTexture, concreteTexture, concreteFloorTexture, crackTexture, dirtGroundTexture, grateTexture, dirtTexture, paperTexture, sprayTexture, drawingTexture, dustTexture, grimeTexture, holeTexture, liftTexture, rng, signTexture, tilesTexture,
} from "./textures";
import {
  block, can, cable, crate, cylinder, decal, grass, hazardStrip, mesh, overgrowth, panel, rubble, signBoard, stringLights,
} from "./props";
import { addHighlight, type Highlight } from "./highlight";

export interface InteractableView {
  def: InteractableDef;
  group: Group;
  highlight: Highlight;
  /** Hauteur de l'infobulle au-dessus du sol. */
  tooltipHeight: number;
}

interface Flicker {
  x: number; y: number; z: number;
  color: string;
  distance: number;
  base: number;
  seed: number;
  /** 0 = stable, 1 = grésille beaucoup. */
  nervous: number;
  bulb?: Mesh;
  level: number;
}

/** Nombre de lampes ponctuelles réellement allumées : les plus proches du joueur prennent les places. */
export const LIGHT_POOL = 6;

/** Outils fournis aux modules de décor de chaque secteur (render/sectors/*). */
export interface DecorContext {
  root: Group;
  /** Obstacles solides du décor (boîtes alignées sur les axes). */
  colliders: Box[];
  /** Lampe ponctuelle qui peut grésiller (nervous 0 → 1). `fixture` ajoute une ampoule visible. */
  light(x: number, y: number, z: number, color: string, intensity: number, distance: number, nervous: number, seed: number, fixture?: boolean): void;
  /** Faisceau poussiéreux vertical sous une lampe. */
  beam(x: number, top: number, z: number, radius: number, color: string): void;
  /** Point d'émission de poussière flottante (au plus ~4 par secteur). */
  dust(x: number, y: number, z: number): void;
  /** Animation de décor appelée à chaque image (temps en secondes, position du joueur). */
  animate(fn: (dt: number, time: number, playerX: number, playerZ: number) => void): void;
}

export type ModelBuilder = (def: InteractableDef) => { group: Group; height: number };

export interface WorldView {
  root: Group;
  /** Murs, décor solide et portes encore fermées. Recalculé par refresh(). */
  colliders: Box[];
  interactables: Map<string, InteractableView>;
  /** Met à jour portes, relais, cœur et objets ramassés selon l'état (port de SiloWorld.refresh). */
  refresh(state: SiloState): void;
  update(dt: number, time: number, playerX: number, playerZ: number): void;
  /** Éclairage de fin : rouge-orangé (MÈRE) ou teal (N-7). */
  setEndingTint(ending: string): void;
  /** Coupure brève de toutes les lampes (événement « colosse »). */
  shudder(): void;
  setLowQuality(low: boolean): void;
}

function floor(root: Group, room: Room): void {
  const w = room.x1 - room.x0;
  const d = room.z1 - room.z0;
  const source = { metal: liftTexture, tiles: tilesTexture, concrete: concreteFloorTexture, grate: grateTexture, dirt: dirtGroundTexture }[room.floor]();
  const texture = source.clone();
  texture.needsUpdate = true;
  const tile = room.floor === "grate" ? 1 : 2;
  texture.repeat.set(w / tile, d / tile);
  const m = mesh(new PlaneGeometry(w, d), toon("#ffffff", { map: texture, rim: 0 }), (room.x0 + room.x1) / 2, 0, (room.z0 + room.z1) / 2, false);
  m.rotation.x = -Math.PI / 2;
  root.add(m);
}

function wall(root: Group, x0: number, z0: number, x1: number, z1: number): void {
  const length = Math.hypot(x1 - x0, z1 - z0) + WALL_THICKNESS;
  if (length <= WALL_THICKNESS + 0.01) return;
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const r = rng(Math.round(Math.abs(cx * 31 + cz * 17 + length * 7)) + 1);
  // Repère local : `u` le long du mur, `v` à travers.
  const at = (u: number, v = 0): [number, number] => (alongX ? [cx + u, cz + v] : [cx + v, cz + u]);
  const size = (along: number, across: number): [number, number] => (alongX ? [along, across] : [across, along]);

  // Le mur est découpé en tronçons : la plupart intacts, certains effondrés (béton ébréché, fer à béton).
  const pieces = Math.max(1, Math.round(length / 1.8));
  const piece = length / pieces;
  for (let i = 0; i < pieces; i++) {
    const u = -length / 2 + piece * (i + 0.5);
    const broken = pieces > 2 && r() < 0.3;
    const height = broken ? 0.85 + r() * 0.4 : WALL_HEIGHT;
    const texture = concreteTexture().clone();
    texture.needsUpdate = true;
    texture.repeat.set(piece / 2.5, height / 2.5);
    texture.offset.set(r(), 0);
    const [w, d] = size(piece + 0.002, WALL_THICKNESS);
    const [px, pz] = at(u);
    root.add(mesh(new BoxGeometry(w, height, d), toon("#ffffff", { map: texture, rim: 0.12 }), px, height / 2, pz));
    if (!broken) {
      const [cw, cd] = size(piece + 0.02, WALL_THICKNESS + 0.08);
      // Tranche colorée (coupe de la maison de poupée), parfois ébréchée.
      root.add(mesh(new BoxGeometry(cw, 0.09, cd), toon(PALETTE.wallCap), px, WALL_HEIGHT + 0.045, pz));
      if (r() < 0.35) {
        const [nx, nz] = at(u + (r() - 0.5) * piece * 0.6);
        const notch = mesh(new BoxGeometry(0.35, 0.2, WALL_THICKNESS + 0.1), toon(PALETTE.concreteDark), nx, WALL_HEIGHT - 0.02, nz);
        notch.rotation.set(0.3, alongX ? 0 : Math.PI / 2, 0.4);
        root.add(notch);
      }
    } else {
      // Sommet déchiqueté : blocs de béton inclinés + tiges de fer à béton tordues.
      for (let k = 0; k < 4; k++) {
        const [bx, bz] = at(u + (r() - 0.5) * piece * 0.9, (r() - 0.5) * 0.1);
        const chunk = mesh(new BoxGeometry(0.22 + r() * 0.25, 0.18 + r() * 0.2, WALL_THICKNESS * (0.7 + r() * 0.3)), toon(r() > 0.5 ? PALETTE.concrete : PALETTE.concreteDark), bx, height + 0.06, bz);
        chunk.rotation.set(r() - 0.5, alongX ? r() * 0.4 : Math.PI / 2 + r() * 0.4, r() - 0.5);
        root.add(chunk);
      }
      for (let k = 0; k < 3; k++) {
        const [bx, bz] = at(u + (r() - 0.5) * piece * 0.8);
        const rod = mesh(new CylinderGeometry(0.018, 0.018, 0.5 + r() * 0.5, 5), toon(PALETTE.rust), bx, height + 0.2, bz);
        rod.rotation.set((r() - 0.5) * 0.9, 0, (r() - 0.5) * 0.9);
        root.add(rod);
      }
      // Gravats tombés de part et d'autre.
      for (const side of [-1, 1]) {
        const [gx, gz] = at(u, side * (WALL_THICKNESS / 2 + 0.35));
        rubble(root, gx, gz, 5, Math.floor(r() * 1000), 0.35);
      }
    }
  }
  // Plinthe sombre et liseré jaune, sur toute la longueur.
  const [sw, sd] = size(length + 0.02, WALL_THICKNESS + 0.04);
  root.add(mesh(new BoxGeometry(sw, 0.42, sd), toon(PALETTE.wainscot), cx, 0.21, cz));
  const [tw, td] = size(length + 0.02, WALL_THICKNESS + 0.045);
  root.add(mesh(new BoxGeometry(tw, 0.05, td), toon(PALETTE.yellow), cx, 0.44, cz, false));
  // Salissures au pied du mur, des deux côtés (fausse occlusion ambiante).
  for (const side of [-1, 1]) {
    const [gx, gz] = at(0, side * (WALL_THICKNESS / 2 + 0.3));
    const grime = decal(root, grimeTexture(), gx, gz, 1, 1, 0, 0.008);
    grime.scale.set(length, 0.6, 1);
    // La partie sombre du dégradé touche le mur.
    grime.rotation.z = (alongX ? 0 : Math.PI / 2) + (side < 0 ? Math.PI : 0);
  }
}

interface LockView { door: Door; group: Group; open: boolean; box: Box; }

/** Bord de zone extérieure : rochers arrondis et herbes au lieu d'un mur. */
function outdoorEdge(root: Group, x0: number, z0: number, x1: number, z1: number): void {
  const length = Math.hypot(x1 - x0, z1 - z0);
  const r = rng(Math.round(Math.abs(x0 * 13 + z0 * 7 + length)) + 3);
  const count = Math.max(2, Math.round(length / 1.4));
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const x = x0 + (x1 - x0) * t + (r() - 0.5) * 0.5;
    const z = z0 + (z1 - z0) * t + (r() - 0.5) * 0.5;
    const size = 0.6 + r() * 0.8;
    const rock = mesh(new SphereGeometry(1, 7, 5), toon(r() > 0.5 ? "#8b8574" : "#7a7465"), x, size * 0.45, z);
    rock.scale.set(size, size * (0.7 + r() * 0.5), size * (0.8 + r() * 0.4));
    rock.rotation.y = r() * 3;
    root.add(rock);
    if (r() < 0.45) grass(root, x + (r() - 0.5), z + (r() - 0.5), 0.5 + r() * 0.3);
  }
}

function doorFrame(root: Group, index: number, locks: LockView[]): void {
  const door = DOORS[index];
  if (door.open) return;
  if (door.lock === "secret") return lockedDoor(root, door, locks);
  const half = door.width / 2;
  for (const side of [-1, 1]) {
    const x = door.axis === "x" ? door.x + side * (half + 0.12) : door.x;
    const z = door.axis === "x" ? door.z : door.z + side * (half + 0.12);
    block(root, 0.3, 2.1, 0.42, PALETTE.steelDark, x, 0, z, 0.05);
    block(root, 0.32, 0.1, 0.44, PALETTE.yellow, x, 1.75, z, 0.02);
  }
  // Numéro de secteur peint au sol, lisible depuis la caméra.
  const label = signTexture(door.label, { bg: "rgba(0,0,0,0)", fg: "rgba(246,236,214,0.85)", font: "'Special Elite', monospace", width: 512, height: 96 });
  decal(root, label, door.x, door.z + 1.0, 3.2, 0.6, 0, 0.016);
  hazardStrip(root, door.x, door.z + 0.3, door.width, 0.2);
  hazardStrip(root, door.x, door.z - 0.3, door.width, 0.2);
  if (door.lock) lockedDoor(root, door, locks);
}

/** Porte fermée par un verrou : battants, mur dérobé ou barreaux électriques. */
function lockedDoor(root: Group, door: Door, locks: LockView[]): void {
  const half = door.width / 2;
  {
    const group = new Group();
    group.position.set(door.x, 0, door.z);
    if (door.axis === "z") group.rotation.y = Math.PI / 2;
    if (door.lock === "power" || door.lock === "key") {
      // Porte blindée : deux battants d'acier, voyant rouge et pancarte.
      for (const side of [-1, 1]) {
        const leaf = block(group, half, 1.5, 0.16, PALETTE.steel, side * half / 2, 0, 0, 0.03);
        leaf.name = side < 0 ? "leaf-left" : "leaf-right";
        block(leaf, 0.08, 1.2, 0.18, PALETTE.danger, -side * (half / 2 - 0.06), -0.6, 0, 0.02);
      }
      panel(group, signTexture(door.lock === "power" ? "HORS TENSION" : "CLÉ D'ACCÈS\nREQUISE", { bg: PALETTE.paper, fg: PALETTE.danger, border: PALETTE.danger, width: 256, height: 96 }), 0, 1.1, 0.1, 1.2, 0.45, 0);
    } else if (door.lock === "secret") {
      // Mur dérobé : un pan de mur identique aux autres, révélé par le SCAN ÉCHO.
      const fake = block(group, door.width + 0.05, WALL_HEIGHT, WALL_THICKNESS, PALETTE.concrete, 0, 0, 0, 0.02);
      fake.name = "leaf-secret";
      block(group, door.width + 0.1, 0.09, WALL_THICKNESS + 0.08, PALETTE.wallCap, 0, WALL_HEIGHT, 0, 0.02);
    } else {
      // Verrou électrique : barreaux sous tension rouge-orangé.
      for (let i = 0; i < 7; i++) {
        const x = -half + 0.2 + (i * (door.width - 0.4)) / 6;
        const bar = mesh(new CylinderGeometry(0.03, 0.03, 1.5, 6), glow(PALETTE.danger), x, 0.75, 0, false);
        group.add(bar);
      }
      block(group, door.width, 0.1, 0.2, PALETTE.steelDark, 0, 1.5, 0, 0.02);
      block(group, door.width, 0.1, 0.2, PALETTE.steelDark, 0, 0, 0, 0.02);
    }
    root.add(group);
    locks.push({ door, group, open: false, box: doorBox(door) });
  }
}

function addLight(root: Group, flickers: Flicker[], x: number, y: number, z: number, color: string, intensity: number, distance: number, nervous: number, seed: number, fixture = true): void {
  let bulb: Mesh | undefined;
  if (fixture) {
    bulb = mesh(new SphereGeometry(0.09, 10, 8), new MeshBasicMaterial({ color }), x, y, z, false);
    root.add(bulb);
  }
  flickers.push({ x, y, z, color, distance, base: intensity, seed, nervous, bulb, level: 1 });
}

/** Faisceau lumineux poussiéreux sous une lampe : deux plans croisés additifs. */
function beam(root: Group, x: number, top: number, z: number, radius: number, color: string): void {
  const material = new MeshBasicMaterial({ map: beamTexture(), color, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, opacity: 0.35 });
  for (const angle of [0, Math.PI / 2]) {
    const plane = new Mesh(new PlaneGeometry(radius * 2, top), material);
    plane.position.set(x, top / 2, z);
    plane.rotation.y = angle + 0.4;
    plane.renderOrder = 2;
    root.add(plane);
  }
}

function dust(root: Group, centers: [number, number, number][], perCenter: number): Points {
  const count = centers.length * perCenter;
  const positions = new Float32Array(count * 3);
  const r = rng(99);
  for (let i = 0; i < count; i++) {
    const [cx, cy, cz] = centers[Math.floor(i / perCenter)];
    positions[i * 3] = cx + (r() - 0.5) * 2.4;
    positions[i * 3 + 1] = cy * r();
    positions[i * 3 + 2] = cz + (r() - 0.5) * 2.4;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  const points = new Points(geometry, new PointsMaterial({ map: dustTexture(), size: 0.07, transparent: true, depthWrite: false, opacity: 0.75, color: "#fff1cf", blending: AdditiveBlending }));
  points.userData.origin = positions.slice();
  points.userData.centers = centers;
  root.add(points);
  return points;
}

/** Couche de ruine commune : fissures, salissures, papiers, dalles tombées. */
export function ruin(root: Group, x0: number, x1: number, z0: number, z1: number, seed: number, slabs: number, density = 1): void {
  const r = rng(seed);
  const rx = () => x0 + 0.8 + r() * (x1 - x0 - 1.6);
  const rz = () => z0 + 0.8 + r() * (z1 - z0 - 1.6);
  const area = (x1 - x0) * (z1 - z0) * density;
  for (let i = 0; i < Math.round(area / 22); i++) decal(root, crackTexture(1 + (i % 4)), rx(), rz(), 2 + r() * 2, 2 + r() * 2, r() * 6, 0.011);
  for (let i = 0; i < Math.round(area / 30); i++) decal(root, dirtTexture(1 + (i % 3)), rx(), rz(), 3 + r() * 3, 3 + r() * 3, r() * 6, 0.009);
  for (let i = 0; i < Math.round(area / 9); i++) {
    const sheet = decal(root, paperTexture(1 + (i % 4)), rx(), rz(), 0.22, 0.28, r() * 6, 0.02);
    sheet.renderOrder = 2;
  }
  for (let i = 0; i < Math.round(area / 25); i++) rubble(root, rx(), rz(), 3 + Math.floor(r() * 4), Math.floor(r() * 9999), 0.3);
  // Dalles de béton tombées, inclinées contre le sol.
  for (let i = 0; i < slabs; i++) {
    const slab = mesh(new BoxGeometry(1.2 + r() * 0.8, 0.14, 0.8 + r() * 0.6), toon(r() > 0.5 ? PALETTE.concrete : PALETTE.concreteDark), rx(), 0.2, rz());
    slab.rotation.set(0.15 + r() * 0.2, r() * 3, (r() - 0.5) * 0.3);
    root.add(slab);
    const rod = mesh(new CylinderGeometry(0.015, 0.015, 0.7, 5), toon(PALETTE.rust), slab.position.x + 0.3, 0.35, slab.position.z);
    rod.rotation.set(0.9, r() * 3, 0.4);
    root.add(rod);
  }
}

// ——— Objets interactifs ———

/** Modèles fournis par les secteurs (relais, N-7, archive, verrou, cœur…). */
const SECTOR_MODELS: Record<string, ModelBuilder> = { ...EXTERIOR_MODELS, ...CENTER_MODELS, ...WEST_MODELS, ...EAST_MODELS };

/** Réactions des secteurs à l'état (ex. panneau du relais qui disparaît après le scan). */
const REFRESH_HOOKS: ((view: WorldView, state: SiloState) => void)[] = [];
export function onWorldRefresh(hook: (view: WorldView, state: SiloState) => void): void {
  if (!REFRESH_HOOKS.includes(hook)) REFRESH_HOOKS.push(hook);
}

function interactableModel(def: InteractableDef): { group: Group; height: number } {
  const g = new Group();
  g.position.set(def.x, 0, def.z);
  let height = 1.6;
  switch (def.id) {
    case "recharge": {
      block(g, 0.6, 1.3, 0.5, PALETTE.yellow, 0, 0, 0, 0.08);
      block(g, 0.46, 0.5, 0.06, PALETTE.steelDark, 0, 0.6, 0.25, 0.02);
      for (let i = 0; i < 4; i++) {
        const cell = mesh(new BoxGeometry(0.34, 0.08, 0.04), glow(i < 3 ? PALETTE.amber : "#5a4a30"), 0, 0.7 + i * 0.1, 0.29, false);
        g.add(cell);
      }
      const coil = mesh(new TorusGeometry(0.16, 0.035, 6, 14), toon(PALETTE.outline), 0, 0.3, 0.28);
      g.add(coil);
      panel(g, signTexture("ÉNERGIE ∞", { bg: PALETTE.paper, fg: PALETTE.outline, width: 256, height: 64 }), 0, 1.15, 0.255, 0.42, 0.1, 0);
      height = 1.7;
      break;
    }
    case "upgrade": {
      // Établi : plateau en bois, étau, outils, lampe.
      block(g, 1.5, 0.08, 0.75, PALETTE.wood, 0, 0.82, 0, 0.02);
      for (const [x, z] of [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]]) block(g, 0.08, 0.82, 0.08, PALETTE.woodDark, x, 0, z, 0.01);
      block(g, 1.4, 0.06, 0.6, PALETTE.woodDark, 0, 0.25, 0, 0.01);
      block(g, 0.22, 0.18, 0.16, PALETTE.danger, -0.45, 0.9, 0.1, 0.03);
      block(g, 0.35, 0.05, 0.08, PALETTE.steel, 0.1, 0.9, 0.15, 0.01);
      block(g, 0.28, 0.12, 0.2, PALETTE.teal, 0.45, 0.9, -0.1, 0.03);
      cylinder(g, 0.05, 0.3, PALETTE.steelDark, 0.6, 0.9, 0.25);
      can(g, -0.1, -0.2);
      height = 1.4;
      break;
    }
    default: {
      if (def.kind === "components") {
        // Composant : engrenage + bobine de cuivre, posé de travers.
        const gear = mesh(new CylinderGeometry(0.17, 0.17, 0.06, 8), toon(PALETTE.amber, { emissive: PALETTE.amber, emissiveIntensity: 0.25 }), 0, 0.05, 0);
        g.add(gear);
        const hub = mesh(new CylinderGeometry(0.06, 0.06, 0.1, 10), toon(PALETTE.steelDark), 0, 0.07, 0);
        g.add(hub);
        const coil = mesh(new TorusGeometry(0.08, 0.035, 6, 12), toon(PALETTE.rustLight), 0.18, 0.06, 0.08);
        coil.rotation.x = Math.PI / 2;
        g.add(coil);
        g.rotation.y = def.x * 1.3;
        height = 0.7;
      } else if (def.kind === "ammo") {
        block(g, 0.5, 0.26, 0.32, PALETTE.leaf, 0, 0, 0, 0.04);
        block(g, 0.52, 0.06, 0.34, PALETTE.woodDark, 0, 0.26, 0, 0.02);
        panel(g, signTexture("D9", { bg: PALETTE.yellow, fg: PALETTE.outline, width: 128, height: 64 }), 0, 0.15, 0.165, 0.22, 0.11, 0);
        g.rotation.y = 0.5;
        height = 0.8;
      } else {
        block(g, 0.4, 0.3, 0.3, PALETTE.paper, 0, 0, 0, 0.05);
        height = 0.8;
      }
    }
  }
  return { group: g, height };
}

export function buildWorld(scene: Scene): WorldView {
  const root = new Group();
  root.name = "World";
  scene.add(root);
  const colliders: Box[] = [];
  const flickers: Flicker[] = [];
  const locks: LockView[] = [];
  const dustCenters: [number, number, number][] = [];
  const decor: DecorContext = {
    root,
    colliders,
    light: (x, y, z, color, intensity, distance, nervous, seed, fixture = true) => addLight(root, flickers, x, y, z, color, intensity, distance, nervous, seed, fixture),
    beam: (x, top, z, radius, color) => beam(root, x, top, z, radius, color),
    dust: (x, y, z) => { dustCenters.push([x, y, z]); },
    animate: (fn) => { animations.push(fn); },
  };
  const animations: ((dt: number, time: number, playerX: number, playerZ: number) => void)[] = [];

  // Fond sombre sous le silo (terre, vide au-delà des murs).
  const ground = mesh(new PlaneGeometry(120, 120), toon(PALETTE.sky, { rim: 0 }), 0, -0.02, -10, false);
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);

  for (const room of ROOMS) floor(root, room);
  for (const w of buildWalls()) {
    if (w.outdoor) outdoorEdge(root, w.x0, w.z0, w.x1, w.z1);
    else wall(root, w.x0, w.z0, w.x1, w.z1);
    colliders.push(wallBox(w));
  }
  DOORS.forEach((_, i) => doorFrame(root, i, locks));
  decorateExterior(decor);
  decorateCenter(decor);
  decorateWest(decor);
  decorateEast(decor);

  const interactables = new Map<string, InteractableView>();
  const solidItems = new Map<string, Box>();
  for (const def of INTERACTABLES) {
    const { group, height } = (SECTOR_MODELS[def.id] ?? interactableModel)(def);
    root.add(group);
    const highlight = addHighlight(group);
    interactables.set(def.id, { def, group, highlight, tooltipHeight: height });
    if (def.solid ?? !def.kind) solidItems.set(def.id, { minX: def.x - def.radius, maxX: def.x + def.radius, minZ: def.z - def.radius * 0.8, maxZ: def.z + def.radius * 0.8 });
  }

  const staticColliders = [...colliders];
  const view: WorldView = { root, colliders: [], interactables, refresh, update, setEndingTint, shudder, setLowQuality };
  const motes = dust(root, dustCenters, lowDust() ? 30 : 50);
  let lowQuality = false;
  let shudderTime = 0;
  let tint: Color | null = null;
  const pool: PointLight[] = [];
  for (let i = 0; i < LIGHT_POOL; i++) {
    const light = new PointLight("#ffffff", 0, 8, 1.6);
    light.castShadow = false;
    root.add(light);
    pool.push(light);
  }
  let poolClock = 0;
  let assigned: Flicker[] = [];

  function refresh(state: SiloState): void {
    const active: Box[] = [...staticColliders];
    for (const lock of locks) {
      const open = doorOpen(lock.door, state);
      if (open !== lock.open) {
        lock.open = open;
        if (lock.door.lock === "power" || lock.door.lock === "key") {
          // Les battants s'enfoncent dans le sol.
          for (const leaf of lock.group.children.filter((c) => c.name.startsWith("leaf"))) leaf.userData.target = open ? -1.55 : 0;
          lock.group.userData.animating = true;
        } else lock.group.visible = !open;
      }
      if (!open) active.push(lock.box);
    }
    for (const [id, item] of interactables) {
      const available = interactableAvailable(item.def, state);
      item.group.visible = available;
      item.group.userData.available = available;
      const box = solidItems.get(id);
      if (box && available) active.push(box);
    }
    view.colliders = active;
    for (const hook of REFRESH_HOOKS) hook(view, state);
  }

  function setEndingTint(ending: string): void {
    tint = ending === "" ? null : new Color(ending === "mother" ? "#ff6737" : "#63e9e0");
  }

  function shudder(): void {
    shudderTime = 1.0;
  }

  function update(dt: number, time: number, playerX: number, playerZ: number): void {
    // Portes du cœur qui s'ouvrent.
    for (const lock of locks) {
      if (!lock.group.userData.animating) continue;
      let moving = false;
      for (const leaf of lock.group.children) {
        if (leaf.userData.target === undefined) continue;
        const target = leaf.userData.target as number;
        leaf.position.y += (target - leaf.position.y) * Math.min(1, dt * 2.5);
        if (Math.abs(target - leaf.position.y) > 0.01) moving = true;
      }
      lock.group.userData.animating = moving;
    }
    for (const fn of animations) fn(dt, time, playerX, playerZ);
    shudderTime = Math.max(0, shudderTime - dt);
    const dim = shudderTime > 0 ? (shudderTime > 0.85 ? 0.05 : 1 - shudderTime * 0.8) : 1;
    for (const f of flickers) {
      // Bruit pseudo-aléatoire : variations douces + coupures brèves pour les lampes nerveuses.
      const wobble = Math.sin(time * 9 + f.seed * 7) * 0.5 + Math.sin(time * 23 + f.seed * 3) * 0.5;
      const cut = Math.sin(time * 1.7 + f.seed * 11) > 0.93 - f.nervous * 0.1 && Math.sin(time * 41 + f.seed) > 0 ? 0.15 : 1;
      f.level = (1 - f.nervous * 0.25 + wobble * f.nervous * 0.2) * (f.nervous > 0.3 ? cut : 1) * dim;
      if (f.bulb) (f.bulb.material as MeshBasicMaterial).color.set(tint ?? f.color).multiplyScalar(0.4 + f.level * 0.6);
    }
    // Les lampes les plus proches du joueur occupent les places de lumière (coût constant).
    poolClock -= dt;
    if (poolClock <= 0) {
      poolClock = 0.4;
      assigned = [...flickers].sort((a, b) => Math.hypot(a.x - playerX, a.z - playerZ) - Math.hypot(b.x - playerX, b.z - playerZ)).slice(0, LIGHT_POOL);
    }
    pool.forEach((light, i) => {
      const f = assigned[i];
      if (!f) { light.intensity = 0; return; }
      light.position.set(f.x, f.y, f.z);
      light.color.set(tint ?? f.color);
      light.distance = f.distance;
      light.intensity = f.base * f.level;
    });
    if (!lowQuality) {
      const positions = motes.geometry.getAttribute("position") as BufferAttribute;
      const origin = motes.userData.origin as Float32Array;
      for (let i = 0; i < positions.count; i++) {
        positions.setX(i, origin[i * 3] + Math.sin(time * 0.3 + i) * 0.25);
        positions.setY(i, (origin[i * 3 + 1] + time * 0.05 * (0.5 + (i % 5) * 0.1)) % 2.3);
        positions.setZ(i, origin[i * 3 + 2] + Math.cos(time * 0.25 + i * 1.7) * 0.25);
      }
      positions.needsUpdate = true;
    }
  }

  function setLowQuality(low: boolean): void {
    lowQuality = low;
    motes.visible = !low;
  }

  view.colliders = [...staticColliders, ...locks.map((l) => l.box), ...solidItems.values()];
  return view;
}

function lowDust(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
}

