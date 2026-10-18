// Zombies : port de enemy.gd sur le plan XZ (patrouille, ouïe, poursuite, recherche, retour, recul du rampant).
// Navigation : graphe des salles relié par les portes ouvertes (DOORS), parcours en largeur jusqu'à la salle visée.
import { Group, type Mesh, type Texture } from "three";
import { moveCircle, resolveCircle, segmentClear } from "./collision";
import { DOORS, ENEMIES, ROOMS, type Door, type EnemySpawn } from "./level";
import type { AimCandidate } from "./aim";
import type { Horde, HordeContext, RayHit } from "./types";
import type { SiloState } from "./state";
import { COMFORT } from "./comfort";
import { blobTexture } from "./render/textures";
import { decal } from "./render/props";
import { animateZombie, buildZombie, setZombieQuality, type ZombieAnimation, type ZombieKind, type ZombieRig } from "./render/zombie";

export type ZombieMode = "patrol" | "investigate" | "search" | "chase" | "retreat" | "return";

/** Réglages par type (vitesses en m/s, portées en m, temps en s). */
export const ZOMBIE = {
  walker: { health: 65, radius: 0.38, hitRadius: 0.45, patrol: 1.1, wander: 1.5, chase: 2.3, retreat: 2.3, sight: 17, reach: 1.3, damage: 7, cooldown: 1.6, hearing: 1 },
  crawler: { health: 35, radius: 0.32, hitRadius: 0.4, patrol: 1.5, wander: 2.3, chase: 3.6, retreat: 4.5, sight: 10, reach: 1.4, damage: 9, cooldown: 1.25, hearing: 1.4 },
} as const;

/** Au-delà de cette distance du joueur, le zombie ne réfléchit pas (port du seuil 45 m de enemy.gd). */
const ACTIVE_RANGE = 45;
const SENSE_PERIOD = 0.2;
const CROUCH_SIGHT = 0.6;
const INVESTIGATE_TIME = 7;
/** Distance parcourue au-delà d'une porte avant de viser la suite. */
const DOOR_PAST = 1.2;
const DOOR_APPROACH = 0.7;
/** Écart latéral toléré avant de franchir une porte (> 0,4 m, la tolérance d'arrivée à un point). */
const DOOR_ALIGN = 0.45;
/** Recul : part de la poussée restante parcourue par seconde (exponentiel, ≈ 99 % en 0,35 s). */
const PUSH_RATE = 14;
/** Arrêt sur image le plus long accepté (s). */
const FREEZE_MAX = 0.2;
/** Sommet de la tête (m) par type, pour les étoiles d'étourdissement. */
const HEAD_HEIGHT = { walker: 1.85, crawler: 0.95 } as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface Zombie {
  readonly id: string;
  readonly kind: ZombieKind;
  readonly spawn: EnemySpawn;
  x: number;
  z: number;
  /** Lacet : l'avant est (sin yaw, cos yaw). */
  yaw: number;
  health: number;
  mode: ZombieMode;
  alive: boolean;
  stunned: number;
  patrolIndex: number;
  destX: number;
  destZ: number;
  lastX: number;
  lastZ: number;
  searchRemaining: number;
  senseRemaining: number;
  attackRemaining: number;
  seesTarget: boolean;
  hit: number;
  attackVisual: number;
  stride: number;
  speed: number;
  /** Secondes depuis la mort, −1 si vivant. */
  dead: number;
  stuck: number;
  /** Arrêt sur image restant (s) : ni déplacement, ni animation. */
  freeze: number;
  /** Recul restant à parcourir (m). */
  pushX: number;
  pushZ: number;
  room: number;
  waypointX: number;
  waypointZ: number;
  rig: ZombieRig | null;
  shadow: Mesh | null;
  candidate: AimCandidate;
}

export interface HordeOptions {
  /** Faux pour les tests : aucun maillage n'est construit. */
  visuals?: boolean;
}

