// Zombies « jouets d'argile » : chibi arrondis (grosse tête, membres trapus), mêmes habits que l'opératrice
// mais délavés et rapiécés (bonnet, sweat à capuche, écharpe, cargo, bottes), peau gris-vert, yeux luisants.
// Le marcheur est grand et voûté, bras tendus ; le rampant n'a plus de jambes et se hisse sur ses longs bras.
import {
  AdditiveBlending, CapsuleGeometry, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshToonMaterial,
  Object3D, SphereGeometry, TorusGeometry, type BufferGeometry, type Material,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { addOutline, toon } from "./toon";

export type ZombieKind = "walker" | "crawler";

/** Couleurs : palette chaude de la fiche personnage, désaturée et salie. */
export const ZOMBIE_COLORS = {
  skin: "#9db08a",
  skinDark: "#7f9470",
  mouth: "#3a2420",
  tooth: "#e6dcb8",
  beanie: "#6b7058",
  beanieBand: "#5a604c",
  hoodie: "#b29a5e",
  hoodieDark: "#8c7748",
  hoodieCrawler: "#7d8064",
  cream: "#cdc2a4",
  scarf: "#4a4945",
  cargo: "#646b55",
  leather: "#6a4a30",
  boot: "#5a4230",
  glove: "#4f3b2c",
  hair: "#5a4838",
  rip: "#3a2f27",
  patch: "#8a6a44",
} as const;

/** Couleurs des yeux : ambre en patrouille, rouge en chasse, cyan sous l'ARC-3, braise éteinte endormi. */
export const EYE = { calm: "#ffa83b", chase: "#ff3418", stun: "#77ffff", sleep: "#6b4a2a" } as const;
export type EyeState = keyof typeof EYE;

export interface ZombieRig {
  kind: ZombieKind;
  root: Group;
  /** Pivot au sol : chute, tremblement, fente. */
  body: Group;
  hips: Group;
  torso: Group;
  head: Group;
  jaw: Group;
  legs: { hip: Group; knee: Group }[];
  arms: { shoulder: Group; elbow: Group }[];
  eye: MeshBasicMaterial;
  halo: MeshBasicMaterial;
  /** Matériaux propres au zombie : flash d'impact et teinte électrique. */
  tint: MeshToonMaterial[];
  outlines: Mesh[];
  casters: Mesh[];
  scale: number;
}

export interface ZombieAnimation {
  /** Vitesse réelle (m/s). */
  speed: number;
  /** Phase de la foulée (radians). */
  stride: number;
  eye: EyeState;
  /** 1 → 0 pendant la fente d'attaque. */
  attack: number;
  /** Secondes restantes du flash d'impact (0.18 → 0). */
  hit: number;
  stunned: boolean;
  dormant: boolean;
  /** Secondes depuis la mort, −1 si vivant. */
  dead: number;
  /** Horloge globale (secondes). */
  time: number;
}

const geometries = new Map<string, BufferGeometry>();
function geo<T extends BufferGeometry>(key: string, build: () => T): T {
  let g = geometries.get(key);
  if (!g) {
    g = build();
    geometries.set(key, g);
  }
  return g as T;
}

const sphere = (r: number, w = 14, h = 10) => geo(`s:${r}:${w}:${h}`, () => new SphereGeometry(r, w, h));
const capsule = (r: number, len: number) => geo(`c:${r}:${len}`, () => new CapsuleGeometry(r, Math.max(0.001, len), 4, 10));
const rounded = (w: number, h: number, d: number, r: number) => geo(`rb:${w}:${h}:${d}:${r}`, () => new RoundedBoxGeometry(w, h, d, 2, r));
const torus = (r: number, tube: number) => geo(`t:${r}:${tube}`, () => new TorusGeometry(r, tube, 6, 18));
const dome = (r: number) => geo(`d:${r}`, () => new SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.56));
const cylinder = (r: number, h: number) => geo(`cy:${r}:${h}`, () => new CylinderGeometry(r, r, h, 14));

