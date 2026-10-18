// Rendu des objets d'enquête dans le décor : marqueurs des objets examinables (affiche, photo, seuil, plaque,
// tiroir), petits décors nécessaires à l'histoire (armoire, raclures, craie), et effets des événements étranges
// (lueur au loin, silhouette). Style jouet : formes simples, contour d'encre, papier crème.
import {
  AdditiveBlending, CanvasTexture, CapsuleGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry, PointLight,
  SphereGeometry, SRGBColorSpace, Texture,
} from "three";
import type { InvestigationContent, Prop, WorldMarker } from "../investigation/types";
import type { SiloState } from "../state";
import { PALETTE } from "./palette";
import { block, cylinder, mesh, panel } from "./props";
import { toon } from "./toon";

const CACHE = new Map<string, Texture>();
function canvasTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): Texture {
  if (typeof document === "undefined") return new Texture();
  const cached = CACHE.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d");
  if (g) draw(g, w, h);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  CACHE.set(key, texture);
  return texture;
}

const INK = "#3a2a1c";

/** Feuille crème avec titre et lignes griffonnées. */
function paperSheet(key: string, title: string, lines: number, w = 256, h = 320): Texture {
  return canvasTexture(key, w, h, (g) => {
    g.fillStyle = "#f4ecd6";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = INK;
    g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = INK;
    g.font = `bold ${Math.floor(w * 0.13)}px 'Special Elite', 'Courier New', monospace`;
    g.textAlign = "center";
    g.textBaseline = "top";
    g.fillText(title, w / 2, h * 0.06);
    g.fillStyle = "rgba(58,42,28,0.55)";
    for (let i = 0; i < lines; i++) g.fillRect(w * 0.12, h * (0.3 + i * 0.09), w * (0.76 - (i % 3) * 0.12), Math.max(3, h * 0.014));
  });
}

