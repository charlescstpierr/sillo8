// Narration par le décor de l'étage 1 (docs/HISTOIRE_PROPOSITION.md, § 11 « une scène muette par pièce »).
// Rien ici n'est interactif : ce sont des objets posés, des traces et des lumières qui racontent ce qui s'est
// passé, neuf jours après l'orage (J+9). Les objets-indices du document sont listés dans STORY_PROPS, pour
// que l'enquête (gros plans, carnet) puisse s'y brancher sans connaître le décor.
//
// Performance (téléphone, mode « Fluide ») : tout le décor fixe est fondu dans le lot statique du monde
// (bakeStatic) ; les images (affiches, craies, traces, carnets) partagent un seul atlas, donc deux matériaux.
// Seuls restent à part les quelques objets animés (lanterne, lueur verte, ampoule) et ceux qu'on pourra
// déplacer plus tard (armoire de la chambre 1, plafonds des deux petites pièces).
import {
  AdditiveBlending, BufferAttribute, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial,
  PlaneGeometry, SphereGeometry, TorusGeometry, type Material, type MeshToonMaterial, type Object3D,
} from "three";
import type { RoomId } from "../level";
import type { DecorContext } from "./world";
import { glow, toon } from "./toon";
import { PALETTE } from "./palette";
import { StaticBatch, bakeStatic, block, cylinder, grass, mesh, panel, signBoard } from "./props";
import {
  centerArrowTexture, centerNoteTexture, drawingTexture, rng, storyAtlas, storyDoorChalkTexture, westGlowTexture, westKnitTexture,
} from "./textures";

// ——— Table des objets-indices ———

export interface StoryProp {
  /** Centre de l'objet, en mètres (y = hauteur au-dessus du sol). */
  x: number; y: number; z: number;
  room: RoomId;
  /** Petit espace aménagé à l'intérieur de la pièce, s'il y a lieu. */
  area?: "guérite" | "chambre 1" | "local technique";
  /** Ce que le joueur voit, en clair. */
  label: string;
}

/**
 * Objets-indices et scènes muettes posés dans le décor, par identifiant (repris de HISTOIRE_PROPOSITION.md
 * quand le document en donne un). Positions réelles du décor : c'est là qu'un gros plan doit se brancher.
 */
export const STORY_PROPS = {
  // Entrée (extérieur) : la première minute.
  chalk_door: { x: 0, y: 0.62, z: 22.09, room: "plaza", label: "Craie sur la grande porte : « ILS SONT DESCENDUS. PAS TOUS. »" },
  door_bolts: { x: -1.15, y: 0.75, z: 22.25, room: "plaza", label: "Gros verrous de la grande porte, côté dehors (un triangle gravé)" },
  poster_rule: { x: 3.3, y: 1.2, z: 22.96, room: "plaza", label: "Affiche « RÈGLE N° 1 — Aucun mordu ne franchit la porte »" },
  guard_booth: { x: 5.5, y: 1.0, z: 26.7, room: "plaza", area: "guérite", label: "Guérite du poste d'entrée, toit tombé, lanterne qui grésille" },
  guard_radio: { x: 5.2, y: 1.05, z: 26.08, room: "plaza", area: "guérite", label: "Radio de la guérite, pile morte" },
  photo_inauguration: { x: 5.88, y: 1.03, z: 26.12, room: "plaza", area: "guérite", label: "Photo de l'inauguration (quelqu'un de dos, valise au triangle)" },
  hopscotch: { x: 2.15, y: 0.03, z: 25.1, room: "plaza", label: "Marelle à la craie qui s'arrête à la case 4" },
  service_threshold: { x: -10.6, y: 0.04, z: 27.3, room: "plaza", label: "Seuil de la porte de service : de petits pas qui sortent, à demi effacés" },
  service_chalk: { x: -9.4, y: 0.04, z: 26.35, room: "plaza", label: "Craie devant la porte de service : « 3 », trois engrenages, une flèche vers les épaves" },
  service_sign: { x: -9.6, y: 1.25, z: 29.6, room: "plaza", label: "Panneau « SERVICE »" },
  // Zone extérieure.
  lila_lantern: { x: 40.1, y: 0.2, z: 29.05, room: "exterior", label: "Lanterne d'enfant (verre blanc) posée sur une épave, à côté d'une ferraille" },
  lila_footprints: { x: 26, y: 0.02, z: 35.6, room: "exterior", label: "Petits pas qui vont vers les épaves ; aucun ne revient" },
  // Génératrice.
  marceau_chair: { x: -20.25, y: 0.45, z: 23.05, room: "generator", label: "Chaise et gamelle à côté du moteur" },
  note_shed_left: { x: -12.75, y: 0.52, z: 20.92, room: "generator", label: "Consigne de délestage, moitié gauche (punaisée au pupitre)" },
  shed_chalk: { x: -15.8, y: 0.48, z: 20.2, room: "generator", label: "Craie à moitié effacée « D · C · I · C »" },
  // Sécurité.
  security_register: { x: -2.2, y: 0.9, z: 11.55, room: "security", label: "Registre du poste ouvert (« RAS »…), stylo tombé" },
  note_shed_right: { x: -4.45, y: 0.5, z: 15.79, room: "security", label: "Consigne de délestage, moitié droite (sur le comptoir)" },
  terminal: { x: 3.0, y: 1.05, z: 17.45, room: "security", label: "Terminal de Bérard et son post-it" },
  calendar: { x: 1.95, y: 1.02, z: 7.22, room: "security", label: "Calendrier : jours barrés jusqu'à l'orage, puis plus rien" },
  // Hub central et couloir nord.
  poster_notice: { x: -4.25, y: 0.99, z: -6.73, room: "hub", label: "Avis officiel « AVIS À TOUS », bien droit au milieu des mots" },
  suitcase_line: { x: -3.3, y: 0.15, z: 0.3, room: "hub", label: "Valises abandonnées en file vers le nord" },
  open_suitcase: { x: -4.45, y: 0.15, z: -0.3, room: "hub", label: "Valise ouverte sur le côté, photo de groupe retournée" },
  cart_tracks: { x: 0.95, y: 0.02, z: -13.2, room: "north", label: "Marques de chariot qui descendent, aucune qui remonte" },
  // Cafétéria.
  cold_room_door: { x: -30.25, y: 1.0, z: 17.78, room: "cafeteria", label: "Porte de la chambre froide (Cuisine est derrière)" },
  cook_tally: { x: -30.1, y: 1.45, z: 17.79, room: "cafeteria", label: "Neuf traits à la craie sur la porte de la chambre froide" },
  tray_stack: { x: -30.0, y: 0.15, z: 18.35, room: "cafeteria", label: "Pile de plateaux vides posés devant la chambre froide" },
  note_cook_postit: { x: -12.95, y: 1.05, z: 15.8, room: "cafeteria", label: "Post-it de Cuisine (code de l'armoire à piles)" },
  cook_barricade: { x: -28.2, y: 0.45, z: 18.0, room: "cafeteria", label: "Barricade poussée de côté : table renversée, tabourets" },
  // Entrepôt.
  battery_locker: { x: -29.5, y: 1.0, z: -5.5, room: "storage", label: "Armoire à piles cadenassée (cadenas à lettres)" },
  battery_basket: { x: -28.2, y: 0.12, z: -4.65, room: "storage", label: "Panier à piles vide, retourné" },
  cook_piles_note: { x: -17.6, y: 1.05, z: -5.8, room: "storage", label: "Mot de Cuisine : « PILES : ON LES COMPTE, MAINTENANT. »" },
  // Dortoirs et pièce cachée.
  lila_bed: { x: -31.0, y: 0.4, z: -11.3, room: "dorms", label: "Le seul lit défait, petit oreiller de travers (celui de Lila)" },
  note_lila_3: { x: -31.45, y: 0.47, z: -11.12, room: "dorms", label: "Liste de Lila n° 3, sous l'oreiller" },
  lila_cabin: { x: -35.95, y: 0.5, z: -12.6, room: "secret", label: "Cabane en couverture" },
  lila_drawing: { x: -34.9, y: 1.05, z: -17.79, room: "secret", label: "Dessin de Lila : le silo en coupe, « ICI ÇA TAPE »" },
  shoebox: { x: -34.55, y: 0.1, z: -12.35, room: "secret", label: "Boîte à chaussures aux trésors" },
  nightlight: { x: -35.35, y: 0.12, z: -11.4, room: "secret", label: "La dernière veilleuse de Lila" },
  // Infirmerie et chambre 1.
  room1_cabinet: { x: 18.27, y: 1.0, z: 6.58, room: "infirmary", label: "Armoire devant la porte de la chambre 1" },
  cabinet_scrapes: { x: 18.27, y: 0.02, z: 5.3, room: "infirmary", label: "Raclures au sol : l'armoire a souvent bougé" },
  note_infirmary_map: { x: 10.95, y: 1.32, z: -7.78, room: "infirmary", label: "Plan de l'infirmerie (chambre 1 « CONDAMNÉE »)" },
  okafor_drawer: { x: 13.75, y: 0.66, z: 3.72, room: "infirmary", label: "Tiroir du bureau du Dr Okafor (fermé à clé)" },
  uv_lamp: { x: 12.95, y: 0.88, z: 3.25, room: "infirmary", label: "Lampe UV du Dr Okafor" },
  note_lila_2: { x: 14.55, y: 0.08, z: 3.62, room: "infirmary", label: "Liste de Lila n° 2, au fond d'un panier à piles vide" },
  room1_door: { x: 18.6, y: 0.76, z: 6.58, room: "infirmary", area: "chambre 1", label: "Porte électrique de la chambre 1 (serrure sans courant)" },
  room1_bed: { x: 20.9, y: 0.55, z: 6.0, room: "infirmary", area: "chambre 1", label: "Lit à sangles défaites" },
  room1_lamps: { x: 20.9, y: 1.33, z: 6.0, room: "infirmary", area: "chambre 1", label: "Deux lampes neuves au plafond, sur piles" },
  room1_bedside_lamp: { x: 19.75, y: 0.8, z: 5.05, room: "infirmary", area: "chambre 1", label: "Lampe de chevet à la douille vide (un éclat vert)" },
  room1_tray: { x: 19.15, y: 0.05, z: 5.95, room: "infirmary", area: "chambre 1", label: "Plateau propre posé près de la porte" },
  room1_batteries: { x: 19.1, y: 0.15, z: 4.98, room: "infirmary", area: "chambre 1", label: "Seau de piles vides" },
  note_room1_file: { x: 20.85, y: 0.66, z: 6.25, room: "infirmary", area: "chambre 1", label: "Dossier de la chambre 1 (patient n° 1)" },
  // Atelier.
  marceau_locker: { x: 33.4, y: 1.0, z: -7.55, room: "workshop", label: "Casier de Marceau : outils rangés au millimètre, nom à demi arraché" },
  // Salle de contrôle.
  operator_chair: { x: 19.3, y: 0.45, z: -17.2, room: "control", label: "Fauteuil de l'opératrice, repoussé d'un bond" },
  operator_mug: { x: 16.75, y: 1.13, z: -20.85, room: "control", label: "Tasse encore pleine sur la console radio" },
  note_radio_logbook: { x: 19.25, y: 1.09, z: -20.9, room: "control", label: "Cahier de relève de nuit (rien entre 2 h 00 et 2 h 20)" },
  operator_door: { x: 28.3, y: 0.76, z: -18.53, room: "control", area: "local technique", label: "Porte du local technique, fermée de l'intérieur" },
  operator_glow: { x: 28.3, y: 0.03, z: -18.15, room: "control", area: "local technique", label: "Lueur verte sous la porte" },
  lila_thermos: { x: 27.55, y: 0.15, z: -18.1, room: "control", label: "Thermos et couverture laissés devant la porte (« toc toc ? »)" },
  // Serre.
  greenhouse_row: { x: 28.4, y: 0.5, z: 11.9, room: "greenhouse", label: "La seule rangée de plants encore arrosée" },
  lila_watering_can: { x: 27.45, y: 0.1, z: 10.75, room: "greenhouse", label: "Petit arrosoir d'enfant" },
  note_lila_4: { x: 27.0, y: 0.03, z: 10.0, room: "greenhouse", label: "Liste de Lila n° 4, sous un caillou" },
} as const satisfies Record<string, StoryProp>;

