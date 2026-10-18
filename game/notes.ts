// Notes des survivants (carnet d'indices). L'histoire complète de SILLO 8 viendra plus tard :
// ces textes restent courts et servent surtout de pistes pour l'étage 1.

export interface Note {
  id: string;
  title: string;
  /** Signature ou provenance, en bas de la feuille. */
  author: string;
  text: string;
  /** Vrai pour la note qui révèle le mur creux des dortoirs. */
  clue?: boolean;
}

export const NOTES: Record<string, Note> = {
  note_entrance: {
    id: "note_entrance",
    title: "Consigne de garde",
    author: "Sgt. Bérard, poste d'entrée",
    text: "La porte de sécurité tire son courant de la génératrice. Si tout tombe, passez par la porte de service, à l'ouest de l'entrée. Ne restez pas dehors à la nuit tombée.",
  },
  note_generator: {
    id: "note_generator",
    title: "Journal de maintenance",
    author: "Équipe technique, page arrachée",
    text: "Le régulateur réclame trois pièces. On en a vu traîner dans les épaves, dehors, et dans la serre. Après ça, elle repart au quart de tour. Normalement.",
  },
  note_cafeteria: {
    id: "note_cafeteria",
    title: "Menu du jour",
    author: "Cuisine",
    text: "Pêches en conserve. Encore. Et quelqu'un pique les piles dans l'entrepôt : on les compte, maintenant.",
  },
  note_infirmary: {
    id: "note_infirmary",
    title: "Rapport médical n° 12",
    author: "Dr Okafor",
    text: "Les mordus supportent mal la lumière vive : un faisceau en pleine face les fige quelques secondes. Gardez vos lampes chargées. Bandages pour les égratignures, trousses pour le reste.",
  },
  note_control: {
    id: "note_control",
    title: "Relève radio",
    author: "Opératrice de nuit",
    text: "Le relais a grillé pendant l'orage. Un module de rechange se bricole à l'atelier avec deux pièces, puis il suffit de l'enficher dans la console.",
  },
  note_storage: {
    id: "note_storage",
    title: "Liste de Lila",
    author: "Lila, au crayon",
    text: "J'ai caché la clé de l'étage 2 là où personne ne dort plus. Au fond des dortoirs, le mur sonne creux, à côté du dernier lit. Poussez fort.",
    clue: true,
  },
  note_secret: {
    id: "note_secret",
    title: "Dernier mot",
    author: "Lila",
    text: "Si tu lis ça, tu as trouvé ma cachette. Les autres sont descendus. Prends la clé, et ne fais pas confiance au silence.",
  },
};
