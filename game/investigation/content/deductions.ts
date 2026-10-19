// Étage 1 — déductions du tableau (contradictions X1 à X10, phrases à trous C1 à C5), pensées d'erreur, aide en trois
// paliers, et les trois énigmes (cadenas PECHES, leviers du délestage, mot de passe MARCEAU).
// Textes : docs/HISTOIRE_PROPOSITION.md § 14, 16, 17 et docs/MEFIANCE_SURVIVANTS.md § 10, mot pour mot.
// Les paliers d'aide des contradictions ne sont pas dans le document : ils sont marqués « Proposé ».
// Déblocages vers l'agent « personnages » : `dialogue:<id du document>` et `fact:<id>` (voir links.ts).
import type { Deduction, ErrorThought, GenericThoughts, Puzzle } from "../types";
import { POS } from "./positions";

export const DEDUCTIONS: Deduction[] = [
  // ——— Couche 1 : comment les mordus sont-ils entrés ? ———
  {
    id: "X1", kind: "contradiction", title: "L'avis et le seuil", question: "q_porte",
    pairs: [["poster_notice", "c1"]],
    text: "Personne n'est entré par la porte de service.",
    // La traînée de l'infirmerie devient un repère : l'armoire. (X1 ou X2 suffit pour la pousser.)
    unlocks: [{ kind: "fact", id: "repere_armoire" }, { kind: "examinable", id: "room1_cabinet" }],
    hints: [
      "Je n'ai pas bien regardé la porte de service.",
      "Et si je l'éclairais à la lampe UV ?",
      // Validé par l'auteur : le document ne donne pas de palier 3 pour X1.
      "L'avis dit « par la porte de service ». Le seuil, à la lampe UV, dit autre chose.",
    ],
  },
  {
    id: "C1", kind: "sentence", title: "L'origine", question: "q_porte",
    text: "Les mordus ne sont pas entrés par [la porte de service]. Le premier est sorti de [la chambre 1], à [l'infirmerie].",
    clues: ["c1", "c2", "c3", "note_infirmary_map", "c5", "note_tray_ticket", "note_room1_file"], minClues: 3,
    unlocks: [{ kind: "examinable", id: "okafor_drawer" }],
    hints: [
      "Je n'ai pas bien regardé la porte de service.",
      "Et si je l'éclairais à la lampe UV ?",
      "Aucune trace au seuil, mais une traînée à l'infirmerie : d'où part-elle ?",
    ],
  },
  {
    id: "X4", kind: "contradiction", title: "L'avis et son brouillon", question: "q_chambre1",
    requires: { deductions: ["C1"] },
    pairs: [["poster_notice", "note_notice_draft"]],
    text: "L'avis a été écrit pour cacher “M.”",
    unlocks: [{ kind: "word", word: "mensonge" }],
    hints: [
      // Validé par l'auteur : le document ne donne pas d'aide pour X4.
      "L'avis officiel… qui l'a écrit ?",
      "Le tiroir du Dr Okafor cachait un brouillon.",
      "Le brouillon et l'avis disent la même chose. Sauf la marge.",
    ],
  },

  // ——— Couche 2 : qui était dans la chambre 1, et qui l'a caché ? ———
  {
    id: "X2", kind: "contradiction", title: "La chambre condamnée", question: "q_chambre1",
    pairs: [["note_infirmary_map", "note_tray_ticket"], ["note_infirmary_map", "commis_habit"]],
    text: "On nourrissait quelqu'un dans une chambre condamnée.",
    unlocks: [{ kind: "examinable", id: "room1_cabinet" }],
    hints: [
      // Validé par l'auteur.
      "Une chambre « condamnée »… depuis quand, et pour qui ?",
      "Le commis de la cafétéria porte encore ses plateaux. Où allaient-ils ?",
      "« Chambre 1 : condamnée. » « Plateau — chambre 1. » Les deux ne peuvent pas être vrais.",
    ],
  },
  {
    id: "X3", kind: "contradiction", title: "« RAS »", question: "q_chambre1",
    pairs: [["note_expedition", "note_torn_imprint"], ["note_expedition", "note_torn_page"]],
    text: "Marceau était blessé au retour. Bérard a menti.",
    unlocks: [{ kind: "examinable", id: "a9" }],
    hints: [
      // Validé par l'auteur.
      "Qui revenait de l'expédition, et dans quel état ?",
      "La page arrachée de la génératrice : un crayon, ça appuie.",
      "« Marceau : RAS. » « Avant-bras bandé. » Un des deux ment.",
    ],
  },
  {
    id: "C2", kind: "sentence", title: "Le secret", question: "q_chambre1",
    text: "Le patient était [Marceau], mordu pendant [l'expédition]. [Bérard] l'a fait entrer, [Okafor] l'a gardé sous des lampes, et l'avis officiel est un [mensonge].",
    clues: ["marceau_bracelet", "note_torn_imprint", "note_torn_page", "note_expedition", "terminal_log", "note_room1_file", "note_notice_draft"], minClues: 3,
    // Débloque : à la console, le canal 2 ; la voix d'Okafor en entier après la réparation.
    unlocks: [{ kind: "fact", id: "canal2" }, { kind: "dialogue", id: "C2" }],
    hints: [
      "Ce bracelet d'infirmerie… à qui appartenait-il ?",
      "La page arrachée de la génératrice, elle parlait de quelqu'un.",
      "Bracelet “chambre 1”, avant-bras bandé, feuille “RAS” : le même homme.",
    ],
  },
  {
    id: "C3", kind: "sentence", title: "Les piles", question: "q_piles",
    text: "Les piles volées servaient aux [lampes] de la chambre 1. [Lila] les portait ; [Cuisine] les a enfermées le soir de l'orage.",
    clues: ["note_cafeteria", "note_lila_2", "note_battery_count", "say_cook_witness"], minClues: 3,
    // Débloque la réplique de Cuisine → clé de la réserve (si Lou est aussi disculpé par C5).
    unlocks: [{ kind: "dialogue", id: "C3" }],
    hints: [
      "Le menu parle de piles volées. Volées pour quoi ?",
      "Il y a une liste dans le panier à piles de l'infirmerie.",
      "Quatre piles par nuit, deux lampes, une chambre.",
    ],
  },

  // ——— L'étranger (couche 1, après l'accusation M3) ———
  {
    id: "X8", kind: "contradiction", title: "Depuis que je suis là ?", question: "q_etranger",
    pairs: [["say_cook_accuse", "service_threshold"], ["say_cook_accuse", "c1"], ["say_cook_accuse", "cook_tally"], ["say_cook_accuse", "nurse_watch"]],
    text: "Tout a commencé la nuit de l'orage, neuf jours avant moi, et personne n'est entré par là.",
    unlocks: [{ kind: "word", word: "neuf jours" }, { kind: "dialogue", id: "X8" }],
    hints: [
      // Validé par l'auteur.
      "Il dit que tout a commencé avec moi. Quand est-ce que tout a commencé ?",
      "Cuisine compte tout. Même les jours.",
      "Neuf traits sur sa porte. Moi, je suis arrivé ce matin.",
    ],
  },
  {
    id: "X10", kind: "contradiction", title: "La lanterne de Lila", question: "q_etranger",
    pairs: [["lila_lantern", "note_lila_4"], ["lila_lantern", "service_threshold"]],
    text: "Lila est sortie seule, avant la nuit, bien avant moi.",
    unlocks: [{ kind: "dialogue", id: "X10" }],
    hints: [
      // Validé par l'auteur.
      "Cette lanterne d'enfant, qui l'a posée aux épaves ?",
      "Lila a laissé une liste dans la serre.",
      "« Les poser près de la porte de service. Avant la nuit. » Et de petits pas qui sortent.",
    ],
  },
  {
    id: "C5", kind: "sentence", title: "L'étranger", question: "q_etranger",
    requires: { cards: ["say_cook_accuse"] },
    text: "Personne n'est entré par [la porte de service] : le premier mordu est sorti de [l'infirmerie], la nuit de l'orage. Je suis arrivé [neuf jours] plus tard. Ce qui les a remis en marche, c'est [le bruit] de la génératrice.",
    clues: ["service_threshold", "c1", "c2", "nurse_watch", "cook_tally", "poster_notice", "noise_rule", "generator_restart"], minClues: 3,
    // Débloque le retournement (M5) ; Cuisine peut devenir Confiant.
    unlocks: [{ kind: "fact", id: "accused_cleared" }, { kind: "dialogue", id: "C5" }],
    hints: [
      "Quand est-ce que tout a commencé, exactement ?",
      "Cuisine compte tout. Même les jours.",
      "Neuf traits, une montre à 2 h 14, un seuil sans trace : et moi, j'étais où ?",
    ],
  },

  // ——— Couche 3 : qui a ouvert la chambre 1 ? ———
  {
    id: "X5", kind: "contradiction", title: "La petite aux piles", question: "q_ouverte",
    pairs: [["note_nurse", "note_lila_3"]],
    text: "Ce n'était pas Lila.",
    unlocks: [{ kind: "fact", id: "lila_cleared" }],
    hints: [
      // Validé par l'auteur.
      "L'infirmier a vu quelqu'un, avec une lampe. Il a cru que c'était Lila.",
      "Lila a écrit sa nuit, sous un oreiller des dortoirs.",
      "« Ma lampe aussi est morte. » Celle qui passait avait une lampe allumée.",
    ],
  },
  {
    id: "X6", kind: "contradiction", title: "« Coincée »", question: "q_ouverte",
    pairs: [["say_operator_stuck", "operator_latch"]],
    text: "Elle n'était pas coincée. Elle se cachait.",
    // Nouvelle question à lui poser (« Pourquoi vous cacher ? ») : elle détourne la conversation.
    unlocks: [{ kind: "dialogue", id: "X6" }],
    hints: [
      // Validé par l'auteur.
      "Elle dit qu'elle est restée coincée. Par quoi ?",
      "Le courant est revenu. Regarde la porte du local technique, de près.",
      "Un loquet manuel, tourné de l'intérieur. « Coincée » ?",
    ],
  },
  {
    id: "X7", kind: "contradiction", title: "« Ma Nuit »", question: "q_ouverte",
    pairs: [["note_control", "marceau_ring"], ["note_control", "photo_inseparables"]],
    text: "“Ma Nuit”… c'est elle, sa femme.",
    unlocks: [{ kind: "word", word: "femme" }, { kind: "dialogue", id: "X7" }],
    hints: [
      // Validé par l'auteur.
      "Qui signe ses notes d'un nom qui n'en est pas un ?",
      "Une alliance, une photo signée « N. ». Pour qui ?",
      "« À ma Nuit. » « Opératrice de nuit. »",
    ],
  },
  {
    id: "X9", kind: "contradiction", title: "Le voyant", question: "q_ouverte",
    pairs: [["say_operator_door", "note_radio_logbook"]],
    text: "Sans courant, pas de voyant. Elle n'a rien vu. Pourquoi l'inventer ?",
    // Nouvelle question à lui poser ; elle passe sur la défensive.
    unlocks: [{ kind: "fact", id: "operator_defensive" }, { kind: "dialogue", id: "X9" }],
    hints: [
      // Validé par l'auteur.
      "Elle dit avoir vu le voyant de la porte de service, la nuit de l'orage.",
      "Son propre cahier de relève dit ce qui s'est passé à 2 h 00.",
      "« 2 h 00 : orage, coupure. » Un voyant sans courant ?",
    ],
  },
  {
    id: "C4", kind: "sentence", title: "L'accusation", question: "q_ouverte",
    requires: { deductions: ["C2"] },
    text: "La nuit de l'orage, [l'opératrice de nuit] a ouvert la chambre 1 vers [2 h 05], avec une lampe [verte]. Elle était sa [femme]. Elle voulait lui [dire adieu].",
    clues: ["note_lila_3", "green_shard", "operator_lamp", "note_radio_logbook", "c7", "note_nurse", "marceau_ring", "photo_inseparables", "note_control", "terminal_log", "note_room1_file", "audio_loop"],
    minClues: 5,
    // Débloque la scène où elle confirme (§ 15), et la ligne de fin « vérité trouvée ».
    unlocks: [{ kind: "fact", id: "case_solved" }, { kind: "dialogue", id: "C4" }, { kind: "thought", id: "t_resume" }],
    hints: [
      "Qui avait une lumière allumée, cette nuit-là ?",
      "Lila parle d'une couleur. Où ai-je vu cette couleur ?",
      "Lampe verte, “ma Nuit”, un trou dans le cahier à 2 h 10.",
    ],
  },
];

