// Liens entre l'enquête et l'agent « personnages » (conversations, scènes M1 à M7, mordus identifiés).
// Tout passe par des identifiants du document (docs/HISTOIRE_PROPOSITION.md, docs/MEFIANCE_SURVIVANTS.md) :
//
// 1. Ce que les CONVERSATIONS posent (effet { flag } de game/conversation.ts) et que l'enquête lit :
//    les scènes « m1 » à « m7 », et deux témoignages. Un dialogue qui donne une carte pose simplement le fait.
// 2. Ce que l'ENQUÊTE pose dans state.flags (lisible par { fact } dans une conversation) :
//    - chaque déduction réussie : son identifiant en minuscules (« x1 »… « x10 », « c1 »… « c5 ») ;
//    - chaque déblocage `fact` et `dialogue` d'une déduction, en minuscules (ex. « x9 », « accused_cleared ») ;
//    - chaque énigme résolue : « puzzle_locker », « puzzle_shed », « puzzle_terminal » ;
//    - les cartes marquées `flag` : « card.<id> » (ex. « card.lila_lantern »).
// 3. Les MORDUS porteurs d'indices (identifiants de ENEMIES, game/level.ts, § 7 du document).

/** Faits posés par les conversations de l'agent « personnages » (state.flags). */
export const SCENE = {
  /** M1 — première rencontre de Cuisine, à travers la porte (« Depuis que t'es là »). */
  M1: "m1",
  /** M2 — la voix au haut-parleur, après l'énigme 2 (« L'étranger est entré par là »). */
  M2: "m2",
  /** M3 — l'accusation publique au hub, devant l'avis. */
  M3: "m3",
  /** M4 — le commis (sauvetage). */
  M4: "m4",
  /** M5 — le retournement (C5 montrée à Cuisine). */
  M5: "m5",
  /** M6 — la révélation et le choix de Lou. */
  M6: "m6",
  /** M7 — le départ. */
  M7: "m7",
  /** Cuisine raconte sa nuit (« J'étais à l'entrepôt… », « J'ai dit non »). */
  cookTestimony: "cook_testimony",
  /** L'opératrice, à l'interphone : « Je suis restée coincée depuis l'orage. » */
  operatorStuck: "operator_stuck",
} as const;

/** Faits posés par l'enquête elle-même. */
export const PUZZLE_FLAG = (id: string) => `puzzle_${id}`;
export const DEDUCTION_FLAG = (id: string) => id.toLowerCase();
export const CARD_FLAG = (id: string) => `card.${id}`;

/** Les cinq mordus identifiés (identifiants de ENEMIES, § 7 et § 22 du document). */
export const ENEMY = {
  /** Le guetteur, zone extérieure : feuille d'expédition. */
  watchman: "walker_ext",
  /** Marceau, le Silencieux, génératrice : bracelet et alliance. */
  marceau: "walker_gen",
  /** Le commis, cafétéria : ticket de plateau. */
  commis: "crawler_cafe",
  /** L'infirmier (walker_control déplacé à l'infirmerie) : montre et mot. */
  nurse: "walker_control",
  /** Sgt Bérard (walker_dorms déplacé au couloir nord) : page arrachée. */
  berard: "walker_dorms",
} as const;
