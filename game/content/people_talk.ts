// Les conversations écrites des personnes de l'étage 1 (game/conversation.ts), rangées à part pour une traduction.
// Textes : docs/MEFIANCE_SURVIVANTS.md § 8-9 et docs/HISTOIRE_PROPOSITION.md § 15, 21, mot pour mot. Une réplique
// absente des documents est écrite dans le même ton et marquée « Proposé » en commentaire.
// Ton : Cuisine parle un québécois léger (1 ou 2 marqueurs par réplique au plus) et tutoie ; Lou le tutoie aussi.
// L'opératrice vouvoie, poliment ; elle dit « mon garçon » en face, « l'étranger » au haut-parleur, et « Lou »
// seulement à l'aveu. Lou peut mentir à un personnage (« Chercher un abri, c'est tout. »), jamais au joueur.
// « {nom} » : le nom que l'interlocuteur donne à Lou, selon la confiance (game/content/people.ts).
// La confiance de Cuisine ne bouge que par des gestes nommés ({ gesture }), jamais par { trust } direct.
import { conversationHooks, registerConversation, type Condition, type Conversation, type Speaker } from "../conversation";
import {
  COOK, COOK_STANCE, OPERATOR, OPERATOR_STANCE, applyGesture, cookLevel, cookName, operatorMood, operatorName,
} from "./people";

// ——— Branchements : le nom, l'état visible, les gestes ———

conversationHooks.name = (speaker, state) => (speaker === COOK ? cookName(state) : speaker === OPERATOR ? operatorName(state) : "l'étranger");
conversationHooks.status = (speaker, state) => {
  if (speaker === COOK) {
    const stance = COOK_STANCE[cookLevel(state)];
    const out = state.knows("cuisine_dehors");
    return { title: out ? "DEHORS, COUPERET À LA MAIN" : stance.title, calls: cookName(state), gesture: out ? "Il se plante devant toi." : `${stance.weapon} ${stance.gesture}`, mood: out ? "hostile" : stance.mood };
  }
  if (speaker === OPERATOR) {
    const mood = operatorMood(state);
    return { title: OPERATOR_STANCE[mood].title, calls: operatorName(state), gesture: OPERATOR_STANCE[mood].gesture, mood };
  }
  return {};
};
conversationHooks.gesture = (id, state) => { applyGesture(state, id); };

// ——— Interlocuteurs ———

const CUISINE: Speaker = { id: COOK, name: "CUISINE", title: "CHAMBRE FROIDE", portrait: "cuisine" };
const OPERATRICE: Speaker = { id: OPERATOR, name: "L'OPÉRATRICE DE NUIT", title: "À L'INTERPHONE", portrait: "operatrice" };
const RADIO_OPERATRICE: Speaker = { id: OPERATOR, name: "L'OPÉRATRICE DE NUIT", title: "À LA RADIO", portrait: "radio" };
const HAUT_PARLEUR: Speaker = { id: OPERATOR, name: "L'OPÉRATRICE DE NUIT", title: "AU HAUT-PARLEUR", portrait: "radio" };
const RADIO: Speaker = { id: "radio", name: "LA RADIO", title: "QUELQUE PART PLUS BAS", portrait: "radio" };

const level = (min: number, max = 2): Condition => ({ trust: COOK, min, max });
const not = (c: Condition): Condition => ({ not: c });
const fact = (id: string): Condition => ({ fact: id });

// ——— Première minute : la voix à la radio de la guérite ———

export const RADIO_GUERITE: Conversation = {
  id: "radio_guerite",
  speaker: RADIO_OPERATRICE,
  start: "voix",
  nodes: {
    voix: {
      lines: [
        { who: "narration", text: "[La radio de la guérite grésille.]" },
        { who: "speaker", text: "…ici l'opératrice de nuit… c'est l'heure de la relève…" },
        { who: "speaker", text: "…il y a quelqu'un ?" },
      ],
      choices: [
        // Proposé : la réponse de Lou.
        { text: "Allô ? Je suis là. Vous m'entendez ?", next: "silence" },
        { text: "[Écouter sans répondre]", next: "silence" },
      ],
    },
    silence: {
      // Proposé (d'après § 4 : « Puis la pile de la radio meurt. Plus rien. »).
      lines: [{ who: "narration", text: "[Un souffle. La pile de la radio meurt. Plus rien.]" }],
      effects: [{ flag: "radio_guerite" }],
    },
  },
};

// ——— M1 : la première rencontre, à travers la porte ———