/** Horde + accès en lecture aux zombies (tests, débogage). */
export interface ZombieHorde extends Horde {
  readonly zombies: readonly Zombie[];
  get(id: string): Zombie | undefined;
}

// ——— Graphe des salles ———

const links: { door: number; to: number }[][] = ROOMS.map(() => []);
const roomIndex = new Map(ROOMS.map((r, i) => [r.id, i]));
DOORS.forEach((door, i) => {
  const a = roomIndex.get(door.rooms[0])!;
  const b = roomIndex.get(door.rooms[1])!;
  links[a].push({ door: i, to: b });
  links[b].push({ door: i, to: a });
});
const prevRoom = new Int16Array(ROOMS.length);
const prevDoor = new Int16Array(ROOMS.length);
const queue = new Int16Array(ROOMS.length);
let nextRoom = -1;

/** Indice de la salle contenant (x, z), −1 hors plan. */
export function roomIndexAt(x: number, z: number): number {
  for (let i = 0; i < ROOMS.length; i++) {
    const r = ROOMS[i];
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return i;
  }
  return -1;
}

/** Première porte du plus court chemin (portes ouvertes seulement) ; −1 sans chemin. Renseigne `nextRoom`. */
export function firstDoor(from: number, to: number, doorOpen: (id: string) => boolean): number {
  if (from < 0 || to < 0 || from >= ROOMS.length || to >= ROOMS.length) return -1;
  prevRoom.fill(-1);
  prevRoom[from] = from;
  let head = 0;
  let tail = 0;
  queue[tail++] = from;
  while (head < tail) {
    const room = queue[head++];
    if (room === to) break;
    for (const link of links[room]) {
      if (prevRoom[link.to] !== -1 || !doorOpen(DOORS[link.door].id)) continue;
      prevRoom[link.to] = room;
      prevDoor[link.to] = link.door;
      queue[tail++] = link.to;
    }
  }
  if (prevRoom[to] === -1) return -1;
  let room = to;
  while (prevRoom[room] !== from) room = prevRoom[room];
  nextRoom = room;
  return prevDoor[room];
}

function roomCenter(index: number, axis: "x" | "z"): number {
  const r = ROOMS[index];
  return axis === "x" ? (r.x0 + r.x1) / 2 : (r.z0 + r.z1) / 2;
}

// ——— Horde ———

