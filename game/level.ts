// SILLO 8 — étage 1, vu de dessus. Le nord est −Z (haut de l'écran). Unités en mètres.
// D'après la carte de l'étage 1 : hub central rond, aile ouest (dortoirs, entrepôt, cafétéria, génératrice),
// aile est (salle de contrôle, infirmerie, atelier, serre), sécurité et entrée au sud, zone extérieure au sud-est.
// Les murs intérieurs sont coupés à mi-hauteur (maison de poupée).
import type { Box } from "./collision";

export const WALL_HEIGHT = 1.6;
export const WALL_THICKNESS = 0.3;

export type RoomId =
  | "plaza" | "exterior" | "security" | "hub" | "north" | "stairs" | "west" | "dorms" | "secret"
  | "storage" | "cafeteria" | "generator" | "east" | "control" | "infirmary" | "workshop" | "greenhouse";

export interface Room {
  id: RoomId;
  sector: string;
  x0: number; x1: number; z0: number; z1: number;
  floor: "tiles" | "concrete" | "grate" | "dirt" | "metal";
  /** Extérieur : bords en rochers et grillages plutôt qu'en murs. */
  outdoor?: boolean;
}

export interface Wall { x0: number; z0: number; x1: number; z1: number; outdoor: boolean; }

export type LockKind = "power" | "key" | "secret" | "arc";

export interface Door {
  id: string;
  x: number; z: number;
  /** "x" : porte dans un mur est-ouest (on la traverse en suivant Z). "z" : mur nord-sud. */
  axis: "x" | "z";
  width: number;
  label: string;
  /** Salles reliées (navigation des zombies). */
  rooms: [RoomId, RoomId];
  /**
   * "power" : s'ouvre quand la génératrice tourne ; "key" : clé d'accès de l'étage 2 ;
   * "secret" : mur creux, ouvert en le poussant après avoir lu l'indice ; "arc" : verrou électrique (inutilisé).
   */
  lock?: LockKind;
  /** Passage large sans encadrement (entre deux zones extérieures, verrière brisée…). */
  open?: boolean;
}

export type InteractableKind = "components" | "ammo" | "cell" | "medkit" | "bandage" | "can";

export interface InteractableDef {
  id: string;
  name: string;
  action: string;
  x: number; z: number;
  /** Rayon de l'objet (collision et approche). */
  radius: number;
  kind?: InteractableKind;
  amount?: number;
  /** Les objets massifs bloquent le passage. Par défaut : tout sauf les ressources et les notes. */
  solid?: boolean;
  /** Note de survivant à lire (identifiant dans game/notes.ts). */
  note?: string;
}

export interface EnemySpawn {
  id: string;
  kind: "walker" | "crawler";
  x: number; z: number;
  /** Points de patrouille (dans la même salle). */
  patrol: [number, number][];
}

