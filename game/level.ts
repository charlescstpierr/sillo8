// Plan du silo, vu de dessus. Le nord est −Z : on descend vers le cœur en allant vers le haut de l'écran.
// Unités en mètres. Les murs sont coupés à mi-hauteur (maison de poupée).
import type { Box } from "./collision";

export const WALL_HEIGHT = 1.6;
export const WALL_THICKNESS = 0.3;

export type RoomId = "refuge" | "decon" | "maintenance" | "atelier" | "technique" | "archives" | "alcove" | "antechamber" | "conduit" | "core";

export interface Room {
  id: RoomId;
  sector: string;
  x0: number; x1: number; z0: number; z1: number;
  floor: "lift" | "tiles" | "concrete" | "grate";
}

export interface Wall { x0: number; z0: number; x1: number; z1: number; }

export interface Door {
  id: string;
  x: number; z: number;
  /** "x" : porte dans un mur est-ouest (on la traverse en suivant Z). "z" : mur nord-sud. */
  axis: "x" | "z";
  width: number;
  label: string;
  /** Salles reliées (pour la navigation des zombies). */
  rooms: [RoomId, RoomId];
  /**
   * Fermeture : "gate" = porte du cœur, ouverte quand le relais est réparé (phase ≥ 2) ;
   * "arc" = verrou électrique, tombe quand l'ARC-3 coupe le boîtier (fait arc_lock_disabled).
   */
  lock?: "gate" | "arc";
}

export type InteractableKind = "components" | "ammo" | "cell" | "medkit";

export interface InteractableDef {
  id: string;
  name: string;
  action: string;
  x: number; z: number;
  /** Rayon de l'objet (collision et approche). */
  radius: number;
  kind?: InteractableKind;
  amount?: number;
  /** Les objets massifs bloquent le passage. Par défaut : tout sauf les ressources. */
  solid?: boolean;
}

export interface EnemySpawn {
  id: string;
  kind: "walker" | "crawler";
  x: number; z: number;
  /** Points de patrouille (dans la même salle). */
  patrol: [number, number][];
}

export const ROOMS: Room[] = [
  { id: "refuge", sector: "ASCENSEUR / REFUGE", x0: -5, x1: 5, z0: 4, z1: 13, floor: "lift" },
  { id: "decon", sector: "01 / DÉCONTAMINATION", x0: -8, x1: 8, z0: -12, z1: 4, floor: "tiles" },
  { id: "maintenance", sector: "02 / MAINTENANCE", x0: -9, x1: 9, z0: -28, z1: -12, floor: "concrete" },
  { id: "atelier", sector: "02 / MAINTENANCE · ATELIER", x0: -17, x1: -9, z0: -24, z1: -14, floor: "concrete" },
  { id: "technique", sector: "02 / MAINTENANCE · LOCAL TECHNIQUE", x0: 9, x1: 16, z0: -26, z1: -16, floor: "grate" },
  { id: "archives", sector: "03 / ARCHIVES", x0: -11, x1: 11, z0: -48, z1: -28, floor: "tiles" },
  { id: "alcove", sector: "03 / ARCHIVES · ALCÔVE DE N-7", x0: -16, x1: -11, z0: -42, z1: -34, floor: "grate" },
  { id: "antechamber", sector: "04 / CŒUR · SAS", x0: -7, x1: 7, z0: -56, z1: -48, floor: "concrete" },
  { id: "conduit", sector: "04 / CŒUR · CONDUITE DE SERVICE", x0: 7, x1: 10, z0: -56, z1: -50, floor: "grate" },
  { id: "core", sector: "04 / CŒUR", x0: -11, x1: 11, z0: -74, z1: -56, floor: "concrete" },
];

export const DOORS: Door[] = [
  { id: "refuge_decon", x: 0, z: 4, axis: "x", width: 2.8, label: "01  DÉCONTAMINATION", rooms: ["refuge", "decon"] },
  { id: "decon_maintenance", x: 0, z: -12, axis: "x", width: 2.8, label: "02  MAINTENANCE", rooms: ["decon", "maintenance"] },
  { id: "maintenance_atelier", x: -9, z: -19, axis: "z", width: 2.2, label: "ATELIER", rooms: ["maintenance", "atelier"] },
  { id: "maintenance_technique", x: 9, z: -21, axis: "z", width: 2.2, label: "LOCAL TECHNIQUE", rooms: ["maintenance", "technique"] },
  { id: "maintenance_archives", x: 0, z: -28, axis: "x", width: 2.8, label: "03  ARCHIVES", rooms: ["maintenance", "archives"] },
  { id: "archives_alcove", x: -11, z: -38, axis: "z", width: 2.0, label: "N-7", rooms: ["archives", "alcove"] },
  { id: "archives_antechamber", x: 0, z: -48, axis: "x", width: 2.8, label: "04  CŒUR / ACCÈS RÉSERVÉ", rooms: ["archives", "antechamber"], lock: "gate" },
  { id: "antechamber_core", x: 0, z: -56, axis: "x", width: 2.8, label: "CŒUR MÉMORIEL", rooms: ["antechamber", "core"], lock: "arc" },
  { id: "antechamber_conduit", x: 7, z: -52, axis: "z", width: 1.6, label: "DÉTOUR →", rooms: ["antechamber", "conduit"] },
  { id: "conduit_core", x: 8.5, z: -56, axis: "x", width: 1.6, label: "", rooms: ["conduit", "core"] },
];

