// Zombies « jouets d'argile » : chibi arrondis (grosse tête, membres trapus), mêmes habits que l'opérateur
// mais délavés et rapiécés (bonnet, sweat à capuche, écharpe, cargo, bottes), peau gris-vert, yeux luisants dépareillés.
// Le marcheur est grand et voûté, bras tendus ; le rampant n'a plus de jambes et se hisse sur ses longs bras.
// Mignons-inquiétants, jamais gores : bave, langue pendante, coutures, haillons qui flottent, petit « pouf » de poussière à la mort.
import {
  AdditiveBlending, BoxGeometry, BufferGeometry, CapsuleGeometry, Color, CylinderGeometry, Group, Mesh,
  MeshBasicMaterial, MeshToonMaterial, Object3D, SphereGeometry, TorusGeometry, type Material,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { addOutline, toon } from "./toon";
import { setDustQuality } from "./footsteps";

export type ZombieKind = "walker" | "crawler";

/** Couleurs : palette chaude de la fiche personnage, désaturée et salie. */
export const ZOMBIE_COLORS = {
  skin: "#9db08a",
  skinDark: "#7f9470",
  mouth: "#3a2420",
  tooth: "#e6dcb8",
  tongue: "#b86a7c",
  drool: "#d4e8a8",
  beanie: "#6b7058",
  beanieBand: "#5a604c",
  hoodie: "#b29a5e",
  hoodieDark: "#8c7748",
  hoodieCrawler: "#7d8064",
  crawlerDark: "#62664f",
  cream: "#cdc2a4",
  scarf: "#4a4945",
  cargo: "#646b55",
  leather: "#6a4a30",
  boot: "#5a4230",
  glove: "#4f3b2c",
  hair: "#5a4838",
  rip: "#3a2f27",
  patch: "#8a6a44",
  patchBlue: "#6d7f86",
  dust: "#cfc2a2",
} as const;

/** Couleurs des yeux : ambre en patrouille, rouge en chasse, cyan sous l'ARC-3, braise éteinte endormi. */
export const EYE = { calm: "#ffa83b", chase: "#ff3418", stun: "#77ffff", sleep: "#6b4a2a" } as const;
export type EyeState = keyof typeof EYE;

/** Ressort amorti de la tête (dodelinement). */
interface Wobble {
  x: number;
  vx: number;
  z: number;
  vz: number;
  hit: number;
}

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
  /** Tête montée sur ressort, à l'intérieur de `head`. */
  bobble: Group;
  wobble: Wobble;
  /** Haillons qui flottent (pivots en ordre YXZ). */
  flaps: Group[];
  drool: Group;
  /** Étincelles cyan qui tournent autour de la tête quand il est étourdi. */
  sparks: Group;
  /** Bouffées du « pouf » final, dans `root` (restent droites). */
  puffs: Mesh[];
  dust: MeshBasicMaterial;
  /** Détails masqués en qualité réduite. */
  extras: Object3D[];
  seed: number;
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

// ——— Géométries et matériaux partagés entre tous les zombies ———

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
/** Petits détails : un seul segment d'arrondi (324 sommets au lieu de 900). */
const rounded = (w: number, h: number, d: number, r: number) => geo(`rb:${w}:${h}:${d}:${r}`, () => new RoundedBoxGeometry(w, h, d, Math.max(w, h, d) < 0.16 ? 1 : 2, r));
const torus = (r: number, tube: number) => geo(`t:${r}:${tube}`, () => new TorusGeometry(r, tube, 6, 18));
const dome = (r: number) => geo(`d:${r}`, () => new SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.56));
const cylinder = (r: number, h: number) => geo(`cy:${r}:${h}`, () => new CylinderGeometry(r, r, h, 14));
/** Lambeau de tissu suspendu par son bord haut (pivot à l'origine). */
const flapGeo = (w: number, h: number) => geo(`f:${w}:${h}`, () => new RoundedBoxGeometry(w, h, 0.026, 1, 0.011).translate(0, -h / 2, 0));
/** Goutte de bave accrochée par le haut. */
const dripGeo = (r: number, len: number) => geo(`dr:${r}:${len}`, () => new CapsuleGeometry(r, len, 3, 6).translate(0, -len / 2 - r, 0));
const puffGeo = () => geo("puff", () => new SphereGeometry(0.16, 10, 7));

/** Fusionne des petits détails statiques (coutures) en une seule géométrie partagée : un seul appel de rendu. */
function merged(key: string, build: (g: Group) => void): BufferGeometry {
  return geo(key, () => {
    const g = new Group();
    build(g);
    g.updateMatrixWorld(true);
    const parts: BufferGeometry[] = [];
    g.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const piece = (child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone()).applyMatrix4(child.matrixWorld);
      for (const name of Object.keys(piece.attributes)) if (name !== "position" && name !== "normal") piece.deleteAttribute(name);
      parts.push(piece);
    });
    return mergeGeometries(parts) ?? new BufferGeometry();
  });
}

