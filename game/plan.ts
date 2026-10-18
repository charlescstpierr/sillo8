// Plan de l'étage 1 pour le carnet, sans rendu : ce que l'héroïne connaît des pièces, des portes,
// des notes lues et de l'objectif en cours. Tout vient de level.ts ; le dessin est dans ui/PlanSketch.tsx.
import { DOORS, ENTRANCE_TRIGGER, INTERACTABLES, ROOMS, roomAt, type Door, type Room, type RoomId } from "./level";
import { doorOpen } from "./rules";
import type { SiloState } from "./state";

/** Noms courts écrits à la main sur le plan. */
export const ROOM_NAMES: Record<RoomId, string> = {
  plaza: "Entrée",
  exterior: "Dehors",
  security: "Sécurité",
  hub: "Hub",
  north: "Couloir",
  stairs: "Étage 2",
  west: "Couloir ouest",
  dorms: "Dortoirs",
  secret: "Cachette",
  storage: "Entrepôt",
  cafeteria: "Cafétéria",
  generator: "Génératrice",
  east: "Couloir est",
  control: "Contrôle",
  infirmary: "Infirmerie",
  workshop: "Atelier",
  greenhouse: "Serre",
};

/**
 * "current" : la pièce où l'on se tient ; "visited" : déjà parcourue ; "hint" : voisine d'une pièce
 * visitée (contour pointillé, sans nom). Les autres pièces ne figurent pas au plan.
 */
export type RoomState = "current" | "visited" | "hint";

export interface PlanRoom {
  room: Room;
  state: RoomState;
  name: string;
}

export interface PlanDoor {
  door: Door;
  locked: boolean;
}

export interface PlanMark {
  x: number;
  z: number;
  label: string;
  /** Pièce entière visée (cercle autour), plutôt qu'un objet précis (croix). */
  room?: RoomId;
}

export interface PlanModel {
  rooms: PlanRoom[];
  doors: PlanDoor[];
  /** Notes lues, à leur emplacement. */
  notes: { id: string; x: number; z: number }[];
  objective: PlanMark | null;
  player: { x: number; z: number; yaw: number; room: RoomId | null };
  /** Pièces connues / pièces de l'étage (la pièce cachée ne compte qu'une fois révélée). */
  known: number;
  total: number;
}

/** Cadre du plan, en mètres (toutes les pièces). */
export const PLAN_BOUNDS = {
  x0: Math.min(...ROOMS.map((r) => r.x0)),
  x1: Math.max(...ROOMS.map((r) => r.x1)),
  z0: Math.min(...ROOMS.map((r) => r.z0)),
  z1: Math.max(...ROOMS.map((r) => r.z1)),
};

const interactable = (id: string) => INTERACTABLES.find((d) => d.id === id);

function mark(id: string, label: string): PlanMark | null {
  const def = interactable(id);
  return def ? { x: def.x, z: def.z, label } : null;
}

function roomMark(id: RoomId, label: string): PlanMark {
  const r = ROOMS.find((room) => room.id === id)!;
  return { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2, label, room: id };
}

/** Lieu de l'objectif en cours (même ordre que SiloState.objective()), ou null s'il faut chercher. */
export function objectiveMark(s: SiloState): PlanMark | null {
  if (!s.has("entrance_explored")) return { x: ENTRANCE_TRIGGER.x, z: ENTRANCE_TRIGGER.z, label: "Porte de sécurité" };
  if (!s.has("generator_powered")) return mark("generator", "Génératrice");
  if (!s.has("hub_reached")) return roomMark("hub", "Hub central");
  if (!s.has("comms_repaired")) return s.has("radio_module") ? mark("comms", "Console radio") : mark("workbench", "Établi");
  if (!s.has("keycard")) {
    if (s.has("secret_revealed")) return mark("keycard", "Clé d'accès");
    if (s.has("secret_clue")) return mark("secret_wall", "Mur creux");
    return null;
  }
  if (!s.has("floor2")) return mark("stairs", "Accès étage 2");
  return null;
}

/** La pièce cachée n'existe sur le plan qu'une fois le mur creux tombé. */
function revealed(id: RoomId, s: SiloState): boolean {
  return id !== "secret" || s.has("secret_revealed");
}

export function buildPlan(s: SiloState): PlanModel {
  const [px, , pz] = s.playerPosition;
  const here = roomAt(px, pz)?.id ?? null;
  const visited = new Set<string>(s.visited);
  if (here) visited.add(here);
  const known = (id: RoomId) => visited.has(id) && revealed(id, s);

  const hints = new Set<RoomId>();
  for (const door of DOORS) {
    const [a, b] = door.rooms;
    if (known(a) && !known(b) && revealed(b, s)) hints.add(b);
    if (known(b) && !known(a) && revealed(a, s)) hints.add(a);
  }

  const rooms: PlanRoom[] = [];
  for (const room of ROOMS) {
    const state: RoomState | null = room.id === here && known(room.id) ? "current" : known(room.id) ? "visited" : hints.has(room.id) ? "hint" : null;
    if (state) rooms.push({ room, state, name: ROOM_NAMES[room.id] });
  }

  const doors: PlanDoor[] = DOORS.filter((d) => (known(d.rooms[0]) || known(d.rooms[1])) && revealed(d.rooms[0], s) && revealed(d.rooms[1], s)).map(
    (door) => ({ door, locked: !doorOpen(door, s) }),
  );

  const notes = INTERACTABLES.filter((d) => d.note && s.notes.includes(d.note)).map((d) => ({ id: d.note!, x: d.x, z: d.z }));

  return {
    rooms,
    doors,
    notes,
    objective: objectiveMark(s),
    player: { x: px, z: pz, yaw: s.playerYaw, room: here },
    known: ROOMS.filter((r) => known(r.id)).length,
    total: ROOMS.filter((r) => revealed(r.id, s)).length,
  };
}