export const CUISINE_M1: Conversation = {
  id: "cuisine_m1",
  speaker: CUISINE,
  start: "porte",
  nodes: {
    porte: {
      lines: [
        { who: "narration", text: "[Trois coups, de l'intérieur. Réguliers.]" },
        { who: "speaker", text: "Toc toc toc… Si t'es un mordu, t'es très poli. Dis-moi un truc qu'un vivant dirait." },
      ],
      effects: [{ flag: "cuisine_rencontre" }],
      choices: [
        { text: "J'ai faim, et j'en ai marre des pêches.", next: "chaine" },
        // Proposé : seconde réponse possible.
        { text: "Les mordus, ça ne parle pas.", next: "chaine_b" },
      ],
    },
    chaine: {
      lines: [
        { who: "narration", text: "(Rire étouffé. Clic. La porte s'ouvre sur la chaîne : un œil, une moustache, la lame d'un couperet.)" },
        { who: "speaker", text: "Ça, c'est un vivant. T'es qui, toi ? T'es pas d'ici." },
        { who: "speaker", text: "Ça fait neuf jours que c'est mort, icitte. Pis là, ça se remet à marcher. Depuis que t'es là." },
        { who: "speaker", text: "C'est-tu toi qui as rallumé la génératrice ?" },
      ],
      choices: [
        { text: "Oui. Ça fait du bruit, je sais.", next: "verite", effects: [{ flag: "cuisine_verite_generatrice" }] },
        { text: "Non.", next: "mensonge", effects: [{ flag: "cuisine_menti_generatrice" }] },
      ],
    },
    chaine_b: {
      lines: [
        // Proposé.
        { who: "narration", text: "(Un silence. Clic. La porte s'ouvre sur la chaîne : un œil, une moustache, la lame d'un couperet.)" },
        { who: "speaker", text: "Ça parle pas, non. T'es qui, toi ? T'es pas d'ici." },
        { who: "speaker", text: "Ça fait neuf jours que c'est mort, icitte. Pis là, ça se remet à marcher. Depuis que t'es là." },
        { who: "speaker", text: "C'est-tu toi qui as rallumé la génératrice ?" },
      ],
      choices: [
        { text: "Oui. Ça fait du bruit, je sais.", next: "verite", effects: [{ flag: "cuisine_verite_generatrice" }] },
        { text: "Non.", next: "mensonge", effects: [{ flag: "cuisine_menti_generatrice" }] },
      ],
    },
    verite: {
      lines: [
        { who: "speaker", text: "…Au moins, tu mens pas." },
        { who: "narration", text: "(Il te regarde les mains.)" },
      ],
      choices: [{ text: "Et toi, tu es qui ?", next: "nom" }, { text: "Je repasserai." }],
    },
    mensonge: {
      // Proposé : réaction au mensonge (faux pas différé : la boue le contredira).
      lines: [
        { who: "speaker", text: "Mouais." },
        { who: "narration", text: "(Il plisse les yeux. Il te regarde les bottes.)" },
      ],
      choices: [{ text: "Et toi, tu es qui ?", next: "nom" }, { text: "Je repasserai." }],
    },
    nom: {
      lines: [{ who: "speaker", text: "Tout le monde m'appelle Cuisine, alors… Cuisine." }],
    },
  },
};

// ——— Cuisine, ensuite : selon la confiance ———

/** Réponses communes : revenir au menu, ou partir. */
const back = [{ text: "Autre chose.", next: "menu" }, { text: "Je repasserai." }];