export type StoryPropId = keyof typeof STORY_PROPS;

/** Objets du décor qu'un autre module pourra animer : armoire, plafonds amovibles, lueur verte… */
const handles = new Map<string, Object3D>();
export function getStoryObject(id: "room1_cabinet" | "room1_ceiling" | "local_ceiling" | "operator_glow"): Object3D | undefined {
  return handles.get(id);
}
/** Range un objet mobile (nommé « story:<id> » pour le retrouver aussi dans la scène). */
function keep(id: string, object: Object3D): void {
  object.name = "story:" + id;
  handles.set(id, object);
}

// ——— Teintes ———

const C = {
  mustard: "#d8a43a", olive: "#6b7550", oliveDark: "#556045", leather: "#6a4528", leatherLight: "#7a4a2a",
  cream: "#e9dcc0", creamDark: "#cbbd98", charcoal: "#3a3633", brick: "#b5523b", teal: "#4f8a8b",
  iron: "#3b3633", steel: "#8d969a", brass: "#c99a45", wood: "#a06c3f", woodDark: "#6e4528", tray: "#8a9a7e",
  dead: "#4c4a3c", concrete: "#9a9585",
} as const;

// ——— Atlas : deux matériaux pour toutes les images ———

const planes = new Map<string, PlaneGeometry>();
function atlasPlane(name: string): PlaneGeometry {
  let g = planes.get(name);
  if (!g) {
    const [u0, v0, u1, v1] = storyAtlas().rect(name);
    g = new PlaneGeometry(1, 1);
    const uv = g.getAttribute("uv") as BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
    planes.set(name, g);
  }
  return g;
}

type Ink = "paper" | "chalk" | "screen";
function inkMaterial(ink: Ink): Material {
  const map = storyAtlas().texture;
  if (ink === "paper") return toon("#ffffff", { map, alphaTest: 0.5, rim: 0, side: DoubleSide });
  if (ink === "screen") return glowMap ??= new MeshBasicMaterial({ map });
  const m = toon("#ffffff", { map, transparent: true, rim: 0 }) as MeshToonMaterial;
  m.depthWrite = false;
  m.polygonOffset = true;
  m.polygonOffsetFactor = -2;
  return m;
}
let glowMap: MeshBasicMaterial | null = null;

/** Image verticale (affiche, carnet debout, craie au mur). `yaw` = direction de la face, `roll` = de travers. */
function sheet(parent: Object3D, name: string, x: number, y: number, z: number, w: number, h: number, yaw = 0, ink: Ink = "paper", roll = 0): Mesh {
  const m = mesh(atlasPlane(name), inkMaterial(ink), x, y, z, false);
  m.rotation.set(0, yaw, roll);
  m.scale.set(w, h, 1);
  if (ink === "chalk") m.renderOrder = 2;
  parent.add(m);
  return m;
}

/** Image couchée (craie au sol, traces, papier posé). Le haut de l'image pointe vers `rot` (0 = nord). */
function flat(parent: Object3D, name: string, x: number, z: number, w: number, d: number, rot = 0, ink: Ink = "chalk", y = 0.016): Mesh {
  const m = mesh(atlasPlane(name), inkMaterial(ink), x, y, z, false);
  m.rotation.set(-Math.PI / 2, 0, rot);
  m.scale.set(w, d, 1);
  m.renderOrder = ink === "chalk" ? 2 : 0;
  parent.add(m);
  return m;
}

/** Angle `flat` pour que le haut de l'image pointe vers (dx, dz). */
const heading = (dx: number, dz: number) => Math.atan2(-dx, -dz);

const geometries = new Map<string, unknown>();
function geo<T>(key: string, build: () => T): T {
  if (!geometries.has(key)) geometries.set(key, build());
  return geometries.get(key) as T;
}

function ball(parent: Object3D, color: string | Material, x: number, y: number, z: number, sx: number, sy = sx, sz = sx): Mesh {
  const m = mesh(geo("story-ball", () => new SphereGeometry(1, 10, 8)), typeof color === "string" ? toon(color) : color, x, y, z);
  m.scale.set(sx, sy, sz);
  parent.add(m);
  return m;
}

function place(parent: Object3D, x: number, z: number, yaw = 0, y = 0): Group {
  const g = new Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  parent.add(g);
  return g;
}

/** Tube horizontal selon X local. */
function barX(parent: Object3D, radius: number, length: number, color: string, x: number, y: number, z: number, segments = 10): Mesh {
  const m = mesh(geo(`story-cyl:${radius}:${length}:${segments}`, () => new CylinderGeometry(radius, radius, length, segments)), toon(color), x, y, z);
  m.rotation.z = Math.PI / 2;
  parent.add(m);
  return m;
}

function solid(ctx: DecorContext, x: number, z: number, w: number, d: number): void {
  ctx.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
}

/** Fond le contenu d'un groupe mobile dans un lot local (quelques appels de dessin au lieu de dizaines). */
function bakeInto(holder: Object3D, content: Object3D): void {
  const local = new StaticBatch(holder, 1000);
  bakeStatic(content, local);
  local.flush();
}

/** Même rythme que les lampes du monde (world.ts) : variations douces et coupures brèves. */
function flicker(time: number, seed: number, nervous: number): number {
  const wobble = Math.sin(time * 9 + seed * 7) * 0.5 + Math.sin(time * 23 + seed * 3) * 0.5;
  const cut = Math.sin(time * 1.7 + seed * 11) > 0.93 - nervous * 0.1 && Math.sin(time * 41 + seed) > 0 ? 0.15 : 1;
  return (1 - nervous * 0.25 + wobble * nervous * 0.2) * (nervous > 0.3 ? cut : 1);
}

/** Flaque de lumière additive au sol. */
function glowPool(parent: Object3D, x: number, z: number, w: number, d: number, color: string, opacity: number): MeshBasicMaterial {
  const material = new MeshBasicMaterial({ map: westGlowTexture(), color, transparent: true, opacity, depthWrite: false, blending: AdditiveBlending });
  const m = new Mesh(geo("story-plane", () => new PlaneGeometry(1, 1)), material);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.035, z);
  m.scale.set(w, d, 1);
  m.renderOrder = 3;
  m.userData.live = true;
  parent.add(m);
  return material;
}

// ——— Petits objets réutilisés ———

function suitcase(parent: Object3D, x: number, z: number, yaw: number, color: string, y = 0): Group {
  const g = place(parent, x, z, yaw, y);
  block(g, 0.62, 0.22, 0.42, color, 0, 0, 0, 0.06);
  for (const s of [-0.16, 0.16]) block(g, 0.05, 0.23, 0.44, C.leather, s, -0.004, 0, 0.02);
  block(g, 0.2, 0.05, 0.05, C.leather, 0, 0.1, 0.23, 0.02);
  return g;
}

function duffel(parent: Object3D, x: number, z: number, yaw: number, color: string): Group {
  const g = place(parent, x, z, yaw);
  const body = mesh(geo("story-duffel", () => new CylinderGeometry(0.17, 0.17, 0.7, 12)), toon(color), 0, 0.15, 0);
  body.rotation.z = Math.PI / 2;
  body.scale.set(1, 1, 0.85);
  g.add(body);
  for (const s of [-1, 1]) ball(g, color, s * 0.35, 0.15, 0, 0.04, 0.16, 0.14);
  const strap = mesh(geo("story-strap", () => new TorusGeometry(0.2, 0.015, 4, 12, Math.PI)), toon(C.leather), 0, 0.28, 0);
  g.add(strap);
  return g;
}

function bundle(parent: Object3D, x: number, z: number, yaw: number): Group {
  const g = place(parent, x, z, yaw);
  block(g, 0.5, 0.3, 0.4, "#c49a64", 0, 0, 0, 0.02);
  block(g, 0.52, 0.02, 0.04, C.cream, 0, 0.3, 0, 0.005);
  block(g, 0.04, 0.02, 0.42, C.cream, 0, 0.3, 0, 0.005);
  return g;
}

function deadBattery(parent: Object3D, x: number, y: number, z: number, yaw: number): void {
  const m = barX(parent, 0.035, 0.13, C.dead, x, y + 0.035, z, 8);
  m.rotation.set(0, yaw, Math.PI / 2);
  const cap = barX(parent, 0.02, 0.03, "#8a7a5a", x + Math.cos(yaw) * 0.075, y + 0.035, z - Math.sin(yaw) * 0.075, 6);
  cap.rotation.set(0, yaw, Math.PI / 2);
}

