// Étage 1 — questions du tableau (couches du mystère et questions sans réponse) et cartes d'indices.
// Textes : docs/HISTOIRE_PROPOSITION.md § 12 et § 13, docs/MEFIANCE_SURVIVANTS.md § 10, mot pour mot.
// Les 7 notes canon de game/notes.ts sont reprises telles quelles (`canon`). Les lignes « Proposé » ne sont pas
// dans le document : à valider par l'auteur.
import { NOTES } from "../../notes";
import type { Card, Question } from "../types";

const canon = (id: string, room: Card["room"], question: string, words: string[] = []): Card => ({
  id, title: NOTES[id].title, text: NOTES[id].text, source: NOTES[id].author, room, icon: "note", question, words, note: id,
});

export const QUESTIONS: Question[] = [
  // Couche 1 : entrée → génératrice → hub.
  { id: "q_reste", title: "Qui est resté ?", layer: 1 },
  { id: "q_porte", title: "Comment les mordus sont-ils entrés ?", layer: 1 },
  // Se débloque après l'accusation (M3) : la carte « Accusation de Cuisine ».
  { id: "q_etranger", title: "Comment prouver que je n'y suis pour rien ?", layer: 1, requires: { cards: ["say_cook_accuse"] } },
  // Couche 2 : cafétéria, entrepôt, infirmerie, atelier.
  { id: "q_chambre1", title: "Qui était dans la chambre 1, et qui l'a caché ?", layer: 2 },
  { id: "q_piles", title: "Pour qui, les piles ?", layer: 2 },
  // Couche 3 : salle de contrôle, dortoirs, pièce cachée.
  { id: "q_ouverte", title: "Qui a ouvert la chambre 1 ?", layer: 3 },
  // Questions sans réponse (indices dormants, § 16 et § 20).
  { id: "q_verrous", title: "Pourquoi les verrous de la grande porte sont-ils dehors ?", layer: 9, dormant: true },
  { id: "q_photo", title: "Qui est la personne de dos, sur la photo de la porte ?", layer: 9, dormant: true },
  { id: "q_dossier", title: "Quel « vieux dossier du fond » Okafor connaissait-elle ?", layer: 9, dormant: true },
  { id: "q_lila", title: "Où est Lila ? Qui tape « VIENS » ?", layer: 9, dormant: true },
];

