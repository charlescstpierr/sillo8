// Construction 3D du silo : sols, murets coupés à mi-hauteur, portes, décor post-apocalyptique,
// objets interactifs, lumières qui grésillent, poussière dans les faisceaux.
import {
  AdditiveBlending, BufferAttribute, Color, BufferGeometry, DoubleSide, Euler, Group, Matrix4, Mesh, MeshBasicMaterial,
  MeshToonMaterial, PlaneGeometry, PointLight, Points, PointsMaterial, BoxGeometry, Quaternion, SphereGeometry, CylinderGeometry,
  TorusGeometry, Vector3, type Material, type Scene, type Texture,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  DOORS, INTERACTABLES, ROOMS, WALL_HEIGHT, WALL_THICKNESS, buildWalls, doorBox, roomAt, wallBox,
  type Door, type InteractableDef, type Room, type RoomId,
} from "../level";
import { doorOpen, interactableAvailable } from "../rules";
import type { SiloState } from "../state";
import { CENTER_MODELS, decorateCenter } from "./sectors/center";
import { EAST_MODELS, decorateEast } from "./sectors/east";
import { EXTERIOR_MODELS, decorateExterior } from "./sectors/exterior";
import { WEST_MODELS, decorateWest } from "./sectors/west";
import type { Box } from "../collision";
import { glow, toon, toonGradient } from "./toon";
import { PALETTE } from "./palette";
import {
  beamTexture, concreteTexture, concreteFloorTexture, crackTexture, dirtGroundTexture, grateTexture, dirtTexture, paperTexture, dustTexture, liftTexture, macroNoiseTexture, rng, roomMaskTexture, signTexture, tilesTexture,
} from "./textures";
import {
  StaticBatch, block, can, cylinder, decal, grass, hazardStrip, mesh, panel, rubble, setStaticSink,
} from "./props";
import { addHighlight, type Highlight } from "./highlight";
import { COMFORT } from "../comfort";

export interface InteractableView {
  def: InteractableDef;
  group: Group;
  highlight: Highlight;
  /** Hauteur de l'infobulle au-dessus du sol. */
  tooltipHeight: number;
}

interface Flicker {
  x: number; y: number; z: number;
  color: string;
  distance: number;
  base: number;
  seed: number;
  /** 0 = stable, 1 = grésille beaucoup. */
  nervous: number;
  bulb?: Mesh;
  level: number;
}

/** Nombre de lampes ponctuelles réellement allumées : les plus proches du joueur prennent les places. */
export const LIGHT_POOL = 6;

/** Outils fournis aux modules de décor de chaque secteur (render/sectors/*). */
export interface DecorContext {
  root: Group;
  /** Obstacles solides du décor (boîtes alignées sur les axes). */
  colliders: Box[];
  /** Lampe ponctuelle qui peut grésiller (nervous 0 → 1). `fixture` ajoute une ampoule visible. */
  light(x: number, y: number, z: number, color: string, intensity: number, distance: number, nervous: number, seed: number, fixture?: boolean): void;
  /** Faisceau poussiéreux vertical sous une lampe. */
  beam(x: number, top: number, z: number, radius: number, color: string): void;
  /** Point d'émission de poussière flottante (au plus ~4 par secteur). */
  dust(x: number, y: number, z: number): void;
  /** Animation de décor appelée à chaque image (temps en secondes, position du joueur). */
  animate(fn: (dt: number, time: number, playerX: number, playerZ: number) => void): void;
}

export type ModelBuilder = (def: InteractableDef) => { group: Group; height: number };

export interface WorldView {
  root: Group;
  /** Murs, décor solide et portes encore fermées. Recalculé par refresh(). */
  colliders: Box[];
  interactables: Map<string, InteractableView>;
  /** Met à jour portes, relais, cœur et objets ramassés selon l'état (port de SiloWorld.refresh). */
  refresh(state: SiloState): void;
  update(dt: number, time: number, playerX: number, playerZ: number): void;
  /** Coupure brève de toutes les lampes (événement « colosse »). */
  shudder(): void;
  setLowQuality(low: boolean): void;
}

/** Lot du décor statique en cours de construction (null hors de buildWorld). */
let batch: StaticBatch | null = null;

// ——— Sols ———

interface FloorLook {
  texture: () => Texture;
  /** Mètres couverts par une répétition de la texture. */
  size: number;
  /** Décalage aléatoire par bloc, en fractions de texture (0 = fondu de deux échelles, pour la terre). */
  offset: number;
  /** Cases par répétition pour la variation de teinte case à case, et son amplitude. */
  cells: number;
  jitter: number;
  mirror: boolean;
  /** Teinte de la salle, et teinte des grandes taches (multipliées). */
  tint: string;
  patch: string;
  /** Flaques (intérieur) ou herbe (terre). */
  wet: number;
  grime: number;
  grass?: boolean;
  /** Couleur multipliée dans les flaques (eau, huile). */
  puddle?: string;
}

const LOOKS: Record<RoomId, FloorLook> = (() => {
  const terrazzo = { texture: () => tilesTexture("terrazzo"), size: 2, offset: 4, cells: 4, jitter: 0.07, mirror: true };
  const concrete = { texture: concreteFloorTexture, size: 4, offset: 2, cells: 2, jitter: 0.08, mirror: true };
  const grate = { texture: grateTexture, size: 1, offset: 1, cells: 1, jitter: 0.1, mirror: false };
  const metal = { texture: liftTexture, size: 2, offset: 2, cells: 2, jitter: 0.08, mirror: true };
  const dirt = { texture: dirtGroundTexture, size: 3, offset: 0, cells: 1, jitter: 0, mirror: false, grass: true };
  return {
    plaza: { ...dirt, tint: "#fff4e4", patch: "#c79a68", wet: 0.35, grime: 0.5 },
    exterior: { ...dirt, tint: "#f6ead6", patch: "#b98e60", wet: 0.55, grime: 0.6 },
    greenhouse: { ...dirt, tint: "#a89c8c", patch: "#7a6a5a", wet: 0.75, grime: 0.6 },
    security: { ...terrazzo, tint: "#e2e2d6", patch: "#b4b49c", wet: 0.3, grime: 0.8 },
    control: { ...terrazzo, tint: "#c4d8d2", patch: "#98b0a8", wet: 0.2, grime: 0.7 },
    infirmary: { ...terrazzo, texture: () => tilesTexture("small"), offset: 8, cells: 8, jitter: 0.04, tint: "#f4f7ee", patch: "#d4dec8", wet: 0.3, grime: 0.6 },
    cafeteria: { ...terrazzo, texture: () => tilesTexture("checker"), offset: 2, mirror: false, tint: "#fff3df", patch: "#ddb67c", wet: 0.4, grime: 0.8 },
    dorms: { ...terrazzo, texture: () => tilesTexture("parquet"), offset: 8, cells: 8, jitter: 0.1, tint: "#efe4d2", patch: "#bfa080", wet: 0.15, grime: 0.7 },
    storage: { ...concrete, tint: "#fbf3e0", patch: "#c6b48a", wet: 0.3, grime: 0.9 },
    workshop: { ...concrete, tint: "#ebe3d0", patch: "#86705a", wet: 0.9, grime: 1.1, puddle: "#4a3e34" },
    west: { ...concrete, tint: "#e6e8d8", patch: "#bcc0a8", wet: 0.4, grime: 0.8 },
    east: { ...concrete, tint: "#e6e8d8", patch: "#bcc0a8", wet: 0.5, grime: 0.8 },
    secret: { ...concrete, tint: "#d6c8b2", patch: "#9e8462", wet: 0.2, grime: 1.2 },
    generator: { ...grate, tint: "#f0cfaa", patch: "#b0602e", wet: 0.6, grime: 1.0, puddle: "#4a3e34" },
    stairs: { ...grate, tint: "#c6d0d0", patch: "#8c9c9c", wet: 0.3, grime: 0.9 },
    hub: { ...metal, tint: "#f2efe2", patch: "#c8b48e", wet: 0.2, grime: 0.6 },
    north: { ...metal, tint: "#e8e8dc", patch: "#c0b08e", wet: 0.3, grime: 0.8 },
  };
})();

