// Étage 1 — pensées de Lou (§ 12 b), traces de la lampe UV (§ 12 c), événements étranges (§ 12 d), première minute
// (§ 4) et secret de Lou, option A (L1 à L3, MEFIANCE_SURVIVANTS § 4). Textes mot pour mot.
// Règle : les pensées de Lou peuvent se taire (pas de `text` : la bulle montre « … »), jamais mentir au joueur.
// Elles posent des questions, elles ne concluent jamais à la place du joueur.
import type { StrangeEvent, Thought, UvTrace } from "../types";
import { ENEMY, SCENE } from "./links";
import { POS } from "./positions";

const near = (id: keyof typeof POS, radius: number) => ({ on: "near" as const, x: POS[id].x, z: POS[id].z, radius });

export const THOUGHTS: Thought[] = [
  // ——— Première minute (entrée) ———
  { id: "t_craie", text: "Pas tous. Alors quelqu'un est encore là-dedans.", trigger: { on: "near", x: 0, z: 25, radius: 4.2 }, then: "t_promesse", card: "chalk_door" },
  // L1 : le joueur sait dès la première minute que Lou cache quelque chose. Vrai : il avait promis de ne pas entrer.
  { id: "t_promesse", text: "Je ne devais pas entrer…", trigger: { on: "chain" } },
  { id: "t_releve", text: "Elle a dit “la relève”. À qui parle-t-elle ?", trigger: { on: "chain" } },
  // L3 : après cette pensée, le geste du gant sur le verrou, sans pensée (événement l3_gant).
  { id: "t_verrous", text: "Drôle de porte. On dirait qu'elle ferme de l'extérieur.", trigger: near("door_bolts", 2.4) },
  // L2 : le triangle de la photo, puis Lou se tait (il ne dit pas « rien »).
  { id: "t_triangle", text: "Ce triangle…", trigger: { on: "chain" }, then: "t_triangle_silence" },
  { id: "t_triangle_silence", trigger: { on: "chain" } },
  { id: "t_paquet", text: "Pas maintenant.", trigger: { on: "examine", examinable: "a16" } },
  { id: "t_regle", text: "Aucun mordu ne franchit la porte. Et pourtant…", trigger: { on: "examine", examinable: "poster_rule" } },

  // ——— Zone extérieure ———
  { id: "t_lanterne", text: "Une lanterne de gamin et une pièce bien rangée. Quelqu'un faisait le même boulot que moi.", trigger: { on: "chain" } },
  { id: "t_guetteur", text: "Un brassard de garde. Il gardait la porte… de dehors ?", trigger: { on: "nearEnemy", enemy: ENEMY.watchman, radius: 9 } },

  // ——— Génératrice ———
  { id: "t_silencieux", text: "Celui-là ne grogne pas. Je ne l'ai pas entendu venir.", trigger: { on: "chain" } },
  { id: "t_page", text: "Quelqu'un a arraché une page. Mais un crayon, ça appuie.", trigger: { on: "examine", examinable: "a2" } },
  { id: "t_bracelet", text: "Un bracelet d'infirmerie. On le soignait. Avant ou après ?", trigger: { on: "chain" } },
  { id: "t_vert", text: "Pourquoi du vert ?", trigger: { on: "chain" } },

  // ——— Sécurité ———
  { id: "t_terminal", text: "Le poste de Bérard. Il notait tout. Presque tout ?", trigger: { on: "examine", examinable: "terminal" } },
  { id: "t_aube", text: "À l'aube, quoi ?", trigger: { on: "chain" } },

  // ——— Hub ———
  { id: "t_avis", text: "“Par la porte de service.” Ça se vérifie, une porte.", trigger: { on: "examine", examinable: "poster_notice" } },
  { id: "t_lueur", text: "Quelqu'un est vivant là-bas. Et ne veut pas qu'on le sache ?", trigger: { on: "chain" } },
  // M3 : l'accusation publique.
  { id: "t_accuse", text: "Je sais que ce n'est pas moi. Eux, il faut le leur montrer.", trigger: { on: "fact", fact: SCENE.M3 } },

  // ——— Cafétéria ———
  { id: "t_frappe", text: "Un mordu ne frappe pas en rythme.", trigger: { on: "chain" } },
  { id: "t_commis", text: "Il pose un plateau, frappe deux fois, repart. Il a fait ça souvent. Pour qui ?", trigger: { on: "nearEnemy", enemy: ENEMY.commis, radius: 8 }, card: "commis_habit" },
  // M1 : « Depuis que t'es là. »
  { id: "t_depuis", text: "Le moteur fait du bruit. Le bruit les attire. …Il n'a pas tout à fait tort.", trigger: { on: "fact", fact: SCENE.M1 } },
  // M4 : le commis revient vers Cuisine ; Lou pense à sa lampe (lancée par game/content/people_director.ts).
  { id: "t_lampe_commis", text: "Ma lampe ! Un éclair en pleine face, et il se fige.", trigger: { on: "chain" } },
  { id: "t_traits", text: "Neuf traits. Neuf jours. Moi, je suis arrivé ce matin. Ça se prouve, ça ?", trigger: { on: "examine", examinable: "cook_tally" } },
  // M2 : la voix au haut-parleur.
  { id: "t_presque", text: "Elle dit vrai. Presque tout.", trigger: { on: "fact", fact: SCENE.M2 } },

  // ——— Entrepôt ———
  { id: "t_cadenas", text: "Un cadenas sur des piles. Ici, la lumière valait de l'or.", trigger: { on: "examine", examinable: "battery_locker" } },

  // ——— Dortoirs ———
  { id: "t_lits", text: "“Là où personne ne dort plus.”", trigger: { on: "enter", room: "dorms" } },

  // ——— Infirmerie et chambre 1 ———
  { id: "t_raclures", text: "Cette armoire a bougé. Souvent.", trigger: near("room1_cabinet", 2.2) },
  { id: "t_courant_air", text: "…Courant d'air. Sûrement.", trigger: { on: "chain" } },
  { id: "t_montre", text: "2 h 14. Qu'est-ce qui s'est passé à 2 h 14 ?", trigger: { on: "chain" } },
  { id: "t_chambre1", text: "Une chambre “condamnée”, avec deux lampes neuves et un plateau propre ?", trigger: near("room1_bed", 1.6), requires: { unlocked: ["examinable:room1_cabinet"] } },
  { id: "t_eclat", text: "Du verre vert. D'où vient-il ?", trigger: { on: "chain" } },

  // ——— Atelier ———
  { id: "t_casier", text: "Ses outils sont rangés au millimètre. Le genre de type qui ne ment pas.", trigger: { on: "examine", examinable: "a9" } },

  // ——— Salle de contrôle ———
  { id: "t_bague", text: "Elle tourne sa bague. Encore.", trigger: near("operator_door", 3.2), requires: { unlocked: ["puzzle:shed"] } },
  { id: "t_loquet", text: "Fermé de l'intérieur. Coincée… vraiment ?", trigger: { on: "chain" } },

  // ——— Tableau : défi au joueur, puis résumé après la juste accusation (§ 21) ———
  { id: "t_defi", text: "J'ai tout vu. Qui a ouvert la chambre 1 ?", trigger: { on: "ready", deduction: "C4" } },
  { id: "t_resume", text: "Marceau était le premier. Ils ont menti pour le cacher. Et c'est elle qui a ouvert.", trigger: { on: "chain" } },

  // ——— Pièce cachée, accès étage 2 ———
  { id: "t_cle", text: "“Ferme derrière toi.” Elle n'a pas fermé. Elle a attendu.", trigger: { on: "examine", examinable: "a13" } },
  { id: "t_grille", text: "Des marques qui descendent. Aucune qui remonte.", trigger: near("stairs_grille", 2.4) },
  { id: "t_tape", text: "Ça tape. Plus bas que bas.", trigger: { on: "chain" } },
];

