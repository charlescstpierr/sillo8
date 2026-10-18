// Textures procédurales (canvas) : couleurs plates + quelques décals simples, dessinés une fois.
// Déterministes (graine fixe) pour des captures reproductibles.
import { CanvasTexture, ClampToEdgeWrapping, RepeatWrapping, SRGBColorSpace, type Texture } from "three";
import { PALETTE } from "./palette";

export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, Texture>();

function make(key: string, width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat = true): Texture {
  const cached = cache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext("2d")!;
  draw(g, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  texture.anisotropy = 4;
  cache.set(key, texture);
  return texture;
}

function crack(g: CanvasRenderingContext2D, r: () => number, x: number, y: number, length: number, color: string, width = 2) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(x, y);
  let angle = r() * Math.PI * 2;
  for (let i = 0; i < 6; i++) {
    angle += (r() - 0.5) * 1.2;
    x += Math.cos(angle) * (length / 6);
    y += Math.sin(angle) * (length / 6);
    g.lineTo(x, y);
    if (r() < 0.3) {
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(angle + 1) * length * 0.15, y + Math.sin(angle + 1) * length * 0.15);
      g.moveTo(x, y);
    }
  }
  g.stroke();
}

/** Tache douce (dégradé radial) : base de toutes les salissures peintes. */
function soft(g: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number, sx = 1, sy = 1): void {
  g.save();
  g.translate(x, y);
  g.scale(sx, sy);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, radius);
  grad.addColorStop(0, color.replace("A", String(alpha)));
  grad.addColorStop(1, color.replace("A", "0"));
  g.fillStyle = grad;
  g.fillRect(-radius, -radius, radius * 2, radius * 2);
  g.restore();
}

/** Bord biseauté d'une case : liseré clair en haut à gauche, ombre en bas à droite (lecture « jouet »). */
function bevel(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, light: string, dark: string, size = 2): void {
  g.fillStyle = light;
  g.fillRect(x, y, w, size);
  g.fillRect(x, y, size, h);
  g.fillStyle = dark;
  g.fillRect(x, y + h - size, w, size);
  g.fillRect(x + w - size, y, size, h);
}

export type TileVariant = "terrazzo" | "checker" | "small" | "parquet";

/**
 * Carrelage des salles vivantes. 1 texture = 2 × 2 m. Les variations à grande échelle (teinte, usure,
 * flaques) viennent du shader de sol : la texture reste sobre pour ne pas se répéter à l'œil.
 * terrazzo : sécurité, contrôle · checker : damier crème/moutarde de la cafétéria ·
 * small : petits carreaux blancs de l'infirmerie · parquet : lames de bois des dortoirs.
 */
export function tilesTexture(variant: TileVariant = "terrazzo"): Texture {
  return make("tiles-" + variant, 512, 512, (g, w, h) => {
    const r = rng(7 + variant.length);
    if (variant === "parquet") {
      // Lames de 25 cm, longueurs variées, veinure douce.
      const rows = 8, lane = h / rows;
      g.fillStyle = "#6e4a30";
      g.fillRect(0, 0, w, h);
      for (let j = 0; j < rows; j++) {
        let x = -((j * 97) % 160);
        while (x < w) {
          const len = 140 + Math.floor(r() * 4) * 40;
          const tone = ["#ab9070", "#9d8264", "#b49a7a", "#94795c"][Math.floor(r() * 4)];
          g.fillStyle = tone;
          g.fillRect(x + 2, j * lane + 2, len - 4, lane - 4);
          g.strokeStyle = "rgba(90,60,35,0.25)";
          g.lineWidth = 1.5;
          for (let k = 0; k < 3; k++) {
            const y = j * lane + 8 + r() * (lane - 16);
            g.beginPath(); g.moveTo(x + 6, y); g.bezierCurveTo(x + len * 0.3, y + 4, x + len * 0.6, y - 4, x + len - 6, y + 1); g.stroke();
          }
          bevel(g, x + 2, j * lane + 2, len - 4, lane - 4, "rgba(255,235,200,0.18)", "rgba(60,35,20,0.25)", 2);
          x += len;
        }
      }
      return;
    }
    const n = variant === "small" ? 8 : 4;
    const cell = w / n;
    const grout = variant === "small" ? "#b9bcae" : variant === "checker" ? "#8c7656" : "#a69f88";
    g.fillStyle = grout;
    g.fillRect(0, 0, w, h);
    const gap = variant === "small" ? 2 : 3;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const shade = 0.96 + r() * 0.06;
      let base: [number, number, number];
      if (variant === "checker") base = (i + j) % 2 ? [204, 170, 116] : [234, 226, 204];
      else if (variant === "small") base = [236, 238, 228];
      else base = [222, 214, 192];
      g.fillStyle = `rgb(${Math.round(base[0] * shade)},${Math.round(base[1] * shade)},${Math.round(base[2] * shade)})`;
      g.fillRect(i * cell + gap, j * cell + gap, cell - gap * 2, cell - gap * 2);
      bevel(g, i * cell + gap, j * cell + gap, cell - gap * 2, cell - gap * 2, "rgba(255,255,245,0.35)", "rgba(80,65,45,0.18)", variant === "small" ? 2 : 3);
    }
    if (variant === "terrazzo") {
      // Éclats du terrazzo, très fins.
      const colors = ["#9b9583", "#7f8a7a", "#b7ad93", "#c29a6a"];
      g.globalAlpha = 0.4;
      for (let k = 0; k < 700; k++) {
        g.fillStyle = colors[Math.floor(r() * colors.length)];
        const s = 1 + r() * 2.5;
        g.beginPath(); g.ellipse(r() * w, r() * h, s, s * (0.5 + r() * 0.5), r() * Math.PI, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
    }
    // Un carreau fendu, un coin ébréché : rares, pour ne pas marquer la répétition.
    g.strokeStyle = "rgba(60,50,40,0.45)";
    g.lineWidth = 2;
    const i = Math.floor(r() * n), j = Math.floor(r() * n);
    g.beginPath(); g.moveTo(i * cell + 5, j * cell + r() * cell); g.lineTo((i + 1) * cell - 5, j * cell + r() * cell); g.stroke();
    g.fillStyle = grout;
    g.beginPath(); g.moveTo(cell * 2 + gap, cell + gap); g.lineTo(cell * 2 + gap + 14, cell + gap); g.lineTo(cell * 2 + gap, cell + gap + 10); g.fill();
  });
}

/** Plaques d'acier du hub, rivets et motif antidérapant. 1 texture = 2 × 2 m (2 × 2 plaques). */
export function liftTexture(): Texture {
  return make("lift", 512, 512, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = "#5f6a6c";
    g.fillRect(0, 0, w, h);
    const plate = w / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x0 = i * plate + 3, y0 = j * plate + 3, s = plate - 6;
      g.fillStyle = ["#9aa4a3", "#8f9a9a", "#a3aba7", "#949e9c"][i + j * 2];
      g.fillRect(x0, y0, s, s);
      // Motif antidérapant en chevrons réguliers.
      g.strokeStyle = "rgba(70,80,84,0.32)";
      g.lineWidth = 4;
      g.lineCap = "round";
      for (let y = 26; y < s - 16; y += 26) for (let x = 26; x < s - 16; x += 26) {
        const a = ((x + y) / 26) % 2 ? Math.PI / 4 : -Math.PI / 4;
        g.beginPath(); g.moveTo(x0 + x - Math.cos(a) * 7, y0 + y - Math.sin(a) * 7); g.lineTo(x0 + x + Math.cos(a) * 7, y0 + y + Math.sin(a) * 7); g.stroke();
      }
      bevel(g, x0, y0, s, s, "rgba(255,255,240,0.3)", "rgba(30,35,38,0.35)", 4);
      for (const [x, y] of [[14, 14], [s - 14, 14], [14, s - 14], [s - 14, s - 14], [s / 2, 12], [s / 2, s - 12]]) {
        g.fillStyle = "#5d686b";
        g.beginPath(); g.arc(x0 + x, y0 + y, 5, 0, Math.PI * 2); g.fill();
        g.fillStyle = "rgba(255,255,240,0.45)";
        g.beginPath(); g.arc(x0 + x - 1.5, y0 + y - 1.5, 2, 0, Math.PI * 2); g.fill();
      }
    }
    for (let k = 0; k < 4; k++) soft(g, r() * w, r() * h, 30 + r() * 40, "rgba(60,50,40,A)", 0.1);
  });
}

/** Béton gris-vert des murs : banché (joints horizontaux), taches douces, coulures de rouille. 1 texture = 2,5 m. */
export function concreteTexture(): Texture {
  return make("concrete", 256, 256, (g, w, h) => {
    const r = rng(3);
    g.fillStyle = PALETTE.concrete;
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 30; k++) soft(g, r() * w, r() * h, 12 + r() * 34, r() > 0.5 ? "rgba(255,255,240,A)" : "rgba(40,50,40,A)", 0.09, 1, 0.6);
    // Joints de banches et trous de tiges.
    g.fillStyle = "rgba(50,58,48,0.22)";
    for (const y of [h * 0.32, h * 0.66]) g.fillRect(0, y, w, 2);
    g.fillStyle = "rgba(50,58,48,0.35)";
    for (let x = 32; x < w; x += 64) for (const y of [h * 0.16, h * 0.5, h * 0.84]) { g.beginPath(); g.arc(x, y, 2.5, 0, Math.PI * 2); g.fill(); }
    // Coulures de rouille
    for (let k = 0; k < 3; k++) {
      const x = r() * w;
      const grad = g.createLinearGradient(x, 0, x, h * 0.7);
      grad.addColorStop(0, "rgba(168,86,46,0.35)");
      grad.addColorStop(1, "rgba(168,86,46,0)");
      g.fillStyle = grad;
      g.fillRect(x, 0, 2 + r() * 4, h * 0.7);
    }
    crack(g, r, r() * w, r() * h, 60, "rgba(50,55,45,0.4)", 1.5);
  });
}


/** Bandes de sécurité jaunes et noires. */
export function hazardTexture(): Texture {
  return make("hazard", 128, 32, (g, w, h) => {
    g.fillStyle = PALETTE.yellow;
    g.fillRect(0, 0, w, h);
    g.fillStyle = PALETTE.stripeDark;
    for (let x = -h; x < w + h; x += 32) {
      g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.closePath(); g.fill();
    }
  });
}

/** Tache organique à bords irréguliers (mousse, flaque, brûlure, rouille). */
export function blobTexture(kind: "moss" | "puddle" | "scorch" | "rust" | "shadow"): Texture {
  return make("blob-" + kind, 256, 256, (g, w, h) => {
    const r = rng(kind.length * 17);
    const colors: Record<string, [string, string]> = {
      moss: ["rgba(111,154,60,0.95)", "rgba(140,193,82,0.9)"],
      puddle: ["rgba(70,110,118,0.75)", "rgba(150,200,205,0.55)"],
      scorch: ["rgba(30,22,18,0.8)", "rgba(60,45,35,0.45)"],
      rust: ["rgba(168,86,46,0.75)", "rgba(201,119,63,0.5)"],
      shadow: ["rgba(20,15,10,0.55)", "rgba(20,15,10,0)"],
    };
    const [inner, outer] = colors[kind];
    if (kind === "shadow") {
      const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grad.addColorStop(0, inner);
      grad.addColorStop(1, outer);
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      return;
    }
    for (let k = 0; k < 14; k++) {
      g.fillStyle = k % 3 === 0 ? outer : inner;
      const radius = 30 + r() * 50;
      const angle = r() * Math.PI * 2;
      const dist = r() * 55;
      g.beginPath();
      g.arc(w / 2 + Math.cos(angle) * dist, h / 2 + Math.sin(angle) * dist, radius * (kind === "puddle" ? 0.9 : 0.7), 0, Math.PI * 2);
      g.fill();
    }
    if (kind === "moss") {
      g.fillStyle = "rgba(240,235,200,0.9)";
      for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(70 + r() * 116, 70 + r() * 116, 3, 0, Math.PI * 2); g.fill(); }
    }
    if (kind === "puddle") {
      g.strokeStyle = "rgba(230,245,240,0.6)";
      g.lineWidth = 3;
      g.beginPath(); g.arc(w * 0.42, h * 0.45, 26, 3.6, 4.6); g.stroke();
    }
  }, false);
}