/** Densité du masque peint (pixels par mètre). */
const MASK_PX = 6;

/** Portes percées dans le bord d'une salle (pour l'usure et pour épargner les seuils). */
function roomDoors(room: Room): Door[] {
  return DOORS.filter((d) => d.rooms.includes(room.id));
}

/** Vrai si le point (x, z) d'un bord de salle tombe dans l'ouverture d'une porte. */
function inDoorway(x: number, z: number, margin = 0.1): boolean {
  return DOORS.some((d) => (d.axis === "x"
    ? Math.abs(z - d.z) < 0.05 && Math.abs(x - d.x) < d.width / 2 + margin
    : Math.abs(x - d.x) < 0.05 && Math.abs(z - d.z) < d.width / 2 + margin));
}

/**
 * Masque peint de la salle (voir roomMaskTexture) : usure claire entre les portes, crasse au pied des
 * murs et dans les coins, flaques (intérieur) ou plaques d'herbe (terre) qui évitent les chemins.
 */
function paintMask(room: Room, look: FloorLook): Texture {
  const w = room.x1 - room.x0, d = room.z1 - room.z0;
  return roomMaskTexture(room.id, Math.ceil(w * MASK_PX), Math.ceil(d * MASK_PX), (g) => {
    const r = rng(room.id.length * 131 + Math.round(room.x0 * 7 + room.z0 * 3) + 9);
    const px = (x: number) => (x - room.x0) * MASK_PX;
    const pz = (z: number) => (z - room.z0) * MASK_PX;
    const blob = (x: number, z: number, radius: number, channel: string, alpha: number, hold = 0) => {
      const grad = g.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), radius * MASK_PX);
      grad.addColorStop(0, channel.replace("A", String(alpha)));
      if (hold > 0) grad.addColorStop(hold, channel.replace("A", String(alpha)));
      grad.addColorStop(1, channel.replace("A", "0"));
      g.fillStyle = grad;
      g.beginPath(); g.arc(px(x), pz(z), radius * MASK_PX, 0, Math.PI * 2); g.fill();
    };
    const R = "rgba(255,0,0,A)", G = "rgba(0,255,0,A)", B = "rgba(0,0,255,A)";
    const cx = (room.x0 + room.x1) / 2, cz = (room.z0 + room.z1) / 2;
    const doors = roomDoors(room).filter((dr) => !dr.lock || dr.lock !== "secret");

    // Crasse au pied des murs : par pas de 0,5 m, sauf dans les portes et le long des bords tout extérieurs.
    const band = room.outdoor ? 1.6 : 0.9;
    const edge = (x: number, z: number, nx: number, nz: number) => {
      if (inDoorway(x, z)) return;
      const beyond = roomAt(x - nx * 0.4, z - nz * 0.4);
      if (room.outdoor && (!beyond || beyond.outdoor)) return;
      const grad = g.createLinearGradient(px(x), pz(z), px(x + nx * band), pz(z + nz * band));
      grad.addColorStop(0, G.replace("A", String(0.6 * look.grime)));
      grad.addColorStop(0.35, G.replace("A", String(0.25 * look.grime)));
      grad.addColorStop(1, G.replace("A", "0"));
      g.fillStyle = grad;
      const x0 = Math.min(x, x + nx * band) - (nz ? 0.26 : 0), z0 = Math.min(z, z + nz * band) - (nx ? 0.26 : 0);
      g.fillRect(px(x0), pz(z0), (Math.abs(nx * band) + (nz ? 0.52 : 0)) * MASK_PX, (Math.abs(nz * band) + (nx ? 0.52 : 0)) * MASK_PX);
    };
    for (let x = room.x0 + 0.25; x < room.x1; x += 0.5) { edge(x, room.z0, 0, 1); edge(x, room.z1, 0, -1); }
    for (let z = room.z0 + 0.25; z < room.z1; z += 0.5) { edge(room.x0, z, 1, 0); edge(room.x1, z, -1, 0); }
    if (!room.outdoor) for (const [x, z] of [[room.x0, room.z0], [room.x1, room.z0], [room.x0, room.z1], [room.x1, room.z1]]) blob(x, z, 1.4, G, 0.45 * look.grime);

    // Taches de crasse diffuses.
    const area = w * d;
    for (let i = 0; i < Math.round((area / 14) * look.grime); i++) {
      blob(room.x0 + r() * w, room.z0 + r() * d, 0.6 + r() * 1.4, G, 0.15 + r() * 0.2);
    }

    // Usure : passages doux de chaque porte vers le centre, et entre portes ; seuils très polis.
    g.lineCap = "round";
    const path = (ax: number, az: number, bx: number, bz: number, strength: number) => {
      const mx = (ax + bx) / 2 + (r() - 0.5) * 2, mz = (az + bz) / 2 + (r() - 0.5) * 2;
      for (const [width, alpha] of [[2.4, 0.07], [1.6, 0.09], [1.0, 0.11]]) {
        g.strokeStyle = R.replace("A", String(alpha * strength));
        g.lineWidth = width * MASK_PX;
        g.beginPath(); g.moveTo(px(ax), pz(az)); g.quadraticCurveTo(px(mx), pz(mz), px(bx), pz(bz)); g.stroke();
      }
    };
    const wearStrength = room.outdoor ? 2.2 : 1.6;
    for (const dr of doors) {
      // Point juste à l'intérieur de la salle.
      const inward = dr.axis === "x" ? [0, Math.sign(cz - dr.z) * 0.8] : [Math.sign(cx - dr.x) * 0.8, 0];
      const ix = dr.x + inward[0], iz = dr.z + inward[1];
      blob(dr.x, dr.z, Math.min(1.6, dr.width * 0.6), R, 0.55);
      if (!dr.open) path(ix, iz, cx + (r() - 0.5) * w * 0.2, cz + (r() - 0.5) * d * 0.2, wearStrength);
    }
    for (let i = 0; i + 1 < doors.length; i++) {
      const a = doors[i], b = doors[i + 1];
      if (!a.open && !b.open) path(a.x, a.z, b.x, b.z, wearStrength * 0.7);
    }

    if (look.grass) {
      // Herbe : grandes plaques douces, plus denses sur les bords extérieurs, jamais sur les chemins (shader).
      for (let i = 0; i < Math.round(area / 7); i++) blob(room.x0 + r() * w, room.z0 + r() * d, 1.2 + r() * 2.6, B, 0.25 + r() * 0.3);
      const rim = (x: number, z: number) => blob(x, z, 2.5 + r() * 2, B, 0.35 + r() * 0.25);
      for (let x = room.x0; x <= room.x1; x += 2) { rim(x, room.z0 + r()); rim(x, room.z1 - r()); }
      for (let z = room.z0; z <= room.z1; z += 2) { rim(room.x0 + r(), z); rim(room.x1 - r(), z); }
      // Quelques flaques de boue sombre (canal G).
      for (let i = 0; i < Math.round((area / 120) * look.wet) + 1; i++) blob(room.x0 + 2 + r() * (w - 4), room.z0 + 2 + r() * (d - 4), 0.7 + r() * 0.8, G, 0.35, 0.4);
    } else {
      // Flaques : grappes de disques à bord net, loin des murs.
      const count = Math.round((area / 45) * look.wet) + (look.wet > 0.25 ? 1 : 0);
      for (let i = 0; i < count; i++) {
        const x = room.x0 + 1.2 + r() * Math.max(0.1, w - 2.4), z = room.z0 + 1.2 + r() * Math.max(0.1, d - 2.4);
        const size = 0.35 + r() * 0.5;
        for (let k = 0; k < 4; k++) blob(x + (r() - 0.5) * size * 2, z + (r() - 0.5) * size * 1.4, size * (0.6 + r() * 0.6), B, 0.5, 0.55);
      }
    }
  });
}

