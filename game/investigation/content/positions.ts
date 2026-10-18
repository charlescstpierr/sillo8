// Positions des objets d'enquête de l'étage 1, en UN SEUL ENDROIT (mètres, plan de game/level.ts ; le nord est −Z).
// Les objets dessinés par le décor narratif se branchent sur leur position RÉELLE (STORY_PROPS de
// game/render/storyProps.ts, même identifiant quand il existe). Les autres (tableau des leviers, objets portés par les
// mordus, points de déclenchement) suivent docs/HISTOIRE_PROPOSITION.md § 22, ajustés dans la même pièce.
import type { RoomId } from "../../level";
import { STORY_PROPS, type StoryPropId } from "../../render/storyProps";

export interface Spot {
  x: number;
  z: number;
  /** Hauteur de l'objet (m), pour le contour à portée. */
  y: number;
  /** Pièce attendue (vérifiée par les tests). */
  room: RoomId;
  /** Orientation du marqueur (radians, 0 = face vers le sud). */
  yaw?: number;
}

const at = (room: RoomId, x: number, z: number, y = 0.05, yaw = 0): Spot => ({ room, x, z, y, yaw });
/** Position d'un objet du décor narratif. */
const story = (id: StoryPropId): Spot => ({ room: STORY_PROPS[id].room, x: STORY_PROPS[id].x, z: STORY_PROPS[id].z, y: STORY_PROPS[id].y });

export const POS = {
  // ——— Entrée (extérieur) ———
  chalk_door: story("chalk_door"),
  poster_rule: story("poster_rule"),
  door_bolts: story("door_bolts"),
  photo_inauguration: story("photo_inauguration"),
  guard_radio: story("guard_radio"),
  service_threshold: story("service_threshold"),

  // ——— Zone extérieure ———
  lila_lantern: story("lila_lantern"),
  /** Le guetteur (walker_ext) : où il guette, face à la route. */
  watchman: at("exterior", 32, 38),

  // ——— Génératrice ———
  /** Journal de maintenance, page suivante (la note canon est en −29, 23.5). */
  maintenance_log: at("generator", -27.9, 23.0),
  note_shed_left: story("note_shed_left"),
  /** Tableau des 4 leviers (énigme 2), au-dessus de la craie « D C I C » du décor. */
  levers: at("generator", STORY_PROPS.shed_chalk.x, 20.42, 1.0),
  /** Marceau, le Silencieux (walker_gen) : près du moteur. */
  marceau: at("generator", -16, 29),

  // ——— Sécurité ———
  note_shed_right: story("note_shed_right"),
  terminal: story("terminal"),

  // ——— Hub ———
  poster_notice: story("poster_notice"),
  open_suitcase: story("open_suitcase"),

  // ——— Cafétéria ———
  note_cook_postit: story("note_cook_postit"),
  cook_tally: story("cook_tally"),
  cold_room_door: story("cold_room_door"),
  /** Le commis (crawler_cafe). */
  commis: at("cafeteria", -22, 12),

  // ——— Entrepôt ———
  battery_locker: story("battery_locker"),

  // ——— Infirmerie et chambre 1 ———
  note_infirmary_map: story("note_infirmary_map"),
  okafor_drawer: story("okafor_drawer"),
  note_lila_2: story("note_lila_2"),
  room1_cabinet: story("room1_cabinet"),
  /** L'infirmier (walker_control, déplacé à l'infirmerie). */
  nurse: at("infirmary", 14, -3),
  room1_door: story("room1_door"),
  room1_bedside_lamp: story("room1_bedside_lamp"),
  note_room1_file: story("note_room1_file"),
  room1_bed: story("room1_bed"),

  // ——— Atelier ———
  marceau_locker: story("marceau_locker"),

  // ——— Salle de contrôle ———
  note_radio_logbook: story("note_radio_logbook"),
  operator_door: story("operator_door"),
  /** Lampe verte de l'opératrice, posée au guichet de la porte (passée par la fente après l'énigme 2). */
  operator_lamp: at("control", 29.0, -18.25, 0.1),

  // ——— Couloir nord, accès étage 2 ———
  /** Sgt Bérard (walker_dorms, déplacé au couloir nord). */
  berard: at("north", 0, -11),
  /** Grille de l'accès étage 2 (marques de chariot). */
  stairs_grille: at("north", 0, -13.2),

  // ——— Dortoirs, pièce cachée ———
  note_lila_3: story("note_lila_3"),
  lila_drawing: story("lila_drawing"),
  /** Étiquette de la clé d'accès (la clé est en −35, −14). */
  keycard_tag: at("secret", -34.4, -15.0, 0.1),

  // ——— Serre ———
  note_lila_4: story("note_lila_4"),
} satisfies Record<string, Spot>;

export type SpotId = keyof typeof POS;

/** Chambre 1 et local technique (cloisons du décor), pour lever leur plafond quand Lou y entre. */
export const AREAS = {
  room1: { x0: 18.6, x1: 21.85, z0: 4.6, z1: 7.85 },
  local: { x0: 26.6, x1: 29.85, z0: -21.85, z1: -18.55 },
} as const;

/** L'armoire de la chambre 1 glisse vers le nord (m) quand on la pousse : la porte (z ± 0.48) se libère. */
export const CABINET_SLIDE = -1.3;
