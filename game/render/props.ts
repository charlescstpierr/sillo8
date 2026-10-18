// Petites briques de décor low-poly arrondies, toutes en matériaux toon partagés.
import {
  BoxGeometry, BufferAttribute, BufferGeometry, CapsuleGeometry, Color, CylinderGeometry, DodecahedronGeometry, DoubleSide, Group, Matrix4, Mesh,
  MeshBasicMaterial, Object3D, PlaneGeometry, SphereGeometry, type Material, type Texture,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { glow, toon } from "./toon";
import { PALETTE } from "./palette";
import { blobTexture, grassTexture, hazardTexture, rng, signTexture } from "./textures";

const geometryCache = new Map<string, any>();
function cached<T>(key: string, build: () => T): T {
  if (!geometryCache.has(key)) geometryCache.set(key, build());
  return geometryCache.get(key);
}

// ——— Fusion du décor statique ———

interface Bucket { material: Material; parts: BufferGeometry[]; renderOrder: number; castShadow: boolean; }

export interface BatchOptions {
  /** Couleur de sommet (matériaux à `vertexColors`). */
  color?: Color;
  castShadow?: boolean;
  renderOrder?: number;
  /** UV recalculées dans le monde (mètres ÷ valeur), projetées selon la normale : murs fusionnés. */
  worldUv?: number;
}

const KEEP = ["position", "normal", "uv"];

/**
 * Décor immobile fusionné par matériau et par case de `cell` mètres : quelques appels de dessin au lieu
 * de milliers, sans perdre l'élagage par la caméra. Les géométries sont recopiées dans le repère de `root`.
 */
export class StaticBatch {
  private buckets = new Map<string, Bucket>();
  constructor(readonly root: Object3D, readonly cell = 12) {}

  add(geometry: BufferGeometry, matrix: Matrix4, material: Material, options: BatchOptions = {}): void {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    for (const name of Object.keys(g.attributes)) if (!KEEP.includes(name)) g.deleteAttribute(name);
    g.morphAttributes = {};
    g.clearGroups();
    g.applyMatrix4(matrix);
    const pos = g.getAttribute("position") as BufferAttribute;
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    if (!g.getAttribute("uv") || options.worldUv) {
      const nrm = g.getAttribute("normal") as BufferAttribute;
      const uv = new Float32Array(pos.count * 2);
      const s = 1 / (options.worldUv ?? 1);
      for (let i = 0; i < pos.count; i++) {
        const nx = Math.abs(nrm.getX(i)), nz = Math.abs(nrm.getZ(i)), ny = Math.abs(nrm.getY(i));
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const [u, v] = ny > nx && ny > nz ? [x, z] : nx > nz ? [z, y] : [x, y];
        uv[i * 2] = u * s;
        uv[i * 2 + 1] = v * s;
      }
      g.setAttribute("uv", new BufferAttribute(uv, 2));
    }
    if ((material as { vertexColors?: boolean }).vertexColors) {
      const c = options.color ?? new Color(1, 1, 1);
      const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) { colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b; }
      g.setAttribute("color", new BufferAttribute(colors, 3));
    }
    const cx = Math.floor(matrix.elements[12] / this.cell), cz = Math.floor(matrix.elements[14] / this.cell);
    const order = options.renderOrder ?? 0;
    const cast = options.castShadow ?? true;
    const key = `${material.uuid}:${order}:${cast ? 1 : 0}:${cx}:${cz}`;
    let bucket = this.buckets.get(key);
    if (!bucket) this.buckets.set(key, (bucket = { material, parts: [], renderOrder: order, castShadow: cast }));
    bucket.parts.push(g);
  }

  /** Retire un maillage de la scène et le fond dans le lot (s'il est fusionnable). */
  absorb(m: Mesh): void {
    m.updateMatrix();
    if (Array.isArray(m.material) || m.matrix.determinant() < 0 || !m.visible) return;
    m.removeFromParent();
    this.add(m.geometry, m.matrix, m.material, { castShadow: m.castShadow, renderOrder: m.renderOrder });
  }

  /** Crée les maillages fusionnés ; renvoie leur nombre. */
  flush(): number {
    let count = 0;
    for (const b of this.buckets.values()) {
      const merged = b.parts.length === 1 ? b.parts[0] : mergeGeometries(b.parts, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const m = new Mesh(merged, b.material);
      m.castShadow = b.castShadow;
      m.receiveShadow = true;
      m.renderOrder = b.renderOrder;
      m.matrixAutoUpdate = false;
      m.userData.batched = true;
      this.root.add(m);
      for (const part of b.parts) if (part !== merged) part.dispose();
      count++;
    }
    this.buckets.clear();
    return count;
  }
}

let sink: StaticBatch | null = null;
/** Pendant la construction du monde, les petits décors anonymes posés sur `batch.root` y sont fondus. */
export function setStaticSink(batch: StaticBatch | null): void {
  sink = batch;
}
function settle(parent: Object3D, m: Mesh): void {
  if (sink && parent === sink.root) sink.absorb(m);
}

export function mesh(geometry: ConstructorParameters<typeof Mesh>[0], material: Material, x = 0, y = 0, z = 0, shadows = true): Mesh {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = shadows;
  m.receiveShadow = true;
  return m;
}

/** Boîte arrondie, posée sur le sol (y = bas de la boîte). */
export function block(parent: Object3D, w: number, h: number, d: number, color: string, x: number, y: number, z: number, radius = 0.04): Mesh {
  const r = Math.min(radius, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const geometry = cached(`rb:${w}:${h}:${d}:${r}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.max(0.001, r)));
  const m = mesh(geometry, toon(color), x, y + h / 2, z);
  parent.add(m);
  return m;
}

export function cylinder(parent: Object3D, radius: number, height: number, color: string, x: number, y: number, z: number, segments = 12): Mesh {
  const geometry = cached(`cyl:${radius}:${height}:${segments}`, () => new CylinderGeometry(radius, radius, height, segments));
  const m = mesh(geometry, toon(color), x, y + height / 2, z);
  parent.add(m);
  return m;
}

/** Décal plat posé au sol (mousse, flaque, brûlure…), légèrement surélevé pour éviter le z-fighting. */
export function decal(parent: Object3D, texture: Texture, x: number, z: number, w: number, d: number, rotation = 0, lift = 0.012): Mesh {
  const geometry = cached("plane", () => new PlaneGeometry(1, 1));
  const material = cached(`decal:${texture.uuid}`, () => toon("#ffffff", { map: texture, transparent: true, rim: 0 }));
  material.depthWrite = false;
  material.polygonOffset = true;
  material.polygonOffsetFactor = -2;
  const m = mesh(geometry, material, x, lift, z, false);
  m.rotation.set(-Math.PI / 2, 0, rotation);
  m.scale.set(w, d, 1);
  m.renderOrder = 1;
  parent.add(m);
  return m;
}

/** Panneau texturé vertical (affiche, pancarte). `facing` = lacet de la normale. */
export function panel(parent: Object3D, texture: Texture, x: number, y: number, z: number, w: number, h: number, facing: number, lit = false): Mesh {
  const geometry = cached("plane", () => new PlaneGeometry(1, 1));
  const material = lit ? cached(`panel-lit:${texture.uuid}`, () => new MeshBasicMaterial({ map: texture, transparent: true })) : cached(`panel:${texture.uuid}`, () => toon("#ffffff", { map: texture, transparent: true, rim: 0, side: DoubleSide }));
  const m = mesh(geometry, material, x, y, z, false);
  m.rotation.y = facing;
  m.scale.set(w, h, 1);
  parent.add(m);
  return m;
}

/** Touffe d'herbe sur deux plans croisés. */
export function grass(parent: Object3D, x: number, z: number, size = 0.5): void {
  const geometry = cached("plane", () => new PlaneGeometry(1, 1));
  const material = cached("grass-mat", () => toon("#ffffff", { map: grassTexture(), alphaTest: 0.5, side: DoubleSide, rim: 0 }));
  for (const angle of [0.4, 0.4 + Math.PI / 2]) {
    const m = mesh(geometry, material, x, size / 2 - 0.02, z, false);
    m.rotation.y = angle;
    m.scale.set(size, size, 1);
    parent.add(m);
    settle(parent, m);
  }
}

/** Cluster d'herbe et de mousse dans une fissure. */
export function overgrowth(parent: Object3D, x: number, z: number, spread = 0.8, seed = 1): void {
  const r = rng(seed);
  settle(parent, decal(parent, blobTexture("moss"), x, z, spread * 2, spread * 1.6, r() * 3));
  const tufts = 3 + Math.floor(r() * 4);
  for (let i = 0; i < tufts; i++) grass(parent, x + (r() - 0.5) * spread * 1.6, z + (r() - 0.5) * spread * 1.2, 0.35 + r() * 0.35);
}

/** Tas de gravats (dodécaèdres low-poly). */
export function rubble(parent: Object3D, x: number, z: number, count = 7, seed = 2, spread = 0.7): void {
  const r = rng(seed);
  const geometry = cached("rock", () => new DodecahedronGeometry(1, 0));
  for (let i = 0; i < count; i++) {
    const size = 0.08 + r() * 0.2;
    const m = mesh(geometry, toon(r() > 0.3 ? PALETTE.concreteDark : PALETTE.concrete), x + (r() - 0.5) * spread * 2, size * 0.6, z + (r() - 0.5) * spread * 2);
    m.scale.setScalar(size);
    m.rotation.set(r() * 3, r() * 3, r() * 3);
    parent.add(m);
    settle(parent, m);
  }
}

/** Ruban de bandes de sécurité au sol. */
export function hazardStrip(parent: Object3D, x: number, z: number, length: number, width = 0.22, rotation = 0): void {
  // Texture partagée, répétition inscrite dans les UV : toutes les bandes se fondent en un lot.
  const m = decal(parent, hazardTexture(), x, z, length, width, rotation, 0.014);
  const repeat = Math.max(1, Math.round(length / 0.9 * 4) / 4);
  m.geometry = cached(`hazard-plane:${repeat}`, () => {
    const g = new PlaneGeometry(1, 1);
    const uv = g.getAttribute("uv") as BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * repeat);
    return g;
  });
  settle(parent, m);
}

/** Boîte de conserve. */
export function can(parent: Object3D, x: number, z: number, color: string = PALETTE.rustLight, fallen = false): void {
  const m = cylinder(parent, 0.06, 0.13, color, x, fallen ? -0.005 : 0, z, 10);
  if (fallen) {
    m.rotation.z = Math.PI / 2;
    m.position.y = 0.06;
  }
  settle(parent, m);
}

/** Caisse en bois. */
export function crate(parent: Object3D, x: number, z: number, size = 0.6, rotation = 0, y = 0): Group {
  const g = new Group();
  g.position.set(x, y, z);
  g.rotation.y = rotation;
  block(g, size, size, size, PALETTE.wood, 0, 0, 0, 0.03);
  for (const s of [-1, 1]) {
    block(g, size + 0.02, 0.08, 0.06, PALETTE.woodDark, 0, size * 0.15, s * (size / 2), 0.01);
    block(g, size + 0.02, 0.08, 0.06, PALETTE.woodDark, 0, size * 0.75, s * (size / 2), 0.01);
  }
  parent.add(g);
  return g;
}

/** Guirlande lumineuse de fortune entre deux points (petites ampoules non éclairées). */
export function stringLights(parent: Object3D, ax: number, az: number, bx: number, bz: number, y: number, count = 9): void {
  const bulb = cached("bulb", () => new SphereGeometry(0.045, 8, 6));
  const colors = ["#ffd27a", "#ff9b6b", "#9ff0e2", "#ffe9b0"];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const sag = Math.sin(t * Math.PI) * 0.35;
    const m = mesh(bulb, glow(colors[i % colors.length]), ax + (bx - ax) * t, y - sag, az + (bz - az) * t, false);
    parent.add(m);
    settle(parent, m);
  }
  const cable = cached("cable", () => new CylinderGeometry(0.008, 0.008, 1, 4));
  for (let i = 0; i < count; i++) {
    const t0 = i / count;
    const t1 = (i + 1) / count;
    const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, y0 = y - Math.sin(t0 * Math.PI) * 0.35;
    const x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1, y1 = y - Math.sin(t1 * Math.PI) * 0.35;
    const m = mesh(cable, toon(PALETTE.outline), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, false);
    const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    m.scale.y = len;
    m.lookAt(x1, y1, z1);
    m.rotateX(Math.PI / 2);
    parent.add(m);
    settle(parent, m);
  }
}

/** Câble arraché qui pend du haut d'un mur. */
export function cable(parent: Object3D, x: number, z: number, height: number, color: string = PALETTE.outline): void {
  const geometry = cached(`cable-v:${height}`, () => new CapsuleGeometry(0.025, height, 2, 5));
  const m = mesh(geometry, toon(color), x, height / 2 + 0.3, z);
  m.rotation.z = 0.15;
  parent.add(m);
  settle(parent, m);
}

export function signBoard(parent: Object3D, text: string, x: number, y: number, z: number, w: number, h: number, facing: number, colors: { bg?: string; fg?: string; border?: string } = {}): Mesh {
  return panel(parent, signTexture(text, { ...colors, width: 512, height: Math.round((512 * h) / w) }), x, y, z, w, h, facing);
}

export { BoxGeometry };
