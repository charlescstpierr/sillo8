// Enquête de l'étage 1 — tout le contenu de docs/HISTOIRE_PROPOSITION.md et docs/MEFIANCE_SURVIVANTS.md :
// cartes et questions (cards.ts), gros plans (objects.ts), pensées, traces UV et événements étranges (story.ts),
// déductions, pensées d'erreur, aide et énigmes (deductions.ts). Positions : positions.ts, en un seul endroit.
// Liens avec les conversations (scènes M1 à M7, faits posés) : links.ts.
import type { InvestigationContent } from "../types";
import { CARDS, QUESTIONS } from "./cards";
import { DEDUCTIONS, ERRORS, GENERIC, PUZZLES } from "./deductions";
import { EXAMINABLES } from "./objects";
import { EVENTS, THOUGHTS, TRACES } from "./story";

export const FLOOR1: InvestigationContent = {
  floor: 1,
  questions: QUESTIONS,
  cards: CARDS,
  examinables: EXAMINABLES,
  thoughts: THOUGHTS,
  traces: TRACES,
  events: EVENTS,
  deductions: DEDUCTIONS,
  errors: ERRORS,
  generic: GENERIC,
  puzzles: PUZZLES,
  // Le décor narratif (game/render/storyProps.ts) dessine déjà la craie, l'armoire et la chambre 1, les traits de
  // Cuisine, etc. : l'enquête n'ajoute aucun décor en double.
  props: [
  ],
};