const FLOOR_VERTEX = (shader: string) => shader
  .replace("#include <common>", "#include <common>\nvarying vec2 vFloorXZ;\nvarying vec2 vFloorUv;")
  .replace("#include <uv_vertex>", "#include <uv_vertex>\nvFloorUv = uv;")
  .replace("#include <project_vertex>", "#include <project_vertex>\nvFloorXZ = (modelMatrix * vec4(transformed, 1.0)).xz;");

// Échantillonne la texture en coordonnées monde, décale/retourne chaque bloc (casse le tampon répété),
// varie la teinte case par case, puis applique le masque peint de la salle (usure, crasse, flaques, herbe).
const FLOOR_FRAGMENT_HEAD = `
varying vec2 vFloorXZ;
varying vec2 vFloorUv;
uniform sampler2D floorMask;
uniform sampler2D floorMacro;
uniform vec3 floorTint;
uniform vec3 floorPatch;
uniform vec3 floorWet;
uniform vec3 floorGrassA;
uniform vec3 floorGrassB;
uniform vec4 floorA;
uniform vec4 floorB;
float floorHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}`;

const FLOOR_FRAGMENT_MAP = `
vec2 fUv = vFloorXZ / floorA.x;
vec4 fBase;
if (floorA.y > 0.5) {
  vec2 fBlock = floor(fUv);
  vec2 fIn = fract(fUv);
  float fH1 = floorHash(fBlock);
  float fH2 = floorHash(fBlock + 19.7);
  if (floorB.x > 0.5) {
    if (fH1 > 0.5) fIn.x = 1.0 - fIn.x;
    if (fH2 > 0.5) fIn.y = 1.0 - fIn.y;
  }
  fIn += floor(vec2(fH2, fH1) * floorA.y) / floorA.y;
  fBase = textureGrad(map, fIn, dFdx(fUv), dFdy(fUv));
  float fCell = floorHash(floor(fUv * floorA.z) + 3.1);
  fBase.rgb *= 1.0 + (fCell - 0.5) * floorA.w;
} else {
  vec2 fRot = vec2(fUv.x * 0.8 - fUv.y * 0.6, fUv.x * 0.6 + fUv.y * 0.8) * 0.47 + 0.31;
  fBase = mix(texture2D(map, fUv), texture2D(map, fRot), 0.45);
}
vec3 fNoise = vec3(texture2D(floorMacro, vFloorXZ * 0.035).r, texture2D(floorMacro, vFloorXZ * 0.09 + 0.37).g, texture2D(floorMacro, vFloorXZ * 0.21).b);
vec3 fCol = fBase.rgb * floorTint;
fCol *= 0.86 + 0.28 * fNoise.x;
fCol = mix(fCol, fCol * floorPatch, smoothstep(0.42, 0.72, fNoise.y) * 0.75);
vec3 fMask = texture2D(floorMask, vFloorUv).rgb;
float fLum = dot(fCol, vec3(0.299, 0.587, 0.114));
float fWear = clamp(fMask.r * (0.7 + 0.6 * fNoise.z), 0.0, 1.0);
fCol = mix(fCol, mix(fCol, vec3(fLum), 0.3) * 1.14, fWear * 0.85);
fCol *= 1.0 - clamp(fMask.g * (0.75 + 0.5 * fNoise.y), 0.0, 1.0) * 0.6;
if (floorB.y > 0.5) {
  float gv = fMask.b + (fNoise.y - 0.5) * 0.45 + (fNoise.z - 0.5) * 0.3 - fMask.r * 1.1;
  float gm = smoothstep(0.42, 0.52, gv);
  float gRim = smoothstep(0.28, 0.42, gv) * (1.0 - gm);
  fCol *= 1.0 - gRim * 0.2;
  vec3 gCol = mix(floorGrassB, floorGrassA, clamp(fNoise.x * 0.7 + fNoise.z * 0.5 - 0.2 + (fLum - 0.25) * 1.2, 0.0, 1.0));
  fCol = mix(fCol, gCol, gm);
} else {
  float wv = fMask.b + (fNoise.z - 0.5) * 0.25;
  float fWet = smoothstep(0.38, 0.46, wv);
  fCol = mix(fCol, fCol * floorWet, fWet * 0.85);
  fCol += vec3(0.08, 0.095, 0.1) * (smoothstep(0.5, 0.56, wv) - smoothstep(0.58, 0.72, wv));
}
diffuseColor.rgb *= fCol;
`;

function floorMaterial(room: Room, look: FloorLook): MeshToonMaterial {
  const material = new MeshToonMaterial({ color: "#ffffff", gradientMap: toonGradient(), map: look.texture() });
  const uniforms = {
    floorMask: { value: paintMask(room, look) },
    floorMacro: { value: macroNoiseTexture() },
    floorTint: { value: new Color(look.tint) },
    floorPatch: { value: new Color(look.patch) },
    floorWet: { value: new Color(look.puddle ?? "#6f8f9c") },
    floorGrassA: { value: new Color("#93a862") },
    floorGrassB: { value: new Color("#5a7440") },
    floorA: { value: [look.size, look.offset, look.cells, look.jitter] },
    floorB: { value: [look.mirror ? 1 : 0, look.grass ? 1 : 0, 0, 0] },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = FLOOR_VERTEX(shader.vertexShader);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + FLOOR_FRAGMENT_HEAD)
      .replace("#include <map_fragment>", FLOOR_FRAGMENT_MAP);
  };
  material.customProgramCacheKey = () => "silo-floor-1";
  return material;
}

function floor(root: Group, room: Room): void {
  const w = room.x1 - room.x0;
  const d = room.z1 - room.z0;
  // Un plan par salle (center.ts y perce la trémie de l'escalier) ; les UV de texture sont calculées dans le monde.
  const m = mesh(new PlaneGeometry(w, d), floorMaterial(room, LOOKS[room.id]), (room.x0 + room.x1) / 2, 0, (room.z0 + room.z1) / 2, false);
  m.rotation.x = -Math.PI / 2;
  root.add(m);
}

// ——— Murets (coupe de maison de poupée) ———

/** Peinture du soubassement côté salle, liseré, style de joints. */
interface WallSkin { paint: string; rail: string; style: "tile" | "metal" | "plank" | "plain"; }
const SKINS: Partial<Record<RoomId, WallSkin>> = {
  cafeteria: { paint: "#cf9d48", rail: "#efe2c4", style: "tile" },
  dorms: { paint: "#7d8a5a", rail: "#e6d6b0", style: "plank" },
  storage: { paint: "#86785a", rail: PALETTE.yellow, style: "plain" },
  generator: { paint: "#6b4f3a", rail: PALETTE.yellow, style: "metal" },
  security: { paint: "#5f7064", rail: PALETTE.yellow, style: "tile" },
  hub: { paint: "#4f5c60", rail: "#d8a43a", style: "metal" },
  north: { paint: "#4f5c60", rail: "#d8a43a", style: "metal" },
  stairs: { paint: "#4a5458", rail: PALETTE.yellow, style: "metal" },
  west: { paint: "#6d7a66", rail: PALETTE.yellow, style: "plain" },
  east: { paint: "#6d7a66", rail: PALETTE.yellow, style: "plain" },
  secret: { paint: "#6b5b49", rail: "#c9b48a", style: "plank" },
  control: { paint: "#3f6b68", rail: "#efe2c4", style: "metal" },
  infirmary: { paint: "#9cbfae", rail: "#f4ecd6", style: "tile" },
  workshop: { paint: "#9a6a3e", rail: PALETTE.yellow, style: "plain" },
  greenhouse: { paint: "#6f8a4a", rail: "#efe2c4", style: "plank" },
};

