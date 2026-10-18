// Enquête de l'étage 1 — PROTOTYPE : 3 déductions (X1, C1, X4), leurs cartes, 2 gros plans à détail caché
// (photo de l'inauguration a1, seuil de la porte de service a15) et un tiroir, 4 traces UV (c1, c2, c3, c5),
// des pensées de Lou et 2 événements étranges (d1, d7).
// Textes et identifiants : docs/HISTOIRE_PROPOSITION.md (§ 12, 13, 16, 17), mot pour mot. Les positions
// suivent le § 22 quand le décor existe, sinon une place libre proche (à ajuster avec le décor définitif).
// Les lignes marquées « proposé » n'existent pas dans le document : à valider par l'auteur.
import { NOTES } from "../../notes";
import type { Card, InvestigationContent } from "../types";

const canon = (id: string, room: Card["room"], question: string, words: string[] = []): Card => ({
  id, title: NOTES[id].title, text: NOTES[id].text, source: NOTES[id].author, room, icon: "note", question, words, note: id,
});

export const FLOOR1: InvestigationContent = {
  floor: 1,

  questions: [
    { id: "q_reste", title: "Qui est resté ?", layer: 1 },
    { id: "q_porte", title: "Comment les mordus sont-ils entrés ?", layer: 1 },
    { id: "q_chambre1", title: "Qui était dans la chambre 1, et qui l'a caché ?", layer: 2 },
    { id: "q_photo", title: "Qui est la personne de dos, sur la photo de la porte ?", layer: 9, dormant: true },
  ],

  cards: [
    { id: "chalk_door", title: "Craie sur la grande porte", text: "ILS SONT DESCENDUS. PAS TOUS.", source: "À la craie, lettres d'enfant", room: "plaza", icon: "chalk", question: "q_reste" },
    canon("note_entrance", "plaza", "q_porte", ["la porte de service"]),
    canon("note_generator", "generator", "q_porte", ["la serre", "les épaves"]),
    canon("note_storage", "storage", "q_reste", ["les dortoirs"]),
    canon("note_infirmary", "infirmary", "q_chambre1"),
    {
      id: "poster_notice", title: "Avis à tous", icon: "poster", room: "hub", question: "q_porte", source: "Affiche officielle, hub central",
      text: "AVIS À TOUS. Pendant l'orage, des mordus sont entrés par la porte de service.\nLe Dr Okafor et le Sgt Bérard organisent la descente vers l'étage 2.\nNe prenez que le nécessaire. Ne remontez pas.",
      words: ["la porte de service"], image: "notice",
    },
    {
      id: "service_threshold", title: "Seuil de la porte de service", icon: "object", room: "plaza", question: "q_porte", source: "Gros plan",
      text: "De petits pas qui sortent, anciens. Une seule paire de bottes qui entre, fraîche : les miennes.", image: "threshold",
    },
    { id: "c1", title: "Seuil, à la lampe UV", text: "Rien. Pas une trace de mordu au seuil.", source: "Lampe UV", room: "plaza", icon: "trace", question: "q_porte" },
    { id: "c2", title: "Traînée de l'infirmerie", text: "Une traînée part de l'armoire.", source: "Lampe UV", room: "infirmary", icon: "trace", question: "q_porte", words: ["l'infirmerie"] },
    { id: "c3", title: "Traînée du hub", text: "La même traînée, sans détour, jusqu'au moteur.", source: "Lampe UV", room: "hub", icon: "trace", question: "q_porte", words: ["la génératrice"] },
    {
      id: "note_infirmary_map", title: "Plan de l'infirmerie", icon: "note", room: "infirmary", question: "q_chambre1", source: "Au mur",
      text: "Lits 1 à 6. Pharmacie. Bureau du Dr Okafor.\nChambre 1 : CONDAMNÉE (humidité). Ne pas déplacer l'armoire.",
      words: ["la chambre 1"], image: "plan",
    },
    { id: "c5", title: "Tampon invisible", text: "Sous « CONDAMNÉE » sur le plan, au tampon invisible : « PATIENT n° 1 ».", source: "Lampe UV", room: "infirmary", icon: "trace", question: "q_chambre1" },
    {
      id: "note_notice_draft", title: "Brouillon de l'avis", icon: "note", room: "infirmary", question: "q_chambre1", source: "Tiroir du Dr Okafor",
      text: "AVIS À TOUS. Pendant l'orage, des mordus sont entrés par la porte de service…\n(En marge :) B. — c'est mieux ainsi. Personne ne doit savoir pour M.",
      image: "draft",
    },
    {
      id: "photo_inauguration", title: "Photo de l'inauguration", icon: "photo", room: "plaza", question: "q_photo", source: "Photo de la guérite",
      text: "Trente personnes devant la porte neuve. Au premier plan, quelqu'un de dos, en blouse, une valise marquée d'un triangle à la main.\nVerso : « Jour de la porte. »",
      image: "inauguration",
    },
  ],

  examinables: [
    {
      id: "a1", name: "Photo de l'inauguration", action: "Examiner", room: "plaza", x: 3.4, z: 30.1, radius: 0.35,
      marker: { shape: "photo", yaw: 0.4 },
      closeup: {
        glance: "Trente personnes souriantes devant la porte neuve.",
        aspect: 1.45,
        front: { art: "inauguration" },
        back: { art: "photoBack", lines: ["Jour de la porte."] },
        details: [
          { reveal: { by: "angle", axis: "yaw", min: 140, max: 180 }, text: "Au dos : « Jour de la porte. »", card: "photo_inauguration", cue: "Retournez la photo." },
          { reveal: { by: "loupe", face: "front", x: 0.29, y: 0.77, radius: 0.12 }, text: "Au premier plan, quelqu'un de dos, en blouse, tient une valise marquée d'un triangle.", thought: "t_triangle", cue: "Passez la loupe sur la personne de dos." },
        ],
      },
    },
    {
      id: "a15", name: "Seuil de la porte de service", action: "Examiner", room: "plaza", x: -10.25, z: 27, radius: 0.5,
      marker: { shape: "step", yaw: Math.PI / 2 },
      closeup: {
        glance: "Une marche usée, de la poussière.",
        aspect: 1.6,
        front: { art: "threshold" },
        details: [
          { reveal: { by: "angle", axis: "pitch", min: 48, max: 85 }, text: "De petits pas d'enfant qui sortent, anciens, à demi recouverts ; une seule paire de bottes qui entre, toute fraîche, avec de la boue rouge des épaves : celles de Lou.", card: "service_threshold", cue: "Inclinez la marche : la lumière rasante montre la poussière." },
        ],
      },
    },
    {
      id: "poster_notice", name: "Avis à tous", action: "Lire", room: "hub", x: -4.25, z: -3.9, radius: 0.5,
      marker: { shape: "poster", yaw: 0.83, label: "AVIS" },
      card: "poster_notice",
      closeup: { glance: "L'avis officiel, bien droit au milieu.", aspect: 0.78, front: { art: "notice" } },
    },
    {
      id: "note_infirmary_map", name: "Plan de l'infirmerie", action: "Lire", room: "infirmary", x: 10.5, z: -1.7, radius: 0.45,
      marker: { shape: "plaque", yaw: Math.PI / 2, y: 1.25, label: "PLAN" },
      card: "note_infirmary_map",
      closeup: { glance: "Le plan de l'infirmerie, punaisé au mur.", aspect: 1.3, front: { art: "plan" } },
    },
    {
      id: "okafor_drawer", name: "Tiroir du bureau", action: "Ouvrir", room: "infirmary", x: 13.4, z: 2.75, radius: 0.35,
      marker: { shape: "drawer", yaw: Math.PI },
      // Proposé : message tant que C1 n'est pas faite.
      locked: { until: { deductions: ["C1"] }, message: "Le tiroir du bureau est fermé à clé." },
      closeup: {
        glance: "Un brouillon froissé, au fond du tiroir.",
        aspect: 0.8,
        front: { art: "draft" },
        details: [
          { reveal: { by: "loupe", face: "front", x: 0.78, y: 0.72, radius: 0.14 }, text: "(En marge :) B. — c'est mieux ainsi. Personne ne doit savoir pour M.", card: "note_notice_draft", cue: "Passez la loupe sur la marge." },
        ],
      },
    },
  ],

  thoughts: [
    { id: "t_craie", text: "Pas tous. Alors quelqu'un est encore là-dedans.", trigger: { on: "near", x: 0, z: 25, radius: 4.2 }, then: "t_promesse", card: "chalk_door" },
    { id: "t_promesse", text: "Je ne devais pas entrer…", trigger: { on: "chain" } },
    { id: "t_releve", text: "Elle a dit “la relève”. À qui parle-t-elle ?", trigger: { on: "chain" } },
    { id: "t_triangle", text: "Ce triangle…", trigger: { on: "chain" }, then: "t_triangle_silence" },
    // Lou se tait : il ne dit pas « rien ».
    { id: "t_triangle_silence", trigger: { on: "chain" } },
    { id: "t_avis", text: "“Par la porte de service.” Ça se vérifie, une porte.", trigger: { on: "examine", examinable: "poster_notice" } },
    { id: "t_raclures", text: "Cette armoire a bougé. Souvent.", trigger: { on: "near", x: 18.4, z: 6.4, radius: 2.2 } },
    { id: "t_lueur", text: "Quelqu'un est vivant là-bas. Et ne veut pas qu'on le sache ?", trigger: { on: "chain" } },
  ],

  traces: [
    { id: "c1", room: "plaza", shape: { kind: "none", x: -10.1, z: 27, radius: 1.1 }, text: "Rien. Pas une trace de mordu au seuil.", card: "c1" },
    { id: "c2", room: "infirmary", shape: { kind: "trail", points: [[18.4, 6.9], [17.6, 5.0], [16.0, 2.2], [12.6, 0.7], [10.3, 0.15]] }, text: "Une traînée part de l'armoire.", card: "c2" },
    { id: "c3", room: "hub", shape: { kind: "trail", points: [[6.9, 0.2], [3.5, 1.4], [0, 1.0], [-3.5, -0.2], [-6.9, 0.1]] }, text: "La même traînée, sans détour, jusqu'au moteur.", card: "c3" },
    { id: "c5", room: "infirmary", shape: { kind: "stamp", x: 10.2, z: -1.7, y: 1.02, text: "PATIENT n° 1", yaw: Math.PI / 2 }, text: "Sous « CONDAMNÉE » sur le plan, au tampon invisible : « PATIENT n° 1 ».", card: "c5" },
  ],

  events: [
    {
      id: "d1", trigger: { on: "near", x: 4, z: 31, radius: 5 },
      actions: [
        { do: "sound", cue: "radio_static", x: 5, z: 32.4 },
        { do: "notice", text: "La radio grésille : « …ici l'opératrice de nuit… c'est l'heure de la relève… il y a quelqu'un ? » Puis plus rien." },
        { do: "thought", thought: "t_releve", delay: 4 },
      ],
    },
    {
      id: "d7", trigger: { on: "enter", room: "hub" }, requires: { facts: ["generator_powered"] },
      actions: [
        { do: "light", x: 8.5, z: -8.3, y: 0.15, color: "#7dff8a", duration: 3.2, delay: 0.8 },
        { do: "thought", thought: "t_lueur", delay: 2.4 },
      ],
    },
  ],

  deductions: [
    {
      id: "X1", kind: "contradiction", title: "L'avis et le seuil", question: "q_porte",
      pairs: [["poster_notice", "c1"]],
      text: "Personne n'est entré par la porte de service.",
      unlocks: [{ kind: "fact", id: "repere_armoire" }],
      hints: [
        "Je n'ai pas bien regardé la porte de service.",
        "Et si je l'éclairais à la lampe UV ?",
        // Proposé : le document ne donne pas de palier 3 pour X1.
        "L'avis dit « par la porte de service ». Le seuil, à la lampe UV, dit autre chose.",
      ],
    },
    {
      id: "C1", kind: "sentence", title: "L'origine", question: "q_porte",
      text: "Les mordus ne sont pas entrés par [la porte de service]. Le premier est sorti de [la chambre 1], à [l'infirmerie].",
      clues: ["c1", "c2", "c3", "note_infirmary_map", "c5"], minClues: 3,
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
        // Proposé : le document ne donne pas d'aide pour X4.
        "L'avis officiel… qui l'a écrit ?",
        "Le tiroir du Dr Okafor cachait un brouillon.",
        "Le brouillon et l'avis disent la même chose. Sauf la marge.",
      ],
    },
  ],

  errors: [
    { cards: ["poster_notice", "note_infirmary"], text: "La lumière et la porte de service, ça n'a rien à voir. Regarde le seuil, de près." },
    { deduction: "C1", word: "la serre", text: "Rien ne luit dans la serre. La traînée part de l'infirmerie." },
  ],

  generic: {
    wrong: [
      "Non… ces deux-là ne se parlent pas. Pas encore.",
      "Je force la pièce. Quand ça ne rentre pas, c'est que ce n'est pas la bonne.",
      "Il me manque un morceau. Peut-être dans une pièce que je n'ai pas fouillée.",
    ],
    almost: "Presque… un détail cloche.",
    tooFew: "Il me manque un morceau. Peut-être dans une pièce que je n'ai pas fouillée.",
    // Proposé.
    already: "Ces deux-là, je les ai déjà reliées.",
  },

  props: [
    { id: "chalk_door", kind: "chalk", x: 0, z: 23.32, y: 1.25, yaw: 0, text: "ILS SONT DESCENDUS.\nPAS TOUS." },
    { id: "room1_cabinet", kind: "cabinet", x: 18.4, z: 7.55, yaw: Math.PI },
    { id: "room1_scrapes", kind: "scrapes", x: 18.4, z: 6.7, yaw: 0 },
  ],
};