/** Ligne de couture : un trait et des points croisés, dans le plan XY local. */
function stitchLine(g: Group, length: number, crosses: number, x: number, y: number, z: number, rz: number, rx = 0, ry = 0): void {
  const line = new Group();
  line.position.set(x, y, z);
  line.rotation.set(rx, ry, rz);
  g.add(line);
  line.add(new Mesh(new BoxGeometry(length, 0.012, 0.012)));
  for (let i = 0; i < crosses; i++) {
    const bar = new Mesh(new BoxGeometry(0.012, 0.05, 0.012));
    bar.position.x = (i / Math.max(1, crosses - 1) - 0.5) * length * 0.85;
    bar.rotation.z = 0.25;
    line.add(bar);
  }
}

let sparkMaterial: MeshBasicMaterial | null = null;
let seeds = 0;

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

/** Lambeau pendant sur pivot : `angle` autour de Y (vers l'extérieur), suspendu en (x, y, z). */
function flap(parent: Object3D, flaps: Group[], w: number, h: number, color: string, x: number, y: number, z: number, angle: number): Group {
  const pivot = new Group();
  pivot.rotation.order = "YXZ";
  pivot.position.set(x, y, z);
  pivot.rotation.y = angle;
  pivot.userData.phase = flaps.length * 1.9;
  parent.add(pivot);
  part(pivot, flapGeo(w, h), toon(color), 0, 0, 0);
  flaps.push(pivot);
  return pivot;
}

interface HeadParts {
  jaw: Group;
  bobble: Group;
  drool: Group;
  sparks: Group;
  extras: Object3D[];
}

/** Tête chibi : sphère, bonnet ou capuche, yeux luisants dépareillés, mâchoire pendante, langue et bave. */
function buildHead(head: Group, radius: number, skin: Material, hoodie: Material, eye: MeshBasicMaterial, halo: MeshBasicMaterial, crawler: boolean): HeadParts {
  const C = ZOMBIE_COLORS;
  const r = radius;
  const extras: Object3D[] = [];
  // Tout le crâne est porté par un ressort (dodelinement, à-coups, impacts)
  const bobble = new Group();
  head.add(bobble);
  const skull = part(bobble, sphere(r, 18, 14), skin, 0, r, 0);
  skull.scale.set(1.04, 0.94, 0.96);
  if (crawler) {
    // Capuche relevée, déchirée sur le côté, bord roulé autour du visage
    const hood = part(bobble, dome(r * 1.12), hoodie, 0, r * 1.02, -r * 0.2);
    hood.rotation.x = -0.6;
    const rim = part(bobble, torus(r * 0.9, r * 0.14), toon(C.crawlerDark), 0, r * 1.12, r * 0.3);
    rim.rotation.x = Math.PI / 2 - 1.05;
    detail(bobble, sphere(r * 0.22, 8, 6), C.rip, r * 0.72, r * 1.45, -r * 0.2).scale.set(0.5, 1, 1);
    // Oreille de capuche arrachée qui pend
    const ear = flap(bobble, [], r * 0.45, r * 0.5, C.crawlerDark, r * 0.8, r * 1.4, -r * 0.35, 1.9);
    ear.rotation.x = 0.5;
    // Couture sur la joue
    const seam = part(bobble, merged(`seam-cheek:${r}`, (g) => stitchLine(g, r * 0.42, 3, 0, 0, 0, 0.5)), toon(C.rip, { rim: 0 }), r * 0.5, r * 0.62, r * 0.8);
    seam.rotation.y = 0.55;
    seam.userData.noOutline = true;
    seam.castShadow = false;
    extras.push(seam);
  } else {
    // Bonnet olive délavé repoussé en arrière (front dégagé, lisible de haut), revers, écusson et trou
    const cap = part(bobble, dome(r * 1.0), toon(C.beanie), 0, r * 1.32, -r * 0.16);
    cap.rotation.x = -0.32;
    const band = part(bobble, torus(r * 0.95, r * 0.15), toon(C.beanieBand), 0, r * 1.3, -r * 0.12);
    band.rotation.x = Math.PI / 2 - 0.32;
    const badge = detail(bobble, rounded(r * 0.4, r * 0.24, r * 0.08, 0.02), C.patch, r * 0.45, r * 1.56, r * 0.92);
    badge.rotation.set(-0.32, 0.45, 0);
    detail(bobble, sphere(r * 0.14, 8, 6), C.rip, -r * 0.3, r * 2.12, -r * 0.35).scale.set(1, 0.4, 1);
    // Mèches qui dépassent sur les côtés et la nuque
    for (const [x, y, z] of [[-0.92, 1.05, -0.2], [0.94, 1.0, -0.25], [-0.5, 0.95, -0.85], [0.4, 0.9, -0.9], [-0.25, 1.62, 0.78]] as const) {
      part(bobble, sphere(r * 0.24, 8, 6), toon(C.hair), x * r, y * r, z * r).scale.set(0.8, 1.2, 0.8);
    }
    // Grande couture sur le front
    const seam = part(bobble, merged(`seam-brow:${r}`, (g) => stitchLine(g, r * 0.55, 4, 0, 0, 0, -0.35)), toon(C.rip, { rim: 0 }), r * 0.18, r * 1.38, r * 0.9);
    seam.rotation.set(-0.55, 0.1, 0);
    seam.userData.noOutline = true;
    seam.castShadow = false;
    extras.push(seam);
  }
  // Yeux : un grand œil luisant à pupille fendue et un petit (asymétrie inquiétante), halo additif lisible de haut
  const eyes: [number, number, boolean][] = crawler ? [[-0.37, 0.088, true], [0.38, 0.06, false]] : [[-0.36, 0.105, true], [0.37, 0.068, false]];
  for (const [x, size, big] of eyes) {
    const ey = r * (crawler ? 0.98 : 0.95) + (big ? 0 : -r * 0.04);
    const ez = r * 0.9;
    const ball = new Mesh(sphere(size * r * 3.3, 10, 8), eye);
    ball.position.set(x * r, ey, ez);
    ball.scale.z = 0.6;
    ball.userData.noOutline = true;
    bobble.add(ball);
    if (big) {
      const pupil = detail(bobble, sphere(size * r * 1.1, 8, 6), C.mouth, x * r, ey, ez + size * r * 1.8);
      pupil.scale.set(0.45, 1.25, 0.4);
    }
    const glowShell = new Mesh(sphere(size * r * 5.2, 10, 8), halo);
    glowShell.position.copy(ball.position);
    glowShell.userData.noOutline = true;
    glowShell.renderOrder = 2;
    bobble.add(glowShell);
  }
  // Cernes et joues creuses
  detail(bobble, sphere(r * 0.16, 8, 6), C.skinDark, r * 0.55, r * 0.72, r * 0.72).scale.set(1, 0.6, 0.5);
  detail(bobble, sphere(r * 0.13, 8, 6), C.skinDark, -r * 0.6, r * 0.66, r * 0.7).scale.set(1, 0.5, 0.5);
  // Mâchoire décrochée, langue qui pend, filet de bave
  const jaw = new Group();
  jaw.position.set(0, r * 0.55, r * 0.45);
  bobble.add(jaw);
  part(jaw, sphere(r * 0.3, 10, 8), toon(C.mouth, { rim: 0 }), 0, -r * 0.02, r * 0.32).scale.set(1.1, 0.7, 0.5);
  const chin = part(jaw, rounded(r * 0.78, r * 0.24, r * 0.6, 0.05), skin, 0, -r * 0.2, r * 0.24);
  chin.rotation.x = 0.1;
  for (const x of [-0.14, 0.12]) detail(jaw, rounded(r * 0.1, r * 0.12, r * 0.06, 0.01), C.tooth, x * r, -r * 0.08, r * 0.54);
  const tongue = part(jaw, capsule(r * 0.075, r * 0.16), toon(C.tongue), r * 0.12, -r * 0.14, r * 0.58);
  tongue.rotation.set(1.25, 0, -0.3);
  tongue.scale.set(1.2, 1, 0.6);
  tongue.castShadow = false;
  const drool = new Group();
  drool.position.set(-r * 0.24, -r * 0.2, r * 0.56);
  jaw.add(drool);
  const drip = part(drool, dripGeo(r * 0.035, r * 0.18), toon(C.drool, { rim: 0.5 }), 0, 0, 0);
  drip.castShadow = false;
  drip.userData.noOutline = true;
  extras.push(drool);

  // Étincelles d'étourdissement : trois petites lueurs en orbite au-dessus de la tête
  sparkMaterial ??= new MeshBasicMaterial({ color: EYE.stun, transparent: true, opacity: 0.9, depthWrite: false, blending: AdditiveBlending });
  const sparks = new Group();
  sparks.position.y = r * 2.25;
  sparks.visible = false;
  head.add(sparks);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const spark = new Mesh(sphere(0.045, 6, 4), sparkMaterial);
    spark.position.set(Math.cos(a) * r * 0.85, Math.sin(a * 2) * 0.04, Math.sin(a) * r * 0.85);
    spark.scale.set(1, 1.6, 1);
    spark.userData.noOutline = true;
    sparks.add(spark);
  }
  return { jaw, bobble, drool, sparks, extras };
}