const PANEL_HEIGHT = 0.78;
const CAP_DARK = "#7a5232";
const POST = "#5b4a3a";

let wallBody: MeshToonMaterial | null = null;
let wallPaint: MeshToonMaterial | null = null;
/** Matériaux fusionnés des murets : béton texturé et peinture unie, teintés par couleur de sommet. */
function wallMaterials(): [MeshToonMaterial, MeshToonMaterial] {
  wallBody ??= new MeshToonMaterial({ color: "#ffffff", map: concreteTexture(), gradientMap: toonGradient(), vertexColors: true });
  wallPaint ??= new MeshToonMaterial({ color: "#ffffff", gradientMap: toonGradient(), vertexColors: true });
  return [wallBody, wallPaint];
}

const unitBox = new BoxGeometry(1, 1, 1);
const roundCache = new Map<string, BufferGeometry>();
const tmpMatrix = new Matrix4();
const tmpQuat = new Quaternion();
const tmpEuler = new Euler();
const tmpPos = new Vector3();
const tmpScale = new Vector3();
const tmpColor = new Color();

/**
 * Boîte statique fusionnée : centre (x, z), bas en y, lacet `yaw` (+ inclinaison facultative).
 * `rounded` : arrondi réel (géométrie mise en cache par dimensions) au lieu d'une boîte mise à l'échelle.
 */
function slab(material: Material, w: number, h: number, d: number, x: number, y: number, z: number, color: string, yaw = 0, options: { rounded?: number; tilt?: [number, number]; worldUv?: number; shadow?: boolean } = {}): void {
  if (!batch) return;
  tmpEuler.set(options.tilt?.[0] ?? 0, yaw, options.tilt?.[1] ?? 0);
  tmpQuat.setFromEuler(tmpEuler);
  let geometry: BufferGeometry = unitBox;
  if (options.rounded) {
    const key = `${w.toFixed(2)}:${h.toFixed(2)}:${d.toFixed(2)}:${options.rounded}`;
    geometry = roundCache.get(key) ?? new RoundedBoxGeometry(w, h, d, 1, Math.min(options.rounded, h / 2 - 0.001, d / 2 - 0.001));
    roundCache.set(key, geometry);
    tmpScale.set(1, 1, 1);
  } else tmpScale.set(w, h, d);
  tmpMatrix.compose(tmpPos.set(x, y + h / 2, z), tmpQuat, tmpScale);
  batch.add(geometry, tmpMatrix, material, { color: tmpColor.set(color), worldUv: options.worldUv, castShadow: options.shadow ?? true });
}

/** Légère variation d'une couleur (fait main). */
function vary(color: string, r: () => number, amount = 0.05): string {
  return "#" + tmpColor.set(color).offsetHSL(0, 0, (r() - 0.5) * amount).getHexString();
}

function wall(root: Group, x0: number, z0: number, x1: number, z1: number): void {
  const [body, paint] = wallMaterials();
  const T = WALL_THICKNESS;
  const length = Math.hypot(x1 - x0, z1 - z0) + T;
  if (length <= T + 0.01) return;
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const yaw = alongX ? 0 : Math.PI / 2;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const r = rng(Math.round(Math.abs(cx * 31 + cz * 17 + length * 7)) + 1);
  // Repère local : `u` le long du mur, `v` à travers.
  const at = (u: number, v = 0): [number, number] => (alongX ? [cx + u, cz + v] : [cx + v, cz + u]);
  const box = (material: Material, along: number, h: number, across: number, u: number, y: number, v: number, color: string, options: Parameters<typeof slab>[9] = {}) => {
    const [x, z] = at(u, v);
    slab(material, along, h, across, x, y, z, color, yaw, options);
  };

  // Le mur est découpé en tronçons : la plupart intacts, certains effondrés (béton ébréché, fer à béton).
  const pieces = Math.max(1, Math.round(length / 1.8));
  const piece = length / pieces;
  const broken: boolean[] = [];
  for (let i = 0; i < pieces; i++) {
    const u = -length / 2 + piece * (i + 0.5);
    const isBroken = pieces > 2 && r() < 0.3;
    broken.push(isBroken);
    const height = isBroken ? 0.85 + r() * 0.4 : WALL_HEIGHT;
    box(body, piece + 0.002, height, T, u, 0, 0, vary("#ffffff", r, 0.06), { worldUv: 2.5 });
    if (!isBroken) continue;
    // Sommet déchiqueté : blocs de béton inclinés + tiges de fer à béton tordues.
    for (let k = 0; k < 4; k++) {
      box(paint, 0.22 + r() * 0.25, 0.18 + r() * 0.2, T * (0.7 + r() * 0.3), u + (r() - 0.5) * piece * 0.9, height - 0.04, (r() - 0.5) * 0.1, r() > 0.5 ? PALETTE.concrete : PALETTE.concreteDark, { tilt: [r() - 0.5, r() - 0.5] });
    }
    // Arête cassée : bord clair du béton à vif.
    box(paint, piece * 0.9, 0.04, T + 0.02, u, height - 0.02, 0, "#c4c8b4");
    for (let k = 0; k < 3; k++) {
      const [bx, bz] = at(u + (r() - 0.5) * piece * 0.8);
      const rod = mesh(new CylinderGeometry(0.018, 0.018, 0.5 + r() * 0.5, 5), toon(PALETTE.rust), bx, height + 0.2, bz);
      rod.rotation.set((r() - 0.5) * 0.9, 0, (r() - 0.5) * 0.9);
      root.add(rod);
      batch?.absorb(rod);
    }
    // Gravats tombés de part et d'autre.
    for (const side of [-1, 1]) {
      const [gx, gz] = at(u, side * (T / 2 + 0.35));
      rubble(root, gx, gz, 5, Math.floor(r() * 1000), 0.35);
    }
  }

  // Tranche colorée arrondie (coupe de la maison de poupée) par suite de tronçons intacts, liseré sombre dessous.
  let start = -1;
  for (let i = 0; i <= pieces; i++) {
    if (i < pieces && !broken[i]) { if (start < 0) start = i; continue; }
    if (start < 0) continue;
    const runLength = (i - start) * piece;
    const u = -length / 2 + piece * start + runLength / 2;
    box(paint, runLength + 0.03, 0.035, T + 0.07, u, WALL_HEIGHT - 0.04, 0, CAP_DARK);
    box(paint, runLength + 0.04, 0.1, T + 0.1, u, WALL_HEIGHT - 0.01, 0, vary(PALETTE.wallCap, r, 0.06), { rounded: 0.035 });
    // Éclats dans la tranche.
    const chips = Math.floor(r() * (runLength / 2.5 + 1));
    for (let k = 0; k < chips; k++) {
      const side = r() > 0.5 ? 1 : -1;
      box(paint, 0.18 + r() * 0.2, 0.08, 0.06, u + (r() - 0.5) * runLength * 0.8, WALL_HEIGHT - 0.0, side * (T / 2 + 0.03), PALETTE.concreteDark, { tilt: [0.25 * side, 0.2] });
    }
    start = -1;
  }

  // Soubassement peint de chaque côté (couleur de la salle), liseré, plinthe, joints ou rivets.
  for (const side of [-1, 1]) {
    const [sx, sz] = at(0, side * 0.45);
    const room = roomAt(sx, sz);
    const facing = side * (T / 2);
    const runLength = length - T * 0.5;
    if (!room || room.outdoor) {
      // Façade : socle de béton sombre, mousse au pied.
      box(paint, runLength, 0.32, 0.05, 0, 0, facing + side * 0.025, "#5e594b");
      continue;
    }
    const skin = SKINS[room.id] ?? { paint: PALETTE.wainscot, rail: PALETTE.yellow, style: "plain" as const };
    box(paint, runLength, PANEL_HEIGHT, 0.035, 0, 0, facing + side * 0.0175, vary(skin.paint, r, 0.03));
    box(paint, runLength, 0.05, 0.055, 0, PANEL_HEIGHT - 0.03, facing + side * 0.0275, skin.rail);
    box(paint, runLength, 0.13, 0.055, 0, 0, facing + side * 0.0275, "#3b3029");
    const spacing = { tile: 0.6, metal: 1.0, plank: 0.32, plain: 1.6 }[skin.style];
    const seam = "#" + tmpColor.set(skin.paint).multiplyScalar(0.72).getHexString();
    const count = Math.floor(runLength / spacing);
    for (let k = 1; k < count; k++) {
      const u = -runLength / 2 + k * (runLength / count);
      box(paint, skin.style === "plank" ? 0.015 : 0.025, PANEL_HEIGHT - 0.2, 0.012, u, 0.14, facing + side * 0.04, seam, { shadow: false });
      if (skin.style === "metal") {
        for (const y of [0.22, PANEL_HEIGHT - 0.14]) for (const du of [-0.07, 0.07]) {
          box(paint, 0.04, 0.04, 0.02, u + du, y, facing + side * 0.042, "#a8b0ae", { shadow: false });
        }
      }
    }
  }
}