/** Matériau toon propre à ce zombie (même shader que toon(), émissif modifiable). */
function ownToon(color: string): MeshToonMaterial {
  const base = toon(color);
  const material = base.clone();
  material.onBeforeCompile = base.onBeforeCompile;
  material.customProgramCacheKey = base.customProgramCacheKey;
  material.emissive = new Color(0, 0, 0);
  material.emissiveIntensity = 1;
  return material;
}

function part(parent: Object3D, geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Détail plat collé (accroc, pièce) : sans contour ni ombre. */
function detail(parent: Object3D, geometry: BufferGeometry, color: string, x: number, y: number, z: number): Mesh {
  const mesh = part(parent, geometry, toon(color, { rim: 0 }), x, y, z);
  mesh.castShadow = false;
  mesh.userData.noOutline = true;
  return mesh;
}

function limb(parent: Object3D, length: number, radius: number, material: Material): Mesh {
  return part(parent, capsule(radius, length - radius * 2), material, 0, -length / 2, 0);
}

/** Tête chibi : sphère, bonnet ou capuche, yeux luisants, mâchoire pendante. */
function buildHead(head: Group, radius: number, skin: Material, hoodie: Material, eye: MeshBasicMaterial, halo: MeshBasicMaterial, crawler: boolean): Group {
  const C = ZOMBIE_COLORS;
  const skull = part(head, sphere(radius, 18, 14), skin, 0, radius, 0);
  skull.scale.set(1.04, 0.94, 0.96);
  if (crawler) {
    // Capuche relevée, déchirée sur le côté
    const hood = part(head, dome(radius * 1.12), hoodie, 0, radius * 1.02, -radius * 0.2);
    hood.rotation.x = -0.6;
    detail(head, sphere(radius * 0.22, 8, 6), C.rip, radius * 0.72, radius * 1.45, -radius * 0.2).scale.set(0.5, 1, 1);
  } else {
    // Bonnet olive délavé, revers, pièce de cuir et trou : posé haut pour dégager le visage
    part(head, dome(radius * 1.05), toon(C.beanie), 0, radius * 1.22, -radius * 0.06);
    const band = part(head, torus(radius * 0.98, radius * 0.15), toon(C.beanieBand), 0, radius * 1.26, -radius * 0.06);
    band.rotation.x = Math.PI / 2 + 0.1;
    detail(head, rounded(radius * 0.42, radius * 0.24, radius * 0.08, 0.02), C.patch, radius * 0.4, radius * 1.32, radius * 0.86).rotation.y = 0.42;
    detail(head, sphere(radius * 0.13, 8, 6), C.rip, -radius * 0.35, radius * 2.15, radius * 0.1).scale.set(1, 0.4, 1);
    // Mèches qui dépassent sur les côtés et la nuque
    for (const [x, y, z] of [[-0.9, 1.0, -0.25], [0.92, 0.95, -0.3], [-0.45, 0.9, -0.85], [0.35, 0.85, -0.9]] as const) {
      part(head, sphere(radius * 0.24, 8, 6), toon(C.hair), x * radius, y * radius, z * radius).scale.set(0.8, 1.2, 0.8);
    }
  }
  // Yeux : un grand œil luisant et un plus petit (asymétrie inquiétante), halo additif lisible de haut
  const eyes: [number, number][] = crawler ? [[-0.36, 0.075], [0.36, 0.075]] : [[-0.36, 0.1], [0.36, 0.07]];
  for (const [x, r] of eyes) {
    const ey = radius * (crawler ? 0.98 : 0.95);
    const ez = radius * 0.9;
    const ball = new Mesh(sphere(r * radius * 3.3, 10, 8), eye);
    ball.position.set(x * radius, ey, ez);
    ball.scale.z = 0.6;
    ball.userData.noOutline = true;
    head.add(ball);
    const glowShell = new Mesh(sphere(r * radius * 7, 10, 8), halo);
    glowShell.position.copy(ball.position);
    glowShell.userData.noOutline = true;
    glowShell.renderOrder = 2;
    head.add(glowShell);
  }
  // Cernes et joues creuses
  detail(head, sphere(radius * 0.16, 8, 6), C.skinDark, radius * 0.55, radius * 0.72, radius * 0.72).scale.set(1, 0.6, 0.5);
  // Mâchoire décrochée
  const jaw = new Group();
  jaw.position.set(0, radius * 0.55, radius * 0.45);
  head.add(jaw);
  part(jaw, sphere(radius * 0.3, 10, 8), toon(C.mouth, { rim: 0 }), 0, -radius * 0.02, radius * 0.32).scale.set(1.1, 0.7, 0.5);
  const chin = part(jaw, rounded(radius * 0.78, radius * 0.24, radius * 0.6, 0.05), skin, 0, -radius * 0.2, radius * 0.24);
  chin.rotation.x = 0.1;
  for (const x of [-0.14, 0.12]) detail(jaw, rounded(radius * 0.1, radius * 0.12, radius * 0.06, 0.01), C.tooth, x * radius, -radius * 0.08, radius * 0.54);
  return jaw;
}

function eyeMaterials(): [MeshBasicMaterial, MeshBasicMaterial] {
  const eye = new MeshBasicMaterial({ color: EYE.calm });
  const halo = new MeshBasicMaterial({ color: EYE.calm, transparent: true, opacity: 0.32, depthWrite: false, blending: AdditiveBlending });
  return [eye, halo];
}

function finish(rig: ZombieRig): ZombieRig {
  addOutline(rig.root, 0.022);
  rig.root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    if (child.userData.isOutline) rig.outlines.push(child);
    else if (child.castShadow) rig.casters.push(child);
  });
  return rig;
}