export const CUISINE_TALK: Conversation = {
  id: "cuisine",
  speaker: CUISINE,
  start: "accueil",
  nodes: {
    accueil: {
      lines: [
        // Hostile : porte fermée, lampe éteinte. Chaque réplique méfiante n'est dite qu'une fois, puis « … ».
        { who: "narration", text: "(La porte reste fermée. Derrière, il éteint sa lampe. Le couperet frotte la tôle.)", when: level(-1, -1) },
        { who: "speaker", text: "La porte de service, ouverte. C'est-tu toi qui les as laissés rentrer ?", when: { all: [level(-1, -1), not(fact("cu_hostile_1"))] } },
        { who: "speaker", text: "Recule. Tu passes ton affaire par la fente, pis tu t'en vas.", when: { all: [level(-1, -1), not(fact("cu_hostile_1"))] } },
        { who: "speaker", text: "Parle-moi pas, l'étranger. Je compte jusqu'à trois.", when: { all: [level(-1, -1), fact("cu_hostile_1"), not(fact("cu_hostile_2"))] } },
        { who: "speaker", text: "…", when: { all: [level(-1, -1), fact("cu_hostile_2")] } },
        // Méfiant : sur la chaîne.
        { who: "narration", text: "(La porte s'entrouvre sur la chaîne. Un œil, le couperet baissé. Il te regarde les mains.)", when: level(0, 0) },
        // Proposé.
        { who: "speaker", text: "Encore toi, {nom}.", when: level(0, 0) },
        // Prudent : porte ouverte, couperet posé.
        { who: "narration", text: "(La porte s'ouvre. Il pose le couperet sur le comptoir et s'assoit sur une caisse de pêches.)", when: level(1, 1) },
        { who: "speaker", text: "Bon. Entre, le bricoleur. Touche à rien.", when: { all: [level(1, 1), not(fact("cu_entre"))] } },
        // Proposé.
        { who: "speaker", text: "Entre, {nom}. Touche à rien, encore.", when: { all: [level(1, 1), fact("cu_entre")] } },
        { who: "speaker", text: "C'est quoi ton nom, d'abord ?", when: { all: [level(1, 1), not(fact("cu_nom"))] } },
        // Confiant : il sort, il tourne le dos.
        { who: "narration", text: "(Il sort de la chambre froide en s'essuyant les mains sur son tablier.)", when: level(2) },
        // Proposé.
        { who: "speaker", text: "{Nom}. Entre, entre.", when: level(2) },
      ],
      effects: [],
      choices: [
        { text: "Lou. Je m'appelle Lou.", next: "nom", when: { all: [level(1, 1), not(fact("cu_nom"))] }, effects: [{ flag: "cu_nom" }, { flag: "cu_entre" }] },
        // Hostile : chaque passage fait avancer ses répliques (dites une seule fois, puis « … »).
        { text: "Écoute-moi.", next: "menu", when: { all: [level(-1, -1), not(fact("cu_hostile_1"))] }, effects: [{ flag: "cu_hostile_1" }] },
        { text: "Écoute-moi.", next: "menu", when: { all: [level(-1, -1), fact("cu_hostile_1"), not(fact("cu_hostile_2"))] }, effects: [{ flag: "cu_hostile_2" }] },
        { text: "Écoute-moi.", next: "menu", when: { all: [level(-1, -1), fact("cu_hostile_2")] } },
        { text: "Écoute-moi.", next: "menu", when: level(0, 0) },
        { text: "J'entre.", next: "menu", when: { all: [level(1, 1), fact("cu_nom")] }, effects: [{ flag: "cu_entre" }] },
        { text: "Écoute-moi.", next: "menu", when: level(2) },
        { text: "Je repasserai." },
      ],
    },
    nom: {
      // Proposé : il entend le nom, mais garde « le bricoleur » tant qu'il n'a pas confiance.
      lines: [{ who: "speaker", text: "Lou. (Il le dit comme on goûte une soupe.) On verra ben." }],
      choices: [{ text: "Écoute-moi.", next: "menu" }, { text: "Je repasserai." }],
    },
    menu: {
      lines: [
        // Proposé.
        { who: "speaker", text: "Quoi ?", when: level(-1, 0) },
        { who: "speaker", text: "Envoye, parle.", when: level(1) },
        // Il demande un bandage tant qu'on ne lui en a pas donné (HISTOIRE § 8). Proposé : la formulation.
        { who: "speaker", text: "T'aurais pas un bandage ? Je me suis coupé en barricadant ma porte.", when: { all: [not(fact("cu_bandage")), not(fact("cu_bandage_demande"))] } },
      ],
      effects: [{ flag: "cu_bandage_demande" }],
      choices: [
        { text: "Qu'est-ce qui s'est passé ?", next: "temoignage", when: { all: [level(0), not(fact("cu_temoignage"))] } },
        { text: "Qui a écrit « pas tous » sur la porte ?", next: "lila", when: { all: [level(0), not(fact("cu_pas_tous"))] } },
        { text: "Qui volait les piles ?", next: "piles", when: { all: [level(1), not(fact("cu_piles"))] } },
        { text: "Pourquoi tu me regardes comme ça ?", next: "sacoche", when: not(fact("cu_sacoche")) },
        { text: "Qu'est-ce que tu gardes, dans ta chambre froide ?", next: "secret", when: { all: [level(1, 1), not(fact("cu_secret_froide"))] } },
        // Gestes : partager une ressource rare (une seule fois chacun).
        { text: "[Passer un bandage par la fente] Tiens, pour ta main.", next: "don_bandage", when: { all: [{ item: "bandages", min: 1 }, not(fact("cu_bandage")), level(-1, 0)] }, effects: [{ item: "bandages", delta: -1 }, { flag: "cu_bandage" }, { gesture: "don_bandage" }] },
        { text: "[Donner un bandage] Tiens, pour ta main.", next: "don_bandage", when: { all: [{ item: "bandages", min: 1 }, not(fact("cu_bandage")), level(1)] }, effects: [{ item: "bandages", delta: -1 }, { flag: "cu_bandage" }, { gesture: "don_bandage" }] },
        { text: "[Donner une pile]", next: "don_pile", when: { all: [{ item: "cells", min: 1 }, not(fact("cu_pile"))] }, effects: [{ item: "cells", delta: -1 }, { flag: "cu_pile" }, { gesture: "don_pile" }] },
        { text: "[Donner une conserve]", next: "don_conserve", when: { all: [{ item: "cans", min: 1 }, not(fact("cu_conserve"))] }, effects: [{ item: "cans", delta: -1 }, { flag: "cu_conserve" }, { gesture: "don_conserve" }] },
        // Échanges : par la fente (hostile, méfiant), justes (prudent).
        { text: "[Échanger] Un bandage contre une conserve.", next: "echange", when: { all: [{ item: "bandages", min: 1 }, level(-1, 0), not(fact("cu_echange_fente"))] }, effects: [{ item: "bandages", delta: -1 }, { item: "cans", delta: 1 }, { flag: "cu_echange_fente" }] },
        { text: "[Échanger] Une conserve contre une pile.", next: "echange", when: { all: [{ item: "cans", min: 1 }, level(1), not(fact("cu_echange_pile"))] }, effects: [{ item: "cans", delta: -1 }, { item: "cells", delta: 1 }, { flag: "cu_echange_pile" }] },
        // Dire la vérité quand elle coûte.
        { text: "Oui, je suis entré par la porte de service.", next: "verite_entree", when: { all: [fact("m2"), not(fact("cu_verite_entree"))] }, effects: [{ flag: "cu_verite_entree" }, { gesture: "verite_entree" }] },
        // Tenir parole (puis la refermer vraiment).
        { text: "Je referme la porte de service. Promis.", next: "promesse", when: { all: [fact("m2"), not(fact("promesse_porte")), not(fact("porte_refermee"))] }, effects: [{ flag: "promesse_porte" }] },
        // Montrer le bon indice.
        { text: "[Montrer la feuille de comptage]", next: "indice_comptage", when: { all: [{ card: "note_battery_count" }, not(fact("cu_indice_comptage"))] }, effects: [{ flag: "cu_indice_comptage" }, { gesture: "indice_comptage" }] },
        { text: "[Montrer le seuil de la porte de service]", next: "indice_seuil", when: { all: [{ card: "service_threshold" }, fact("m1"), not(fact("cu_indice_seuil"))] }, effects: [{ flag: "cu_indice_seuil" }, { gesture: "indice_seuil" }] },
        { text: "[Montrer la liste de Lila n° 2]", next: "indice_lila2", when: { all: [{ card: "note_lila_2" }, not(fact("cu_indice_lila2"))] }, effects: [{ flag: "cu_indice_lila2" }, { gesture: "indice_lila2" }] },
        // Déductions de l'enquête.
        { text: "Elle ne volait pas pour elle. C'était pour les lampes d'Okafor.", next: "c3", when: { all: [{ any: [{ deduction: "C3" }, { unlocked: "fact:C3" }, { unlocked: "dialogue:cuisine_c3" }] }, not(fact("cu_c3"))] }, effects: [{ flag: "cu_c3" }] },
        { text: "Lila est sortie seule, avant la nuit. Bien avant moi.", next: "x10", when: { all: [{ any: [{ deduction: "X10" }, { unlocked: "fact:X10" }, { unlocked: "dialogue:cuisine_lila" }] }, not(fact("cu_x10"))] }, effects: [{ flag: "cu_x10" }] },
        // Confiant : la clé de la réserve, sa honte.
        { text: "Quelqu'un a ouvert la porte. Ce n'est pas toi qui l'as ouverte.", next: "reserve", when: { all: [level(2), not(fact("cu_reserve"))] }, effects: [{ flag: "cu_reserve" }, { item: "cells", delta: 2 }, { item: "medkits", delta: 1 }, { item: "reserve", delta: 16 }] },
        { text: "Tu as l'air de t'en vouloir.", next: "honte", when: { all: [level(2), not(fact("cu_honte"))] }, effects: [{ flag: "cu_honte" }] },
        { text: "Je repasserai." },
      ],
    },
    temoignage: {
      lines: [
        { who: "speaker", text: "L'orage. La porte de service. C'est ce qu'ils ont affiché." },
        { who: "speaker", text: "Moi, j'étais à l'entrepôt, à compter mes piles, quand ça a crié. Je me suis enfermé ici. Depuis, je compte les pêches." },
      ],
      effects: [{ flag: "cu_temoignage" }, { flag: "cook_testimony" }],
      choices: back,
    },
    lila: {
      lines: [
        { who: "speaker", text: "La petite Lila, sûrement. Elle est venue taper ici." },
        { who: "speaker", text: "J'ai pas ouvert. J'avais peur." },
      ],
      effects: [{ flag: "cu_pas_tous" }],
      choices: back,
    },
    piles: {
      lines: [
        { who: "speaker", text: "Elle aussi. Je l'ai vue. J'ai mis un cadenas, et ce soir-là elle est venue m'en réclamer une." },
        { who: "speaker", text: "J'ai dit non. (Il regarde ses mains.) Une gamine qui vole, ça se punit, non ?" },
      ],
      effects: [{ flag: "cu_piles" }, { flag: "cook_testimony" }],
      choices: back,
    },
    sacoche: {
      lines: [{ who: "speaker", text: "Tu tiens ta sacoche comme si y avait un bébé dedans. Qu'est-ce que tu caches ?" }],
      effects: [{ flag: "cu_sacoche" }],
      choices: [
        // Demi-mensonge à un personnage, choisi par le joueur (on s'en souviendra à l'étage 3).
        { text: "Chercher un abri, c'est tout.", next: "abri", effects: [{ flag: "lou_abri" }] },
        { text: "J'ai fait une promesse. Je ne peux pas en dire plus.", next: "promesse_lou", effects: [{ flag: "lou_promesse" }, { gesture: "verite_promesse" }] },
        { text: "Ça ne te regarde pas.", next: "regarde" },
      ],
    },
    abri: { lines: [{ who: "speaker", text: "Mouais." }, { who: "narration", text: "(Il plisse les yeux.)" }], choices: back },
    promesse_lou: { lines: [{ who: "speaker", text: "Une promesse à qui ? …Correct, garde-la." }], choices: back },
    regarde: { lines: [{ who: "speaker", text: "Ben là, ça me regarde un peu, {nom}." }], choices: back },
    secret: {
      lines: [{ who: "speaker", text: "Ça te regarde pas." }],
      effects: [{ flag: "cu_secret_froide" }],
      choices: [
        { text: "D'accord. Je n'insiste pas.", next: "respect", effects: [{ gesture: "respect_secret" }] },
        // Proposé.
        { text: "Allez. Montre.", next: "insiste" },
      ],
    },
    respect: { lines: [{ who: "speaker", text: "Correct. Moi aussi, j'ai des affaires à moi." }], choices: back },
    // Proposé.
    insiste: { lines: [{ who: "speaker", text: "Non." }, { who: "narration", text: "(Il pose la main sur le couperet.)" }], choices: back },
    don_bandage: {
      // Proposé.
      lines: [
        { who: "narration", text: "(Une grosse main attrape le bandage. Il l'enroule autour de sa paume.)" },
        { who: "speaker", text: "…Merci. Ça chauffe en maudit." },
      ],
      choices: back,
    },
    // Proposé.
    don_pile: { lines: [{ who: "speaker", text: "Une pile ? Pour moi ? (Il la tourne entre ses doigts.) Ça vaut de l'or, icitte." }], choices: back },
    // Proposé.
    don_conserve: { lines: [{ who: "speaker", text: "Une conserve. T'en as pas assez, toi non plus. …Merci." }], choices: back },
    // Proposé.
    echange: { lines: [{ who: "narration", text: "(L'objet passe de main en main. Il compte, tout bas.)" }, { who: "speaker", text: "Correct. On est quittes." }], choices: back },
    verite_entree: {
      // Proposé.
      lines: [{ who: "speaker", text: "Au moins, tu le dis. Ça change rien… mais au moins, tu le dis." }],
      choices: back,
    },
    // Proposé.
    promesse: { lines: [{ who: "speaker", text: "On verra ben." }], choices: back },
    indice_comptage: {
      // Proposé.
      lines: [
        { who: "narration", text: "(Il lit sa propre écriture, longtemps.)" },
        { who: "speaker", text: "2 h 10, j'étais à l'entrepôt. Ça, c'est vrai. Toi, t'étais où ?" },
      ],
      choices: back,
    },
    indice_seuil: {
      // Proposé.
      lines: [
        { who: "speaker", text: "Des petits pas qui sortent… pis tes bottes qui rentrent." },
        { who: "narration", text: "(Il se gratte la moustache.)" },
      ],
      choices: back,
    },
    indice_lila2: {
      // Proposé.
      lines: [
        { who: "speaker", text: "« Ne rien dire à Cuisine. »" },
        { who: "narration", text: "(Long silence.)" },
        { who: "speaker", text: "Elle les prenait pas pour elle." },
      ],
      choices: back,
    },
    c3: {
      lines: [
        { who: "narration", text: "(Long silence.)" },
        { who: "speaker", text: "…Et j'ai fermé l'armoire. Le soir même." },
      ],
      choices: back,
    },
    x10: {
      // Proposé : il cesse de parler de la lanterne.
      lines: [
        { who: "speaker", text: "La petite. Toute seule, dehors, avant la nuit." },
        { who: "narration", text: "(Il ne regarde plus la lanterne.)" },
      ],
      choices: back,
    },
    reserve: {
      lines: [
        { who: "narration", text: "(Il te tourne le dos, fouille une étagère, sort une clé.)" },
        { who: "speaker", text: "La réserve, derrière les fourneaux. Prends ce qu'il te faut, Lou." },
        { who: "speaker", text: "Et trouve qui a ouvert. J'ai besoin de savoir." },
        // Proposé : ce que contient la réserve (HISTOIRE § 15 : 2 piles, 1 trousse, 1 boîte de clous).
        { who: "narration", text: "(Dans la réserve : deux piles, une trousse, une boîte de clous.)" },
      ],
      choices: back,
    },
    honte: {
      lines: [
        { who: "narration", text: "(Il te tourne le dos et fouille l'étagère.)" },
        { who: "speaker", text: "La petite m'a demandé une pile. J'ai dit non. Je m'en veux, tu sais." },
      ],
      choices: back,
    },
  },
};

