// Plan du silo, vu de dessus. Le nord est −Z : on descend vers le cœur en allant vers le haut de l'écran.
// Unités en mètres. Les murs sont coupés à mi-hauteur (maison de poupée).
import type { Box } from "./collision";

export const WALL_HEIGHT = 1.6;
export const WALL_THICKNESS = 0.3;

export interface Room {
  id: string;
  sector: string;
  x0: number; x1: number; z0: number; z1: number;
  floor: "lift" | "tiles" | "concrete";
}

export interface Wall { x0: number; z0: number; x1: number; z1: number; }

export interface Door {
  id: string;
  x: number; z: number;
  /** Axe de l'ouverture : "x" pour une porte dans un mur est-ouest. */
  axis: "x" | "z";
  width: number;
  label: string;
  locked: boolean;
}

export type InteractableKind = "components" | "ammo" | "cell" | "medkit";

export interface InteractableDef {
  id: string;
  name: string;
  action: string;
  x: number; z: number;
  /** Rayon de déclenchement, en plus de la distance d'approche du joueur. */
  radius: number;
  kind?: InteractableKind;
  amount?: number;
}

export const ROOMS: Room[] = [
  { id: "refuge", sector: "ASCENSEUR / REFUGE", x0: -5, x1: 5, z0: 4, z1: 13, floor: "lift" },
  { id: "decon", sector: "01 / DÉCONTAMINATION", x0: -8, x1: 8, z0: -12, z1: 4, floor: "tiles" },
];

export const DOORS: Door[] = [
  { id: "refuge_decon", x: 0, z: 4, axis: "x", width: 2.8, label: "01  DÉCONTAMINATION", locked: false },
  { id: "decon_maintenance", x: 0, z: -12, axis: "x", width: 2.8, label: "02  MAINTENANCE", locked: true },
];

export const INTERACTABLES: InteractableDef[] = [
  { id: "mother", name: "MÈRE", action: "Parler", x: 3.2, z: 7, radius: 0.7 },
  { id: "recharge", name: "Borne de recharge", action: "Recharger · gratuit", x: -3.6, z: 6.2, radius: 0.6 },
  { id: "upgrade", name: "Établi", action: "Améliorer la batterie · 3 composants", x: -3.4, z: 10.2, radius: 0.8 },
  { id: "ending", name: "Console de descente", action: "Choix final", x: 2.6, z: 11.4, radius: 0.6 },
  { id: "component_0", name: "Composant", action: "Ramasser", x: -5.6, z: -1.2, radius: 0.35, kind: "components" },
  { id: "component_1", name: "Composant", action: "Ramasser", x: 5.4, z: -6.4, radius: 0.35, kind: "components" },
  { id: "component_2", name: "Composant", action: "Ramasser", x: -2.4, z: -10.2, radius: 0.35, kind: "components" },
  { id: "ammo_1", name: "Munitions D9", action: "Ramasser", x: 6.4, z: 1.6, radius: 0.35, kind: "ammo", amount: 24 },
];

export const SPAWN = { x: 0, z: 9.2, yaw: Math.PI };

/** Segments de murs, portes laissées ouvertes. Les portes verrouillées ont leur propre collision. */
export function buildWalls(): Wall[] {
  const walls: Wall[] = [];
  const horizontal = (z: number, x0: number, x1: number) => walls.push({ x0, z0: z, x1, z1: z });
  const vertical = (x: number, z0: number, z1: number) => walls.push({ x0: x, z0, x1: x, z1 });
  const withDoors = (z: number, x0: number, x1: number) => {
    const doors = DOORS.filter((d) => d.axis === "x" && d.z === z && d.x > x0 && d.x < x1).sort((a, b) => a.x - b.x);
    let cursor = x0;
    for (const door of doors) {
      horizontal(z, cursor, door.x - door.width / 2);
      cursor = door.x + door.width / 2;
    }
    horizontal(z, cursor, x1);
  };
  // Refuge
  horizontal(13, -5, 5);
  vertical(-5, 4, 13);
  vertical(5, 4, 13);
  // 01 Décontamination
  withDoors(4, -8, 8);
  vertical(-8, -12, 4);
  vertical(8, -12, 4);
  withDoors(-12, -8, 8);
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