/** Marcheur : ~1.8 m voûté, tête énorme, bras tendus vers l'avant, jambe droite raide (boiterie). */
export function buildWalker(): ZombieRig {
  const C = ZOMBIE_COLORS;
  const root = new Group();
  root.name = "ZombieWalker";
  const body = new Group();
  root.add(body);
  const scale = 1.12;
  body.scale.setScalar(scale);
  const skin = ownToon(C.skin);
  const hoodie = ownToon(C.hoodie);
  const [eye, halo] = eyeMaterials();

  const hips = new Group();
  hips.position.y = 0.5;
  body.add(hips);

  // Jambes : cargo délavé, une botte, un pied nu sous un pantalon déchiré
  const legs: ZombieRig["legs"] = [];
  for (const side of [-1, 1]) {
    const hip = new Group();
    hip.position.set(side * 0.12, 0, 0);
    hips.add(hip);
    limb(hip, 0.27, 0.105, toon(C.cargo));
    if (side < 0) detail(hip, rounded(0.07, 0.09, 0.03, 0.01), C.leather, -0.1, -0.14, 0.02).rotation.y = -Math.PI / 2;
    const knee = new Group();
    knee.position.y = -0.24;
    hip.add(knee);
    if (side < 0) {
      limb(knee, 0.2, 0.095, toon(C.cargo));
      const cuff = part(knee, torus(0.1, 0.035), toon(C.cream), 0, -0.17, 0);
      cuff.rotation.x = Math.PI / 2;
      part(knee, rounded(0.2, 0.13, 0.28, 0.06), toon(C.boot), 0, -0.22, 0.04);
    } else {
      limb(knee, 0.12, 0.095, toon(C.cargo));
      detail(knee, sphere(0.05, 8, 6), C.rip, 0.06, -0.08, 0.06);
      limb(knee, 0.22, 0.07, skin);
      part(knee, rounded(0.15, 0.08, 0.22, 0.04), skin, 0, -0.23, 0.05);
    }
    legs.push({ hip, knee });
  }

  // Tronc : sweat à capuche moutarde délavé, écharpe charbon, sangle de cuir, pièces et accrocs
  const torso = new Group();
  torso.position.y = 0.04;
  hips.add(torso);
  const chest = part(torso, capsule(0.25, 0.2), hoodie, 0, 0.25, 0);
  chest.scale.set(1.05, 1, 0.86);
  const hem = part(torso, torus(0.235, 0.05), toon(C.cream), 0, 0.06, 0);
  hem.rotation.x = Math.PI / 2;
  hem.scale.y = 0.86;
  const strap = part(torso, torus(0.26, 0.025), toon(C.leather), 0, 0.28, 0);
  strap.rotation.set(Math.PI / 2, 0.75, 0);
  strap.scale.set(1, 0.86, 1);
  part(torso, rounded(0.16, 0.14, 0.08, 0.03), toon(C.leather), 0.2, 0.12, -0.12).rotation.y = 0.9;
  detail(torso, rounded(0.11, 0.1, 0.03, 0.01), C.patch, -0.11, 0.3, 0.205);
  detail(torso, sphere(0.06, 8, 6), C.rip, 0.1, 0.18, 0.2).scale.set(1.3, 0.8, 0.5);
  detail(torso, sphere(0.05, 8, 6), C.rip, -0.17, 0.12, -0.18).scale.set(1, 1.4, 0.5);
  // Capuche rabattue dans le dos
  const hood = part(torso, sphere(0.17, 12, 8), hoodie, 0, 0.45, -0.18);
  hood.scale.set(1.3, 0.7, 0.8);
  const scarf = part(torso, torus(0.17, 0.065), toon(C.scarf), 0, 0.48, 0.02);
  scarf.rotation.x = Math.PI / 2 - 0.2;
  const scarfTail = part(torso, capsule(0.05, 0.22), toon(C.scarf), 0.12, 0.33, 0.18);
  scarfTail.rotation.z = 0.25;

  // Tête énorme, penchée
  const head = new Group();
  head.position.set(0, 0.5, 0.06);
  torso.add(head);
  const jaw = buildHead(head, 0.31, skin, hoodie, eye, halo, false);

  // Bras : manche, poignet crème effiloché, avant-bras nu, un gant, une main nue
  const arms: ZombieRig["arms"] = [];
  for (const side of [-1, 1]) {
    const shoulder = new Group();
    shoulder.rotation.order = "YXZ";
    shoulder.position.set(side * 0.3, side < 0 ? 0.36 : 0.32, 0);
    torso.add(shoulder);
    limb(shoulder, 0.24, 0.09, hoodie);
    const cuff = part(shoulder, torus(0.08, 0.03), toon(C.cream), 0, -0.22, 0);
    cuff.rotation.x = Math.PI / 2;
    const elbow = new Group();
    elbow.position.y = -0.22;
    shoulder.add(elbow);
    limb(elbow, 0.22, 0.068, skin);
    const hand = part(elbow, sphere(0.085, 10, 8), side < 0 ? toon(C.glove) : skin, 0, -0.23, 0.01);
    hand.scale.set(1, 1.1, 0.8);
    for (const f of [-1, 0, 1]) part(elbow, capsule(0.024, 0.07), side < 0 ? toon(C.glove) : skin, f * 0.04, -0.31, 0.02);
    arms.push({ shoulder, elbow });
  }

  return finish({ kind: "walker", root, body, hips, torso, head, jaw, legs, arms, eye, halo, tint: [skin, hoodie], outlines: [], casters: [], scale });
}

