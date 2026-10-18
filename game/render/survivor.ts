// Les deux survivants de l'étage 1, en « pâte à modeler » comme Lou et les mordus, mais vivants : joues roses,
// yeux brillants, gestes qui disent la confiance (docs/MEFIANCE_SURVIVANTS.md § 7 : distance, arme, porte, dos tourné).
// - Cuisine : costaud, grosse moustache, bandana rouge, veste de cuisine crème, tablier marine, couperet.
//   Sa chambre froide est un caisson de la cafétéria (décor : game/render/storyProps.ts) ; ici, le battant qui
//   s'entrouvre sur la chaîne ou s'ouvre, et sous les 9 traits du décor, à la craie, une colonne au titre qui change
//   (« L'ÉTRANGER », barré « LE BRICOLEUR », barré « LOU ») : la seule « jauge » du jeu, et c'est lui qui l'écrit.
// - L'opératrice de nuit : chignon gris et crayon, lunettes rondes, casque radio au cou, gilet sarcelle, lampe à
//   filtre vert, alliance. Son local technique (décor) a un plafond amovible ; la lueur verte sous la porte reste
//   allumée tant qu'elle porte son masque.
// Rendu seul : le déroulé (poses, déplacements, scènes) est dans game/content/people_director.ts.
import {
  AdditiveBlending, CanvasTexture, CapsuleGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial,
  Object3D, PlaneGeometry, SphereGeometry, SRGBColorSpace, TorusGeometry, type BufferGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { addOutline, glow, toon } from "./toon";

// ——— Briques ———

type Geo = BufferGeometry;
const geos = new Map<string, Geo>();
function g<T extends Geo>(key: string, build: () => T): T {
  let v = geos.get(key);
  if (!v) geos.set(key, (v = build()));
  return v as T;
}
const sphere = (r: number, w = 16, h = 12) => g(`s${r}:${w}:${h}`, () => new SphereGeometry(r, w, h));
const capsule = (r: number, len: number) => g(`c${r}:${len}`, () => new CapsuleGeometry(r, Math.max(0.001, len), 4, 12));
const box = (w: number, h: number, d: number, r = 0.02) => g(`b${w}:${h}:${d}:${r}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, Math.min(w, h, d) / 2 - 1e-4)));
const torus = (r: number, t: number, arc = Math.PI * 2) => g(`t${r}:${t}:${arc}`, () => new TorusGeometry(r, t, 8, 24, arc));
const cyl = (r: number, h: number, top = r) => g(`y${r}:${h}:${top}`, () => new CylinderGeometry(top, r, h, 16));

function part(parent: Object3D, geometry: Geo, color: string, x = 0, y = 0, z = 0): Mesh {
  const mesh = new Mesh(geometry, toon(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Détail sans contour (yeux, joues, boutons). `lit` : éclairé (toon), sinon couleur pure. */
function dot(parent: Object3D, geometry: Geo, color: string, x: number, y: number, z: number, lit = false): Mesh {
  const mesh = new Mesh(geometry, lit ? toon(color, { rim: 0 }) : glow(color));
  mesh.position.set(x, y, z);
  mesh.userData.noOutline = true;
  parent.add(mesh);
  return mesh;
}

function limb(parent: Object3D, length: number, radius: number, color: string): Mesh {
  return part(parent, capsule(radius, length - radius * 2), color, 0, -length / 2, 0);
}

// ——— Le corps commun ———

export type SurvivorKind = "cook" | "operator";

/** Poses : ce que fait le corps (confiance lisible sans jauge). */
export type SurvivorPose =
  /** Cuisine : couperet levé, il recule (hostile). */
  | "guard"
  /** Cuisine : sur la chaîne, couperet baissé, il regarde tes mains (méfiant). */
  | "chain"
  /** Cuisine : porte ouverte, mains sur les hanches, couperet posé (prudent). */
  | "hips"
  /** Cuisine : dos tourné, il fouille une étagère (confiant). */
  | "back"
  /** Cuisine : sorti, couperet pointé vers l'avis (accusation, M3). */
  | "accuse"
  /** Cuisine : figé de peur devant son commis (M4). */
  | "afraid"
  /** Cuisine : il tend une boîte de pêches (départ, M7). */
  | "offer"
  /** L'opératrice : lampe verte allumée, elle tourne son alliance (masque). */
  | "mask"
  /** L'opératrice : bras croisés, lampe éteinte (sur la défensive). */
  | "defensive"
  /** L'opératrice : tête basse, lampe posée (honteuse). */
  | "ashamed"
  /** L'opératrice : mains ouvertes (vraie). */
  | "open"
  /** Tous deux : marche. */
  | "walk";

export interface SurvivorRig {
  kind: SurvivorKind;
  root: Group;
  body: Group;
  hips: Group;
  torso: Group;
  head: Group;
  legs: { hip: Group; knee: Group }[];
  arms: { shoulder: Group; elbow: Group }[];
  /** Couperet (Cuisine) ou lampe verte (opératrice), dans la main droite. */
  tool: Group;
  /** Lueur de la lampe verte (opératrice). */
  lampGlow: Mesh | null;
  /** Boîte de pêches (Cuisine, départ). */
  can: Group | null;
  /** Main gauche bandée (Cuisine, après le bandage donné). */
  wrap: Mesh | null;
  eyes: Group[];
  pose: SurvivorPose;
  time: number;
  blink: number;
}

const INK = "#2a1d16";

interface Look {
  skin: string;
  skinDark: string;
  blush: string;
  hair: string;
  top: string;
  topDark: string;
  pants: string;
  shoe: string;
  /** Carrure. */
  width: number;
}

function buildBody(kind: SurvivorKind, look: Look): Omit<SurvivorRig, "tool" | "lampGlow" | "can" | "wrap" | "eyes" | "pose" | "time" | "blink"> {
  const root = new Group();
  root.name = kind === "cook" ? "Cuisine" : "Opératrice";
  const body = new Group();
  root.add(body);
  const hips = new Group();
  hips.position.y = 0.5;
  body.add(hips);
  const legs: SurvivorRig["legs"] = [];
  for (const side of [-1, 1]) {
    const hip = new Group();
    hip.position.set(side * 0.11 * look.width, 0, 0);
    hips.add(hip);
    limb(hip, 0.25, 0.1, look.pants);
    const knee = new Group();
    knee.position.y = -0.23;
    hip.add(knee);
    limb(knee, 0.23, 0.088, look.pants);
    part(knee, box(0.17, 0.1, 0.26, 0.05), look.shoe, 0, -0.24, 0.04);
    legs.push({ hip, knee });
  }
  const torso = new Group();
  torso.position.y = 0.02;
  hips.add(torso);
  const chest = part(torso, capsule(0.22 * look.width, 0.2), look.top, 0, 0.24, 0);
  chest.scale.set(1.05, 1, 0.85);
  const head = new Group();
  head.position.set(0, 0.5, 0.02);
  torso.add(head);
  const arms: SurvivorRig["arms"] = [];
  for (const side of [-1, 1]) {
    const shoulder = new Group();
    shoulder.rotation.order = "YXZ";
    shoulder.position.set(side * 0.27 * look.width, 0.37, 0);
    torso.add(shoulder);
    limb(shoulder, 0.2, 0.08 * look.width, look.top);
    const elbow = new Group();
    elbow.position.y = -0.19;
    shoulder.add(elbow);
    limb(elbow, 0.19, 0.065 * look.width, look.skin);
    part(elbow, sphere(0.068 * look.width, 12, 10), look.skin, 0, -0.2, 0.01);
    arms.push({ shoulder, elbow });
  }
  return { kind, root, body, hips, torso, head, legs, arms };
}

/** Visage rond aux grands yeux brillants (vivant !), joues roses. */
function face(head: Group, look: Look, r: number): Group[] {
  const skull = part(head, sphere(r, 22, 16), look.skin, 0, r * 0.85, 0);
  skull.scale.set(1.04, 0.97, 1);
  skull.material = toon(look.skin, { emissive: look.skin, emissiveIntensity: 0.3 });
  skull.receiveShadow = false;
  const eyes: Group[] = [];
  for (const side of [-1, 1]) {
    const eye = new Group();
    eye.position.set(side * r * 0.36, r * 0.92, r * 0.86);
    eye.rotation.y = side * 0.4;
    head.add(eye);
    const ball = dot(eye, sphere(r * 0.16, 14, 10), INK, 0, 0, 0);
    ball.scale.set(0.8, 1.1, 0.42);
    dot(eye, sphere(r * 0.055, 8, 6), "#ffffff", r * 0.04, r * 0.06, r * 0.06);
    eyes.push(eye);
    const blush = dot(head, sphere(r * 0.12, 10, 8), look.blush, side * r * 0.6, r * 0.62, r * 0.74, true);
    blush.scale.set(1.3, 0.6, 0.4);
    blush.rotation.y = side * 0.68;
  }
  const nose = dot(head, sphere(r * 0.1, 10, 8), look.skinDark, 0, r * 0.66, r * 0.98, true);
  nose.scale.set(1.1, 0.85, 0.8);
  return eyes;
}

// ——— Cuisine ———

const COOK = {
  skin: "#efbf98",
  skinDark: "#dc9f7a",
  blush: "#e58f78",
  hair: "#4a3326",
  mustache: "#3d2a1e",
  bandana: "#c8453a",
  jacket: "#f2ecdc",
  jacketDark: "#d9d1bc",
  apron: "#3e5a78",
  apronDark: "#2f4660",
  pants: "#3b3a36",
  clog: "#6a4528",
  blade: "#c9d1d4",
  bladeEdge: "#eef3f4",
  handle: "#6a4528",
  peach: "#f0a04a",
} as const;

export function buildCook(): SurvivorRig {
  const look: Look = { skin: COOK.skin, skinDark: COOK.skinDark, blush: COOK.blush, hair: COOK.hair, top: COOK.jacket, topDark: COOK.jacketDark, pants: COOK.pants, shoe: COOK.clog, width: 1.18 };
  const base = buildBody("cook", look);
  const { torso, head, arms } = base;
  base.body.scale.setScalar(1.08);
  // Veste croisée : deux rangées de boutons ; tablier marine noué ; torchon à la ceinture.
  for (const side of [-1, 1]) for (const y of [0.18, 0.3, 0.42]) dot(torso, sphere(0.022, 8, 6), "#c9b98f", side * 0.075, y, 0.218, true);
  const apron = part(torso, box(0.42, 0.42, 0.04, 0.03), COOK.apron, 0, 0.12, 0.2);
  apron.rotation.x = 0.06;
  part(torso, torus(0.255, 0.022), COOK.apronDark, 0, 0.2, 0).rotation.x = Math.PI / 2;
  part(torso, box(0.16, 0.07, 0.05, 0.02), COOK.apronDark, 0, 0.19, -0.24);
  const towel = part(torso, box(0.1, 0.2, 0.02, 0.01), "#e8e0c8", 0.2, 0.06, 0.18);
  towel.rotation.z = 0.15;
  for (const y of [0.04, 0.1]) dot(towel, box(0.1, 0.012, 0.022, 0.004), "#c8453a", 0, y - 0.07, 0.002, true);
  // Manches retroussées : bourrelet crème au coude.
  for (const arm of arms) part(arm.elbow, torus(0.07, 0.03), COOK.jacketDark, 0, -0.01, 0).rotation.x = Math.PI / 2;
  // Tête : bandana rouge, grosse moustache, sourcils broussailleux, oreilles.
  const eyes = face(head, look, 0.26);
  const cap = part(head, sphere(0.27, 20, 12, ), COOK.bandana, 0, 0.27, -0.02);
  cap.scale.set(1.02, 0.72, 1.02);
  cap.position.y = 0.33;
  const knot = part(head, sphere(0.05, 10, 8), COOK.bandana, 0, 0.27, -0.27);
  knot.scale.set(1.2, 0.8, 0.8);
  for (const side of [-1, 1]) {
    const tail = part(head, box(0.05, 0.14, 0.02, 0.01), COOK.bandana, side * 0.04, 0.17, -0.29);
    tail.rotation.z = side * 0.4;
    part(head, sphere(0.05, 10, 8), look.skin, side * 0.265, 0.2, 0.0).scale.set(0.5, 1, 0.8);
    const brow = dot(head, capsule(0.022, 0.07), COOK.hair, side * 0.095, 0.31, 0.24, true);
    brow.rotation.set(0, side * 0.4, Math.PI / 2 - side * 0.25);
    // Moustache en guidon : deux grosses mèches.
    const stache = part(head, capsule(0.04, 0.1), COOK.mustache, side * 0.07, 0.13, 0.25);
    stache.rotation.set(0.2, side * 0.3, Math.PI / 2 + side * 0.45);
    part(head, sphere(0.034, 8, 6), COOK.mustache, side * 0.135, 0.105, 0.22);
  }
  for (const side of [-1, 1]) part(head, sphere(0.06, 10, 8), COOK.hair, side * 0.24, 0.12, -0.08).scale.set(0.6, 1, 1);
  // Couperet dans la main droite : lame large, manche bois, rivets.
  const tool = new Group();
  tool.position.set(0, -0.24, 0.03);
  arms[1].elbow.add(tool);
  part(tool, cyl(0.022, 0.13), COOK.handle, 0, 0.0, 0);
  const blade = part(tool, box(0.022, 0.15, 0.22, 0.01), COOK.blade, 0, -0.12, 0.06);
  dot(blade, box(0.024, 0.15, 0.02, 0.005), COOK.bladeEdge, 0, 0, 0.11, true);
  dot(blade, cyl(0.015, 0.026), INK, 0, 0.04, -0.06, true).rotation.z = Math.PI / 2;
  // Main gauche : coupure (rouge), puis bandage blanc quand Lou en a donné un.
  const cut = dot(arms[0].elbow, sphere(0.03, 8, 6), "#c8453a", 0.04, -0.2, 0.05, true);
  cut.scale.set(1, 0.4, 0.4);
  const wrap = part(arms[0].elbow, cyl(0.075, 0.08), "#f3eee0", 0, -0.19, 0);
  wrap.visible = false;
  // Boîte de pêches (départ).
  const can = new Group();
  can.position.set(0, -0.26, 0.06);
  arms[0].elbow.add(can);
  part(can, cyl(0.07, 0.13), "#d9dfe1", 0, 0, 0);
  part(can, cyl(0.072, 0.08), COOK.peach, 0, 0, 0);
  can.visible = false;
  const rig: SurvivorRig = { ...base, tool, lampGlow: null, can, wrap, eyes, pose: "chain", time: 0, blink: 0 };
  addOutline(rig.root, 0.02);
  return rig;
}

// ——— L'opératrice de nuit ———

const OP = {
  skin: "#f0caa8",
  skinDark: "#dfae8a",
  blush: "#e8a090",
  hair: "#b9b4ae",
  hairDark: "#8f8a84",
  cardigan: "#4f7a78",
  cardiganDark: "#3c605f",
  blouse: "#efe6cf",
  skirt: "#4a3f4f",
  shoe: "#3a2c26",
  glasses: "#5a4a3c",
  headset: "#2e3236",
  lamp: "#4a4f52",
  green: "#7dff8a",
  ring: "#e6c255",
} as const;

export function buildNightOperator(): SurvivorRig {
  const look: Look = { skin: OP.skin, skinDark: OP.skinDark, blush: OP.blush, hair: OP.hair, top: OP.cardigan, topDark: OP.cardiganDark, pants: OP.skirt, shoe: OP.shoe, width: 0.95 };
  const base = buildBody("operator", look);
  const { torso, head, arms, hips } = base;
  // Jupe évasée sur les hanches, gilet ouvert sur un chemisier crème, poches.
  const skirt = part(hips, cyl(0.25, 0.3, 0.18), OP.skirt, 0, -0.08, 0);
  skirt.scale.z = 0.85;
  part(torso, box(0.14, 0.3, 0.03, 0.015), OP.blouse, 0, 0.3, 0.19);
  for (const y of [0.22, 0.32, 0.42]) dot(torso, sphere(0.018, 8, 6), "#c9b98f", 0, y, 0.21, true);
  for (const side of [-1, 1]) part(torso, box(0.09, 0.08, 0.02, 0.01), OP.cardiganDark, side * 0.13, 0.1, 0.19);
  // Tête : cheveux gris en chignon piqué d'un crayon, lunettes rondes, casque radio autour du cou.
  const eyes = face(head, look, 0.24);
  // Cheveux tirés en arrière (le front dégagé), deux vagues sur les tempes, chignon haut.
  const hair = part(head, sphere(0.25, 20, 14), OP.hair, 0, 0.3, -0.07);
  hair.scale.set(1.06, 0.88, 1.0);
  for (const side of [-1, 1]) {
    const wave = part(head, sphere(0.085, 12, 10), OP.hair, side * 0.16, 0.38, 0.1);
    wave.scale.set(1.3, 0.62, 0.9);
    wave.rotation.z = side * 0.5;
    part(head, sphere(0.07, 10, 8), OP.hairDark, side * 0.235, 0.22, -0.02).scale.set(0.7, 1.1, 0.9);
  }
  const bun = part(head, sphere(0.1, 14, 10), OP.hairDark, 0, 0.52, -0.16);
  bun.scale.set(1, 0.85, 0.95);
  const pencil = part(head, cyl(0.012, 0.26), "#e8b23c", 0.02, 0.55, -0.17);
  pencil.rotation.z = 1.2;
  for (const side of [-1, 1]) {
    const lens = part(head, torus(0.05, 0.009), OP.glasses, side * 0.085, 0.22, 0.23);
    lens.rotation.y = side * 0.25;
    dot(head, sphere(0.045, 10, 8), "#dff2f2", side * 0.085, 0.22, 0.226, true).scale.set(1, 1, 0.2);
    const brow = dot(head, capsule(0.012, 0.05), OP.hairDark, side * 0.085, 0.3, 0.215, true);
    brow.rotation.set(0, side * 0.3, Math.PI / 2 + side * 0.18);
  }
  dot(head, box(0.05, 0.01, 0.02, 0.004), OP.glasses, 0, 0.225, 0.245, true);
  const smile = dot(head, torus(0.03, 0.007, Math.PI), "#8a4a3a", 0, 0.1, 0.235);
  smile.rotation.set(-0.3, 0, Math.PI);
  const band = part(torso, torus(0.15, 0.02, Math.PI * 1.2), OP.headset, 0, 0.5, 0.0);
  band.rotation.set(Math.PI / 2 - 0.5, 0, -Math.PI * 0.1);
  for (const side of [-1, 1]) part(torso, cyl(0.06, 0.04), OP.headset, side * 0.13, 0.46, 0.1).rotation.z = Math.PI / 2;
  // Alliance (main gauche).
  part(arms[0].elbow, torus(0.03, 0.009), OP.ring, 0, -0.24, 0.03).rotation.x = Math.PI / 2;
  // Lampe de poche à filtre vert, main droite ; une lueur additive devant elle.
  const tool = new Group();
  tool.position.set(0, -0.23, 0.04);
  arms[1].elbow.add(tool);
  const body = part(tool, cyl(0.035, 0.18, 0.04), OP.lamp, 0, 0, 0.06);
  body.rotation.x = Math.PI / 2;
  const lens = dot(tool, cyl(0.042, 0.02), OP.green, 0, 0, 0.16);
  lens.rotation.x = Math.PI / 2;
  const lampGlow = new Mesh(new SphereGeometry(0.16, 12, 8), new MeshBasicMaterial({ color: OP.green, transparent: true, opacity: 0.35, depthWrite: false, blending: AdditiveBlending }));
  lampGlow.position.set(0, 0, 0.22);
  lampGlow.userData.noOutline = true;
  tool.add(lampGlow);
  const rig: SurvivorRig = { ...base, tool, lampGlow, can: null, wrap: null, eyes, pose: "mask", time: 0, blink: 0 };
  addOutline(rig.root, 0.02);
  return rig;
}

// ——— Animation ———

function smooth(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.exp(-rate * dt);
}

interface ArmPose { sx: number; sz: number; sy?: number; e: number }

/** Bras gauche, bras droit, buste, tête, hauteur du bassin, selon la pose. */
const POSES: Record<SurvivorPose, { arms: [ArmPose, ArmPose]; lean: number; head: number; turn?: number; hips: number; sit?: boolean }> = {
  guard: { arms: [{ sx: -0.7, sz: -0.2, e: -1.2 }, { sx: -2.6, sz: 0.2, e: -0.6 }], lean: -0.12, head: 0.1, hips: 0.5 },
  chain: { arms: [{ sx: -0.2, sz: -0.1, e: -0.4 }, { sx: -0.35, sz: 0.15, e: -0.3 }], lean: 0.08, head: 0.08, hips: 0.5 },
  hips: { arms: [{ sx: 0.3, sz: -0.8, e: -1.5 }, { sx: 0.3, sz: 0.8, e: -1.5 }], lean: -0.04, head: 0.02, hips: 0.5 },
  back: { arms: [{ sx: -1.9, sz: -0.2, e: -0.4 }, { sx: -1.6, sz: 0.2, e: -0.5 }], lean: 0.1, head: -0.15, hips: 0.5 },
  accuse: { arms: [{ sx: 0.1, sz: -0.35, e: -0.2 }, { sx: -1.75, sz: 0.25, e: -0.15 }], lean: 0.12, head: 0.1, hips: 0.5 },
  afraid: { arms: [{ sx: -1.3, sz: -0.4, e: -1.4 }, { sx: -1.1, sz: 0.4, e: -1.2 }], lean: -0.25, head: 0.2, hips: 0.46 },
  offer: { arms: [{ sx: -1.35, sz: -0.05, e: -0.25 }, { sx: -0.1, sz: 0.15, e: -0.2 }], lean: 0.08, head: 0.05, hips: 0.5 },
  mask: { arms: [{ sx: -0.7, sz: 0.35, sy: 0.6, e: -1.5 }, { sx: -0.9, sz: 0.1, e: -0.6 }], lean: 0.03, head: 0.06, hips: 0.5 },
  defensive: { arms: [{ sx: -0.9, sz: 0.6, sy: 0.4, e: -1.9 }, { sx: -0.9, sz: -0.6, sy: -0.4, e: -1.9 }], lean: -0.08, head: 0.0, hips: 0.5 },
  ashamed: { arms: [{ sx: -0.25, sz: 0.1, e: -0.5 }, { sx: -0.25, sz: -0.1, e: -0.5 }], lean: 0.25, head: 0.5, hips: 0.48 },
  open: { arms: [{ sx: -0.7, sz: -0.3, e: -0.6 }, { sx: -0.7, sz: 0.3, e: -0.6 }], lean: 0, head: 0.02, hips: 0.5 },
  walk: { arms: [{ sx: 0, sz: -0.1, e: -0.3 }, { sx: 0, sz: 0.1, e: -0.3 }], lean: 0.06, head: 0.05, hips: 0.5 },
};

export interface SurvivorAnimation {
  pose: SurvivorPose;
  /** Vitesse de marche (m/s). */
  speed: number;
  /** Lacet de la tête vers Lou, relatif au corps (radians, borné). */
  look: number;
  /** Lampe verte allumée (opératrice). */
  lamp: boolean;
  /** Le couperet est en main (Cuisine). */
  armed: boolean;
}

/** Pose du survivant pour cette image : respiration, regard vers Lou, clignement, marche. */
export function animateSurvivor(rig: SurvivorRig, a: SurvivorAnimation, dt: number): void {
  rig.time += dt;
  rig.pose = a.pose;
  const t = rig.time;
  const h = Math.min(dt, 0.05);
  const p = POSES[a.speed > 0.1 ? "walk" : a.pose];
  const walking = a.speed > 0.1;
  const stride = t * (walking ? 7.5 : 0);
  const s = Math.sin(stride);
  rig.hips.position.y = smooth(rig.hips.position.y, p.hips + (walking ? Math.abs(Math.cos(stride)) * 0.03 : Math.sin(t * 1.8) * 0.006), 10, h);
  for (let i = 0; i < 2; i++) {
    const leg = rig.legs[i];
    const phase = i === 0 ? s : -s;
    const target = p.sit ? -1.45 : walking ? -phase * 0.55 : 0;
    leg.hip.rotation.x = smooth(leg.hip.rotation.x, target, 12, h);
    leg.knee.rotation.x = smooth(leg.knee.rotation.x, p.sit ? 1.5 : walking ? Math.max(0, phase) * 0.9 : 0.02, 12, h);
    const arm = rig.arms[i];
    const ap = p.arms[i];
    // Opératrice qui tourne son alliance : la main gauche frotte la droite.
    const twist = a.pose === "mask" && i === 0 ? Math.sin(t * 2.4) * 0.12 : 0;
    const swing = walking ? phase * -0.45 : Math.sin(t * 1.3 + i) * 0.02;
    arm.shoulder.rotation.x = smooth(arm.shoulder.rotation.x, ap.sx + swing, 9, h);
    arm.shoulder.rotation.z = smooth(arm.shoulder.rotation.z, ap.sz * (i === 0 ? 1 : 1) + twist, 9, h);
    arm.shoulder.rotation.y = smooth(arm.shoulder.rotation.y, ap.sy ?? 0, 9, h);
    arm.elbow.rotation.x = smooth(arm.elbow.rotation.x, ap.e + twist * 0.5, 9, h);
  }
  // Cuisine hostile : le couperet tremble un peu.
  const shake = a.pose === "guard" ? Math.sin(t * 23) * 0.02 : 0;
  rig.torso.rotation.x = smooth(rig.torso.rotation.x, p.lean + Math.sin(t * 1.8) * 0.012 + shake, 8, h);
  rig.torso.rotation.y = smooth(rig.torso.rotation.y, walking ? Math.cos(stride) * 0.08 : 0, 8, h);
  rig.head.rotation.x = smooth(rig.head.rotation.x, p.head, 6, h);
  const look = a.pose === "back" || a.pose === "ashamed" ? 0 : Math.max(-0.9, Math.min(0.9, a.look));
  rig.head.rotation.y = smooth(rig.head.rotation.y, look, 5, h);
  // Clignement.
  rig.blink -= dt;
  if (rig.blink < -3.4) rig.blink = 0.12;
  const open = rig.blink > 0 ? 0.15 : 1;
  for (const eye of rig.eyes) eye.scale.y = open;
  rig.tool.visible = rig.kind === "operator" ? a.pose !== "ashamed" : a.armed;
  if (rig.lampGlow) {
    rig.lampGlow.visible = a.lamp && rig.tool.visible;
    (rig.lampGlow.material as MeshBasicMaterial).opacity = 0.3 + Math.sin(t * 3) * 0.05;
  }
  if (rig.can) rig.can.visible = a.pose === "offer";
}

function slab(parent: Object3D, w: number, h: number, d: number, color: string, x: number, y: number, z: number): Mesh {
  return part(parent, box(w, h, d, 0.03), color, x, y + h / 2, z);
}

// ——— Leurs lieux (le décor est dans storyProps.ts ; ici, seulement ce qui bouge avec la confiance) ———

/** Porte de la chambre froide (storyProps : cold_room_door), face sud du caisson. */
export const COLD_DOOR = { x: -30.25, z: 17.78, width: 1.06 } as const;
/** Porte du local technique (storyProps : operator_door), dans la cloison sud du local. */
export const TECH_DOOR = { x: 28.3, z: -18.53, width: 0.9 } as const;

function canvasTexture(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  draw(context);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** La colonne du nom, à la craie sous les 9 traits : « L'ÉTRANGER », puis barré « LE BRICOLEUR », puis barré « LOU ». */
export function tallyLines(level: number): { text: string; struck: boolean }[] {
  const names = ["L'ÉTRANGER", "LE BRICOLEUR", "LOU"];
  const shown = level >= 2 ? 3 : level === 1 ? 2 : 1;
  return names.slice(0, shown).map((text, i) => ({ text, struck: i < shown - 1 }));
}

function drawTally(c: CanvasRenderingContext2D, level: number): void {
  c.clearRect(0, 0, 256, 200);
  c.strokeStyle = "rgba(250,246,234,0.95)";
  c.fillStyle = "rgba(250,246,234,0.95)";
  c.lineCap = "round";
  c.textAlign = "center";
  c.font = `bold 30px "Grandstander", "Comic Sans MS", sans-serif`;
  tallyLines(level).forEach((line, i) => {
    const y = 46 + i * 58;
    c.fillText(line.text, 128, y);
    if (line.struck) {
      c.beginPath();
      c.lineWidth = 5;
      c.moveTo(18, y - 10);
      c.lineTo(238, y - 14);
      c.stroke();
    }
  });
}

export interface ColdDoorView {
  root: Group;
  /** Marche de Cuisine : −1 fermée · 0 sur la chaîne · 1 ouverte · 2 grande ouverte (il est sorti). */
  setDoor(level: number): void;
  /** Colonne du nom à la craie. */
  setTally(level: number): void;
  update(dt: number): void;
}

/**
 * Ce qui change sur la porte de la chambre froide : un battant qui s'entrouvre (chaîne) ou s'ouvre sur le noir
 * glacé de dedans, et la colonne du nom à la craie. Le caisson, la porte fermée et les 9 traits sont du décor.
 */
export function buildColdDoor(): ColdDoorView {
  const D = COLD_DOOR;
  const root = new Group();
  root.name = "PorteChambreFroide";
  const front = D.z + 0.05;
  // L'intérieur, sombre et givré, devant la porte peinte du décor (visible quand le battant s'ouvre).
  const gap = new Mesh(new PlaneGeometry(D.width - 0.02, 1.86), new MeshBasicMaterial({ color: "#16242c" }));
  gap.position.set(D.x, 0.98, front);
  gap.userData.noOutline = true;
  root.add(gap);
  const frost = new Mesh(new PlaneGeometry(D.width - 0.1, 0.5), new MeshBasicMaterial({ color: "#9fd4ff", transparent: true, opacity: 0.25, depthWrite: false, blending: AdditiveBlending }));
  frost.position.set(D.x, 0.3, front + 0.005);
  frost.userData.noOutline = true;
  root.add(frost);
  // Battant : pivot côté gauche (charnières du décor), il s'ouvre vers la salle.
  const hinge = new Group();
  hinge.position.set(D.x - D.width / 2, 0, front + 0.02);
  root.add(hinge);
  slab(hinge, D.width, 1.9, 0.08, "#56767d", D.width / 2, 0.05, 0.04);
  part(hinge, box(0.08, 0.16, 0.1, 0.02), "#3a3633", D.width - 0.12, 0.95, 0.1);
  // Chaîne de sûreté (méfiant), du chant du battant au chambranle.
  const chain = new Group();
  chain.position.set(D.width, 1.12, 0.08);
  hinge.add(chain);
  for (let i = 0; i < 4; i++) {
    const link = part(chain, torus(0.028, 0.008), "#c9d1d4", 0.02 + i * 0.045, 0, 0.02 + i * 0.02);
    link.rotation.set(i % 2 ? Math.PI / 2 : 0, 0.4, 0);
  }
  addOutline(root, 0.016);
  // La colonne du nom, sur le caisson, à droite de la porte (sous la craie des 9 traits, du décor).
  const tallyTexture = canvasTexture(256, 200, (c) => drawTally(c, 0));
  const tally = new Mesh(new PlaneGeometry(0.78, 0.61), new MeshBasicMaterial({ map: tallyTexture ?? undefined, transparent: true, depthWrite: false }));
  tally.position.set(D.x + 0.98, 1.05, D.z - 0.06);
  tally.userData.noOutline = true;
  tally.visible = tallyTexture !== null;
  root.add(tally);
  let door = 0;
  let target = 0;
  let tallyLevel = 0;
  let closed = true;
  return {
    root,
    setDoor(level) {
      target = level <= -1 ? 0 : level === 0 ? 0.28 : level === 1 ? 1.5 : 1.95;
      chain.visible = level === 0;
      closed = level <= -1;
    },
    setTally(level) {
      const clamped = Math.max(0, Math.min(2, level));
      if (clamped === tallyLevel || !tallyTexture) return;
      tallyLevel = clamped;
      drawTally((tallyTexture.image as HTMLCanvasElement).getContext("2d")!, clamped);
      tallyTexture.needsUpdate = true;
    },
    update(dt) {
      door = smooth(door, target, 4, Math.min(dt, 0.05));
      hinge.rotation.y = -door;
      // Fermée : le battant ajouté se confond avec la porte du décor ; on cache l'intérieur.
      gap.visible = frost.visible = !closed || door > 0.03;
    },
  };
}

// ——— Petits objets interactifs ———

/** Radio de la guérite, posée au sol près de la guérite renversée : petit poste et sa diode. */
export function buildGuardRadio(): { group: Group; led: Mesh; height: number } {
  const group = new Group();
  part(group, box(0.42, 0.26, 0.2, 0.04), "#d8a43a", 0, 0.13, 0);
  part(group, cyl(0.06, 0.03), "#3b3a36", -0.08, 0.15, 0.1).rotation.x = Math.PI / 2;
  const antenna = part(group, cyl(0.008, 0.4), "#3b3a36", 0.15, 0.45, -0.05);
  antenna.rotation.z = -0.25;
  const led = dot(group, sphere(0.022, 8, 6), "#ff5a36", 0.12, 0.2, 0.105);
  addOutline(group, 0.015);
  return { group, led, height: 0.9 };
}

/** Loquet de la porte de service (« Refermer »), petit verrou jaune sur le montant. */
export function buildLatch(): { group: Group; height: number } {
  const group = new Group();
  part(group, box(0.1, 0.24, 0.06, 0.02), "#4d5a60", 0, 1.0, 0);
  part(group, box(0.22, 0.05, 0.05, 0.02), "#f2c230", 0.06, 1.0, 0.04);
  addOutline(group, 0.015);
  return { group, height: 1.6 };
}

/** Étagère de Cuisine, contre le mur de la cafétéria (on peut la fouiller… sous ses yeux). */
export function buildCookShelf(): { group: Group; height: number } {
  const group = new Group();
  slab(group, 0.36, 1.2, 0.7, "#a06c3f", 0, 0, 0);
  for (const y of [0.4, 0.8]) slab(group, 0.4, 0.04, 0.74, "#6e4528", 0.02, y, 0);
  for (let i = 0; i < 3; i++) part(group, cyl(0.06, 0.13), i === 1 ? "#f0a04a" : "#e6b23c", 0.06, 0.48, -0.2 + i * 0.2);
  part(group, box(0.16, 0.1, 0.22, 0.03), "#c8453a", 0.06, 0.88, 0.05);
  addOutline(group, 0.015);
  return { group, height: 1.5 };
}