function chair(parent: Object3D, x: number, z: number, yaw: number, color: string = C.wood): Group {
  const g = place(parent, x, z, yaw);
  for (const [lx, lz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) block(g, 0.05, 0.42, 0.05, C.woodDark, lx, 0, lz, 0.01);
  block(g, 0.44, 0.05, 0.44, color, 0, 0.42, 0, 0.02);
  // Dossier vers +x local.
  block(g, 0.05, 0.45, 0.42, color, 0.2, 0.47, 0, 0.02);
  return g;
}

// ——— Entrée : la première minute ———

/** La grande porte : craie de Lila sur les battants, gros verrous côté dehors. Suit les battants qui s'ouvrent. */
function bigDoor(ctx: DecorContext): void {
  const door = ctx.root.children.find((c) => c instanceof Group && Math.abs(c.position.x) < 0.01 && Math.abs(c.position.z - 22) < 0.01 && c.children.some((k) => k.name === "leaf-left"));
  if (!door) return;
  // La pancarte « HORS TENSION » remonte en haut : la craie prend toute la porte.
  for (const c of door.children) if (c instanceof Mesh && !c.name) { c.position.set(0, 1.34, 0.1); c.scale.set(0.82, 0.3, 1); }
  const chalk = storyDoorChalkTexture();
  for (const side of [-1, 1]) {
    const leaf = door.getObjectByName(side < 0 ? "leaf-left" : "leaf-right");
    if (!(leaf instanceof Mesh)) continue;
    // Acier sombre : la craie claire se lit de loin. Les bandes rouges du battant laissent la place à la craie.
    leaf.material = toon("#4a5551");
    for (const bar of leaf.children) bar.visible = false;
    const half = chalk.clone();
    half.needsUpdate = true;
    half.repeat.set(0.5, 1);
    half.offset.set(side < 0 ? 0 : 0.5, 0);
    const material = toon("#ffffff", { map: half, transparent: true, rim: 0 }) as MeshToonMaterial;
    material.depthWrite = false;
    material.polygonOffset = true;
    material.polygonOffsetFactor = -2;
    const text = mesh(new PlaneGeometry(1.36, 1.1), material, -side * 0.02, -0.14, 0.086, false);
    text.renderOrder = 2;
    leaf.add(text);
    // Deux gros verrous par battant, au bord extérieur, tirés (ouverts).
    const bolts = new Group();
    leaf.add(bolts);
    for (const y of [-0.37, 0.37]) {
      block(bolts, 0.46, 0.22, 0.1, C.iron, side * 0.45, y - 0.11, 0.1, 0.03);
      for (const dx of [-0.17, 0.17]) for (const dy of [-0.07, 0.07]) ball(bolts, "#a8b0ae", side * 0.45 + dx, y + dy, 0.205, 0.022);
      barX(bolts, 0.075, 0.6, C.steel, side * 0.4, y, 0.24, 12);
      // Poignée du pêne : tige et boule de laiton.
      const knob = mesh(geo("story-knob", () => new CylinderGeometry(0.028, 0.028, 0.16, 8)), toon(C.brass), side * 0.13, y, 0.36);
      knob.rotation.x = Math.PI / 2;
      bolts.add(knob);
      ball(bolts, C.brass, side * 0.13, y, 0.45, 0.055);
      sheet(bolts, "triangle", side * 0.6, y, 0.153, 0.09, 0.09);
    }
    // Cadenas ouvert, pendu au verrou du haut à droite.
    if (side > 0) {
      block(bolts, 0.14, 0.16, 0.06, C.brass, 0.3, 0.37 - 0.36, 0.26, 0.03);
      const shackle = mesh(geo("story-shackle", () => new TorusGeometry(0.05, 0.014, 6, 12, Math.PI)), toon(C.steel), 0.33, 0.37 - 0.18, 0.26);
      shackle.rotation.z = 0.5;
      bolts.add(shackle);
    }
    bakeInto(leaf, bolts);
  }
}

/** Guérite du poste d'entrée : toit tombé, radio à la pile morte, photo de l'inauguration, lanterne qui grésille. */
function guardBooth(ctx: DecorContext, g: Group): void {
  const { x, z } = STORY_PROPS.guard_booth;
  const h = 0.9;
  block(g, 1.86, 0.05, 1.86, "#8a8576", x, 0, z, 0.02);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) block(g, 0.12, 2.25, 0.12, C.oliveDark, x + sx * h, 0, z + sz * h, 0.03);
  // Murets bas (coupés comme le reste du silo) et leur tranche moutarde.
  const wall = (cx: number, cz: number, w: number, d: number) => {
    block(g, w, 1.0, d, C.olive, cx, 0, cz, 0.03);
    block(g, w + 0.04, 0.07, d + 0.04, C.mustard, cx, 1.0, cz, 0.02);
    solid(ctx, cx, cz, w, d + 0.06);
  };
  wall(x, z - h, 1.7, 0.08);
  wall(x, z + h, 1.7, 0.08);
  wall(x + h, z, 0.08, 1.7);
  wall(x - h, z - 0.56, 0.08, 0.58);
  wall(x - h, z + 0.56, 0.08, 0.58);
  // Fenêtres du haut, vitres cassées : il ne reste que les cadres.
  for (const s of [-1, 1]) block(g, 1.7, 0.06, 0.06, C.oliveDark, x, 2.05, z + s * h, 0.02);
  block(g, 0.06, 0.06, 1.7, C.oliveDark, x + h, 2.05, z, 0.02);
  // Le toit de tôle a glissé et s'appuie dehors, contre le flanc est.
  const roof = place(g, x + h + 0.82, z);
  roof.rotation.z = 2.0;
  block(roof, 1.9, 0.05, 1.95, "#9a6a42", 0.95, 0, 0, 0.02);
  for (let i = 0; i < 6; i++) block(roof, 1.9, 0.04, 0.06, PALETTE.rust, 0.95, 0.05, -0.8 + i * 0.32, 0.015);
  // Tablette contre le mur nord : radio, photo, tasse, bloc de piles.
  const sy = 0.84;
  block(g, 1.5, 0.06, 0.4, C.wood, x, sy, z - h + 0.25, 0.02);
  for (const s of [-0.6, 0.6]) block(g, 0.05, sy, 0.05, C.woodDark, x + s, 0, z - h + 0.35, 0.01);
  const radio = place(g, STORY_PROPS.guard_radio.x, STORY_PROPS.guard_radio.z, 0, sy + 0.06);
  block(radio, 0.48, 0.28, 0.24, C.olive, 0, 0, 0, 0.05);
  block(radio, 0.5, 0.05, 0.26, C.oliveDark, 0, 0.28, 0, 0.02);
  const grille = mesh(geo("story-grille", () => new CylinderGeometry(0.08, 0.08, 0.02, 14)), toon(C.charcoal), -0.11, 0.14, 0.125);
  grille.rotation.x = Math.PI / 2;
  radio.add(grille);
  const dial = mesh(geo("story-dial", () => new CylinderGeometry(0.05, 0.05, 0.03, 12)), toon(C.cream), 0.12, 0.15, 0.125);
  dial.rotation.x = Math.PI / 2;
  radio.add(dial);
  ball(radio, "#5a1e16", 0.19, 0.24, 0.125, 0.018);
  const antenna = cylinder(radio, 0.008, 0.55, C.charcoal, 0.2, 0.3, -0.06, 4);
  antenna.rotation.z = -0.35;
  block(radio, 0.16, 0.1, 0.12, C.charcoal, -0.36, 0, 0.02, 0.02);
  block(radio, 0.14, 0.02, 0.1, C.mustard, -0.36, 0.1, 0.02, 0.01);
  // Photo de l'inauguration dans un petit cadre, posée debout.
  const frame = place(g, STORY_PROPS.photo_inauguration.x, STORY_PROPS.photo_inauguration.z, -0.15, sy + 0.06);
  frame.rotation.x = -0.25;
  block(frame, 0.32, 0.26, 0.03, C.woodDark, 0, 0, 0, 0.01);
  sheet(frame, "photo_inauguration", 0, 0.13, 0.017, 0.28, 0.22);
  cylinder(g, 0.045, 0.09, C.cream, x + 0.62, sy + 0.06, z - h + 0.2, 10);
  // Tabouret et lanterne pendue au poteau nord-ouest.
  cylinder(g, 0.035, 0.45, C.charcoal, x + 0.1, 0, z + 0.25, 6);
  cylinder(g, 0.17, 0.05, C.leather, x + 0.1, 0.45, z + 0.25, 12);
  block(g, 0.3, 0.04, 0.04, C.charcoal, x - h + 0.15, 1.95, z - h + 0.06, 0.01);
  const lantern = place(ctx.root, x - h + 0.28, z - h + 0.12, 0, 1.55);
  cylinder(lantern, 0.075, 0.04, C.charcoal, 0, 0, 0, 10);
  const lit = new MeshBasicMaterial({ color: "#ffc870" });
  const glass = mesh(geo("story-lantern-glass", () => new CylinderGeometry(0.055, 0.055, 0.15, 10)), lit, 0, 0.11, 0, false);
  lantern.add(glass);
  lantern.add(mesh(geo("story-lantern-cap", () => new ConeGeometry(0.08, 0.08, 10)), toon(C.charcoal), 0, 0.23, 0));
  const handle = mesh(geo("story-lantern-handle", () => new TorusGeometry(0.05, 0.01, 4, 10, Math.PI)), toon(C.charcoal), 0, 0.27, 0);
  lantern.add(handle);
  lantern.userData.live = true;
  ctx.light(x - h + 0.3, 1.75, z - h + 0.25, "#ffc870", 2.4, 5.5, 0.85, 61, false);
  ctx.animate((_dt, time) => lit.color.set("#ffc870").multiplyScalar(0.35 + flicker(time, 61, 0.85) * 0.65));
  // Pancarte sur la face sud (face à la caméra).
  signBoard(g, "POSTE D'ENTRÉE", x, 0.6, z + h + 0.05, 1.1, 0.22, 0, { bg: C.cream, fg: C.charcoal, border: C.mustard });
}

