// Textes narratifs des fiches de fin d'étage, isolés en données (prêts pour une traduction).
// Les interlocuteurs des conversations sont décrits dans les conversations elles-mêmes (game/conversation.ts).
import type { Character } from "@/game/state";

export interface EndingSheetData {
  /** Tampon de la conclusion. */
  stamp: string;
  /** Lignes de la conclusion. */
  conclusion: string[];
}

export const ENDINGS: Record<Character, EndingSheetData> = {
  /** Fin de l'étage 1 : l'accès à l'étage 2 est ouvert. */
  floor2: {
    stamp: "ÉTAGE 1 TERMINÉ",
    conclusion: [
      "La clé glisse dans le lecteur. L'escalier de service s'ouvre sur le noir.",
      "Quelque part plus bas, le signal radio répond encore. L'étage 2 vous attend… bientôt.",
    ],
  },
};