export const CARDS: Card[] = [
  // ——— Entrée (extérieur) ———
  { id: "chalk_door", title: "Craie sur la grande porte", text: "ILS SONT DESCENDUS. PAS TOUS.", source: "À la craie, lettres d'enfant", room: "plaza", icon: "chalk", question: "q_reste" },
  {
    // Proposé : la voix de la première minute devient une carte (d1).
    id: "audio_gate", title: "La voix de la guérite", icon: "audio", room: "plaza", question: "q_reste", source: "Radio de la guérite",
    text: "« …ici l'opératrice de nuit… c'est l'heure de la relève… il y a quelqu'un ? »\nPuis la pile de la radio meurt. Plus rien.",
    words: ["l'opératrice de nuit"],
  },
  canon("note_entrance", "plaza", "q_porte", ["la porte de service", "Bérard"]),
  {
    id: "poster_rule", title: "Règle n° 1", icon: "poster", room: "plaza", question: "q_verrous", source: "Affiche, à côté de la porte",
    text: "RÈGLE N° 1\nAucun mordu ne franchit la porte. Pas d'exception.\n— Les fondateurs", image: "rule",
  },
  {
    // Proposé (texte) : le document décrit les verrous sans en faire un document.
    id: "door_bolts", title: "Verrous de la grande porte", icon: "object", room: "plaza", question: "q_verrous", source: "Gros plan",
    text: "Les gros verrous de la grande porte sont du côté dehors.", image: "bolts",
  },
  {
    id: "photo_inauguration", title: "Photo de l'inauguration", icon: "photo", room: "plaza", question: "q_photo", source: "Photo de la guérite",
    text: "Trente personnes devant la porte neuve. Au premier plan, quelqu'un de dos, en blouse, une valise marquée d'un triangle à la main.\nVerso : « Jour de la porte. »",
    image: "inauguration",
  },
  {
    id: "service_threshold", title: "Seuil de la porte de service", icon: "object", room: "plaza", question: "q_porte", source: "Gros plan",
    text: "De petits pas qui sortent, anciens. Une seule paire de bottes qui entre, fraîche : les miennes.", image: "threshold",
    words: ["rouge"], flag: true,
  },
  { id: "c1", title: "Seuil, à la lampe UV", text: "Rien. Pas une trace de mordu au seuil.", source: "Lampe UV", room: "plaza", icon: "trace", question: "q_porte" },

  // ——— Zone extérieure ———
  {
    id: "note_expedition", title: "Feuille d'expédition", icon: "note", room: "exterior", question: "q_chambre1", source: "Dans le brassard du guetteur",
    text: "Expédition aux épaves, pièces pour le régulateur. Retour à la nuit tombée.\nSgt Bérard : RAS. Marceau (technique) : RAS.\nGuetteur : mordu. Laissé dehors, règle n° 1. — B.",
    words: ["Marceau", "l'expédition", "le guetteur", "se venger"],
  },
  {
    id: "lila_lantern", title: "Lanterne de Lila", icon: "object", room: "exterior", question: "q_lila", source: "Près des épaves",
    text: "Lanterne cabossée, verre blanc.\nGravé au crayon sur le socle : « Lila ». Réservoir vide.", image: "lantern",
    words: ["blanche"], flag: true,
  },
  {
    // Proposé : la règle du bruit, montrée à la zone extérieure (§ 7, règle 3), devient une carte.
    id: "noise_rule", title: "Le bruit les attire", icon: "trace", room: "exterior", question: "q_porte", source: "Vu à la zone extérieure",
    text: "Un coup de tôle, et le guetteur tourne la tête vers le bruit.", words: ["le bruit"],
  },

  // ——— Génératrice ———
  canon("note_generator", "generator", "q_porte", ["la serre", "les épaves"]),
  {
    id: "note_torn_imprint", title: "Empreinte de la page arrachée", icon: "note", room: "generator", question: "q_chambre1", source: "À la loupe, journal de maintenance",
    text: "…Marceau, retour d'expédition : avant-bras bandé. Tient mal la clé.\nIl dit que c'est la tôle. On n'a pas de tôle, aux épaves…",
    words: ["Marceau", "l'expédition"],
  },
  {
    // Proposé (texte) : message canon du jeu à la relance.
    id: "generator_restart", title: "La génératrice repart", icon: "audio", room: "generator", question: "q_porte", source: "Génératrice",
    text: "La génératrice tousse… puis tourne.\nLe moteur fait du bruit dans tout l'étage.", words: ["le bruit"],
  },
  {
    id: "note_shed_left", title: "Consigne de délestage (moitié gauche)", icon: "note", room: "generator", question: "q_reste", source: "Équipe technique, déchirée",
    text: "APRÈS UN REDÉMARRAGE, un circuit à la fois :\n– Jamais le CONTRÔLE en premier : la console tire trop.\n– L'INFIRMERIE passe juste après la (déchiré)",
  },
  {
    id: "chalk_levers", title: "Craie au tableau des leviers", icon: "chalk", room: "generator", question: "q_reste", source: "À moitié effacée",
    text: "D C I C",
  },
  {
    id: "marceau_ring", title: "Alliance de Marceau", icon: "object", room: "generator", question: "q_ouverte", source: "Au doigt du Silencieux",
    text: "Un anneau terni. À l'intérieur : « M. — à ma Nuit ».", image: "ring", flag: true,
  },
  {
    id: "marceau_bracelet", title: "Bracelet de Marceau", icon: "object", room: "generator", question: "q_chambre1", source: "Au poignet du Silencieux",
    text: "Bracelet d'hôpital : « CHAMBRE 1 — DR O. — PATIENT n° 1 ».", image: "bracelet",
    words: ["la chambre 1", "médecin"],
  },

  // ——— Sécurité ———
  {
    id: "note_shed_right", title: "Consigne de délestage (moitié droite)", icon: "note", room: "security", question: "q_reste", source: "Équipe technique, déchirée",
    text: "(déchiré) CAFÉTÉRIA.\n– Les DORTOIRS toujours avant la cafétéria : les petits dorment.\n– Le CONTRÔLE en dernier.",
  },
  {
    id: "note_terminal_postit", title: "Post-it sur le terminal", icon: "note", room: "security", question: "q_chambre1", source: "Terminal du Sgt Bérard",
    text: "Mot de passe : le nom de celui que je n'aurais jamais laissé dehors.",
  },
  {
    id: "terminal_log", title: "Journal du poste", icon: "note", room: "security", question: "q_chambre1", source: "Terminal du Sgt Bérard",
    text: "J−12. Retour d'expédition. M. entre avec moi. Personne ne saura.\nOrage. 1 h 50, canal 2, Dr O. : « À l'aube, on le sort. Règle n° 1. » J'ai dit oui.\n2 h 00 : RAS. 2 h 15 : alarme infirmerie.\nLendemain : version officielle avec le Dr O. : la porte de service.",
    words: ["Bérard", "Okafor", "1 h 50", "dire adieu"],
  },
  {
    // Proposé (carte) : la boucle du haut-parleur (d4).
    id: "audio_loop", title: "Le haut-parleur de la sécurité", icon: "audio", room: "security", question: "q_ouverte", source: "Enregistrement en boucle",
    text: "« …canal 2… à l'aube… »", words: ["dire adieu"],
  },

  // ——— Hub central ———
  {
    id: "poster_notice", title: "Avis à tous", icon: "poster", room: "hub", question: "q_porte", source: "Affiche officielle, hub central",
    text: "AVIS À TOUS. Pendant l'orage, des mordus sont entrés par la porte de service.\nLe Dr Okafor et le Sgt Bérard organisent la descente vers l'étage 2.\nNe prenez que le nécessaire. Ne remontez pas.",
    words: ["la porte de service"], image: "notice",
  },
  {
    id: "say_cook_accuse", title: "Accusation de Cuisine", icon: "audio", room: "hub", question: "q_etranger", source: "Cuisine (M1, M3)",
    text: "« T'es rentré par la porte de service. Depuis que t'es là, ils marchent. »",
  },
  {
    id: "c3", title: "Traînée du hub", text: "La même traînée, sans détour, jusqu'au moteur.", source: "Lampe UV", room: "hub", icon: "trace", question: "q_porte",
    words: ["la génératrice"],
  },

  // ——— Cafétéria ———
  canon("note_cafeteria", "cafeteria", "q_piles", ["Cuisine"]),
  {
    id: "note_cook_postit", title: "Post-it de Cuisine", icon: "note", room: "cafeteria", question: "q_piles", source: "Cuisine",
    text: "Code de l'armoire à piles : ce qu'on mange ENCORE.\n(Comme ça, même le commis s'en souviendra.)",
  },
  {
    id: "cook_tally", title: "Traits sur la porte de la chambre froide", icon: "chalk", room: "cafeteria", question: "q_etranger", source: "À la craie",
    text: "Neuf traits à la craie, un par jour depuis l'orage.", image: "tally", words: ["un jour"], flag: true,
  },
  {
    id: "note_tray_ticket", title: "Ticket de plateau", icon: "note", room: "cafeteria", question: "q_chambre1", source: "Sur le commis",
    text: "Plateau — chambre 1. Le poser devant la porte, frapper deux fois.\nNE PAS ENTRER. — Dr O.", image: "ticket",
    words: ["la chambre 1"],
  },
  {
    // Proposé (texte) : l'habitude du commis, vue sans le figer (X2 « ou habitude du commis »).
    id: "commis_habit", title: "Le commis et ses plateaux", icon: "object", room: "cafeteria", question: "q_chambre1", source: "Vu à la cafétéria",
    text: "Il porte un plateau vide jusqu'à la chambre froide, le pose, frappe deux fois, repart.",
  },
  {
    id: "say_cook_witness", title: "Témoignage de Cuisine", icon: "audio", room: "cafeteria", question: "q_piles", source: "Cuisine",
    text: "« Moi, j'étais à l'entrepôt, à compter mes piles, quand ça a crié. »\n« J'ai mis un cadenas, et ce soir-là elle est venue m'en réclamer une. J'ai dit non. »",
  },

  // ——— Entrepôt ———
  canon("note_storage", "storage", "q_reste", ["les dortoirs", "Lila"]),
  {
    id: "note_battery_count", title: "Feuille de comptage", icon: "note", room: "storage", question: "q_piles", source: "Dans l'armoire à piles",
    text: "Lundi : 31. Mardi : 27. Mercredi : 23. Il en manque 4 par nuit.\nNuit de l'orage, 2 h 10 : cadenas vérifié. Aucune sortie.\nLa petite est venue en demander une, ce soir. J'ai dit non. — Cuisine",
    words: ["2 h 10"],
  },

  // ——— Infirmerie ———
  canon("note_infirmary", "infirmary", "q_chambre1", ["Okafor", "la lumière"]),
  {
    id: "note_infirmary_map", title: "Plan de l'infirmerie", icon: "note", room: "infirmary", question: "q_chambre1", source: "Au mur",
    text: "Lits 1 à 6. Pharmacie. Bureau du Dr Okafor.\nChambre 1 : CONDAMNÉE (humidité). Ne pas déplacer l'armoire.",
    words: ["la chambre 1"], image: "plan",
  },
  { id: "c2", title: "Traînée de l'infirmerie", text: "Une traînée part de l'armoire.", source: "Lampe UV", room: "infirmary", icon: "trace", question: "q_porte", words: ["l'infirmerie"] },
  { id: "c5", title: "Tampon invisible", text: "Sous « CONDAMNÉE » sur le plan, au tampon invisible : « PATIENT n° 1 ».", source: "Lampe UV", room: "infirmary", icon: "trace", question: "q_chambre1" },
  {
    id: "note_nurse", title: "Mot de l'infirmier", icon: "note", room: "infirmary", question: "q_ouverte", source: "Dans la blouse de l'infirmier",
    text: "Dr O. dort enfin. Je garde.\n2 h 10 : quelqu'un vient dans le couloir, avec une lampe.\nÇa doit être la petite, avec les piles.",
    words: ["2 h 10", "Lila"],
  },
  {
    id: "nurse_watch", title: "Montre de l'infirmier", icon: "object", room: "infirmary", question: "q_etranger", source: "Au poignet de l'infirmier",
    text: "Arrêtée à 2 h 14, verre fendu.", image: "watch", words: ["2 h 14"], flag: true,
  },
  {
    id: "note_lila_2", title: "Liste de Lila n° 2", icon: "note", room: "infirmary", question: "q_piles", source: "Panier vide, bureau d'Okafor",
    text: "Pour le Dr O. :\n1. Quatre piles par nuit, pour les deux lampes de la chambre 1.\n2. Ne rien dire à Cuisine.\n3. Ce soir : armoire fermée. Plus rien.",
    words: ["lampes", "Lila"],
  },
  {
    id: "note_notice_draft", title: "Brouillon de l'avis", icon: "note", room: "infirmary", question: "q_chambre1", source: "Tiroir du Dr Okafor",
    text: "AVIS À TOUS. Pendant l'orage, des mordus sont entrés par la porte de service…\n(En marge :) B. — c'est mieux ainsi. Personne ne doit savoir pour M.",
    image: "draft",
  },
  // Chambre 1.
  {
    id: "note_room1_file", title: "Dossier de la chambre 1", icon: "note", room: "infirmary", question: "q_chambre1", source: "Dans la chambre 1",
    text: "Rapport n° 1 : patient M., morsure à l'avant-bras. Même forme que dans le vieux dossier du fond.\nRapport n° 7 : sous deux lampes, il reste assis. Il se calme quand elle lui parle.\nRapport n° 11 : il ne parle plus. Il ne grogne plus. Plus aucun bruit. — Dr O.",
    words: ["Okafor", "le soigner"],
  },
  {
    // Proposé (carte) : le « vieux dossier du fond » rangé dans la colonne des questions sans réponse.
    id: "old_file", title: "Le vieux dossier du fond", icon: "note", room: "infirmary", question: "q_dossier", source: "Rapport n° 1, à la loupe",
    text: "« Même forme que dans le vieux dossier du fond. »",
  },
  {
    id: "green_shard", title: "Éclat de verre vert", icon: "object", room: "infirmary", question: "q_ouverte", source: "Lampe de chevet, chambre 1",
    text: "Un éclat de verre vert coincé dans la douille.\nLes lampes de l'infirmerie sont blanches.", image: "bedLamp", words: ["verte"], flag: true,
  },
  {
    id: "room1_lock", title: "Serrure de la chambre 1", icon: "object", room: "infirmary", question: "q_ouverte", source: "Gros plan",
    text: "Serrure électrique. Sans courant, elle s'ouvre d'une poussée. Pas de clé, pas de code.", image: "lock", words: ["le libérer"],
  },
  { id: "c4", title: "Empreintes près du lit", text: "Deux empreintes de semelles fines près du lit, vivantes (pas de bave).", source: "Lampe UV", room: "infirmary", icon: "trace", question: "q_ouverte" },

  // ——— Atelier ———
  {
    id: "photo_inseparables", title: "Photo des inséparables", icon: "photo", room: "workshop", question: "q_ouverte", source: "Casier de Marceau",
    text: "Bérard et Marceau, couverts de cambouis, hilares, devant la génératrice.\nVerso : « Mes deux inséparables. — N. »",
    image: "inseparables", words: ["amie"],
  },

  // ——— Salle de contrôle ———
  canon("note_control", "control", "q_ouverte", ["l'opératrice de nuit", "radios"]),
  {
    id: "note_radio_logbook", title: "Cahier de relève de nuit", icon: "note", room: "control", question: "q_ouverte", source: "Console radio",
    text: "1 h 40 : RAS. 1 h 50 : canal 2 (Dr O. / Sgt B.).\n2 h 00 : orage, coupure.\n2 h 20 : RAS.", image: "logbook",
    words: ["1 h 50"],
  },
  { id: "c7", title: "Le trou dans la relève", text: "Rien entre 2 h 00 et 2 h 20, alors que les autres nuits ont une ligne toutes les 10 minutes.", source: "À la loupe, cahier de relève", room: "control", icon: "trace", question: "q_ouverte" },
  {
    id: "operator_lamp", title: "Lampe de l'opératrice", icon: "object", room: "control", question: "q_ouverte", source: "Au guichet du local technique",
    text: "Lampe de poche à filtre vert (« pour ne pas éblouir les écrans »).\nLe filtre est ébréché : il manque un éclat.", image: "greenLamp", words: ["verte"],
  },
  {
    id: "operator_latch", title: "Loquet du local technique", icon: "object", room: "control", question: "q_ouverte", source: "Gros plan",
    text: "Un verrou électrique. Le loquet manuel est tourné de l'intérieur.", image: "latch",
  },
  { id: "c8", title: "Traînées devant le local technique", text: "Traînées de mordu devant le local technique, aucune derrière.", source: "Lampe UV", room: "control", icon: "trace", question: "q_ouverte" },
  {
    id: "say_operator_stuck", title: "L'opératrice : « coincée »", icon: "audio", room: "control", question: "q_ouverte", source: "L'opératrice, à l'interphone",
    text: "« Je suis restée coincée depuis l'orage. Le courant, la serrure… vous voyez. »",
  },
  {
    id: "say_operator_door", title: "Déclaration de l'opératrice", icon: "audio", room: "control", question: "q_etranger", source: "Au haut-parleur (M2)",
    text: "« Mon tableau dit que la porte de service est ouverte. L'étranger est entré par là.\nLa nuit de l'orage aussi, j'ai vu le voyant s'allumer. J'étais à ma console. »",
  },
  {
    id: "audio_below", title: "La voix qui grésille", icon: "audio", room: "control", question: "q_lila", source: "Radio réparée",
    text: "« …ici l'étage 2… Dr Okafor… L'étage 1 est condamné. Ne descendez pas.\nLila ? Lila, si tu m'entends… tu n'es jamais arrivée. Pardon. »",
  },
  {
    id: "audio_tapping", title: "Le signal", icon: "audio", room: "control", question: "q_lila", source: "Radio réparée",
    text: "Des bips tapés à la main : · · · – / · · / · / – · / · · ·\nV · I · E · N · S",
  },

  // ——— Couloir nord ———
  {
    id: "note_torn_page", title: "Page arrachée", icon: "note", room: "north", question: "q_chambre1", source: "Poche de poitrine du Sgt Bérard",
    text: "…Marceau, retour d'expédition : avant-bras bandé. Tient mal la clé.\nIl dit que c'est la tôle. On n'a pas de tôle, aux épaves…\nNe rien dire. — B.",
    words: ["Marceau", "Bérard"],
  },

  // ——— Dortoirs, pièce cachée ———
  {
    id: "note_lila_3", title: "Liste de Lila n° 3", icon: "note", room: "dorms", question: "q_ouverte", source: "Sous un oreiller",
    text: "Nuit de l'orage.\n1. Plus de piles. Ma lampe aussi est morte.\n2. 2 h 05 : une lampe VERTE passe dans le couloir est. Pas un bruit.\n3. Le lendemain : je frappe à la radio. Personne. Mais du vert sous la porte.\n4. Quelqu'un sait, et ne dit rien.",
    words: ["2 h 05", "verte", "Lila"],
  },
  canon("note_secret", "secret", "q_lila"),
  {
    id: "keycard_tag", title: "Étiquette de la clé", icon: "object", room: "secret", question: "q_lila", source: "Clé d'accès",
    text: "« Pour Lila — ferme derrière toi. — Dr O. »", image: "keyTag",
  },
  {
    id: "lila_drawing", title: "Dessin de Lila", icon: "photo", room: "secret", question: "q_lila", source: "Pièce cachée",
    text: "Le silo dessiné en coupe. Quatre étages ; une croix sur le dernier ; une flèche « ICI ÇA TAPE » au troisième.", image: "drawing",
  },

  // ——— Serre ———
  {
    id: "note_lila_4", title: "Liste de Lila n° 4", icon: "note", room: "greenhouse", question: "q_lila", source: "Serre",
    text: "Pour rallumer l'étage : 3 pièces.\n1. Une dans la serre. 2. Deux dans les épaves, dehors.\n3. Les poser près de la porte de service. Avant la nuit.\nSi je reviens pas : la clé est où j'ai dit.",
  },
];