/** Pensées en cas d'erreur (§ 16) : une erreur ne punit jamais. */
export const ERRORS: ErrorThought[] = [
  { deduction: "C4", word: "Lila", slot: 0, text: "Sa lampe était morte, elle l'a écrit. Celle qui est passée avait une lampe allumée." },
  { deduction: "C4", word: "Cuisine", slot: 0, text: "À 2 h 10, il comptait ses piles à l'entrepôt. On ne peut pas être aux deux bouts du silo." },
  { deduction: "C4", word: "Bérard", slot: 0, text: "Il était à son poste, son journal le dit. Il a menti sur Marceau, pas sur ses heures." },
  { deduction: "C4", word: "Okafor", slot: 0, text: "Elle dormait. Et elle écrit “elle lui parle”. C'est quelqu'un d'autre." },
  { deduction: "C4", word: "le libérer", slot: 4, text: "Si elle voulait le libérer, pourquoi s'enfermer juste après ?" },
  { deduction: "C1", word: "la serre", text: "Rien ne luit dans la serre. La traînée part de l'infirmerie." },
  { deduction: "C2", word: "Okafor", slot: 2, text: "Elle ne sortait jamais. Qui était à l'expédition ?" },
  { cards: ["poster_notice", "note_infirmary"], text: "La lumière et la porte de service, ça n'a rien à voir. Regarde le seuil, de près." },
  { cards: ["green_shard", "lila_lantern"], text: "La lanterne de Lila est blanche. Ce vert vient d'ailleurs." },
  { deduction: "C5", word: "le guetteur", slot: 3, text: "Le guetteur est dehors. Ce qui a fait du bruit dedans, c'est moi." },
  { deduction: "C5", word: "un jour", slot: 2, text: "Il a tracé plus d'un trait sur sa porte." },
  { cards: ["poster_notice", "say_cook_accuse"], text: "Ces deux-là disent la même chose. Il me faut un fait, pas une affiche." },
];