// ——— M2 : la voix au haut-parleur ———

export const OPERATRICE_M2: Conversation = {
  id: "operatrice_m2",
  speaker: HAUT_PARLEUR,
  start: "voix",
  nodes: {
    voix: {
      lines: [
        // Proposé : la mise en scène.
        { who: "narration", text: "[L'interphone grésille. Une voix douce, fatiguée.]" },
        { who: "speaker", text: "…Le courant ? Vous êtes celui que j'ai entendu, à la guérite ?" },
        { who: "speaker", text: "Je suis restée coincée depuis l'orage. Le courant, la serrure… vous voyez." },
        // Proposé : elle parle d'abord à Lou, gentiment.
        { who: "speaker", text: "N'ayez pas peur, mon garçon. Moi, je vous crois." },
        { who: "narration", text: "[Clic. Le circuit général : sa voix, maintenant, dans tous les haut-parleurs. La cafétéria entend tout.]" },
        { who: "speaker", text: "Mon tableau dit que la porte de service est ouverte. L'étranger est entré par là.", when: not(fact("porte_refermee")) },
        // Proposé : variante si Lou l'a déjà refermée.
        { who: "speaker", text: "Mon tableau dit que la porte de service a été ouverte. L'étranger est entré par là.", when: fact("porte_refermee") },
        { who: "speaker", text: "Depuis que le courant est revenu… Et juste après, ils se sont remis à marcher." },
        { who: "speaker", text: "La nuit de l'orage aussi, j'ai vu le voyant s'allumer. J'étais à ma console." },
        { who: "narration", text: "[Clic. Plus rien.]" },
      ],
      effects: [{ flag: "m2" }, { flag: "operator_stuck" }, { gesture: "annonce_m2" }],
    },
  },
};

