// Décor du secteur (archives) : à compléter par le sous-agent « secteurs ».
import type { DecorContext, ModelBuilder } from "../world";

export function decorateArchives(ctx: DecorContext): void {
  void ctx;
}

/** Modèles des objets interactifs propres à ce secteur, par identifiant (voir game/level.ts). */
export const ARCHIVES_MODELS: Record<string, ModelBuilder> = {};
