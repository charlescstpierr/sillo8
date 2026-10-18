// operator = Lou, le héros ; sans lien avec l'opératrice de nuit de l'histoire.
// L'opérateur : petit explorateur chibi en « pâte à modeler » — bonnet olive, veste moutarde à capuche,
// écharpe, sacoche en cuir en bandoulière, pantalon cargo et grosses bottes fourrées.
// Outils de bricoleur : clé à molette (corps à corps), lance-clous à batterie, lampe frontale qui éblouit.
// Animations procédurales : marche, course, accroupi, coup de clé, tir et rechargement du lance-clous, éblouir.
import {
  BoxGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, DataTexture, DoubleSide, Group, LinearFilter,
  LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, Object3D, RGBAFormat, RepeatWrapping, RingGeometry, SphereGeometry,
  SpotLight, TorusGeometry, Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { addOutline, glow, toon } from "./toon";
import { PALETTE } from "./palette";
import { dustEnabled, puffDust, updateDust } from "./footsteps";
import type { Pose } from "../player";

const THIGH = 0.22;
const SHIN = 0.22;
const HIP_HEIGHT = 0.5;
const UPPER_ARM = 0.17;
const FOREARM = 0.19;
/** Position de repos de la bande de clous sous la buse. */
const MAG_Y = -0.2;
const MAG_Z = -0.005;
const LAMP_INTENSITY = 26;
const LAMP_ANGLE = 0.52;

/** Couleurs propres au personnage (planche de référence). */
const LOOK = {
  beanie: "#5a6343",
  beanieCuff: "#636c4a",
  patch: "#d2ac72",
  hair: "#7a4a2a",
  hairLight: "#8f5c36",
  hairDark: "#5c361e",
  skin: "#f3c8a4",
  skinDark: "#e8b08c",
  blush: "#e9aa92",
  eye: "#2a1d16",
  mouth: "#5a3426",
  scarf: "#3b3d40",
  scarfLight: "#55585c",
  jacket: "#d8a43a",
  jacketDark: "#c38e2c",
  knit: "#e9dcc0",
  shirt: "#efe4cb",
  leather: "#7a4a2c",
  leatherDark: "#5f3820",
  brass: "#c9a24a",
  glove: "#4b3123",
  pants: "#556045",
  pantsDark: "#4a5440",
  boot: "#6a4528",
  sole: "#3b2a1e",
  wrench: "#b9c4c6",
  wrenchDark: "#7f8c90",
  tape: "#e6b23c",
  tool: "#7b8a3c",
  toolDark: "#5c6a2e",
  toolTrim: "#f2b632",
  nail: "#d9cfae",
} as const;

export interface OperatorRig {
  root: Group;
  body: Group;
  head: Group;
  hips: Group;
  torso: Group;
  legs: { hip: Group; knee: Group }[];
  arms: { shoulder: Group; elbow: Group }[];
  /** Lance-clous dans la main droite : −Y local = buse, embout en (0, −0.36, 0.02). */
  gun: Group;
  /** Bande de clous du lance-clous. */
  magazine: Mesh;
  /** Clé à molette dans la main droite (arme 0) ; +Z local = vers la tête de la clé. */
  wrench: Group;
  /** Clé rangée à la ceinture quand le lance-clous est en main. */
  holster: Group;
  /** Traînée du coup de clé. */
  trail: Mesh;
  /** Lampe torche : clipsée sur la bandoulière, ou brandie dans la main gauche avec son faisceau. */
  torchClip: Group;
  torch: Group;
  torchLens: Mesh;
  beam: Mesh;
  headlamp: SpotLight;
  lens: Mesh;
  /** Bande vide éjectée pendant le rechargement. */
  droppedMag: Mesh;
  dropped: { active: boolean; y: number; vy: number };
  /** Mouvements secondaires : queue de cheval, sacoche, pans d'écharpe, yeux (clignement). */
  ponytail: Group;
  satchel: Group;
  scarfTails: Group[];
  eyes: Group[];
  motion: OperatorMotion;
}

/** Ressort amorti à un axe (balancements). */
interface Spring {
  x: number;
  v: number;
}

/** État persistant des mouvements secondaires (aucune allocation par image). */
export interface OperatorMotion {
  time: number;
  idle: number;
  look: number;
  lookTimer: number;
  blink: number;
  yaw: number;
  turn: number;
  stepSign: number;
  steps: number;
  tail: Spring;
  tailSide: Spring;
  bag: Spring;
  bagSide: Spring;
}

type Geo = ConstructorParameters<typeof Mesh>[0];

function part(geometry: Geo, color: string, x = 0, y = 0, z = 0): Mesh {
  const mesh = new Mesh(geometry, toon(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Détail plat sans contour (yeux, joues, bouche, reflets). */
function decal(geometry: Geo, color: string, x: number, y: number, z: number, lit = false): Mesh {
  const mesh = new Mesh(geometry, lit ? toon(color, { rim: 0 }) : glow(color));
  mesh.position.set(x, y, z);
  mesh.userData.noOutline = true;
  return mesh;
}

function limb(parent: Object3D, length: number, radius: number, color: string): Mesh {
  const mesh = part(new CapsuleGeometry(radius, length - radius * 2, 4, 12), color, 0, -length / 2, 0);
  parent.add(mesh);
  return mesh;
}

let ribs: DataTexture | null = null;

/** Côtes de tricot : bandes verticales douces (DataTexture, sans canvas : fonctionne aussi hors navigateur). */
function knit(repeat: number): DataTexture {
  if (!ribs) {
    const w = 8;
    const data = new Uint8Array(w * 4);
    for (let i = 0; i < w; i++) {
      const v = 255 - Math.round(46 * (0.5 - 0.5 * Math.cos((i / w) * Math.PI * 2)));
      data.set([v, v, v, 255], i * 4);
    }
    ribs = new DataTexture(data, w, 1, RGBAFormat);
    ribs.wrapS = RepeatWrapping;
    ribs.wrapT = RepeatWrapping;
    ribs.magFilter = LinearFilter;
    ribs.minFilter = LinearMipmapLinearFilter;
    ribs.generateMipmaps = true;
    ribs.needsUpdate = true;
  }
  const texture = ribs.clone();
  texture.repeat.set(repeat, 1);
  texture.needsUpdate = true;
  return texture;
}

interface HeadParts {
  lens: Mesh;
  headlamp: SpotLight;
  ponytail: Group;
  eyes: Group[];
}

function buildHead(head: Group): HeadParts {
  // Visage rond, petit nez en pâte à modeler
  const face = part(new SphereGeometry(0.24, 22, 16), LOOK.skin, 0, 0.2, 0);
  face.scale.set(1.04, 0.97, 1);
  // Peau « argile » éclairée de l'intérieur : le palier d'ombre du toon ne fait pas de barbe sous le menton
  face.material = toon(LOOK.skin, { emissive: LOOK.skin, emissiveIntensity: 0.32 });
  // Pas d'ombre portée du bonnet sur le visage : il resterait sombre sous la caméra plongeante
  face.receiveShadow = false;
  head.add(face);
  const nose = decal(new SphereGeometry(0.02, 8, 6), LOOK.skinDark, 0, 0.112, 0.238, true);
  nose.scale.set(1.2, 0.8, 0.7);
  head.add(nose);
  // Grands yeux ovales à deux reflets (groupes : clignement et grimace de douleur)
  const eyes: Group[] = [];
  for (const side of [-1, 1]) {
    const eye = new Group();
    eye.position.set(side * 0.09, 0.145, 0.208);
    eye.rotation.y = side * 0.4;
    head.add(eye);
    const ball = decal(new SphereGeometry(0.044, 14, 10), LOOK.eye, 0, 0, 0);
    ball.scale.set(0.8, 1.12, 0.42);
    eye.add(ball);
    eye.add(decal(new SphereGeometry(0.014, 8, 6), "#ffffff", 0.011, 0.018, 0.016));
    eye.add(decal(new SphereGeometry(0.0065, 6, 5), "#ffffff", -0.012, -0.02, 0.016));
    eyes.push(eye);
    const blush = decal(new SphereGeometry(0.028, 10, 8), LOOK.blush, side * 0.15, 0.085, 0.178, true);
    blush.scale.set(1.3, 0.62, 0.4);
    blush.rotation.y = side * 0.68;
    head.add(blush);
    const brow = decal(new CapsuleGeometry(0.011, 0.04, 2, 6), LOOK.hairDark, side * 0.092, 0.218, 0.214);
    brow.rotation.set(0, side * 0.4, Math.PI / 2 + side * 0.06);
    head.add(brow);
  }
  const smile = decal(new TorusGeometry(0.022, 0.0062, 4, 12, Math.PI), LOOK.mouth, 0, 0.078, 0.229);
  smile.rotation.set(-0.3, 0, Math.PI);
  head.add(smile);

  // Cheveux châtains ondulés : masse arrière, mèches latérales qui débordent du bonnet, frange balayée
  const mass = part(new SphereGeometry(0.25, 18, 14), LOOK.hair, 0, 0.21, -0.05);
  mass.scale.set(1.1, 1, 1);
  head.add(mass);
  for (const side of [-1, 1]) {
    const lock = part(new SphereGeometry(0.088, 12, 10), LOOK.hair, side * 0.208, 0.14, 0.06);
    lock.scale.set(0.72, 1.3, 0.95);
    head.add(lock);
    const curl = part(new SphereGeometry(0.072, 10, 8), LOOK.hair, side * 0.232, 0.035, 0.0);
    curl.scale.set(0.9, 1, 1);
    head.add(curl);
    // Pointes qui rebiquent vers l'extérieur sous le revers (lisibles de haut)
    const flick = part(new CapsuleGeometry(0.036, 0.07, 4, 8), LOOK.hairLight, side * 0.285, 0.0, -0.05);
    flick.rotation.set(0, 0, side * 1.05);
    head.add(flick);
    const flickFront = part(new CapsuleGeometry(0.03, 0.05, 4, 8), LOOK.hair, side * 0.255, 0.02, 0.1);
    flickFront.rotation.set(0.3, 0, side * 0.8);
    head.add(flickFront);
    const back = part(new SphereGeometry(0.08, 10, 8), LOOK.hair, side * 0.16, 0.05, -0.18);
    head.add(back);
    // Mèches qui sortent sous le revers, sur les côtés et derrière
    for (const [a, y] of [[1.25, 0.25], [1.75, 0.24], [2.3, 0.23]] as const) {
      const tuft = part(new SphereGeometry(0.06, 10, 8), a > 2 ? LOOK.hairLight : LOOK.hair, side * Math.sin(a) * 0.29, y, Math.cos(a) * 0.285);
      tuft.scale.set(1, 0.7, 1);
      head.add(tuft);
    }
  }
  for (const [x, tilt, len] of [[-0.12, -0.45, 0.07], [-0.04, -0.15, 0.09], [0.05, 0.3, 0.085], [0.14, 0.65, 0.06]] as const) {
    const fringe = part(new CapsuleGeometry(0.04, len, 4, 8), x > 0 ? LOOK.hair : LOOK.hairLight, x, 0.262, 0.205 - Math.abs(x) * 0.22);
    fringe.rotation.set(0.45, 0, tilt);
    head.add(fringe);
  }

  // Petite queue de cheval basse, ondulée, sur pivot (balancement)
  const ponytail = new Group();
  ponytail.position.set(0, 0.07, -0.235);
  head.add(ponytail);
  ponytail.add(part(new SphereGeometry(0.05, 10, 8), LOOK.hairDark, 0, 0, 0));
  const tail = part(new CapsuleGeometry(0.052, 0.07, 4, 10), LOOK.hairLight, 0, -0.075, -0.035);
  tail.rotation.x = 0.4;
  ponytail.add(tail);
  const tip = part(new SphereGeometry(0.045, 10, 8), LOOK.hair, 0.012, -0.145, -0.045);
  tip.scale.set(0.9, 1.1, 0.9);
  ponytail.add(tip);

  // Bonnet en grosse maille olive : dôme côtelé un peu affaissé vers l'arrière, revers épais, écusson en cuir
  const beanie = new Group();
  beanie.position.set(0, 0.34, -0.012);
  beanie.rotation.x = 0.05;
  head.add(beanie);
  const dome = part(new SphereGeometry(0.256, 26, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), LOOK.beanie, 0, 0.0, -0.012);
  dome.material = toon(LOOK.beanie, { map: knit(30) });
  dome.scale.set(1, 1.08, 1);
  dome.rotation.x = -0.1;
  beanie.add(dome);
  const crown = part(new SphereGeometry(0.1, 12, 8), LOOK.beanieCuff, 0, 0.27, -0.045);
  crown.scale.set(1, 0.32, 1);
  crown.material = toon(LOOK.beanieCuff, { map: knit(10) });
  crown.userData.noOutline = true;
  beanie.add(crown);
  const cuff = part(new TorusGeometry(0.25, 0.06, 10, 40), LOOK.beanieCuff, 0, 0.0, 0);
  cuff.material = toon(LOOK.beanieCuff, { map: knit(52) });
  cuff.rotation.x = Math.PI / 2;
  cuff.scale.set(1, 1.02, 1.18);
  beanie.add(cuff);
  const angle = 0.52;
  const border = part(new RoundedBoxGeometry(0.108, 0.08, 0.02, 1, 0.012), LOOK.leatherDark, Math.sin(angle) * 0.31, 0.006, Math.cos(angle) * 0.31);
  border.rotation.y = angle;
  border.userData.noOutline = true;
  beanie.add(border);
  const patch = decal(new RoundedBoxGeometry(0.094, 0.066, 0.02, 1, 0.01), LOOK.patch, Math.sin(angle) * 0.318, 0.006, Math.cos(angle) * 0.318, true);
  patch.rotation.y = angle;
  beanie.add(patch);

  // Petite lampe frontale clipsée sur le revers (fonctionnelle)
  const lampBody = part(new CylinderGeometry(0.03, 0.034, 0.04, 12), PALETTE.steelDark, -0.075, 0.315, 0.29);
  lampBody.rotation.x = Math.PI / 2 - 0.25;
  head.add(lampBody);
  const lens = new Mesh(new CylinderGeometry(0.024, 0.024, 0.012, 12), glow("#fff2c4"));
  lens.position.set(-0.075, 0.31, 0.312);
  lens.rotation.x = Math.PI / 2 - 0.25;
  lens.userData.noOutline = true;
  head.add(lens);
  const headlamp = new SpotLight("#ffe6b0", LAMP_INTENSITY, 11, LAMP_ANGLE, 0.65, 1.6);
  headlamp.position.set(-0.075, 0.31, 0.32);
  headlamp.castShadow = false;
  const lampTarget = new Object3D();
  lampTarget.position.set(-0.075, -1.6, 3.4);
  head.add(lampTarget);
  headlamp.target = lampTarget;
  head.add(headlamp);
  return { lens, headlamp, ponytail, eyes };
}

interface TorsoParts {
  satchel: Group;
  scarfTails: Group[];
}

function buildTorso(torso: Group): TorsoParts {
  // Veste moutarde ouverte sur une chemise crème, bas de veste évasé
  const jacket = part(new CapsuleGeometry(0.195, 0.16, 6, 16), LOOK.jacket, 0, 0.21, 0);
  jacket.scale.set(1.1, 1, 0.88);
  torso.add(jacket);
  const hem = part(new CylinderGeometry(0.205, 0.235, 0.13, 20), LOOK.jacket, 0, 0.03, 0);
  hem.scale.z = 0.9;
  torso.add(hem);
  const shirt = part(new RoundedBoxGeometry(0.13, 0.3, 0.06, 2, 0.025), LOOK.shirt, 0, 0.17, 0.155);
  torso.add(shirt);
  for (const side of [-1, 1]) {
    const lapel = part(new RoundedBoxGeometry(0.048, 0.3, 0.05, 2, 0.02), LOOK.jacketDark, side * 0.088, 0.18, 0.166);
    lapel.rotation.z = side * 0.08;
    torso.add(lapel);
    const pocket = decal(new RoundedBoxGeometry(0.07, 0.012, 0.03, 1, 0.005), LOOK.jacketDark, side * 0.14, 0.13, 0.17, true);
    pocket.rotation.y = side * 0.55;
    torso.add(pocket);
  }
  // Grosse capuche ramassée dans le dos, pointe qui retombe
  const hood = part(new SphereGeometry(0.175, 16, 12), LOOK.jacket, 0, 0.38, -0.14);
  hood.scale.set(1.32, 0.86, 0.92);
  torso.add(hood);
  const hoodTip = part(new SphereGeometry(0.085, 10, 8), LOOK.jacketDark, 0, 0.28, -0.215);
  hoodTip.scale.set(1.1, 1, 0.7);
  torso.add(hoodTip);
  const hoodRim = part(new TorusGeometry(0.165, 0.048, 8, 22), LOOK.jacketDark, 0, 0.425, -0.045);
  hoodRim.rotation.x = Math.PI / 2 + 0.25;
  torso.add(hoodRim);
  // Écharpe anthracite enroulée, nœud sur le côté gauche, deux pans libres
  const scarf = part(new TorusGeometry(0.118, 0.05, 10, 22), LOOK.scarf, 0, 0.395, -0.01);
  scarf.rotation.x = Math.PI / 2 + 0.35; // avant abaissé : le menton reste visible
  scarf.scale.set(1, 1, 1.05);
  torso.add(scarf);
  const knot = part(new SphereGeometry(0.058, 10, 8), LOOK.scarf, 0.09, 0.32, 0.125);
  knot.scale.set(1.15, 0.8, 0.8);
  torso.add(knot);
  const scarfTails: Group[] = [];
  for (const [x, z, len, spread] of [[0.1, 0.11, 0.15, 0.12], [0.135, 0.07, 0.12, 0.42]] as const) {
    const pivot = new Group();
    pivot.position.set(x, 0.305, z);
    pivot.rotation.z = spread;
    pivot.userData.rest = spread;
    torso.add(pivot);
    const end = part(new CapsuleGeometry(0.032, len, 4, 8), LOOK.scarf, 0, -len / 2 - 0.02, 0);
    end.scale.set(1.25, 1, 0.55);
    pivot.add(end);
    const fringe = decal(new BoxGeometry(0.07, 0.012, 0.022), LOOK.scarfLight, 0, -len - 0.035, 0, true);
    pivot.add(fringe);
    scarfTails.push(pivot);
  }

  // Ceinture à petites poches
  const belt = part(new CylinderGeometry(0.222, 0.228, 0.05, 22), LOOK.leatherDark, 0, 0.045, 0);
  belt.scale.z = 0.9;
  torso.add(belt);
  const buckle = part(new RoundedBoxGeometry(0.05, 0.045, 0.02, 1, 0.008), LOOK.brass, 0, 0.045, 0.208);
  torso.add(buckle);
  for (const side of [-1, 1]) {
    const pouch = part(new RoundedBoxGeometry(0.075, 0.07, 0.05, 2, 0.015), LOOK.leather, side * 0.135, 0.03, 0.17);
    pouch.rotation.y = side * 0.5;
    torso.add(pouch);
  }

  // Bandoulière : de l'épaule droite (−X) à la hanche gauche (+X), passe devant et derrière
  const sash = new Group();
  sash.position.set(0, 0.24, 0);
  sash.rotation.z = -0.75;
  torso.add(sash);
  const strap = part(new TorusGeometry(1, 0.08, 6, 36), LOOK.leather);
  strap.rotation.x = Math.PI / 2;
  strap.scale.set(0.31, 0.2, 0.29);
  sash.add(strap);

  // Sacoche en cuir sur la hanche gauche, côté dos, suspendue à la sangle (balancement)
  const satchel = new Group();
  satchel.position.set(0.13, 0.17, -0.19);
  satchel.rotation.order = "XZY";
  satchel.rotation.y = Math.PI - 0.5;
  torso.add(satchel);
  const bag = part(new RoundedBoxGeometry(0.23, 0.185, 0.1, 3, 0.035), LOOK.leather, 0, -0.12, 0);
  satchel.add(bag);
  // Rabat qui couvre le dessus et la face : lisible depuis la caméra plongeante
  const lid = part(new RoundedBoxGeometry(0.236, 0.035, 0.112, 1, 0.014), LOOK.leatherDark, 0, -0.03, 0.002);
  satchel.add(lid);
  const flap = part(new RoundedBoxGeometry(0.225, 0.11, 0.028, 1, 0.012), LOOK.leatherDark, 0, -0.085, 0.052);
  satchel.add(flap);
  const tab = decal(new RoundedBoxGeometry(0.036, 0.1, 0.012, 1, 0.005), LOOK.leather, 0, -0.1, 0.069, true);
  satchel.add(tab);
  const frame = part(new RoundedBoxGeometry(0.06, 0.052, 0.014, 1, 0.008), LOOK.brass, 0, -0.118, 0.074);
  satchel.add(frame);
  const hole = decal(new BoxGeometry(0.032, 0.024, 0.006), LOOK.leatherDark, 0, -0.118, 0.081, true);
  satchel.add(hole);
  const seam = decal(new BoxGeometry(0.2, 0.006, 0.006), LOOK.knit, 0, -0.05, 0.059, true);
  satchel.add(seam);
  return { satchel, scarfTails };
}

/** Clé à molette en acier, scotch moutarde sur le manche. Plat dans le plan XZ, tête vers +Z. */
function buildWrench(): Group {
  const wrench = new Group();
  const handle = part(new RoundedBoxGeometry(0.055, 0.03, 0.27, 2, 0.012), LOOK.wrench, 0, 0, 0.1);
  wrench.add(handle);
  const tape = part(new RoundedBoxGeometry(0.066, 0.042, 0.13, 2, 0.016), LOOK.tape, 0, 0, 0.0);
  wrench.add(tape);
  const eye = part(new TorusGeometry(0.026, 0.012, 6, 12), LOOK.wrenchDark, 0, 0, -0.085);
  eye.rotation.x = Math.PI / 2;
  wrench.add(eye);
  const neck = part(new CylinderGeometry(0.032, 0.032, 0.035, 10), LOOK.brass, 0.0, 0, 0.24);
  neck.rotation.x = Math.PI / 2;
  wrench.add(neck);
  const head = part(new RoundedBoxGeometry(0.15, 0.04, 0.09, 2, 0.018), LOOK.wrench, 0, 0, 0.29);
  wrench.add(head);
  // Mâchoires : fixe (plus longue) et mobile, entrebâillées
  const fixed = part(new RoundedBoxGeometry(0.045, 0.04, 0.1, 2, 0.015), LOOK.wrench, 0.05, 0, 0.36);
  wrench.add(fixed);
  const jaw = part(new RoundedBoxGeometry(0.04, 0.038, 0.075, 2, 0.014), LOOK.wrenchDark, -0.045, 0, 0.345);
  wrench.add(jaw);
  const knurl = part(new CylinderGeometry(0.018, 0.018, 0.05, 10), LOOK.brass, -0.03, 0.0, 0.27);
  knurl.rotation.z = Math.PI / 2;
  wrench.add(knurl);
  return wrench;
}

/** Lance-clous à batterie, carrosserie olive et moutarde. −Y = buse, +Z = dessus du carter. */
function buildNailGun(): { gun: Group; magazine: Mesh } {
  const gun = new Group();
  // Carter moteur au-dessus de la main, bandeau moutarde sur le dessus (lisible en vue plongeante)
  const housing = part(new RoundedBoxGeometry(0.1, 0.27, 0.1, 3, 0.035), LOOK.tool, 0, -0.07, 0.085);
  gun.add(housing);
  const stripe = part(new RoundedBoxGeometry(0.075, 0.2, 0.03, 2, 0.012), LOOK.toolTrim, 0, -0.08, 0.135);
  gun.add(stripe);
  const cap = part(new SphereGeometry(0.055, 12, 10), LOOK.toolDark, 0, 0.07, 0.085);
  cap.scale.set(0.95, 0.6, 0.95);
  gun.add(cap);
  // Poignée et batterie
  const grip = part(new RoundedBoxGeometry(0.05, 0.06, 0.12, 2, 0.02), LOOK.toolDark, 0, 0.01, 0.0);
  gun.add(grip);
  const battery = part(new RoundedBoxGeometry(0.09, 0.14, 0.065, 2, 0.02), LOOK.toolTrim, 0, 0.03, -0.085);
  gun.add(battery);
  const led = decal(new BoxGeometry(0.05, 0.012, 0.01), PALETTE.teal, 0, 0.065, -0.05);
  gun.add(led);
  // Buse en acier : l'embout est en (0, −0.36, 0.02)
  const nose = part(new CylinderGeometry(0.024, 0.03, 0.13, 10), PALETTE.steel, 0, -0.27, 0.025);
  gun.add(nose);
  const tip = part(new CylinderGeometry(0.03, 0.026, 0.025, 10), PALETTE.steelDark, 0, -0.345, 0.022);
  gun.add(tip);
  // Bande de clous sous la buse, têtes alignées
  const magazine = part(new RoundedBoxGeometry(0.034, 0.2, 0.03, 1, 0.008), LOOK.toolDark, 0, MAG_Y, MAG_Z);
  gun.add(magazine);
  for (let i = 0; i < 6; i++) {
    const nail = part(new CylinderGeometry(0.011, 0.011, 0.02, 6), LOOK.nail, 0.022, -0.075 + i * 0.03, 0);
    nail.rotation.z = Math.PI / 2;
    magazine.add(nail);
  }
  return { gun, magazine };
}

/** Grosse lampe torche, lentille vers −Y. */
function buildTorch(): Group {
  const torch = new Group();
  torch.add(part(new CylinderGeometry(0.028, 0.028, 0.12, 10), PALETTE.steelDark, 0, -0.03, 0));
  torch.add(part(new CylinderGeometry(0.032, 0.046, 0.06, 12), LOOK.toolTrim, 0, -0.11, 0));
  torch.add(part(new RoundedBoxGeometry(0.03, 0.05, 0.02, 1, 0.006), LOOK.brass, 0, -0.03, 0.03));
  return torch;
}

export function buildOperator(): OperatorRig {
  const root = new Group();
  root.name = "Operator";
  const body = new Group();
  root.add(body);

  const hips = new Group();
  hips.position.y = HIP_HEIGHT;
  body.add(hips);
  const pelvis = part(new SphereGeometry(0.15, 14, 10), LOOK.pants, 0, -0.01, 0);
  pelvis.scale.set(1.25, 0.8, 1.0);
  hips.add(pelvis);

  // Jambes : cuisse cargo + tibia + botte à revers fourré
  const legs: OperatorRig["legs"] = [];
  for (const side of [-1, 1]) {
    const hip = new Group();
    hip.position.set(side * 0.095, 0, 0);
    hips.add(hip);
    limb(hip, THIGH + 0.05, 0.088, LOOK.pants);
    const pocket = part(new RoundedBoxGeometry(0.04, 0.08, 0.08, 2, 0.015), LOOK.pantsDark, side * 0.085, -0.13, 0);
    hip.add(pocket);
    const knee = new Group();
    knee.position.y = -THIGH;
    hip.add(knee);
    limb(knee, SHIN - 0.04, 0.08, LOOK.pants);
    const shaft = part(new CylinderGeometry(0.08, 0.085, 0.1, 14), LOOK.boot, 0, -SHIN + 0.05, 0);
    knee.add(shaft);
    const fur = part(new TorusGeometry(0.083, 0.035, 8, 16), LOOK.knit, 0, -SHIN + 0.105, 0);
    fur.rotation.x = Math.PI / 2;
    fur.scale.z = 1.2;
    knee.add(fur);
    const boot = part(new RoundedBoxGeometry(0.16, 0.1, 0.24, 3, 0.045), LOOK.boot, 0, -SHIN - 0.005, 0.035);
    knee.add(boot);
    const sole = part(new RoundedBoxGeometry(0.165, 0.03, 0.245, 2, 0.012), LOOK.sole, 0, -SHIN - 0.045, 0.035);
    knee.add(sole);
    legs.push({ hip, knee });
  }

  const torso = new Group();
  torso.position.y = 0.02;
  hips.add(torso);
  const { satchel, scarfTails } = buildTorso(torso);
  // Lampe torche clipsée au bout de la bandoulière, sur la hanche gauche, lentille vers le bas
  const torchClip = buildTorch();
  torchClip.position.set(0.215, 0.1, 0.07);
  torchClip.rotation.set(0.15, 0.6, 0.12);
  torso.add(torchClip);

  const head = new Group();
  head.position.y = 0.47;
  torso.add(head);
  const { lens, headlamp, ponytail, eyes } = buildHead(head);

  // Bras : manche moutarde, poignet en maille crème, gros gant brun
  const arms: OperatorRig["arms"] = [];
  for (const side of [-1, 1]) {
    const shoulder = new Group();
    shoulder.rotation.order = "YXZ";
    shoulder.position.set(side * 0.215, 0.36, 0);
    torso.add(shoulder);
    const puff = part(new SphereGeometry(0.09, 12, 10), LOOK.jacket, 0, -0.01, 0);
    shoulder.add(puff);
    limb(shoulder, UPPER_ARM + 0.03, 0.078, LOOK.jacket);
    const elbow = new Group();
    elbow.position.y = -UPPER_ARM;
    shoulder.add(elbow);
    limb(elbow, FOREARM - 0.06, 0.074, LOOK.jacket);
    const knit = part(new CylinderGeometry(0.08, 0.075, 0.07, 14), LOOK.knit, 0, -FOREARM + 0.07, 0);
    elbow.add(knit);
    const glove = part(new SphereGeometry(0.068, 12, 10), LOOK.glove, 0, -FOREARM - 0.01, 0.005);
    glove.scale.set(0.95, 1.1, 1.0);
    elbow.add(glove);
    const thumb = part(new CapsuleGeometry(0.024, 0.03, 4, 8), LOOK.glove, side * -0.045, -FOREARM + 0.0, 0.045);
    thumb.rotation.x = 0.6;
    elbow.add(thumb);
    arms.push({ shoulder, elbow });
  }

  // Outils dans la main droite. L'opérateur regarde +Z : sa droite est du côté −X (bras d'indice 0).
  const hand = arms[0].elbow;
  const wrench = buildWrench();
  wrench.position.set(0, -FOREARM - 0.01, 0.01);
  hand.add(wrench);
  const { gun, magazine } = buildNailGun();
  gun.position.set(0, -FOREARM - 0.01, 0.0);
  hand.add(gun);

  // Clé rangée, glissée dans la ceinture sur la hanche droite, tête vers le haut
  const holster = buildWrench();
  holster.scale.setScalar(0.8);
  holster.position.set(-0.2, 0.0, 0.07);
  holster.rotation.set(-Math.PI / 2 - 0.15, 0.25, 0.2);
  holster.visible = false;
  torso.add(holster);

  // Lampe brandie dans la main gauche pour éblouir, faisceau en cône translucide
  const torch = buildTorch();
  torch.position.set(0, -FOREARM - 0.01, 0.0);
  torch.visible = false;
  arms[1].elbow.add(torch);
  const torchLens = new Mesh(new CylinderGeometry(0.04, 0.04, 0.01, 12), glow("#fff6d2"));
  torchLens.position.y = -0.142;
  torchLens.userData.noOutline = true;
  torch.add(torchLens);
  const beamGeometry = new ConeGeometry(0.42, 1.5, 18, 1, true);
  beamGeometry.translate(0, -0.75, 0);
  const beam = new Mesh(beamGeometry, new MeshBasicMaterial({ color: "#fff0b8", transparent: true, opacity: 0, depthWrite: false, side: DoubleSide, toneMapped: false }));
  beam.position.y = -0.145;
  beam.userData.noOutline = true;
  torch.add(beam);

  // Traînée du coup de clé : arc crème, de l'épaule droite (haute) vers l'avant gauche
  const trailPivot = new Group();
  trailPivot.position.set(0, 0.32, 0.05);
  trailPivot.rotation.z = -0.45;
  torso.add(trailPivot);
  const trail = new Mesh(
    new RingGeometry(0.45, 0.82, 20, 1, Math.PI + 0.3, 2.2),
    new MeshBasicMaterial({ color: "#fff4d6", transparent: true, opacity: 0, depthWrite: false, side: DoubleSide, toneMapped: false }),
  );
  trail.rotation.x = -Math.PI / 2;
  trail.userData.noOutline = true;
  trail.visible = false;
  trailPivot.add(trail);

  const droppedMag = part(new RoundedBoxGeometry(0.034, 0.2, 0.03, 1, 0.008), LOOK.toolDark);
  droppedMag.visible = false;

  addOutline(root, 0.016);
  const spring = (): Spring => ({ x: 0, v: 0 });
  const motion: OperatorMotion = {
    time: 0, idle: 0, look: 0, lookTimer: 2.5, blink: 3, yaw: 0, turn: 0, stepSign: 0, steps: 0,
    tail: spring(), tailSide: spring(), bag: spring(), bagSide: spring(),
  };
  return {
    root, body, head, hips, torso, legs, arms, gun, magazine, wrench, holster, trail, torchClip, torch, torchLens, beam, headlamp, lens,
    droppedMag, dropped: { active: false, y: 0, vy: 0 }, ponytail, satchel, scarfTails, eyes, motion,
  };
}

export interface OperatorAnimation {
  pose: Pose;
  stride: number;
  speed: number;
  /** Secondes restantes de l'animation de tir (0.18 → 0). */
  shotTime: number;
  /** 0 → 1 pendant le rechargement, 0 sinon. */
  reload: number;
  /** Vrai quand le joueur vise (souris, stick droit ou cible assistée). */
  aiming: boolean;
  /** Arme en main : 0 = clé à molette (défaut), 1 = lance-clous. */
  weapon?: 0 | 1;
  /** Progression du coup de clé, 0 → 1 (0 = au repos). */
  swing?: number;
  /** Secondes restantes de l'éblouissement à la lampe (≤ 0.25), 0 sinon. */
  dazzle?: number;
}

function smooth(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.exp(-rate * dt);
}

function window01(t: number, start: number, end: number): number {
  if (t <= start || t >= end) return 0;
  return Math.sin(((t - start) / (end - start)) * Math.PI);
}

/** Visage légèrement levé vers la caméra plongeante. */
const HEAD_TILT = -0.24;

/** Pose de bras : épaule (x, y, z), coude, poignet (orientation de la clé). */
type ArmKey = readonly [number, number, number, number, number];

/** Clé tenue basse devant la hanche, tête vers l'avant. */
const WRENCH_REST: ArmKey = [-0.15, 0, -0.35, -0.5, 0.9];
/** Garde : clé levée devant l'épaule, prête à frapper. */
const WRENCH_GUARD: ArmKey = [-0.75, 0.1, -0.4, -1.3, 1.3];

/** Coup de clé : armé derrière l'épaule droite, frappe diagonale vers la gauche, retour. [t, bras, torsion, fente] */
const SWING_KEYS: readonly (readonly [number, ArmKey, number, number])[] = [
  [0, WRENCH_REST, 0, 0],
  [0.25, [-2.7, -0.55, -0.5, -1.3, 0.2], -0.55, -0.03],
  [0.42, [-1.4, 0.35, -0.1, -0.15, 1.6], 0.45, 0.12],
  [0.55, [-0.75, 0.9, 0.1, -0.3, 1.35], 0.65, 0.14],
  [1, WRENCH_REST, 0, 0],
];

function swingPose(t: number): { arm: number[]; twist: number; lunge: number } {
  let i = 0;
  while (i < SWING_KEYS.length - 2 && t > SWING_KEYS[i + 1][0]) i++;
  const [t0, a0, w0, l0] = SWING_KEYS[i];
  const [t1, a1, w1, l1] = SWING_KEYS[i + 1];
  const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  const e = u * u * (3 - 2 * u);
  return { arm: a0.map((v, k) => v + (a1[k] - v) * e), twist: w0 + (w1 - w0) * e, lunge: l0 + (l1 - l0) * e };
}

type Arm = OperatorRig["arms"][number];

function setArm(arm: Arm, sx: number, sy: number, sz: number, elbow: number, rate: number, dt: number): void {
  arm.shoulder.rotation.x = smooth(arm.shoulder.rotation.x, sx, rate, dt);
  arm.shoulder.rotation.y = smooth(arm.shoulder.rotation.y, sy, rate, dt);
  arm.shoulder.rotation.z = smooth(arm.shoulder.rotation.z, sz, rate, dt);
  arm.elbow.rotation.x = smooth(arm.elbow.rotation.x, elbow, rate, dt);
}

export function animateOperator(rig: OperatorRig, input: OperatorAnimation, dt: number): void {
  // Forçage optionnel des paramètres (captures de poses)
  const forced = rig.root.userData.animOverride as Partial<OperatorAnimation> | undefined;
  const a = forced ? { ...input, ...forced } : input;
  const weapon = a.weapon ?? 0;
  const swingT = weapon === 0 ? Math.min(1, Math.max(0, a.swing ?? 0)) : 0;
  const dazzle = Math.max(0, a.dazzle ?? 0);
  const crouch = a.pose === "crouch" || a.pose === "crouch-walk";
  const running = a.pose === "run";
  const moving = a.pose !== "idle" && a.pose !== "crouch";
  const swing = moving ? (running ? 0.95 : crouch ? 0.4 : 0.65) : 0;
  const s = Math.sin(a.stride);
  const c = Math.cos(a.stride);
  rig.motion.time += dt;
  // Coup reçu : l'engine pose userData.hurt = 0.25, on le consomme ici (1 → 0)
  const hurt = Math.max(0, ((rig.root.userData.hurt as number | undefined) ?? 0) - dt);
  if (rig.root.userData.hurt !== undefined) rig.root.userData.hurt = hurt;
  const flinch = Math.min(1, hurt / 0.25);

  rig.wrench.visible = weapon === 0;
  rig.gun.visible = weapon === 1;
  rig.holster.visible = weapon === 1;

  // Coup de clé : torsion du buste, petit pas en avant du pied gauche
  const strike = swingT > 0 ? swingPose(swingT) : null;
  const lunge = strike ? strike.lunge : 0;
  const step = Math.max(0, lunge) / 0.14;

  // Jambes courtes : grands angles pour que la foulée reste lisible
  const crouchAngle = crouch ? 1.05 : 0;
  for (let i = 0; i < 2; i++) {
    const phase = i === 0 ? s : -s;
    const lift = Math.max(0, i === 0 ? -c : c);
    const stepHip = i === 1 ? -0.6 * step : 0.3 * step;
    const hipTarget = -crouchAngle - phase * swing + stepHip;
    const kneeTarget = crouchAngle * 2 + lift * swing * (running ? 1.5 : 1.1) + (i === 1 ? 0.35 * step : 0);
    rig.legs[i].hip.rotation.x = smooth(rig.legs[i].hip.rotation.x, hipTarget, strike ? 30 : 18, dt);
    rig.legs[i].knee.rotation.x = smooth(rig.legs[i].knee.rotation.x, kneeTarget, strike ? 30 : 18, dt);
  }
  rig.body.position.z = smooth(rig.body.position.z, lunge, 30, dt);

  // Éblouir : 1 tant que la lampe est poussée à fond, retombe sur la fin
  const glare = dazzle > 0 ? Math.min(1, dazzle / 0.08) : 0;

  // Hauteur du bassin : accroupi, rebond chibi de la foulée, respiration au repos
  const legReach = (THIGH + SHIN) * Math.cos(crouchAngle);
  const crouchDrop = crouch ? (THIGH + SHIN) - legReach : 0;
  const m = rig.motion;
  const breath = Math.sin(m.time * 2.3);
  const bob = moving ? Math.abs(c) * (running ? 0.06 : 0.04) : breath * 0.006;
  rig.hips.position.y = smooth(rig.hips.position.y, HIP_HEIGHT - crouchDrop + bob - step * 0.04 - flinch * 0.03, 16, dt);
  const lean = running ? 0.2 : crouch ? 0.28 : moving ? 0.05 : 0;
  const kick = weapon === 1 && a.shotTime > 0 ? a.shotTime * 0.25 : 0;
  rig.torso.rotation.x = smooth(rig.torso.rotation.x, lean - kick - glare * 0.22 + step * 0.12 - flinch * 0.32, 14, dt);
  rig.torso.rotation.y = smooth(rig.torso.rotation.y, (moving ? s * 0.1 : 0) + (strike ? strike.twist : 0), strike ? 30 : 10, dt);
  rig.torso.rotation.z = smooth(rig.torso.rotation.z, (moving ? c * (running ? 0.05 : 0.035) : 0) + flinch * 0.12, 10, dt);
  // Respiration au repos : le buste gonfle à peine
  const chest = moving ? 0 : breath * 0.012;
  rig.torso.scale.set(1 + chest * 0.5, 1 + chest, 1 + chest * 0.5);
  // Écrasement / étirement chibi : tassé à la pose du pied, étiré en l'air ; tassé aussi sous un coup
  const squash = (moving ? Math.pow(1 - Math.abs(c), 4) * (running ? 0.07 : 0.045) - Math.abs(c) * (running ? 0.025 : 0.012) : 0) + flinch * 0.08;
  rig.body.scale.set(1 + squash * 0.5, 1 - squash, 1 + squash * 0.5);

  // Regard : coup d'œil de côté de temps en temps quand on attend
  const calm = !moving && !strike && glare <= 0 && !a.aiming && flinch <= 0 && (weapon === 0 || a.reload <= 0);
  m.idle = calm ? m.idle + dt : 0;
  if (m.idle > 2.5) {
    m.lookTimer -= dt;
    if (m.lookTimer <= 0) {
      m.look = m.look !== 0 ? 0 : (Math.random() < 0.5 ? -1 : 1) * (0.45 + Math.random() * 0.3);
      m.lookTimer = m.look !== 0 ? 1.2 + Math.random() * 0.8 : 2 + Math.random() * 2.5;
    }
  } else {
    m.look = 0;
    m.lookTimer = 1.5;
  }
  // La grosse tête compense l'inclinaison et dodeline un peu
  rig.head.rotation.x = smooth(rig.head.rotation.x, HEAD_TILT - lean * 0.7 + glare * 0.12 - flinch * 0.3 + (calm ? breath * 0.015 : 0), 10, dt);
  rig.head.rotation.z = smooth(rig.head.rotation.z, (moving ? -c * 0.04 : 0) - m.look * 0.12 - flinch * 0.18, 8, dt);
  rig.head.rotation.y = smooth(rig.head.rotation.y, strike ? -strike.twist * 0.5 : m.look, strike ? 20 : 6, dt);

  // Clignement des yeux ; yeux plissés sous la douleur
  m.blink -= dt;
  if (m.blink < -0.12) m.blink = 2.2 + Math.random() * 3;
  const lid = flinch > 0.25 ? 0.22 : m.blink < 0 ? 0.12 : 1;
  for (const eye of rig.eyes) eye.scale.y = smooth(eye.scale.y, lid, 40, dt);

  // Lampe frontale poussée à fond pendant l'éblouissement, torche brandie, lentilles qui pulsent
  const pulse = 1 + glare * (0.6 + 0.25 * Math.sin(m.time * 40));
  rig.headlamp.intensity = LAMP_INTENSITY * (1 + 3 * glare);
  rig.headlamp.angle = LAMP_ANGLE + 0.38 * glare;
  rig.lens.scale.setScalar(pulse);
  rig.torch.visible = glare > 0;
  rig.torchClip.visible = glare <= 0;
  rig.torchLens.scale.setScalar(pulse);
  (rig.beam.material as MeshBasicMaterial).opacity = 0.26 * glare * (0.85 + 0.15 * Math.sin(m.time * 40));

  // Traînée visible pendant la frappe
  const smear = window01(swingT, 0.3, 0.62);
  rig.trail.visible = smear > 0.02;
  (rig.trail.material as MeshBasicMaterial).opacity = 0.7 * smear;

  // Bras : toolArm tient l'outil (droite, −X), supportArm aide ou balance (gauche, +X).
  const [toolArm, supportArm] = rig.arms;
  const r = weapon === 1 ? a.reload : 0;
  const armSwing = moving ? swing * 0.95 : 0;
  const bend = running ? -1.3 : -0.35;
  const swingArm = (arm: Arm, phase: number, out: number) =>
    setArm(arm, phase * armSwing - (running ? 0.3 : 0.05), 0, out, bend, 14, dt);

  if (weapon === 0) {
    // Clé à molette : coup, garde quand on vise, sinon tenue basse qui suit le balancier
    let key: readonly number[];
    let rate = 14;
    if (strike) {
      key = strike.arm;
      rate = 40;
    } else if (a.aiming && !running) {
      key = WRENCH_GUARD;
    } else {
      key = [WRENCH_REST[0] + s * armSwing - (running ? 0.3 : 0), 0, WRENCH_REST[2], running ? -1.2 : WRENCH_REST[3], WRENCH_REST[4]];
    }
    setArm(toolArm, key[0], key[1], key[2], key[3], rate, dt);
    rig.wrench.rotation.x = smooth(rig.wrench.rotation.x, key[4], rate, dt);
    if (strike) {
      // Main gauche ouverte vers l'avant pour l'équilibre
      setArm(supportArm, -0.9 + strike.twist * 0.6, -0.3, 0.45, -0.6, 30, dt);
    } else {
      swingArm(supportArm, -s, 0.3);
    }
  } else if (r > 0) {
    // Rechargement : lance-clous ramené devant la poitrine, la main gauche tire la bande vide,
    // va chercher une bande neuve à la ceinture, l'engage par l'arrière puis tire le poussoir.
    const raise = Math.min(1, r * 6, (1 - r) * 8);
    const pull = window01(r, 0.05, 0.3);
    const fetch = window01(r, 0.25, 0.55);
    const insert = window01(r, 0.5, 0.82);
    const rack = window01(r, 0.82, 1);
    setArm(toolArm, -0.6 * raise, 0.55 * raise, -0.15, -1.75 * raise + rack * 0.25, 30, dt);
    rig.gun.rotation.z = -0.5 * raise;
    rig.gun.rotation.x = smooth(rig.gun.rotation.x, 0, 20, dt);
    const reach = Math.max(pull, insert, rack);
    setArm(supportArm, -0.25 - 1.0 * reach + fetch * 0.4, -0.6 * reach, 0.3 * fetch + 0.15, -0.5 - 1.1 * reach, 30, dt);
    // Bande : sort vers l'arrière, disparaît, la neuve glisse depuis l'arrière
    const out = r < 0.2 ? Math.min(1, r / 0.2) : r < 0.5 ? 1 : Math.max(0, 1 - (r - 0.5) / 0.28);
    rig.magazine.position.y = MAG_Y + 0.22 * out;
    rig.magazine.visible = r < 0.2 || r > 0.5;
    if (r > 0.2 && !rig.dropped.active && rig.dropped.y === 0) {
      rig.dropped.active = true;
      rig.dropped.y = 1;
      rig.magazine.getWorldPosition(rig.droppedMag.position);
      rig.dropped.vy = 0;
      rig.droppedMag.visible = true;
    }
  } else {
    rig.dropped.y = 0;
    rig.magazine.visible = true;
    rig.magazine.position.y = MAG_Y;
    rig.gun.rotation.z = smooth(rig.gun.rotation.z, 0, 14, dt);
    if (a.aiming && !running) {
      // Visée à deux mains, recul court et sec à chaque clou
      const k = Math.min(1, Math.max(0, a.shotTime / 0.18));
      const recoil = k * k * 0.35;
      setArm(toolArm, -1.5 + recoil * 0.5, 0.3, 0, -0.08 - recoil, 40, dt);
      rig.gun.rotation.x = smooth(rig.gun.rotation.x, 0, 24, dt);
      setArm(supportArm, -1.3, -0.85, 0, -0.45, 14, dt);
    } else {
      // Balancier de marche ou de course, bras un peu écartés de la veste rembourrée.
      swingArm(toolArm, s, -0.3);
      // Poignet cassé : buse vers l'avant, carter visible depuis la caméra
      if (weapon === 1) rig.gun.rotation.x = smooth(rig.gun.rotation.x, running ? -0.5 : -1.15, 14, dt);
      swingArm(supportArm, -s, 0.3);
    }
  }
  rig.gun.position.y = -FOREARM - 0.01 + (weapon === 1 && a.shotTime > 0 ? (a.shotTime / 0.18) * 0.03 : 0);

  // Éblouir : la main gauche brandit la torche à hauteur des yeux (prioritaire sur le reste)
  if (glare > 0) setArm(supportArm, -1.72, -0.3, 0.1, -0.05, 30, dt);

  // Bande vide qui tombe au sol
  if (rig.dropped.active) {
    rig.dropped.vy -= 9.8 * dt;
    rig.droppedMag.position.y += rig.dropped.vy * dt;
    rig.droppedMag.rotation.x += dt * 6;
    if (rig.droppedMag.position.y <= 0.02) {
      rig.droppedMag.position.y = 0.02;
      rig.droppedMag.rotation.x = Math.PI / 2;
      rig.dropped.active = false;
    }
  }

  secondaryMotion(rig, moving, running, crouch, lean, s, c, dt);
  footsteps(rig, moving, running, crouch, c, dt);
}

function spring(sp: Spring, target: number, stiffness: number, damping: number, dt: number): number {
  sp.v += (target - sp.x) * stiffness * dt;
  sp.v *= Math.exp(-damping * dt);
  sp.x += sp.v * dt;
  return sp.x;
}

/** Queue de cheval, sacoche et pans d'écharpe : ressorts entraînés par la foulée, l'inclinaison et les virages. */
function secondaryMotion(rig: OperatorRig, moving: boolean, running: boolean, crouch: boolean, lean: number, s: number, c: number, dt: number): void {
  const m = rig.motion;
  const h = Math.min(dt, 0.05);
  // Vitesse de rotation du corps (virages) : la queue et la sacoche partent à l'opposé
  let dyaw = rig.root.rotation.y - m.yaw;
  dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
  m.yaw = rig.root.rotation.y;
  m.turn = smooth(m.turn, h > 0 ? Math.max(-8, Math.min(8, dyaw / h)) : 0, 10, h);
  const gait = moving ? (running ? 1 : crouch ? 0.4 : 0.6) : 0;

  // Queue de cheval : rejetée en arrière à la course, rebondit à chaque pas
  const tailBack = 0.1 + gait * 0.45 + lean * 0.6 - (moving ? Math.abs(c) * 0.25 * gait : 0);
  rig.ponytail.rotation.x = 0.15 + spring(m.tail, tailBack, 150, 7, h);
  rig.ponytail.rotation.z = spring(m.tailSide, s * 0.22 * gait - m.turn * 0.08, 110, 6, h);

  // Sacoche : reste à la verticale quand le buste penche, ballotte avec la foulée
  rig.satchel.rotation.x = spring(m.bag, -lean * 0.8 + (moving ? c * 0.14 * gait : 0), 120, 6, h);
  rig.satchel.rotation.z = spring(m.bagSide, s * 0.2 * gait + m.turn * 0.06, 90, 5, h);

  // Pans d'écharpe : pendent au repos, flottent derrière l'épaule à la course
  for (let i = 0; i < rig.scarfTails.length; i++) {
    const end = rig.scarfTails[i];
    const flutter = Math.sin(m.time * (15 + i * 3) + i * 1.7) * (0.08 + 0.22 * gait);
    end.rotation.x = smooth(end.rotation.x, gait * 1.25 + lean + flutter, 12, h);
    end.rotation.z = smooth(end.rotation.z, (end.userData.rest as number) + gait * 0.35 + Math.sin(m.time * 11 + i) * 0.12 * gait, 10, h);
  }
}

const FOOT = new Vector3();

/** Petite bouffée de poussière quand un pied touche le sol (une sur deux accroupie). */
function footsteps(rig: OperatorRig, moving: boolean, running: boolean, crouch: boolean, c: number, dt: number): void {
  const container = rig.root.parent;
  if (!container) return;
  updateDust(container, dt);
  const m = rig.motion;
  const sign = c >= 0 ? 1 : -1;
  const landed = moving && m.stepSign !== 0 && sign !== m.stepSign;
  m.stepSign = moving ? sign : 0;
  if (!landed || !dustEnabled()) return;
  m.steps++;
  if (crouch && m.steps % 2 === 1) return;
  // c passe au positif : la jambe 0 se pose ; au négatif : la jambe 1
  rig.legs[sign > 0 ? 0 : 1].knee.getWorldPosition(FOOT);
  const yaw = rig.root.rotation.y;
  const back = running ? 0.55 : 0.3;
  const size = running ? 1.15 : crouch ? 0.5 : 0.8;
  puffDust(container, FOOT.x, FOOT.z, size, -Math.sin(yaw) * back, -Math.cos(yaw) * back);
  if (running) puffDust(container, FOOT.x - Math.sin(yaw) * 0.12, FOOT.z - Math.cos(yaw) * 0.12, 0.7, Math.cos(yaw) * 0.25 * sign, -Math.sin(yaw) * 0.25 * sign);
}