export const ROOMS: Room[] = [
  // Extérieur
  { id: "plaza", sector: "ENTRÉE (EXTÉRIEUR)", x0: -11, x1: 12, z0: 22, z1: 46, floor: "dirt", outdoor: true },
  { id: "exterior", sector: "ZONE EXTÉRIEURE", x0: 12, x1: 48, z0: 22, z1: 46, floor: "dirt", outdoor: true },
  // Centre
  { id: "security", sector: "SÉCURITÉ", x0: -5, x1: 5, z0: 7, z1: 22, floor: "tiles" },
  { id: "hub", sector: "HUB CENTRAL", x0: -7, x1: 7, z0: -7, z1: 7, floor: "metal" },
  { id: "north", sector: "HUB CENTRAL · COULOIR NORD", x0: -2, x1: 2, z0: -14, z1: -7, floor: "metal" },
  { id: "stairs", sector: "ACCÈS ÉTAGE 2", x0: -4, x1: 4, z0: -22, z1: -14, floor: "grate" },
  // Aile ouest
  { id: "west", sector: "COULOIR OUEST", x0: -11, x1: -7, z0: -20, z1: 20, floor: "concrete" },
  { id: "dorms", sector: "DORTOIRS", x0: -32, x1: -11, z0: -20, z1: -6, floor: "tiles" },
  { id: "secret", sector: "DORTOIRS · PIÈCE CACHÉE", x0: -37, x1: -32, z0: -18, z1: -10, floor: "concrete" },
  { id: "storage", sector: "ENTREPÔT", x0: -32, x1: -11, z0: -6, z1: 6, floor: "concrete" },
  { id: "cafeteria", sector: "CAFÉTÉRIA", x0: -32, x1: -11, z0: 6, z1: 20, floor: "tiles" },
  { id: "generator", sector: "GÉNÉRATRICE", x0: -32, x1: -11, z0: 20, z1: 32, floor: "grate" },
  // Aile est
  { id: "east", sector: "COULOIR EST", x0: 7, x1: 10, z0: -8, z1: 8, floor: "concrete" },
  { id: "control", sector: "SALLE DE CONTRÔLE", x0: 7, x1: 30, z0: -22, z1: -8, floor: "tiles" },
  { id: "infirmary", sector: "INFIRMERIE", x0: 10, x1: 22, z0: -8, z1: 8, floor: "tiles" },
  { id: "workshop", sector: "ATELIER", x0: 22, x1: 36, z0: -8, z1: 8, floor: "concrete" },
  { id: "greenhouse", sector: "SERRE", x0: 7, x1: 30, z0: 8, z1: 22, floor: "dirt" },
];

export const DOORS: Door[] = [
  // Dehors
  { id: "plaza_exterior", x: 12, z: 34, axis: "z", width: 24, label: "", rooms: ["plaza", "exterior"], open: true },
  { id: "plaza_security", x: 0, z: 22, axis: "x", width: 2.8, label: "SÉCURITÉ", rooms: ["plaza", "security"], lock: "power" },
  { id: "plaza_generator", x: -11, z: 27, axis: "z", width: 2.2, label: "GÉNÉRATRICE", rooms: ["plaza", "generator"] },
  { id: "exterior_greenhouse", x: 21, z: 22, axis: "x", width: 4, label: "SERRE", rooms: ["exterior", "greenhouse"], open: true },
  // Portes alimentées par la génératrice
  { id: "generator_cafeteria", x: -20, z: 20, axis: "x", width: 2.2, label: "CAFÉTÉRIA", rooms: ["generator", "cafeteria"], lock: "power" },
  { id: "greenhouse_east", x: 8.5, z: 8, axis: "x", width: 2.2, label: "COULOIR EST", rooms: ["greenhouse", "east"], lock: "power" },
  // Centre
  { id: "security_hub", x: 0, z: 7, axis: "x", width: 2.8, label: "HUB CENTRAL", rooms: ["security", "hub"] },
  { id: "hub_west", x: -7, z: 0, axis: "z", width: 2.8, label: "OUEST", rooms: ["hub", "west"] },
  { id: "hub_east", x: 7, z: 0, axis: "z", width: 2.8, label: "EST", rooms: ["hub", "east"] },
  { id: "hub_north", x: 0, z: -7, axis: "x", width: 2.8, label: "NORD", rooms: ["hub", "north"] },
  { id: "north_stairs", x: 0, z: -14, axis: "x", width: 2.8, label: "ACCÈS ÉTAGE 2", rooms: ["north", "stairs"], lock: "key" },
  // Aile ouest
  { id: "west_dorms", x: -11, z: -13, axis: "z", width: 2.2, label: "DORTOIRS", rooms: ["west", "dorms"] },
  { id: "west_storage", x: -11, z: 0, axis: "z", width: 2.2, label: "ENTREPÔT", rooms: ["west", "storage"] },
  { id: "west_cafeteria", x: -11, z: 13, axis: "z", width: 2.2, label: "CAFÉTÉRIA", rooms: ["west", "cafeteria"] },
  { id: "dorms_secret", x: -32, z: -14, axis: "z", width: 1.8, label: "", rooms: ["dorms", "secret"], lock: "secret" },
  // Aile est
  { id: "east_infirmary", x: 10, z: 0, axis: "z", width: 2.2, label: "INFIRMERIE", rooms: ["east", "infirmary"] },
  { id: "east_control", x: 8.5, z: -8, axis: "x", width: 2.2, label: "SALLE DE CONTRÔLE", rooms: ["east", "control"] },
  { id: "infirmary_workshop", x: 22, z: 0, axis: "z", width: 2.2, label: "ATELIER", rooms: ["infirmary", "workshop"] },
];

