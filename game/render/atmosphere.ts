// Ambiance lumineuse par zone : nuit bleutée dehors (lune basse, ombres longues), pénombre chaude dedans,
// teinte propre à chaque pièce. Le passage d'une ambiance à l'autre est lissé (~1 s).
// Coût constant : 1 hémisphère, 1 directionnelle (seule à projeter des ombres), 1 quad de vignette.
import {
  Color, DirectionalLight, Fog, HemisphereLight, Matrix4, Mesh, PlaneGeometry, Scene, ShaderMaterial,
  SpotLight, Vector3, WebGLRenderer,
} from "three";
import { roomAt, type RoomId } from "../level";
import type { SiloState } from "../state";
import { PALETTE } from "./palette";
import { TOON_LIGHT } from "./toon";

export interface Mood {
  /** Fond et brouillard (distances ajoutées à celle de la caméra). */
  sky: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  /** Lumière d'ambiance : ciel / sol, intensité. */
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  /** Lune ou lumière d'ensemble, hauteur au-dessus du point suivi (plus bas = ombres plus longues). */
  sun: string;
  sunIntensity: number;
  elevation: number;
  /** Opacité des ombres portées (0..1). */
  shadow: number;
  /** Multiplicateur RVB des faces à l'ombre (ombres colorées). */
  shade: readonly [number, number, number];
  rim: string;
  rimBoost: number;
  /** Lampe frontale : multiplicateur et couleur. */
  lamp: number;
  lampColor: string;
  vignette: string;
  vignetteStrength: number;
  exposure: number;
}

/** Nuit dehors : lune bleu-vert, ombres violacées, la frontale et les projecteurs ressortent. */
export const NIGHT: Mood = {
  sky: "#070b12", fog: "#0c131c", fogNear: 1, fogFar: 22,
  hemiSky: "#7090c4", hemiGround: "#29283a", hemi: 0.95,
  sun: "#9fc2f0", sunIntensity: 1.05, elevation: 9,
  shadow: 0.88, shade: [0.74, 0.8, 1.14],
  rim: "#9fd0ff", rimBoost: 1.6,
  lamp: 1.35, lampColor: "#ffd391",
  vignette: "#02050b", vignetteStrength: 0.62,
  exposure: 1.0,
};

/** Intérieur : pénombre chaude, les lampes de service et la frontale font le travail. */
export const INSIDE: Mood = {
  sky: "#0b0806", fog: "#161009", fogNear: 4, fogFar: 30,
  hemiSky: "#f2d3a6", hemiGround: "#3b2b20", hemi: 0.55,
  sun: "#ffd7a2", sunIntensity: 0.5, elevation: 17,
  shadow: 0.72, shade: [1.05, 0.86, 0.8],
  rim: "#ffe0b8", rimBoost: 1.0,
  lamp: 1.1, lampColor: "#ffdca2",
  vignette: "#0d0602", vignetteStrength: 0.56,
  exposure: 1.02,
};

/** Variantes par pièce (le reste vient d'INSIDE). */
const ROOMS: Partial<Record<RoomId, Partial<Mood>>> = {
  greenhouse: {
    hemiSky: "#c6d6a4", hemiGround: "#2a3520", hemi: 0.64, sun: "#ffe8b0", sunIntensity: 0.66,
    shade: [0.9, 1.02, 0.8], rim: "#f4ffc0", fog: "#111a0e", vignette: "#050d05",
  },
  control: {
    hemiSky: "#a6d6ec", hemiGround: "#172633", hemi: 0.62, sun: "#b3e0ff", sunIntensity: 0.5,
    shade: [0.76, 0.92, 1.12], rim: "#9ef2ff", rimBoost: 1.25, fog: "#0a151b", vignette: "#010a10", lampColor: "#fff0cc",
  },
  infirmary: { hemiSky: "#d9ecf0", hemi: 0.6, hemiGround: "#26323a", sun: "#e8f6ff", shade: [0.86, 0.95, 1.06], rim: "#e6fbff" },
  workshop: { hemiSky: "#ffcf92", sun: "#ffc98a", shade: [1.08, 0.84, 0.74] },
  dorms: { hemiSky: "#f5cd98", hemi: 0.5, sunIntensity: 0.46 },
  cafeteria: { hemiSky: "#f7d49e", hemi: 0.54 },
  storage: { hemiSky: "#e3cfae", hemi: 0.5 },
  secret: { hemi: 0.4, sunIntensity: 0.4, lamp: 1.35, vignetteStrength: 0.62 },
  hub: { hemiSky: "#e4e2d2", hemiGround: "#2d3030", hemi: 0.64, shade: [0.92, 0.9, 0.96], rim: "#f2f0e4" },
  security: { hemiSky: "#e8dcc6", hemi: 0.55 },
  stairs: { hemiSky: "#e0a488", hemiGround: "#2e1612", shade: [1.1, 0.8, 0.78], rim: "#ffb79c" },
  west: { hemi: 0.48 },
  east: { hemi: 0.48 },
  north: { hemi: 0.5 },
};