// ——— L'opératrice, au local technique ———

export const OPERATRICE_TALK: Conversation = {
  id: "operatrice",
  speaker: OPERATRICE,
  start: "accueil",
  nodes: {
    accueil: {
      lines: [
        { who: "narration", text: "(Une lueur verte sous la porte. Clic : l'interphone.)", when: { trust: OPERATOR, max: 0 } },
        // Proposé : retrouvailles (la première rencontre a eu lieu à l'interphone, M2).
        { who: "speaker", text: "Ah, c'est vous, {nom}. Je vous écoute.", when: { trust: OPERATOR, max: 0 } },
        { who: "narration", text: "(La lueur verte s'est éteinte. Trois secondes de silence.)", when: { trust: OPERATOR, min: 1, max: 1 } },
        { who: "speaker", text: "Oui ?", when: { trust: OPERATOR, min: 1, max: 1 } },
        { who: "narration", text: "(Derrière la porte, une lampe verte, posée sur la console.)", when: { trust: OPERATOR, min: 2, max: 2 } },
        { who: "speaker", text: "Entrez, Lou. La porte est ouverte.", when: { trust: OPERATOR, min: 3 } },
      ],
      effects: [{ flag: "op_rencontre" }],
      choices: [
        { text: "Qui êtes-vous ?", next: "qui", when: not(fact("op_qui")) },
        { text: "La radio peut-elle remarcher ?", next: "radio", when: { all: [not(fact("op_radio")), not(fact("comms_repaired"))] } },
        { text: "Cuisine m'accuse.", next: "accuse", when: { all: [fact("m2"), { trust: OPERATOR, max: 0 }, not(fact("op_accuse"))] } },
        { text: "[Donner une pile] Pour votre lampe.", next: "pile", when: { all: [{ item: "cells", min: 1 }, not(fact("op_pile"))] }, effects: [{ item: "cells", delta: -1 }, { flag: "op_pile" }] },
        { text: "J'ai fait une promesse. Je ne peux pas en dire plus.", next: "promesse", when: { all: [not(fact("op_promesse")), { trust: OPERATOR, max: 1 }] }, effects: [{ flag: "op_promesse" }, { flag: "lou_promesse" }] },
        { text: "Le mordu de la génératrice…", next: "silencieux", when: { all: [fact("generator_powered"), not(fact("op_silencieux"))] } },
        { text: "Vous connaissiez Marceau ?", next: "marceau", when: { all: [{ any: [{ card: "photo_inseparables" }, { card: "note_torn_imprint" }, { deduction: "C2" }, { deduction: "X3" }] }, not(fact("op_marceau"))] } },
        { text: "Et cet éclat de verre vert ?", next: "eclat", when: { all: [{ any: [{ card: "green_shard" }, { fact: "card.green_shard" }] }, not(fact("op_eclat"))] } },
        { text: "Le voyant ? Votre cahier dit « 2 h 00 : orage, coupure ». Sans courant, pas de voyant.", next: "voyant", when: { all: [{ any: [{ deduction: "X9" }, { unlocked: "fact:X9" }, { unlocked: "dialogue:operatrice_voyant" }] }, not(fact("op_x9"))] } },
        { text: "Vous n'étiez pas coincée. Le loquet est tourné de l'intérieur.", next: "cachee", when: { all: [{ any: [{ deduction: "X6" }, { unlocked: "fact:X6" }, { unlocked: "dialogue:operatrice_cachee" }] }, not(fact("op_x6"))] } },
        { text: "Venez avec moi, en bas.", next: "rester", when: fact("operatrice_aveu") },
        { text: "Je repasserai." },
      ],
    },
    qui: {
      lines: [
        { who: "speaker", text: "L'opératrice de nuit. Mon nom… ça fait longtemps que plus personne ne l'utilise." },
        { who: "narration", text: "(Elle tourne son alliance.)" },
      ],
      effects: [{ flag: "op_qui" }],
      choices: [{ text: "Autre chose.", next: "accueil" }, { text: "Je repasserai." }],
    },
    radio: {
      lines: [
        { who: "speaker", text: "L'émetteur a grillé pendant l'orage. Je l'ai écrit sur la relève. Un module, à l'atelier." },
        { who: "speaker", text: "Si vous le réparez, ils nous entendront, en bas. Il faut qu'ils m'entendent." },
      ],
      effects: [{ flag: "op_radio" }],
      choices: [{ text: "Autre chose.", next: "accueil" }, { text: "Je repasserai." }],
    },
    accuse: {
      lines: [
        { who: "speaker", text: "Ne lui en voulez pas, mon garçon. Il a peur. Moi, je vous crois." },
        { who: "speaker", text: "Mais c'est vrai que vous êtes entré par là… Vous comprenez qu'il se pose des questions." },
      ],
      effects: [{ flag: "op_accuse" }],
      choices: [{ text: "Autre chose.", next: "accueil" }, { text: "Je repasserai." }],
    },
    pile: {
      lines: [
        { who: "speaker", text: "Une pile ? Oh… Merci. Je ne supporte plus le noir." },
        // Proposé : elle parle plus (HISTOIRE § 15).
        { who: "speaker", text: "Gardez-en pour vous, surtout. Les mordus n'aiment pas la lumière, vous savez." },
      ],
      choices: [{ text: "Autre chose.", next: "accueil" }, { text: "Je repasserai." }],
    },
    promesse: {
      lines: [
        { who: "speaker", text: "Vous aussi, vous gardez quelque chose. Je connais ce geste." },
        { who: "narration", text: "(Elle tourne son alliance.)" },
        { who: "speaker", text: "Moi aussi." },
      ],
      choices: [{ text: "Autre chose.", next: "accueil" }, { text: "Je repasserai." }],
    },
    silencieux: {
      lines: [
        { who: "speaker", text: "Il ne fait aucun bruit, n'est-ce pas ?" },
        { who: "narration", text: "(Elle se reprend.)" },
        { who: "speaker", text: "C'est ce qu'on dit d'eux." },
      ],
      effects: [{ flag: "op_silencieux" }],
      choices: [{ text: "Autre chose.", next: "accueil" }, { text: "Je repasserai." }],
    },
    marceau: {
      lines: [{ who: "speaker", text: "Il réparait tout. Il sifflait en travaillant. Il… sifflait, oui." }],
      effects: [{ flag: "op_marceau" }],
      choices: [{ text: "Autre chose.", next: "accueil" }, { text: "Je repasserai." }],
    },
    eclat: {
      lines: [{ who: "speaker", text: "Du verre. Il y en a partout, depuis l'orage." }],
      effects: [{ flag: "op_eclat" }],
      choices: [{ text: "Autre chose.", next: "accueil" }, { text: "Je repasserai." }],
    },
    voyant: {
      lines: [
        { who: "narration", text: "(Trois secondes de silence.)" },
        { who: "speaker", text: "Le voyant ? J'ai dû me tromper. Il faisait noir. Parlons de la radio, voulez-vous ?" },
      ],
      effects: [{ flag: "op_x9" }],
      choices: [{ text: "Autre chose.", next: "accueil" }, { text: "Je repasserai." }],
    },
    cachee: {
      // Proposé : elle détourne la conversation (HISTOIRE § 16, X6).
      lines: [
        { who: "narration", text: "(Un long souffle dans l'interphone.)" },
        { who: "speaker", text: "Il y a des portes qu'on ferme pour ne plus rien voir. Parlons d'autre chose, voulez-vous ?" },
      ],
      effects: [{ flag: "op_x6" }],
      choices: [{ text: "Autre chose.", next: "accueil" }, { text: "Je repasserai." }],
    },
    rester: {
      lines: [{ who: "speaker", text: "Non. Quelqu'un doit rester à la radio, pour dire la vérité à ceux d'en bas. Va, Lou." }],
    },
  },
};

