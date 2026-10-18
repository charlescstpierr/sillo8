// Décor du secteur (core) : à compléter par le sous-agent « secteurs ».
import type { DecorContext, ModelBuilder } from "../world";

export function decorateCore(ctx: DecorContext): void {
  void ctx;
}

/** Modèles des objets interactifs propres à ce secteur, par identifiant (voir game/level.ts). */
export const CORE_MODELS: Record<string, ModelBuilder> = {};
