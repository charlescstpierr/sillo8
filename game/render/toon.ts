// Matériaux toon : diffuse en 3 paliers, léger rim light, contour par coque inversée (#1e140d).
// Tout reste compatible WebGL 1/2 et téléphones modestes : pas de post-traitement.
import {
  BackSide, Color, DataTexture, Material, Mesh, MeshBasicMaterial, MeshToonMaterial, NearestFilter,
  Object3D, RedFormat, Texture, type ColorRepresentation,
} from "three";
import { PALETTE } from "./palette";

let gradient: DataTexture | null = null;

/** Rampe 3 paliers : ombre douce, mi-teinte, pleine lumière. */
export function toonGradient(): DataTexture {
  if (gradient) return gradient;
  const steps = new Uint8Array([118, 190, 255]);
  gradient = new DataTexture(steps, steps.length, 1, RedFormat);
  gradient.minFilter = NearestFilter;
  gradient.magFilter = NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

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
  if (rim > 0) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.rimStrength = { value: rim };
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float rimStrength;")
        .replace(
          "#include <opaque_fragment>",
          "float rimTerm = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 3.0);\n" +
            "outgoingLight += vec3(1.0, 0.93, 0.8) * rimTerm * rimStrength * (0.35 + 0.65 * diffuseColor.rgb);\n" +
            "#include <opaque_fragment>",
        );
    };
    material.customProgramCacheKey = () => "toon-rim";
  }
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
