// Lien entre le contenu d'enquête et le monde : contenu de l'étage courant, objets examinables vus comme des
// objets interactifs (infobulle, contour, touche E), portes à verrou d'enquête.
import type { InteractableDef } from "../level";
import type { SiloState } from "../state";
import { FLOOR1 } from "./content/floor1";
import { ContentIndex, examinableState } from "./logic";
import type { InvestigationContent } from "./types";
import { recordOf } from "./record";

/** Contenu d'enquête de l'étage en cours (un seul étage construit pour l'instant). */
export const CONTENT: InvestigationContent = FLOOR1;
export const INDEX = new ContentIndex(CONTENT);

/** Objets examinables présentés au moteur comme objets interactifs (rendu : game/render/inquiry.ts). */
export const EXAMINABLE_DEFS: InteractableDef[] = CONTENT.examinables.map((e) => ({
  id: `examine_${e.id}`, name: e.name, action: e.action, x: e.x, z: e.z, radius: e.radius, solid: false, examine: e.id,
}));

export function examinableAvailable(id: string, state: SiloState): boolean {
  const e = INDEX.examinables.get(id);
  return Boolean(e) && examinableState(e!, recordOf(state), state) !== "hidden";
}

export function doorUnlocked(id: string, state: SiloState): boolean {
  return recordOf(state).unlocked.includes(`door:${id}`);
}