/** Montant d'angle là où les murets se rejoignent (et aux extrémités libres). */
function cornerPost(x: number, z: number, seed: number): void {
  const [, paint] = wallMaterials();
  const r = rng(seed);
  const s = WALL_THICKNESS + 0.12;
  slab(paint, s, WALL_HEIGHT - 0.02, s, x, 0, z, POST);
  slab(paint, s + 0.02, 0.035, s + 0.02, x, WALL_HEIGHT - 0.05, z, CAP_DARK);
  slab(paint, s + 0.06, 0.12, s + 0.06, x, WALL_HEIGHT - 0.02, z, vary("#b5793f", r, 0.05), 0, { rounded: 0.04 });
  // Bande jaune usée à hauteur de chariot.
  slab(paint, s + 0.012, 0.08, s + 0.012, x, 0.42, z, "#d9a83a", 0, { shadow: false });
}

/** Extrémités des murets intérieurs, sans les montants de porte (déjà encadrés). */
function postsFor(walls: { x0: number; z0: number; x1: number; z1: number; outdoor: boolean }[]): [number, number][] {
  const points: [number, number][] = [];
  const jamb = (x: number, z: number) => DOORS.some((d) => !d.open && (d.axis === "x"
    ? Math.abs(z - d.z) < 0.05 && Math.abs(Math.abs(x - d.x) - d.width / 2) < 0.1
    : Math.abs(x - d.x) < 0.05 && Math.abs(Math.abs(z - d.z) - d.width / 2) < 0.1));
  for (const w of walls) {
    if (w.outdoor) continue;
    for (const [x, z] of [[w.x0, w.z0], [w.x1, w.z1]]) {
      if (jamb(x, z) || points.some(([px, pz]) => Math.abs(px - x) < 0.05 && Math.abs(pz - z) < 0.05)) continue;
      points.push([x, z]);
    }
  }
  return points;
}

interface LockView { door: Door; group: Group; open: boolean; box: Box; }

/** Bord de zone extérieure : rochers arrondis et herbes au lieu d'un mur. */
function outdoorEdge(root: Group, x0: number, z0: number, x1: number, z1: number): void {
  const length = Math.hypot(x1 - x0, z1 - z0);
  const r = rng(Math.round(Math.abs(x0 * 13 + z0 * 7 + length)) + 3);
  const count = Math.max(2, Math.round(length / 1.4));
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const x = x0 + (x1 - x0) * t + (r() - 0.5) * 0.5;
    const z = z0 + (z1 - z0) * t + (r() - 0.5) * 0.5;
    const size = 0.6 + r() * 0.8;
    // Pas de rocher devant une porte ni contre une façade de bâtiment.
    if (DOORS.some((d) => !d.open && Math.hypot(d.x - x, d.z - z) < d.width / 2 + 2.2)) continue;
    if (z0 === z1 && z0 === 22 && x > -11 && x < 12) continue;
    const rock = mesh(new SphereGeometry(1, 7, 5), toon(r() > 0.5 ? "#8b8574" : "#7a7465"), x, size * 0.45, z);
    rock.scale.set(size, size * (0.7 + r() * 0.5), size * (0.8 + r() * 0.4));
    rock.rotation.y = r() * 3;
    root.add(rock);
    batch?.absorb(rock);
    // Petit galet et touffes au pied, pour fondre le rocher dans l'herbe.
    if (r() < 0.6) {
      const pebble = mesh(new SphereGeometry(1, 6, 4), toon("#968f7c"), x + (r() - 0.5) * size * 2, 0.08, z + (r() - 0.5) * size * 2);
      pebble.scale.set(0.22, 0.14, 0.18);
      root.add(pebble);
      batch?.absorb(pebble);
    }
    if (r() < 0.7) grass(root, x + (r() - 0.5) * 1.2, z + (r() - 0.5) * 1.2, 0.45 + r() * 0.35);
    if (r() < 0.4) grass(root, x + (r() - 0.5) * 1.6, z + (r() - 0.5) * 1.6, 0.35 + r() * 0.25);
  }
}

/** Seuil de porte : plaque d'acier striée, rails de porte coulissante, rivets, bandes de danger de chaque côté. */
function threshold(root: Group, door: Door): void {
  const [, paint] = wallMaterials();
  const yaw = door.axis === "x" ? 0 : Math.PI / 2;
  const along = door.width + 0.3;
  const across = WALL_THICKNESS + 0.8;
  const at = (u: number, v: number): [number, number] => (door.axis === "x" ? [door.x + u, door.z + v] : [door.x + v, door.z + u]);
  slab(paint, along + 0.08, 0.018, across + 0.08, door.x, 0, door.z, "#3e4447", yaw, { shadow: false });
  slab(paint, along, 0.03, across, door.x, 0, door.z, "#8e9799", yaw, { rounded: 0.012, shadow: false });
  for (const v of [-0.09, 0.09]) {
    const [x, z] = at(0, v);
    slab(paint, along - 0.1, 0.012, 0.04, x, 0.028, z, "#2e2925", yaw, { shadow: false });
  }
  for (const u of [-along / 2 + 0.08, along / 2 - 0.08]) for (const v of [-across / 2 + 0.08, across / 2 - 0.08]) {
    const [x, z] = at(u, v);
    slab(paint, 0.05, 0.02, 0.05, x, 0.026, z, "#b9c1bf", yaw, { shadow: false });
  }
  for (const side of [-1, 1]) {
    const [x, z] = at(0, side * (across / 2 + 0.16));
    hazardStrip(root, x, z, door.width, 0.2, door.axis === "x" ? 0 : Math.PI / 2);
  }
}

