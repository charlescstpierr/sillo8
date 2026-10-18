// Textes narratifs des fiches de fin d'étage, isolés en données (prêts pour une traduction).
// Les interlocuteurs des conversations sont décrits dans les conversations elles-mêmes (game/content/people_talk.ts).
// La fin de l'étage 1 varie selon ce qui a été découvert et la confiance (game/content/people.ts, floorEnding) :
// résumé si l'affaire est résolue, voix d'Okafor et « VIENS » traduit par l'opératrice si la radio est réparée,
// ce qu'elle dit de Lou à ceux d'en bas, l'adieu de Cuisine, puis le texte canon, inchangé. On peut descendre sans
// avoir résolu l'affaire (décision de l'auteur) : la fin le dit, sans punir.
import type { Character, SiloState } from "@/game/state";
import { CANON_ENDING, floorEnding } from "@/game/content/people";

export interface EndingSheetData {
  /** Tampon de la conclusion. */
  stamp: string;
  /** Lignes de la conclusion. */
  conclusion: string[];
}

export const ENDINGS: Record<Character, EndingSheetData> = {
  /** Fin de l'étage 1 : l'accès à l'étage 2 est ouvert (texte canon seul). */
  floor2: {
    stamp: "ÉTAGE 1 TERMINÉ",
    conclusion: [...CANON_ENDING],
  },
};

/** Fiche de fin pour cette partie : la fin de l'étage 1 dépend de l'enquête et de la confiance. */
export function endingFor(choice: Character, state: SiloState): EndingSheetData {
  if (choice === "floor2") {
    const ending = floorEnding(state);
    return { stamp: ending.stamp, conclusion: ending.lines };
  }
  return ENDINGS[choice] ?? ENDINGS.floor2;
}