/** Rampant : torse sans jambes (~0.65 m), capuche relevée, haillons traînants, longs bras. */
export function buildCrawler(): ZombieRig {
  const C = ZOMBIE_COLORS;
  const root = new Group();
  root.name = "ZombieCrawler";
  const body = new Group();
  root.add(body);
  const skin = ownToon(C.skin);
  const hoodie = ownToon(C.hoodieCrawler);
  const [eye, halo] = eyeMaterials();

  const hips = new Group();
  hips.position.y = 0.24;
  body.add(hips);
  const torso = new Group();
  hips.add(torso);
  const trunk = part(torso, capsule(0.2, 0.26), hoodie, 0, 0, -0.04);
  trunk.rotation.x = Math.PI / 2 - 0.25;
  trunk.scale.set(1.12, 1, 0.9);
  // Moignon en haillons qui traîne derrière
  for (const [x, rz, len] of [[-0.1, 0.25, 0.22], [0.02, -0.1, 0.28], [0.12, -0.3, 0.18]] as const) {
    const rag = part(torso, rounded(0.09, len, 0.03, 0.012), toon(C.hoodieDark), x, -0.08, -0.3);
    rag.rotation.set(1.2, 0, rz);
  }
  detail(torso, rounded(0.12, 0.12, 0.03, 0.01), C.patch, 0.08, 0.17, -0.12).rotation.x = -1.3;
  detail(torso, sphere(0.06, 8, 6), C.rip, -0.12, 0.14, 0.05).scale.set(1.2, 0.5, 1);
  const belt = part(torso, cylinder(0.2, 0.05), toon(C.leather), 0, -0.02, -0.2);
  belt.rotation.x = Math.PI / 2 - 0.25;
  belt.scale.set(1.12, 1, 0.9);
  const scarf = part(torso, torus(0.13, 0.055), toon(C.scarf), 0, 0.1, 0.17);
  scarf.rotation.x = 0.5;
  const scarfTail = part(torso, capsule(0.045, 0.3), toon(C.scarf), -0.08, 0.12, -0.05);
  scarfTail.rotation.set(1.3, 0, 0.3);

  // Grosse tête relevée vers l'avant
  const head = new Group();
  head.position.set(0, 0.08, 0.24);
  torso.add(head);
  const jaw = buildHead(head, 0.23, skin, hoodie, eye, halo, true);

  // Longs bras : manches retroussées, mains larges
  const arms: ZombieRig["arms"] = [];
  for (const side of [-1, 1]) {
    const shoulder = new Group();
    shoulder.rotation.order = "YXZ";
    shoulder.position.set(side * 0.21, 0.06, 0.14);
    torso.add(shoulder);
    limb(shoulder, 0.3, 0.075, hoodie);
    const cuff = part(shoulder, torus(0.07, 0.028), toon(C.cream), 0, -0.27, 0);
    cuff.rotation.x = Math.PI / 2;
    const elbow = new Group();
    elbow.position.y = -0.28;
    shoulder.add(elbow);
    limb(elbow, 0.28, 0.06, skin);
    const hand = part(elbow, sphere(0.085, 10, 8), skin, 0, -0.3, 0.02);
    hand.scale.set(1.15, 0.7, 1.1);
    for (const f of [-1, 0, 1]) part(elbow, capsule(0.022, 0.08), skin, f * 0.045, -0.34, 0.06).rotation.x = 0.6;
    arms.push({ shoulder, elbow });
  }

  return finish({ kind: "crawler", root, body, hips, torso, head, jaw, legs: [], arms, eye, halo, tint: [skin, hoodie], outlines: [], casters: [], scale: 1 });
}