/** Position du relais caché (local technique), révélé par le SCAN ÉCHO à moins de 18 m. */
export const RELAY = { x: 14.9, z: -24.2 };
export const SCAN_RADIUS = 18;
export const SCAN_NOISE = 24;
/** Seuil de l'événement « colosse » : quelque chose bouge sous les pieds en entrant dans le cœur. */
export const COLOSSUS_Z = -58;

export const INTERACTABLES: InteractableDef[] = [
  // Refuge
  { id: "mother", name: "MÈRE", action: "Parler", x: 3.2, z: 7, radius: 0.7 },
  { id: "recharge", name: "Borne de recharge", action: "Recharger · gratuit", x: -3.6, z: 6.2, radius: 0.6 },
  { id: "upgrade", name: "Établi", action: "Améliorer la batterie · 3 composants", x: -3.4, z: 10.2, radius: 0.8 },
  { id: "ending", name: "Console de descente", action: "Choix final", x: 2.6, z: 11.4, radius: 0.6 },
  // 02 Maintenance
  { id: "relay", name: "Relais", action: "Réparer · 3 composants", x: RELAY.x, z: RELAY.z, radius: 0.6 },
  // 03 Archives
  { id: "n7", name: "N-7", action: "Parler", x: -14.2, z: -38, radius: 0.6 },
  { id: "evidence", name: "Archive 09", action: "Lire : signal de surface", x: 8.2, z: -45.2, radius: 0.6 },
  // 04 Cœur
  { id: "device", name: "Verrou électrique", action: "ARC-3 ou détour latéral", x: 3.4, z: -55.2, radius: 0.4 },
  { id: "core", name: "Cœur mémoriel", action: "Extraire le noyau", x: 0, z: -67, radius: 0.9 },
  // Ressources : 9 composants, munitions, cellules, trousse
  { id: "component_0", name: "Composant", action: "Ramasser", x: -5.6, z: -1.2, radius: 0.35, kind: "components" },
  { id: "component_1", name: "Composant", action: "Ramasser", x: 5.4, z: -6.4, radius: 0.35, kind: "components" },
  { id: "component_2", name: "Composant", action: "Ramasser", x: -2.4, z: -10.2, radius: 0.35, kind: "components" },
  { id: "component_3", name: "Composant", action: "Ramasser", x: -6.2, z: -15.4, radius: 0.35, kind: "components" },
  { id: "component_4", name: "Composant", action: "Ramasser", x: -14.6, z: -21.2, radius: 0.35, kind: "components" },
  { id: "component_5", name: "Composant", action: "Ramasser", x: 6.4, z: -26.2, radius: 0.35, kind: "components" },
  { id: "component_6", name: "Composant", action: "Ramasser", x: -8.4, z: -31.2, radius: 0.35, kind: "components" },
  { id: "component_7", name: "Composant", action: "Ramasser", x: 9.2, z: -35.6, radius: 0.35, kind: "components" },
  { id: "component_8", name: "Composant", action: "Ramasser", x: -5.2, z: -50.4, radius: 0.35, kind: "components" },
  { id: "ammo_1", name: "Munitions D9", action: "Ramasser", x: 6.4, z: 1.6, radius: 0.35, kind: "ammo", amount: 24 },
  { id: "ammo_2", name: "Munitions D9", action: "Ramasser", x: -6.4, z: -44.6, radius: 0.35, kind: "ammo", amount: 24 },
  { id: "cell_1", name: "Cellule d'énergie", action: "Ramasser", x: -3.2, z: -13.6, radius: 0.35, kind: "cell", amount: 1 },
  { id: "cell_2", name: "Cellule d'énergie", action: "Ramasser", x: 7.4, z: -42.2, radius: 0.35, kind: "cell", amount: 1 },
  { id: "med_1", name: "Trousse de soins", action: "Ramasser", x: 12.4, z: -17.6, radius: 0.35, kind: "medkit", amount: 1 },
];

export const ENEMIES: EnemySpawn[] = [
  { id: "walker_1", kind: "walker", x: 3, z: -20, patrol: [[3, -20], [3, -16], [-2, -18]] },
  { id: "crawler_1", kind: "crawler", x: -5, z: -25, patrol: [[-5, -25], [-5, -21], [-1, -24]] },
  { id: "walker_2", kind: "walker", x: -3, z: -40, patrol: [[-3, -40], [-3, -35], [2, -38]] },
  { id: "crawler_2", kind: "crawler", x: 4, z: -44, patrol: [[4, -44], [4, -40], [8, -42]] },
  { id: "walker_3", kind: "walker", x: 0, z: -63, patrol: [[0, -63], [-5, -60], [5, -60]] },
  { id: "crawler_3", kind: "crawler", x: -4, z: -70, patrol: [[-4, -70], [-8, -66], [3, -71]] },
];

export const SPAWN = { x: 0, z: 9.2, yaw: Math.PI };

/**
 * Murs dérivés des salles : chaque côté de salle devient un mur, percé aux portes.
 * Un côté partagé par deux salles n'est construit qu'une fois.
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
  // Fusionne les intervalles colinéaires (murs mitoyens), puis perce les portes.
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
        walls.push(s.horizontal ? { x0: a, z0: s.fixed, x1: b, z1: s.fixed } : { x0: s.fixed, z0: a, x1: s.fixed, z1: b });
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

export function wallBox(wall: Wall): Box {
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
  return roomAt(x, z)?.sector ?? "SILO 9";
}
