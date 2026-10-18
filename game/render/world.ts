// Construction 3D du silo : sols, murets coupés à mi-hauteur, portes, décor post-apocalyptique,
// objets interactifs, lumières qui grésillent, poussière dans les faisceaux.
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial,
  PlaneGeometry, PointLight, Points, PointsMaterial, BoxGeometry, SphereGeometry, CylinderGeometry, TorusGeometry,
  type Scene,
} from "three";
import {
  DOORS, INTERACTABLES, ROOMS, WALL_HEIGHT, WALL_THICKNESS, buildWalls, doorBox, wallBox,
  type InteractableDef, type Room,
} from "../level";
import type { Box } from "../collision";
import { glow, toon } from "./toon";
import { PALETTE } from "./palette";
import {
  beamTexture, blobTexture, concreteTexture, crackTexture, dirtTexture, paperTexture, sprayTexture, drawingTexture, dustTexture, grimeTexture, holeTexture, liftTexture, rng, signTexture, tilesTexture,
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
  light: PointLight;
  base: number;
  seed: number;
  /** 0 = stable, 1 = grésille beaucoup. */
  nervous: number;
  bulb?: Mesh;
}

export interface WorldView {
  root: Group;
  colliders: Box[];
  interactables: Map<string, InteractableView>;
  update(dt: number, time: number): void;
  setLowQuality(low: boolean): void;
}

