// Étage 1 — objets à examiner (gros plans a1 à a16 et documents), d'après docs/HISTOIRE_PROPOSITION.md § 12 a et § 13.
// Positions : content/positions.ts (un seul endroit). Les objets portés par un mordu (`carrier`) s'examinent quand il
// est figé par la lampe, ou au sol s'il est abattu. Deux détails portés par le même mordu sont réunis en un seul gros
// plan (a3 + a4 : alliance et bracelet de Marceau ; a6 + mot : montre et mot de l'infirmier).
import type { Examinable } from "../types";
import { ENEMY } from "./links";
import { POS, type SpotId } from "./positions";

const place = (id: SpotId, radius = 0.45) => ({ room: POS[id].room, x: POS[id].x, z: POS[id].z, radius });

export const EXAMINABLES: Examinable[] = [
  // ——— Entrée (extérieur) ———
  {
    id: "a1", name: "Photo de l'inauguration", action: "Examiner", ...place("photo_inauguration", 0.35),
    marker: { shape: "photo", yaw: POS.photo_inauguration.yaw },
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
    id: "a15", name: "Seuil de la porte de service", action: "Examiner", ...place("service_threshold", 0.5),
    marker: { shape: "step", yaw: POS.service_threshold.yaw },
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
    id: "poster_rule", name: "Affiche de la règle n° 1", action: "Lire", ...place("poster_rule", 0.5),
    marker: { shape: "plaque", yaw: POS.poster_rule.yaw, y: 1.45, label: "RÈGLE N° 1" },
    card: "poster_rule",
    closeup: { glance: "Une affiche officielle, à côté de la porte.", aspect: 0.78, front: { art: "rule" } },
  },
  {
    id: "door_bolts", name: "Verrous de la grande porte", action: "Examiner", ...place("door_bolts", 0.45),
    marker: { shape: "bolts", yaw: POS.door_bolts.yaw, y: 1.0 },
    card: "door_bolts",
    closeup: { glance: "Trois gros verrous, graissés, du côté dehors.", aspect: 0.8, front: { art: "bolts" } },
  },

  // ——— Zone extérieure ———
  {
    id: "a5", name: "Lanterne d'enfant", action: "Examiner", ...place("lila_lantern", 0.4),
    marker: { shape: "lantern" },
    closeup: {
      glance: "Lanterne cabossée, verre blanc.",
      aspect: 0.8,
      front: { art: "lantern" },
      details: [
        { reveal: { by: "angle", axis: "pitch", min: 45, max: 85 }, text: "Gravé au crayon sur le socle : « Lila ». Réservoir vide.", card: "lila_lantern", thought: "t_lanterne", cue: "Basculez la lanterne : il y a quelque chose sous le socle." },
      ],
    },
  },
  {
    id: "note_expedition", name: "Brassard « GARDE » du guetteur", action: "Examiner", ...place("watchman", 0.6),
    carrier: ENEMY.watchman,
    marker: { shape: "sheet", label: "GARDE" },
    card: "note_expedition",
    closeup: {
      glance: "Une feuille pliée dans le brassard « GARDE ».",
      aspect: 0.82,
      front: { lines: ["Expédition aux épaves, pièces pour le régulateur. Retour à la nuit tombée.", "Sgt Bérard : RAS. Marceau (technique) : RAS.", "Guetteur : mordu. Laissé dehors, règle n° 1. — B."] },
    },
  },

  // ——— Génératrice ———
  {
    id: "a2", name: "Journal de maintenance", action: "Examiner", ...place("maintenance_log", 0.4),
    marker: { shape: "sheet", label: "JOURNAL" },
    closeup: {
      glance: "La note de l'équipe technique, page arrachée.",
      aspect: 0.8,
      front: { art: "imprint" },
      details: [
        { reveal: { by: "loupe", face: "front", x: 0.5, y: 0.5, radius: 0.16 }, text: "À la loupe, sur la page suivante : l'empreinte en creux du texte arraché.", card: "note_torn_imprint", cue: "La page suivante garde la trace du crayon. Passez la loupe." },
      ],
    },
  },
  {
    id: "a3", name: "Le Silencieux", action: "Examiner", ...place("marceau", 0.6),
    carrier: ENEMY.marceau,
    marker: { shape: "sheet", label: "BRACELET" },
    closeup: {
      glance: "Un bracelet d'hôpital au poignet, un anneau terni au doigt.",
      aspect: 1.2,
      front: { art: "hand" },
      back: { art: "ring" },
      details: [
        { reveal: { by: "loupe", face: "front", x: 0.36, y: 0.48, radius: 0.15 }, text: "Bracelet : « CHAMBRE 1 — DR O. — PATIENT n° 1 ».", card: "marceau_bracelet", thought: "t_bracelet", cue: "Passez la loupe sur le bracelet." },
        { reveal: { by: "angle", axis: "yaw", min: 140, max: 180 }, text: "À l'intérieur de l'alliance : « M. — à ma Nuit ».", card: "marceau_ring", cue: "Tournez l'anneau pour lire l'intérieur." },
      ],
    },
  },
  {
    id: "note_shed_left", name: "Consigne de délestage", action: "Lire", ...place("note_shed_left", 0.45),
    marker: { shape: "plaque", yaw: POS.note_shed_left.yaw, y: 1.3, label: "CONSIGNE" },
    card: "note_shed_left",
    closeup: {
      glance: "La moitié gauche d'une consigne, déchirée.",
      aspect: 0.75,
      front: { art: "shedLeft" },
    },
  },
  {
    id: "levers", name: "Tableau des circuits", action: "Remettre le courant", ...place("levers", 0.55),
    marker: { shape: "levers", yaw: POS.levers.yaw, y: 1.0 },
    puzzle: "shed",
    locked: { until: { facts: ["generator_powered"] }, message: "Les leviers sont morts : la génératrice ne tourne pas." },
    closeup: {
      glance: "Quatre leviers : DORTOIRS, CAFÉTÉRIA, INFIRMERIE, CONTRÔLE.",
      aspect: 1.3,
      front: { art: "levers" },
      details: [
        { reveal: { by: "loupe", face: "front", x: 0.5, y: 0.88, radius: 0.14 }, text: "Sous les leviers, des traits à la craie à moitié effacés : « D C I C ».", card: "chalk_levers", cue: "Il y a de la craie sous les leviers." },
      ],
    },
  },

  // ——— Sécurité ———
  {
    id: "note_shed_right", name: "Consigne de délestage", action: "Lire", ...place("note_shed_right", 0.45),
    marker: { shape: "plaque", yaw: POS.note_shed_right.yaw, y: 1.3, label: "CONSIGNE" },
    card: "note_shed_right",
    closeup: { glance: "La moitié droite d'une consigne, déchirée.", aspect: 0.75, front: { art: "shedRight" } },
  },
  {
    id: "terminal", name: "Terminal du poste", action: "Allumer", ...place("terminal", 0.5),
    marker: { shape: "terminal", yaw: POS.terminal.yaw },
    card: "note_terminal_postit",
    puzzle: "terminal",
    closeup: { glance: "Le terminal de Bérard demande un mot de passe. Un post-it est collé sur l'écran.", aspect: 1.3, front: { art: "terminal" } },
  },

  // ——— Hub ———
  {
    id: "poster_notice", name: "Avis à tous", action: "Lire", ...place("poster_notice", 0.5),
    marker: { shape: "poster", yaw: POS.poster_notice.yaw, label: "AVIS" },
    card: "poster_notice",
    closeup: { glance: "L'avis officiel, bien droit au milieu.", aspect: 0.78, front: { art: "notice" } },
  },

  // ——— Cafétéria ———
  {
    id: "note_cook_postit", name: "Post-it de Cuisine", action: "Lire", ...place("note_cook_postit", 0.4),
    marker: { shape: "plaque", yaw: POS.note_cook_postit.yaw, y: 1.3, label: "POST-IT" },
    card: "note_cook_postit",
    closeup: { glance: "Un post-it jaune, écrit gros.", aspect: 1, front: { art: "postit" } },
  },
  {
    id: "cook_tally", name: "Traits à la craie", action: "Examiner", ...place("cook_tally", 0.5),
    marker: { shape: "plaque", yaw: POS.cook_tally.yaw, y: 1.2, label: "IIII IIII" },
    card: "cook_tally",
    closeup: { glance: "Des traits à la craie sur la porte de la chambre froide.", aspect: 0.85, front: { art: "tally" } },
  },
  {
    id: "note_tray_ticket", name: "Ticket du plateau", action: "Examiner", ...place("commis", 0.6),
    carrier: ENEMY.commis,
    marker: { shape: "sheet", label: "PLATEAU" },
    card: "note_tray_ticket",
    closeup: { glance: "Un ticket glissé sous le plateau vide.", aspect: 1.5, front: { art: "ticket" } },
  },

  // ——— Entrepôt ———
  {
    id: "battery_locker", name: "Armoire à piles", action: "Ouvrir", ...place("battery_locker", 0.6),
    marker: { shape: "locker", yaw: POS.battery_locker.yaw },
    puzzle: "locker",
    closeup: { glance: "Une armoire cadenassée ; à côté, un panier à piles vide, retourné. Le cadenas a six molettes de lettres.", aspect: 0.9, front: { art: "padlock" } },
  },

  // ——— Infirmerie ———
  {
    id: "note_infirmary_map", name: "Plan de l'infirmerie", action: "Lire", ...place("note_infirmary_map", 0.45),
    marker: { shape: "plaque", yaw: POS.note_infirmary_map.yaw, y: 1.25, label: "PLAN" },
    card: "note_infirmary_map",
    closeup: { glance: "Le plan de l'infirmerie, punaisé au mur.", aspect: 1.3, front: { art: "plan" } },
  },
  {
    id: "okafor_drawer", name: "Tiroir du bureau", action: "Ouvrir", ...place("okafor_drawer", 0.35),
    marker: { shape: "drawer", yaw: POS.okafor_drawer.yaw },
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
  {
    id: "note_lila_2", name: "Panier à piles vide", action: "Examiner", ...place("note_lila_2", 0.35),
    marker: { shape: "sheet", label: "LISTE" },
    card: "note_lila_2",
    closeup: {
      glance: "Une liste d'enfant, au fond d'un panier vide.",
      aspect: 0.8,
      front: { lines: ["Pour le Dr O. :", "1. Quatre piles par nuit, pour les deux lampes de la chambre 1.", "2. Ne rien dire à Cuisine.", "3. Ce soir : armoire fermée. Plus rien."] },
    },
  },
  {
    id: "a6", name: "L'infirmier", action: "Examiner", ...place("nurse", 0.6),
    carrier: ENEMY.nurse,
    marker: { shape: "sheet", label: "MONTRE" },
    card: "note_nurse",
    closeup: {
      glance: "Une montre bracelet. Un mot dépasse de la blouse.",
      aspect: 1.2,
      front: { art: "watch" },
      back: { lines: ["Dr O. dort enfin. Je garde.", "2 h 10 : quelqu'un vient dans le couloir, avec une lampe.", "Ça doit être la petite, avec les piles."] },
      details: [
        { reveal: { by: "loupe", face: "front", x: 0.5, y: 0.45, radius: 0.16 }, text: "Arrêtée à 2 h 14, verre fendu.", card: "nurse_watch", thought: "t_montre", cue: "Passez la loupe sur le cadran. Le mot est au verso." },
      ],
    },
  },
  {
    id: "room1_cabinet", name: "Armoire de l'infirmerie", action: "Pousser", ...place("room1_cabinet", 0.6),
    marker: { shape: "drawer", yaw: POS.room1_cabinet.yaw },
    locked: { until: { unlocked: ["examinable:room1_cabinet"] }, message: "Une armoire lourde. « Ne pas déplacer l'armoire. » Pourquoi la pousser ?" },
    closeup: {
      glance: "L'armoire glisse sur ses raclures. Derrière, une porte : la chambre 1.",
      aspect: 0.8,
      front: { art: "cabinet" },
    },
  },
  // Chambre 1 : derrière l'armoire, une fois X1 ou X2 établie.
  {
    id: "a7", name: "Lampe de chevet", action: "Examiner", ...place("room1_lamp", 0.4),
    requires: { unlocked: ["examinable:room1_cabinet"] },
    marker: { shape: "lamp" },
    closeup: {
      glance: "Une lampe de chevet. La douille est vide.",
      aspect: 0.8,
      front: { art: "bedLamp" },
      details: [
        { reveal: { by: "loupe", face: "front", x: 0.5, y: 0.3, radius: 0.15 }, text: "Un éclat de verre vert coincé dans la douille. Les lampes de l'infirmerie sont blanches.", card: "green_shard", thought: "t_eclat", cue: "Passez la loupe sur la douille." },
      ],
    },
  },
  {
    id: "a8", name: "Serrure de la chambre 1", action: "Examiner", ...place("room1_lock", 0.4),
    requires: { unlocked: ["examinable:room1_cabinet"] },
    marker: { shape: "plaque", yaw: POS.room1_lock.yaw, y: 1.0, label: "SERRURE" },
    closeup: {
      glance: "Une serrure électrique.",
      aspect: 0.9,
      front: { art: "lock" },
      details: [
        { reveal: { by: "angle", axis: "yaw", min: 35, max: 60 }, text: "Sans courant, elle s'ouvre d'une poussée. Pas de clé, pas de code.", card: "room1_lock", cue: "Regardez la serrure de biais, côté gâche." },
      ],
    },
  },
  {
    id: "note_room1_file", name: "Dossier de la chambre 1", action: "Lire", ...place("note_room1_file", 0.4),
    requires: { unlocked: ["examinable:room1_cabinet"] },
    marker: { shape: "sheet", label: "DOSSIER" },
    card: "note_room1_file",
    closeup: {
      glance: "Un dossier médical, rangé sous le lit.",
      aspect: 0.8,
      front: { art: "file" },
      details: [
        { reveal: { by: "loupe", face: "front", x: 0.5, y: 0.3, radius: 0.15 }, text: "Rapport n° 1 : « Même forme que dans le vieux dossier du fond. »", card: "old_file", cue: "Le rapport n° 1 renvoie à autre chose. Passez la loupe." },
      ],
    },
  },

  // ——— Atelier ———
  {
    id: "a9", name: "Casier de Marceau", action: "Ouvrir", ...place("marceau_locker", 0.55),
    marker: { shape: "locker", yaw: POS.marceau_locker.yaw },
    locked: { until: { unlocked: ["examinable:a9"] }, message: "Un casier au nom à demi arraché. Fermé." },
    closeup: {
      glance: "Des outils rangés au millimètre, et une photo : Bérard et Marceau, bras dessus bras dessous.",
      aspect: 1.45,
      front: { art: "inseparables" },
      back: { art: "inseparablesBack" },
      details: [
        { reveal: { by: "angle", axis: "yaw", min: 140, max: 180 }, text: "Au dos : « Mes deux inséparables. — N. »", card: "photo_inseparables", cue: "Retournez la photo." },
      ],
    },
  },

  // ——— Salle de contrôle ———
  {
    id: "note_radio_logbook", name: "Cahier de relève de nuit", action: "Lire", ...place("note_radio_logbook", 0.4),
    marker: { shape: "sheet", label: "RELÈVE" },
    card: "note_radio_logbook",
    closeup: {
      glance: "Le cahier de relève, ouvert à la nuit de l'orage.",
      aspect: 1.35,
      front: { art: "logbook" },
      details: [
        { reveal: { by: "loupe", face: "front", x: 0.75, y: 0.58, radius: 0.14 }, text: "Rien entre 2 h 00 et 2 h 20, alors que les autres nuits ont une ligne toutes les 10 minutes.", card: "c7", cue: "Comparez avec la page des autres nuits, à la loupe." },
      ],
    },
  },
  {
    id: "a10", name: "Lampe verte", action: "Examiner", ...place("operator_lamp", 0.4),
    requires: { unlocked: ["puzzle:shed"] },
    marker: { shape: "lamp" },
    closeup: {
      glance: "Lampe de poche à filtre vert (« pour ne pas éblouir les écrans »).",
      aspect: 1.1,
      front: { art: "greenLamp" },
      details: [
        { reveal: { by: "loupe", face: "front", x: 0.26, y: 0.5, radius: 0.15 }, text: "Le filtre est ébréché : il manque un éclat.", card: "operator_lamp", cue: "Passez la loupe sur le filtre." },
      ],
    },
  },
  {
    id: "a11", name: "Porte du local technique", action: "Examiner", ...place("operator_latch", 0.5),
    requires: { unlocked: ["puzzle:shed"] },
    marker: { shape: "plaque", yaw: POS.operator_latch.yaw, y: 1.05, label: "LOCAL TECH." },
    closeup: {
      glance: "Un verrou électrique. Le courant est revenu : son voyant est vert.",
      aspect: 0.9,
      front: { art: "latch" },
      details: [
        { reveal: { by: "angle", axis: "yaw", min: 30, max: 60 }, text: "Par l'entrebâillement, le loquet manuel : il est tourné de l'intérieur.", card: "operator_latch", thought: "t_loquet", cue: "Regardez par l'entrebâillement, de biais." },
      ],
    },
  },

  // ——— Couloir nord ———
  {
    id: "a12", name: "Poche de poitrine du sergent", action: "Examiner", ...place("berard", 0.6),
    carrier: ENEMY.berard,
    marker: { shape: "sheet", label: "SIFFLET" },
    closeup: {
      glance: "Une feuille pliée, avec un sifflet.",
      aspect: 0.8,
      front: { art: "folded" },
      back: { lines: ["…Marceau, retour d'expédition : avant-bras bandé. Tient mal la clé.", "Il dit que c'est la tôle. On n'a pas de tôle, aux épaves…", "Ne rien dire. — B."] },
      details: [
        { reveal: { by: "angle", axis: "yaw", min: 140, max: 180 }, text: "Le texte entier, et en bas : « Ne rien dire. — B. »", card: "note_torn_page", cue: "Dépliez la feuille : retournez-la." },
      ],
    },
  },

  // ——— Dortoirs, pièce cachée ———
  {
    id: "note_lila_3", name: "Sous l'oreiller", action: "Examiner", ...place("note_lila_3", 0.4),
    marker: { shape: "sheet", label: "LISTE" },
    card: "note_lila_3",
    closeup: {
      glance: "Une liste d'enfant, sous un petit oreiller de travers.",
      aspect: 0.8,
      front: { lines: ["Nuit de l'orage.", "1. Plus de piles. Ma lampe aussi est morte.", "2. 2 h 05 : une lampe VERTE passe dans le couloir est. Pas un bruit.", "3. Le lendemain : je frappe à la radio. Personne. Mais du vert sous la porte.", "4. Quelqu'un sait, et ne dit rien."] },
    },
  },
  {
    id: "a13", name: "Clé d'accès", action: "Examiner", ...place("keycard_tag", 0.35),
    requires: { facts: ["secret_revealed"] },
    marker: { shape: "sheet", label: "ÉTIQUETTE" },
    card: "keycard_tag",
    closeup: { glance: "Une carte-clé, avec une étiquette.", aspect: 1.5, front: { art: "keyTag" } },
  },
  {
    id: "a14", name: "Dessin de Lila", action: "Examiner", ...place("lila_drawing", 0.4),
    requires: { facts: ["secret_revealed"] },
    marker: { shape: "sheet", label: "DESSIN" },
    card: "lila_drawing",
    closeup: { glance: "Le silo dessiné en coupe.", aspect: 0.7, front: { art: "drawing" } },
  },

  // ——— Serre ———
  {
    id: "note_lila_4", name: "Liste d'enfant", action: "Lire", ...place("note_lila_4", 0.4),
    marker: { shape: "sheet", label: "LISTE" },
    card: "note_lila_4",
    closeup: {
      glance: "Une liste, près du petit arrosoir.",
      aspect: 0.8,
      front: { lines: ["Pour rallumer l'étage : 3 pièces.", "1. Une dans la serre. 2. Deux dans les épaves, dehors.", "3. Les poser près de la porte de service. Avant la nuit.", "Si je reviens pas : la clé est où j'ai dit."] },
    },
  },

  // ——— Sacoche de Lou (L1) ———
  {
    // Le paquet noué : on ne peut pas l'ouvrir. Lou se tait sur ce qu'il contient.
    id: "a16", name: "Paquet noué", action: "Examiner", room: "plaza", x: 0, z: 41, radius: 0.3,
    carried: true,
    marker: { shape: "sheet" },
    closeup: { glance: "Un chiffon noué, lourd.", aspect: 1.2, front: { art: "bundle" } },
  },
];