/** Touffe d'herbe en découpe alpha, posée sur deux plans croisés. */
export function grassTexture(): Texture {
  return make("grass", 128, 128, (g, w, h) => {
    const r = rng(5);
    for (let k = 0; k < 14; k++) {
      const base = w / 2 + (r() - 0.5) * 50;
      const tipX = base + (r() - 0.5) * 60;
      const tipY = 8 + r() * 40;
      g.fillStyle = k % 2 ? PALETTE.grass : PALETTE.leaf;
      g.beginPath();
      g.moveTo(base - 6, h);
      g.quadraticCurveTo(base - 2, (h + tipY) / 2, tipX, tipY);
      g.quadraticCurveTo(base + 4, (h + tipY) / 2, base + 6, h);
      g.closePath();
      g.fill();
    }
    g.fillStyle = "#f6f1df";
    for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(30 + r() * 68, 20 + r() * 40, 5, 0, Math.PI * 2); g.fill(); }
  }, false);
}

/** Panneau peint au pochoir (secteurs, consignes). */
export function signTexture(text: string, options: { bg?: string; fg?: string; font?: string; width?: number; height?: number; border?: string } = {}): Texture {
  const width = options.width ?? 512;
  const height = options.height ?? 128;
  return make("sign:" + JSON.stringify([text, options]), width, height, (g, w, h) => {
    g.fillStyle = options.bg ?? PALETTE.paper;
    g.fillRect(0, 0, w, h);
    if (options.border) {
      g.strokeStyle = options.border;
      g.lineWidth = 8;
      g.strokeRect(6, 6, w - 12, h - 12);
    }
    g.fillStyle = options.fg ?? PALETTE.outline;
    const lines = text.split("\n");
    const size = Math.min(h / (lines.length * 1.25), (w * 1.6) / Math.max(...lines.map((l) => l.length)));
    g.font = `${Math.floor(size)}px ${options.font ?? "'Special Elite', monospace"}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    lines.forEach((line, i) => g.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.15));
    // Usure
    const r = rng(text.length);
    g.globalCompositeOperation = "destination-out";
    for (let k = 0; k < 40; k++) { g.globalAlpha = 0.3; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 4, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }, false);
}

/** Dessin d'enfant scotché au mur : un soleil, un arbre et une maison. Indice que la surface vit. */
export function drawingTexture(): Texture {
  return make("drawing", 256, 200, (g, w, h) => {
    g.fillStyle = "#f7f1e1";
    g.fillRect(0, 0, w, h);
    g.lineWidth = 6;
    g.lineCap = "round";
    g.strokeStyle = "#f2b53a";
    g.beginPath(); g.arc(200, 50, 24, 0, Math.PI * 2); g.stroke();
    for (let a = 0; a < 8; a++) {
      g.beginPath(); g.moveTo(200 + Math.cos(a) * 32, 50 + Math.sin(a) * 32); g.lineTo(200 + Math.cos(a) * 44, 50 + Math.sin(a) * 44); g.stroke();
    }
    g.strokeStyle = "#5e9b3a";
    g.beginPath(); g.moveTo(10, 170); g.quadraticCurveTo(130, 150, 246, 172); g.stroke();
    g.strokeStyle = "#7a4a2a";
    g.beginPath(); g.moveTo(60, 168); g.lineTo(60, 110); g.stroke();
    g.fillStyle = "#6fae45";
    g.beginPath(); g.arc(60, 95, 28, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#c85a4a";
    g.strokeRect(110, 110, 50, 50);
    g.beginPath(); g.moveTo(104, 112); g.lineTo(135, 82); g.lineTo(166, 112); g.stroke();
    g.fillStyle = "#3a2a1c";
    g.font = "22px 'Patrick Hand', cursive";
    g.fillText("DEHORS", 14, 34);
  }, false);
}

/** Petite texture ronde et douce pour les grains de poussière. */
export function dustTexture(): Texture {
  return make("dust", 32, 32, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "rgba(255,244,214,1)");
    grad.addColorStop(1, "rgba(255,244,214,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }, false);
}

/** Cône de lumière vertical, pour les faisceaux poussiéreux. */
export function beamTexture(): Texture {
  return make("beam", 64, 128, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(255,236,190,0.0)");
    grad.addColorStop(0.15, "rgba(255,236,190,0.55)");
    grad.addColorStop(1, "rgba(255,236,190,0.0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    const side = g.createLinearGradient(0, 0, w, 0);
    side.addColorStop(0, "rgba(0,0,0,1)");
    side.addColorStop(0.5, "rgba(0,0,0,0)");
    side.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = side;
    g.fillRect(0, 0, w, h);
  }, false);
}

/** Dégradé sombre au pied des murs : fausse occlusion ambiante, salissures. */
export function grimeTexture(): Texture {
  return make("grime", 64, 64, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(30,24,16,0.55)");
    grad.addColorStop(1, "rgba(30,24,16,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

/** Carreau manquant : terre sombre, éclats de carrelage. */
export function holeTexture(): Texture {
  return make("hole", 128, 128, (g, w, h) => {
    const r = rng(77);
    g.fillStyle = "rgba(0,0,0,0)";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#4a3a2a";
    g.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const rad = 40 + r() * 20;
      g.lineTo(w / 2 + Math.cos(a) * rad, h / 2 + Math.sin(a) * rad);
    }
    g.closePath();
    g.fill();
    g.fillStyle = "#3a2c20";
    for (let k = 0; k < 20; k++) { g.beginPath(); g.arc(30 + r() * 68, 30 + r() * 68, 2 + r() * 4, 0, Math.PI * 2); g.fill(); }
  }, false);
}

/** Grande fissure en découpe alpha, posée au sol ou sur un mur. */
export function crackTexture(seed = 1): Texture {
  return make("crack-" + seed, 256, 256, (g, w, h) => {
    const r = rng(seed * 13);
    g.clearRect(0, 0, w, h);
    for (let k = 0; k < 3; k++) crack(g, r, w * 0.5 + (r() - 0.5) * 40, h * 0.5 + (r() - 0.5) * 40, 160, "rgba(40,30,22,0.85)", 3 - k * 0.8);
  }, false);
}

/** Grande salissure irrégulière (suie, boue, poussière). */
export function dirtTexture(seed = 1): Texture {
  return make("dirt-" + seed, 256, 256, (g, w, h) => {
    const r = rng(seed * 29);
    g.clearRect(0, 0, w, h);
    for (let k = 0; k < 40; k++) {
      const x = w / 2 + (r() - 0.5) * w * 0.6;
      const y = h / 2 + (r() - 0.5) * h * 0.6;
      const radius = 10 + r() * 45;
      const grad = g.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(${50 + r() * 30},${40 + r() * 20},${28},0.22)`);
      grad.addColorStop(1, "rgba(50,40,28,0)");
      g.fillStyle = grad;
      g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }, false);
}

/** Feuille de papier froissée, pour les détritus. */
export function paperTexture(seed = 1): Texture {
  return make("paper-" + seed, 64, 80, (g, w, h) => {
    const r = rng(seed * 5);
    g.fillStyle = r() > 0.5 ? "#efe6cc" : "#e2d7b8";
    g.beginPath();
    g.moveTo(4, 6); g.lineTo(w - 6, 2); g.lineTo(w - 2, h - 8); g.lineTo(6, h - 3);
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(60,50,40,0.45)";
    g.lineWidth = 2;
    for (let y = 16; y < h - 12; y += 9) { g.beginPath(); g.moveTo(10, y); g.lineTo(w - 12 - r() * 16, y + 1); g.stroke(); }
  }, false);
}

/** Inscription bombée à la peinture (graffiti de survivants). */
export function sprayTexture(text: string, color: string): Texture {
  return make("spray:" + text + color, 512, 160, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const lines = text.split("\n");
    const size = Math.min(h / (lines.length * 1.1), (w * 1.5) / Math.max(...lines.map((l) => l.length)));
    g.font = `${Math.floor(size)}px 'Patrick Hand', cursive`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = 6;
    lines.forEach((line, i) => g.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size));
    // Coulures
    g.shadowBlur = 0;
    const r = rng(text.length * 3);
    for (let k = 0; k < 8; k++) g.fillRect(40 + r() * (w - 80), h / 2 + size * 0.3, 2, 8 + r() * 26);
  }, false);
}

/** Dalle de béton lissé : 2 × 2 dalles de 2 m, joints sciés, granulats fins, traces de taloche. 1 texture = 4 × 4 m. */
export function concreteFloorTexture(): Texture {
  return make("concrete-floor", 512, 512, (g, w, h) => {
    const r = rng(19);
    g.fillStyle = "#a29e8e";
    g.fillRect(0, 0, w, h);
    const slab = w / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = ["#a7a393", "#9e9a8a", "#a39f8d", "#a9a493"][i + j * 2];
      g.fillRect(i * slab + 3, j * slab + 3, slab - 6, slab - 6);
      // Traces de taloche : arcs très pâles.
      g.strokeStyle = "rgba(255,250,235,0.035)";
      g.lineWidth = 14;
      for (let k = 0; k < 5; k++) {
        const cx = i * slab + r() * slab, cy = j * slab + r() * slab;
        g.beginPath(); g.arc(cx, cy, 30 + r() * 40, r() * 6, r() * 6 + 1.6); g.stroke();
      }
      bevel(g, i * slab + 3, j * slab + 3, slab - 6, slab - 6, "rgba(255,250,235,0.16)", "rgba(50,45,35,0.22)", 3);
    }
    for (let k = 0; k < 40; k++) soft(g, r() * w, r() * h, 12 + r() * 50, r() > 0.5 ? "rgba(255,250,235,A)" : "rgba(50,45,35,A)", 0.08);
    for (let k = 0; k < 900; k++) {
      g.fillStyle = r() > 0.5 ? "rgba(70,64,52,0.3)" : "rgba(235,230,215,0.3)";
      g.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
    for (let k = 0; k < 2; k++) crack(g, r, r() * w, r() * h, 110, "rgba(50,45,35,0.45)", 2);
  });
}

/** Caillebotis métallique sur fond sombre (génératrice, escalier). 1 texture = 1 × 1 m. */
export function grateTexture(): Texture {
  return make("grate", 256, 256, (g, w, h) => {
    g.fillStyle = "#262a2a";
    g.fillRect(0, 0, w, h);
    // Fond visible à travers la grille : quelques reflets.
    const r = rng(23);
    for (let k = 0; k < 5; k++) soft(g, r() * w, r() * h, 30 + r() * 30, "rgba(120,110,90,A)", 0.25);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = "#7d8a8c";
      g.fillRect(i * 32 + 3, 0, 6, h);
      g.fillStyle = "#8d999a";
      g.fillRect(0, i * 32 + 3, w, 6);
      g.fillStyle = "rgba(255,255,240,0.25)";
      g.fillRect(0, i * 32 + 3, w, 2);
    }
    // Cadre de la dalle (1 m) : plat plus large.
    g.fillStyle = "#6c7779";
    g.fillRect(0, 0, w, 5); g.fillRect(0, 0, 5, h);
    for (let k = 0; k < 4; k++) soft(g, r() * w, r() * h, 12 + r() * 22, "rgba(168,86,46,A)", 0.45);
  });
}