function entrance(ctx: DecorContext): void {
  const g = new Group();
  ctx.root.add(g);
  bigDoor(ctx);
  sheet(g, "poster_rule", STORY_PROPS.poster_rule.x, STORY_PROPS.poster_rule.y, STORY_PROPS.poster_rule.z, 0.58, 0.8, 0, "paper", 0.03);
  guardBooth(ctx, g);

  // Parvis de vieilles dalles fendues, de la terre et de l'herbe entre elles ; la marelle s'arrête à la case 4.
  const r = rng(2401);
  const slabs: [number, number, number, number, number][] = [
    [-2.35, 23.8, 1.45, 1.0, 0.05], [-0.65, 23.85, 1.5, 1.05, -0.03], [0.95, 23.75, 1.4, 0.95, 0.04],
    [-1.55, 25.0, 1.3, 1.05, -0.06], [0.25, 25.05, 1.55, 1.1, 0.02], [-0.4, 26.15, 1.2, 0.9, 0.1],
    [STORY_PROPS.hopscotch.x, STORY_PROPS.hopscotch.z, 1.05, 1.95, 0],
  ];
  for (const [sx, sz, sw, sd, yaw] of slabs) {
    const slab = block(g, sw, 0.022, sd, r() > 0.5 ? "#a29b88" : "#968f7c", sx, 0, sz, 0.008);
    slab.rotation.y = yaw;
    for (let k = 0; k < 2; k++) grass(g, sx + (r() - 0.5) * sw, sz + (r() > 0.5 ? 1 : -1) * (sd / 2 + 0.05), 0.3 + r() * 0.2);
  }
  const { hopscotch } = STORY_PROPS;
  flat(g, "hopscotch", hopscotch.x, hopscotch.z, 0.9, 1.8, 0, "chalk", 0.026);
  ball(g, "#8b8574", hopscotch.x - 0.08, 0.04, hopscotch.z - 0.42, 0.055, 0.035, 0.045);
  const stub = barX(g, 0.02, 0.08, "#f4efe2", hopscotch.x + 0.32, 0.042, hopscotch.z - 0.75, 6);
  stub.rotation.y = 0.6;

  // Porte de service : dalle, craie de Lila, petits pas qui sortent ; panneau sur piquet.
  block(g, 1.5, 0.022, 2.2, "#968f7c", -9.4, 0, 27.0, 0.008);
  const { service_chalk } = STORY_PROPS;
  flat(g, "service_chalk", service_chalk.x, service_chalk.z, 1.3, 0.65, 0, "chalk", 0.026);
  block(g, 0.1, 1.4, 0.1, C.woodDark, -9.6, 0, 29.65, 0.02);
  panel(g, centerArrowTexture("SERVICE", "left", C.cream), -9.6, 1.25, 29.71, 1.0, 0.31, 0);
  // Les pas d'enfant partent du seuil, traversent la place et filent vers les épaves (aucun ne revient).
  const path: [number, number][] = [[-10.85, 27.3], [-6.4, 27.75], [-3.0, 29.0], [-0.5, 31.9], [1.6, 35.4], [7, 35.7], [13, 35.3], [19.5, 35.7], [26, 35.7], [30.5, 33.6], [34.2, 31.4], [37.6, 30.0], [39.4, 29.4]];
  const pr = rng(2402);
  for (let s = 0; s + 1 < path.length; s++) {
    const [ax, az] = path[s], [bx, bz] = path[s + 1];
    const length = Math.hypot(bx - ax, bz - az);
    for (let t = 0.8; t + 0.8 <= length; t += 1.9 + pr() * 0.6) {
      if (s > 1 && pr() < 0.3) continue;
      const k = t / length;
      const onPad = ax + (bx - ax) * k < -8.6;
      flat(g, "kidprints", ax + (bx - ax) * k + (pr() - 0.5) * 0.15, az + (bz - az) * k, 0.46, 1.75, heading(bx - ax, bz - az), "chalk", onPad ? 0.026 : 0.02);
    }
  }
  bakeStatic(g);
}

function exteriorZone(ctx: DecorContext): void {
  const g = new Group();
  ctx.root.add(g);
  // La lanterne de Lila, sur un capot tombé d'épave, à côté de la ferraille qu'elle avait rangée.
  const { lila_lantern: at } = STORY_PROPS;
  const hood = block(g, 1.1, 0.06, 0.78, "#b8644e", at.x, 0, at.z, 0.03);
  hood.rotation.set(0.06, 0.4, 0.03);
  ball(g, PALETTE.rust, at.x + 0.3, 0.07, at.z + 0.1, 0.18, 0.02, 0.12);
  const lantern = place(g, at.x - 0.15, at.z - 0.05, 0.3, 0.07);
  lantern.rotation.z = 0.12;
  lantern.scale.setScalar(1.7);
  cylinder(lantern, 0.075, 0.04, C.charcoal, 0, 0, 0, 10);
  lantern.add(mesh(geo("story-lantern-glass", () => new CylinderGeometry(0.055, 0.055, 0.15, 10)), toon("#f3f1e6"), 0, 0.11, 0));
  for (let i = 0; i < 3; i++) cylinder(lantern, 0.008, 0.15, C.charcoal, Math.cos(i * 2.1) * 0.062, 0.04, Math.sin(i * 2.1) * 0.062, 4);
  lantern.add(mesh(geo("story-lantern-cap", () => new ConeGeometry(0.08, 0.08, 10)), toon(C.mustard), 0, 0.23, 0));
  lantern.add(mesh(geo("story-lantern-handle", () => new TorusGeometry(0.05, 0.01, 4, 10, Math.PI)), toon(C.charcoal), 0, 0.27, 0));
  bakeStatic(g);
}

// ——— Centre : sécurité, hub, couloir nord ———

function security(ctx: DecorContext): void {
  const g = new Group();
  ctx.root.add(g);
  // Registre ouvert sur le bureau de Bérard ; le stylo a roulé par terre.
  const reg = STORY_PROPS.security_register;
  const cover = block(g, 0.56, 0.02, 0.38, "#5a3d24", reg.x, 0.86, reg.z, 0.005);
  cover.rotation.y = 0.15;
  flat(g, "register", reg.x, reg.z, 0.54, 0.35, 0.15, "paper", 0.885);
  const pen = barX(g, 0.012, 0.15, "#2a3a5a", -1.62, 0.012, 12.3, 6);
  pen.rotation.y = 0.8;
  // Moitié de consigne punaisée au comptoir de contrôle.
  const shed = STORY_PROPS.note_shed_right;
  sheet(g, "shed_right", shed.x, shed.y, shed.z, 0.26, 0.32, 0, "paper", -0.05);
  ball(g, PALETTE.danger, shed.x + 0.02, shed.y + 0.15, shed.z + 0.01, 0.02);
  // Terminal de Bérard sur une petite table, post-it collé à l'écran.
  const t = STORY_PROPS.terminal;
  block(g, 1.05, 0.06, 0.6, C.wood, t.x, 0.72, t.z, 0.02);
  for (const [lx, lz] of [[-0.46, -0.24], [0.46, -0.24], [-0.46, 0.24], [0.46, 0.24]]) block(g, 0.05, 0.72, 0.05, C.woodDark, t.x + lx, 0, t.z + lz, 0.01);
  block(g, 0.5, 0.42, 0.44, C.cream, t.x, 0.78, t.z - 0.06, 0.08);
  block(g, 0.4, 0.04, 0.16, C.creamDark, t.x, 0.78, t.z + 0.22, 0.01);
  sheet(g, "terminal_screen", t.x, 1.0, t.z + 0.165, 0.38, 0.29, 0, "screen");
  sheet(g, "postit_terminal", t.x + 0.2, 1.15, t.z + 0.175, 0.12, 0.12, 0, "paper", 0.12);
  cylinder(g, 0.035, 0.45, C.charcoal, t.x - 0.1, 0, t.z + 0.55, 6);
  cylinder(g, 0.17, 0.05, C.olive, t.x - 0.1, 0.45, t.z + 0.55, 12);
  solid(ctx, t.x, t.z, 1.1, 0.65);
  // Calendrier : jours barrés jusqu'à l'orage.
  const cal = STORY_PROPS.calendar;
  sheet(g, "calendar", cal.x, cal.y, cal.z, 0.42, 0.47, 0, "paper", -0.04);
  // Piles vides près de la borne (il n'en reste plus de pleines).
  const r = rng(2501);
  for (let i = 0; i < 5; i++) deadBattery(g, 3.1 + r() * 0.5, 0, 12.2 + r() * 0.4, r() * 3);
  bakeStatic(g);
}

function hub(ctx: DecorContext): void {
  const g = new Group();
  ctx.root.add(g);
  // L'avis officiel, bien droit au milieu du panneau des mots.
  const notice = STORY_PROPS.poster_notice;
  sheet(g, "poster_notice", notice.x, notice.y, notice.z, 0.56, 0.76);
  for (const dx of [-0.24, 0.24]) ball(g, "#c8453a", notice.x + dx, notice.y + 0.35, notice.z + 0.01, 0.02);
  // Valises en file autour de l'estrade, vers la porte nord : on est parti vite, on a tout laissé.
  const colors = [C.mustard, C.olive, C.brick, C.teal, C.leatherLight, C.cream];
  const r = rng(2601);
  const angles = [100, 116, 150, 166, 181, 196, 212, 228, 244, 259];
  angles.forEach((deg, i) => {
    const a = (deg * Math.PI) / 180;
    const x = Math.cos(a) * 3.45, z = Math.sin(a) * 3.45;
    const yaw = -a + (r() - 0.5) * 0.4;
    const kind = i % 3;
    if (kind === 0) suitcase(g, x, z, yaw, colors[i % colors.length]);
    else if (kind === 1) duffel(g, x, z, yaw, colors[(i + 2) % colors.length]);
    else bundle(g, x, z, yaw);
    if (r() < 0.35) suitcase(g, x + 0.05, z, yaw + 0.2, colors[(i + 3) % colors.length], 0.24);
  });
  for (const [x, z, kind] of [[-0.45, -4.4, 0], [-0.65, -5.6, 1], [0.6, -6.3, 2]] as const) {
    if (kind === 0) suitcase(g, x, z, 1.4, C.olive);
    else if (kind === 1) duffel(g, x, z, 1.6, C.brick);
    else bundle(g, x, z, 0.3);
  }
  // Une valise sur le côté, ouverte : vêtements, et une photo de groupe retournée.
  const os = STORY_PROPS.open_suitcase;
  const open = suitcase(g, os.x, os.z, 0.5, C.mustard);
  const lid = block(open, 0.62, 0.05, 0.42, "#b8862a", 0, 0.08, -0.42, 0.03);
  lid.rotation.x = -1.35;
  block(open, 0.28, 0.06, 0.3, C.cream, -0.12, 0.22, 0.02, 0.03);
  block(open, 0.24, 0.05, 0.28, C.teal, 0.16, 0.2, -0.03, 0.03).rotation.y = 0.3;
  block(g, 0.4, 0.05, 0.22, C.brick, os.x + 0.55, 0, os.z + 0.35, 0.02).rotation.y = 1.1;
  flat(g, "photo_back", os.x + 0.25, os.z + 0.55, 0.22, 0.17, 0.5, "paper", 0.012);
  bakeStatic(g);
}