export function createHorde(state: SiloState, options: HordeOptions = {}): ZombieHorde {
  const visuals = options.visuals ?? true;
  const root = new Group();
  root.name = "Horde";
  let current = state;
  let shadowTexture: Texture | null = null;
  let low = false;
  let time = 0;
  let dormant = false;
  // Dernière position connue du joueur (pour « ils savent où vous êtes » après un impact).
  let playerX = state.playerPosition[0];
  let playerZ = state.playerPosition[2];
  const anim: ZombieAnimation = { speed: 0, stride: 0, eye: "calm", alert: false, attack: 0, hit: 0, stunned: false, dormant: false, dead: -1, time: 0 };
  const candidates: AimCandidate[] = [];

  const zombies: Zombie[] = ENEMIES.map((spawn, i) => {
    const z: Zombie = {
      id: spawn.id, kind: spawn.kind, spawn, x: spawn.x, z: spawn.z, yaw: 0, health: 0, mode: "patrol", alive: true,
      stunned: 0, patrolIndex: 0, destX: 0, destZ: 0, lastX: 0, lastZ: 0, searchRemaining: 0, senseRemaining: i * 0.033,
      attackRemaining: 0, seesTarget: false, hit: 0, attackVisual: 0, stride: i * 1.7, speed: 0, dead: -1, stuck: 0,
      freeze: 0, pushX: 0, pushZ: 0, room: -1, waypointX: spawn.x, waypointZ: spawn.z, rig: null, shadow: null, candidate: { id: spawn.id, x: spawn.x, z: spawn.z },
    };
    if (visuals) {
      z.rig = buildZombie(spawn.kind);
      root.add(z.rig.root);
      z.shadow = makeShadow(spawn.kind);
    }
    reset(z);
    return z;
  });
  const byId = new Map(zombies.map((z) => [z.id, z]));

  function makeShadow(kind: ZombieKind): Mesh | null {
    // La texture d'ombre est dessinée sur un canvas : absente hors navigateur.
    if (typeof document === "undefined") return null;
    shadowTexture ??= blobTexture("shadow");
    const size = kind === "walker" ? 1.15 : 1.0;
    return decal(root, shadowTexture, 0, 0, size, kind === "walker" ? size : size * 1.3, 0, 0.021);
  }

  function reset(z: Zombie): void {
    const spec = ZOMBIE[z.kind];
    z.x = z.spawn.x;
    z.z = z.spawn.z;
    z.health = spec.health;
    z.mode = "patrol";
    z.alive = true;
    z.dead = -1;
    z.stunned = z.hit = z.attackRemaining = z.attackVisual = z.searchRemaining = z.stuck = z.speed = 0;
    z.freeze = z.pushX = z.pushZ = 0;
    z.patrolIndex = 0;
    z.seesTarget = false;
    const first = z.spawn.patrol[0] ?? [z.spawn.x, z.spawn.z];
    const second = z.spawn.patrol[1] ?? first;
    z.destX = first[0];
    z.destZ = first[1];
    z.lastX = z.x;
    z.lastZ = z.z;
    z.yaw = Math.atan2(second[0] - z.x, second[1] - z.z) || 0;
    z.room = roomIndexAt(z.x, z.z);
    if (z.rig) {
      z.rig.root.visible = true;
      z.rig.root.position.set(z.x, 0, z.z);
      z.rig.root.rotation.y = z.yaw;
      z.rig.root.scale.setScalar(1);
      z.rig.body.rotation.set(0, 0, 0);
      z.rig.body.scale.setScalar(z.rig.scale);
    }
    if (z.shadow) {
      z.shadow.visible = true;
      z.shadow.position.set(z.x, 0.021, z.z);
    }
  }

  function hear(z: Zombie, x: number, zz: number, radius: number): void {
    if (!z.alive || dormant) return;
    if (Math.hypot(z.x - x, z.z - zz) > radius * ZOMBIE[z.kind].hearing) return;
    if (z.mode !== "chase") {
      z.mode = "investigate";
      z.destX = z.lastX = x;
      z.destZ = z.lastZ = zz;
      z.searchRemaining = INVESTIGATE_TIME;
      z.stuck = 0;
    }
  }

  function sense(z: Zombie, ctx: HordeContext): void {
    const spec = ZOMBIE[z.kind];
    const ox = ctx.player.x - z.x;
    const oz = ctx.player.z - z.z;
    const distance = Math.hypot(ox, oz);
    const dot = distance > 1e-6 ? (Math.sin(z.yaw) * ox + Math.cos(z.yaw) * oz) / distance : 1;
    const inCone = distance < 3 || dot > 0.15 || z.mode === "chase";
    const range = spec.sight * (ctx.player.crouched ? CROUCH_SIGHT : 1);
    z.seesTarget = ctx.player.alive && inCone && distance < range && segmentClear(z.x, z.z, ctx.player.x, ctx.player.z, ctx.colliders);
    if (z.seesTarget && z.mode !== "retreat") {
      z.mode = "chase";
      z.lastX = ctx.player.x;
      z.lastZ = ctx.player.z;
      z.searchRemaining = 5;
    } else if (z.mode === "chase" && !z.seesTarget) {
      z.mode = "search";
      z.destX = z.lastX;
      z.destZ = z.lastZ;
    }
  }

  function backToPatrol(z: Zombie): void {
    z.mode = "return";
    const p = z.spawn.patrol[z.patrolIndex];
    z.destX = p ? p[0] : z.spawn.x;
    z.destZ = p ? p[1] : z.spawn.z;
    z.stuck = 0;
  }

  /** Cerveau (port de _step_brain) : retourne la vitesse voulue et fixe la destination. */
  function brain(z: Zombie, ctx: HordeContext, dt: number): number {
    const spec = ZOMBIE[z.kind];
    let speed: number = spec.wander;
    switch (z.mode) {
      case "patrol": {
        speed = spec.patrol;
        const patrol = z.spawn.patrol;
        if (patrol.length > 0 && (Math.hypot(z.x - z.destX, z.z - z.destZ) < 0.7 || z.stuck > 2.5)) {
          z.patrolIndex = (z.patrolIndex + 1) % patrol.length;
          z.destX = patrol[z.patrolIndex][0];
          z.destZ = patrol[z.patrolIndex][1];
          z.stuck = 0;
        }
        break;
      }
      case "chase": {
        z.destX = ctx.player.x;
        z.destZ = ctx.player.z;
        speed = spec.chase;
        const distance = Math.hypot(ctx.player.x - z.x, ctx.player.z - z.z);
        if (z.seesTarget && distance < spec.reach) {
          speed = 0;
          z.yaw = Math.atan2(ctx.player.x - z.x, ctx.player.z - z.z);
          if (z.attackRemaining <= 0 && ctx.player.alive) {
            ctx.damagePlayer(spec.damage);
            z.attackRemaining = spec.cooldown;
            z.attackVisual = 1;
            if (z.kind === "crawler") {
              const away = distance > 1e-6 ? 1 / distance : 0;
              z.mode = "retreat";
              z.destX = z.x + (z.x - ctx.player.x) * away * 4;
              z.destZ = z.z + (z.z - ctx.player.z) * away * 4;
              z.searchRemaining = 1.3;
            }
          }
        }
        break;
      }
      case "investigate":
      case "search":
        z.searchRemaining -= dt;
        if (z.searchRemaining <= 0 || z.stuck > 3) backToPatrol(z);
        break;
      case "retreat":
        speed = spec.retreat;
        z.searchRemaining -= dt;
        if (z.searchRemaining <= 0) {
          z.mode = "search";
          z.destX = z.lastX;
          z.destZ = z.lastZ;
          z.searchRemaining = 4;
        }
        break;
      case "return":
        if (Math.hypot(z.x - z.destX, z.z - z.destZ) < 0.8 || z.stuck > 3) {
          z.mode = "patrol";
          z.stuck = 0;
        }
        break;
    }
    return speed;
  }

  /** Point de passage vers la destination : direct dans la même salle, sinon par la prochaine porte ouverte. */
  function route(z: Zombie, ctx: HordeContext): boolean {
    const here = roomIndexAt(z.x, z.z);
    if (here >= 0) z.room = here;
    const from = z.room;
    const to = roomIndexAt(z.destX, z.destZ);
    z.waypointX = z.destX;
    z.waypointZ = z.destZ;
    if (from < 0 || to < 0 || from === to) {
      if (from >= 0) leaveDoorway(z, from, -1);
      return true;
    }
    const index = firstDoor(from, to, ctx.doorOpen);
    if (index < 0) {
      z.waypointX = z.x;
      z.waypointZ = z.z;
      return false;
    }
    if (leaveDoorway(z, from, index)) return true;
    const door: Door = DOORS[index];
    // « x » : mur est-ouest, on traverse selon Z ; « z » : mur nord-sud, on traverse selon X.
    const crossX = door.axis === "z";
    const dir = Math.sign(roomCenter(nextRoom, crossX ? "x" : "z") - (crossX ? door.x : door.z)) || 1;
    const along = crossX ? z.x - door.x : z.z - door.z;
    const lateral = crossX ? z.z - door.z : z.x - door.x;
    // Couloir de passage : un large passage (place extérieure) se traverse tout droit, une porte étroite par son milieu.
    const lane = Math.max(0, door.width / 2 - ZOMBIE[z.kind].radius - 0.05);
    const side = lane > DOOR_ALIGN * 2 ? clamp(lateral, -(lane - DOOR_ALIGN), lane - DOOR_ALIGN) : 0;
    // Pas encore aligné : point d'approche devant la porte. Le seuil dépasse la tolérance d'arrivée (0,4 m)
    // pour qu'un zombie arrivé au point d'approche passe toujours à la suite.
    const offset = along * dir < 0 && Math.abs(lateral - side) > DOOR_ALIGN ? -DOOR_APPROACH : DOOR_PAST;
    z.waypointX = crossX ? door.x + dir * offset : door.x + side;
    z.waypointZ = crossX ? door.z + side : door.z + dir * offset;
    return true;
  }

  /**
   * Un zombie qui vient de franchir une porte a le corps encore dans l'embrasure : s'il file de biais vers
   * une cible loin sur le côté, il se coince contre le montant. On le fait d'abord entrer dans la salle.
   * `except` : porte qu'il s'apprête justement à franchir.
   */
  function leaveDoorway(z: Zombie, room: number, except: number): boolean {
    const radius = ZOMBIE[z.kind].radius;
    for (const link of links[room]) {
      if (link.door === except) continue;
      const door = DOORS[link.door];
      const crossX = door.axis === "z";
      const along = crossX ? z.x - door.x : z.z - door.z;
      const lateral = crossX ? z.z - door.z : z.x - door.x;
      if (Math.abs(along) > radius + 0.15 || Math.abs(lateral) > door.width / 2) continue;
      // Cible dans l'axe de l'ouverture : la ligne droite passe, rien à faire.
      const targetLateral = crossX ? z.waypointZ - door.z : z.waypointX - door.x;
      if (Math.abs(targetLateral) <= door.width / 2) return false;
      const inward = Math.sign(roomCenter(room, crossX ? "x" : "z") - (crossX ? door.x : door.z)) || 1;
      const lane = Math.max(0, door.width / 2 - radius - 0.05);
      const side = clamp(lateral, -lane, lane);
      z.waypointX = crossX ? door.x + inward * DOOR_PAST : door.x + side;
      z.waypointZ = crossX ? door.z + side : door.z + inward * DOOR_PAST;
      return true;
    }
    return false;
  }

  function step(z: Zombie, ctx: HordeContext, dt: number): void {
    const spec = ZOMBIE[z.kind];
    z.stunned = Math.max(0, z.stunned - dt);
    z.attackRemaining = Math.max(0, z.attackRemaining - dt);
    let speed = 0;
    if (z.stunned <= 0) {
      z.senseRemaining -= dt;
      if (z.senseRemaining <= 0) {
        z.senseRemaining = SENSE_PERIOD;
        sense(z, ctx);
      }
      // Mode moins effrayant : mordus plus lents (simple multiplicateur, 1 par défaut).
      speed = brain(z, ctx, dt) * COMFORT.zombiePace;
    }
    if (speed > 0 && route(z, ctx)) {
      const dx = z.waypointX - z.x;
      const dz = z.waypointZ - z.z;
      const length = Math.hypot(dx, dz);
      if (length < 0.4) speed = 0;
      else {
        const target = Math.atan2(dx, dz);
        let diff = (target - z.yaw) % (Math.PI * 2);
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        z.yaw += diff * (1 - Math.exp(-7.5 * dt));
        const move = Math.min(speed * dt, length);
        const next = moveCircle(z.x, z.z, (dx / length) * move, (dz / length) * move, spec.radius, ctx.colliders);
        const moved = Math.hypot(next.x - z.x, next.z - z.z);
        z.stuck = moved < move * 0.25 ? z.stuck + dt : Math.max(0, z.stuck - dt);
        z.x = next.x;
        z.z = next.z;
        z.speed = moved / Math.max(dt, 1e-4);
        return;
      }
    } else if (speed > 0) {
      // Pas de chemin (porte fermée) : on attend, l'impatience ramène en patrouille.
      z.stuck += dt;
    }
    z.speed = 0;
  }

  /** Recul en cours : glisse le long des murs (moveCircle), jamais à travers. */
  function knock(z: Zombie, ctx: HordeContext, dt: number): void {
    const remaining = Math.hypot(z.pushX, z.pushZ);
    if (remaining <= 0) return;
    const k = remaining < 0.005 ? 1 : 1 - Math.exp(-PUSH_RATE * dt);
    const mx = z.pushX * k;
    const mz = z.pushZ * k;
    const next = moveCircle(z.x, z.z, mx, mz, ZOMBIE[z.kind].radius, ctx.colliders);
    z.x = next.x;
    z.z = next.z;
    z.pushX -= mx;
    z.pushZ -= mz;
    if (k === 1) z.pushX = z.pushZ = 0;
  }

  /** Les zombies s'écartent les uns des autres et du joueur. */
  function separate(ctx: HordeContext): void {
    for (let i = 0; i < zombies.length; i++) {
      const a = zombies[i];
      if (!a.alive) continue;
      let pushed = false;
      for (let j = i + 1; j < zombies.length; j++) {
        const b = zombies[j];
        if (!b.alive) continue;
        const min = ZOMBIE[a.kind].radius + ZOMBIE[b.kind].radius;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        if (d >= min) continue;
        const nx = d > 1e-6 ? dx / d : 1;
        const nz = d > 1e-6 ? dz / d : 0;
        const push = (min - d) / 2;
        a.x -= nx * push;
        a.z -= nz * push;
        b.x += nx * push;
        b.z += nz * push;
        pushed = true;
        const fixed = resolveCircle(b.x, b.z, ZOMBIE[b.kind].radius, ctx.colliders);
        b.x = fixed.x;
        b.z = fixed.z;
      }
      const min = ZOMBIE[a.kind].radius + 0.32;
      const dx = a.x - ctx.player.x;
      const dz = a.z - ctx.player.z;
      const d = Math.hypot(dx, dz);
      if (ctx.player.alive && d < min && d > 1e-6) {
        a.x += (dx / d) * (min - d);
        a.z += (dz / d) * (min - d);
        pushed = true;
      }
      if (pushed) {
        const fixed = resolveCircle(a.x, a.z, ZOMBIE[a.kind].radius, ctx.colliders);
        a.x = fixed.x;
        a.z = fixed.z;
      }
    }
  }

  function draw(z: Zombie, dt: number): void {
    const rig = z.rig;
    if (!rig) return;
    if (!z.alive && z.dead > 2) {
      rig.root.visible = false;
      if (z.shadow) z.shadow.visible = false;
      return;
    }
    const far = Math.hypot(z.x - playerX, z.z - playerZ) > 50;
    rig.root.visible = !far;
    if (z.shadow) {
      z.shadow.visible = !far;
      z.shadow.position.set(z.x, 0.021, z.z);
      const fade = z.alive ? 1 : Math.max(0.05, 1 - Math.max(0, z.dead - 1.5) / 0.45);
      z.shadow.scale.x = (z.kind === "walker" ? 1.15 : 1.0) * fade;
      z.shadow.scale.y = (z.kind === "walker" ? 1.15 : 1.3) * fade;
    }
    if (far) return;
    rig.root.position.set(z.x, 0, z.z);
    rig.root.rotation.y = z.yaw;
    anim.speed = z.speed;
    anim.stride = z.stride;
    anim.eye = z.mode === "chase" ? "chase" : "calm";
    anim.alert = z.mode === "investigate" || z.mode === "search";
    anim.attack = z.attackVisual;
    anim.hit = z.hit;
    anim.stunned = z.alive && z.stunned > 0;
    anim.dormant = dormant;
    anim.dead = z.dead;
    anim.time = time + z.stride * 0.01;
    animateZombie(rig, anim, dt);
  }

  const horde: ZombieHorde = {
    root,
    zombies,
    get: (id) => byId.get(id),

    update(dt, ctx) {
      time += dt;
      dormant = ctx.dormant;
      playerX = ctx.player.x;
      playerZ = ctx.player.z;
      for (const z of zombies) {
        // Arrêt sur image : le zombie reste figé dans sa pose d'impact (décompté au dessin).
        if (z.freeze > 0) {
          z.speed = 0;
          continue;
        }
        z.hit = Math.max(0, z.hit - dt);
        z.attackVisual = Math.max(0, z.attackVisual - dt / 0.4);
        if (z.pushX !== 0 || z.pushZ !== 0) knock(z, ctx, dt);
        if (!z.alive) {
          if (z.dead >= 0) z.dead += dt;
          continue;
        }
        if (dormant) {
          z.speed = 0;
          z.mode = "patrol";
          z.stunned = 0;
          continue;
        }
        if ((z.x - playerX) ** 2 + (z.z - playerZ) ** 2 > ACTIVE_RANGE * ACTIVE_RANGE) {
          z.speed = 0;
          continue;
        }
        step(z, ctx, dt);
        const rate = z.speed > 0.05 ? z.speed * (z.kind === "crawler" ? 7 : 5) : 1.2;
        z.stride += dt * rate;
      }
      if (!dormant) separate(ctx);
      for (const z of zombies) {
        z.candidate.x = z.x;
        z.candidate.z = z.z;
        const frozen = z.freeze > 0;
        if (frozen) z.freeze = Math.max(0, z.freeze - dt);
        draw(z, frozen ? 0 : dt);
      }
    },

    hearNoise(x, z, radius) {
      for (const zombie of zombies) hear(zombie, x, z, radius);
    },

    aimCandidates() {
      candidates.length = 0;
      if (dormant) return candidates;
      for (const z of zombies) if (z.alive) candidates.push(z.candidate);
      return candidates;
    },

    raycast(x, z, dx, dz, maxDistance): RayHit | null {
      let best: Zombie | null = null;
      let bestDistance = maxDistance;
      for (const zombie of zombies) {
        if (!zombie.alive) continue;
        const r = ZOMBIE[zombie.kind].hitRadius;
        const ox = zombie.x - x;
        const oz = zombie.z - z;
        const t = ox * dx + oz * dz;
        const d2 = ox * ox + oz * oz - t * t;
        if (d2 > r * r) continue;
        const half = Math.sqrt(r * r - d2);
        let hit = t - half;
        if (hit < 0) {
          if (t + half < 0) continue;
          hit = 0;
        }
        if (hit <= bestDistance) {
          best = zombie;
          bestDistance = hit;
        }
      }
      return best ? { id: best.id, distance: bestDistance, x: x + dx * bestDistance, z: z + dz * bestDistance } : null;
    },

    damage(id, amount, stun) {
      const z = byId.get(id);
      if (!z || !z.alive) return;
      z.health = Math.max(0, z.health - amount);
      z.stunned = Math.max(z.stunned, stun);
      z.hit = 0.18;
      hear(z, playerX, playerZ, 100);
      if (z.health <= 0) {
        z.alive = false;
        z.dead = 0;
        z.speed = 0;
        z.stunned = 0;
        current.markDefeated(z.id);
      }
    },

    push(id, dx, dz, distance, freeze = 0) {
      const z = byId.get(id);
      if (!z || dormant || !(distance > 0)) return;
      const length = Math.hypot(dx, dz);
      if (length < 1e-6) return;
      z.pushX += (dx / length) * distance;
      z.pushZ += (dz / length) * distance;
      z.freeze = Math.max(z.freeze, clamp(freeze, 0, FREEZE_MAX));
    },

    headHeight(id) {
      const z = byId.get(id);
      return z ? HEAD_HEIGHT[z.kind] : HEAD_HEIGHT.walker;
    },

    sync(next) {
      current = next;
      playerX = next.playerPosition[0];
      playerZ = next.playerPosition[2];
      for (const z of zombies) {
        reset(z);
        if (next.defeated.includes(z.id)) {
          z.alive = false;
          z.dead = 99;
          if (z.rig) z.rig.root.visible = false;
          if (z.shadow) z.shadow.visible = false;
        }
      }
    },

    setLowQuality(value) {
      low = value;
      for (const z of zombies) if (z.rig) setZombieQuality(z.rig, low);
    },
  };
  return horde;
}
