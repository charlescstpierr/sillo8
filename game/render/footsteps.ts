// Petits nuages de poussière sous les pas : réserve fixe de bouffées (aucune allocation par image).
// Chaque conteneur (la scène de l'opératrice) reçoit sa propre réserve, créée au premier pas.
import { Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, type Object3D } from "three";

const COUNT = 14;
const LIFE = 0.55;

interface Puff {
  mesh: Mesh;
  material: MeshBasicMaterial;
  age: number;
  size: number;
  vx: number;
  vz: number;
}

interface Pool {
  group: Group;
  puffs: Puff[];
  next: number;
}

let low = false;
let geometry: IcosahedronGeometry | null = null;
const pools = new WeakMap<Object3D, Pool>();

/** Qualité réduite : plus aucune bouffée (appelé par setZombieQuality, relayé par la horde). */
export function setDustQuality(value: boolean): void {
  low = value;
}

export function dustEnabled(): boolean {
  return !low;
}

function pool(container: Object3D): Pool {
  let p = pools.get(container);
  if (p) return p;
  geometry ??= new IcosahedronGeometry(0.12, 1);
  const group = new Group();
  group.name = "Dust";
  const puffs: Puff[] = [];
  for (let i = 0; i < COUNT; i++) {
    const material = new MeshBasicMaterial({ color: "#efe3c6", transparent: true, opacity: 0, depthWrite: false });
    const mesh = new Mesh(geometry, material);
    mesh.visible = false;
    mesh.userData.noOutline = true;
    mesh.raycast = () => {};
    group.add(mesh);
    puffs.push({ mesh, material, age: LIFE, size: 1, vx: 0, vz: 0 });
  }
  container.add(group);
  p = { group, puffs, next: 0 };
  pools.set(container, p);
  return p;
}

/** Lâche une bouffée au sol en (x, z) ; `size` ≈ 1 pour un pas de marche, `vx/vz` = dérive (m/s). */
export function puffDust(container: Object3D, x: number, z: number, size: number, vx = 0, vz = 0): void {
  if (low) return;
  const p = pool(container);
  const puff = p.puffs[p.next];
  p.next = (p.next + 1) % COUNT;
  puff.age = 0;
  puff.size = size;
  puff.vx = vx;
  puff.vz = vz;
  puff.mesh.position.set(x, 0.09, z);
  puff.mesh.rotation.y = x * 7.3 + z * 3.1;
  puff.mesh.visible = true;
}

/** Fait gonfler, monter et s'effacer les bouffées actives. */
export function updateDust(container: Object3D, dt: number): void {
  const p = pools.get(container);
  if (!p) return;
  for (const puff of p.puffs) {
    if (!puff.mesh.visible) continue;
    puff.age += dt;
    const k = puff.age / LIFE;
    if (k >= 1 || low) {
      puff.mesh.visible = false;
      continue;
    }
    const grow = puff.size * (0.6 + 1.1 * Math.sqrt(k));
    puff.mesh.scale.set(grow, grow * 0.55, grow);
    puff.mesh.position.x += puff.vx * dt * (1 - k);
    puff.mesh.position.z += puff.vz * dt * (1 - k);
    puff.mesh.position.y += dt * 0.18;
    puff.material.opacity = 0.6 * (1 - k) * (1 - k);
  }
}