function north(ctx: DecorContext): void {
  const g = new Group();
  ctx.root.add(g);
  // Deux roues, dans le sens de la descente (les chevrons pointent vers l'escalier).
  flat(g, "cart_tracks", 0.95, -10.7, 0.62, 6.4, 0, "chalk", 0.022);
  flat(g, "cart_tracks", 0.92, -16.25, 0.62, 4.6, 0, "chalk", 0.022);
  duffel(g, -1.35, -8.7, 1.5, C.olive);
  suitcase(g, -1.2, -10.9, 1.7, C.brick);
  bakeStatic(g);
}

// ——— Aile ouest ———

function generator(ctx: DecorContext): void {
  const g = new Group();
  ctx.root.add(g);
  // La chaise de Marceau, tournée vers son moteur, et sa gamelle.
  const at = STORY_PROPS.marceau_chair;
  chair(g, at.x, at.z, 0);
  block(g, 0.3, 0.03, 0.22, "#c9b48a", at.x - 0.04, 0.47, at.z + 0.05, 0.01).rotation.y = 0.5;
  const tin = place(g, at.x + 0.5, at.z + 0.45, 0.4);
  const pot = cylinder(tin, 0.1, 0.06, "#b9c0c2", 0, 0, 0, 14);
  pot.scale.set(1.35, 1, 0.85);
  const lid = cylinder(tin, 0.1, 0.012, "#a9b2ad", 0.06, 0.07, 0.1, 14);
  lid.scale.set(1.35, 1, 0.85);
  lid.rotation.x = 0.35;
  barX(tin, 0.008, 0.16, "#a9b2ad", -0.12, 0.012, 0.08, 4).rotation.y = 0.5;
  // Moitié de consigne au pupitre ; craie à moitié effacée au mur.
  const shed = STORY_PROPS.note_shed_left;
  sheet(g, "shed_left", shed.x, shed.y, shed.z, 0.26, 0.32, 0, "paper", 0.06);
  const dc = STORY_PROPS.shed_chalk;
  sheet(g, "dcic", dc.x, dc.y, dc.z, 0.8, 0.3, 0, "chalk", -0.03);
  bakeStatic(g);
}

function cafeteria(ctx: DecorContext): void {
  const g = new Group();
  ctx.root.add(g);
  // La chambre froide : un gros caisson isolé, sa porte face à la salle.
  // Recul de 2 m depuis le mur sud : sa porte et ce qu'on a posé devant restent visibles de la caméra.
  const cx = -30.4, cz = 15.95, w = 2.9, d = 3.5, h = 2.2;
  block(g, w, h, d, "#dfe3dc", cx, 0, cz, 0.06);
  block(g, w + 0.04, 0.16, d + 0.04, PALETTE.steelDark, cx, 0, cz, 0.02);
  block(g, w + 0.06, 0.07, d + 0.06, C.teal, cx, h, cz, 0.02);
  for (let i = 1; i < 4; i++) block(g, 0.025, h - 0.3, 0.02, "#b9c0bb", cx - w / 2 + i * (w / 4), 0.16, cz + d / 2 + 0.005, 0.005);
  // Groupe froid sur le toit : ventilateur et tuyaux.
  block(g, 0.9, 0.42, 0.6, PALETTE.steel, cx + 0.5, h + 0.05, cz - 0.6, 0.05);
  const fan = mesh(geo("story-fan", () => new CylinderGeometry(0.22, 0.22, 0.03, 16)), toon(C.charcoal), cx + 0.5, h + 0.48, cz - 0.6);
  g.add(fan);
  barX(g, 0.04, 1.3, PALETTE.steelDark, cx - 0.4, h + 0.12, cz - 0.6, 8);
  // Porte : charnières, levier, fente pour passer les choses (Cuisine n'ouvre pas, ou sur la chaîne).
  const door = STORY_PROPS.cold_room_door;
  const front = cz + d / 2;
  block(g, 1.06, 1.9, 0.08, "#56767d", door.x, 0.05, front + 0.04, 0.04);
  for (const y of [0.4, 1.6]) block(g, 0.08, 0.18, 0.1, C.charcoal, door.x - 0.5, y, front + 0.06, 0.02);
  block(g, 0.08, 0.16, 0.08, C.charcoal, door.x + 0.38, 0.95, front + 0.11, 0.02);
  barX(g, 0.03, 0.34, C.steel, door.x + 0.26, 1.12, front + 0.16, 8);
  block(g, 0.34, 0.06, 0.02, C.charcoal, door.x, 0.98, front + 0.085, 0.01);
  sheet(g, "cold_label", cx, 2.0, front + 0.006, 1.2, 0.3);
  const tally = STORY_PROPS.cook_tally;
  sheet(g, "tally", tally.x, tally.y, tally.z, 0.66, 0.41, 0, "chalk", 0.04);
  solid(ctx, cx, cz, w + 0.05, d + 0.12);
  // Plateaux vides empilés devant la porte (le commis en apporte encore), boîtes de pêches vides.
  const r = rng(2701);
  const t0 = STORY_PROPS.tray_stack;
  const stacks: [number, number, number][] = [[t0.x, t0.z, 7], [t0.x + 0.55, t0.z + 0.2, 3], [t0.x - 0.62, t0.z + 0.25, 1]];
  for (const [sx, sz, n] of stacks) {
    for (let i = 0; i < n; i++) {
      const t = block(g, 0.42, 0.03, 0.3, i % 2 ? C.teal : C.tray, sx + (r() - 0.5) * 0.06, i * 0.032, sz + (r() - 0.5) * 0.05, 0.01);
      t.rotation.y = (r() - 0.5) * 0.35;
    }
  }
  cylinder(g, 0.09, 0.02, C.cream, t0.x - 0.62, 0.03, t0.z + 0.25, 12);
  for (let i = 0; i < 6; i++) {
    const fallen = i > 3;
    const can = cylinder(g, 0.06, 0.13, i % 2 ? C.mustard : "#c9b06a", t0.x + 0.75 + (r() - 0.5) * 0.5, fallen ? -0.005 : 0, t0.z - 0.1 + (r() - 0.5) * 0.4, 10);
    if (fallen) { can.rotation.set(0, r() * 3, Math.PI / 2); can.position.y = 0.06; }
  }
  // Barricade poussée de côté : une table renversée sur le flanc, pieds en l'air, et des tabourets.
  const bar = STORY_PROPS.cook_barricade;
  const table = place(g, bar.x, bar.z, 0.08);
  block(table, 2.0, 0.9, 0.08, C.wood, 0, 0, 0, 0.03);
  for (const lx of [-0.9, 0.9]) for (const ly of [0.1, 0.8]) block(table, 0.08, 0.08, 0.7, C.woodDark, lx, ly - 0.04, 0.39, 0.02);
  for (let i = 0; i < 3; i++) {
    const st = place(g, bar.x - 0.6 + i * 0.6, bar.z + 0.45 + (i % 2) * 0.2, r() * 3);
    if (i === 1) { st.rotation.set(0, r() * 3, Math.PI); st.position.y = 0.52; }
    else st.rotation.z = 0.25 * (i - 1);
    cylinder(st, 0.035, 0.44, C.charcoal, 0, 0, 0, 6);
    cylinder(st, 0.18, 0.07, i % 2 ? C.mustard : C.brick, 0, 0.44, 0, 12);
  }
  solid(ctx, bar.x, bar.z + 0.3, 2.1, 0.8);
  // Post-it de Cuisine sur le chariot de plateaux.
  const post = STORY_PROPS.note_cook_postit;
  flat(g, "postit_cook", post.x, post.z, 0.14, 0.14, 0.3, "paper", post.y);
  bakeStatic(g);
}

function storage(ctx: DecorContext): void {
  const g = new Group();
  ctx.root.add(g);
  // L'armoire à piles : chaîne entre les poignées, cadenas à six molettes de lettres.
  const at = STORY_PROPS.battery_locker;
  block(g, 1.25, 1.95, 0.55, "#5d6b62", at.x, 0, at.z, 0.05);
  block(g, 1.28, 0.07, 0.58, C.mustard, at.x, 1.95, at.z, 0.02);
  const front = at.z + 0.275;
  block(g, 0.02, 1.7, 0.02, C.charcoal, at.x, 0.12, front + 0.005, 0.005);
  for (const s of [-1, 1]) block(g, 0.05, 0.3, 0.06, C.steel, at.x + s * 0.1, 0.85, front + 0.03, 0.02);
  sheet(g, "piles_label", at.x, 1.6, front + 0.006, 0.8, 0.3);
  for (let i = 0; i < 6; i++) {
    const link = mesh(geo("story-link", () => new TorusGeometry(0.045, 0.014, 5, 10)), toon(C.steel), at.x - 0.17 + i * 0.068, 0.98 - Math.sin((i / 5) * Math.PI) * 0.07, front + 0.07);
    link.rotation.y = i % 2 ? Math.PI / 2 : 0;
    g.add(link);
  }
  block(g, 0.3, 0.17, 0.08, C.brass, at.x, 0.72, front + 0.08, 0.03);
  for (let i = 0; i < 6; i++) barX(g, 0.022, 0.035, i % 2 ? C.charcoal : "#5a4a3a", at.x - 0.11 + i * 0.044, 0.8, front + 0.13, 8).rotation.set(Math.PI / 2, 0, Math.PI / 2);
  const shackle = mesh(geo("story-shackle-big", () => new TorusGeometry(0.07, 0.016, 6, 12, Math.PI)), toon(C.steel), at.x, 0.89, front + 0.08);
  g.add(shackle);
  solid(ctx, at.x, at.z, 1.3, 0.6);
  // À côté, le panier à piles vide, retourné ; deux piles mortes ont roulé.
  const b = STORY_PROPS.battery_basket;
  const basket = place(g, b.x, b.z, 0.3);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    cylinder(basket, 0.008, 0.22, "#a9b2ad", Math.cos(a) * 0.2, 0, Math.sin(a) * 0.15, 4);
  }
  for (const y of [0.01, 0.22]) {
    const rim = mesh(geo("story-basket-rim", () => new TorusGeometry(0.2, 0.012, 4, 16)), toon("#a9b2ad"), 0, y, 0);
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(1, 0.75, 1);
    basket.add(rim);
  }
  block(basket, 0.4, 0.015, 0.3, "#8f978c", 0, 0.215, 0, 0.005);
  deadBattery(g, b.x + 0.4, 0, b.z + 0.1, 0.8);
  deadBattery(g, b.x - 0.3, 0, b.z + 0.35, 2.1);
  // Le mot de Cuisine, au mur.
  const note = STORY_PROPS.cook_piles_note;
  sheet(g, "cook_piles", note.x, note.y, note.z, 0.36, 0.42, 0, "paper", 0.06);
  ball(g, "#d8322a", note.x, note.y + 0.19, note.z + 0.01, 0.025);
  bakeStatic(g);
  // Ampoule nue qui se balance au-dessus des étagères.
  const pivot = place(ctx.root, -21.5, 0.6, 0, 2.55);
  pivot.userData.live = true;
  const cord = mesh(geo("story-cord", () => new CylinderGeometry(0.008, 0.008, 0.35, 4)), toon(C.charcoal), 0, -0.175, 0, false);
  pivot.add(cord);
  pivot.add(mesh(geo("story-bulb", () => new SphereGeometry(0.07, 10, 8)), glow("#ffe6b0"), 0, -0.4, 0, false));
  ctx.animate((_dt, time) => {
    pivot.rotation.z = Math.sin(time * 1.3) * 0.22;
    pivot.rotation.x = Math.sin(time * 0.9 + 1) * 0.08;
  });
}