export function buildZombie(kind: ZombieKind): ZombieRig {
  return kind === "walker" ? buildWalker() : buildCrawler();
}

/** Qualité réduite : pas de coque de contour ni d'ombre portée. */
export function setZombieQuality(rig: ZombieRig, low: boolean): void {
  for (const hull of rig.outlines) hull.visible = !low;
  for (const mesh of rig.casters) mesh.castShadow = !low;
}

function smooth(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.exp(-rate * dt);
}

const STUN_TINT = new Color("#3fe8ff");
const HIT_TINT = new Color("#fff1d0");

/** Pose et teinte du zombie pour cette image. */
export function animateZombie(rig: ZombieRig, a: ZombieAnimation, dt: number): void {
  const t = a.time;
  // Yeux
  const eyeColor = a.stunned ? EYE.stun : a.dormant || a.dead >= 0 ? EYE.sleep : EYE[a.eye];
  rig.eye.color.set(eyeColor);
  rig.halo.color.set(eyeColor);
  rig.halo.opacity = a.dead >= 0 || a.dormant ? 0 : a.eye === "chase" ? 0.45 : 0.3;

  // Teinte : flash d'impact, crépitement cyan de l'ARC-3
  let tint = 0;
  let tintColor = HIT_TINT;
  if (a.hit > 0) tint = (a.hit / 0.18) * 0.55;
  if (a.stunned) {
    tintColor = STUN_TINT;
    tint = Math.max(tint, 0.25 + 0.35 * Math.max(0, Math.sin(t * 47) * Math.sin(t * 31)));
  }
  for (const m of rig.tint) {
    m.emissive.copy(tintColor);
    m.emissiveIntensity = tint;
  }

  // Mort : chute puis enfoncement dans le sol
  if (a.dead >= 0) {
    const fall = Math.min(1, a.dead / 0.35);
    const ease = 1 - (1 - fall) * (1 - fall);
    if (rig.kind === "walker") {
      rig.body.rotation.x = -1.45 * ease;
      rig.body.position.y = 0.12 * ease;
      rig.jaw.rotation.x = 0.6;
    } else {
      rig.body.rotation.z = 1.4 * ease;
      rig.body.position.y = 0.1 * ease;
    }
    const sink = Math.min(1, Math.max(0, (a.dead - 1.5) / 0.45));
    rig.root.position.y = -0.5 * sink;
    rig.body.scale.setScalar(rig.scale * (1 - sink * 0.95));
    return;
  }
  rig.root.position.y = 0;
  rig.body.rotation.z = 0;

  // Tremblement électrique
  const jitterX = a.stunned ? (Math.sin(t * 93) + Math.sin(t * 57)) * 0.025 : 0;
  const jitterZ = a.stunned ? Math.sin(t * 71) * 0.025 : 0;
  const spasm = a.stunned ? Math.sin(t * 63) * 0.35 : 0;
  const lunge = a.attack > 0 ? Math.sin((1 - a.attack) * Math.PI) : 0;

  if (rig.kind === "walker") animateWalker(rig, a, dt, lunge, spasm);
  else animateCrawler(rig, a, dt, lunge, spasm);
  rig.body.position.x = jitterX;
  rig.body.position.z = smooth(rig.body.position.z, lunge * (rig.kind === "walker" ? 0.28 : 0.4), 30, dt) + jitterZ;
}