// ——— M3 : l'accusation publique, au hub, devant l'avis officiel ———

export const CUISINE_M3: Conversation = {
  id: "cuisine_m3",
  speaker: CUISINE,
  start: "avis",
  nodes: {
    avis: {
      lines: [
        { who: "narration", text: "(Pour la première fois en neuf jours, Cuisine est sorti de sa chambre froide. Couperet à la main, il tape sur l'avis.)" },
        { who: "speaker", text: "« Par la porte de service. » Pis toi, t'es rentré par où ?" },
        { who: "speaker", text: "Ta boue rouge part de la porte de service jusqu'à ma cafétéria. Y a pas de boue de même, icitte." },
        { who: "speaker", text: "Pas rentré par là, hein ? Ta boue dit le contraire.", when: fact("cuisine_menti_generatrice") },
        { who: "speaker", text: "Pis ça, c'est la lanterne à Lila. Où est-ce qu'elle est, elle ?", when: { all: [{ any: [{ card: "lila_lantern" }, { fact: "card.lila_lantern" }] }, not({ any: [{ deduction: "X10" }, { unlocked: "fact:X10" }] })] } },
        { who: "narration", text: "[Au haut-parleur, la voix de l'opératrice grésille. Elle ne dit rien.]" },
        { who: "speaker", text: "Vide ta sacoche." },
      ],
      effects: [{ flag: "cuisine_dehors" }],
      choices: [
        { text: "[Vider la sacoche]", next: "vider" },
        { text: "Non.", next: "refus", effects: [{ gesture: "refus_sacoche" }] },
        { text: "Je suis entré par là. J'ai laissé la porte ouverte. J'ai rallumé la génératrice. Mais les mordus étaient là avant moi.", next: "verite", effects: [{ flag: "lou_verite_m3" }] },
        { text: "[Montrer la preuve]", next: "preuve", when: { any: [{ deduction: "C5" }, { unlocked: "fact:C5" }] } },
        // Nier : faux pas immédiat, la boue le contredit.
        { text: "Je ne suis pas entré par là.", next: "nier", effects: [{ gesture: "nier" }] },
      ],
    },
    vider: {
      lines: [
        { who: "narration", text: "(Outils, carnet… et le paquet noué dans son chiffon. Ta main se pose dessus.)" },
        { who: "lou", text: "Ça, c'est à quelqu'un qui est mort. Ça ne te regarde pas." },
        { who: "speaker", text: "Correct." },
      ],
      effects: [{ flag: "lou_sacoche_videe" }],
      choices: [{ text: "…", next: "fin" }],
    },
    // Proposé.
    refus: { lines: [{ who: "speaker", text: "Non ? Correct. Je m'en souviendrai, {nom}." }], choices: [{ text: "…", next: "fin" }] },
    verite: { lines: [{ who: "speaker", text: "Prouve-le." }], choices: [{ text: "…", next: "fin" }] },
    // Proposé : la boue le contredit.
    nier: { lines: [{ who: "speaker", text: "Ta boue dit le contraire, {nom}." }], choices: [{ text: "…", next: "fin" }] },
    fin: {
      lines: [
        { who: "speaker", text: "Tant que tu me prouves pas le contraire, tu touches pas à mes affaires." },
        { who: "narration", text: "(Au tableau d'enquête, une question nouvelle : « Comment prouver que je n'y suis pour rien ? »)" },
      ],
      effects: [{ flag: "lou_accuse" }],
    },
    preuve: {
      lines: [{ who: "lou", text: "La montre de l'infirmier : 2 h 14, la nuit de l'orage. Tes neuf traits. Le seuil : mes pas, et ceux de Lila, qui sortent. Aucun mordu n'est entré par là." }],
      choices: [{ text: "…", next: "silence" }],
    },
    silence: {
      lines: [
        { who: "narration", text: "(Long silence. Il pose le couperet.)" },
        { who: "speaker", text: "…Neuf jours. Ouin. T'étais pas là." },
        { who: "speaker", text: "Bon. J'me suis trompé. Ça arrive pas souvent. C'est quoi ton nom, déjà ?" },
      ],
      choices: [{ text: "Lou.", next: "lou", effects: [{ gesture: "preuve" }, { flag: "m5" }, { flag: "lou_accuse" }] }],
    },
    lou: {
      lines: [{ who: "speaker", text: "Lou. Mais si c'est pas toi… c'est qui ?" }],
    },
  },
};