function dorms(ctx: DecorContext): void {
  const g = new Group();
  ctx.root.add(g);
  // Le lit de Lila, le seul défait : couverture qui glisse, petit oreiller de travers, un papier dessous.
  const at = STORY_PROPS.lila_bed;
  const bed = place(g, at.x, at.z, 0);
  for (const [lx, lz] of [[-0.72, -0.36], [0.72, -0.36], [-0.72, 0.36], [0.72, 0.36]]) block(bed, 0.06, 0.32, 0.06, C.teal, lx, 0, lz, 0.02);
  block(bed, 1.55, 0.06, 0.8, C.teal, 0, 0.26, 0, 0.02);
  block(bed, 0.06, 0.55, 0.8, C.teal, -0.75, 0.26, 0, 0.02);
  block(bed, 1.45, 0.12, 0.72, PALETTE.mattress, 0, 0.32, 0, 0.05);
  const blanket = block(bed, 0.9, 0.06, 0.78, "#ffffff", 0.25, 0.42, 0.18, 0.03);
  blanket.material = toon("#ffffff", { map: westKnitTexture(C.mustard, C.brick) });
  blanket.rotation.set(0.25, 0.35, 0.05);
  const fold = block(bed, 0.7, 0.32, 0.05, "#ffffff", 0.35, 0.08, 0.47, 0.02);
  fold.material = blanket.material;
  fold.rotation.set(0.15, 0.2, 0);
  const list = STORY_PROPS.note_lila_3;
  flat(bed, "lila_list3", list.x - at.x + 0.05, list.z - at.z + 0.08, 0.16, 0.2, 0.9, "paper", 0.45);
  const pillow = block(bed, 0.3, 0.1, 0.42, C.cream, -0.48, 0.44, -0.05, 0.05);
  pillow.rotation.y = 0.55;
  solid(ctx, at.x, at.z, 1.6, 0.85);
  bakeStatic(g);
}

function secretRoom(ctx: DecorContext): void {
  const g = new Group();
  ctx.root.add(g);
  // Cabane en couverture : deux couvertures sur une corde tendue entre deux bâtons, ouverte au sud.
  const at = STORY_PROPS.lila_cabin;
  const len = 2.1;
  for (const s of [-1, 1]) cylinder(g, 0.03, 1.05, C.woodDark, at.x, 0, at.z + s * (len / 2 - 0.05), 6);
  const ridge = barX(g, 0.012, len + 0.2, C.cream, at.x, 1.0, at.z, 4);
  ridge.rotation.set(0, Math.PI / 2, Math.PI / 2);
  for (const s of [-1, 1]) {
    const pivot = place(g, at.x, at.z, 0, 1.0);
    pivot.rotation.z = s * 0.64;
    const cloth = block(pivot, 0.04, 1.25, len, "#ffffff", 0, -1.25, 0, 0.02);
    cloth.material = toon("#ffffff", { map: westKnitTexture(s < 0 ? C.olive : C.mustard, s < 0 ? C.cream : C.brick), side: DoubleSide });
  }
  // Dedans : natte, sac de couchage, petit oreiller au fond ; des livres devant l'entrée.
  block(g, 0.85, 0.04, len - 0.1, C.oliveDark, at.x, 0, at.z, 0.02);
  const bag = block(g, 0.7, 0.12, 1.4, "#ffffff", at.x, 0.04, at.z + 0.15, 0.05);
  bag.material = toon("#ffffff", { map: westKnitTexture(C.brick, C.cream) });
  block(g, 0.45, 0.12, 0.3, C.cream, at.x, 0.04, at.z - 0.75, 0.05).rotation.y = 0.2;
  for (let i = 0; i < 3; i++) block(g, 0.3 - i * 0.03, 0.06, 0.22, [C.teal, C.mustard, C.brick][i], at.x + 0.75, i * 0.06, at.z + 1.0, 0.015).rotation.y = i * 0.25;
  solid(ctx, at.x, at.z, 1.5, len);

  // Dessins d'enfant et le grand dessin du silo, au mur nord.
  const draw = STORY_PROPS.lila_drawing;
  sheet(g, "lila_drawing", draw.x, draw.y, draw.z, 0.6, 0.75, 0, "paper", 0.04);
  panel(g, drawingTexture(), draw.x + 0.75, 1.18, draw.z, 0.4, 0.31, 0).rotation.z = -0.1;
  panel(g, drawingTexture(), draw.x - 0.72, 0.92, draw.z, 0.36, 0.28, 0).rotation.z = 0.12;
  // Boîte à chaussures aux trésors, couvercle posé à côté.
  const box = STORY_PROPS.shoebox;
  block(g, 0.36, 0.13, 0.22, "#c49a64", box.x, 0, box.z, 0.015);
  block(g, 0.38, 0.03, 0.24, "#b38652", box.x + 0.32, 0, box.z + 0.1, 0.01).rotation.y = 0.4;
  for (const [dx, dz, c] of [[-0.08, -0.03, "#6de0ce"], [0.0, 0.04, C.mustard], [0.09, -0.02, "#c8453a"]] as const) ball(g, c, box.x + dx, 0.13, box.z + dz, 0.035);
  block(g, 0.16, 0.01, 0.11, C.cream, box.x + 0.05, 0.135, box.z + 0.03, 0.003).rotation.y = 0.5;
  bakeStatic(g);
  // La dernière veilleuse : une lueur faible qui tient encore.
  const n = STORY_PROPS.nightlight;
  const lamp = place(ctx.root, n.x, n.z);
  lamp.userData.live = true;
  cylinder(lamp, 0.07, 0.05, C.cream, 0, 0, 0, 12);
  const glowMat = new MeshBasicMaterial({ color: "#ffe2a0" });
  lamp.add(mesh(geo("story-moon", () => new SphereGeometry(0.07, 10, 8)), glowMat, 0, 0.12, 0, false));
  ctx.light(n.x, 0.45, n.z + 0.15, "#ffd890", 1.4, 3.2, 0.5, 63, false);
  ctx.animate((_dt, time) => glowMat.color.set("#ffe2a0").multiplyScalar(0.55 + flicker(time, 63, 0.5) * 0.45));
}

// ——— Aile est ———

function infirmary(ctx: DecorContext): void {
  const g = new Group();
  ctx.root.add(g);
  // Plan de l'infirmerie au mur nord.
  const map = STORY_PROPS.note_infirmary_map;
  sheet(g, "infirmary_map", map.x, map.y, map.z, 0.62, 0.47, 0, "paper", -0.03);
  // Bureau du Dr Okafor : tiroir fermé, lampe UV, panier à piles vide (une liste au fond).
  const dr = STORY_PROPS.okafor_drawer;
  block(g, 0.5, 0.26, 0.62, C.leatherLight, dr.x, 0.5, 3.4, 0.02);
  block(g, 0.3, 0.04, 0.02, C.cream, dr.x, 0.62, dr.z - 0.005, 0.01);
  ball(g, C.brass, dr.x + 0.18, 0.62, dr.z + 0.005, 0.02);
  const uv = STORY_PROPS.uv_lamp;
  const torch = barX(g, 0.035, 0.24, C.oliveDark, uv.x, uv.y, uv.z, 10);
  torch.rotation.y = 0.5;
  const lens = barX(g, 0.045, 0.03, "#8a5ae0", uv.x + Math.cos(0.5) * 0.13, uv.y, uv.z - Math.sin(0.5) * 0.13, 12);
  lens.rotation.y = 0.5;
  lens.material = toon("#8a5ae0", { emissive: "#5a2aa0", emissiveIntensity: 0.4 });
  const b = STORY_PROPS.note_lila_2;
  const basket = place(g, b.x, b.z, 0.2);
  block(basket, 0.36, 0.015, 0.26, "#8f978c", 0, 0, 0, 0.005);
  for (const [w, d, ox, oz] of [[0.36, 0.015, 0, -0.125], [0.36, 0.015, 0, 0.125], [0.015, 0.26, -0.175, 0], [0.015, 0.26, 0.175, 0]] as const) block(basket, w, 0.16, d, "#a9b2ad", ox, 0, oz, 0.004);
  flat(basket, "lila_list2", 0, 0, 0.16, 0.2, 0.4, "paper", 0.03);
  // Raclures : l'armoire a été poussée et remise en place, encore et encore.
  const sc = STORY_PROPS.cabinet_scrapes;
  flat(g, "scrapes", sc.x, sc.z, 0.5, 2.6, 0, "chalk", 0.014);
  room1(ctx, g);
  bakeStatic(g);
}