function animateWalker(rig: ZombieRig, a: ZombieAnimation, dt: number, lunge: number, spasm: number): void {
  const t = a.time;
  const moving = a.speed > 0.08 && !a.stunned;
  const chase = a.eye === "chase";
  const s = Math.sin(a.stride);
  const c = Math.cos(a.stride);
  rig.body.rotation.x = smooth(rig.body.rotation.x, 0, 10, dt);

  if (a.dormant) {
    // Endormi : assis, affalé, la tête sur la poitrine
    rig.hips.position.y = smooth(rig.hips.position.y, 0.22, 4, dt);
    for (const leg of rig.legs) {
      leg.hip.rotation.x = smooth(leg.hip.rotation.x, -1.45, 4, dt);
      leg.knee.rotation.x = smooth(leg.knee.rotation.x, 0.35, 4, dt);
    }
    rig.torso.rotation.x = smooth(rig.torso.rotation.x, 0.65 + Math.sin(t * 1.3) * 0.02, 4, dt);
    rig.torso.rotation.z = smooth(rig.torso.rotation.z, 0.12, 4, dt);
    rig.head.rotation.x = smooth(rig.head.rotation.x, 0.45, 4, dt);
    rig.head.rotation.z = smooth(rig.head.rotation.z, 0.35, 4, dt);
    rig.jaw.rotation.x = smooth(rig.jaw.rotation.x, 0.15, 4, dt);
    for (let i = 0; i < 2; i++) {
      const arm = rig.arms[i];
      arm.shoulder.rotation.x = smooth(arm.shoulder.rotation.x, -0.35, 4, dt);
      arm.shoulder.rotation.z = smooth(arm.shoulder.rotation.z, i === 0 ? -0.25 : 0.25, 4, dt);
      arm.elbow.rotation.x = smooth(arm.elbow.rotation.x, -0.3, 4, dt);
    }
    return;
  }

  // Jambes : gauche normale, droite raide et courte (boiterie)
  const swing = moving ? (chase ? 0.75 : 0.5) : 0;
  for (let i = 0; i < 2; i++) {
    const limp = i === 1;
    const phase = i === 0 ? s : -s;
    const lift = Math.max(0, i === 0 ? -c : c);
    rig.legs[i].hip.rotation.x = smooth(rig.legs[i].hip.rotation.x, -phase * swing * (limp ? 0.55 : 1) + spasm * 0.3, 16, dt);
    rig.legs[i].knee.rotation.x = smooth(rig.legs[i].knee.rotation.x, lift * swing * (limp ? 0.25 : 1.3) + 0.08, 16, dt);
  }
  // Bassin : creux quand le poids passe sur la jambe raide
  const dip = moving ? Math.max(0, s) * 0.05 : 0;
  const breathe = Math.sin(t * 1.7) * 0.012;
  rig.hips.position.y = smooth(rig.hips.position.y, 0.5 - dip + Math.abs(c) * (moving ? 0.025 : 0) + breathe, 14, dt);
  rig.torso.rotation.x = smooth(rig.torso.rotation.x, 0.42 + (chase ? 0.12 : 0) + lunge * 0.4 + spasm * 0.2, 12, dt);
  rig.torso.rotation.z = smooth(rig.torso.rotation.z, (moving ? s * 0.1 : 0) - 0.06 + spasm * 0.15, 10, dt);
  rig.torso.rotation.y = smooth(rig.torso.rotation.y, moving ? c * 0.12 : Math.sin(t * 0.7) * 0.06, 8, dt);
  // Tête lourde : penchée, dodeline
  rig.head.rotation.x = smooth(rig.head.rotation.x, -0.3 + (moving ? Math.abs(s) * 0.08 : 0) - lunge * 0.25, 10, dt);
  rig.head.rotation.z = smooth(rig.head.rotation.z, 0.28 + Math.sin(a.stride * 0.5 + 0.7) * 0.1 + spasm * 0.4, 6, dt);
  rig.jaw.rotation.x = smooth(rig.jaw.rotation.x, 0.25 + Math.sin(t * 2.3) * 0.08 + lunge * 0.55 + Math.abs(spasm) * 0.5, 14, dt);
  // Bras tendus qui se balancent, plus haut en chasse, projetés en avant à l'attaque
  for (let i = 0; i < 2; i++) {
    const arm = rig.arms[i];
    const sway = Math.sin(a.stride + i * 1.9) * (moving ? 0.16 : 0.06) + Math.sin(t * 1.1 + i) * 0.04;
    const reach = chase ? -1.55 : -1.15;
    arm.shoulder.rotation.x = smooth(arm.shoulder.rotation.x, reach + sway - lunge * 0.45 + (i ? spasm : -spasm) * 0.6, 12, dt);
    arm.shoulder.rotation.y = smooth(arm.shoulder.rotation.y, (i === 0 ? 0.12 : -0.12) * (1 + lunge), 10, dt);
    arm.shoulder.rotation.z = smooth(arm.shoulder.rotation.z, i === 0 ? -0.08 : 0.12, 10, dt);
    arm.elbow.rotation.x = smooth(arm.elbow.rotation.x, -0.25 - (i === 0 ? 0.2 : 0) + lunge * 0.2, 12, dt);
  }
}