/** Mur creux des dortoirs, devant la pièce cachée. */
export const SECRET = { x: -32, z: -14 };
/** On a « exploré l'entrée » en approchant de la porte de sécurité. */
export const ENTRANCE_TRIGGER = { x: 0, z: 27, radius: 6 };

export const INTERACTABLES: InteractableDef[] = [
  // Objectifs
  { id: "security_door", name: "Porte de sécurité", action: "Hors tension · trouver la génératrice", x: 0, z: 23.4, radius: 0.5, solid: false },
  { id: "generator", name: "Génératrice", action: "Alimenter · 3 pièces", x: -22, z: 26, radius: 1.4 },
  { id: "workbench", name: "Établi", action: "Fabriquer un module radio · 2 ferrailles", x: 29, z: -6, radius: 0.9 },
  { id: "nail_press", name: "Presse à clous", action: "1 ferraille → 16 clous", x: 25, z: -6.5, radius: 0.6 },
  { id: "upgrade", name: "Banc de batteries", action: "Améliorer la lampe · 3 ferrailles", x: 33.5, z: 4, radius: 0.7 },
  { id: "comms", name: "Console radio", action: "Réparer la communication", x: 18, z: -19.5, radius: 0.9 },
  { id: "secret_wall", name: "Mur creux", action: "Pousser", x: -31.4, z: -14, radius: 0.4, solid: false },
  { id: "keycard", name: "Clé d'accès", action: "Prendre", x: -35, z: -14, radius: 0.4, solid: false },
  { id: "stairs", name: "Accès étage 2", action: "Descendre", x: 0, z: -19, radius: 0.9 },
  { id: "recharge", name: "Borne de recharge", action: "Recharger la lampe · gratuit", x: 3.6, z: 11, radius: 0.5 },
  // Notes des survivants (carnet d'indices)
  { id: "note_entrance", name: "Note", action: "Lire", x: -8, z: 30, radius: 0.35, solid: false, note: "note_entrance" },
  { id: "note_generator", name: "Note", action: "Lire", x: -29, z: 23.5, radius: 0.35, solid: false, note: "note_generator" },
  { id: "note_cafeteria", name: "Note", action: "Lire", x: -15, z: 9, radius: 0.35, solid: false, note: "note_cafeteria" },
  { id: "note_infirmary", name: "Note", action: "Lire", x: 13, z: -6, radius: 0.35, solid: false, note: "note_infirmary" },
  { id: "note_control", name: "Note", action: "Lire", x: 25, z: -12, radius: 0.35, solid: false, note: "note_control" },
  { id: "note_storage", name: "Note", action: "Lire", x: -29, z: -4, radius: 0.35, solid: false, note: "note_storage" },
  { id: "note_secret", name: "Note", action: "Lire", x: -36, z: -11, radius: 0.35, solid: false, note: "note_secret" },
  // Pièces (3 dehors pour la génératrice, puis à l'intérieur)
  { id: "part_0", name: "Ferraille", action: "Ramasser", x: -6, z: 36, radius: 0.35, kind: "components" },
  { id: "part_1", name: "Ferraille", action: "Ramasser", x: 25, z: 35, radius: 0.35, kind: "components" },
  { id: "part_2", name: "Ferraille", action: "Ramasser", x: 41, z: 28, radius: 0.35, kind: "components" },
  { id: "part_3", name: "Ferraille", action: "Ramasser", x: 18, z: 14, radius: 0.35, kind: "components" },
  { id: "part_4", name: "Ferraille", action: "Ramasser", x: -27, z: 10, radius: 0.35, kind: "components" },
  { id: "part_5", name: "Ferraille", action: "Ramasser", x: -24, z: -2, radius: 0.35, kind: "components" },
  { id: "part_6", name: "Ferraille", action: "Ramasser", x: 26, z: 5, radius: 0.35, kind: "components" },
  { id: "part_7", name: "Ferraille", action: "Ramasser", x: -16, z: -17, radius: 0.35, kind: "components" },
  // Ressources
  { id: "ammo_1", name: "Boîte de clous", action: "Ramasser", x: 8, z: 39, radius: 0.35, kind: "ammo", amount: 16 },
  { id: "ammo_2", name: "Boîte de clous", action: "Ramasser", x: -3, z: 18, radius: 0.35, kind: "ammo", amount: 16 },
  { id: "ammo_3", name: "Boîte de clous", action: "Ramasser", x: -15, z: 3, radius: 0.35, kind: "ammo", amount: 16 },
  { id: "cell_1", name: "Pile", action: "Ramasser", x: -28, z: 30, radius: 0.35, kind: "cell", amount: 1 },
  { id: "cell_2", name: "Pile", action: "Ramasser", x: -20, z: 15, radius: 0.35, kind: "cell", amount: 1 },
  { id: "cell_3", name: "Pile", action: "Ramasser", x: 19, z: 4, radius: 0.35, kind: "cell", amount: 1 },
  { id: "med_1", name: "Bandage", action: "Ramasser", x: 12, z: 18, radius: 0.35, kind: "bandage", amount: 1 },
  { id: "med_2", name: "Trousse de soins", action: "Ramasser", x: 15, z: -4, radius: 0.35, kind: "medkit", amount: 1 },
  { id: "med_3", name: "Bandage", action: "Ramasser", x: -21, z: -17, radius: 0.35, kind: "bandage", amount: 1 },
  { id: "can_1", name: "Conserve", action: "Ramasser", x: -24, z: 17, radius: 0.35, kind: "can", amount: 1 },
  { id: "can_2", name: "Conserve", action: "Ramasser", x: -2, z: 33, radius: 0.35, kind: "can", amount: 1 },
  { id: "can_3", name: "Conserve", action: "Ramasser", x: -27, z: 4, radius: 0.35, kind: "can", amount: 1 },
];

