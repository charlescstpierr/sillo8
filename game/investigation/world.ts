// Lien entre le contenu d'enquête et le monde : contenu de l'étage courant, objets examinables vus comme des
// objets interactifs (infobulle, contour, touche E), portes à verrou d'enquête, objets portés par un mordu.
import type { InteractableDef } from "../level";
import type { SiloState } from "../state";
import { FLOOR1 } from "./content/floor1";
import { ContentIndex, examinableState } from "./logic";
import type { InvestigationContent } from "./types";
import { recordOf } from "./record";

/** Contenu d'enquête de l'étage en cours (un seul étage construit pour l'instant). */
export const CONTENT: InvestigationContent = FLOOR1;
export const INDEX = new ContentIndex(CONTENT);

/** Portée d'examen d'un mordu figé par la lampe (m, en plus de la portée normale) : on lit ce qu'il porte de loin. */
export const CARRIER_REACH = 3.6;
/** Rayon d'un objet tombé d'un mordu abattu. */
export const DROPPED_RADIUS = 0.45;

/**
 * Objets examinables présentés au moteur comme objets interactifs (rendu : game/render/inquiry.ts). Les objets de la
 * sacoche (`carried`) n'y sont pas. Pour un objet porté par un mordu, le directeur d'enquête déplace (x, z) et règle
 * le rayon à chaque image (CARRIERS).
 */
export const EXAMINABLE_DEFS: InteractableDef[] = CONTENT.examinables.filter((e) => !e.carried).map((e) => ({
  id: `examine_${e.id}`, name: e.name, action: e.action, x: e.x, z: e.z, radius: e.radius, solid: false, examine: e.id,
}));

/**
 * État des mordus porteurs, tenu à jour par le directeur d'enquête : `ready` quand le mordu est figé ou abattu.
 * Un porteur absent de la table (mordu inconnu du monde, tests) laisse l'objet posé à sa place, toujours examinable.
 */
export const CARRIERS = new Map<string, { x: number; z: number; ready: boolean; dropped: boolean }>();

export function examinableAvailable(id: string, state: SiloState): boolean {
  const e = INDEX.examinables.get(id);
  if (!e || e.carried) return false;
  if (e.carrier) {
    const c = CARRIERS.get(e.carrier);
    if (c && !c.ready) return false;
  }
  return examinableState(e, recordOf(state), state) !== "hidden";
}

export function doorUnlocked(id: string, state: SiloState): boolean {
  return recordOf(state).unlocked.includes(`door:${id}`);
}
