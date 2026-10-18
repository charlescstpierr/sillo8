// L'opérateur : petite exploratrice chibi en « pâte à modeler » — bonnet olive, veste moutarde à capuche,
// écharpe, sacoche en cuir en bandoulière, pantalon cargo et grosses bottes fourrées.
// Animations procédurales : marche, course, accroupi, tir et rechargement du D9.
import {
  BoxGeometry, CapsuleGeometry, CylinderGeometry, Group, Mesh, Object3D, SphereGeometry, SpotLight, TorusGeometry,
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
} as const;

export interface OperatorRig {
  root: Group;
  body: Group;
  head: Group;
  hips: Group;
  torso: Group;
  legs: { hip: Group; knee: Group }[];
  arms: { shoulder: Group; elbow: Group }[];
  gun: Group;
  magazine: Mesh;
  headlamp: SpotLight;
  lens: Mesh;
  /** Chargeur éjecté pendant le rechargement. */
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
  const headlamp = new SpotLight("#ffe6b0", 26, 11, 0.52, 0.65, 1.6);
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

  // D9 dans la main droite. L'opérateur regarde +Z : sa droite est du côté −X (bras d'indice 0).
  // Repère du pistolet : −Y = canon (dans l'axe de l'avant-bras), +Z = dessus de la culasse.
  const gun = new Group();
  gun.position.set(0, -FOREARM - 0.01, 0.0);
  arms[0].elbow.add(gun);
  const slide = part(new RoundedBoxGeometry(0.045, 0.24, 0.055, 2, 0.012), PALETTE.gun, 0, -0.09, 0.05);
  gun.add(slide);
  const grip = part(new RoundedBoxGeometry(0.04, 0.055, 0.1, 2, 0.012), PALETTE.gun, 0, 0.0, -0.005);
  gun.add(grip);
  const magazine = part(new BoxGeometry(0.032, 0.04, 0.06), PALETTE.steelDark, 0, 0.0, -0.06);
  gun.add(magazine);
  const muzzleTip = part(new CylinderGeometry(0.016, 0.016, 0.02, 8), PALETTE.amber, 0, -0.215, 0.05);
  muzzleTip.userData.noOutline = true;
  gun.add(muzzleTip);

  const droppedMag = part(new BoxGeometry(0.032, 0.06, 0.04), PALETTE.steelDark);
  droppedMag.visible = false;

  addOutline(root, 0.016);
  return { root, body, head, hips, torso, legs, arms, gun, magazine, headlamp, lens, droppedMag, dropped: { active: false, y: 0, vy: 0 } };
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
}

function smooth(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.exp(-rate * dt);
}

function window01(t: number, start: number, end: number): number {
  if (t <= start || t >= end) return 0;
  return Math.sin(((t - start) / (end - start)) * Math.PI);
}

const MAG_Z = -0.06;
/** Visage légèrement levé vers la caméra plongeante. */
const HEAD_TILT = -0.16;