function doorFrame(root: Group, index: number, locks: LockView[]): void {
  const door = DOORS[index];
  if (door.open) return;
  if (door.lock === "secret") return lockedDoor(root, door, locks);
  const [, paint] = wallMaterials();
  const half = door.width / 2;
  const yaw = door.axis === "x" ? 0 : Math.PI / 2;
  for (const side of [-1, 1]) {
    const x = door.axis === "x" ? door.x + side * (half + 0.12) : door.x;
    const z = door.axis === "x" ? door.z : door.z + side * (half + 0.12);
    slab(paint, 0.3, 2.1, 0.42, x, 0, z, PALETTE.steelDark, yaw, { rounded: 0.05 });
    slab(paint, 0.32, 0.1, 0.44, x, 1.7, z, PALETTE.yellow, yaw, { rounded: 0.02 });
    slab(paint, 0.36, 0.08, 0.48, x, 2.1, z, PALETTE.wallCap, yaw, { rounded: 0.03 });
    // Butée de porte, bandes jaunes et noires en bas du montant.
    slab(paint, 0.32, 0.22, 0.44, x, 0, z, PALETTE.stripeDark, yaw, { rounded: 0.02 });
  }
  threshold(root, door);
  // Numéro de secteur peint au sol, lisible depuis la caméra (au-dessus du seuil).
  const label = signTexture(door.label, { bg: "rgba(0,0,0,0)", fg: "rgba(246,236,214,0.85)", font: "'Special Elite', monospace", width: 512, height: 96 });
  decal(root, label, door.x, door.z + 1.0, 3.2, 0.6, 0, 0.04);
  if (door.lock) lockedDoor(root, door, locks);
}

/** Porte fermée par un verrou : battants, mur dérobé ou barreaux électriques. */
function lockedDoor(root: Group, door: Door, locks: LockView[]): void {
  const half = door.width / 2;
  {
    const group = new Group();
    group.position.set(door.x, 0, door.z);
    if (door.axis === "z") group.rotation.y = Math.PI / 2;
    if (door.lock === "power" || door.lock === "key") {
      // Porte blindée : deux battants d'acier, voyant rouge et pancarte.
      for (const side of [-1, 1]) {
        const leaf = block(group, half, 1.5, 0.16, PALETTE.steel, side * half / 2, 0, 0, 0.03);
        leaf.name = side < 0 ? "leaf-left" : "leaf-right";
        block(leaf, 0.08, 1.2, 0.18, PALETTE.danger, -side * (half / 2 - 0.06), -0.6, 0, 0.02);
      }
      panel(group, signTexture(door.lock === "power" ? "HORS TENSION" : "CLÉ D'ACCÈS\nREQUISE", { bg: PALETTE.paper, fg: PALETTE.danger, border: PALETTE.danger, width: 256, height: 96 }), 0, 1.1, 0.1, 1.2, 0.45, 0);
    } else if (door.lock === "secret") {
      // Mur dérobé : un pan de mur identique aux autres, révélé par le SCAN ÉCHO.
      const fake = block(group, door.width + 0.05, WALL_HEIGHT, WALL_THICKNESS, PALETTE.concrete, 0, 0, 0, 0.02);
      fake.name = "leaf-secret";
      block(group, door.width + 0.1, 0.09, WALL_THICKNESS + 0.08, PALETTE.wallCap, 0, WALL_HEIGHT, 0, 0.02);
    } else {
      // Verrou électrique : barreaux sous tension rouge-orangé.
      for (let i = 0; i < 7; i++) {
        const x = -half + 0.2 + (i * (door.width - 0.4)) / 6;
        const bar = mesh(new CylinderGeometry(0.03, 0.03, 1.5, 6), glow(PALETTE.danger), x, 0.75, 0, false);
        group.add(bar);
      }
      block(group, door.width, 0.1, 0.2, PALETTE.steelDark, 0, 1.5, 0, 0.02);
      block(group, door.width, 0.1, 0.2, PALETTE.steelDark, 0, 0, 0, 0.02);
    }
    root.add(group);
    locks.push({ door, group, open: false, box: doorBox(door) });
  }
}

function addLight(root: Group, flickers: Flicker[], x: number, y: number, z: number, color: string, intensity: number, distance: number, nervous: number, seed: number, fixture = true): void {
  let bulb: Mesh | undefined;
  if (fixture) {
    bulb = mesh(new SphereGeometry(0.09, 10, 8), new MeshBasicMaterial({ color }), x, y, z, false);
    root.add(bulb);
  }
  flickers.push({ x, y, z, color, distance, base: intensity, seed, nervous, bulb, level: 1 });
}

/** Faisceau lumineux poussiéreux sous une lampe : deux plans croisés additifs. */
function beam(root: Group, x: number, top: number, z: number, radius: number, color: string): void {
  const material = new MeshBasicMaterial({ map: beamTexture(), color, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, opacity: 0.35 });
  for (const angle of [0, Math.PI / 2]) {
    const plane = new Mesh(new PlaneGeometry(radius * 2, top), material);
    plane.position.set(x, top / 2, z);
    plane.rotation.y = angle + 0.4;
    plane.renderOrder = 2;
    root.add(plane);
    if (batch && root === batch.root) batch.absorb(plane);
  }
}

