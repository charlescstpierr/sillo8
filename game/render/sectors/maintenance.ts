// Décor du secteur (maintenance) : à compléter par le sous-agent « secteurs ».
import type { DecorContext, ModelBuilder } from "../world";

export function decorateMaintenance(ctx: DecorContext): void {
  void ctx;
}

/** Modèles des objets interactifs propres à ce secteur, par identifiant (voir game/level.ts). */
export const MAINTENANCE_MODELS: Record<string, ModelBuilder> = {};