function eyeMaterials(): [MeshBasicMaterial, MeshBasicMaterial] {
  const eye = new MeshBasicMaterial({ color: EYE.calm });
  const halo = new MeshBasicMaterial({ color: EYE.calm, transparent: true, opacity: 0.32, depthWrite: false, blending: AdditiveBlending });
  return [eye, halo];
}

/** Bouffées du « pouf » final : géométrie partagée, un matériau par zombie (fondu). */
function buildPuffs(root: Group): { puffs: Mesh[]; dust: MeshBasicMaterial } {
  const dust = new MeshBasicMaterial({ color: ZOMBIE_COLORS.dust, transparent: true, opacity: 0, depthWrite: false });
  const puffs: Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const puff = new Mesh(puffGeo(), dust);
    puff.visible = false;
    puff.userData.noOutline = true;
    puff.raycast = () => {};
    root.add(puff);
    puffs.push(puff);
  }
  return { puffs, dust };
}

type Shell = Omit<ZombieRig, "outlines" | "casters" | "puffs" | "dust" | "seed" | "wobble">;

function finish(shell: Shell): ZombieRig {
  const { puffs, dust } = buildPuffs(shell.root);
  const rig: ZombieRig = { ...shell, outlines: [], casters: [], puffs, dust, seed: (seeds++ * 0.618) % 1, wobble: { x: 0, vx: 0, z: 0, vz: 0, hit: 0 } };
  addOutline(rig.root, 0.022);
  rig.root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    if (child.userData.isOutline) rig.outlines.push(child);
    else if (child.castShadow) rig.casters.push(child);
  });
  return rig;
}