function dust(root: Group, centers: [number, number, number][], perCenter: number): Points {
  const count = centers.length * perCenter;
  const positions = new Float32Array(count * 3);
  const r = rng(99);
  for (let i = 0; i < count; i++) {
    const [cx, cy, cz] = centers[Math.floor(i / perCenter)];
    positions[i * 3] = cx + (r() - 0.5) * 2.4;
    positions[i * 3 + 1] = cy * r();
    positions[i * 3 + 2] = cz + (r() - 0.5) * 2.4;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  const points = new Points(geometry, new PointsMaterial({ map: dustTexture(), size: 0.07, transparent: true, depthWrite: false, opacity: 0.75, color: "#fff1cf", blending: AdditiveBlending }));
  points.userData.origin = positions.slice();
  points.userData.centers = centers;
  root.add(points);
  return points;
}

/** Couche de ruine commune : fissures, salissures, papiers, dalles tombées (fondues dans le lot statique). */
export function ruin(root: Group, x0: number, x1: number, z0: number, z1: number, seed: number, slabs: number, density = 1): void {
  const r = rng(seed);
  const rx = () => x0 + 0.8 + r() * (x1 - x0 - 1.6);
  const rz = () => z0 + 0.8 + r() * (z1 - z0 - 1.6);
  const keep = (m: Mesh) => { if (batch && root === batch.root) batch.absorb(m); return m; };
  const area = (x1 - x0) * (z1 - z0) * density;
  for (let i = 0; i < Math.round(area / 22); i++) keep(decal(root, crackTexture(1 + (i % 4)), rx(), rz(), 2 + r() * 2, 2 + r() * 2, r() * 6, 0.011));
  for (let i = 0; i < Math.round(area / 30); i++) keep(decal(root, dirtTexture(1 + (i % 3)), rx(), rz(), 3 + r() * 3, 3 + r() * 3, r() * 6, 0.009));
  for (let i = 0; i < Math.round(area / 9); i++) {
    const sheet = decal(root, paperTexture(1 + (i % 4)), rx(), rz(), 0.22, 0.28, r() * 6, 0.02);
    sheet.renderOrder = 2;
    keep(sheet);
  }
  for (let i = 0; i < Math.round(area / 25); i++) rubble(root, rx(), rz(), 3 + Math.floor(r() * 4), Math.floor(r() * 9999), 0.3);
  // Dalles de béton tombées, inclinées contre le sol.
  for (let i = 0; i < slabs; i++) {
    const slab = mesh(new BoxGeometry(1.2 + r() * 0.8, 0.14, 0.8 + r() * 0.6), toon(r() > 0.5 ? PALETTE.concrete : PALETTE.concreteDark), rx(), 0.2, rz());
    slab.rotation.set(0.15 + r() * 0.2, r() * 3, (r() - 0.5) * 0.3);
    root.add(slab);
    const rod = mesh(new CylinderGeometry(0.015, 0.015, 0.7, 5), toon(PALETTE.rust), slab.position.x + 0.3, 0.35, slab.position.z);
    rod.rotation.set(0.9, r() * 3, 0.4);
    root.add(rod);
    keep(slab);
    keep(rod);
  }
}

// ——— Objets interactifs ———

/** Modèles fournis par les secteurs (objets interactifs propres à chaque zone). */
const SECTOR_MODELS: Record<string, ModelBuilder> = { ...EXTERIOR_MODELS, ...CENTER_MODELS, ...WEST_MODELS, ...EAST_MODELS };

/** Réactions des secteurs à l'état (ex. panneau du relais qui disparaît après le scan). */
const REFRESH_HOOKS: ((view: WorldView, state: SiloState) => void)[] = [];
export function onWorldRefresh(hook: (view: WorldView, state: SiloState) => void): void {
  if (!REFRESH_HOOKS.includes(hook)) REFRESH_HOOKS.push(hook);
}

function interactableModel(def: InteractableDef): { group: Group; height: number } {
  const g = new Group();
  g.position.set(def.x, 0, def.z);
  let height = 1.6;
  switch (def.id) {
    case "recharge": {
      block(g, 0.6, 1.3, 0.5, PALETTE.yellow, 0, 0, 0, 0.08);
      block(g, 0.46, 0.5, 0.06, PALETTE.steelDark, 0, 0.6, 0.25, 0.02);
      // Jauge : 4 barres allumées quand la borne est chargée, éteintes (et voyant rouge) une fois utilisée.
      // Elle se réarme quand on quitte le poste de sécurité (une charge par visite, voir refresh()).
      const lit = new Group();
      const dark = new Group();
      for (let i = 0; i < 4; i++) {
        lit.add(mesh(new BoxGeometry(0.34, 0.08, 0.04), glow(PALETTE.amber), 0, 0.7 + i * 0.1, 0.29, false));
        dark.add(mesh(new BoxGeometry(0.34, 0.08, 0.04), glow("#4a3c28"), 0, 0.7 + i * 0.1, 0.29, false));
      }
      dark.add(mesh(new SphereGeometry(0.045, 8, 6), glow(PALETTE.danger), 0.22, 1.08, 0.27, false));
      dark.visible = false;
      g.add(lit, dark);
      g.userData.charge = { lit, dark };
      const coil = mesh(new TorusGeometry(0.16, 0.035, 6, 14), toon(PALETTE.outline), 0, 0.3, 0.28);
      g.add(coil);
      panel(g, signTexture("1 CHARGE / VISITE", { bg: PALETTE.paper, fg: PALETTE.outline, width: 320, height: 64 }), 0, 1.15, 0.255, 0.5, 0.1, 0);
      height = 1.7;
      break;
    }
    case "upgrade": {
      // Établi : plateau en bois, étau, outils, lampe.
      block(g, 1.5, 0.08, 0.75, PALETTE.wood, 0, 0.82, 0, 0.02);
      for (const [x, z] of [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]]) block(g, 0.08, 0.82, 0.08, PALETTE.woodDark, x, 0, z, 0.01);
      block(g, 1.4, 0.06, 0.6, PALETTE.woodDark, 0, 0.25, 0, 0.01);
      block(g, 0.22, 0.18, 0.16, PALETTE.danger, -0.45, 0.9, 0.1, 0.03);
      block(g, 0.35, 0.05, 0.08, PALETTE.steel, 0.1, 0.9, 0.15, 0.01);
      block(g, 0.28, 0.12, 0.2, PALETTE.teal, 0.45, 0.9, -0.1, 0.03);
      cylinder(g, 0.05, 0.3, PALETTE.steelDark, 0.6, 0.9, 0.25);
      can(g, -0.1, -0.2);
      height = 1.4;
      break;
    }
    default: {
      if (def.note) {
        // Note de survivant : feuille froissée posée au sol, punaise rouge, coin replié.
        const sheet = block(g, 0.34, 0.015, 0.44, PALETTE.paper, 0, 0, 0, 0.004);
        sheet.rotation.y = def.x * 0.7;
        const fold = block(g, 0.12, 0.012, 0.12, "#d9cdb0", 0.12, 0.012, -0.16, 0.003);
        fold.rotation.y = def.x * 0.7;
        for (let i = 0; i < 4; i++) block(g, 0.22 - i * 0.03, 0.004, 0.018, "#6b5b49", -0.02, 0.016, -0.12 + i * 0.07, 0.001).rotation.y = def.x * 0.7;
        g.add(mesh(new SphereGeometry(0.035, 8, 6), toon(PALETTE.danger), 0, 0.03, 0.15, false));
        height = 0.6;
      } else if (def.kind === "components") {
        // Ferraille : plaque tordue, engrenage et ressort, posés de travers.
        const gear = mesh(new CylinderGeometry(0.17, 0.17, 0.06, 8), toon(PALETTE.amber, { emissive: PALETTE.amber, emissiveIntensity: 0.25 }), 0, 0.05, 0);
        g.add(gear);
        const hub = mesh(new CylinderGeometry(0.06, 0.06, 0.1, 10), toon(PALETTE.steelDark), 0, 0.07, 0);
        g.add(hub);
        const coil = mesh(new TorusGeometry(0.08, 0.035, 6, 12), toon(PALETTE.rustLight), 0.18, 0.06, 0.08);
        coil.rotation.x = Math.PI / 2;
        g.add(coil);
        block(g, 0.26, 0.03, 0.14, PALETTE.steel, -0.16, 0.02, 0.1, 0.01).rotation.set(0.2, 0.6, 0.1);
        g.rotation.y = def.x * 1.3;
        height = 0.7;
      } else if (def.kind === "ammo") {
        // Boîte de clous en carton, étiquette moutarde.
        block(g, 0.42, 0.22, 0.28, "#b08a5a", 0, 0, 0, 0.03);
        block(g, 0.44, 0.04, 0.3, "#8f6d44", 0, 0.22, 0, 0.01);
        panel(g, signTexture("CLOUS", { bg: "#d8a43a", fg: PALETTE.outline, width: 160, height: 64 }), 0, 0.12, 0.145, 0.3, 0.12, 0);
        g.rotation.y = 0.5;
        height = 0.8;
      } else if (def.kind === "cell") {
        // Pile : gros cylindre olive à capuchon cuivré.
        const body = cylinder(g, 0.08, 0.26, "#6b7550", 0, 0.08, 0);
        body.rotation.z = Math.PI / 2;
        body.position.set(0, 0.09, 0);
        const cap = cylinder(g, 0.05, 0.05, "#d8a43a", 0, 0.08, 0);
        cap.rotation.z = Math.PI / 2;
        cap.position.set(0.15, 0.09, 0);
        g.rotation.y = def.z;
        height = 0.7;
      } else if (def.kind === "bandage") {
        // Rouleau de bandage crème avec une croix rouge.
        const roll = cylinder(g, 0.11, 0.12, "#efe4cc", 0, 0, 0, 14);
        roll.rotation.x = Math.PI / 2;
        roll.position.y = 0.11;
        block(g, 0.12, 0.01, 0.035, PALETTE.danger, 0, 0.22, 0, 0.004);
        block(g, 0.035, 0.01, 0.12, PALETTE.danger, 0, 0.22, 0, 0.004);
        height = 0.7;
      } else if (def.kind === "can") {
        // Conserve de pêches, étiquette moutarde.
        cylinder(g, 0.08, 0.15, "#b9c0c2", 0, 0, 0, 12);
        cylinder(g, 0.082, 0.09, "#d8a43a", 0, 0.03, 0, 12);
        height = 0.6;
      } else if (def.kind === "medkit") {
        // Trousse : boîte crème arrondie, croix rouge, poignée.
        block(g, 0.4, 0.2, 0.28, "#efe4cc", 0, 0, 0, 0.06);
        block(g, 0.16, 0.012, 0.05, PALETTE.danger, 0, 0.2, 0, 0.004);
        block(g, 0.05, 0.012, 0.16, PALETTE.danger, 0, 0.2, 0, 0.004);
        height = 0.8;
      } else {
        block(g, 0.4, 0.3, 0.3, PALETTE.paper, 0, 0, 0, 0.05);
        height = 0.8;
      }
    }
  }
  return { group: g, height };
}

