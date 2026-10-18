// Positions des objets d'enquête de l'étage 1, en UN SEUL ENDROIT (mètres, plan de game/level.ts ; le nord est −Z).
// D'après docs/HISTOIRE_PROPOSITION.md § 22 et les pièces du document. Quand le § 22 tombe sur un objet existant
// (sacs de sable, note canon, mur), l'objet est déplacé d'un ou deux mètres dans la même pièce.
// À ajuster ici quand le décor définitif (table STORY_PROPS de game/render/storyProps.ts) sera fusionné :
// chaque entrée porte le nom de l'objet du document.
import type { RoomId } from "../../level";

export interface Spot {
  x: number;
  z: number;
  /** Pièce attendue (vérifiée par les tests). */
  room: RoomId;
  /** Orientation du marqueur (radians, 0 = face vers le sud). */
  yaw?: number;
}

const at = (room: RoomId, x: number, z: number, yaw = 0): Spot => ({ room, x, z, yaw });

export const POS = {
  // ——— Entrée (extérieur) ———
  /** Craie sur la grande porte (§ 22 : 0, 23.2). */
  chalk_door: at("plaza", 0, 23.32),
  /** Affiche de la règle n° 1 (§ 22 : 2.5, 23.6 → côté ouest, au-dessus des sacs de sable). */
  poster_rule: at("plaza", -4.2, 23.6),
  /** Gros verrous côté dehors (§ 22 : −1.5, 23.4 → montant est de la porte). */
  door_bolts: at("plaza", 1.75, 23.6),
  /** Photo de l'inauguration, posée près de la guérite renversée (5, 32.4). */
  photo_inauguration: at("plaza", 3.4, 30.1, 0.4),
  /** Radio de la guérite (première minute). */
  guard_radio: at("plaza", 5, 32.4),
  /** Seuil de la porte de service (porte plaza_generator, −11, 27). */
  service_threshold: at("plaza", -10.25, 27, Math.PI / 2),

  // ——— Zone extérieure ———
  /** Lanterne de Lila, près des épaves, à côté d'une ferraille (part_2 : 41, 28). */
  lila_lantern: at("exterior", 40, 30),
  /** Le guetteur (walker_ext) : où il guette, face à la route. */
  watchman: at("exterior", 32, 38),

  // ——— Génératrice ———
  /** Journal de maintenance, page suivante (la note canon est en −29, 23.5). */
  maintenance_log: at("generator", -27.9, 23.0),
  /** Moitié gauche de la consigne de délestage (§ 22 : −13, 21.5). */
  note_shed_left: at("generator", -13, 20.45),
  /** Tableau des 4 leviers (énigme 2), mur nord de la génératrice. */
  levers: at("generator", -15.6, 20.45),
  /** Marceau, le Silencieux (walker_gen) : près du moteur. */
  marceau: at("generator", -16, 29),

  // ——— Sécurité ———
  /** Moitié droite de la consigne (§ 22 : −4, 15), au mur ouest. */
  note_shed_right: at("security", -4.6, 15, Math.PI / 2),
  /** Terminal de Bérard et son post-it (§ 22 : 3, 16). */
  terminal: at("security", 3.2, 16, -Math.PI / 2),

  // ——— Hub ———
  poster_notice: at("hub", -4.25, -3.9, 0.83),
  /** Valise qui glisse (d5). */
  suitcase: at("hub", -1.5, -4.5),

  // ——— Cafétéria ———
  /** Post-it de Cuisine (§ 22 : −12.5, 17), au mur est. */
  note_cook_postit: at("cafeteria", -11.4, 17, -Math.PI / 2),
  /** Traits à la craie sur la porte de la chambre froide (près de Cuisine, −30, 18). */
  cook_tally: at("cafeteria", -31.6, 16.2, Math.PI / 2),
  /** Chambre froide de Cuisine (coups de l'intérieur, d6). */
  cold_room: at("cafeteria", -30.5, 18),
  /** Le commis (crawler_cafe). */
  commis: at("cafeteria", -22, 12),

  // ——— Entrepôt ———
  /** Armoire à piles cadenassée (§ 22 : −30, −4.5 → un peu au nord de la liste de Lila). */
  battery_locker: at("storage", -31.2, -1.6, Math.PI / 2),

  // ——— Infirmerie ———
  note_infirmary_map: at("infirmary", 10.5, -1.7, Math.PI / 2),
  /** Tiroir du bureau d'Okafor. */
  okafor_drawer: at("infirmary", 13.4, 2.75, Math.PI),
  /** Liste de Lila n° 2, dans le panier vide du bureau. */
  note_lila_2: at("infirmary", 14.7, 2.4),
  /** L'armoire qui masque la porte de la chambre 1. */
  room1_cabinet: at("infirmary", 18.4, 6.55, Math.PI),
  /** L'infirmier (walker_control, déplacé à l'infirmerie). */
  nurse: at("infirmary", 14, -3),
  // Chambre 1 (cloison au sud-est de l'infirmerie, ≈ x 18–22, z 4–8).
  /** Serrure électrique de la chambre 1. */
  room1_lock: at("infirmary", 19.3, 5.0, Math.PI / 2),
  /** Lampe de chevet (éclat vert). */
  room1_lamp: at("infirmary", 21.3, 6.9),
  /** Dossier de la chambre 1 (§ 22 : 21, 6). */
  note_room1_file: at("infirmary", 20.9, 5.4),
  /** Centre de la chambre 1 (pensée en entrant). */
  room1: at("infirmary", 20.3, 6),

  // ——— Atelier ———
  /** Casier de Marceau (§ 22 : 35, −6), contre le mur est. */
  marceau_locker: at("workshop", 35.4, -6, -Math.PI / 2),

  // ——— Salle de contrôle ———
  /** Cahier de relève de nuit (§ 22 : 16, −20), sur la console. */
  note_radio_logbook: at("control", 15.4, -19.4),
  /** Porte du local technique (§ 22 : 26, −20) : loquet. */
  operator_latch: at("control", 25.6, -20.1, -Math.PI / 2),
  /** Lampe verte de l'opératrice, posée au guichet du local technique. */
  operator_lamp: at("control", 25.5, -18.6),

  // ——— Couloir nord, accès étage 2 ———
  /** Sgt Bérard (walker_dorms, déplacé au couloir nord). */
  berard: at("north", 0, -11),
  /** Grille de l'accès étage 2. */
  stairs_grille: at("north", 0, -13.2),

  // ——— Dortoirs, pièce cachée ———
  /** Liste de Lila n° 3, sous un oreiller (§ 22 : −29, −17). */
  note_lila_3: at("dorms", -29, -17),
  /** Dessin de Lila (§ 22 : −36, −17). */
  lila_drawing: at("secret", -36, -17),
  /** Étiquette de la clé d'accès (la clé est en −35, −14). */
  keycard_tag: at("secret", -34.4, -15.3),

  // ——— Serre ———
  /** Liste de Lila n° 4 (§ 22 : 27, 10). */
  note_lila_4: at("greenhouse", 27, 10),
} satisfies Record<string, Spot>;

export type SpotId = keyof typeof POS;
