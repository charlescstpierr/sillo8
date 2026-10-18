// Matériaux toon : diffuse en 3 paliers doux, ombres propres teintées par l'ambiance, léger rim light,
// contour par coque inversée (#1e140d). Compatible WebGL 1/2 et téléphones modestes : pas de post-traitement.
import {
  BackSide, Color, DataTexture, LinearFilter, Material, Mesh, MeshBasicMaterial, MeshToonMaterial,
  Object3D, RedFormat, Texture, type ColorRepresentation,
} from "three";
import { PALETTE } from "./palette";

let gradient: DataTexture | null = null;

/** Paliers de la rampe (ombre, mi-teinte, pleine lumière) et position des marches (0 = dos, 1 = face). */
const RAMP = { shadow: 0.44, mid: 0.76, full: 1, edges: [0.4, 0.6], soft: 0.035 };

/** Rampe 3 paliers aux marches légèrement fondues (aspect pâte à modeler plutôt que découpe nette). */
export function toonGradient(): DataTexture {
  if (gradient) return gradient;
  const size = 64;
  const steps = new Uint8Array(size);
  const ease = (edge: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - edge + RAMP.soft) / (2 * RAMP.soft)));
    return t * t * (3 - 2 * t);
  };
  for (let i = 0; i < size; i++) {
    const x = (i + 0.5) / size;
    const v = RAMP.shadow + (RAMP.mid - RAMP.shadow) * ease(RAMP.edges[0], x) + (RAMP.full - RAMP.mid) * ease(RAMP.edges[1], x);
    steps[i] = Math.round(v * 255);
  }
  gradient = new DataTexture(steps, size, 1, RedFormat);
  gradient.minFilter = LinearFilter;
  gradient.magFilter = LinearFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

/**
 * Uniformes partagés par tous les matériaux toon, pilotés par l'ambiance (atmosphere.ts) :
 * `shade` multiplie les faces à l'ombre (ombres colorées, pas grises), `rim` colore le liseré, `rimBoost` le dose.
 */
export const TOON_LIGHT = {
  shade: { value: new Color(1, 1, 1) },
  rim: { value: new Color(1, 0.93, 0.8) },
  rimBoost: { value: 1 },
};

const GRADIENT_CHUNK = `
#ifdef USE_GRADIENTMAP
uniform sampler2D gradientMap;
#endif
uniform vec3 toonShade;
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
  float dotNL = dot( normal, lightDirection );
  #ifdef USE_GRADIENTMAP
  float g = texture2D( gradientMap, vec2( dotNL * 0.5 + 0.5, 0.0 ) ).r;
  #else
  float g = mix( 0.7, 1.0, step( 0.4, dotNL ) );
  #endif
  return g * mix( toonShade, vec3( 1.0 ), smoothstep( 0.6, 1.0, g ) );
}`;

export interface ToonOptions {
  map?: Texture;
  emissive?: ColorRepresentation;
  emissiveIntensity?: number;
  rim?: number;
  transparent?: boolean;
  alphaTest?: number;
  side?: Material["side"];
}

const cache = new Map<string, MeshToonMaterial>();

export function toon(color: ColorRepresentation, options: ToonOptions = {}): MeshToonMaterial {
  const key = JSON.stringify([new Color(color).getHexString(), options.map?.uuid, options.emissive, options.emissiveIntensity, options.rim, options.transparent, options.alphaTest, options.side]);
  const cached = cache.get(key);
  if (cached) return cached;
  const material = new MeshToonMaterial({
    color,
    gradientMap: toonGradient(),
    map: options.map ?? null,
    transparent: options.transparent ?? false,
    alphaTest: options.alphaTest ?? 0,
  });
  if (options.side !== undefined) material.side = options.side;
  if (options.emissive !== undefined) {
    material.emissive = new Color(options.emissive);
    material.emissiveIntensity = options.emissiveIntensity ?? 1;
  }
  const rim = options.rim ?? 0.22;
  // Même programme pour tous (rim 0 compris) : seules les valeurs d'uniformes changent.
  material.onBeforeCompile = (shader) => {
    shader.uniforms.rimStrength = { value: rim };
    shader.uniforms.toonShade = TOON_LIGHT.shade;
    shader.uniforms.toonRim = TOON_LIGHT.rim;
    shader.uniforms.toonRimBoost = TOON_LIGHT.rimBoost;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float rimStrength;\nuniform vec3 toonRim;\nuniform float toonRimBoost;")
      .replace("#include <gradientmap_pars_fragment>", GRADIENT_CHUNK)
      .replace(
        "#include <opaque_fragment>",
        "float rimTerm = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 3.0);\n" +
          "outgoingLight += toonRim * rimTerm * rimStrength * toonRimBoost * (0.35 + 0.65 * diffuseColor.rgb);\n" +
          "#include <opaque_fragment>",
      );
  };
  material.customProgramCacheKey = () => "toon-mood";
  cache.set(key, material);
  return material;
}

/** Matériau plat, non éclairé (néons, écrans, icônes). */
export function glow(color: ColorRepresentation): MeshBasicMaterial {
  const key = "glow:" + new Color(color).getHexString();
  const cached = basicCache.get(key);
  if (cached) return cached;
  const material = new MeshBasicMaterial({ color });
  basicCache.set(key, material);
  return material;
}
const basicCache = new Map<string, MeshBasicMaterial>();

const outlineCache = new Map<number, MeshBasicMaterial>();

/** Coque inversée : face arrière, sommets poussés le long de la normale. */
export function outlineMaterial(thickness: number): MeshBasicMaterial {
  const key = Math.round(thickness * 1000);
  const cached = outlineCache.get(key);
  if (cached) return cached;
  const material = new MeshBasicMaterial({ color: PALETTE.outline, side: BackSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.outlineThickness = { value: thickness };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float outlineThickness;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += normalize(normal) * outlineThickness;");
  };
  material.customProgramCacheKey = () => "outline-" + key;
  outlineCache.set(key, material);
  return material;
}

/** Ajoute un contour brun fin à chaque maillage de `root` (personnages, robots). */
export function addOutline(root: Object3D, thickness = 0.022): void {
  const meshes: Mesh[] = [];
  root.traverse((child) => {
    if (child instanceof Mesh && !child.userData.noOutline && !child.userData.isOutline) meshes.push(child);
  });
  for (const mesh of meshes) {
    const scale = Math.max(mesh.scale.x, mesh.scale.y, mesh.scale.z) || 1;
    const hull = new Mesh(mesh.geometry, outlineMaterial(thickness / scale));
    hull.userData.isOutline = true;
    hull.castShadow = false;
    hull.receiveShadow = false;
    hull.raycast = () => {};
    mesh.add(hull);
  }
}