function floor(root: Group, room: Room): void {
  const w = room.x1 - room.x0;
  const d = room.z1 - room.z0;
  const texture = (room.floor === "lift" ? liftTexture() : tilesTexture()).clone();
  texture.needsUpdate = true;
  texture.repeat.set(w / 2, d / 2);
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

function doorFrame(root: Group, colliders: Box[], index: number): void {
  const door = DOORS[index];
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
  if (door.locked) {
    // Sas fermé : deux battants d'acier et un voyant rouge.
    for (const side of [-1, 1]) {
      const leaf = block(root, half, 1.5, 0.16, PALETTE.steel, door.x + side * half / 2, 0, door.z, 0.03);
      leaf.name = "door-leaf";
      block(root, 0.08, 1.2, 0.18, PALETTE.danger, door.x + side * 0.06, 0.15, door.z, 0.02);
    }
    colliders.push(doorBox(door));
  }
}

function addLight(root: Group, flickers: Flicker[], x: number, y: number, z: number, color: string, intensity: number, distance: number, nervous: number, seed: number, fixture = true): PointLight {
  const light = new PointLight(color, intensity, distance, 1.6);
  light.position.set(x, y, z);
  light.castShadow = false;
  root.add(light);
  let bulb: Mesh | undefined;
  if (fixture) {
    bulb = mesh(new SphereGeometry(0.09, 10, 8), new MeshBasicMaterial({ color }), x, y, z, false);
    root.add(bulb);
  }
  flickers.push({ light, base: intensity, seed, nervous, bulb });
  return light;
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
function ruin(root: Group, x0: number, x1: number, z0: number, z1: number, seed: number, slabs: number, density = 1): void {
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

function interactableModel(def: InteractableDef): { group: Group; height: number } {
  const g = new Group();
  g.position.set(def.x, 0, def.z);
  let height = 1.6;
  switch (def.id) {
    case "mother": {
      // Terminal de MÈRE : armoire, écran rond cyan avec un œil.
      block(g, 0.9, 1.5, 0.55, PALETTE.steel, 0, 0, 0, 0.08);
      block(g, 0.95, 0.12, 0.6, PALETTE.steelDark, 0, 1.5, 0, 0.04);
      // Écran rond tourné vers la caméra, avec un grand œil ; antenne au sommet.
      const bezel = mesh(new CylinderGeometry(0.36, 0.36, 0.08, 24), toon(PALETTE.steelDark), 0, 1.0, 0.27, false);
      bezel.rotation.x = Math.PI / 2;
      g.add(bezel);
      const screen = mesh(new CylinderGeometry(0.3, 0.3, 0.05, 24), glow("#9ff5ea"), 0, 1.0, 0.3, false);
      screen.rotation.x = Math.PI / 2;
      g.add(screen);
      const iris = mesh(new CylinderGeometry(0.12, 0.12, 0.06, 16), glow("#2c8f86"), 0, 1.0, 0.32, false);
      iris.rotation.x = Math.PI / 2;
      g.add(iris);
      const pupil = mesh(new CylinderGeometry(0.05, 0.05, 0.07, 12), glow(PALETTE.outline), 0, 1.0, 0.33, false);
      pupil.rotation.x = Math.PI / 2;
      g.add(pupil);
      for (let i = 0; i < 4; i++) block(g, 0.12, 0.05, 0.05, i % 2 ? PALETTE.teal : PALETTE.amber, -0.24 + i * 0.16, 0.42, 0.28, 0.01);
      cylinder(g, 0.02, 0.5, PALETTE.steelDark, 0.3, 1.62, 0);
      g.add(mesh(new SphereGeometry(0.05, 8, 6), glow(PALETTE.danger), 0.3, 2.14, 0, false));
      height = 2.3;
      break;
    }
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
    case "ending": {
      block(g, 0.8, 1.0, 0.6, PALETTE.steelDark, 0, 0, 0, 0.08);
      const top = block(g, 0.85, 0.12, 0.65, PALETTE.steel, 0, 1.0, 0, 0.04);
      top.rotation.x = -0.35;
      cylinder(g, 0.03, 0.35, PALETTE.steel, 0.15, 1.05, -0.1);
      const knob = mesh(new SphereGeometry(0.07, 10, 8), glow(PALETTE.danger), 0.15, 1.42, -0.1, false);
      g.add(knob);
      for (let i = 0; i < 3; i++) g.add(mesh(new CylinderGeometry(0.04, 0.04, 0.03, 10), glow(i === 1 ? PALETTE.teal : PALETTE.amber), -0.2 + i * 0.12, 1.1, 0.08, false));
      height = 1.6;
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

/** Décor du refuge (cabine d'ascenseur aménagée par des survivants). */
function decorateRefuge(root: Group, flickers: Flicker[]): void {
  // Portes de l'ascenseur au sud, grand lettrage SILO 9 peint au sol.
  for (const side of [-1, 1]) block(root, 1.6, 1.5, 0.2, PALETTE.steel, side * 0.82, 0, 12.75, 0.03);
  block(root, 0.05, 1.5, 0.22, PALETTE.outline, 0, 0, 12.74, 0.01);
  decal(root, signTexture("S I L O   9", { bg: "rgba(0,0,0,0)", fg: "rgba(242,194,48,0.9)", width: 512, height: 96 }), 0, 12.0, 3.4, 0.62);
  decal(root, blobTexture("rust"), -3.6, 12.1, 1.6, 1.0, 0.4);
  decal(root, blobTexture("rust"), 2.2, 5.0, 1.2, 0.8, 1.1);
  decal(root, blobTexture("rust"), -1.8, 6.6, 0.9, 0.6, 2.2);
  decal(root, blobTexture("puddle"), 1.8, 11.2, 0.9, 0.6, 0.5);
  // Tapis rond (comme dans la maison de poupée) sous le point d'arrivée.
  const rug = mesh(new CylinderGeometry(1.35, 1.35, 0.02, 32), toon(PALETTE.tarp), 0, 0.012, 8.6, false);
  root.add(rug);
  const rugRing = mesh(new TorusGeometry(1.2, 0.04, 4, 32), toon("#e7d9b5"), 0, 0.025, 8.6, false);
  rugRing.rotation.x = Math.PI / 2;
  root.add(rugRing);
  // Coin couchage : matelas, couverture, oreiller.
  block(root, 1.0, 0.2, 1.9, PALETTE.mattress, 3.9, 0, 10.6, 0.08);
  block(root, 1.02, 0.06, 1.1, PALETTE.fabric, 3.9, 0.2, 10.95, 0.03);
  block(root, 0.6, 0.12, 0.35, PALETTE.paper, 3.9, 0.2, 9.85, 0.06);
  crate(root, 4.25, 4.75, 0.55, 0.3);
  // Plante qui a poussé dans une boîte de conserve : la nature reprend ses droits.
  cylinder(root, 0.16, 0.26, PALETTE.rust, -4.3, 0, 4.8, 12);
  for (let i = 0; i < 5; i++) {
    const leaf = mesh(new SphereGeometry(0.16, 8, 6), toon(PALETTE.leaf), -4.3 + Math.cos(i * 1.3) * 0.12, 0.42 + i * 0.07, 4.8 + Math.sin(i * 1.3) * 0.12);
    leaf.scale.set(1, 0.6, 0.5);
    leaf.rotation.y = i;
    root.add(leaf);
  }
  can(root, -2.4, 11.9);
  can(root, -2.2, 12.1, PALETTE.teal, true);
  rubble(root, -4.4, 12.4, 4, 21, 0.3);
  // Guirlande de fortune entre deux perches.
  for (const x of [-4.7, 4.7]) cylinder(root, 0.03, 2.1, PALETTE.woodDark, x, 0, 12.6);
  stringLights(root, -4.7, 12.6, 4.7, 12.6, 2.05, 14);
  signBoard(root, "ASCENSEUR / REFUGE MOBILE\nÉTAGE 009 — AUCUNE LIAISON SURFACE", 0, 1.25, 12.62, 2.6, 0.55, Math.PI, { bg: PALETTE.paper, fg: PALETTE.outline, border: PALETTE.rust });
  ruin(root, -5, 5, 4, 13, 101, 0, 0.45);
  // Décompte des jours de survivants griffonné au sol, près du matelas.
  decal(root, sprayTexture("IIII IIII IIII II", "rgba(240,232,210,0.85)"), 2.4, 12.4, 1.6, 0.45, 0, 0.017);
  addLight(root, flickers, 0, 2.3, 8.4, "#ffd9a0", 9, 10, 0.08, 1);
  beam(root, 0, 2.3, 8.4, 1.2, "#ffe6b0");
}

/** Décor du secteur 01 : douches de décontamination, casiers, camp de survivants, effondrement. */
function decorateDecon(root: Group, flickers: Flicker[]): void {
  // Arches de douche au centre, néons cyan.
  for (const z of [-1.8, -5, -8.2]) {
    for (const side of [-1, 1]) block(root, 0.16, 2.2, 0.16, PALETTE.steel, side * 1.7, 0, z, 0.04);
    block(root, 3.6, 0.14, 0.2, PALETTE.steelDark, 0, 2.2, z, 0.04);
    for (let i = -1; i <= 1; i++) cylinder(root, 0.07, 0.12, PALETTE.steel, i * 0.9, 2.08, z, 10);
    const neon = mesh(new BoxGeometry(3.2, 0.04, 0.05), glow(PALETTE.teal), 0, 2.12, z + 0.11, false);
    root.add(neon);
    hazardStrip(root, 0, z, 3.2, 0.22);
    // Grille d'évacuation
    block(root, 0.7, 0.02, 0.7, PALETTE.steelDark, 0, 0, z - 1.2, 0.01);
  }
  addLight(root, flickers, 0, 2.0, -5, "#7fe9dc", 8, 9, 0.35, 2, false);
  beam(root, 0, 2.15, -5, 1.4, "#9ff5ea");

  // Casiers de combinaisons NRBC le long du mur ouest.
  for (let i = 0; i < 9; i++) {
    const z = 1.5 - i * 0.75;
    if (i === 6) continue;
    const open = i === 2;
    const g = new Group();
    g.position.set(-7.55, 0, z);
    block(g, 0.55, 1.75, 0.7, i % 3 === 1 ? PALETTE.tarp : PALETTE.steel, 0, 0, 0, 0.03);
    if (open) {
      block(g, 0.04, 1.6, 0.66, PALETTE.steel, 0.52, 0.05, 0.3, 0.01).rotation.y = -1.1;
      block(g, 0.3, 0.9, 0.4, PALETTE.yellow, 0.1, 0.6, 0, 0.1);
    } else {
      block(g, 0.04, 0.3, 0.12, PALETTE.steelDark, 0.28, 1.2, 0.2, 0.01);
    }
    root.add(g);
  }
  // Casier tombé, combinaison jaune au sol.
  const fallen = block(root, 0.55, 1.75, 0.7, PALETTE.steel, -6.2, 0, -3.4, 0.03);
  fallen.rotation.z = Math.PI / 2;
  fallen.position.set(-6.3, 0.28, -3.3);
  block(root, 0.5, 0.18, 1.1, PALETTE.yellow, -5.3, 0, -2.4, 0.08).rotation.y = 0.4;
  signBoard(root, "RESTEZ À\nL'INTÉRIEUR", -7.83, 1.1, -5.8, 0.9, 0.8, Math.PI / 2, { bg: "#e9dfc4", fg: PALETTE.danger, border: PALETTE.danger });

  // Camp de survivants à l'est : bâche, matelas, conserves, braises.
  const tarp = mesh(new BoxGeometry(2.6, 0.04, 1.9), toon(PALETTE.tarp, { side: DoubleSide }), 6.4, 1.35, -3.2);
  tarp.rotation.z = -0.35;
  root.add(tarp);
  for (const [x, z] of [[5.2, -4.1], [5.2, -2.3]]) cylinder(root, 0.04, 1.6, PALETTE.woodDark, x, 0, z);
  block(root, 0.9, 0.16, 1.8, PALETTE.mattress, 7.1, 0, -3.2, 0.06);
  block(root, 0.92, 0.05, 0.9, PALETTE.fabric, 7.1, 0.16, -2.8, 0.02);
  decal(root, blobTexture("scorch"), 5.0, -5.6, 1.3, 1.3);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const stone = mesh(new SphereGeometry(0.11, 6, 5), toon(PALETTE.concreteDark), 5 + Math.cos(a) * 0.42, 0.06, -5.6 + Math.sin(a) * 0.42);
    stone.scale.y = 0.6;
    root.add(stone);
  }
  for (let i = 0; i < 3; i++) {
    const log = cylinder(root, 0.05, 0.5, PALETTE.woodDark, 5, 0.05, -5.6);
    log.rotation.set(Math.PI / 2, i * 1.1, 0);
    log.position.y = 0.08;
  }
  const ember = mesh(new SphereGeometry(0.12, 8, 6), glow("#ff8a3d"), 5, 0.08, -5.6, false);
  ember.scale.y = 0.5;
  root.add(ember);
  addLight(root, flickers, 5, 0.6, -5.4, "#ff9a52", 5, 6, 0.6, 3, false);
  can(root, 6.0, -5.0);
  can(root, 6.2, -5.15, PALETTE.yellow);
  can(root, 5.8, -4.85, PALETTE.teal, true);
  crate(root, 7.3, -0.6, 0.6, 0.2);
  crate(root, 7.25, -0.6, 0.45, 0.7, 0.6);
  panel(root, drawingTexture(), 7.83, 1.0, -1.6, 0.7, 0.55, -Math.PI / 2);
  stringLights(root, 5.2, -4.1, 7.8, -4.4, 1.55, 6);

  // Civière renversée, ruban de quarantaine.
  const stretcher = block(root, 0.6, 0.06, 1.8, PALETTE.paper, -3.1, 0.18, 1.4, 0.02);
  stretcher.rotation.set(0.1, 0.5, 0.25);
  for (const z of [-0.6, 0.6]) {
    const legGroup = block(root, 0.04, 0.4, 0.04, PALETTE.steel, -3.1 + z * 0.4, 0, 1.4 + z, 0.01);
    legGroup.rotation.z = 0.3;
  }
  hazardStrip(root, 3.5, 2.6, 3.8, 0.12, 0.15);

  // Coin nord-est effondré : gravats, racines, herbe.
  rubble(root, 6.5, -10.3, 14, 4, 1.0);
  block(root, 1.8, 0.7, 0.3, PALETTE.concrete, 6.4, 0, -11.3, 0.04).rotation.set(0.5, 0.3, 0.1);
  for (let i = 0; i < 4; i++) {
    const root3 = mesh(new CylinderGeometry(0.04, 0.07, 1.6, 6), toon(PALETTE.woodDark), 7.6 - i * 0.35, 1.0, -11.75, true);
    root3.rotation.set(0.6 + i * 0.1, 0, 0.3 - i * 0.2);
    root.add(root3);
  }
  overgrowth(root, 6.2, -9.6, 1.1, 31);
  overgrowth(root, -6.8, -10.8, 0.7, 32);
  overgrowth(root, -2.8, 3.2, 0.5, 33);
  overgrowth(root, 2.4, -6.6, 0.35, 34);
  overgrowth(root, -4.6, -7.4, 0.45, 35);
  for (const [x, z] of [[1.2, 0.6], [-1.0, -3.4], [3.6, -9.2], [-6.9, -0.5], [7.5, 3.4]]) grass(root, x, z, 0.38);

  // Carreaux arrachés, terre et pousses.
  for (const [x, z, sz] of [[-3.6, -5.6, 0.9], [3.2, -1.1, 0.7], [-0.8, -11.0, 0.8], [4.4, -8.4, 0.6]] as const) {
    decal(root, holeTexture(), x, z, sz * 1.4, sz * 1.2, x * 2);
    grass(root, x + 0.1, z, 0.32);
  }
  // Flaques et rouille.
  decal(root, blobTexture("puddle"), 1.6, -6.5, 1.8, 1.2, 0.3);
  decal(root, blobTexture("puddle"), -2.5, -9.4, 1.2, 0.9, 1.4);
  decal(root, blobTexture("rust"), -6.4, -8.8, 1.3, 1.0);
  decal(root, blobTexture("scorch"), 2.8, 1.2, 1.6, 1.2, 0.8);
  cable(root, -7.75, -7.2, 1.0);
  cable(root, 7.75, -8.6, 1.2, PALETTE.danger);

  ruin(root, -8, 8, -12, 4, 202, 3);
  decal(root, sprayTexture("NE PAS\nENTRER", "rgba(216,69,43,0.9)"), -3.6, -11.0, 2.4, 0.8, 0, 0.017);
  decal(root, sprayTexture("ILS MENTENT", "rgba(240,232,210,0.8)"), 3.6, 0.8, 2.6, 0.7, -0.15, 0.017);
  decal(root, dirtTexture(2), 5.0, -5.6, 3.2, 3.2, 0, 0.01);
  panel(root, sprayTexture("→ SURFACE ?", "rgba(242,194,48,0.95)"), 7.83, 1.05, -7.2, 1.3, 0.42, -Math.PI / 2);

  // Alarme rouge près du sas fermé, qui grésille.
  addLight(root, flickers, 2.3, 1.9, -11.6, "#ff5a36", 7, 7, 0.9, 4);
  addLight(root, flickers, -5.5, 1.9, 0.8, "#ffdca8", 6, 8, 0.25, 5);
  beam(root, -5.5, 1.9, 0.8, 1.1, "#ffe6b0");
}

export function buildWorld(scene: Scene): WorldView {
  const root = new Group();
  root.name = "World";
  scene.add(root);
  const colliders: Box[] = [];
  const flickers: Flicker[] = [];

  // Fond sombre sous le silo (terre, vide au-delà des murs).
  const ground = mesh(new PlaneGeometry(120, 120), toon(PALETTE.sky, { rim: 0 }), 0, -0.02, -10, false);
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);

  for (const room of ROOMS) floor(root, room);
  for (const w of buildWalls()) {
    wall(root, w.x0, w.z0, w.x1, w.z1);
    colliders.push(wallBox(w));
  }
  DOORS.forEach((_, i) => doorFrame(root, colliders, i));
  decorateRefuge(root, flickers);
  decorateDecon(root, flickers);

  // Obstacles solides du décor.
  colliders.push(
    { minX: -7.9, maxX: -7.2, minZ: -5.0, maxZ: 1.9 },
    { minX: -7.2, maxX: -5.4, minZ: -3.7, maxZ: -2.9 },
    { minX: 6.6, maxX: 7.6, minZ: -4.1, maxZ: -2.3 },
    { minX: 6.95, maxX: 7.65, minZ: -0.95, maxZ: -0.25 },
    { minX: 5.6, maxX: 7.9, minZ: -11.9, maxZ: -9.5 },
    { minX: 3.35, maxX: 4.45, minZ: 9.6, maxZ: 11.6 },
    { minX: 3.95, maxX: 4.6, minZ: 4.4, maxZ: 5.1 },
  );
  // Montants des arches de douche.
  for (const z of [-1.8, -5, -8.2]) for (const side of [-1, 1]) colliders.push({ minX: side * 1.7 - 0.1, maxX: side * 1.7 + 0.1, minZ: z - 0.1, maxZ: z + 0.1 });

  const interactables = new Map<string, InteractableView>();
  for (const def of INTERACTABLES) {
    const { group, height } = interactableModel(def);
    root.add(group);
    const highlight = addHighlight(group);
    interactables.set(def.id, { def, group, highlight, tooltipHeight: height });
    if (!def.kind) colliders.push({ minX: def.x - def.radius, maxX: def.x + def.radius, minZ: def.z - def.radius * 0.8, maxZ: def.z + def.radius * 0.8 });
  }

  const motes = dust(root, [[0, 2.3, 8.4], [0, 2.1, -5], [-5.5, 1.9, 0.8], [5, 1.4, -5.4]], 60);
  let lowQuality = false;

  function update(dt: number, time: number): void {
    for (const f of flickers) {
      // Bruit pseudo-aléatoire : variations douces + coupures brèves pour les lampes nerveuses.
      const wobble = Math.sin(time * 9 + f.seed * 7) * 0.5 + Math.sin(time * 23 + f.seed * 3) * 0.5;
      const cut = Math.sin(time * 1.7 + f.seed * 11) > 0.93 - f.nervous * 0.1 && Math.sin(time * 41 + f.seed) > 0 ? 0.15 : 1;
      const level = (1 - f.nervous * 0.25 + wobble * f.nervous * 0.2) * (f.nervous > 0.3 ? cut : 1);
      f.light.intensity = f.base * level;
      if (f.bulb) (f.bulb.material as MeshBasicMaterial).color.setScalar(0.4 + level * 0.6).multiply(f.light.color);
    }
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

  return {
    root,
    colliders,
    interactables,
    update,
    setLowQuality(low) {
      lowQuality = low;
      motes.visible = !low;
    },
  };
}