/** Terre battue peinte : taches douces, gravillons. L'herbe vient du masque de salle (shader de sol). 1 texture = 3 × 3 m. */
export function dirtGroundTexture(): Texture {
  return make("dirt-ground", 512, 512, (g, w, h) => {
    const r = rng(41);
    g.fillStyle = "#a88f66";
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 60; k++) soft(g, r() * w, r() * h, 25 + r() * 70, r() > 0.5 ? "rgba(120,96,64,A)" : "rgba(196,176,132,A)", 0.3, 1, 0.7);
    // Coups de pinceau allongés.
    g.lineCap = "round";
    for (let k = 0; k < 50; k++) {
      g.strokeStyle = r() > 0.5 ? "rgba(140,114,78,0.25)" : "rgba(200,182,140,0.22)";
      g.lineWidth = 4 + r() * 8;
      const x = r() * w, y = r() * h, a = r() * Math.PI;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30); g.stroke();
    }
    for (let k = 0; k < 220; k++) {
      const x = r() * w, y = r() * h, s = 1.5 + r() * 2.5;
      g.fillStyle = "rgba(80,66,45,0.45)";
      g.beginPath(); g.arc(x + 1, y + 1, s, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(214,200,166,0.7)";
      g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
    }
  });
}

/** Bruit doux tuilable (R, G : deux bruits indépendants) pour les variations à grande échelle des sols. */
export function macroNoiseTexture(): Texture {
  const cached = cache.get("macro-noise");
  if (cached) return cached;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const image = g.createImageData(size, size);
  const lattice = (seed: number, period: number) => {
    const r = rng(seed);
    const values = Array.from({ length: period * period }, () => r());
    return (x: number, y: number) => {
      const fx = (x / size) * period, fy = (y / size) * period;
      const ix = Math.floor(fx), iy = Math.floor(fy);
      const tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const at = (a: number, b: number) => values[((b + period) % period) * period + ((a + period) % period)];
      const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx;
      const bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx;
      return top + (bottom - top) * sy;
    };
  };
  const a1 = lattice(101, 4), a2 = lattice(102, 8), b1 = lattice(201, 4), b2 = lattice(202, 8), c1 = lattice(301, 16);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    image.data[i] = Math.round((a1(x, y) * 0.65 + a2(x, y) * 0.35) * 255);
    image.data[i + 1] = Math.round((b1(x, y) * 0.6 + b2(x, y) * 0.4) * 255);
    image.data[i + 2] = Math.round(c1(x, y) * 255);
    image.data[i + 3] = 255;
  }
  g.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  cache.set("macro-noise", texture);
  return texture;
}

/**
 * Masque peint d'une salle, en données (pas de conversion sRGB) : R = usure, G = crasse, B = flaques ou herbe.
 * Fond noir opaque, canaux peints en mode additif (« lighter ») pour rester indépendants.
 */
export function roomMaskTexture(key: string, width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): Texture {
  const cached = cache.get("mask:" + key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, width, height);
  g.globalCompositeOperation = "lighter";
  draw(g, width, height);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
  cache.set("mask:" + key, texture);
  return texture;
}

// ——— Extérieur (entrée et zone extérieure) ———

/** Sentier de terre tassée, bords fondus, ornières et cailloux. Le sentier court le long de V. */
export function extTrailTexture(): Texture {
  return make("ext-trail", 256, 512, (g, w, h) => {
    const r = rng(83);
    // Bande claire aux bords fondus (alpha), répétable en V.
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "rgba(196,170,124,0)");
    grad.addColorStop(0.2, "rgba(196,170,124,0.75)");
    grad.addColorStop(0.5, "rgba(206,182,136,0.9)");
    grad.addColorStop(0.8, "rgba(196,170,124,0.75)");
    grad.addColorStop(1, "rgba(196,170,124,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // Ornières sombres.
    for (const x of [w * 0.34, w * 0.66]) {
      g.strokeStyle = "rgba(110,86,58,0.3)";
      g.lineWidth = 14;
      g.beginPath();
      g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin((y / h) * Math.PI * 2) * 5, y);
      g.stroke();
    }
    for (let k = 0; k < 160; k++) {
      g.fillStyle = r() > 0.5 ? "rgba(120,98,70,0.55)" : "rgba(232,214,176,0.6)";
      g.beginPath(); g.arc(w * 0.18 + r() * w * 0.64, r() * h, 1.5 + r() * 3, 0, Math.PI * 2); g.fill();
    }
  });
}

/** Halo lumineux doux (flaque de lumière au sol, en mélange additif). */
export function extHaloTexture(): Texture {
  return make("ext-halo", 128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.45, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }, false);
}

/** Touffe de fleurs sauvages en découpe alpha (tiges + corolles pastel). */
export function extFlowersTexture(seed = 1): Texture {
  return make("ext-flowers-" + seed, 128, 128, (g, w, h) => {
    const r = rng(60 + seed);
    const petals = [["#e9dcc0", "#d8a43a"], ["#e58a6a", "#f6d38a"], ["#b9a6dc", "#f4ecd6"], ["#f2c230", "#7a4a2a"]];
    for (let k = 0; k < 9; k++) {
      const base = w / 2 + (r() - 0.5) * 60;
      const tipX = base + (r() - 0.5) * 40;
      const tipY = 22 + r() * 50;
      g.strokeStyle = k % 2 ? "#6b7550" : "#556045";
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(base, h); g.quadraticCurveTo(base, (h + tipY) / 2, tipX, tipY); g.stroke();
      g.fillStyle = "#6b7550";
      g.beginPath(); g.ellipse(base + 8, h - 18 - r() * 20, 9, 4, -0.6, 0, Math.PI * 2); g.fill();
      const [petal, heart] = petals[(seed + k) % petals.length];
      g.fillStyle = petal;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        g.beginPath(); g.arc(tipX + Math.cos(a) * 6, tipY + Math.sin(a) * 6, 5.5, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = heart;
      g.beginPath(); g.arc(tipX, tipY, 4, 0, Math.PI * 2); g.fill();
    }
  }, false);
}

/** Plaque de tôle rouillée, lettres pochoir crème (ou rétroéclairées), rivets et coulures. */
export function extRustPlateTexture(text: string, lit = false): Texture {
  return make("ext-plate:" + text + ":" + lit, 512, 160, (g, w, h) => {
    const r = rng(text.length * 13 + 5);
    g.fillStyle = "#6a4528";
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 26; k++) {
      const x = r() * w, y = r() * h, rad = 10 + r() * 40;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, r() > 0.4 ? "rgba(168,86,46,0.7)" : "rgba(201,119,63,0.55)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.strokeStyle = "#3b2c22";
    g.lineWidth = 10;
    g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = "#c9a77a";
    for (const [x, y] of [[22, 22], [w - 22, 22], [22, h - 22], [w - 22, h - 22]]) { g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill(); }
    g.font = `bold ${Math.floor(h * 0.62)}px 'Special Elite', monospace`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    if (lit) {
      g.shadowColor = "#ffb347";
      g.shadowBlur = 26;
      g.fillStyle = "#ffe2a6";
    } else g.fillStyle = "#e9dcc0";
    g.fillText(text, w / 2, h / 2 + 4);
    g.shadowBlur = 0;
    // Coulures de rouille sous les lettres.
    for (let k = 0; k < 14; k++) {
      const x = 60 + r() * (w - 120);
      const grad = g.createLinearGradient(0, h * 0.6, 0, h);
      grad.addColorStop(0, "rgba(168,86,46,0.6)");
      grad.addColorStop(1, "rgba(168,86,46,0)");
      g.fillStyle = grad;
      g.fillRect(x, h * 0.6, 3 + r() * 4, h * 0.4);
    }
  }, false);
}

// ——— Zone centre (sécurité, hub, accès étage 2) ———

/** Anneaux concentriques peints au sol du hub central : disque sombre usé, liserés ocre, joints rayonnants. */
export function centerRingTexture(): Texture {
  return make("center-ring", 1024, 1024, (g, w, h) => {
    const r = rng(808);
    const cx = w / 2, cy = h / 2;
    g.clearRect(0, 0, w, h);
    const ring = (radius: number, width: number, color: string) => {
      g.strokeStyle = color; g.lineWidth = width;
      g.beginPath(); g.arc(cx, cy, radius, 0, Math.PI * 2); g.stroke();
    };
    // Disque de béton ciré, plus sombre vers l'extérieur.
    const disc = g.createRadialGradient(cx, cy, 120, cx, cy, 500);
    disc.addColorStop(0, "rgba(120,112,92,0.55)");
    disc.addColorStop(1, "rgba(70,64,52,0.75)");
    g.fillStyle = disc;
    g.beginPath(); g.arc(cx, cy, 500, 0, Math.PI * 2); g.fill();
    // Joints rayonnants entre les dalles.
    g.strokeStyle = "rgba(40,34,26,0.45)"; g.lineWidth = 4;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * 200, cy + Math.sin(a) * 200); g.lineTo(cx + Math.cos(a) * 470, cy + Math.sin(a) * 470); g.stroke();
    }
    ring(496, 16, "rgba(216,164,58,0.9)");
    ring(470, 6, "rgba(40,34,26,0.6)");
    // Pointillés de sécurité.
    g.setLineDash([26, 22]);
    ring(440, 14, "rgba(233,220,192,0.7)");
    g.setLineDash([]);
    ring(330, 10, "rgba(216,164,58,0.75)");
    ring(205, 22, "rgba(40,34,26,0.55)");
    // Usure : la peinture s'écaille.
    g.globalCompositeOperation = "destination-out";
    for (let k = 0; k < 260; k++) {
      g.globalAlpha = 0.2 + r() * 0.5;
      g.beginPath(); g.ellipse(r() * w, r() * h, 4 + r() * 22, 3 + r() * 10, r() * 3, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }, false);
}

/** Emblème du silo : silo stylisé et grand « 8 » sur médaillon moutarde. */
export function centerEmblemTexture(): Texture {
  return make("center-emblem", 512, 512, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#e9dcc0";
    g.beginPath(); g.arc(cx, cy, 248, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#d8a43a";
    g.beginPath(); g.arc(cx, cy, 222, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#3a332c"; g.lineWidth = 10;
    g.beginPath(); g.arc(cx, cy, 200, 0, Math.PI * 2); g.stroke();
    // Silo : dôme + fût, et le 8 au milieu.
    g.fillStyle = "#3a332c";
    g.beginPath();
    g.moveTo(cx - 100, cy + 150); g.lineTo(cx - 100, cy - 60);
    g.arc(cx, cy - 60, 100, Math.PI, 0);
    g.lineTo(cx + 100, cy + 150); g.closePath(); g.fill();
    g.fillRect(cx - 150, cy + 140, 300, 22);
    g.fillStyle = "#e9dcc0";
    g.font = "bold 230px 'Special Elite', monospace";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("8", cx, cy + 30);
    const r = rng(88);
    g.globalCompositeOperation = "destination-out";
    for (let k = 0; k < 90; k++) { g.globalAlpha = 0.35; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 7, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }, false);
}

/** Panneau directionnel en bois peint, flèche dessinée (gauche, droite, haut, bas). */
export function centerArrowTexture(text: string, dir: "left" | "right" | "up" | "down", bg = "#d8a43a", fg = "#3a332c"): Texture {
  return make("center-arrow:" + text + dir + bg, 512, 160, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 8;
    g.strokeRect(6, 6, w - 12, h - 12);
    const ax = dir === "right" ? w - 70 : 70;
    g.fillStyle = fg;
    g.save();
    g.translate(ax, h / 2);
    g.rotate({ left: Math.PI, right: 0, up: -Math.PI / 2, down: Math.PI / 2 }[dir]);
    g.beginPath();
    g.moveTo(40, 0); g.lineTo(0, -34); g.lineTo(0, -14); g.lineTo(-40, -14); g.lineTo(-40, 14); g.lineTo(0, 14); g.lineTo(0, 34);
    g.closePath(); g.fill();
    g.restore();
    const lines = text.split("\n");
    const size = Math.min((h - 30) / (lines.length * 1.1), (360 * 1.7) / Math.max(...lines.map((l) => l.length)));
    g.font = `${Math.floor(size)}px 'Special Elite', monospace`;
    g.textAlign = "center"; g.textBaseline = "middle";
    const tx = dir === "right" ? (w - 130) / 2 + 6 : (w + 130) / 2 - 6;
    lines.forEach((line, i) => g.fillText(line, tx, h / 2 + (i - (lines.length - 1) / 2) * size * 1.05));
    const r = rng(text.length * 7);
    g.globalCompositeOperation = "destination-out";
    for (let k = 0; k < 50; k++) { g.globalAlpha = 0.3; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 5, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }, false);
}

/** Mot manuscrit de survivant : papier crème, ruban adhésif, écriture penchée. */
export function centerNoteTexture(text: string, seed = 1): Texture {
  return make("center-note:" + text + seed, 192, 224, (g, w, h) => {
    const r = rng(seed * 31);
    g.clearRect(0, 0, w, h);
    g.fillStyle = ["#f4ecd6", "#efe0b8", "#e9dcc0", "#f2d9a8"][seed % 4];
    g.beginPath(); g.moveTo(8, 14); g.lineTo(w - 10, 8); g.lineTo(w - 6, h - 10); g.lineTo(12, h - 6); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,240,200,0.75)";
    g.save(); g.translate(w / 2, 14); g.rotate((r() - 0.5) * 0.4); g.fillRect(-30, -9, 60, 18); g.restore();
    g.fillStyle = seed % 3 === 0 ? "#8a3a2a" : "#3a332c";
    const lines = text.split("\n");
    const size = Math.min(40, (w * 1.8) / Math.max(...lines.map((l) => l.length)));
    g.font = `${Math.floor(size)}px 'Patrick Hand', cursive`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.save(); g.translate(w / 2, h / 2 + 8); g.rotate((r() - 0.5) * 0.12);
    lines.forEach((line, i) => g.fillText(line, 0, (i - (lines.length - 1) / 2) * size * 1.15));
    g.restore();
  }, false);
}

/** Cadenas peint (pictogramme du poste de sécurité). */
export function centerPadlockTexture(): Texture {
  return make("center-padlock", 128, 128, (g, w) => {
    g.clearRect(0, 0, w, w);
    g.fillStyle = "#3a332c";
    g.beginPath(); g.arc(w / 2, w / 2, 62, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#e9dcc0"; g.lineWidth = 10;
    g.beginPath(); g.moveTo(w / 2 - 20, 62); g.lineTo(w / 2 - 20, 50); g.arc(w / 2, 50, 20, Math.PI, 0); g.lineTo(w / 2 + 20, 62); g.stroke();
    g.fillStyle = "#e9dcc0";
    g.fillRect(w / 2 - 30, 60, 60, 44);
    g.fillStyle = "#3a332c";
    g.beginPath(); g.arc(w / 2, 78, 7, 0, Math.PI * 2); g.fill();
    g.fillRect(w / 2 - 3, 80, 6, 14);
  }, false);
}

/** Écran de caméra de surveillance : image verdâtre, lignes de balayage, libellé. */
export function centerMonitorTexture(label: string, seed = 1): Texture {
  return make("center-monitor:" + label + seed, 256, 192, (g, w, h) => {
    const r = rng(seed * 17);
    g.fillStyle = "#1d3a34";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(159,240,226,0.25)";
    g.beginPath(); g.moveTo(40, h); g.lineTo(100, 70); g.lineTo(156, 70); g.lineTo(216, h); g.closePath(); g.fill();
    g.fillStyle = "rgba(159,240,226,0.4)";
    for (let k = 0; k < 4; k++) g.fillRect(20 + r() * 200, 40 + r() * 120, 10 + r() * 30, 6 + r() * 20);
    g.fillStyle = "rgba(0,0,0,0.25)";
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2);
    g.fillStyle = "#9ff0e2";
    g.font = "24px 'Special Elite', monospace";
    g.fillText(label, 12, 28);
    g.fillStyle = "#ff5a36";
    g.beginPath(); g.arc(w - 22, 20, 7, 0, Math.PI * 2); g.fill();
  }, false);
}

// ——— Aile est (salle de contrôle, infirmerie, atelier, serre) ———

/** Écran allumé de la salle de contrôle : courbes et lignes de données bleues sur fond nuit. */
export function eastScreenTexture(seed = 1): Texture {
  return make("east-screen:" + seed, 128, 96, (g, w, h) => {
    const r = rng(300 + seed);
    g.fillStyle = "#0f2a44";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(120,200,255,0.12)";
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    g.strokeStyle = "#7fd0ff";
    g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x <= w; x += 8) g.lineTo(x, h * 0.35 + Math.sin(x * 0.08 + seed) * 10 + (r() - 0.5) * 8);
    g.stroke();
    g.fillStyle = "#a9e2ff";
    for (let k = 0; k < 7; k++) g.fillRect(8, h * 0.58 + k * 5, 10 + r() * 60, 2);
    g.fillStyle = "#5fb4f0";
    for (let k = 0; k < 5; k++) { const bh = 6 + r() * 26; g.fillRect(84 + k * 8, h - 8 - bh, 5, bh); }
  });
}

/** Neige d'un écran sans signal (grise et granuleuse, répétable pour la faire défiler). */
export function eastStaticTexture(): Texture {
  return make("east-static", 64, 64, (g, w, h) => {
    const r = rng(77);
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      const v = 40 + Math.floor(r() * 120);
      g.fillStyle = `rgb(${v},${v + 6},${v + 4})`;
      g.fillRect(x, y, 2, 2);
    }
  });
}