export const ENEMIES: EnemySpawn[] = [
  { id: "walker_ext", kind: "walker", x: 32, z: 38, patrol: [[32, 38], [38, 32], [28, 30]] },
  { id: "crawler_ext", kind: "crawler", x: 40, z: 40, patrol: [[40, 40], [44, 34], [36, 42]] },
  { id: "walker_gen", kind: "walker", x: -16, z: 29, patrol: [[-16, 29], [-26, 23], [-28, 29]] },
  { id: "walker_serre", kind: "walker", x: 22, z: 12, patrol: [[22, 12], [14, 16], [26, 18]] },
  { id: "crawler_cafe", kind: "crawler", x: -22, z: 12, patrol: [[-22, 12], [-15, 16], [-28, 16]] },
  { id: "walker_storage", kind: "walker", x: -20, z: -1, patrol: [[-20, -1], [-27, 3], [-14, -3]] },
  { id: "walker_dorms", kind: "walker", x: -22, z: -12, patrol: [[-22, -12], [-28, -16], [-14, -9]] },
  { id: "crawler_hub", kind: "crawler", x: 3, z: 3, patrol: [[3, 3], [-3, -3], [3, -3]] },
  { id: "walker_control", kind: "walker", x: 20, z: -14, patrol: [[20, -14], [12, -12], [26, -18]] },
  { id: "crawler_workshop", kind: "crawler", x: 30, z: 0, patrol: [[30, 0], [25, -4], [31, 4]] },
];

export const SPAWN = { x: 0, z: 41, yaw: Math.PI };