/** La chambre 1, derrière l'armoire : un lit à sangles, deux lampes neuves, une lampe de chevet vide, un plateau propre. */
function room1(ctx: DecorContext, g: Group): void {
  const x0 = 18.6, x1 = 21.85, z0 = 4.6, z1 = 7.85, H = 1.6;
  const wallPaint = "#9cbfae", upper = "#e9e2cc";
  // Cloisons coupées comme les autres murets (maison de poupée) ; au sud et à l'est, les murs de l'infirmerie.
  const wall = (cx: number, cz: number, w: number, d: number) => {
    block(g, w, 0.78, d, wallPaint, cx, 0, cz, 0.01);
    block(g, w, H - 0.78, d, upper, cx, 0.78, cz, 0.01);
    block(g, w + 0.04, 0.06, d + 0.04, "#c98f55", cx, H - 0.03, cz, 0.02);
  };
  const doorZ = STORY_PROPS.room1_door.z;
  wall(x0, (z0 + doorZ - 0.48) / 2, 0.12, doorZ - 0.48 - z0);
  wall(x0, (doorZ + 0.48 + z1) / 2, 0.12, z1 - doorZ - 0.48);
  wall((x0 + x1) / 2, z0, x1 - x0 + 0.12, 0.12);
  solid(ctx, x0, (z0 + z1) / 2, 0.2, z1 - z0);
  solid(ctx, (x0 + x1) / 2, z0, x1 - x0, 0.2);
  // Porte électrique (côté infirmerie) et sa serrure, voyant mort.
  block(g, 0.06, 1.52, 0.9, "#a9b8b0", x0 - 0.03, 0.03, doorZ, 0.02);
  block(g, 0.06, 0.22, 0.14, C.charcoal, x0 - 0.09, 0.95, doorZ + 0.3, 0.02);
  ball(g, "#4a1a14", x0 - 0.125, 1.11, doorZ + 0.3, 0.018);
  // Lit d'hôpital, sangles défaites qui pendent.
  const bed = STORY_PROPS.room1_bed;
  const b = place(g, bed.x, bed.z);
  for (const [lx, lz] of [[-0.42, -0.95], [0.42, -0.95], [-0.42, 0.95], [0.42, 0.95]]) block(b, 0.05, 0.45, 0.05, "#a9b2ad", lx, 0, lz, 0.015);
  block(b, 0.92, 0.06, 2.0, "#a9b2ad", 0, 0.42, 0, 0.02);
  block(b, 0.86, 0.12, 1.92, C.cream, 0, 0.48, 0, 0.05);
  block(b, 0.92, 0.5, 0.06, "#a9b2ad", 0, 0.42, -1.0, 0.02);
  block(b, 0.55, 0.1, 0.3, "#f4ecd6", 0, 0.6, -0.72, 0.05);
  block(b, 0.84, 0.08, 0.5, "#9aa67c", 0, 0.58, 0.7, 0.03);
  for (const z of [-0.35, 0.15, 0.6]) {
    block(b, 0.96, 0.02, 0.09, C.leather, 0, 0.605, z, 0.008);
    for (const s of [-1, 1]) {
      const end = block(b, 0.02, 0.32, 0.09, C.leather, s * 0.49, 0.3, z + s * 0.03, 0.006);
      end.rotation.z = s * 0.15;
    }
    block(b, 0.06, 0.03, 0.06, C.brass, 0.3, 0.615, z, 0.01);
  }
  // Deux lampes neuves au plafond, juste sous la fente, et leurs piles (vides) au mur.
  const lamps = STORY_PROPS.room1_lamps;
  for (const dz of [-0.55, 0.55]) {
    cylinder(g, 0.008, 0.12, C.charcoal, lamps.x, H - 0.1, lamps.z + dz, 4);
    const shade = mesh(geo("story-shade", () => new ConeGeometry(0.2, 0.16, 14, 1, true)), toon("#f4f4ee", { side: DoubleSide }), lamps.x, H - 0.17, lamps.z + dz);
    g.add(shade);
    ball(g, "#fbf6dc", lamps.x, H - 0.27, lamps.z + dz, 0.07);
  }
  block(g, 0.5, 0.3, 0.12, C.olive, 19.6, 1.0, z0 + 0.12, 0.03);
  for (let i = 0; i < 4; i++) block(g, 0.08, 0.2, 0.02, C.charcoal, 19.42 + i * 0.12, 1.05, z0 + 0.185, 0.005);
  barX(g, 0.012, 1.3, C.charcoal, 20.35, 1.28, z0 + 0.13, 4);
  solid(ctx, bed.x, bed.z, 0.95, 2.05);
  solid(ctx, STORY_PROPS.room1_bedside_lamp.x, STORY_PROPS.room1_bedside_lamp.z, 0.45, 0.4);
  // Seau de piles vides et quelques-unes par terre.
  const bat = STORY_PROPS.room1_batteries;

  cylinder(g, 0.17, 0.3, PALETTE.steel, bat.x, 0, bat.z, 12);
  const r = rng(2801);
  for (let i = 0; i < 6; i++) deadBattery(g, bat.x - 0.05 + (r() - 0.5) * 0.2, 0.26 + i * 0.012, bat.z + (r() - 0.5) * 0.2, r() * 3);
  for (let i = 0; i < 5; i++) deadBattery(g, bat.x + 0.2 + r() * 0.8, 0, bat.z + 0.1 + r() * 0.5, r() * 3);
  // Table de chevet : la lampe a perdu son ampoule (un éclat vert reste dans la douille).
  const bl = STORY_PROPS.room1_bedside_lamp;
  block(g, 0.42, 0.5, 0.38, C.creamDark, bl.x, 0, bl.z, 0.03);
  cylinder(g, 0.08, 0.03, C.charcoal, bl.x, 0.5, bl.z, 12);
  cylinder(g, 0.015, 0.22, C.charcoal, bl.x, 0.53, bl.z, 6);
  cylinder(g, 0.035, 0.05, "#5a5550", bl.x, 0.75, bl.z, 8);
  block(g, 0.03, 0.025, 0.015, "#5fd08a", bl.x + 0.02, 0.8, bl.z, 0.004).material = glow("#5fd08a");
  // Une chaise tournée vers le lit : quelqu'un venait s'asseoir là.
  chair(g, 19.95, 6.35, Math.PI, C.leatherLight);
  // Plateau propre près de la porte ; dossier au pied du lit.
  const tr = STORY_PROPS.room1_tray;
  block(g, 0.42, 0.03, 0.3, C.tray, tr.x, 0, tr.z, 0.01).rotation.y = 0.2;
  cylinder(g, 0.09, 0.02, "#f4f4ee", tr.x - 0.06, 0.03, tr.z, 12);
  cylinder(g, 0.04, 0.07, "#f4f4ee", tr.x + 0.12, 0.03, tr.z - 0.06, 10);
  const file = STORY_PROPS.note_room1_file;
  flat(g, "room1_file", file.x, file.z, 0.24, 0.3, 0.25, "paper", file.y);
  // Plafond : une fente au-dessus des lampes. Groupe à part, qu'on pourra lever à l'ouverture.
  const ceiling = new Group();
  ceiling.userData.live = true;
  ctx.root.add(ceiling);
  const top = new Group();
  ceiling.add(top);
  // Planches clouées par-dessus (pièce « condamnée »), une fente plus large au-dessus des deux lampes.
  const planks = new Group();
  top.add(planks);
  const pr = rng(2802);
  for (let x = x0 - 0.06; x < x1 + 0.12; x += 0.36) {
    if (Math.abs(x + 0.16 - lamps.x) < 0.2) continue;
    const plank = block(planks, 0.32, 0.05, z1 - z0 + 0.3 + (pr() - 0.5) * 0.2, pr() > 0.5 ? C.wood : "#8a5a34", x + 0.16, H + 0.01, (z0 + z1) / 2 + (pr() - 0.5) * 0.1, 0.01);
    plank.rotation.y = (pr() - 0.5) * 0.03;
    for (const dz of [-1.5, 0, 1.5]) ball(planks, "#5a5550", x + 0.16, H + 0.065, (z0 + z1) / 2 + dz, 0.018);
  }
  for (const dz of [-1.2, 1.1]) block(top, x1 - x0 + 0.3, 0.05, 0.16, "#7a4a2a", (x0 + x1) / 2, H + 0.06, (z0 + z1) / 2 + dz, 0.01);
  bakeInto(ceiling, top);

  keep("room1_ceiling", ceiling);
  // L'armoire devant la porte (groupe à part : on la fera glisser).
  const cab = STORY_PROPS.room1_cabinet;
  const armoire = place(ctx.root, cab.x, cab.z, -Math.PI / 2);
  armoire.userData.live = true;
  const inner = new Group();
  armoire.add(inner);
  block(inner, 1.15, 2.0, 0.55, C.cream, 0, 0, 0, 0.05);
  block(inner, 1.19, 0.08, 0.59, C.creamDark, 0, 2.0, 0, 0.02);
  block(inner, 0.02, 1.8, 0.02, C.charcoal, 0, 0.1, 0.28, 0.005);
  for (const s of [-1, 1]) block(inner, 0.04, 0.2, 0.05, C.steel, s * 0.08, 1.0, 0.3, 0.01);
  panel(inner, centerNoteTexture("Ne pas\ndéplacer", 3), 0.3, 1.5, 0.281, 0.24, 0.28, 0);
  bakeInto(armoire, inner);
  keep("room1_cabinet", armoire);
  solid(ctx, cab.x, cab.z, 0.6, 1.2);
}

function workshop(ctx: DecorContext): void {
  const g = new Group();
  ctx.root.add(g);
  // Casier de Marceau : outils rangés au millimètre, nom à demi arraché, tiroir du bas cadenassé.
  const at = STORY_PROPS.marceau_locker;
  block(g, 0.85, 1.95, 0.5, C.oliveDark, at.x, 0, at.z, 0.04);
  const front = at.z + 0.25;
  sheet(g, "tool_board", at.x, 1.3, front + 0.005, 0.72, 1.08);
  block(g, 0.78, 0.5, 0.02, C.olive, at.x, 0.1, front + 0.01, 0.01);
  block(g, 0.2, 0.03, 0.03, C.steel, at.x, 0.52, front + 0.03, 0.01);
  block(g, 0.08, 0.1, 0.04, C.brass, at.x + 0.25, 0.4, front + 0.04, 0.015);
  sheet(g, "nameplate", at.x - 0.08, 1.88, front + 0.006, 0.36, 0.12);
  // Porte du haut grande ouverte.
  const hinge = place(g, at.x - 0.42, front, -1.9);
  block(hinge, 0.82, 1.15, 0.03, C.oliveDark, 0.41, 0.72, 0.015, 0.01);
  for (let i = 0; i < 3; i++) block(hinge, 0.4, 0.025, 0.01, C.charcoal, 0.41, 1.6 + i * 0.06, 0.035, 0.004);
  block(g, 0.09, 0.012, 0.05, "#c9ccc6", at.x + 0.55, 0, at.z + 0.75, 0.003).rotation.y = 0.6;
  solid(ctx, at.x, at.z, 0.9, 0.55);
  bakeStatic(g);
}