/** Grand écran mural : plan du silo en fil de fer, points d'alerte. */
export function eastRadarTexture(seed = 1): Texture {
  return make("east-radar:" + seed, 192, 128, (g, w, h) => {
    const r = rng(500 + seed);
    g.fillStyle = "#0d2640";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(127,208,255,0.25)";
    g.lineWidth = 1;
    for (let x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = "#8fd8ff";
    g.lineWidth = 2;
    if (seed % 2) {
      g.beginPath(); g.arc(w / 2, h / 2, 22, 0, Math.PI * 2); g.stroke();
      g.strokeRect(w / 2 - 80, h / 2 - 40, 50, 30); g.strokeRect(w / 2 + 30, h / 2 - 40, 50, 30);
      g.strokeRect(w / 2 - 80, h / 2 + 10, 50, 30); g.strokeRect(w / 2 + 30, h / 2 + 10, 50, 30);
    } else {
      for (let k = 1; k < 4; k++) { g.beginPath(); g.arc(w / 2, h / 2, k * 18, 0, Math.PI * 2); g.stroke(); }
      g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + 50, h / 2 - 30); g.stroke();
    }
    for (let k = 0; k < 4; k++) {
      g.fillStyle = k === 0 ? "#ffb35a" : "#c9f0ff";
      g.beginPath(); g.arc(20 + r() * (w - 40), 20 + r() * (h - 40), 3, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = "#c9f0ff";
    g.font = "12px 'Special Elite', monospace";
    g.fillText(seed % 2 ? "SILLO 8 · ÉTAGE 1" : "RÉSEAU · ANTENNE", 8, h - 8);
  });
}

/** Écran radio réparé : onde verte et message. */
export function eastSignalTexture(): Texture {
  return make("east-signal", 128, 96, (g, w, h) => {
    g.fillStyle = "#10301f";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#8ff0a8";
    g.lineWidth = 3;
    g.beginPath();
    for (let x = 0; x <= w; x += 3) g.lineTo(x, h * 0.42 + Math.sin(x * 0.2) * Math.sin(x * 0.03) * 22);
    g.stroke();
    g.fillStyle = "#c9ffd6";
    g.font = "15px 'Special Elite', monospace";
    g.textAlign = "center";
    g.fillText("SIGNAL ÉTABLI", w / 2, h - 14);
  });
}

/** Croix rouge peinte sur une plaque crème. */
export function eastCrossTexture(): Texture {
  return make("east-cross", 128, 128, (g, w, h) => {
    g.fillStyle = "#e9dcc0";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#6a4528";
    g.lineWidth = 6;
    g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = "#c8453a";
    g.fillRect(w / 2 - 15, 22, 30, h - 44);
    g.fillRect(22, h / 2 - 15, w - 44, 30);
  }, false);
}

/** Carte papier annotée posée sur la table de la salle de contrôle. */
export function eastMapTexture(): Texture {
  return make("east-map", 256, 160, (g, w, h) => {
    const r = rng(61);
    g.fillStyle = "#e9dcc0";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#6a4528";
    g.lineWidth = 3;
    g.beginPath(); g.arc(w / 2, h / 2, 26, 0, Math.PI * 2); g.stroke();
    g.strokeRect(20, 20, 70, 50); g.strokeRect(20, 90, 70, 50); g.strokeRect(166, 20, 70, 50); g.strokeRect(166, 90, 70, 50);
    g.strokeStyle = "#556045";
    g.lineWidth = 2;
    g.beginPath();
    for (let k = 0; k < 8; k++) g.lineTo(r() * w, r() * h);
    g.stroke();
    g.strokeStyle = "#c8453a";
    g.lineWidth = 3;
    for (const [x, y] of [[200, 45], [55, 115]]) { g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = "#3a2a1c";
    g.font = "16px 'Patrick Hand', cursive";
    g.fillText("antenne ?", 170, 82);
    g.fillText("serre = sûr", 30, 154);
  }, false);
}

/** Panneau perforé de l'atelier. */
export function eastPegboardTexture(): Texture {
  return make("east-pegboard", 256, 128, (g, w, h) => {
    g.fillStyle = "#b08657";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(60,38,20,0.55)";
    for (let y = 8; y < h; y += 14) for (let x = 8; x < w; x += 14) { g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill(); }
  });
}

/** Note manuscrite punaisée (décor non interactif). */
export function eastNoteTexture(text: string): Texture {
  return make("east-note:" + text, 128, 160, (g, w, h) => {
    g.fillStyle = "#f2e8cf";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(122,74,42,0.15)";
    g.fillRect(0, h - 26, w, 26);
    g.fillStyle = "#c8453a";
    g.beginPath(); g.arc(w / 2, 10, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#3a2a1c";
    g.font = "17px 'Patrick Hand', cursive";
    text.split("\n").forEach((line, i) => g.fillText(line, 10, 40 + i * 22));
  }, false);
}

// ——— Aile ouest (dortoirs, entrepôt, cafétéria, génératrice) ———

/** Couverture tricotée : rayures et mailles en V. `a` fond, `b` rayures. */
export function westKnitTexture(a: string, b: string): Texture {
  return make(`west-knit:${a}:${b}`, 128, 128, (g, w, h) => {
    g.fillStyle = a;
    g.fillRect(0, 0, w, h);
    g.fillStyle = b;
    for (let y = 0; y < h; y += 32) g.fillRect(0, y + 18, w, 10);
    g.strokeStyle = "rgba(30,20,13,0.22)";
    g.lineWidth = 2;
    for (let y = 2; y < h; y += 8) {
      for (let x = 0; x < w; x += 8) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y + 5); g.lineTo(x + 8, y); g.stroke(); }
    }
  });
}

/** Fresque des survivants peinte au mur : soleil, silhouettes main dans la main, pousse. */
export function westMuralTexture(): Texture {
  return make("west-mural", 512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.lineCap = "round";
    g.lineJoin = "round";
    // Colline et soleil
    g.fillStyle = "rgba(107,117,80,0.92)";
    g.beginPath(); g.moveTo(0, h); g.quadraticCurveTo(w * 0.5, h * 0.55, w, h); g.fill();
    g.fillStyle = "#d8a43a";
    g.beginPath(); g.arc(w * 0.82, h * 0.3, 34, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#d8a43a";
    g.lineWidth = 7;
    for (let a = 0; a < 10; a++) { g.beginPath(); g.moveTo(w * 0.82 + Math.cos(a * 0.63) * 44, h * 0.3 + Math.sin(a * 0.63) * 44); g.lineTo(w * 0.82 + Math.cos(a * 0.63) * 58, h * 0.3 + Math.sin(a * 0.63) * 58); g.stroke(); }
    // Survivants : têtes rondes, bonnets, mains liées
    const coats = ["#d8a43a", "#c85a4a", "#6b7550", "#3f8796", "#d8a43a"];
    const hats = ["#556045", "#6a4528", "#c85a4a", "#556045", "#e9dcc0"];
    for (let i = 0; i < 5; i++) {
      const x = 70 + i * 66;
      const y = 150 + (i % 2) * 6 - (i === 2 ? 4 : 0);
      g.fillStyle = coats[i];
      g.beginPath(); g.ellipse(x, y + 30, 20, 30, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#e8b48e";
      g.beginPath(); g.arc(x, y - 12, 18, 0, Math.PI * 2); g.fill();
      g.fillStyle = hats[i];
      g.beginPath(); g.arc(x, y - 16, 18, Math.PI, 0); g.fill();
      g.fillStyle = "#1e140d";
      g.beginPath(); g.arc(x - 6, y - 10, 2.5, 0, Math.PI * 2); g.arc(x + 6, y - 10, 2.5, 0, Math.PI * 2); g.fill();
      if (i < 4) {
        g.strokeStyle = "#e8b48e";
        g.lineWidth = 6;
        g.beginPath(); g.moveTo(x + 16, y + 20); g.quadraticCurveTo(x + 33, y + 30, x + 50, y + 20); g.stroke();
      }
    }
    // Pousse
    g.strokeStyle = "#8cc152";
    g.lineWidth = 6;
    g.beginPath(); g.moveTo(w * 0.9, h - 20); g.lineTo(w * 0.9, h - 70); g.stroke();
    g.fillStyle = "#8cc152";
    g.beginPath(); g.ellipse(w * 0.9 - 14, h - 72, 14, 7, -0.5, 0, Math.PI * 2); g.ellipse(w * 0.9 + 14, h - 80, 14, 7, 0.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#e9dcc0";
    g.font = "44px 'Patrick Hand', cursive";
    g.textAlign = "left";
    g.fillText("ON TIENT BON !", 24, 52);
    g.font = "22px 'Patrick Hand', cursive";
    g.fillText("— les gens du 8", 60, 84);
  }, false);
}

/** Tableau de liège : photos, notes, carte et fil rouge entre les punaises. */
export function westBoardTexture(): Texture {
  return make("west-board", 384, 256, (g, w, h) => {
    const r = rng(81);
    g.fillStyle = "#6a4528";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#b98a55";
    g.fillRect(12, 12, w - 24, h - 24);
    g.fillStyle = "rgba(90,60,30,0.35)";
    for (let k = 0; k < 400; k++) g.fillRect(12 + r() * (w - 24), 12 + r() * (h - 24), 2, 2);
    const pins: [number, number][] = [];
    const cards: [number, number, number, number, string][] = [
      [40, 40, 70, 54, "#e9dcc0"], [150, 30, 90, 70, "#f4ecd6"], [280, 46, 64, 80, "#e9dcc0"],
      [60, 140, 80, 64, "#f4ecd6"], [180, 140, 70, 80, "#d8c7a0"], [290, 160, 60, 50, "#f4ecd6"],
    ];
    for (const [x, y, cw, ch, color] of cards) {
      g.save();
      g.translate(x + cw / 2, y + ch / 2);
      g.rotate((r() - 0.5) * 0.25);
      g.fillStyle = color;
      g.fillRect(-cw / 2, -ch / 2, cw, ch);
      g.strokeStyle = "rgba(60,50,40,0.55)";
      g.lineWidth = 2;
      for (let yy = -ch / 2 + 12; yy < ch / 2 - 6; yy += 9) { g.beginPath(); g.moveTo(-cw / 2 + 8, yy); g.lineTo(cw / 2 - 8 - r() * 14, yy); g.stroke(); }
      g.restore();
      pins.push([x + cw / 2, y + 6]);
    }
    // Carte avec une croix
    g.strokeStyle = "#3f8796";
    g.lineWidth = 3;
    g.strokeRect(160, 42, 70, 46);
    g.strokeStyle = "#c83a2a";
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(205, 55); g.lineTo(217, 67); g.moveTo(217, 55); g.lineTo(205, 67); g.stroke();
    // Fil rouge
    g.strokeStyle = "#d8322a";
    g.lineWidth = 3;
    for (const [a, b] of [[0, 1], [1, 2], [1, 4], [3, 4], [4, 5], [0, 3], [2, 5]]) {
      g.beginPath(); g.moveTo(pins[a][0], pins[a][1]); g.lineTo(pins[b][0], pins[b][1]); g.stroke();
    }
    for (const [x, y] of pins) { g.fillStyle = "#d8322a"; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#1e140d";
    g.font = "26px 'Patrick Hand', cursive";
    g.fillText("ÉTAGE 2 ?", 196, 236);
  }, false);
}

/** Plan du silo dessiné à la main, épinglé au mur. */
export function westMapTexture(): Texture {
  return make("west-map", 256, 200, (g, w, h) => {
    g.fillStyle = "#e9dcc0";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#3f6f86";
    g.lineWidth = 3;
    g.beginPath(); g.arc(w / 2, h / 2, 34, 0, Math.PI * 2); g.stroke();
    g.strokeRect(20, 30, 70, 50); g.strokeRect(20, 110, 70, 60); g.strokeRect(166, 30, 70, 50); g.strokeRect(166, 110, 70, 60);
    g.strokeStyle = "#c83a2a";
    g.setLineDash([8, 6]);
    g.beginPath(); g.moveTo(w / 2, h - 6); g.lineTo(w / 2, h / 2 + 34); g.moveTo(w / 2 - 34, h / 2); g.lineTo(90, 55); g.stroke();
    g.setLineDash([]);
    g.fillStyle = "#1e140d";
    g.font = "20px 'Special Elite', monospace";
    g.fillText("SILLO 8", 92, 22);
  }, false);
}

/** Farine renversée au sol. */
export function westFlourTexture(): Texture {
  return make("west-flour", 128, 128, (g, w, h) => {
    const r = rng(23);
    for (let k = 0; k < 26; k++) {
      g.fillStyle = `rgba(246,240,224,${0.35 + r() * 0.5})`;
      g.beginPath(); g.arc(w / 2 + (r() - 0.5) * 70, h / 2 + (r() - 0.5) * 60, 8 + r() * 20, 0, Math.PI * 2); g.fill();
    }
  }, false);
}

/** Rayures en arc au sol : un pan de mur qui a pivoté plusieurs fois (mur creux). */
export function westScratchTexture(): Texture {
  return make("west-scratch", 256, 256, (g, w, h) => {
    const r = rng(57);
    g.clearRect(0, 0, w, h);
    g.lineCap = "round";
    for (let k = 0; k < 7; k++) {
      g.strokeStyle = k % 2 ? "rgba(250,244,226,0.55)" : "rgba(40,30,22,0.45)";
      g.lineWidth = 2 + r() * 2;
      const radius = 150 + k * 12 + r() * 6;
      g.beginPath();
      g.arc(0, h / 2, radius, -0.75 + r() * 0.1, 0.75 - r() * 0.1);
      g.stroke();
    }
  }, false);
}

/** Halo lumineux doux (flaques de lumière au sol, voyants). */
export function westGlowTexture(): Texture {
  return make("west-glow", 128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }, false);
}

// ——— Narration par le décor (storyProps.ts) ———
// Toutes les petites images de l'enquête (affiches, craies, traces, carnets…) vivent dans un seul atlas :
// deux matériaux (papier opaque, craie transparente) suffisent pour tout l'étage, et le lot statique les fond.

/** Écriture d'enfant à la craie : lettres de travers, tailles inégales, trait épais et poudreux. */
function chalkLines(g: CanvasRenderingContext2D, lines: string[], cx: number, cy: number, size: number, seed: number, color = "#f4efe2", lineGap = 1.08): void {
  const r = rng(seed);
  g.save();
  g.textBaseline = "middle";
  g.textAlign = "left";
  g.lineJoin = "round";
  g.lineCap = "round";
  lines.forEach((line, row) => {
    const y0 = cy + (row - (lines.length - 1) / 2) * size * lineGap;
    const chars = [...line];
    const sizes = chars.map(() => size * (0.86 + r() * 0.3));
    let width = 0;
    chars.forEach((ch, i) => { g.font = `${Math.floor(sizes[i])}px 'Patrick Hand', cursive`; width += g.measureText(ch).width * 1.04; });
    let x = cx - width / 2;
    const slope = (r() - 0.5) * 0.06;
    chars.forEach((ch, i) => {
      g.font = `${Math.floor(sizes[i])}px 'Patrick Hand', cursive`;
      const cw = g.measureText(ch).width * 1.04;
      g.save();
      g.translate(x + cw / 2, y0 + (x - cx) * slope + (r() - 0.5) * size * 0.1);
      g.rotate((r() - 0.5) * 0.24);
      g.textAlign = "center";
      // Trois passages légèrement décalés : trait de craie épais et irrégulier.
      for (let k = 0; k < 3; k++) {
        g.globalAlpha = 0.55 + k * 0.15;
        g.strokeStyle = color;
        g.lineWidth = size * 0.07;
        g.strokeText(ch, (r() - 0.5) * 3, (r() - 0.5) * 3);
        g.fillStyle = color;
        g.fillText(ch, (r() - 0.5) * 2, (r() - 0.5) * 2);
      }
      g.restore();
      x += cw;
    });
  });
  g.restore();
  g.globalAlpha = 1;
}

/** Grain de craie : petits trous dans tout ce qui vient d'être dessiné. */
function chalkGrain(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number, amount = 1): void {
  const r = rng(seed);
  g.save();
  g.globalCompositeOperation = "destination-out";
  for (let k = 0; k < ((w * h) / 60) * amount; k++) {
    g.globalAlpha = 0.25 + r() * 0.6;
    g.fillRect(x + r() * w, y + r() * h, 1 + r() * 2.5, 1 + r() * 2);
  }
  g.restore();
  g.globalAlpha = 1;
}

/** Trait de craie à main levée (tremblé). */
function chalkStroke(g: CanvasRenderingContext2D, points: [number, number][], width: number, seed: number, color = "#f4efe2"): void {
  const r = rng(seed);
  g.save();
  g.strokeStyle = color;
  g.lineCap = "round";
  g.lineJoin = "round";
  for (let k = 0; k < 2; k++) {
    g.globalAlpha = 0.7 + k * 0.2;
    g.lineWidth = width * (0.8 + k * 0.3);
    g.beginPath();
    points.forEach(([px, py], i) => {
      const jx = px + (r() - 0.5) * width * 0.5, jy = py + (r() - 0.5) * width * 0.5;
      if (i === 0) g.moveTo(jx, jy); else g.lineTo(jx, jy);
    });
    g.stroke();
  }
  g.restore();
}

/** Lignes de texte (machine ou main) alignées à gauche, avec une graine pour l'irrégularité. */
function writeLines(g: CanvasRenderingContext2D, lines: string[], x: number, y: number, size: number, font: string, color: string, gap = 1.25, seed = 1, wobble = 0): void {
  const r = rng(seed);
  g.save();
  g.fillStyle = color;
  g.font = `${size}px ${font}`;
  g.textBaseline = "alphabetic";
  g.textAlign = "left";
  lines.forEach((line, i) => {
    g.save();
    g.translate(x + (r() - 0.5) * wobble * 4, y + i * size * gap);
    g.rotate((r() - 0.5) * wobble * 0.04);
    g.fillText(line, 0, 0);
    g.restore();
  });
  g.restore();
}

/** Feuille de papier un peu froissée (fond), bords irréguliers, déchirée d'un côté au besoin. */
function paperSheet(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number, color = "#efe5c8", torn: "" | "left" | "right" = ""): void {
  const r = rng(seed);
  g.save();
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x + r() * 3, y + r() * 3);
  g.lineTo(x + w - r() * 3, y + r() * 3);
  if (torn === "right") for (let k = 1; k < 12; k++) g.lineTo(x + w - 6 - r() * 14, y + (k / 12) * h);
  g.lineTo(x + w - r() * 3, y + h - r() * 3);
  g.lineTo(x + r() * 3, y + h - r() * 3);
  if (torn === "left") for (let k = 11; k > 0; k--) g.lineTo(x + 6 + r() * 14, y + (k / 12) * h);
  g.closePath();
  g.fill();
  g.clip();
  // Taches et pliure.
  for (let k = 0; k < 4; k++) soft(g, x + r() * w, y + r() * h, 10 + r() * 24, "rgba(150,110,60,A)", 0.12 + r() * 0.12);
  g.strokeStyle = "rgba(90,70,50,0.18)";
  g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(x, y + h * (0.45 + r() * 0.1)); g.lineTo(x + w, y + h * (0.45 + r() * 0.1)); g.stroke();
  g.restore();
}

/** Ruban adhésif jauni. */
function tape(g: CanvasRenderingContext2D, x: number, y: number, w: number, angle: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.fillStyle = "rgba(240,226,180,0.85)";
  g.fillRect(-w / 2, -7, w, 14);
  g.restore();
}

/** Empreinte de petite chaussure (pointe vers le haut du canevas). */
function shoePrint(g: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, alpha: number, color = "60,44,32"): void {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.fillStyle = `rgba(${color},${alpha})`;
  g.beginPath(); g.ellipse(0, -size * 0.22, size * 0.3, size * 0.42, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(0, size * 0.42, size * 0.24, size * 0.22, 0, 0, Math.PI * 2); g.fill();
  // Crampons de la semelle.
  g.fillStyle = `rgba(${color},${alpha * 0.6})`;
  for (let k = 0; k < 4; k++) g.fillRect(-size * 0.2, -size * 0.5 + k * size * 0.16, size * 0.4, size * 0.05);
  g.restore();
}

type AtlasDraw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

/** Images de l'atlas (nom, largeur, hauteur en pixels, dessin dans un repère local w × h). */
const STORY_IMAGES: [string, number, number, AtlasDraw][] = [
  // Marelle à la craie qui s'arrête à la case 4 (le 5 n'a jamais été dessiné).
  ["hopscotch", 256, 512, (g, w, h) => {
    const s = 112;
    const boxes: [number, number, string][] = [[w / 2 - s / 2, h - s - 16, "1"], [w / 2 - s / 2, h - 2 * s - 16, "2"], [w / 2 - s / 2, h - 3 * s - 16, "3"], [w / 2 - s, h - 4 * s - 16, "4"]];
    boxes.forEach(([x, y, label], i) => {
      chalkStroke(g, [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]], 7, 40 + i);
      chalkLines(g, [label], x + s / 2, y + s / 2, 64, 50 + i);
    });
    // Le trait du 5 commence à peine, puis plus rien.
    chalkStroke(g, [[w / 2, h - 4 * s - 16], [w / 2 + 34, h - 4 * s - 14]], 6, 49);
    chalkGrain(g, 0, 0, w, h, 61);
  }],
  // Petits pas d'enfant qui s'éloignent (vers le haut), anciens, à demi effacés.
  ["kidprints", 128, 512, (g, w, h) => {
    const r = rng(71);
    for (let i = 0; i < 7; i++) {
      const left = i % 2 === 0;
      const alpha = r() < 0.2 ? 0.3 : 0.55 + r() * 0.3;
      shoePrint(g, w / 2 + (left ? -22 : 22) + (r() - 0.5) * 6, h - 44 - i * 70, 54, (r() - 0.5) * 0.25, alpha, "38,26,18");
    }
    g.save();
    g.globalCompositeOperation = "destination-out";
    for (let k = 0; k < 22; k++) soft(g, r() * w, r() * h, 6 + r() * 16, "rgba(0,0,0,A)", 0.4 + r() * 0.4);
    g.restore();
  }],
  // Affiche de la règle n° 1, signée « Les fondateurs ».
  ["poster_rule", 256, 352, (g, w, h) => {
    paperSheet(g, 6, 6, w - 12, h - 12, 81, "#ece2c2");
    g.fillStyle = "#a8382a";
    g.fillRect(18, 22, w - 36, 64);
    g.fillStyle = "#f4ecd6";
    g.font = "bold 42px 'Special Elite', monospace";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("RÈGLE N° 1", w / 2, 56);
    g.fillStyle = "#2a221c";
    g.font = "26px 'Special Elite', monospace";
    ["Aucun mordu", "ne franchit", "la porte.", "", "Pas d'exception."].forEach((line, i) => g.fillText(line, w / 2, 124 + i * 34));
    g.font = "italic 22px 'Special Elite', monospace";
    g.fillText("— Les fondateurs", w / 2, h - 44);
    tape(g, 26, 14, 50, -0.5); tape(g, w - 26, 14, 50, 0.5);
    soft(g, w * 0.7, h * 0.8, 50, "rgba(110,80,40,A)", 0.25);
  }],
  // Photo de l'inauguration : la porte neuve, trente personnes, quelqu'un de dos avec une valise au triangle.
  ["photo_inauguration", 256, 200, (g, w, h) => {
    g.fillStyle = "#f2ead6"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#b8a27a"; g.fillRect(12, 12, w - 24, h - 40);
    const r = rng(91);
    // Grande porte ronde au fond.
    g.fillStyle = "#857560"; g.beginPath(); g.arc(w / 2, 70, 48, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#5e523f"; g.lineWidth = 5; g.stroke();
    g.fillStyle = "#6e6150"; g.fillRect(w / 2 - 3, 24, 6, 92);
    // Trois rangées de petits personnages souriants.
    for (let row = 0; row < 3; row++) for (let i = 0; i < 10; i++) {
      const x = 26 + i * 21 + (row % 2) * 9 + (r() - 0.5) * 4, y = 104 + row * 15;
      g.fillStyle = ["#5e4a36", "#6f5a42", "#4c3e30"][(i + row) % 3];
      g.fillRect(x - 5, y, 10, 14);
      g.fillStyle = "#d9b98e"; g.beginPath(); g.arc(x, y - 3, 4.5, 0, Math.PI * 2); g.fill();
    }
    // Au premier plan, de dos, en blouse, la valise au triangle.
    g.fillStyle = "#f4efe2"; g.fillRect(w / 2 + 30, 118, 26, 46);
    g.fillStyle = "#4c3e30"; g.beginPath(); g.arc(w / 2 + 43, 112, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#3e3226"; g.fillRect(w / 2 + 56, 142, 30, 22);
    g.strokeStyle = "#e9dcc0"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(w / 2 + 71, 146); g.lineTo(w / 2 + 78, 159); g.lineTo(w / 2 + 64, 159); g.closePath(); g.stroke();
    // Vieillissement : voile sépia.
    g.fillStyle = "rgba(120,90,50,0.25)"; g.fillRect(12, 12, w - 24, h - 40);
    g.fillStyle = "#3a2a1c"; g.font = "18px 'Patrick Hand', cursive"; g.textAlign = "center";
    g.fillText("SILLO 8", w / 2, h - 12);
  }],
  // Craie devant la porte de service : trois pièces, une flèche vers les épaves.
  ["service_chalk", 384, 192, (g, w, h) => {
    chalkLines(g, ["3"], 54, h / 2, 110, 101);
    for (let i = 0; i < 3; i++) {
      const cx = 118 + i * 62, cy = h / 2;
      const pts: [number, number][] = [];
      for (let k = 0; k <= 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const rad = k % 2 ? 22 : 28;
        pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
      }
      chalkStroke(g, pts, 5, 110 + i);
    }
    chalkStroke(g, [[290, h / 2], [370, h / 2]], 8, 120);
    chalkStroke(g, [[346, h / 2 - 24], [372, h / 2], [346, h / 2 + 24]], 8, 121);
    chalkGrain(g, 0, 0, w, h, 122);
  }],
  // Avis officiel, imprimé bien droit.
  ["poster_notice", 256, 352, (g, w, h) => {
    g.fillStyle = "#f4f0e2"; g.fillRect(4, 4, w - 8, h - 8);
    g.strokeStyle = "#2a221c"; g.lineWidth = 4; g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = "#2a221c"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "bold 36px 'Special Elite', monospace"; g.fillText("AVIS À TOUS", w / 2, 50);
    g.fillRect(34, 76, w - 68, 3);
    g.font = "17px 'Special Elite', monospace";
    ["Pendant l'orage, des mordus", "sont entrés par la porte", "de service.", "", "Le Dr Okafor et le Sgt Bérard", "organisent la descente", "vers l'étage 2.", "", "Ne prenez que le nécessaire.", "Ne remontez pas."]
      .forEach((line, i) => g.fillText(line, w / 2, 100 + i * 21));
    g.save(); g.translate(w - 66, h - 46); g.rotate(-0.25);
    g.strokeStyle = "rgba(168,56,42,0.85)"; g.lineWidth = 3; g.strokeRect(-46, -16, 92, 32);
    g.fillStyle = "rgba(168,56,42,0.85)"; g.font = "bold 16px 'Special Elite', monospace"; g.fillText("OFFICIEL", 0, 1);
    g.restore();
  }],
  // Neuf traits à la craie : un par jour depuis l'orage (un paquet de cinq barré, puis quatre).
  ["tally", 256, 160, (g, w, h) => {
    for (let i = 0; i < 4; i++) chalkStroke(g, [[30 + i * 22, 30 + (i % 3) * 3], [33 + i * 22, 130 - (i % 2) * 5]], 10, 130 + i);
    chalkStroke(g, [[14, 112], [114, 46]], 10, 139);
    for (let i = 0; i < 4; i++) chalkStroke(g, [[148 + i * 24, 28 + (i % 2) * 4], [151 + i * 24, 128 - (i % 3) * 4]], 10, 150 + i);
    chalkGrain(g, 0, 0, w, h, 141, 0.6);

  }],
  // Plan de l'infirmerie : la chambre 1 « CONDAMNÉE (humidité) ».
  ["infirmary_map", 256, 192, (g, w, h) => {
    g.fillStyle = "#e9eef0"; g.fillRect(4, 4, w - 8, h - 8);
    g.strokeStyle = "rgba(60,90,120,0.25)"; g.lineWidth = 1;
    for (let x = 10; x < w; x += 16) { g.beginPath(); g.moveTo(x, 6); g.lineTo(x, h - 6); g.stroke(); }
    for (let y = 10; y < h; y += 16) { g.beginPath(); g.moveTo(6, y); g.lineTo(w - 6, y); g.stroke(); }
    g.strokeStyle = "#2c4a66"; g.lineWidth = 3; g.strokeRect(16, 26, w - 32, h - 46);
    for (let i = 0; i < 4; i++) g.strokeRect(24 + i * 34, 32, 26, 40);
    g.strokeRect(24, h - 62, 26, 40); g.strokeRect(58, h - 62, 26, 40);
    g.fillStyle = "rgba(168,56,42,0.25)"; g.fillRect(w - 92, h - 76, 72, 54);
    g.strokeStyle = "#a8382a"; g.strokeRect(w - 92, h - 76, 72, 54);
    g.beginPath(); g.moveTo(w - 92, h - 76); g.lineTo(w - 20, h - 22); g.moveTo(w - 20, h - 76); g.lineTo(w - 92, h - 22); g.stroke();
    g.fillStyle = "#2c4a66"; g.font = "bold 15px 'Special Elite', monospace"; g.textAlign = "left";
    g.fillText("INFIRMERIE — PLAN", 18, 20);
    g.fillStyle = "#a8382a"; g.font = "bold 12px 'Special Elite', monospace";
    g.fillText("CHAMBRE 1", w - 90, h - 82);
    g.fillText("CONDAMNÉE", w - 120, h - 8);
    g.fillStyle = "#2c4a66"; g.font = "11px 'Special Elite', monospace";
    g.fillText("(humidité)", w - 196, h - 8);
  }],
  // Dessin de Lila : le silo en coupe, quatre étages, une croix au fond, « ICI ÇA TAPE » au troisième.
  ["lila_drawing", 256, 320, (g, w, h) => {
    paperSheet(g, 4, 4, w - 8, h - 8, 151, "#f7f1e1");
    g.lineCap = "round"; g.lineJoin = "round";
    g.strokeStyle = "#f2b53a"; g.lineWidth = 5;
    g.beginPath(); g.arc(w - 40, 34, 16, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "#5e9b3a"; g.lineWidth = 6;
    g.beginPath(); g.moveTo(10, 70); g.quadraticCurveTo(w / 2, 58, w - 10, 72); g.stroke();
    // Silo en coupe.
    g.strokeStyle = "#3a2a1c"; g.lineWidth = 5;
    g.strokeRect(60, 70, 136, 228);
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(60, 70 + i * 57); g.lineTo(196, 70 + i * 57); g.stroke(); }
    g.fillStyle = "#3a2a1c"; g.font = "22px 'Patrick Hand', cursive"; g.textAlign = "center";
    ["1", "2", "3", "4"].forEach((n, i) => g.fillText(n, 44, 104 + i * 57));
    // Bonshommes au premier.
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(90 + i * 34, 92, 6, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(90 + i * 34, 98); g.lineTo(90 + i * 34, 116); g.stroke(); }
    // Croix rouge au dernier étage.
    g.strokeStyle = "#c8453a"; g.lineWidth = 8;
    g.beginPath(); g.moveTo(104, 252); g.lineTo(152, 290); g.moveTo(152, 252); g.lineTo(104, 290); g.stroke();
    // Flèche « ICI ÇA TAPE » vers le troisième.
    g.strokeStyle = "#3f6f86"; g.lineWidth = 4;
    g.beginPath(); g.moveTo(232, 150); g.quadraticCurveTo(236, 200, 200, 212); g.stroke();
    g.beginPath(); g.moveTo(212, 200); g.lineTo(198, 213); g.lineTo(214, 222); g.stroke();
    g.fillStyle = "#3f6f86"; g.font = "20px 'Patrick Hand', cursive";
    g.save(); g.translate(222, 122); g.rotate(-0.15); g.fillText("ICI ÇA", 0, 0); g.fillText("TAPE", 0, 20); g.restore();
    g.fillStyle = "#3a2a1c"; g.font = "18px 'Patrick Hand', cursive"; g.fillText("Lila", 36, h - 16);
  }],
  // Raclures au sol : une armoire qu'on a fait glisser souvent (le long du canevas).
  ["scrapes", 128, 512, (g, w, h) => {
    const r = rng(161);
    g.lineCap = "round";
    for (let k = 0; k < 14; k++) {
      const x = 14 + r() * (w - 28);
      g.strokeStyle = k % 3 ? "rgba(60,48,36,0.55)" : "rgba(250,246,232,0.7)";
      g.lineWidth = 2 + r() * 3;
      g.beginPath(); g.moveTo(x, 20 + r() * 60); g.quadraticCurveTo(x + (r() - 0.5) * 16, h / 2, x + (r() - 0.5) * 10, h - 20 - r() * 80); g.stroke();
    }
    for (let k = 0; k < 6; k++) soft(g, r() * w, r() * h, 14, "rgba(60,50,40,A)", 0.18);
  }],
  // Marques de chariot (deux roues) : elles descendent, aucune ne remonte.
  ["cart_tracks", 128, 512, (g, w, h) => {
    const r = rng(171);
    for (const x0 of [30, 98]) {
      g.strokeStyle = "rgba(34,26,20,0.72)";
      g.lineWidth = 11;

      g.beginPath(); g.moveTo(x0, h);
      for (let y = h; y >= 0; y -= 32) g.lineTo(x0 + Math.sin(y * 0.02) * 4 + (r() - 0.5) * 2, y);
      g.stroke();
      // Chevrons de la bande de roulement, pointés vers le haut (le sens de la descente).
      g.strokeStyle = "rgba(30,24,20,0.45)"; g.lineWidth = 3;
      for (let y = h - 10; y > 0; y -= 16) { g.beginPath(); g.moveTo(x0 - 6, y + 4); g.lineTo(x0, y - 2); g.lineTo(x0 + 6, y + 4); g.stroke(); }
    }
    g.save(); g.globalCompositeOperation = "destination-out";
    for (let k = 0; k < 30; k++) soft(g, r() * w, r() * h, 8 + r() * 20, "rgba(0,0,0,A)", 0.4 + r() * 0.4);
    g.restore();
  }],
  // Calendrier : jours barrés jusqu'à l'orage (un éclair entouré), puis plus rien.
  ["calendar", 256, 288, (g, w, h) => {
    paperSheet(g, 4, 4, w - 8, h - 8, 181, "#f4ecd6");
    g.fillStyle = "#6b7550"; g.fillRect(14, 14, w - 28, 70);
    g.fillStyle = "#e9dcc0"; g.beginPath(); g.moveTo(30, 80); g.lineTo(90, 30); g.lineTo(140, 80); g.fill();
    g.fillStyle = "#d8a43a"; g.beginPath(); g.arc(200, 40, 14, 0, Math.PI * 2); g.fill();
    const cw = (w - 28) / 7, ch = 34;
    for (let i = 0; i < 35; i++) {
      const x = 14 + (i % 7) * cw, y = 96 + Math.floor(i / 7) * ch;
      g.strokeStyle = "rgba(58,42,28,0.5)"; g.lineWidth = 1.5;
      g.strokeRect(x, y, cw, ch);
      g.fillStyle = "#3a2a1c"; g.font = "13px 'Special Elite', monospace"; g.textAlign = "left";
      g.fillText(String(i + 1), x + 3, y + 13);
      if (i < 17) {
        g.strokeStyle = "rgba(168,56,42,0.85)"; g.lineWidth = 3;
        g.beginPath(); g.moveTo(x + 6, y + 6); g.lineTo(x + cw - 6, y + ch - 6); g.moveTo(x + cw - 6, y + 6); g.lineTo(x + 6, y + ch - 6); g.stroke();
      } else if (i === 17) {
        g.fillStyle = "#3f6f86";
        g.beginPath(); g.moveTo(x + cw * 0.55, y + 3); g.lineTo(x + cw * 0.3, y + ch * 0.55); g.lineTo(x + cw * 0.5, y + ch * 0.55); g.lineTo(x + cw * 0.38, y + ch - 2); g.lineTo(x + cw * 0.72, y + ch * 0.42); g.lineTo(x + cw * 0.52, y + ch * 0.42); g.closePath(); g.fill();
        g.strokeStyle = "rgba(168,56,42,0.85)"; g.lineWidth = 2.5; g.beginPath(); g.ellipse(x + cw / 2, y + ch / 2, cw * 0.48, ch * 0.48, 0, 0, Math.PI * 2); g.stroke();
      }
    }
  }],
  // Registre du poste ouvert : « RAS », « RAS »… puis le stylo a glissé.
  ["register", 256, 168, (g, w, h) => {
    g.fillStyle = "#5a3d24"; g.fillRect(0, 0, w, h);
    paperSheet(g, 8, 8, w / 2 - 10, h - 16, 191, "#f1e8cf");
    paperSheet(g, w / 2 + 2, 8, w / 2 - 10, h - 16, 192, "#f1e8cf");
    g.fillStyle = "rgba(60,40,20,0.35)"; g.fillRect(w / 2 - 2, 6, 4, h - 12);
    writeLines(g, ["J−14  RAS", "J−13  RAS", "J−12  RAS", "J−11  RAS", "J−10  RAS", "J−9   RAS", "J−8   RAS"], 18, 30, 15, "'Patrick Hand', cursive", "#2a3a5a", 1.2, 193, 1);
    writeLines(g, ["J−7   RAS", "J−6   RAS", "J−5   RAS", "Orage."], w / 2 + 12, 30, 15, "'Patrick Hand', cursive", "#2a3a5a", 1.2, 194, 1);
    g.strokeStyle = "#2a3a5a"; g.lineWidth = 2; g.lineCap = "round";
    g.beginPath(); g.moveTo(w / 2 + 70, 92); g.bezierCurveTo(w / 2 + 90, 120, w / 2 + 60, 140, w - 14, h - 6); g.stroke();
  }],
  // Cahier de relève de nuit, rien entre 2 h 00 et 2 h 20.
  ["logbook", 256, 168, (g, w, h) => {
    g.fillStyle = "#3f6f6a"; g.fillRect(0, 0, w, h);
    paperSheet(g, 8, 8, w / 2 - 10, h - 16, 201, "#f4efe0");
    paperSheet(g, w / 2 + 2, 8, w / 2 - 10, h - 16, 202, "#f4efe0");
    g.strokeStyle = "rgba(60,90,140,0.25)"; g.lineWidth = 1;
    for (let y = 26; y < h - 10; y += 16) { g.beginPath(); g.moveTo(10, y); g.lineTo(w - 10, y); g.stroke(); }
    writeLines(g, ["0 h 50 : RAS", "1 h 00 : RAS", "1 h 10 : RAS", "1 h 20 : RAS", "1 h 30 : RAS", "1 h 40 : RAS", "1 h 50 : canal 2", " (Dr O. / Sgt B.)"], 14, 24, 13, "'Patrick Hand', cursive", "#2a2a3a", 1.23, 203);
    writeLines(g, ["2 h 00 : orage,", " coupure."], w / 2 + 10, 24, 13, "'Patrick Hand', cursive", "#2a2a3a", 1.23, 204);
    writeLines(g, ["2 h 20 : RAS"], w / 2 + 10, 24 + 13 * 1.23 * 5, 13, "'Patrick Hand', cursive", "#2a2a3a", 1.23, 205);
    g.fillStyle = "#2a2a3a"; g.font = "12px 'Patrick Hand', cursive"; g.fillText("— Nuit", w - 54, h - 16);
  }],
  // Moitié gauche de la consigne de délestage (génératrice).
  ["shed_left", 160, 200, (g, w, h) => {
    paperSheet(g, 4, 4, w - 8, h - 8, 211, "#efe7cf", "right");
    writeLines(g, ["APRÈS UN", "REDÉMARRAGE,", "un circuit à la fois :", "– Jamais le CONTRÔLE", "  en premier", "– L'INFIRMERIE passe", "  juste après la"], 12, 30, 12, "'Special Elite', monospace", "#2a221c", 1.45, 212);
    g.fillStyle = "#c8453a"; g.beginPath(); g.arc(w / 2 - 10, 12, 6, 0, Math.PI * 2); g.fill();
  }],
  // Moitié droite (sécurité).
  ["shed_right", 160, 200, (g, w, h) => {
    paperSheet(g, 4, 4, w - 8, h - 8, 221, "#efe7cf", "left");
    writeLines(g, ["", "", "    CAFÉTÉRIA.", "– Les DORTOIRS", "  toujours avant la", "  cafétéria : les", "  petits dorment.", "– Le CONTRÔLE", "  en dernier."], 22, 30, 12, "'Special Elite', monospace", "#2a221c", 1.45, 222);
    g.fillStyle = "#c8453a"; g.beginPath(); g.arc(w / 2 + 10, 12, 6, 0, Math.PI * 2); g.fill();
  }],
  // Post-it du terminal de Bérard.
  ["postit_terminal", 128, 128, (g, w, h) => {
    g.fillStyle = "#f3d65a"; g.fillRect(6, 6, w - 12, h - 12);
    g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(6, 6, w - 12, 18);
    writeLines(g, ["Mot de passe :", "celui que je", "n'aurais jamais", "laissé dehors."], 12, 44, 15, "'Patrick Hand', cursive", "#2a3a5a", 1.3, 231, 1);
  }],
  // Post-it de Cuisine.
  ["postit_cook", 128, 128, (g, w, h) => {
    g.fillStyle = "#f6c27a"; g.fillRect(6, 6, w - 12, h - 12);
    g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(6, 6, w - 12, 18);
    writeLines(g, ["Code armoire :", "ce qu'on mange", "ENCORE.", "(même le commis)"], 12, 44, 15, "'Patrick Hand', cursive", "#5a2a1a", 1.3, 241, 1);
  }],
  // Dossier de la chambre 1.
  ["room1_file", 192, 240, (g, w, h) => {
    g.fillStyle = "#d9b77a"; g.fillRect(10, 26, w - 20, h - 36);
    g.fillRect(14, 10, 70, 24);
    g.fillStyle = "#f4ecd6"; g.fillRect(30, 60, w - 60, 40);
    g.fillStyle = "#2a221c"; g.font = "bold 18px 'Special Elite', monospace"; g.textAlign = "center";
    g.fillText("CHAMBRE 1", w / 2, 78); g.font = "14px 'Special Elite', monospace"; g.fillText("PATIENT n° 1", w / 2, 95);
    g.fillStyle = "rgba(168,56,42,0.8)"; g.font = "bold 16px 'Special Elite', monospace";
    g.save(); g.translate(w / 2, 160); g.rotate(-0.2); g.fillText("Rapports 1 à 11", 0, 0); g.restore();
    g.fillStyle = "#f4ecd6"; for (let i = 0; i < 4; i++) g.fillRect(w - 26, 40 + i * 4, 10, 2);
  }],
  // Plaque au nom à demi arraché.
  ["nameplate", 192, 64, (g, w, h) => {
    g.fillStyle = "#c9ccc6"; g.fillRect(4, 8, w - 8, h - 16);
    g.fillStyle = "#2a221c"; g.font = "bold 34px 'Special Elite', monospace"; g.textAlign = "left"; g.textBaseline = "middle";
    g.fillText("MARCEAU", 14, h / 2 + 2);
    const r = rng(251);
    g.save(); g.globalCompositeOperation = "destination-out";
    g.beginPath(); g.moveTo(108, 0);
    for (let y = 0; y <= h; y += 8) g.lineTo(100 + r() * 22, y);
    g.lineTo(w, h); g.lineTo(w, 0); g.closePath(); g.fill();
    g.restore();
    g.fillStyle = "rgba(200,190,170,0.9)";
    for (let y = 10; y < h - 8; y += 9) g.fillRect(100 + r() * 16, y, 6, 4);
  }],
  // « toc toc ? » à la craie, au bas d'une porte (Lila).
  ["toc", 256, 128, (g, w, h) => {
    chalkLines(g, ["toc toc ?"], w / 2, h / 2 - 6, 52, 261);
    chalkStroke(g, [[w / 2 - 70, h - 22], [w / 2 + 70, h - 26]], 4, 262);
    chalkGrain(g, 0, 0, w, h, 263);
  }],
  // « D C I C » à moitié effacé (aide de secours de l'énigme des leviers).
  ["dcic", 256, 96, (g, w, h) => {
    chalkLines(g, ["D · C · I · C"], w / 2, h / 2, 54, 271);
    g.save(); g.globalCompositeOperation = "destination-out";
    const r = rng(272);
    for (let k = 0; k < 18; k++) soft(g, r() * w, r() * h, 10 + r() * 22, "rgba(0,0,0,A)", 0.5 + r() * 0.4);
    g.restore();
    chalkGrain(g, 0, 0, w, h, 273);
  }],
  // Triangle gravé (marque discrète sur les verrous).
  ["triangle", 64, 64, (g, w, h) => {
    g.strokeStyle = "rgba(225,205,150,0.85)"; g.lineWidth = 5; g.lineJoin = "round";
    g.beginPath(); g.moveTo(w / 2, 10); g.lineTo(w - 10, h - 12); g.lineTo(10, h - 12); g.closePath(); g.stroke();
  }],
  // Écran du terminal de Bérard.
  ["terminal_screen", 256, 192, (g, w, h) => {
    g.fillStyle = "#0f2418"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#8ff0a8"; g.font = "16px 'Special Elite', monospace"; g.textAlign = "left";
    g.fillText("SILLO 8 — POSTE DE GARDE", 14, 34);
    g.fillText("Journal du poste :", 14, 74);
    g.fillText("verrouillé.", 14, 96);
    g.fillText("MOT DE PASSE : _", 14, 140);
    g.fillStyle = "rgba(143,240,168,0.08)"; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2);
  }],
  // Liste de Lila n° 4 (feuille tenue par un caillou).
  ["lila_list4", 128, 160, (g, w, h) => {
    paperSheet(g, 4, 4, w - 8, h - 8, 281, "#f2ead2");
    g.strokeStyle = "rgba(60,90,140,0.3)"; g.lineWidth = 1;
    for (let y = 26; y < h - 6; y += 14) { g.beginPath(); g.moveTo(6, y); g.lineTo(w - 6, y); g.stroke(); }
    writeLines(g, ["Pour rallumer :", "3 pièces.", "1. la serre", "2. 2 dehors", "3. près de la", " porte de service", "Si je reviens pas :", "la clé est où", "j'ai dit."], 8, 24, 12, "'Patrick Hand', cursive", "#3a2a1c", 1.16, 282, 1);
  }],
  // Tableau d'outils peint : chaque outil à sa place, rangé au millimètre.
  ["tool_board", 256, 384, (g, w, h) => {
    g.fillStyle = "#3e4a44"; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(20,26,24,0.5)";
    for (let y = 10; y < h; y += 20) for (let x = 10; x < w; x += 20) { g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill(); }
    const shapes: [string, () => void][] = [
      ["#a9b2ad", () => { g.beginPath(); g.roundRect(40, 30, 22, 150, 8); g.roundRect(28, 22, 46, 34, 10); }],
      ["#7a4a2a", () => { g.beginPath(); g.roundRect(108, 60, 16, 130, 6); }],
      ["#4d5a60", () => { g.beginPath(); g.roundRect(88, 36, 56, 28, 6); }],
      ["#c8453a", () => { g.beginPath(); g.roundRect(176, 30, 20, 70, 8); }],
      ["#c9ccc6", () => { g.beginPath(); g.roundRect(182, 100, 8, 80, 3); }],
      ["#d8a43a", () => { g.beginPath(); g.roundRect(30, 220, 34, 120, 10); g.roundRect(70, 220, 34, 120, 10); }],
      ["#c9ccc6", () => { g.beginPath(); g.moveTo(140, 220); g.lineTo(232, 220); g.lineTo(232, 260); g.lineTo(140, 300); g.closePath(); }],
      ["#7a4a2a", () => { g.beginPath(); g.roundRect(150, 300, 40, 50, 10); }],
    ];
    // Contour blanc peint, puis l'outil pile dedans.
    for (const [, shape] of shapes) { g.save(); g.strokeStyle = "#f4efe2"; g.lineWidth = 9; shape(); g.stroke(); g.restore(); }
    for (const [color, shape] of shapes) { g.save(); g.fillStyle = color; shape(); g.fill(); g.restore(); }
  }],
  // Dos d'une photo de groupe retournée (valise ouverte du hub).
  ["photo_back", 128, 96, (g, w, h) => {
    g.fillStyle = "#efe7d2"; g.fillRect(4, 4, w - 8, h - 8);
    writeLines(g, ["Nous, au", "printemps."], 16, 40, 18, "'Patrick Hand', cursive", "#5a4a3a", 1.2, 291);
  }],
  // Pochoir « CHAMBRE FROIDE ».
  ["cold_label", 256, 64, (g, w, h) => {
    g.fillStyle = "#3f6f86"; g.font = "bold 30px 'Special Elite', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("CHAMBRE FROIDE", w / 2, h / 2);
    chalkGrain(g, 0, 0, w, h, 301, 0.6);
  }],
  // Pochoir « PILES » sur l'armoire.
  ["piles_label", 256, 96, (g, w, h) => {
    g.fillStyle = "#f2c230"; g.font = "bold 66px 'Special Elite', monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("PILES", w / 2, h / 2 + 4);
    chalkGrain(g, 0, 0, w, h, 311, 0.5);
  }],
  // Mot de Cuisine sur le mur de l'entrepôt.
  ["cook_piles", 192, 224, (g, w, h) => {
    paperSheet(g, 6, 6, w - 12, h - 12, 321, "#f4ecd6");
    g.fillStyle = "#5a2a1a"; g.font = "30px 'Patrick Hand', cursive"; g.textAlign = "center";
    ["PILES :", "ON LES", "COMPTE,", "MAINTENANT."].forEach((l, i) => g.fillText(l, w / 2, 48 + i * 36));
    g.font = "22px 'Patrick Hand', cursive"; g.fillText("— Cuisine", w / 2 + 20, h - 22);
  }],
  // Liste de Lila n° 3 (sous l'oreiller).
  ["lila_list3", 128, 160, (g, w, h) => {
    paperSheet(g, 4, 4, w - 8, h - 8, 331, "#f2ead2");
    writeLines(g, ["Nuit de l'orage.", "1. Plus de piles.", "2. 2 h 05 : une", "lampe VERTE…", "3. du vert sous", "la porte.", "4. Quelqu'un sait."], 8, 26, 12, "'Patrick Hand', cursive", "#3a2a1c", 1.3, 332, 1);
  }],
  // Liste de Lila n° 2 (au fond du panier à piles vide).
  ["lila_list2", 128, 160, (g, w, h) => {
    paperSheet(g, 4, 4, w - 8, h - 8, 341, "#f2ead2");
    writeLines(g, ["Pour le Dr O. :", "1. Quatre piles", "par nuit.", "2. Rien dire", "à Cuisine.", "3. Ce soir :", "armoire fermée."], 8, 26, 12, "'Patrick Hand', cursive", "#3a2a1c", 1.3, 342, 1);
  }],
];

let storyAtlasCache: { texture: Texture; rects: Map<string, [number, number, number, number]> } | null = null;

/**
 * Atlas des images de l'enquête (2048 × 1024, rangées par étagères). `rect(nom)` renvoie [u0, v0, u1, v1]
 * (v vers le haut, comme les UV de three.js).
 */
export function storyAtlas(): { texture: Texture; rect(name: string): [number, number, number, number] } {
  if (!storyAtlasCache) {
    const W = 2048, H = 1024, pad = 6;
    const rects = new Map<string, [number, number, number, number]>();
    const texture = make("story-atlas", W, H, (g) => {
      g.clearRect(0, 0, W, H);
      const sorted = [...STORY_IMAGES].sort((a, b) => b[2] - a[2]);
      let x = pad, y = pad, row = 0;
      for (const [name, w, h, draw] of sorted) {
        if (x + w + pad > W) { x = pad; y += row + pad * 2; row = 0; }
        g.save();
        g.translate(x, y);
        g.beginPath(); g.rect(0, 0, w, h); g.clip();
        draw(g, w, h);
        g.restore();
        rects.set(name, [x / W, 1 - (y + h) / H, (x + w) / W, 1 - y / H]);
        x += w + pad * 2;
        row = Math.max(row, h);
      }
    }, false);
    storyAtlasCache = { texture, rects };
  }
  const { texture, rects } = storyAtlasCache;
  return {
    texture,
    rect(name: string) {
      const r = rects.get(name);
      if (!r) throw new Error(`Image d'enquête inconnue : ${name}`);
      return r;
    },
  };
}

/**
 * Craie de Lila sur la grande porte : « ILS SONT DESCENDUS. PAS TOUS. », en grosses lettres d'enfant.
 * Une seule image pour les deux battants (chaque battant en affiche une moitié).
 */
export function storyDoorChalkTexture(): Texture {
  return make("story-door-chalk", 1024, 416, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    chalkLines(g, ["ILS SONT", "DESCENDUS."], w / 2 - 6, h * 0.33, 126, 1001, "#f6f1e4", 0.98);
    chalkLines(g, ["PAS TOUS."], w / 2 + 14, h * 0.8, 120, 1002, "#f6f1e4");
    // PAS TOUS souligné : on insiste.
    chalkStroke(g, [[w * 0.28, h - 16], [w * 0.5, h - 21], [w * 0.73, h - 15]], 8, 1003, "#f6f1e4");
    chalkGrain(g, 0, 0, w, h, 1004, 0.8);
  }, false);
}