/** Pièce rapiécée cousue : carré de tissu et quatre points de couture. */
function stitchedPatch(parent: Object3D, key: string, w: number, h: number, color: string, x: number, y: number, z: number, ry: number, rx = 0): Object3D[] {
  const patch = detail(parent, rounded(w, h, 0.03, 0.01), color, x, y, z);
  patch.rotation.set(rx, ry, 0);
  const seams = part(parent, merged(`patch:${key}:${w}:${h}`, (g) => {
    stitchLine(g, w * 0.9, 3, 0, h / 2, 0.018, 0);
    stitchLine(g, w * 0.9, 3, 0, -h / 2, 0.018, 0);
    stitchLine(g, h * 0.8, 2, -w / 2, 0, 0.018, Math.PI / 2);
  }), toon(ZOMBIE_COLORS.rip, { rim: 0 }), x, y, z);
  seams.rotation.set(rx, ry, 0);
  seams.castShadow = false;
  seams.userData.noOutline = true;
  return [seams];
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
  const flaps: Group[] = [];
  const extras: Object3D[] = [];

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
      // Jambe de pantalon effilochée
      flap(knee, flaps, 0.08, 0.09, C.cargo, 0.05, -0.1, 0.06, 0.6);
      limb(knee, 0.22, 0.07, skin);
      part(knee, rounded(0.15, 0.08, 0.22, 0.04), skin, 0, -0.23, 0.05);
    }
    legs.push({ hip, knee });
  }

  // Tronc : sweat à capuche moutarde délavé, écharpe charbon, sangle de cuir, pièces cousues et accrocs
  const torso = new Group();
  torso.position.y = 0.04;
  hips.add(torso);
  const chest = part(torso, capsule(0.25, 0.2), hoodie, 0, 0.25, 0);
  chest.scale.set(1.05, 1, 0.86);
  const hem = part(torso, torus(0.235, 0.05), toon(C.cream), 0, 0.06, 0);
  hem.rotation.x = Math.PI / 2;
  hem.scale.y = 0.86;
  // Bas du sweat déchiré : lambeaux qui ballottent
  for (const [angle, w, h] of [[2.5, 0.11, 0.17], [-2.7, 0.09, 0.13], [0.75, 0.1, 0.14], [-1.4, 0.08, 0.1]] as const) {
    flap(torso, flaps, w, h, C.hoodieDark, Math.sin(angle) * 0.225, 0.07, Math.cos(angle) * 0.2, angle);
  }
  const strap = part(torso, torus(0.26, 0.025), toon(C.leather), 0, 0.28, 0);
  strap.rotation.set(Math.PI / 2, 0.75, 0);
  strap.scale.set(1, 0.86, 1);
  part(torso, rounded(0.16, 0.14, 0.08, 0.03), toon(C.leather), 0.2, 0.12, -0.12).rotation.y = 0.9;
  extras.push(...stitchedPatch(torso, "chest", 0.12, 0.11, C.patch, -0.11, 0.3, 0.212, 0, -0.05));
  extras.push(...stitchedPatch(torso, "back", 0.13, 0.12, C.patchBlue, 0.08, 0.3, -0.21, Math.PI, 0.1));
  detail(torso, sphere(0.06, 8, 6), C.rip, 0.1, 0.18, 0.2).scale.set(1.3, 0.8, 0.5);
  detail(torso, sphere(0.05, 8, 6), C.rip, -0.17, 0.12, -0.18).scale.set(1, 1.4, 0.5);
  // Capuche rabattue dans le dos
  const hood = part(torso, sphere(0.17, 12, 8), hoodie, 0, 0.45, -0.18);
  hood.scale.set(1.3, 0.7, 0.8);
  const scarf = part(torso, torus(0.17, 0.065), toon(C.scarf), 0, 0.48, 0.02);
  scarf.rotation.x = Math.PI / 2 - 0.2;
  // Pan d'écharpe qui pend et se balance
  const scarfTail = flap(torso, flaps, 0.09, 0.26, C.scarf, 0.12, 0.44, 0.17, 0.35);
  scarfTail.rotation.z = 0.2;

  // Tête énorme, relevée vers la caméra (visage lisible de haut)
  const head = new Group();
  head.position.set(0, 0.5, 0.06);
  torso.add(head);
  const parts = buildHead(head, 0.31, skin, hoodie, eye, halo, false);
  extras.push(...parts.extras);

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
    if (side > 0) flap(shoulder, flaps, 0.07, 0.1, C.hoodieDark, 0.05, -0.2, -0.03, 1.8);
    const elbow = new Group();
    elbow.position.y = -0.22;
    shoulder.add(elbow);
    limb(elbow, 0.22, 0.068, skin);
    const hand = part(elbow, sphere(0.085, 10, 8), side < 0 ? toon(C.glove) : skin, 0, -0.23, 0.01);
    hand.scale.set(1, 1.1, 0.8);
    for (const f of [-1, 0, 1]) part(elbow, capsule(0.024, 0.07), side < 0 ? toon(C.glove) : skin, f * 0.04, -0.31, 0.02);
    arms.push({ shoulder, elbow });
  }

  return finish({
    kind: "walker", root, body, hips, torso, head, jaw: parts.jaw, legs, arms, eye, halo, tint: [skin, hoodie], scale,
    bobble: parts.bobble, flaps, drool: parts.drool, sparks: parts.sparks, extras,
  });
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
  const flaps: Group[] = [];
  const extras: Object3D[] = [];

  const hips = new Group();
  hips.position.y = 0.24;
  body.add(hips);
  const torso = new Group();
  hips.add(torso);
  const trunk = part(torso, capsule(0.2, 0.26), hoodie, 0, 0, -0.04);
  trunk.rotation.x = Math.PI / 2 - 0.25;
  trunk.scale.set(1.12, 1, 0.9);
  // Moignon en haillons qui traîne derrière et fouette à chaque traction
  for (const [x, len, angle] of [[-0.11, 0.22, Math.PI + 0.35], [0.0, 0.3, Math.PI], [0.12, 0.2, Math.PI - 0.4]] as const) {
    const rag = flap(torso, flaps, 0.1, len, C.hoodieDark, x, -0.05, -0.27, angle);
    rag.rotation.x = 1.2;
  }
  extras.push(...stitchedPatch(torso, "crawler", 0.13, 0.12, C.patch, 0.08, 0.2, -0.1, 0, -1.3));
  detail(torso, sphere(0.06, 8, 6), C.rip, -0.12, 0.14, 0.05).scale.set(1.2, 0.5, 1);
  const belt = part(torso, cylinder(0.2, 0.05), toon(C.leather), 0, -0.02, -0.2);
  belt.rotation.x = Math.PI / 2 - 0.25;
  belt.scale.set(1.12, 1, 0.9);
  const scarf = part(torso, torus(0.13, 0.055), toon(C.scarf), 0, 0.1, 0.17);
  scarf.rotation.x = 0.5;
  const scarfTail = flap(torso, flaps, 0.08, 0.3, C.scarf, -0.08, 0.15, 0.02, Math.PI - 0.3);
  scarfTail.rotation.x = 1.3;

  // Grosse tête relevée vers l'avant
  const head = new Group();
  head.position.set(0, 0.08, 0.24);
  torso.add(head);
  const parts = buildHead(head, 0.23, skin, hoodie, eye, halo, true);
  extras.push(...parts.extras);

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

  return finish({
    kind: "crawler", root, body, hips, torso, head, jaw: parts.jaw, legs: [], arms, eye, halo, tint: [skin, hoodie], scale: 1,
    bobble: parts.bobble, flaps, drool: parts.drool, sparks: parts.sparks, extras,
  });
}

