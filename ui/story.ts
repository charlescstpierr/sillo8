// Textes narratifs des fiches, isolés en données : l'histoire de SILLO 8 reste à écrire.
// Les entrées ci-dessous sont des valeurs provisoires, indexées par les identifiants du moteur
// (les identifiants techniques du module de dialogue ne sont jamais affichés).
import type { Character } from "@/game/state";

export interface CharacterSheet {
  /** Nom affiché (titre de la conversation, étiquettes). */
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
  mother: { name: "LA RADIO", title: "VOIX DU RELAIS" },
  n7: { name: "SURVIVANT", title: "VOIX INCONNUE" },
};

/** Fiche d'un interlocuteur, avec repli pour un identifiant inconnu. */
export function characterSheet(id: Character): CharacterSheet {
  return CHARACTERS[id] ?? { name: "INCONNU", title: "VOIX À LA RADIO" };
}

export const ENDING_PROMPT = {
  tag: "POUR CETTE DESCENTE",
  stamp: "DÉCISION IRRÉVERSIBLE",
  title: "Quel sera votre choix ?",
  text: "Une seule voie peut être suivie. Ce choix est définitif pour cette descente.",
};

export const ENDINGS: Record<Character, EndingSheetData> = {
  mother: {
    choice: "SUIVRE LA RADIO",
    description: "Suivre la voix du relais, sans savoir qui parle vraiment.",
    stamp: "SIGNAL SUIVI",
    conclusion: ["La voix vous guide plus bas.", "Le silence revient derrière vous."],
  },
  n7: {
    choice: "REJOINDRE LE SURVIVANT",
    description: "Faire confiance à quelqu'un de chair et d'os.",
    stamp: "ENSEMBLE",
    conclusion: ["Deux lampes valent mieux qu'une.", "Personne ne sait ce qui attend plus bas."],
  },
};

/** Fin de l'étage 1 : l'accès à l'étage 2 est ouvert. */
ENDINGS.floor2 = {
  choice: "",
  description: "",
  stamp: "ÉTAGE 1 TERMINÉ",
  conclusion: [
    "La clé glisse dans le lecteur. L'escalier de service s'ouvre sur le noir.",
    "Quelque part plus bas, le signal radio répond encore. L'étage 2 vous attend… bientôt.",
  ],
};

export const ENDING_ORDER: Character[] = ["mother", "n7"];