/** Génératrice à l'arrêt : rouge sourd ; une fois relancée, ambre chaud. */
const GENERATOR_OFF: Partial<Mood> = {
  hemiSky: "#e8b8a2", hemiGround: "#3a1610", hemi: 0.9, sun: "#ff9070", sunIntensity: 0.62,
  shade: [1.12, 0.8, 0.76], rim: "#ffa98a", rimBoost: 1.8, fog: "#1e0b07", vignette: "#1e0401", vignetteStrength: 0.62, lamp: 1.3,
};
const GENERATOR_ON: Partial<Mood> = {
  hemiSky: "#ffcd8c", hemiGround: "#3a2414", hemi: 0.74, sun: "#ffc684", sunIntensity: 0.7, shade: [1.08, 0.86, 0.76],
};

/** Ambiance voulue pour une pièce (hors des pièces, seuils et murs, on garde la courante). */
export function moodFor(room: RoomId, outdoor: boolean, powered: boolean): Mood {
  if (outdoor) return NIGHT;
  const mood = { ...INSIDE, ...ROOMS[room] };
  if (room === "generator") return { ...mood, ...(powered ? GENERATOR_ON : GENERATOR_OFF) };
  // Sans courant, tout l'intérieur est un peu plus sombre.
  if (!powered) {
    mood.hemi *= 0.85;
    mood.sunIntensity *= 0.85;
  }
  return mood;
}

/** Valeurs courantes (interpolées). */
interface Live {
  sky: Color; fog: Color; fogNear: number; fogFar: number;
  hemiSky: Color; hemiGround: Color; hemi: number;
  sun: Color; sunIntensity: number; elevation: number; shadow: number;
  shade: Color; rim: Color; rimBoost: number;
  lamp: number; lampColor: Color; vignette: Color; vignetteStrength: number; exposure: number;
}

const COLORS = ["sky", "fog", "hemiSky", "hemiGround", "sun", "rim", "lampColor", "vignette"] as const;
const NUMBERS = ["fogNear", "fogFar", "hemi", "sunIntensity", "elevation", "shadow", "rimBoost", "lamp", "vignetteStrength", "exposure"] as const;

function live(mood: Mood): Live {
  const out = {} as Live;
  for (const key of COLORS) out[key] = new Color(mood[key]);
  for (const key of NUMBERS) out[key] = mood[key];
  out.shade = new Color(...mood.shade);
  return out;
}

/** Direction horizontale fixe de la lune / lumière d'ensemble (du nord-ouest). */
const SUN_REACH = 11.4;
const SUN_DIR = { x: -7 / SUN_REACH, z: -9 / SUN_REACH };
const SHADOW_SIZE = 2048;

const VIGNETTE_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const VIGNETTE_FRAG = `
uniform vec3 uColor;
uniform float uStrength;
uniform float uAspect;
uniform float uGrain;
uniform float uSeed;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float r = length(p) / length(vec2(uAspect, 1.0) * 0.5);
  float v = smoothstep(0.42, 1.0, r);
  // Le haut de l'écran (le lointain) s'assombrit un peu plus : profondeur sans brouillard épais.
  float a = (v * v + smoothstep(0.55, 1.0, vUv.y) * 0.18) * uStrength;
  float n = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233)) + uSeed) * 43758.5453) - 0.5;
  gl_FragColor = vec4(uColor, clamp(a + n * uGrain, 0.0, 1.0));
  #include <colorspace_fragment>
}`;

export interface AtmosphereFrame {
  dt: number;
  /** Position du joueur (choix de l'ambiance). */
  x: number;
  z: number;
  /** Point suivi par la caméra (centre des ombres) et distance de la caméra. */
  focus: Vector3;
  distance: number;
  aspect: number;
  state: SiloState;
  headlamp: SpotLight;
}

export class Atmosphere {
  readonly hemi: HemisphereLight;
  readonly sun: DirectionalLight;
  readonly fog: Fog;
  readonly vignette: Mesh;
  private readonly cur: Live;
  private target: Mood = NIGHT;
  private snapNext = true;
  private low = false;
  private shadowHalf = 0;
  private lampBase = 0;
  private lampWritten = -1;
  private seed = 0;
  private readonly basis = new Matrix4();
  private readonly offset = new Vector3();
  private readonly snapped = new Vector3();
  private readonly origin = new Vector3();
  private readonly up = new Vector3(0, 1, 0);
  private readonly material: ShaderMaterial;