function photoTexture(): Texture {
  return canvasTexture("inq-photo", 256, 180, (g, w, h) => {
    g.fillStyle = "#efe6cf";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#8c8170";
    g.fillRect(12, 12, w - 24, h - 40);
    // Porte neuve et rangée de gens.
    g.fillStyle = "#5d564b";
    g.fillRect(w * 0.38, 22, w * 0.24, h * 0.42);
    g.fillStyle = "#e8dcc0";
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      g.arc(26 + i * 15.5, h * 0.58 + (i % 2) * 4, 6, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#3a2a1c";
    g.fillRect(48, h * 0.62, 26, 34);
  });
}

function chalkTexture(text: string): Texture {
  return canvasTexture(`inq-chalk:${text}`, 512, 200, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(245,245,238,0.92)";
    g.font = `bold ${Math.floor(h * 0.3)}px 'Patrick Hand', 'Comic Sans MS', sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      g.save();
      g.translate(w / 2, h / 2 + (i - (lines.length - 1) / 2) * h * 0.38);
      g.rotate(-0.04 + i * 0.03);
      g.fillText(line, 0, 0);
      g.restore();
    });
  });
}

function scrapesTexture(): Texture {
  return canvasTexture("inq-scrapes", 256, 128, (g, w, h) => {
    g.strokeStyle = "rgba(40,28,18,0.55)";
    g.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      g.lineWidth = 3 + (i % 3);
      g.beginPath();
      g.arc(w / 2, h * 1.6, h * (0.9 + i * 0.12), Math.PI * 1.25, Math.PI * 1.75);
      g.stroke();
    }
  });
}

function dustTexture(): Texture {
  return canvasTexture("inq-dust", 256, 256, (g, w, h) => {
    g.fillStyle = "#b9ad93";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(90,70,50,0.25)";
    for (let i = 0; i < 160; i++) {
      const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const y = (Math.sin(i * 78.233) * 12543.123) % 1;
      g.fillRect(Math.abs(x) * w, Math.abs(y) * h, 3, 3);
    }
  });
}

function glowTexture(): Texture {
  return canvasTexture("inq-glow", 128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

/** Modèle d'un objet examinable, centré sur sa position, avec sa hauteur d'infobulle. */
function marker(m: WorldMarker, label: string): { group: Group; height: number } {
  const g = new Group();
  let height = 1.2;
  switch (m.shape) {
    case "photo": {
      // Caisse renversée et photo posée dessus, légèrement de travers.
      block(g, 0.5, 0.42, 0.42, PALETTE.wood, 0, 0, 0, 0.03);
      const frame = block(g, 0.36, 0.03, 0.27, "#efe6cf", 0, 0.42, 0, 0.01);
      frame.rotation.y = 0.2;
      const pic = panel(g, photoTexture(), 0, 0.452, 0, 0.32, 0.23, 0);
      pic.rotation.set(-Math.PI / 2, 0, 0.2);
      height = 1.0;
      break;
    }
    case "step": {
      // Marche usée devant la porte de service, poussière.
      block(g, 1.5, 0.08, 0.9, "#8d8b80", 0, 0, 0, 0.03);
      const dust = panel(g, dustTexture(), 0, 0.085, 0, 1.3, 0.75, 0);
      dust.rotation.set(-Math.PI / 2, 0, 0);
      height = 0.8;
      break;
    }
    case "poster": {
      // Panneau d'affichage sur pieds, l'avis punaisé.
      for (const x of [-0.42, 0.42]) block(g, 0.06, 1.55, 0.06, PALETTE.woodDark, x, 0, -0.04, 0.01);
      block(g, 1.0, 0.9, 0.05, "#7a5a3a", 0, 0.75, 0, 0.02);
      panel(g, paperSheet(`inq-poster:${label}`, label, 6, 256, 300), 0, 1.2, 0.032, 0.72, 0.84, 0);
      g.add(mesh(new SphereGeometry(0.03, 8, 6), toon(PALETTE.danger), 0, 1.6, 0.05, false));
      height = 2.0;
      break;
    }
    case "plaque": {
      const y = m.y ?? 1.25;
      block(g, 0.86, 0.66, 0.04, "#6a4528", 0, y - 0.33, 0, 0.01);
      panel(g, paperSheet(`inq-plaque:${label}`, label, 5, 320, 240), 0, y, 0.025, 0.78, 0.58, 0);
      height = y + 0.6;
      break;
    }
    case "drawer": {
      // Tiroir entrouvert sous le plateau du bureau, poignée de laiton.
      block(g, 0.5, 0.16, 0.34, "#7a4a2a", 0, 0.52, -0.12, 0.02);
      cylinder(g, 0.025, 0.12, "#d8a43a", 0, 0.58, 0.07, 8).rotation.z = Math.PI / 2;
      height = 1.2;
      break;
    }
    case "sheet": {
      const sheet = panel(g, paperSheet(`inq-sheet:${label}`, label, 4), 0, 0.02, 0, 0.34, 0.44, 0);
      sheet.rotation.set(-Math.PI / 2, 0, 0.3);
      height = 0.6;
      break;
    }
    case "glint": {
      // L'objet est déjà dessiné par le décor (game/render/storyProps.ts) : un disque invisible à sa hauteur, que le
      // contour blanc entoure quand Lou est à portée.
      const y = m.y ?? 0.05;
      const disc = mesh(new CylinderGeometry(0.24, 0.24, 0.02, 20), new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), 0, y, 0, false);
      g.add(disc);
      height = y + 0.9;
      break;
    }
    case "bolts": {
      // Trois gros verrous sur une platine, du côté dehors.
      const y = m.y ?? 1.0;
      block(g, 0.34, 1.0, 0.05, "#6d6152", 0, y - 0.5, 0, 0.01);
      for (const dy of [-0.32, 0, 0.32]) {
        cylinder(g, 0.05, 0.42, "#9a8f7c", 0, y + dy, 0.07, 10).rotation.z = Math.PI / 2;
        block(g, 0.1, 0.12, 0.08, "#4e4337", 0.14, y + dy - 0.06, 0.05, 0.01);
      }
      height = y + 0.8;
      break;
    }
    case "lantern": {
      // Lanterne d'enfant posée sur une caisse, verre blanc.
      block(g, 0.44, 0.34, 0.36, PALETTE.wood, 0, 0, 0, 0.03);
      cylinder(g, 0.1, 0.05, "#5c5244", 0, 0.34, 0, 12);
      g.add(mesh(new SphereGeometry(0.09, 12, 10), toon("#f4f1e6"), 0, 0.47, 0, false));
      cylinder(g, 0.07, 0.04, "#5c5244", 0, 0.56, 0, 10);
      height = 1.0;
      break;
    }
    case "levers": {
      // Tableau de 4 leviers au mur.
      const y = m.y ?? 1.0;
      block(g, 1.2, 0.8, 0.08, "#5d6a72", 0, y - 0.4, 0, 0.02);
      for (let i = 0; i < 4; i++) {
        const x = -0.42 + i * 0.28;
        block(g, 0.06, 0.32, 0.06, "#2c2c2c", x, y - 0.1, 0.07, 0.01);
        g.add(mesh(new SphereGeometry(0.05, 10, 8), toon(PALETTE.danger), x, y + 0.24, 0.1, false));
      }
      height = y + 0.7;
      break;
    }
    case "terminal": {
      // Petit terminal sur un pupitre, écran vert éteint, post-it jaune.
      block(g, 0.7, 0.75, 0.5, "#6a5a48", 0, 0, 0, 0.03);
      block(g, 0.5, 0.38, 0.36, "#d8d0bb", 0, 0.75, -0.04, 0.04);
      block(g, 0.36, 0.24, 0.02, "#22302a", 0, 0.82, 0.15, 0.01);
      block(g, 0.09, 0.09, 0.01, "#ffe36b", 0.15, 0.97, 0.165, 0.004);
      height = 1.5;
      break;
    }
    case "locker": {
      // Armoire métallique étroite, avec cadenas.
      block(g, 0.75, 1.7, 0.5, "#7c8a6a", 0, 0, 0, 0.03);
      block(g, 0.02, 1.5, 0.02, INK, 0, 0.1, 0.26, 0.005);
      block(g, 0.1, 0.12, 0.05, "#d8a43a", 0.08, 0.9, 0.28, 0.01);
      height = 2.0;
      break;
    }
    case "lamp": {
      // Petite lampe (chevet ou lampe de poche) sur un support.
      block(g, 0.4, 0.5, 0.4, "#7a5a3a", 0, 0, 0, 0.03);
      cylinder(g, 0.05, 0.25, "#5c5244", 0, 0.5, 0, 10);
      g.add(mesh(new SphereGeometry(0.1, 12, 10), toon("#d9e6c9"), 0, 0.8, 0, false));
      height = 1.2;
      break;
    }
  }
  return { group: g, height };
}

function prop(p: Prop): Group {
  const g = new Group();
  g.position.set(p.x, 0, p.z);
  g.rotation.y = p.yaw;
  switch (p.kind) {
    case "cabinet": {
      // Grande armoire métallique, légèrement de travers (elle a bougé).
      block(g, 1.3, 1.95, 0.55, "#7c8a6a", 0, 0, 0, 0.04);
      block(g, 0.04, 1.7, 0.02, INK, 0, 0.12, 0.28, 0.005);
      for (const x of [-0.12, 0.12]) cylinder(g, 0.025, 0.18, "#d8a43a", x, 0.95, 0.3, 6);
      g.rotation.y = p.yaw + 0.06;
      break;
    }
    case "scrapes": {
      const m = panel(g, scrapesTexture(), 0, 0.02, 0, 1.4, 0.7, 0);
      m.rotation.set(-Math.PI / 2, 0, 0);
      break;
    }
    case "chalk": {
      panel(g, chalkTexture(p.text), 0, p.y, 0, 2.2, 0.86, 0, true);
      break;
    }
  }
  return g;
}

interface Effect { mesh: Mesh; light?: PointLight; t: number; duration: number; from?: [number, number]; to?: [number, number] }

const PLANE = new PlaneGeometry(1, 1);

export class InquiryView {
  readonly root = new Group();
  /** Groupes des objets examinables (posés par le moteur parmi les objets interactifs). */
  readonly markers = new Map<string, { group: Group; height: number }>();
  private effects: Effect[] = [];
  /** Une seule lumière, créée d'avance : en ajouter une en cours de jeu recompilerait tous les matériaux. */
  private readonly glowLight = new PointLight("#ffffff", 0, 6, 1.6);

  constructor(content: InvestigationContent) {
    this.root.name = "inquiry";
    this.glowLight.castShadow = false;
    this.root.add(this.glowLight);
    for (const e of content.examinables) {
      if (e.carried) continue;
      const built = marker(e.marker, e.marker.label ?? e.name);
      built.group.position.set(e.x, 0, e.z);
      built.group.rotation.y = e.marker.yaw ?? 0;
      this.root.add(built.group);
      this.markers.set(e.id, built);
    }
    for (const p of content.props) this.root.add(prop(p));
  }

  /** Lueur colorée qui monte puis s'éteint (ex. vert sous la porte de la salle de contrôle). */
  glow(x: number, z: number, y: number, color: string, duration: number): void {
    const material = new MeshBasicMaterial({ map: glowTexture(), color, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending });
    const m = new Mesh(PLANE, material);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.scale.set(2.6, 1.4, 1);
    m.renderOrder = 3;
    const light = this.glowLight;
    light.color.set(color);
    light.position.set(x, 0.6, z);
    this.root.add(m);
    this.effects.push({ mesh: m, light, t: 0, duration });
  }

  /** Silhouette sombre qui traverse au loin, puis disparaît. */
  silhouette(x: number, z: number, toX: number, toZ: number, duration: number): void {
    const material = new MeshBasicMaterial({ color: "#0b0806", transparent: true, opacity: 0 });
    const m = new Mesh(new CapsuleGeometry(0.28, 1.1, 4, 8), material);
    m.position.set(x, 0.85, z);
    this.root.add(m);
    this.effects.push({ mesh: m, t: 0, duration, from: [x, z], to: [toX, toZ] });
  }

  update(dt: number, _state: SiloState): void {
    if (!this.effects.length) return;
    for (const e of this.effects) {
      e.t += dt;
      const k = Math.min(1, e.t / e.duration);
      // Monte vite, tient, s'éteint.
      const level = k < 0.2 ? k / 0.2 : k > 0.75 ? (1 - k) / 0.25 : 1;
      (e.mesh.material as MeshBasicMaterial).opacity = (e.from ? 0.85 : 0.9) * level;
      if (e.light) e.light.intensity = 2.2 * level;
      if (e.from && e.to) e.mesh.position.set(e.from[0] + (e.to[0] - e.from[0]) * k, 0.85, e.from[1] + (e.to[1] - e.from[1]) * k);
    }
    const done = this.effects.filter((e) => e.t >= e.duration);
    for (const e of done) {
      this.root.remove(e.mesh);
      if (e.light) e.light.intensity = 0;
      (e.mesh.material as MeshBasicMaterial).dispose();
    }
    this.effects = this.effects.filter((e) => e.t < e.duration);
  }

  /** Effets en cours (tests). */
  get activeEffects(): number {
    return this.effects.length;
  }
}