/**
 * Murs dérivés des salles : chaque côté devient un mur, percé aux portes. Un côté partagé n'est construit
 * qu'une fois. Un mur qui ne borde que de l'extérieur est marqué `outdoor` (rochers, grillage).
 */
export function buildWalls(): Wall[] {
  type Segment = { fixed: number; from: number; to: number; horizontal: boolean };
  const raw: Segment[] = [];
  for (const r of ROOMS) {
    raw.push({ fixed: r.z0, from: r.x0, to: r.x1, horizontal: true });
    raw.push({ fixed: r.z1, from: r.x0, to: r.x1, horizontal: true });
    raw.push({ fixed: r.x0, from: r.z0, to: r.z1, horizontal: false });
    raw.push({ fixed: r.x1, from: r.z0, to: r.z1, horizontal: false });
  }
  const key = (s: Segment) => `${s.horizontal ? "h" : "v"}:${s.fixed}`;
  const groups = new Map<string, Segment[]>();
  for (const s of raw) {
    const list = groups.get(key(s)) ?? [];
    list.push(s);
    groups.set(key(s), list);
  }
  const walls: Wall[] = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.from - b.from);
    const merged: Segment[] = [];
    for (const s of list) {
      const last = merged[merged.length - 1];
      if (last && s.from <= last.to + 1e-6) last.to = Math.max(last.to, s.to);
      else merged.push({ ...s });
    }
    for (const s of merged) {
      const doors = DOORS.filter((d) =>
        s.horizontal ? d.axis === "x" && d.z === s.fixed && d.x > s.from && d.x < s.to : d.axis === "z" && d.x === s.fixed && d.z > s.from && d.z < s.to,
      ).sort((a, b) => (s.horizontal ? a.x - b.x : a.z - b.z));
      let cursor = s.from;
      const push = (a: number, b: number) => {
        if (b - a < 0.05) return;
        const wall = s.horizontal ? { x0: a, z0: s.fixed, x1: b, z1: s.fixed } : { x0: s.fixed, z0: a, x1: s.fixed, z1: b };
        walls.push({ ...wall, outdoor: sidesOutdoor(wall) });
      };
      for (const d of doors) {
        const center = s.horizontal ? d.x : d.z;
        push(cursor, center - d.width / 2);
        cursor = center + d.width / 2;
      }
      push(cursor, s.to);
    }
  }
  return walls;
}

/** Vrai si toutes les salles qui bordent le mur sont extérieures. */
function sidesOutdoor(wall: Omit<Wall, "outdoor">): boolean {
  const mx = (wall.x0 + wall.x1) / 2;
  const mz = (wall.z0 + wall.z1) / 2;
  const horizontal = wall.z0 === wall.z1;
  const sides = horizontal ? [roomAt(mx, mz - 0.3), roomAt(mx, mz + 0.3)] : [roomAt(mx - 0.3, mz), roomAt(mx + 0.3, mz)];
  const present = sides.filter((r): r is Room => r !== null);
  return present.length > 0 && present.every((r) => r.outdoor);
}

export function wallBox(wall: Wall | Omit<Wall, "outdoor">): Box {
  const half = WALL_THICKNESS / 2;
  return {
    minX: Math.min(wall.x0, wall.x1) - half,
    maxX: Math.max(wall.x0, wall.x1) + half,
    minZ: Math.min(wall.z0, wall.z1) - half,
    maxZ: Math.max(wall.z0, wall.z1) + half,
  };
}

export function doorBox(door: Door): Box {
  const half = door.width / 2;
  return door.axis === "x"
    ? { minX: door.x - half, maxX: door.x + half, minZ: door.z - 0.2, maxZ: door.z + 0.2 }
    : { minX: door.x - 0.2, maxX: door.x + 0.2, minZ: door.z - half, maxZ: door.z + half };
}

export function roomAt(x: number, z: number): Room | null {
  return ROOMS.find((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) ?? null;
}

export function sectorAt(x: number, z: number): string {
  return roomAt(x, z)?.sector ?? "SILLO 8";
}