export function buildZombie(kind: ZombieKind): ZombieRig {
  return kind === "walker" ? buildWalker() : buildCrawler();
}

/** Qualité réduite : pas de coque de contour, d'ombre portée ni de petits détails (ni poussière de pas). */
export function setZombieQuality(rig: ZombieRig, low: boolean): void {
  for (const hull of rig.outlines) hull.visible = !low;
  for (const mesh of rig.casters) mesh.castShadow = !low;
  for (const extra of rig.extras) extra.visible = !low;
  setDustQuality(low);
}

function smooth(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.exp(-rate * dt);
}

/** Petite bosse 0 → 1 → 0 quand `phase` (0..1) traverse [start, start + width]. */
function bump(phase: number, start: number, width: number): number {
  const u = (phase - start) / width;
  return u > 0 && u < 1 ? Math.sin(u * Math.PI) : 0;
}

const STUN_TINT = new Color("#3fe8ff");
const HIT_TINT = new Color("#fff6e4");

/** Pose et teinte du zombie pour cette image. */
export function animateZombie(rig: ZombieRig, a: ZombieAnimation, dt: number): void {
  const t = a.time;
  const h = Math.min(dt, 0.05);
  const hit = Math.max(0, Math.min(1, a.hit / 0.18));
  // Yeux : la lueur s'éteint doucement après la mort
  const dying = a.dead >= 0;
  const eyeColor = a.stunned ? EYE.stun : a.dormant || dying ? EYE.sleep : EYE[a.eye];
  rig.eye.color.set(eyeColor);
  rig.halo.color.set(eyeColor);
  rig.halo.opacity = dying || a.dormant ? 0 : a.eye === "chase" ? 0.3 + 0.1 * Math.sin(t * 9) : a.stunned ? 0.36 : 0.24;

  // Teinte : flash blanc à l'impact, crépitement cyan de l'ARC-3
  let tint = 0;
  let tintColor = HIT_TINT;
  if (hit > 0) tint = hit * 0.9;
  if (a.stunned && hit <= 0.3) {
    tintColor = STUN_TINT;
    tint = Math.max(tint, 0.25 + 0.35 * Math.max(0, Math.sin(t * 47) * Math.sin(t * 31)));
  }
  for (const m of rig.tint) {
    m.emissive.copy(tintColor);
    m.emissiveIntensity = tint;
  }

  // Étincelles d'étourdissement
  rig.sparks.visible = a.stunned && !dying;
  if (rig.sparks.visible) {
    rig.sparks.rotation.y = t * 6;
    rig.sparks.position.x = Math.sin(t * 3.1) * 0.03;
  }

  // Bave : la goutte s'étire, tombe, repousse
  const drip = (t * 0.45 + rig.seed) % 1;
  rig.drool.visible = !dying && !a.dormant;
  rig.drool.scale.set(1, 0.25 + drip * 1.3, 1);
  rig.drool.rotation.x = -rig.jaw.rotation.x * 0.8;

  if (dying) {
    die(rig, a, h);
    return;
  }
  rig.root.position.y = 0;
  rig.body.rotation.z = 0;
  for (const puff of rig.puffs) puff.visible = false;

  // Tremblement électrique
  const jitterX = a.stunned ? (Math.sin(t * 93) + Math.sin(t * 57)) * 0.025 : 0;
  const jitterZ = a.stunned ? Math.sin(t * 71) * 0.025 : 0;
  const spasm = a.stunned ? Math.sin(t * 63) * 0.35 : 0;
  const lunge = a.attack > 0 ? Math.sin((1 - a.attack) * Math.PI) : 0;

  if (rig.kind === "walker") animateWalker(rig, a, h, lunge, spasm);
  else animateCrawler(rig, a, h, lunge, spasm);

  // Impact : secousse en arrière, petit écrasement
  const jolt = hit * hit;
  rig.body.position.x = jitterX;
  rig.body.position.z = smooth(rig.body.position.z, lunge * (rig.kind === "walker" ? 0.28 : 0.4), 30, h) + jitterZ - jolt * 0.1;
  rig.body.rotation.x += -jolt * 0.3;
  rig.body.scale.set(rig.scale * (1 + jolt * 0.08), rig.scale * (1 - jolt * 0.1), rig.scale * (1 + jolt * 0.08));

  animateHead(rig, a, h, hit);
  animateFlaps(rig, a, h, lunge);
}

