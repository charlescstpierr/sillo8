// Contrats entre le moteur et ses sous-systèmes (zombies, combat). Chaque module les implémente de son côté.
import type { Object3D } from "three";
import type { Box } from "./collision";
import type { AimCandidate } from "./aim";
import type { SiloState } from "./state";

export interface HordeContext {
  player: { x: number; z: number; crouched: boolean; alive: boolean };
  /** Murs + portes fermées + décor solide, à jour. */
  colliders: readonly Box[];
  /** Vrai si la porte (id de DOORS) est franchissable. */
  doorOpen(doorId: string): boolean;
  damagePlayer(amount: number): void;
  /** Fin N-7 : les zombies tombent en sommeil. */
  dormant: boolean;
}

export interface RayHit {
  id: string;
  distance: number;
  x: number;
  z: number;
}

/** Les zombies (port de enemy.gd : patrouille, ouïe, poursuite, recherche, retour, recul du rampant). */
export interface Horde {
  readonly root: Object3D;
  update(dt: number, ctx: HordeContext): void;
  /** Bruit (tir, scan) : les zombies dans le rayon viennent enquêter. */
  hearNoise(x: number, z: number, radius: number): void;
  /** Zombies vivants, pour la visée assistée et les marqueurs du scan. */
  aimCandidates(): AimCandidate[];
  /** Premier zombie touché par un rayon horizontal partant de (x, z) dans la direction (dx, dz) normalisée. */
  raycast(x: number, z: number, dx: number, dz: number, maxDistance: number): RayHit | null;
  /** Dégâts + étourdissement (ARC-3). Marque le zombie vaincu dans l'état à 0 PV. */
  damage(id: string, amount: number, stun: number): void;
  /** Retire les zombies déjà vaincus (chargement de sauvegarde). */
  sync(state: SiloState): void;
  setLowQuality(low: boolean): void;
}