export const TRACES: UvTrace[] = [
  { id: "c1", room: "plaza", shape: { kind: "none", x: POS.service_threshold.x, z: POS.service_threshold.z, radius: 1.1 }, text: "Rien. Pas une trace de mordu au seuil.", card: "c1" },
  { id: "c2", room: "infirmary", shape: { kind: "trail", points: [[17.85, 6.3], [17.2, 5.0], [16.0, 2.2], [12.6, 0.7], [10.3, 0.15]] }, text: "Une traînée part de l'armoire.", card: "c2" },
  { id: "c3", room: "hub", shape: { kind: "trail", points: [[6.9, 0.2], [3.5, 1.4], [0, 1.0], [-3.5, -0.2], [-6.9, 0.1]] }, text: "La même traînée, sans détour, jusqu'au moteur.", card: "c3" },
  {
    id: "c4", room: "infirmary", requires: { unlocked: ["examinable:room1_cabinet"] },
    shape: { kind: "prints", points: [[19.25, 6.55], [19.65, 6.15], [20.05, 5.7]] },
    text: "Deux empreintes de semelles fines près du lit, vivantes (pas de bave).", card: "c4",
  },
  { id: "c5", room: "infirmary", shape: { kind: "stamp", x: POS.note_infirmary_map.x, z: POS.note_infirmary_map.z + 0.06, y: POS.note_infirmary_map.y - 0.12, text: "PATIENT n° 1", yaw: 0 }, text: "Sous « CONDAMNÉE » sur le plan, au tampon invisible : « PATIENT n° 1 ».", card: "c5" },
  // c6 et c7 sont des passages à la loupe (gros plans a2 et cahier de relève), pas des traces au sol.
  {
    id: "c8", room: "control",
    shape: { kind: "trail", points: [[21.0, -15.5], [24.0, -17.2], [26.5, -17.95], [28.0, -18.2]] },
    text: "Traînées de mordu devant le local technique, aucune derrière.", card: "c8",
  },
];

