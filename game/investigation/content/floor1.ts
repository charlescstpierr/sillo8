// Enquête de l'étage 1 — tout le contenu de docs/HISTOIRE_PROPOSITION.md et docs/MEFIANCE_SURVIVANTS.md :
// cartes et questions (cards.ts), gros plans (objects.ts), pensées, traces UV et événements étranges (story.ts),
// déductions, pensées d'erreur, aide et énigmes (deductions.ts). Positions : positions.ts, en un seul endroit.
// Liens avec les conversations (scènes M1 à M7, faits posés) : links.ts.
import type { InvestigationContent } from "../types";
import { CARDS, QUESTIONS } from "./cards";
import { DEDUCTIONS, ERRORS, GENERIC, PUZZLES } from "./deductions";
import { EXAMINABLES } from "./objects";
import { POS } from "./positions";
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
  // Petits décors nécessaires à l'enquête, en attendant le décor définitif (STORY_PROPS).
  props: [
    { id: "chalk_door", kind: "chalk", x: POS.chalk_door.x, z: POS.chalk_door.z, y: 1.25, yaw: 0, text: "ILS SONT DESCENDUS.\nPAS TOUS." },
    { id: "room1_cabinet", kind: "cabinet", x: 18.4, z: 7.55, yaw: Math.PI },
    { id: "room1_scrapes", kind: "scrapes", x: 18.4, z: 6.7, yaw: 0 },
    { id: "cook_tally", kind: "chalk", x: POS.cook_tally.x + 0.05, z: POS.cook_tally.z, y: 1.75, yaw: Math.PI / 2, text: "IIII IIII" },
  ],
};