export function animateOperator(rig: OperatorRig, a: OperatorAnimation, dt: number): void {
  const crouch = a.pose === "crouch" || a.pose === "crouch-walk";
  const running = a.pose === "run";
  const moving = a.pose !== "idle" && a.pose !== "crouch";
  const swing = moving ? (running ? 0.95 : crouch ? 0.4 : 0.65) : 0;
  const s = Math.sin(a.stride);
  const c = Math.cos(a.stride);

  // Jambes courtes : grands angles pour que la foulée reste lisible
  const crouchAngle = crouch ? 1.05 : 0;
  for (let i = 0; i < 2; i++) {
    const phase = i === 0 ? s : -s;
    const lift = Math.max(0, i === 0 ? -c : c);
    const hipTarget = -crouchAngle - phase * swing;
    const kneeTarget = crouchAngle * 2 + lift * swing * (running ? 1.5 : 1.1);
    rig.legs[i].hip.rotation.x = smooth(rig.legs[i].hip.rotation.x, hipTarget, 18, dt);
    rig.legs[i].knee.rotation.x = smooth(rig.legs[i].knee.rotation.x, kneeTarget, 18, dt);
  }

  // Hauteur du bassin : accroupi, rebond chibi de la foulée, respiration au repos
  const legReach = (THIGH + SHIN) * Math.cos(crouchAngle);
  const crouchDrop = crouch ? (THIGH + SHIN) - legReach : 0;
  const bob = moving ? Math.abs(c) * (running ? 0.06 : 0.04) : Math.sin(performance.now() / 650) * 0.006;
  rig.hips.position.y = smooth(rig.hips.position.y, HIP_HEIGHT - crouchDrop + bob, 16, dt);
  const lean = running ? 0.2 : crouch ? 0.28 : moving ? 0.05 : 0;
  rig.torso.rotation.x = smooth(rig.torso.rotation.x, lean - (a.shotTime > 0 ? a.shotTime * 0.45 : 0), 14, dt);
  rig.torso.rotation.y = smooth(rig.torso.rotation.y, moving ? s * 0.1 : 0, 10, dt);
  rig.torso.rotation.z = smooth(rig.torso.rotation.z, moving ? c * (running ? 0.05 : 0.035) : 0, 10, dt);
  // La grosse tête compense l'inclinaison et dodeline un peu
  rig.head.rotation.x = smooth(rig.head.rotation.x, HEAD_TILT - lean * 0.7, 10, dt);
  rig.head.rotation.z = smooth(rig.head.rotation.z, moving ? -c * 0.04 : 0, 8, dt);

  // Bras : gunArm tient le D9 (droite, −X), supportArm vient le stabiliser (gauche, +X).
  const [gunArm, supportArm] = rig.arms;
  const recoil = a.shotTime > 0 ? (a.shotTime / 0.18) * 0.45 : 0;
  const r = a.reload;
  if (r > 0) {
    // Rechargement : arme ramenée devant la poitrine et inclinée, la main gauche éjecte,
    // va chercher un chargeur à la ceinture, l'insère, puis arme la culasse.
    const raise = Math.min(1, r * 6, (1 - r) * 8);
    const fetch = window01(r, 0.18, 0.55);
    const insert = window01(r, 0.5, 0.82);
    const rack = window01(r, 0.82, 1);
    gunArm.shoulder.rotation.set(-0.6 * raise, 0.55 * raise, -0.15);
    gunArm.elbow.rotation.set(-1.75 * raise + rack * 0.3, 0, 0);
    rig.gun.rotation.z = -0.5 * raise;
    supportArm.shoulder.rotation.set(-0.25 - 1.0 * Math.max(insert, rack) + fetch * 0.4, -0.6 * Math.max(insert, rack), 0.3 * fetch + 0.15);
    supportArm.elbow.rotation.set(-0.5 - 1.1 * Math.max(insert, rack), 0, 0);
    rig.magazine.position.z = MAG_Z - 0.06 * window01(r, 0.05, 0.6);
    rig.magazine.visible = r < 0.15 || r > 0.55;
    if (r > 0.15 && !rig.dropped.active && rig.dropped.y === 0) {
      rig.dropped.active = true;
      rig.dropped.y = 1;
      rig.magazine.getWorldPosition(rig.droppedMag.position);
      rig.dropped.vy = 0;
      rig.droppedMag.visible = true;
    }
  } else {
    rig.dropped.y = 0;
    rig.magazine.visible = true;
    rig.magazine.position.z = MAG_Z;
    rig.gun.rotation.z = smooth(rig.gun.rotation.z, 0, 14, dt);
    if (a.aiming && !running) {
      // Posture de visée à deux mains, arme vers l'avant, recul au tir.
      gunArm.shoulder.rotation.x = smooth(gunArm.shoulder.rotation.x, -1.5 + recoil * 0.6, 24, dt);
      gunArm.shoulder.rotation.y = smooth(gunArm.shoulder.rotation.y, 0.3, 14, dt);
      gunArm.shoulder.rotation.z = smooth(gunArm.shoulder.rotation.z, 0, 14, dt);
      gunArm.elbow.rotation.x = smooth(gunArm.elbow.rotation.x, -0.08 - recoil, 28, dt);
      supportArm.shoulder.rotation.x = smooth(supportArm.shoulder.rotation.x, -1.3, 14, dt);
      supportArm.shoulder.rotation.y = smooth(supportArm.shoulder.rotation.y, -0.85, 14, dt);
      supportArm.shoulder.rotation.z = smooth(supportArm.shoulder.rotation.z, 0, 14, dt);
      supportArm.elbow.rotation.x = smooth(supportArm.elbow.rotation.x, -0.45, 14, dt);
    } else {
      // Balancier de marche ou de course, bras un peu écartés de la veste rembourrée.
      const armSwing = moving ? swing * 0.95 : 0;
      const bend = running ? -1.3 : -0.35;
      for (const [arm, phase, out] of [[gunArm, s, -0.3], [supportArm, -s, 0.3]] as const) {
        arm.shoulder.rotation.x = smooth(arm.shoulder.rotation.x, phase * armSwing - (running ? 0.3 : 0.05), 14, dt);
        arm.shoulder.rotation.y = smooth(arm.shoulder.rotation.y, 0, 14, dt);
        arm.shoulder.rotation.z = smooth(arm.shoulder.rotation.z, out, 14, dt);
        arm.elbow.rotation.x = smooth(arm.elbow.rotation.x, bend, 14, dt);
      }
    }
  }

  // Chargeur vide qui tombe au sol
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