function animateCrawler(rig: ZombieRig, a: ZombieAnimation, dt: number, lunge: number, spasm: number): void {
  const t = a.time;
  const moving = a.speed > 0.08 && !a.stunned;
  rig.body.rotation.x = 0;

  if (a.dormant) {
    // Endormi : affalé à plat, bras en croix, tête posée au sol
    rig.hips.position.y = smooth(rig.hips.position.y, 0.17, 4, dt);
    rig.torso.rotation.x = smooth(rig.torso.rotation.x, 0.1, 4, dt);
    rig.head.rotation.x = smooth(rig.head.rotation.x, 0.6, 4, dt);
    rig.head.rotation.z = smooth(rig.head.rotation.z, 0.4, 4, dt);
    rig.jaw.rotation.x = smooth(rig.jaw.rotation.x, 0.1, 4, dt);
    for (let i = 0; i < 2; i++) {
      const arm = rig.arms[i];
      arm.shoulder.rotation.x = smooth(arm.shoulder.rotation.x, -1.2, 4, dt);
      arm.shoulder.rotation.z = smooth(arm.shoulder.rotation.z, i === 0 ? -0.9 : 0.9, 4, dt);
      arm.elbow.rotation.x = smooth(arm.elbow.rotation.x, -0.2, 4, dt);
    }
    return;
  }

  // Reptation bras sur bras : un bras se lance pendant que l'autre, planté, tire le torse
  const s = Math.sin(a.stride);
  const pull = moving ? Math.abs(Math.cos(a.stride)) : 0;
  rig.hips.position.y = smooth(rig.hips.position.y, 0.24 + pull * 0.05 + Math.sin(t * 2.1) * 0.01, 16, dt);
  rig.torso.rotation.x = smooth(rig.torso.rotation.x, -lunge * 0.35 + (moving ? -pull * 0.08 : 0), 14, dt);
  rig.torso.rotation.z = smooth(rig.torso.rotation.z, (moving ? s * 0.16 : 0) + spasm * 0.2, 12, dt);
  rig.torso.rotation.y = smooth(rig.torso.rotation.y, moving ? s * 0.18 : Math.sin(t * 0.9) * 0.1, 10, dt);
  rig.head.rotation.x = smooth(rig.head.rotation.x, -0.25 - lunge * 0.3 + (moving ? pull * 0.1 : 0), 12, dt);
  rig.head.rotation.z = smooth(rig.head.rotation.z, (moving ? -s * 0.12 : 0.15) + spasm * 0.5, 8, dt);
  rig.jaw.rotation.x = smooth(rig.jaw.rotation.x, 0.3 + lunge * 0.6 + Math.abs(spasm) * 0.5 + Math.sin(t * 3.1) * 0.06, 14, dt);
  for (let i = 0; i < 2; i++) {
    const arm = rig.arms[i];
    const p = a.stride + i * Math.PI;
    // sin(p) > 0 : le bras se lève et part devant ; < 0 : planté, il recule sous le corps
    const lift = moving ? Math.max(0, Math.sin(p)) : 0;
    const reach = moving ? -Math.cos(p) : 0;
    const target = -1.05 - reach * 0.45 - lift * 0.35 - lunge * 0.7 + (i ? spasm : -spasm) * 0.5;
    arm.shoulder.rotation.x = smooth(arm.shoulder.rotation.x, target, 18, dt);
    arm.shoulder.rotation.z = smooth(arm.shoulder.rotation.z, (i === 0 ? -0.35 : 0.35) * (1 - lunge * 0.5), 12, dt);
    arm.shoulder.rotation.y = smooth(arm.shoulder.rotation.y, 0, 12, dt);
    arm.elbow.rotation.x = smooth(arm.elbow.rotation.x, -0.25 - lift * 0.9 + lunge * 0.2, 18, dt);
  }
}