/** Ressort de la tête : dodelinement de marche, à-coups nerveux au repos, claque à l'impact, roulis étourdi. */
function animateHead(rig: ZombieRig, a: ZombieAnimation, h: number, hit: number): void {
  const w = rig.wobble;
  const t = a.time;
  const moving = a.speed > 0.08 && !a.stunned;
  // Impulsion au début d'un coup
  if (hit > 0.9 && w.hit <= 0.9) {
    w.vx -= 9;
    w.vz += (rig.seed > 0.5 ? 1 : -1) * 7;
  }
  w.hit = hit;
  // Petits tics : une secousse brève toutes les quelques secondes
  const phase = (t * 0.31 + rig.seed * 7.3) % 1;
  const twitch = a.dormant ? 0 : bump(phase, 0.2, 0.05) * (rig.seed > 0.5 ? 1 : -1);
  const stun = a.stunned ? 1 : 0;
  const tx = (moving ? Math.sin(a.stride * 2) * 0.08 : Math.sin(t * 1.3 + rig.seed * 6) * 0.03) + stun * Math.sin(t * 4.2) * 0.25;
  const tz = (moving ? Math.sin(a.stride) * 0.12 : 0) + twitch * 0.45 + stun * Math.cos(t * 4.2) * 0.3;
  w.vx += (tx - w.x) * 160 * h;
  w.vz += (tz - w.z) * 160 * h;
  w.vx *= Math.exp(-7 * h);
  w.vz *= Math.exp(-6 * h);
  w.x += w.vx * h;
  w.z += w.vz * h;
  rig.bobble.rotation.x = w.x;
  rig.bobble.rotation.z = w.z;
  rig.bobble.rotation.y = twitch * 0.25;
}

/** Haillons : pendent, ballottent avec la foulée et se soulèvent à la fente. */
function animateFlaps(rig: ZombieRig, a: ZombieAnimation, h: number, lunge: number): void {
  const moving = a.speed > 0.08 && !a.stunned;
  const crawler = rig.kind === "crawler";
  for (const pivot of rig.flaps) {
    const p = pivot.userData.phase as number;
    const sway = Math.sin(a.stride * (crawler ? 1 : 2) + p) * (moving ? 0.35 : 0.08) + Math.sin(a.time * 1.7 + p) * 0.06;
    const base = crawler ? 1.15 + (moving ? 0.25 : 0) : 0.12 + (moving ? 0.18 : 0);
    pivot.rotation.x = smooth(pivot.rotation.x, base + sway + lunge * 0.4 + (a.stunned ? Math.sin(a.time * 40 + p) * 0.2 : 0), 14, h);
    pivot.rotation.z = smooth(pivot.rotation.z, Math.sin(a.stride + p * 1.3) * (moving ? 0.2 : 0.04), 10, h);
  }
}