  constructor(private readonly scene: Scene, private readonly renderer: WebGLRenderer) {
    this.cur = live(NIGHT);
    this.fog = new Fog(PALETTE.fog, 20, 40);
    scene.fog = this.fog;
    scene.background = new Color(PALETTE.sky);
    this.hemi = new HemisphereLight("#ffffff", "#000000", 1);
    this.sun = new DirectionalLight("#ffffff", 1);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(SHADOW_SIZE, SHADOW_SIZE);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 50;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    // Pénombre large : ombres douces façon pâte à modeler (PCF, 5 prises tournées).
    this.sun.shadow.radius = 3.5;
    scene.add(this.hemi, this.sun, this.sun.target);

    this.material = new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color() },
        uStrength: { value: 0 },
        uAspect: { value: 16 / 9 },
        uGrain: { value: 0.035 },
        uSeed: { value: 0 },
      },
      vertexShader: VIGNETTE_VERT,
      fragmentShader: VIGNETTE_FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });
    this.vignette = new Mesh(new PlaneGeometry(2, 2), this.material);
    this.vignette.frustumCulled = false;
    this.vignette.renderOrder = 10_000;
    this.vignette.castShadow = this.vignette.receiveShadow = false;
    this.vignette.raycast = () => {};
    scene.add(this.vignette);
  }

  setLowQuality(low: boolean): void {
    this.low = low;
    this.sun.castShadow = !low;
    // Le grain coûte un peu et se voit mal sur petit écran.
    this.material.uniforms.uGrain.value = low ? 0 : 0.035;
  }

  /** Prochaine mise à jour : ambiance appliquée d'un coup (téléportation, chargement). */
  snap(): void {
    this.snapNext = true;
  }

  update(frame: AtmosphereFrame): void {
    const room = roomAt(frame.x, frame.z);
    if (room) this.target = moodFor(room.id, room.outdoor ?? false, frame.state.has("generator_powered"));
    const k = this.snapNext ? 1 : 1 - Math.exp(-frame.dt * 3.2);
    this.snapNext = false;
    this.blend(k);
    this.apply(frame);
  }

  private blend(k: number): void {
    const cur = this.cur;
    const target = this.target;
    for (const key of COLORS) cur[key].lerp(scratch.set(target[key]), k);
    for (const key of NUMBERS) cur[key] += (target[key] - cur[key]) * k;
    cur.shade.lerp(scratch.setRGB(...target.shade), k);
  }

  private apply(frame: AtmosphereFrame): void {
    const cur = this.cur;
    (this.scene.background as Color).copy(cur.sky);
    this.fog.color.copy(cur.fog);
    this.fog.near = frame.distance + cur.fogNear;
    this.fog.far = frame.distance + cur.fogFar;
    this.hemi.color.copy(cur.hemiSky);
    this.hemi.groundColor.copy(cur.hemiGround);
    this.hemi.intensity = cur.hemi;
    this.sun.color.copy(cur.sun);
    this.sun.intensity = cur.sunIntensity;
    this.sun.shadow.intensity = cur.shadow;
    this.renderer.toneMappingExposure = cur.exposure;
    TOON_LIGHT.shade.value.copy(cur.shade);
    TOON_LIGHT.rim.value.copy(cur.rim);
    TOON_LIGHT.rimBoost.value = cur.rimBoost;

    // Frontale : l'animation du bricoleur réécrit l'intensité à chaque pas de simulation ; on la module
    // sans l'accumuler quand le jeu est en pause.
    const lamp = frame.headlamp;
    if (lamp.intensity !== this.lampWritten) this.lampBase = lamp.intensity;
    lamp.intensity = this.lampBase * cur.lamp;
    this.lampWritten = lamp.intensity;
    lamp.color.copy(cur.lampColor);
    lamp.distance = 13;

    const uniforms = this.material.uniforms;
    uniforms.uColor.value.copy(cur.vignette);
    uniforms.uStrength.value = cur.vignetteStrength;
    uniforms.uAspect.value = frame.aspect;
    this.seed = (this.seed + 0.618) % 97;
    uniforms.uSeed.value = this.seed;

    this.placeSun(frame.focus, frame.distance);
  }

  /** Place la lune sur le point suivi, recalée sur la grille de texels de la carte d'ombres (pas de scintillement). */
  private placeSun(focus: Vector3, distance: number): void {
    const offset = this.offset.set(SUN_DIR.x * SUN_REACH, this.cur.elevation, SUN_DIR.z * SUN_REACH).normalize();
    if (this.low) {
      this.sun.target.position.copy(focus);
      this.sun.position.copy(focus).addScaledVector(offset, 20);
      return;
    }
    // Cadre des ombres : couvre la vue, élargi quand on dézoome.
    const half = Math.round(Math.min(22, Math.max(12, distance * 0.95)));
    const camera = this.sun.shadow.camera;
    if (half !== this.shadowHalf) {
      this.shadowHalf = half;
      Object.assign(camera, { left: -half, right: half, top: half, bottom: -half });
      camera.updateProjectionMatrix();
    }
    const texel = (2 * half) / SHADOW_SIZE;
    // Repère de la caméra d'ombre (même orientation que lookAt(position → cible)).
    this.basis.lookAt(offset, this.origin, this.up);
    const local = this.snapped.copy(focus).applyMatrix4(scratchMatrix.copy(this.basis).transpose());
    local.x = Math.round(local.x / texel) * texel;
    local.y = Math.round(local.y / texel) * texel;
    local.applyMatrix4(this.basis);
    this.sun.target.position.copy(local);
    this.sun.position.copy(local).addScaledVector(offset, 22);
  }
}

const scratch = new Color();
const scratchMatrix = new Matrix4();