function control(ctx: DecorContext): void {
  const g = new Group();
  ctx.root.add(g);
  // Le fauteuil de l'opératrice, repoussé loin de la console, tourné de travers.
  const ch = STORY_PROPS.operator_chair;
  const seat = place(g, ch.x, ch.z, 2.4);
  for (let i = 0; i < 5; i++) {
    const leg = block(seat, 0.05, 0.04, 0.3, C.charcoal, Math.sin((i / 5) * Math.PI * 2) * 0.13, 0.04, Math.cos((i / 5) * Math.PI * 2) * 0.13, 0.015);
    leg.rotation.y = (i / 5) * Math.PI * 2;
  }
  cylinder(seat, 0.03, 0.38, C.charcoal, 0, 0.06, 0, 8);
  block(seat, 0.5, 0.12, 0.48, "#3f6f6a", 0, 0.42, 0, 0.05);
  block(seat, 0.46, 0.55, 0.1, "#2f5552", 0, 0.56, -0.22, 0.05);
  // Tasse pleine (café froid) et cahier de relève ouvert sur la console.
  const mug = STORY_PROPS.operator_mug;
  cylinder(g, 0.05, 0.1, C.cream, mug.x, 1.08, mug.z, 10);
  cylinder(g, 0.044, 0.01, "#3a2414", mug.x, 1.17, mug.z, 10);
  const handle = mesh(geo("story-mug-handle", () => new TorusGeometry(0.03, 0.01, 4, 8)), toon(C.cream), mug.x + 0.055, 1.13, mug.z, false);
  g.add(handle);
  const lb = STORY_PROPS.note_radio_logbook;
  block(g, 0.46, 0.015, 0.3, "#3f6f6a", lb.x, 1.08, lb.z, 0.005).rotation.y = -0.1;
  flat(g, "logbook", lb.x, lb.z, 0.44, 0.29, -0.1, "paper", 1.097);
  // Le local technique : cloisons, porte fermée, interphone ; plafond à part.
  // Un peu en retrait de l'angle (26, −18) : le mordu de la salle y passe encore dans sa ronde.
  const x0 = 26.6, x1 = 29.85, z0 = -21.85, z1 = -18.55, H = 1.6, doorX = STORY_PROPS.operator_door.x;
  const paint = "#3f6b68", upper = "#c9c2a8";
  // Cloisons coupées comme les autres murets ; plafond de tôle à part (on le lèvera pour la voir dedans).
  const wall = (cx: number, cz: number, w: number, d: number) => {
    block(g, w, 0.78, d, paint, cx, 0, cz, 0.01);
    block(g, w, H - 0.78, d, upper, cx, 0.78, cz, 0.01);
    block(g, w + 0.04, 0.06, d + 0.04, "#c98f55", cx, H - 0.03, cz, 0.02);
  };
  wall(x0, (z0 + z1) / 2, 0.12, z1 - z0);
  wall((x0 + doorX - 0.47) / 2, z1, doorX - 0.47 - x0, 0.12);
  wall((doorX + 0.47 + x1) / 2, z1, x1 - doorX - 0.47, 0.12);
  solid(ctx, x0, (z0 + z1) / 2, 0.2, z1 - z0);
  solid(ctx, (x0 + x1) / 2, z1, x1 - x0, 0.2);
  block(g, 0.9, 1.52, 0.07, "#4f6650", doorX, 0.02, z1, 0.02);
  block(g, 0.08, 0.16, 0.06, C.steel, doorX + 0.32, 0.8, z1 + 0.06, 0.02);
  block(g, 0.26, 0.34, 0.06, C.charcoal, doorX + 0.75, 0.95, z1 + 0.08, 0.03);
  const grille = mesh(geo("story-intercom", () => new CylinderGeometry(0.07, 0.07, 0.02, 12)), toon("#5a5550"), doorX + 0.75, 1.17, z1 + 0.115);
  grille.rotation.x = Math.PI / 2;
  g.add(grille);
  ball(g, "#4a1a14", doorX + 0.75, 1.02, z1 + 0.115, 0.018);
  signBoard(g, "LOCAL TECHNIQUE", doorX, 1.32, z1 + 0.04, 0.7, 0.14, 0, { bg: C.cream, fg: "#2f5552" });
  sheet(g, "toc", doorX - 0.08, 0.42, z1 + 0.04, 0.62, 0.31, 0, "chalk", 0.05);
  // Devant la porte, ce que Lila a laissé : un thermos et une couverture pliée.
  const th = STORY_PROPS.lila_thermos;
  cylinder(g, 0.07, 0.3, "#c8453a", th.x, 0, th.z, 12);
  cylinder(g, 0.075, 0.07, C.cream, th.x, 0.3, th.z, 12);
  const blanket = block(g, 0.5, 0.12, 0.36, "#ffffff", th.x + 0.45, 0, th.z + 0.08, 0.04);
  blanket.material = toon("#ffffff", { map: westKnitTexture(C.teal, C.cream) });
  blanket.rotation.y = 0.2;
  // Dedans (sous le plafond) : tabouret, étagère de pièces, caisse.
  cylinder(g, 0.035, 0.45, C.charcoal, 28.0, 0, -20.2, 6);
  cylinder(g, 0.17, 0.05, C.leather, 28.0, 0.45, -20.2, 12);
  block(g, 0.4, 1.3, 1.6, PALETTE.steelDark, 29.5, 0, -20.4, 0.03);

  block(g, 0.6, 0.45, 0.45, C.wood, 27.2, 0, -21.2, 0.03);

  const ceiling = new Group();
  ceiling.userData.live = true;
  ctx.root.add(ceiling);
  const inner = new Group();
  ceiling.add(inner);
  block(inner, x1 - x0 + 0.2, 0.06, z1 - z0 + 0.2, "#8d969a", (x0 + x1) / 2, H + 0.01, (z0 + z1) / 2, 0.01);
  for (let i = 0; i < 6; i++) block(inner, 0.03, 0.03, z1 - z0 + 0.1, "#6f787c", x0 + 0.3 + i * 0.6, H + 0.07, (z0 + z1) / 2, 0.005);
  block(inner, 0.5, 0.06, 0.5, C.charcoal, x0 + 1.1, H + 0.07, z0 + 1.0, 0.02);
  for (let i = 0; i < 2; i++) barX(inner, 0.05, x1 - x0, i ? C.mustard : PALETTE.steelDark, (x0 + x1) / 2, H + 0.15, z0 + 0.6 + i * 0.25, 8);

  bakeInto(ceiling, inner);
  keep("local_ceiling", ceiling);
  bakeStatic(g);
  // La lueur verte qui passe sous la porte, puis s'éteint (la lampe de l'opératrice).
  const pool = glowPool(ctx.root, doorX, z1 + 0.42, 1.3, 0.8, "#6dff8a", 0.2);
  const line = mesh(geo("story-glow-line", () => new PlaneGeometry(0.84, 0.05)), new MeshBasicMaterial({ color: "#8fffa8", transparent: true, opacity: 0.8 }), doorX, 0.04, z1 + 0.05, false);
  line.userData.live = true;
  ctx.root.add(line);
  keep("operator_glow", line);
  ctx.light(doorX, 0.35, z1 + 0.5, "#6dff8a", 1.3, 3.2, 0.35, 64, false);
  ctx.animate((_dt, time) => {
    const t = (Math.sin(time * 0.7) + Math.sin(time * 0.23 + 1.3)) * 0.5;
    const level = Math.min(1, Math.max(0, (t + 0.2) * 1.4)) * (0.85 + Math.sin(time * 13) * 0.05);
    pool.opacity = 0.05 + level * 0.32;
    (line.material as MeshBasicMaterial).opacity = 0.15 + level * 0.75;
  });
}

function greenhouse(ctx: DecorContext): void {
  const g = new Group();
  ctx.root.add(g);
  // Petit arrosoir d'enfant rouge près de la seule rangée encore arrosée ; terre mouillée.
  const can = STORY_PROPS.lila_watering_can;
  const w = place(g, can.x, can.z, 0.8);
  cylinder(w, 0.08, 0.16, "#c8453a", 0, 0, 0, 12);
  const spout = mesh(geo("story-spout", () => new CylinderGeometry(0.012, 0.02, 0.2, 6)), toon("#c8453a"), 0.13, 0.13, 0);
  spout.rotation.z = -0.9;
  w.add(spout);
  w.add(mesh(geo("story-can-handle", () => new TorusGeometry(0.06, 0.012, 4, 10, Math.PI)), toon("#c8453a"), -0.01, 0.16, 0));
  ball(g, "#4a3220", STORY_PROPS.greenhouse_row.x - 0.75, 0.01, STORY_PROPS.greenhouse_row.z, 0.4, 0.01, 1.3);
  // Liste de Lila n° 4, tenue par un caillou.
  const note = STORY_PROPS.note_lila_4;
  flat(g, "lila_list4", note.x, note.z, 0.22, 0.28, 0.4, "paper", 0.025);
  ball(g, "#8b8574", note.x + 0.03, 0.04, note.z - 0.05, 0.06, 0.035, 0.05);
  bakeStatic(g);
}

// ——— Point d'entrée ———

/** Pose la narration par le décor d'un secteur (appelée à la fin de chaque decorate*). */
export function decorateStory(ctx: DecorContext, sector: "exterior" | "center" | "west" | "east"): void {
  if (sector === "exterior") {
    entrance(ctx);
    exteriorZone(ctx);
  } else if (sector === "center") {
    security(ctx);
    hub(ctx);
    north(ctx);
  } else if (sector === "west") {
    generator(ctx);
    cafeteria(ctx);
    storage(ctx);
    dorms(ctx);
    secretRoom(ctx);
  } else {
    handles.clear();
    infirmary(ctx);
    workshop(ctx);
    control(ctx);
    greenhouse(ctx);
  }
}