/** Mort : bascule, rebond, quelques soubresauts, puis « pouf » en petit nuage de poussière (avant 2 s). */
function die(rig: ZombieRig, a: ZombieAnimation, h: number): void {
  const d = a.dead;
  const fall = Math.min(1, d / 0.38);
  // Chute avec petit rebond à l'arrivée
  const ease = 1 - (1 - fall) * (1 - fall);
  const bounce = d > 0.38 && d < 0.62 ? Math.sin(((d - 0.38) / 0.24) * Math.PI) * 0.12 : 0;
  const twitch = d > 0.6 && d < 1.05 ? Math.sin(d * 38) * 0.06 * (1.05 - d) * 2 : 0;
  if (rig.kind === "walker") {
    rig.body.rotation.x = -1.45 * ease + bounce;
    rig.body.position.y = 0.12 * ease;
    rig.jaw.rotation.x = 0.6;
    rig.head.rotation.z = smooth(rig.head.rotation.z, 0.5, 8, h);
    for (const arm of rig.arms) arm.shoulder.rotation.x = smooth(arm.shoulder.rotation.x, -2.6, 6, h);
  } else {
    rig.body.rotation.z = 1.4 * ease - bounce;
    rig.body.position.y = 0.1 * ease;
    rig.jaw.rotation.x = 0.5;
  }
  rig.bobble.rotation.x = twitch;
  rig.bobble.rotation.z = twitch * 0.5;
  rig.body.position.z = 0;
  rig.root.position.y = 0;
  // Dissolution : le corps s'aplatit puis disparaît dans la poussière
  const melt = Math.min(1, Math.max(0, (d - 1.05) / 0.3));
  const k = 1 - melt * melt;
  rig.body.scale.set(rig.scale * (1 + melt * 0.25) * k, rig.scale * k * (1 - melt * 0.4), rig.scale * (1 + melt * 0.25) * k);
  rig.body.visible = melt < 1;
  const poof = (d - 1.0) / 0.95;
  const active = poof > 0 && poof < 1;
  rig.dust.opacity = active ? 0.7 * (1 - poof) * Math.min(1, poof * 6) : 0;
  // Le nuage se forme là où le corps est tombé (devant le pivot pour le marcheur)
  const cx = rig.kind === "walker" ? 0 : -0.3;
  const cz = rig.kind === "walker" ? -0.75 : 0;
  for (let i = 0; i < rig.puffs.length; i++) {
    const puff = rig.puffs[i];
    puff.visible = active;
    if (!active) continue;
    const ang = (i / rig.puffs.length) * Math.PI * 2 + rig.seed * 3;
    const spread = 0.15 + poof * 0.55;
    const along = rig.kind === "walker" ? (i % 3 - 1) * 0.45 : 0;
    puff.position.set(cx + Math.cos(ang) * spread, 0.12 + poof * (0.3 + (i % 2) * 0.25), cz + along + Math.sin(ang) * spread * 0.7);
    const s = (0.7 + (i % 3) * 0.25) * (0.6 + Math.sqrt(poof) * 1.1);
    puff.scale.set(s, s * 0.8, s);
  }
}

