// L'opérateur : petite exploratrice chibi en « pâte à modeler » — bonnet olive, veste moutarde à capuche,
// écharpe, sacoche en cuir en bandoulière, pantalon cargo et grosses bottes fourrées.
// Outils de bricoleuse : clé à molette (corps à corps), lance-clous à batterie, lampe frontale qui éblouit.
// Animations procédurales : marche, course, accroupi, coup de clé, tir et rechargement du lance-clous, éblouir.
import {
  BoxGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, Object3D,
  RingGeometry, SphereGeometry, SpotLight, TorusGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { addOutline, glow, toon } from "./toon";
import { PALETTE } from "./palette";
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
  beanie: "#545c40",
  beanieCuff: "#4d553a",
  patch: "#c9a26b",
  hair: "#7a4a2a",
  hairLight: "#8d5a35",
  skin: "#f0c4a0",
  blush: "#ee9f8a",
  eye: "#2a1d16",
  scarf: "#3b3d40",
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

function buildHead(head: Group): { lens: Mesh; headlamp: SpotLight } {
  // Visage rond
  const face = part(new SphereGeometry(0.24, 20, 16), LOOK.skin, 0, 0.2, 0);
  head.add(face);
  for (const side of [-1, 1]) {
    const eye = decal(new SphereGeometry(0.036, 12, 10), LOOK.eye, side * 0.085, 0.145, 0.214);
    eye.scale.set(0.78, 1.22, 0.45);
    eye.rotation.y = side * 0.38;
    head.add(eye);
    const shine = decal(new SphereGeometry(0.011, 6, 5), "#ffffff", side * 0.085 + 0.012, 0.162, 0.229);
    head.add(shine);
    const blush = decal(new SphereGeometry(0.03, 10, 8), LOOK.blush, side * 0.145, 0.095, 0.18, true);
    blush.scale.set(1.3, 0.7, 0.4);
    blush.rotation.y = side * 0.65;
    head.add(blush);
  }
  const smile = decal(new TorusGeometry(0.026, 0.0065, 4, 12, Math.PI), LOOK.eye, 0, 0.088, 0.226);
  smile.rotation.set(-0.35, 0, Math.PI);
  head.add(smile);

  // Cheveux châtains ondulés : masse arrière, mèches latérales, frange, petite queue basse
  const mass = part(new SphereGeometry(0.248, 18, 14), LOOK.hair, 0, 0.21, -0.045);
  mass.scale.set(1.08, 1, 1);
  head.add(mass);
  for (const side of [-1, 1]) {
    const lock = part(new SphereGeometry(0.085, 12, 10), LOOK.hair, side * 0.205, 0.13, 0.05);
    lock.scale.set(0.75, 1.25, 0.95);
    head.add(lock);
    const curl = part(new SphereGeometry(0.07, 10, 8), LOOK.hair, side * 0.225, 0.03, -0.01);
    curl.scale.set(0.9, 1, 1);
    head.add(curl);
    const flick = part(new CapsuleGeometry(0.035, 0.06, 4, 8), LOOK.hairLight, side * 0.27, 0.0, -0.06);
    flick.rotation.z = side * 1.0;
    head.add(flick);
    const back = part(new SphereGeometry(0.075, 10, 8), LOOK.hair, side * 0.15, 0.04, -0.17);
    head.add(back);
  }
  for (const [x, tilt, len] of [[-0.1, -0.35, 0.07], [-0.02, 0.15, 0.08], [0.07, 0.4, 0.07], [0.15, 0.7, 0.05]] as const) {
    const fringe = part(new CapsuleGeometry(0.038, len, 4, 8), LOOK.hair, x, 0.255, 0.2 - Math.abs(x) * 0.2);
    fringe.rotation.set(0.5, 0, tilt);
    head.add(fringe);
  }
  const tie = part(new SphereGeometry(0.06, 10, 8), LOOK.hair, 0, 0.03, -0.25);
  head.add(tie);
  const tail = part(new CapsuleGeometry(0.045, 0.07, 4, 8), LOOK.hairLight, 0, -0.04, -0.27);
  tail.rotation.x = 0.35;
  head.add(tail);

  // Bonnet en maille avec revers et écusson en cuir, légèrement basculé vers l'avant
  const beanie = new Group();
  beanie.position.set(0, 0.345, -0.01);
  beanie.rotation.x = 0.04;
  head.add(beanie);
  const dome = part(new SphereGeometry(0.262, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), LOOK.beanie, 0, 0, -0.01);
  dome.scale.set(1, 0.98, 1);
  beanie.add(dome);
  const cuff = part(new TorusGeometry(0.256, 0.052, 10, 30), LOOK.beanieCuff, 0, 0.0, 0);
  cuff.rotation.x = Math.PI / 2;
  cuff.scale.set(1, 1.02, 1.15);
  beanie.add(cuff);
  const patch = part(new RoundedBoxGeometry(0.08, 0.055, 0.02, 2, 0.008), LOOK.patch, 0, 0.005, 0);
  patch.position.set(Math.sin(0.55) * 0.308, 0.005, Math.cos(0.55) * 0.308);
  patch.rotation.y = 0.55;
  patch.userData.noOutline = true;
  beanie.add(patch);

  // Petite lampe frontale clipsée sur le revers (fonctionnelle)
  const lampBody = part(new CylinderGeometry(0.032, 0.036, 0.04, 12), PALETTE.steelDark, -0.06, 0.31, 0.27);
  lampBody.rotation.x = Math.PI / 2 - 0.25;
  head.add(lampBody);
  const lens = new Mesh(new CylinderGeometry(0.026, 0.026, 0.012, 12), glow("#fff2c4"));
  lens.position.set(-0.06, 0.305, 0.292);
  lens.rotation.x = Math.PI / 2 - 0.25;
  lens.userData.noOutline = true;
  head.add(lens);
  const headlamp = new SpotLight("#ffe6b0", LAMP_INTENSITY, 11, LAMP_ANGLE, 0.65, 1.6);
  headlamp.position.set(-0.06, 0.305, 0.3);
  headlamp.castShadow = false;
  const lampTarget = new Object3D();
  lampTarget.position.set(-0.06, -1.6, 3.4);
  head.add(lampTarget);
  headlamp.target = lampTarget;
  head.add(headlamp);
  return { lens, headlamp };
}

function buildTorso(torso: Group): void {
  // Veste moutarde ouverte sur une chemise crème
  const jacket = part(new CapsuleGeometry(0.19, 0.16, 6, 16), LOOK.jacket, 0, 0.21, 0);
  jacket.scale.set(1.08, 1, 0.86);
  torso.add(jacket);
  const hem = part(new CylinderGeometry(0.2, 0.22, 0.12, 18), LOOK.jacket, 0, 0.03, 0);
  hem.scale.z = 0.88;
  torso.add(hem);
  const shirt = part(new RoundedBoxGeometry(0.13, 0.3, 0.06, 2, 0.025), LOOK.shirt, 0, 0.17, 0.15);
  torso.add(shirt);
  for (const side of [-1, 1]) {
    const lapel = part(new RoundedBoxGeometry(0.045, 0.3, 0.05, 2, 0.02), LOOK.jacketDark, side * 0.085, 0.18, 0.163);
    lapel.rotation.z = side * 0.08;
    torso.add(lapel);
  }
  // Capuche ramassée dans le dos et écharpe anthracite
  const hood = part(new SphereGeometry(0.15, 14, 10), LOOK.jacket, 0, 0.39, -0.12);
  hood.scale.set(1.25, 0.72, 0.85);
  torso.add(hood);
  const hoodRim = part(new TorusGeometry(0.16, 0.045, 8, 20), LOOK.jacketDark, 0, 0.42, -0.04);
  hoodRim.rotation.x = Math.PI / 2 + 0.25;
  torso.add(hoodRim);
  const scarf = part(new TorusGeometry(0.11, 0.055, 10, 20), LOOK.scarf, 0, 0.415, 0.0);
  scarf.rotation.x = Math.PI / 2;
  torso.add(scarf);
  const knot = part(new SphereGeometry(0.055, 10, 8), LOOK.scarf, 0.03, 0.35, 0.13);
  knot.scale.set(1.2, 0.75, 0.7);
  torso.add(knot);

  // Ceinture à petites poches
  const belt = part(new CylinderGeometry(0.212, 0.218, 0.05, 20), LOOK.leatherDark, 0, 0.045, 0);
  belt.scale.z = 0.9;
  torso.add(belt);
  const buckle = part(new RoundedBoxGeometry(0.05, 0.045, 0.02, 1, 0.008), LOOK.brass, 0, 0.045, 0.2);
  torso.add(buckle);
  for (const side of [-1, 1]) {
    const pouch = part(new RoundedBoxGeometry(0.075, 0.07, 0.05, 2, 0.015), LOOK.leather, side * 0.13, 0.03, 0.165);
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
  strap.scale.set(0.3, 0.2, 0.28);
  sash.add(strap);

  // Sacoche en cuir sur la hanche gauche, côté dos, boucle en laiton
  const satchel = new Group();
  satchel.position.set(0.1, 0.05, -0.2);
  satchel.rotation.y = Math.PI - 0.45;
  torso.add(satchel);
  const bag = part(new RoundedBoxGeometry(0.22, 0.18, 0.09, 3, 0.03), LOOK.leather);
  satchel.add(bag);
  const flap = part(new RoundedBoxGeometry(0.215, 0.1, 0.03, 2, 0.012), LOOK.leatherDark, 0, 0.045, 0.045);
  satchel.add(flap);
  const clasp = part(new RoundedBoxGeometry(0.045, 0.045, 0.015, 1, 0.006), LOOK.brass, 0, 0.0, 0.065);
  satchel.add(clasp);
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
  buildTorso(torso);
  // Lampe torche clipsée au bout de la bandoulière, sur la hanche gauche, lentille vers le bas
  const torchClip = buildTorch();
  torchClip.position.set(0.215, 0.1, 0.07);
  torchClip.rotation.set(0.15, 0.6, 0.12);
  torso.add(torchClip);

  const head = new Group();
  head.position.y = 0.46;
  torso.add(head);
  const { lens, headlamp } = buildHead(head);

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

  // Outils dans la main droite. L'opératrice regarde +Z : sa droite est du côté −X (bras d'indice 0).
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
  return { root, body, head, hips, torso, legs, arms, gun, magazine, wrench, holster, trail, torchClip, torch, torchLens, beam, headlamp, lens, droppedMag, dropped: { active: false, y: 0, vy: 0 } };
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
const HEAD_TILT = -0.16;

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
  const bob = moving ? Math.abs(c) * (running ? 0.06 : 0.04) : Math.sin(performance.now() / 650) * 0.006;
  rig.hips.position.y = smooth(rig.hips.position.y, HIP_HEIGHT - crouchDrop + bob - step * 0.04, 16, dt);
  const lean = running ? 0.2 : crouch ? 0.28 : moving ? 0.05 : 0;
  const kick = weapon === 1 && a.shotTime > 0 ? a.shotTime * 0.25 : 0;
  rig.torso.rotation.x = smooth(rig.torso.rotation.x, lean - kick - glare * 0.22 + step * 0.12, 14, dt);
  rig.torso.rotation.y = smooth(rig.torso.rotation.y, (moving ? s * 0.1 : 0) + (strike ? strike.twist : 0), strike ? 30 : 10, dt);
  rig.torso.rotation.z = smooth(rig.torso.rotation.z, moving ? c * (running ? 0.05 : 0.035) : 0, 10, dt);
  // La grosse tête compense l'inclinaison et dodeline un peu
  rig.head.rotation.x = smooth(rig.head.rotation.x, HEAD_TILT - lean * 0.7 + glare * 0.12, 10, dt);
  rig.head.rotation.z = smooth(rig.head.rotation.z, moving ? -c * 0.04 : 0, 8, dt);
  rig.head.rotation.y = smooth(rig.head.rotation.y, strike ? -strike.twist * 0.5 : 0, 20, dt);

  // Lampe frontale poussée à fond pendant l'éblouissement, torche brandie, lentilles qui pulsent
  const pulse = 1 + glare * (0.6 + 0.25 * Math.sin(performance.now() / 25));
  rig.headlamp.intensity = LAMP_INTENSITY * (1 + 3 * glare);
  rig.headlamp.angle = LAMP_ANGLE + 0.38 * glare;
  rig.lens.scale.setScalar(pulse);
  rig.torch.visible = glare > 0;
  rig.torchClip.visible = glare <= 0;
  rig.torchLens.scale.setScalar(pulse);
  (rig.beam.material as MeshBasicMaterial).opacity = 0.26 * glare * (0.85 + 0.15 * Math.sin(performance.now() / 25));

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
}