// ——— M4 : le commis ———

export const CUISINE_M4: Conversation = {
  id: "cuisine_m4",
  speaker: CUISINE,
  start: "apres",
  nodes: {
    apres: {
      lines: [
        // Proposé : la mise en scène.
        { who: "narration", text: "(Le commis ne bouge plus. Cuisine baisse lentement son couperet.)" },
        { who: "speaker", text: "…T'aurais pu me laisser là. Pourquoi ?" },
      ],
      choices: [
        // Proposé.
        { text: "Parce que tu es vivant.", next: "merci" },
        { text: "Je ne laisse personne face à un mordu.", next: "merci" },
      ],
    },
    // Proposé.
    merci: { lines: [{ who: "speaker", text: "…Ouin. (Il renifle.) Ça change rien. …Ça change un peu, {nom}." }] },
  },
};

// ——— M5 : le retournement ———

export const CUISINE_M5: Conversation = {
  id: "cuisine_m5",
  speaker: CUISINE,
  start: "cartes",
  nodes: {
    cartes: {
      // Proposé : la mise en scène.
      lines: [{ who: "narration", text: "(Tu poses tes cartes devant la chambre froide, une par une.)" }],
      choices: [{ text: "La montre de l'infirmier : 2 h 14, la nuit de l'orage. Tes neuf traits. Le seuil : mes pas, et ceux de Lila, qui sortent. Aucun mordu n'est entré par là.", next: "silence" }],
    },
    silence: {
      lines: [
        { who: "narration", text: "(Long silence. Il pose le couperet.)" },
        { who: "speaker", text: "…Neuf jours. Ouin. T'étais pas là." },
        { who: "speaker", text: "Bon. J'me suis trompé. Ça arrive pas souvent. C'est quoi ton nom, déjà ?" },
      ],
      choices: [{ text: "Lou.", next: "lou", effects: [{ gesture: "preuve" }, { flag: "m5" }] }],
    },
    lou: {
      lines: [
        { who: "speaker", text: "Lou." },
        { who: "narration", text: "(Il barre « L'ÉTRANGER » sur sa porte.)" },
        { who: "speaker", text: "Mais si c'est pas toi… c'est qui ?" },
      ],
    },
  },
};

