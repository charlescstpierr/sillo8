// Textes narratifs des fiches, isolés en données : l'histoire de SILLO 8 reste à écrire.
// Les entrées ci-dessous sont des valeurs provisoires, indexées par les identifiants du moteur.
import type { Character } from "@/game/state";

export interface CharacterSheet {
  /** Nom affiché (titre du canal, étiquettes du journal). */
  name: string;
  /** Rôle court, sur l'étiquette de toile. */
  title: string;
}

export interface EndingSheetData {
  /** Bouton de choix. */
  choice: string;
  /** Conséquence annoncée avant le choix. */
  description: string;
  /** Tampon de la conclusion. */
  stamp: string;
  /** Lignes de la conclusion. */
  conclusion: string[];
}

export const CHARACTERS: Record<Character, CharacterSheet> = {
  mother: { name: "MÈRE", title: "IA DU SILO" },
  n7: { name: "N-7", title: "ROBOT DE MAINTENANCE" },
};

export const ENDING_PROMPT = {
  tag: "POUR CETTE DESCENTE",
  stamp: "DÉCISION IRRÉVERSIBLE",
  title: "Quel sera votre choix ?",
  text: "Une seule voie peut être suivie. Ce choix est définitif pour cette descente.",
};

export const ENDINGS: Record<Character, EndingSheetData> = {
  mother: {
    choice: `SE RANGER DU CÔTÉ DE ${CHARACTERS.mother.name}`,
    description: "L'ordre est rétabli, au prix de la liberté.",
    stamp: "CONFINEMENT",
    conclusion: ["Le silo a retrouvé son ordre.", "Les portes restent closes."],
  },
  n7: {
    choice: `SE RANGER DU CÔTÉ DE ${CHARACTERS.n7.name}`,
    description: "Le réseau s'ouvre, sans plus personne pour le tenir.",
    stamp: "ÉMANCIPATION",
    conclusion: ["Pour la première fois, les portes s'ouvrent.", "Personne ne sait ce qui attend plus bas."],
  },
};

export const ENDING_ORDER: Character[] = ["mother", "n7"];