function animateWalker(rig: ZombieRig, a: ZombieAnimation, dt: number, lunge: number, spasm: number): void {
  const t = a.time;
  const moving = a.speed > 0.08 && !a.stunned;
  const chase = a.eye === "chase";
  const s = Math.sin(a.stride);
  const c = Math.cos(a.stride);
  rig.body.visible = true;

  if (a.dormant) {
    // Endormi : assis, affalé, la tête sur la poitrine
    rig.body.rotation.x = smooth(rig.body.rotation.x, 0, 10, dt);
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

  // Étourdi : il titube, genoux qui flanchent, bras ballants
  const stun = a.stunned ? 1 : 0;
  const stagger = stun * Math.sin(t * 3.3);
  rig.body.rotation.x = smooth(rig.body.rotation.x, stun * Math.sin(t * 2.1) * 0.12, 10, dt);
  rig.body.rotation.z = stagger * 0.16;

  // Jambes : gauche normale, droite raide et courte (boiterie)
  const swing = moving ? (chase ? 0.75 : 0.5) : 0;
  for (let i = 0; i < 2; i++) {
    const limp = i === 1;
    const phase = i === 0 ? s : -s;
    const lift = Math.max(0, i === 0 ? -c : c);
    const buckle = stun * (0.35 + 0.25 * Math.sin(t * 3.3 + i * 2));
    rig.legs[i].hip.rotation.x = smooth(rig.legs[i].hip.rotation.x, -phase * swing * (limp ? 0.55 : 1) + spasm * 0.3 - buckle * 0.5, 16, dt);
    rig.legs[i].knee.rotation.x = smooth(rig.legs[i].knee.rotation.x, lift * swing * (limp ? 0.25 : 1.3) + 0.08 + buckle, 16, dt);
  }
  // Bassin : creux quand le poids passe sur la jambe raide
  const dip = moving ? Math.max(0, s) * 0.05 : 0;
  const breathe = Math.sin(t * 1.7) * 0.012;
  rig.hips.position.y = smooth(rig.hips.position.y, 0.5 - dip + Math.abs(c) * (moving ? 0.025 : 0) + breathe - stun * 0.07, 14, dt);
  rig.torso.rotation.x = smooth(rig.torso.rotation.x, 0.42 + (chase ? 0.12 : 0) + lunge * 0.4 + spasm * 0.2 + stun * 0.15, 12, dt);
  rig.torso.rotation.z = smooth(rig.torso.rotation.z, (moving ? s * 0.1 : 0) - 0.06 + spasm * 0.15 + stagger * 0.12, 10, dt);
  rig.torso.rotation.y = smooth(rig.torso.rotation.y, moving ? c * 0.12 : Math.sin(t * 0.7) * 0.06, 8, dt);
  // Tête lourde mais relevée vers sa proie (visage vers la caméra), dodeline
  rig.head.rotation.x = smooth(rig.head.rotation.x, -0.78 - (chase ? 0.1 : 0) + (moving ? Math.abs(s) * 0.08 : 0) - lunge * 0.2 + stun * 0.3, 10, dt);
  rig.head.rotation.z = smooth(rig.head.rotation.z, 0.24 + Math.sin(a.stride * 0.5 + 0.7) * 0.1 + spasm * 0.4, 6, dt);
  rig.jaw.rotation.x = smooth(rig.jaw.rotation.x, 0.25 + Math.sin(t * 2.3) * 0.08 + lunge * 0.55 + Math.abs(spasm) * 0.5 + (chase ? 0.12 : 0), 14, dt);
  // Bras tendus qui se balancent, plus haut en chasse, projetés en avant à l'attaque ; ballants si étourdi
  for (let i = 0; i < 2; i++) {
    const arm = rig.arms[i];
    const sway = Math.sin(a.stride + i * 1.9) * (moving ? 0.16 : 0.06) + Math.sin(t * 1.1 + i) * 0.04;
    const grab = chase ? Math.sin(t * 7 + i * 2) * 0.12 : 0;
    const reach = (chase ? -1.55 : -1.15) * (1 - stun) - stun * (0.25 + Math.sin(t * 3.3 + i * 2.4) * 0.3);
    arm.shoulder.rotation.x = smooth(arm.shoulder.rotation.x, reach + sway + grab - lunge * 0.45 + (i ? spasm : -spasm) * 0.6, 12, dt);
    arm.shoulder.rotation.y = smooth(arm.shoulder.rotation.y, (i === 0 ? 0.12 : -0.12) * (1 + lunge), 10, dt);
    arm.shoulder.rotation.z = smooth(arm.shoulder.rotation.z, (i === 0 ? -0.08 : 0.12) + stun * (i === 0 ? -0.3 : 0.3), 10, dt);
    arm.elbow.rotation.x = smooth(arm.elbow.rotation.x, -0.25 - (i === 0 ? 0.2 : 0) + lunge * 0.2 - grab, 12, dt);
  }
}

function animateCrawler(rig: ZombieRig, a: ZombieAnimation, dt: number, lunge: number, spasm: number): void {
  const t = a.time;
  const moving = a.speed > 0.08 && !a.stunned;
  rig.body.rotation.x = 0;
  rig.body.visible = true;

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

  // Reptation bras sur bras. Cycle de chaque bras (u ∈ [0, 1[) : 0 → 0.42 il se lève et se lance devant,
  // 0.42 → 1 il est planté et ramène le corps. L'autre bras est décalé d'un demi-cycle.
  const stun = a.stunned ? 1 : 0;
  let pull = 0;
  let roll = 0;
  for (let i = 0; i < 2; i++) {
    const arm = rig.arms[i];
    const u = (((a.stride / (Math.PI * 2) + i * 0.5) % 1) + 1) % 1;
    let x: number;
    let lift = 0;
    if (u < 0.42) {
      const k = u / 0.42;
      const e = k * k * (3 - 2 * k);
      x = -0.55 - e * 1.05;
      lift = Math.sin(k * Math.PI);
    } else {
      const k = (u - 0.42) / 0.58;
      x = -1.6 + k * 1.05;
      pull += Math.sin(k * Math.PI) * 0.5;
      roll += (i === 0 ? -1 : 1) * Math.sin(k * Math.PI);
    }
    if (!moving) {
      x = -1.05 + Math.sin(t * 1.4 + i * 2) * 0.06;
      lift = 0;
    }
    const target = x - lift * 0.25 - lunge * 0.7 + (i ? spasm : -spasm) * 0.5 - stun * 0.2;
    const flail = stun * Math.sin(t * 5 + i * 2.5) * 0.35;
    arm.shoulder.rotation.x = smooth(arm.shoulder.rotation.x, target + flail, moving ? 28 : 14, dt);
    arm.shoulder.rotation.z = smooth(arm.shoulder.rotation.z, (i === 0 ? -0.35 : 0.35) * (1 - lunge * 0.5) + (i === 0 ? -1 : 1) * lift * 0.2, 16, dt);
    arm.shoulder.rotation.y = smooth(arm.shoulder.rotation.y, 0, 12, dt);
    arm.elbow.rotation.x = smooth(arm.elbow.rotation.x, -0.2 - lift * 1.0 + lunge * 0.2, moving ? 28 : 14, dt);
  }
  // Le corps avance par à-coups et roule vers le bras planté
  rig.hips.position.y = smooth(rig.hips.position.y, 0.24 + pull * 0.06 + Math.sin(t * 2.1) * 0.01 - stun * 0.04, 16, dt);
  rig.torso.rotation.x = smooth(rig.torso.rotation.x, -lunge * 0.35 - pull * 0.1 + stun * 0.15, 14, dt);
  rig.torso.rotation.z = smooth(rig.torso.rotation.z, roll * 0.12 + spasm * 0.2 + stun * Math.sin(t * 3.3) * 0.2, 12, dt);
  rig.torso.rotation.y = smooth(rig.torso.rotation.y, moving ? -roll * 0.14 : Math.sin(t * 0.9) * 0.1, 10, dt);
  // Tête relevée vers sa proie, compense le roulis
  rig.head.rotation.x = smooth(rig.head.rotation.x, -0.55 - lunge * 0.3 + pull * 0.12 + stun * 0.35, 12, dt);
  rig.head.rotation.z = smooth(rig.head.rotation.z, -roll * 0.1 + (moving ? 0 : 0.15) + spasm * 0.5, 8, dt);
  rig.jaw.rotation.x = smooth(rig.jaw.rotation.x, 0.3 + lunge * 0.6 + Math.abs(spasm) * 0.5 + Math.sin(t * 3.1) * 0.06, 14, dt);
}