// ——— M6 : l'aveu et le choix de Lou ———

export const OPERATRICE_AVEU: Conversation = {
  id: "operatrice_aveu",
  speaker: OPERATRICE,
  start: "lampe",
  nodes: {
    lampe: {
      lines: [
        { who: "narration", text: "(Elle pose sa lampe verte sur la console.)" },
        { who: "speaker", text: "Il m'appelait « ma Nuit ». J'ai entendu : « À l'aube, on le sort. » Je voulais juste lui dire au revoir." },
        { who: "speaker", text: "La porte s'est ouverte toute seule. Il était si calme, sous le vert… et la pile est morte." },
      ],
      choices: [{ text: "[Écouter]", next: "silence" }],
    },
    silence: {
      lines: [
        { who: "speaker", text: "Lila a frappé à ma porte, après. Je n'ai pas répondu. Le silence, c'était moi aussi." },
        { who: "speaker", text: "Et quand ils vous ont accusé, je n'ai rien dit. C'était plus facile. Pardon, Lou." },
      ],
      effects: [{ flag: "operatrice_aveu" }],
      choices: [
        { text: "Dites-le-lui vous-même.", next: "elle", effects: [{ flag: "m6_elle" }, { flag: "m6" }] },
        { text: "Je vais le lui dire.", next: "lou", effects: [{ flag: "m6_lou" }, { flag: "m6" }] },
        { text: "(Garder son secret.)", next: "secret", effects: [{ flag: "m6_secret" }, { flag: "m6" }] },
      ],
    },
    elle: {
      lines: [
        { who: "narration", text: "(Clic. Le circuit général. Elle avoue à Cuisine, d'une voix qui tremble. Long silence.)" },
        { who: "narration", text: "CUISINE, au haut-parleur : « …Ben. On a tous fermé une porte, c'te nuit-là. Moi, c'était l'armoire. »" },
      ],
      choices: [{ text: "Venez avec moi, en bas.", next: "rester" }, { text: "[Partir]" }],
    },
    lou: {
      lines: [
        // Proposé : la mise en scène ; la réplique est celle du document.
        { who: "narration", text: "(Cuisine saura. Il sera en colère contre elle.)" },
        { who: "speaker", text: "Vous avez eu raison. Moi, je ne l'ai pas fait pour vous." },
      ],
      choices: [{ text: "Venez avec moi, en bas.", next: "rester" }, { text: "[Partir]" }],
    },
    secret: {
      lines: [
        // Proposé.
        { who: "narration", text: "(Tu ne diras rien. Toi aussi, tu gardes quelque chose.)" },
        { who: "speaker", text: "…Merci, Lou." },
      ],
      choices: [{ text: "Venez avec moi, en bas.", next: "rester" }, { text: "[Partir]" }],
    },
    rester: {
      lines: [{ who: "speaker", text: "Non. Quelqu'un doit rester à la radio, pour dire la vérité à ceux d'en bas. Va, Lou." }],
    },
  },
};

// ——— M7 : le départ (Cuisine confiant) ———

export const CUISINE_M7: Conversation = {
  id: "cuisine_m7",
  speaker: CUISINE,
  start: "peches",
  nodes: {
    peches: {
      lines: [
        // Proposé : la mise en scène.
        { who: "narration", text: "(Cuisine t'attend devant le couloir nord, une boîte de pêches à la main.)" },
        { who: "speaker", text: "Reviens pas mordu, Lou. J'ai pas assez de pêches pour deux." },
      ],
      effects: [{ flag: "m7" }],
      choices: [{ text: "[Prendre les pêches] Merci, Cuisine.", effects: [{ item: "cans", delta: 1 }, { flag: "cu_peches" }] }],
    },
  },
};

// ——— Fin de l'étage : la radio réparée ———

/**
 * Fin de l'étage : la radio réparée. La voix d'Okafor et les bips passent d'abord en avis (événements d10, d11 de
 * l'enquête) ; ici, l'opératrice traduit le signal, lettre par lettre (HISTOIRE § 21, 3).
 */
export const RADIO_FIN: Conversation = {
  id: "radio_fin",
  speaker: { id: OPERATOR, name: "L'OPÉRATRICE DE NUIT", title: "À LA RADIO", portrait: "operatrice" },
  start: "bips",
  nodes: {
    bips: {
      lines: [
        { who: "narration", text: "[La voix d'Okafor s'est tue. À la radio, des bips, tapés à la main : · · · – / · · / · / – · / · · ·]" },
        // Proposé : elle reconnaît le code.
        { who: "speaker", text: "Attendez… Ce sont des lettres.", when: fact("m2") },
        { who: "speaker", text: "V… I… E… N… S.", when: fact("m2") },
        { who: "speaker", text: "Ce n'est pas le poste de l'étage 2. Cette fréquence… elle vient de plus bas.", when: fact("m2") },
        { who: "speaker", text: "Il n'y a rien, plus bas. Il ne devrait rien y avoir.", when: fact("m2") },
        // Proposé : sans l'opératrice pour traduire.
        { who: "narration", text: "(Des points, des traits. Quelqu'un tape, de plus bas que l'étage 2.)", when: not(fact("m2")) },
      ],
      effects: [{ flag: "radio_fin" }],
    },
  },
};

export const PEOPLE_CONVERSATIONS: Conversation[] = [
  RADIO_GUERITE, CUISINE_M1, CUISINE_TALK, OPERATRICE_M2, OPERATRICE_TALK, CUISINE_M3, CUISINE_M4, CUISINE_M5,
  OPERATRICE_AVEU, CUISINE_M7, RADIO_FIN,
];

for (const c of PEOPLE_CONVERSATIONS) registerConversation(c);

