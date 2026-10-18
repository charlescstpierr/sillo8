// Flèche d'objectif : petit chevron toon posé au sol, qui tourne autour du bricoleur vers le prochain
// point de passage (porte ou cible). Discret : apparaît en grandissant, respire doucement, disparaît près du but.
import { ExtrudeGeometry, Group, Mesh, Shape } from "three";
import { addOutline, toon } from "./toon";
import { PALETTE } from "./palette";

/** Distance du chevron au centre du bricoleur (m). */
const ORBIT = 1.75;
/** Taille du chevron (0,44 m × 1,3). */
const SIZE = 1.3;

export interface GuideView {
  readonly root: Group;
  /** `visible` : la flèche doit être montrée ; (tx, tz) : point visé. */
  update(dt: number, elapsed: number, x: number, z: number, tx: number, tz: number, visible: boolean): void;
}

function chevronShape(): Shape {
  // Pointe vers +Z (avant), 0,44 m de large.
  const s = new Shape();
  s.moveTo(0, 0.2);
  s.lineTo(0.22, -0.04);
  s.lineTo(0.14, -0.12);
  s.lineTo(0, 0.04);
  s.lineTo(-0.14, -0.12);
  s.lineTo(-0.22, -0.04);
  s.closePath();
  return s;
}

export function buildGuide(): GuideView {
  const root = new Group();
  root.name = "guide";
  const pivot = new Group();
  root.add(pivot);
  const geometry = new ExtrudeGeometry(chevronShape(), { depth: 0.05, bevelEnabled: false });
  // Le profil est dessiné dans le plan XY : on le couche au sol, pointe vers +Z.
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, 0.07, 0);
  const chevron = new Mesh(geometry, toon(PALETTE.rustLight, { emissive: PALETTE.rust, emissiveIntensity: 0.25, rim: 0 }));
  chevron.castShadow = false;
  chevron.receiveShadow = false;
  chevron.renderOrder = 2;
  addOutline(chevron, 0.018);
  pivot.add(chevron);
  root.visible = false;
  let scale = 0;

  return {
    root,
    update(dt, elapsed, x, z, tx, tz, visible) {
      const target = visible ? 1 : 0;
      scale += (target - scale) * Math.min(1, dt * 6);
      if (scale < 0.02 && !visible) {
        root.visible = false;
        scale = 0;
        return;
      }
      root.visible = true;
      const yaw = Math.atan2(tx - x, tz - z);
      root.position.set(x, 0, z);
      pivot.rotation.y = yaw;
      // Respiration légère vers l'avant.
      chevron.position.set(0, 0, ORBIT + Math.sin(elapsed * 3.2) * 0.08);
      chevron.scale.setScalar(scale * SIZE);
    },
  };
}