export const GENERIC: GenericThoughts = {
  wrong: [
    "Non… ces deux-là ne se parlent pas. Pas encore.",
    "Je force la pièce. Quand ça ne rentre pas, c'est que ce n'est pas la bonne.",
    "Il me manque un morceau. Peut-être dans une pièce que je n'ai pas fouillée.",
  ],
  almost: "Presque… un détail cloche.",
  tooFew: "Il me manque un morceau. Peut-être dans une pièce que je n'ai pas fouillée.",
  // Validé par l'auteur.
  already: "Ces deux-là, je les ai déjà reliées.",
};

/** Les trois énigmes (§ 14) : chacune s'ouvre avec une information, pas un objet. */
export const PUZZLES: Puzzle[] = [
  {
    id: "locker", kind: "letters",
    prompt: "Six molettes de lettres.",
    answer: ["P", "E", "C", "H", "E", "S"],
    error: "Qu'est-ce qu'on mange encore et encore, ici ?",
    onSolve: [{ do: "sound", cue: "door_open", x: POS.battery_locker.x, z: POS.battery_locker.z }],
    // Récompense : 3 piles, une trousse, et la feuille de comptage.
    unlocks: [{ kind: "card", card: "note_battery_count" }],
    items: [{ kind: "cell", amount: 3 }, { kind: "medkit", amount: 1 }],
    solved: "Le cadenas s'ouvre. Dedans : 3 piles, une trousse, et une feuille de comptage.",
  },
  {
    id: "shed", kind: "levers",
    prompt: "Un circuit à la fois. Abaissez les leviers dans le bon ordre.",
    options: ["DORTOIRS", "CAFÉTÉRIA", "INFIRMERIE", "CONTRÔLE"],
    answer: ["DORTOIRS", "CAFÉTÉRIA", "INFIRMERIE", "CONTRÔLE"],
    // Validé par l'auteur : la pensée d'erreur (le document décrit seulement le disjoncteur).
    error: "Un circuit à la fois… et pas dans n'importe quel ordre.",
    onError: [
      { do: "sound", cue: "metal_clang", x: POS.levers.x, z: POS.levers.z },
      { do: "notice", text: "Le disjoncteur claque. Trois secondes de noir. Les leviers retombent." },
      // Le grand bruit : Marceau se tourne vers le tableau, sans un son.
      { do: "noise", x: POS.levers.x, z: POS.levers.z, radius: 14 },
    ],
    onSolve: [
      { do: "sound", cue: "electric_buzz", x: POS.levers.x, z: POS.levers.z },
      { do: "notice", text: "Le courant revient, circuit après circuit. L'interphone du local technique se rallume." },
    ],
    unlocks: [{ kind: "fact", id: "circuit_controle" }],
    solved: "Les quatre circuits tiennent : DORTOIRS, CAFÉTÉRIA, INFIRMERIE, CONTRÔLE.",
  },
  {
    id: "terminal", kind: "password",
    prompt: "MOT DE PASSE :",
    answer: ["MARCEAU"],
    error: "Le nom de celui qu'il n'aurait jamais laissé dehors.",
    wrongs: [
      { answer: "GUETTEUR", text: "Non. Celui-là, il l'a laissé dehors." },
      { answer: "OKAFOR", text: "Elle n'est jamais sortie. Il parle de quelqu'un qu'il aurait dû laisser dehors." },
    ],
    onSolve: [{ do: "sound", cue: "electric_buzz", x: POS.terminal.x, z: POS.terminal.z }],
    unlocks: [{ kind: "card", card: "terminal_log" }],
    solved: "Le terminal s'allume sur le journal du poste.",
  },
];