export const EVENTS: StrangeEvent[] = [
  // ——— Première minute ———
  {
    // d1 : l'accroche automatique de la voix de l'opératrice à la radio de la guérite (avis court + carte). C'est le
    // seul endroit où la voix passe : « Écouter » la radio ouvre ensuite la conversation radio_guerite
    // (game/content/people_talk.ts), qui commence par la réponse de Lou et range la même carte, une seule fois.
    id: "d1", trigger: near("guard_radio", 5.5),
    actions: [
      { do: "sound", cue: "radio_static", x: POS.guard_radio.x, z: POS.guard_radio.z },
      // « la relève » reste dans l'avis : la pensée t_releve y répond.
      { do: "notice", text: "La radio de la guérite grésille : « …l'heure de la relève… il y a quelqu'un ? »" },
      { do: "card", card: "audio_gate", delay: 1.5 },
      { do: "thought", thought: "t_releve", delay: 4 },
    ],
  },
  {
    // L1 : entre les deux pensées de la craie, la main de Lou se pose sur le paquet noué.
    id: "l1_paquet", trigger: { on: "card", card: "chalk_door" },
    actions: [{ do: "notice", text: "Sa main se pose sur sa sacoche, sur un paquet noué.", delay: 2.6 }],
  },
  {
    // L3 : le gant sur le verrou, une seconde, sans pensée.
    id: "l3_gant", trigger: near("door_bolts", 2.4),
    actions: [{ do: "notice", text: "Lou passe le gant sur un verrou, une seconde.", delay: 3.2 }],
  },

  // ——— Zone extérieure : la règle du bruit, montrée avant de servir (§ 7) ———
  {
    id: "d_bruit", trigger: { on: "nearEnemy", enemy: ENEMY.watchman, radius: 11 },
    actions: [
      { do: "sound", cue: "metal_clang", x: 36.9, z: 27.9 },
      { do: "notice", text: "Une tôle claque dans les épaves. Le guetteur tourne la tête vers le bruit.", delay: 0.4 },
      { do: "card", card: "noise_rule", delay: 0.6 },
    ],
  },

  // ——— Génératrice ———
  {
    // d2 : Marceau traverse le champ sans un son.
    id: "d2", trigger: { on: "nearEnemy", enemy: ENEMY.marceau, radius: 9 },
    actions: [
      { do: "notice", text: "Une silhouette traverse sans un bruit." },
      { do: "thought", thought: "t_silencieux", delay: 0.8 },
    ],
  },
  {
    // d3 : relance de la génératrice. Les néons s'allument en vague ; une seule lueur reste verte, à l'est.
    id: "d3", trigger: { on: "fact", fact: "generator_powered" },
    actions: [
      { do: "card", card: "generator_restart" },
      { do: "sound", cue: "electric_buzz", x: -22, z: 26, delay: 1.2 },
      { do: "notice", text: "Les néons s'allument en vague. Une seule lueur reste verte, à l'est.", delay: 1.4 },
      { do: "light", x: POS.operator_door.x, z: POS.operator_door.z, y: 0.15, color: "#7dff8a", duration: 4, delay: 1.4 },
      { do: "thought", thought: "t_vert", delay: 3 },
    ],
  },

  // ——— Sécurité ———
  {
    // d4 : le haut-parleur crache un bout d'enregistrement en boucle.
    id: "d4", trigger: { on: "enter", room: "security" }, requires: { facts: ["generator_powered"] },
    actions: [
      { do: "sound", cue: "radio_static", x: 0, z: 13 },
      { do: "notice", text: "Le haut-parleur crache un bout d'enregistrement en boucle : « …canal 2… à l'aube… »" },
      { do: "card", card: "audio_loop", delay: 1 },
      { do: "thought", thought: "t_aube", delay: 2.5 },
    ],
  },

  // ——— Hub ———
  {
    // d5 : une valise glisse et s'ouvre.
    id: "d5", trigger: { on: "enter", room: "hub" },
    actions: [
      { do: "sound", cue: "creak", x: POS.open_suitcase.x, z: POS.open_suitcase.z, delay: 0.6 },
      { do: "notice", text: "Une valise glisse et s'ouvre : vêtements, une photo de groupe retournée.", delay: 0.8 },
    ],
  },
  {
    // d7 : une lueur verte passe sous la porte de la salle de contrôle, puis s'éteint.
    id: "d7", trigger: { on: "enter", room: "hub" }, requires: { facts: ["generator_powered"] },
    actions: [
      { do: "light", x: 8.5, z: -8.3, y: 0.15, color: "#7dff8a", duration: 3.2, delay: 0.8 },
      { do: "thought", thought: "t_lueur", delay: 2.4 },
    ],
  },

  // ——— Cafétéria ———
  {
    // d6 : trois coups de l'intérieur de la chambre froide, réguliers.
    id: "d6", trigger: near("cold_room_door", 7), requires: { facts: ["generator_powered"] },
    actions: [
      { do: "sound", cue: "distant_knock", x: POS.cold_room_door.x, z: POS.cold_room_door.z },
      { do: "thought", thought: "t_frappe", delay: 1.4 },
    ],
  },

  // ——— Entrepôt ———
  {
    // d8 : une porte claque loin à l'ouest (courant d'air du mur creux).
    id: "d8", trigger: { on: "card", card: "note_storage" },
    actions: [{ do: "sound", cue: "door_slam", x: -32, z: -14, delay: 1.5 }],
  },

  // ——— Infirmerie ———
  {
    // d9 : l'armoire grince d'un centimètre.
    id: "d9", trigger: { on: "enter", room: "infirmary" },
    actions: [
      { do: "sound", cue: "creak", x: POS.room1_cabinet.x, z: POS.room1_cabinet.z, delay: 1 },
      { do: "thought", thought: "t_courant_air", delay: 2.2 },
    ],
  },

  {
    // L'armoire poussée (X1 ou X2 établie) : elle glisse sur ses raclures, la porte de la chambre 1 apparaît.
    id: "room1_push", trigger: { on: "examine", examinable: "room1_cabinet" },
    actions: [{ do: "sound", cue: "creak", x: POS.room1_cabinet.x, z: POS.room1_cabinet.z }],
  },

  // ——— Salle de contrôle : radio réparée (d10, d11) ———
  {
    id: "d10", trigger: { on: "fact", fact: "comms_repaired" },
    actions: [
      { do: "sound", cue: "radio_static", delay: 2 },
      { do: "notice", text: "« …ici l'étage 2… Dr Okafor… L'étage 1 est condamné. Ne descendez pas. Lila ? Lila, si tu m'entends… tu n'es jamais arrivée. Pardon. »", delay: 2.5 },
      { do: "card", card: "audio_below", delay: 3 },
    ],
  },
  {
    id: "d11", trigger: { on: "card", card: "audio_below" },
    actions: [
      { do: "sound", cue: "morse", x: 18, z: -19.5, delay: 5 },
      { do: "notice", text: "Des bips tapés à la main répondent : · · · – / · · / · / – · / · · ·", delay: 5.5 },
      { do: "card", card: "audio_tapping", delay: 7 },
    ],
  },

  // ——— Accès étage 2 ———
  {
    // d12 : clé en main, des petits coups montent de sous la grille, puis s'arrêtent.
    id: "d12", trigger: near("stairs_grille", 2.6), requires: { facts: ["keycard"] },
    actions: [
      { do: "sound", cue: "distant_knock", x: 0, z: -17 },
      { do: "thought", thought: "t_tape", delay: 1.6 },
    ],
  },

  // ——— Paroles entendues (conversations de l'agent « personnages ») → cartes ———
  // L'accusation de Cuisine : M1 (« Depuis que t'es là ») ou M3 (devant l'avis).
  { id: "say_m1", trigger: { on: "fact", fact: SCENE.M1 }, actions: [{ do: "card", card: "say_cook_accuse" }] },
  { id: "say_m3", trigger: { on: "fact", fact: SCENE.M3 }, actions: [{ do: "card", card: "say_cook_accuse" }] },
  { id: "say_witness", trigger: { on: "fact", fact: SCENE.cookTestimony }, actions: [{ do: "card", card: "say_cook_witness" }] },
  // La voix au haut-parleur (M2) suit l'énigme 2 : sans la conversation, la carte vient avec le courant du CONTRÔLE.
  { id: "say_m2", trigger: { on: "fact", fact: SCENE.M2 }, actions: [{ do: "card", card: "say_operator_door" }] },
  {
    id: "say_shed", trigger: { on: "fact", fact: "puzzle_shed" },
    actions: [
      { do: "card", card: "say_operator_stuck", delay: 6 },
      { do: "card", card: "say_operator_door", delay: 12 },
    ],
  },
  { id: "say_stuck", trigger: { on: "fact", fact: SCENE.operatorStuck }, actions: [{ do: "card", card: "say_operator_stuck" }] },
];