export function buildWorld(scene: Scene): WorldView {
  const root = new Group();
  root.name = "World";
  scene.add(root);
  const colliders: Box[] = [];
  const flickers: Flicker[] = [];
  const locks: LockView[] = [];
  const dustCenters: [number, number, number][] = [];
  const decor: DecorContext = {
    root,
    colliders,
    light: (x, y, z, color, intensity, distance, nervous, seed, fixture = true) => addLight(root, flickers, x, y, z, color, intensity, distance, nervous, seed, fixture),
    beam: (x, top, z, radius, color) => beam(root, x, top, z, radius, color),
    dust: (x, y, z) => { dustCenters.push([x, y, z]); },
    animate: (fn) => { animations.push(fn); },
  };
  const animations: ((dt: number, time: number, playerX: number, playerZ: number) => void)[] = [];

  // Fond sombre sous le silo (terre, vide au-delà des murs).
  const ground = mesh(new PlaneGeometry(120, 120), toon(PALETTE.sky, { rim: 0 }), 0, -0.02, -10, false);
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);

  for (const room of ROOMS) floor(root, room);
  // Décor statique (murets, seuils, gravats, herbes, papiers…) fondu par matériau et par case de 12 m.
  batch = new StaticBatch(root, 12);
  setStaticSink(batch);
  const walls = buildWalls();
  for (const w of walls) {
    if (w.outdoor) outdoorEdge(root, w.x0, w.z0, w.x1, w.z1);
    else wall(root, w.x0, w.z0, w.x1, w.z1);
    colliders.push(wallBox(w));
  }
  postsFor(walls).forEach(([x, z], i) => cornerPost(x, z, i + 1));
  DOORS.forEach((_, i) => doorFrame(root, i, locks));
  try {
    decorateExterior(decor);
    decorateCenter(decor);
    decorateWest(decor);
    decorateEast(decor);
  } finally {
    setStaticSink(null);
    batch.flush();
    batch = null;
  }

  const interactables = new Map<string, InteractableView>();
  const solidItems = new Map<string, Box>();
  for (const def of INTERACTABLES) {
    const { group, height } = (SECTOR_MODELS[def.id] ?? interactableModel)(def);
    root.add(group);
    const highlight = addHighlight(group);
    interactables.set(def.id, { def, group, highlight, tooltipHeight: height });
    if (def.solid ?? !def.kind) solidItems.set(def.id, { minX: def.x - def.radius, maxX: def.x + def.radius, minZ: def.z - def.radius * 0.8, maxZ: def.z + def.radius * 0.8 });
  }

  const staticColliders = [...colliders];
  const view: WorldView = { root, colliders: [], interactables, refresh, update, shudder, setLowQuality };
  const motes = dust(root, dustCenters, lowDust() ? 30 : 50);
  let lowQuality = false;
  let shudderTime = 0;
  const pool: PointLight[] = [];
  for (let i = 0; i < LIGHT_POOL; i++) {
    const light = new PointLight("#ffffff", 0, 8, 1.6);
    light.castShadow = false;
    root.add(light);
    pool.push(light);
  }
  let poolClock = 0;
  let assigned: Flicker[] = [];

  function refresh(state: SiloState): void {
    const active: Box[] = [...staticColliders];
    for (const lock of locks) {
      const open = doorOpen(lock.door, state);
      if (open !== lock.open) {
        lock.open = open;
        if (lock.door.lock === "power" || lock.door.lock === "key") {
          // Les battants s'enfoncent dans le sol.
          for (const leaf of lock.group.children.filter((c) => c.name.startsWith("leaf"))) leaf.userData.target = open ? -1.55 : 0;
          lock.group.userData.animating = true;
        } else lock.group.visible = !open;
      }
      if (!open) active.push(lock.box);
    }
    for (const [id, item] of interactables) {
      const available = interactableAvailable(item.def, state);
      item.group.visible = available;
      item.group.userData.available = available;
      const charge = item.group.userData.charge as { lit: Group; dark: Group } | undefined;
      if (charge) {
        charge.lit.visible = !state.rechargeSpent;
        charge.dark.visible = state.rechargeSpent;
      }
      const box = solidItems.get(id);
      if (box && available) active.push(box);
    }
    view.colliders = active;
    for (const hook of REFRESH_HOOKS) hook(view, state);
  }

  function shudder(): void {
    shudderTime = 1.0;
  }

  function update(dt: number, time: number, playerX: number, playerZ: number): void {
    // Portes du cœur qui s'ouvrent.
    for (const lock of locks) {
      if (!lock.group.userData.animating) continue;
      let moving = false;
      for (const leaf of lock.group.children) {
        if (leaf.userData.target === undefined) continue;
        const target = leaf.userData.target as number;
        leaf.position.y += (target - leaf.position.y) * Math.min(1, dt * 2.5);
        if (Math.abs(target - leaf.position.y) > 0.01) moving = true;
      }
      lock.group.userData.animating = moving;
    }
    for (const fn of animations) fn(dt, time, playerX, playerZ);
    shudderTime = Math.max(0, shudderTime - dt);
    const dim = shudderTime > 0 ? (shudderTime > 0.85 ? 0.05 : 1 - shudderTime * 0.8) : 1;
    for (const f of flickers) {
      // Bruit pseudo-aléatoire : variations douces + coupures brèves pour les lampes nerveuses.
      const nervous = f.nervous * COMFORT.flicker;
      const wobble = Math.sin(time * 9 + f.seed * 7) * 0.5 + Math.sin(time * 23 + f.seed * 3) * 0.5;
      const cut = Math.sin(time * 1.7 + f.seed * 11) > 0.93 - nervous * 0.1 && Math.sin(time * 41 + f.seed) > 0 ? 0.15 : 1;
      f.level = (1 - nervous * 0.25 + wobble * nervous * 0.2) * (nervous > 0.3 ? cut : 1) * dim;
      if (f.bulb) (f.bulb.material as MeshBasicMaterial).color.set(f.color).multiplyScalar(0.4 + f.level * 0.6);
    }
    // Les lampes les plus proches du joueur occupent les places de lumière (coût constant).
    poolClock -= dt;
    if (poolClock <= 0) {
      poolClock = 0.4;
      assigned = [...flickers].sort((a, b) => Math.hypot(a.x - playerX, a.z - playerZ) - Math.hypot(b.x - playerX, b.z - playerZ)).slice(0, LIGHT_POOL);
    }
    pool.forEach((light, i) => {
      const f = assigned[i];
      if (!f) { light.intensity = 0; return; }
      light.position.set(f.x, f.y, f.z);
      light.color.set(f.color);
      light.distance = f.distance;
      light.intensity = f.base * f.level;
    });
    if (!lowQuality) {
      const positions = motes.geometry.getAttribute("position") as BufferAttribute;
      const origin = motes.userData.origin as Float32Array;
      for (let i = 0; i < positions.count; i++) {
        positions.setX(i, origin[i * 3] + Math.sin(time * 0.3 + i) * 0.25);
        positions.setY(i, (origin[i * 3 + 1] + time * 0.05 * (0.5 + (i % 5) * 0.1)) % 2.3);
        positions.setZ(i, origin[i * 3 + 2] + Math.cos(time * 0.25 + i * 1.7) * 0.25);
      }
      positions.needsUpdate = true;
    }
  }

  function setLowQuality(low: boolean): void {
    lowQuality = low;
    motes.visible = !low;
  }

  view.colliders = [...staticColliders, ...locks.map((l) => l.box), ...solidItems.values()];
  return view;
}

function lowDust(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
}

