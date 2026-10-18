// L'opérateur : petit personnage low-poly arrondi en combinaison, casque à lampe frontale et sac à dos.
// Animations procédurales : marche, course, accroupi, tir et rechargement du D9.
import {
  CapsuleGeometry, CylinderGeometry, Group, Mesh, Object3D, SphereGeometry, SpotLight, TorusGeometry,
  BoxGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { addOutline, glow, toon } from "./toon";
import { PALETTE } from "./palette";
import type { Pose } from "../player";

const THIGH = 0.36;
const SHIN = 0.36;
const HIP_HEIGHT = 0.82;

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

function part(geometry: ConstructorParameters<typeof Mesh>[0], color: string, x = 0, y = 0, z = 0): Mesh {
  const mesh = new Mesh(geometry, toon(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function limb(parent: Object3D, length: number, radius: number, color: string): Mesh {
  const mesh = part(new CapsuleGeometry(radius, length - radius * 2, 4, 10), color, 0, -length / 2, 0);
  parent.add(mesh);
  return mesh;
}

export function buildOperator(): OperatorRig {
  const root = new Group();
  root.name = "Operator";
  const body = new Group();
  root.add(body);

  const hips = new Group();
  hips.position.y = HIP_HEIGHT;
  body.add(hips);

  // Jambes : cuisse + tibia + botte
  const legs: OperatorRig["legs"] = [];
  for (const side of [-1, 1]) {
    const hip = new Group();
    hip.position.set(side * 0.12, 0, 0);
    hips.add(hip);
    limb(hip, THIGH + 0.06, 0.1, PALETTE.jumpsuit);
    const knee = new Group();
    knee.position.y = -THIGH;
    hip.add(knee);
    limb(knee, SHIN, 0.09, PALETTE.jumpsuit);
    const boot = part(new RoundedBoxGeometry(0.17, 0.12, 0.27, 2, 0.05), PALETTE.boot, 0, -SHIN - 0.02, 0.04);
    knee.add(boot);
    legs.push({ hip, knee });
  }

  // Tronc
  const torso = new Group();
  torso.position.y = 0.05;
  hips.add(torso);
  const chest = part(new CapsuleGeometry(0.24, 0.26, 4, 12), PALETTE.jumpsuit, 0, 0.28, 0);
  chest.scale.set(1, 1, 0.82);
  torso.add(chest);
  const belt = part(new CylinderGeometry(0.235, 0.235, 0.07, 14), PALETTE.woodDark, 0, 0.06, 0);
  belt.scale.z = 0.82;
  torso.add(belt);
  const pouch = part(new RoundedBoxGeometry(0.12, 0.1, 0.06, 2, 0.02), PALETTE.backpack, 0.14, 0.06, 0.17);
  torso.add(pouch);
  const patch = part(new RoundedBoxGeometry(0.1, 0.07, 0.02, 1, 0.01), PALETTE.teal, -0.1, 0.4, 0.2);
  patch.userData.noOutline = true;
  torso.add(patch);
  // Sac à dos + duvet roulé
  const pack = part(new RoundedBoxGeometry(0.4, 0.44, 0.22, 3, 0.07), PALETTE.backpack, 0, 0.32, -0.27);
  torso.add(pack);
  const roll = part(new CapsuleGeometry(0.075, 0.3, 4, 10), PALETTE.fabric, 0, 0.58, -0.27);
  roll.rotation.z = Math.PI / 2;
  torso.add(roll);
  const flap = part(new RoundedBoxGeometry(0.3, 0.12, 0.05, 2, 0.02), PALETTE.leaf, 0, 0.44, -0.39);
  torso.add(flap);

  // Tête et casque à lampe frontale
  const head = new Group();
  head.position.y = 0.66;
  torso.add(head);
  const face = part(new SphereGeometry(0.2, 16, 12), PALETTE.skin, 0, 0.13, 0.01);
  head.add(face);
  const helmet = part(new SphereGeometry(0.245, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), PALETTE.helmet, 0, 0.15, 0);
  head.add(helmet);
  const brim = part(new TorusGeometry(0.235, 0.035, 6, 20), PALETTE.yellow, 0, 0.12, 0);
  brim.rotation.x = Math.PI / 2;
  head.add(brim);
  const lampBody = part(new CylinderGeometry(0.06, 0.07, 0.08, 12), PALETTE.steelDark, 0, 0.26, 0.2);
  lampBody.rotation.x = Math.PI / 2 - 0.25;
  head.add(lampBody);
  const lens = new Mesh(new CylinderGeometry(0.048, 0.048, 0.02, 12), glow("#fff2c4"));
  lens.position.set(0, 0.27, 0.245);
  lens.rotation.x = Math.PI / 2 - 0.25;
  lens.userData.noOutline = true;
  head.add(lens);
  for (const side of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(0.026, 8, 6), glow(PALETTE.outline));
    eye.position.set(side * 0.075, 0.1, 0.19);
    eye.userData.noOutline = true;
    head.add(eye);
  }
  const headlamp = new SpotLight("#ffe6b0", 26, 11, 0.52, 0.65, 1.6);
  headlamp.position.set(0, 0.27, 0.26);
  headlamp.castShadow = false;
  const lampTarget = new Object3D();
  lampTarget.position.set(0, -1.6, 3.4);
  head.add(lampTarget);
  headlamp.target = lampTarget;
  head.add(headlamp);

  // Bras : épaule + coude + main
  const arms: OperatorRig["arms"] = [];
  for (const side of [-1, 1]) {
    const shoulder = new Group();
    shoulder.rotation.order = "YXZ";
    shoulder.position.set(side * 0.29, 0.43, 0);
    torso.add(shoulder);
    limb(shoulder, 0.27, 0.075, PALETTE.jumpsuit);
    const elbow = new Group();
    elbow.position.y = -0.25;
    shoulder.add(elbow);
    limb(elbow, 0.24, 0.068, PALETTE.jumpsuitDark);
    const hand = part(new SphereGeometry(0.07, 10, 8), PALETTE.skin, 0, -0.25, 0);
    elbow.add(hand);
    arms.push({ shoulder, elbow });
  }

  // D9 dans la main droite. L'opérateur regarde +Z : sa droite est du côté −X (bras d'indice 0).
  const gun = new Group();
  gun.position.set(0, -0.27, 0.04);
  arms[0].elbow.add(gun);
  const slide = part(new RoundedBoxGeometry(0.07, 0.08, 0.3, 1, 0.015), PALETTE.gun, 0, 0, 0.1);
  slide.rotation.x = Math.PI / 2;
  slide.position.set(0, -0.08, 0.02);
  gun.add(slide);
  const magazine = part(new BoxGeometry(0.045, 0.12, 0.05), PALETTE.steelDark, 0, 0.0, -0.05);
  gun.add(magazine);
  const muzzleTip = part(new CylinderGeometry(0.02, 0.02, 0.03, 8), PALETTE.amber, 0, -0.22, 0.02);
  muzzleTip.userData.noOutline = true;
  gun.add(muzzleTip);

  const droppedMag = part(new BoxGeometry(0.05, 0.12, 0.05), PALETTE.steelDark);
  droppedMag.visible = false;

  addOutline(root, 0.02);
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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smooth(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.exp(-rate * dt);
}

function window01(t: number, start: number, end: number): number {
  if (t <= start || t >= end) return 0;
  return Math.sin(((t - start) / (end - start)) * Math.PI);
}

export function animateOperator(rig: OperatorRig, a: OperatorAnimation, dt: number): void {
  const crouch = a.pose === "crouch" || a.pose === "crouch-walk";
  const running = a.pose === "run";
  const moving = a.pose !== "idle" && a.pose !== "crouch";
  const swing = moving ? (running ? 0.85 : crouch ? 0.35 : 0.55) : 0;
  const s = Math.sin(a.stride);
  const c = Math.cos(a.stride);

  // Jambes
  const crouchAngle = crouch ? 1.0 : 0;
  for (let i = 0; i < 2; i++) {
    const phase = i === 0 ? s : -s;
    const lift = Math.max(0, i === 0 ? -c : c);
    const hipTarget = -crouchAngle - phase * swing;
    const kneeTarget = crouchAngle * 2 + lift * swing * (running ? 1.4 : 1.0);
    rig.legs[i].hip.rotation.x = smooth(rig.legs[i].hip.rotation.x, hipTarget, 18, dt);
    rig.legs[i].knee.rotation.x = smooth(rig.legs[i].knee.rotation.x, kneeTarget, 18, dt);
  }

  // Hauteur du bassin : accroupi, rebond de la foulée
  const legReach = (THIGH + SHIN) * Math.cos(crouchAngle);
  const crouchDrop = crouch ? (THIGH + SHIN) - legReach : 0;
  const bob = moving ? Math.abs(c) * (running ? 0.07 : 0.035) : Math.sin(performance.now() / 700) * 0.008;
  rig.hips.position.y = smooth(rig.hips.position.y, HIP_HEIGHT - crouchDrop + bob, 16, dt);
  const lean = running ? 0.22 : crouch ? 0.32 : moving ? 0.06 : 0;
  rig.torso.rotation.x = smooth(rig.torso.rotation.x, lean - (a.shotTime > 0 ? a.shotTime * 0.5 : 0), 14, dt);
  rig.torso.rotation.y = smooth(rig.torso.rotation.y, moving ? s * 0.08 : 0, 10, dt);
  rig.head.rotation.x = smooth(rig.head.rotation.x, -lean * 0.6, 10, dt);

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
    gunArm.shoulder.rotation.set(-0.55 * raise, 0.6 * raise, 0);
    gunArm.elbow.rotation.set(-1.9 * raise + rack * 0.3, 0, 0);
    rig.gun.rotation.z = -0.5 * raise;
    supportArm.shoulder.rotation.set(-0.2 - 0.9 * Math.max(insert, rack) + fetch * 0.35, -0.45 * Math.max(insert, rack), 0.25 * fetch);
    supportArm.elbow.rotation.set(-0.5 - 1.0 * Math.max(insert, rack), 0, 0);
    rig.magazine.position.y = -0.08 * window01(r, 0.05, 0.6);
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
    rig.magazine.position.y = 0;
    rig.gun.rotation.z = smooth(rig.gun.rotation.z, 0, 14, dt);
    if (a.aiming && !running) {
      // Posture de visée à deux mains, arme vers l'avant, recul au tir.
      gunArm.shoulder.rotation.x = smooth(gunArm.shoulder.rotation.x, -1.45 + recoil * 0.6, 24, dt);
      gunArm.shoulder.rotation.y = smooth(gunArm.shoulder.rotation.y, 0.16, 14, dt);
      gunArm.shoulder.rotation.z = smooth(gunArm.shoulder.rotation.z, 0, 14, dt);
      gunArm.elbow.rotation.x = smooth(gunArm.elbow.rotation.x, -0.08 - recoil, 28, dt);
      supportArm.shoulder.rotation.x = smooth(supportArm.shoulder.rotation.x, -1.25, 14, dt);
      supportArm.shoulder.rotation.y = smooth(supportArm.shoulder.rotation.y, -0.62, 14, dt);
      supportArm.shoulder.rotation.z = smooth(supportArm.shoulder.rotation.z, 0, 14, dt);
      supportArm.elbow.rotation.x = smooth(supportArm.elbow.rotation.x, -0.55, 14, dt);
    } else {
      // Balancier de marche ou de course, arme le long du corps.
      const armSwing = moving ? swing * 0.9 : 0;
      const bend = running ? -1.25 : -0.3;
      for (const [arm, phase, out] of [[gunArm, s, -0.1], [supportArm, -s, 0.1]] as const) {
        arm.shoulder.rotation.x = smooth(arm.shoulder.rotation.x, phase * armSwing - (running ? 0.25 : 0.05), 14, dt);
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
    if (rig.droppedMag.position.y <= 0.03) {
      rig.droppedMag.position.y = 0.03;
      rig.droppedMag.rotation.x = Math.PI / 2;
      rig.dropped.active = false;
    }
  }
}
