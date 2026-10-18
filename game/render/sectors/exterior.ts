// Décor de la zone « exterior » de SILLO 8, étage 1 : à compléter par le sous-agent de cette zone.
import type { DecorContext, ModelBuilder } from "../world";

export function decorateExterior(ctx: DecorContext): void {
  void ctx;
}

/** Modèles des objets interactifs propres à cette zone, par identifiant (voir game/level.ts). */
export const EXTERIOR_MODELS: Record<string, ModelBuilder> = {};
