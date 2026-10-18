"use client";
// Dessins des gros plans (registre nommé, utilisé par le contenu : `closeup.front.art`, `card.image`).
// Style papier et encre ; chaque dessin reçoit l'inclinaison de l'objet et les détails déjà révélés, pour
// cacher un détail jusqu'au bon angle (seuil en lumière rasante) ou le rendre minuscule hors de la loupe.
import type { ReactNode } from "react";
import { FLOOR1_ART } from "./floor1Art";

export interface ArtProps {
  /** Inclinaison avant / arrière (degrés, 0 = face au joueur). */
  pitch: number;
  /** Détails révélés (index des `details` du gros plan). */
  revealed: boolean[];
}

const INK = "#3a2a1c";
const PAPER = "#f4ecd6";

function Inauguration(): ReactNode {
  // Proportions 1,45 : 290 × 200.
  const crowd = Array.from({ length: 15 }, (_, i) => ({ x: 26 + i * 16.5, y: 112 + (i % 3) * 3, tone: ["#6d6152", "#7c6f5d", "#5b5145"][i % 3] }));
  return (
    <svg viewBox="0 0 290 200" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="290" height="200" fill="#efe4c8" />
      <rect x="10" y="10" width="270" height="170" fill="#b8a888" />
      <rect x="10" y="10" width="270" height="70" fill="#d6c9a8" />
      {/* Porte neuve du silo */}
      <rect x="112" y="34" width="66" height="78" rx="6" fill="#857865" stroke={INK} strokeWidth="2" />
      <path d="M145 34v78M118 60h54M118 86h54" stroke="#5c5244" strokeWidth="2" />
      <rect x="104" y="28" width="82" height="10" fill="#6d6152" />
      <text x="145" y="25" fontSize="9" textAnchor="middle" fill={INK} fontFamily="'Special Elite', monospace">SILLO 8</text>
      {/* Trente personnes souriantes */}
      {crowd.map((p, i) => (
        <g key={i}>
          <rect x={p.x - 6} y={p.y + 8} width="12" height="22" rx="4" fill={p.tone} />
          <circle cx={p.x} cy={p.y} r="6.5" fill="#d9c7a3" stroke="#5c5244" strokeWidth="1" />
          <path d={`M${p.x - 2.5} ${p.y + 1.5}q2.5 2 5 0`} stroke="#5c5244" strokeWidth="1" fill="none" />
        </g>
      ))}
      {/* Au premier plan, quelqu'un de dos, en blouse, une valise marquée d'un triangle */}
      <g>
        <rect x="52" y="136" width="30" height="44" rx="8" fill="#f2ede0" stroke="#5c5244" strokeWidth="1.5" />
        <circle cx="67" cy="128" r="10" fill="#4e4337" />
        <rect x="80" y="150" width="20" height="16" rx="2" fill="#6a4528" stroke={INK} strokeWidth="1.2" />
        <path d="M87 146h6v4" fill="none" stroke={INK} strokeWidth="1.2" />
        <path d="M90 153.5l3.2 5.5h-6.4z" fill="none" stroke="#e9d9a8" strokeWidth="1.1" />
      </g>
      <rect x="10" y="10" width="270" height="170" fill="none" stroke="#8a7a5c" strokeWidth="2" />
    </svg>
  );
}

function PhotoBack(): ReactNode {
  return (
    <svg viewBox="0 0 290 200" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="290" height="200" fill="#f1e8d2" />
      <rect x="14" y="14" width="262" height="172" fill="none" stroke="#d8c9a6" strokeWidth="2" strokeDasharray="6 5" />
      <text x="145" y="108" fontSize="27" textAnchor="middle" fill="#2f3f66" fontFamily="'Patrick Hand', cursive" transform="rotate(-3 145 108)">Jour de la porte.</text>
      <g transform="rotate(8 228 160)">
        <rect x="190" y="146" width="76" height="26" rx="3" fill="none" stroke="#b4532a" strokeWidth="2" />
        <text x="228" y="164" fontSize="10" textAnchor="middle" fill="#b4532a" fontFamily="'Special Elite', monospace">LABO · S8</text>
      </g>
    </svg>
  );
}

/** Seuil de la porte de service : les pas n'apparaissent qu'en lumière rasante (objet incliné). */
function Threshold({ pitch, revealed }: ArtProps): ReactNode {
  const graze = Math.max(revealed[0] ? 0.85 : 0, Math.min(1, (Math.abs(pitch) - 26) / 24));
  const small = Array.from({ length: 6 }, (_, i) => ({ x: 70 + i * 10 + (i % 2 ? 8 : 0), y: 170 - i * 28 }));
  const boots = Array.from({ length: 5 }, (_, i) => ({ x: 220 + (i % 2 ? 14 : 0), y: 30 + i * 34 }));
  return (
    <svg viewBox="0 0 320 200" width="100%" height="100%" aria-hidden>
      <defs>
        <pattern id="dust" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#b9ad93" />
          <circle cx="3" cy="4" r="1.2" fill="#9c8f75" />
          <circle cx="10" cy="11" r="1" fill="#a69a80" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="320" height="200" rx="10" fill="url(#dust)" stroke={INK} strokeWidth="3" />
      <path d="M8 18h304M8 182h304" stroke="#8d8b80" strokeWidth="6" opacity="0.6" />
      <text x="160" y="196" fontSize="9" textAnchor="middle" fill="#6d6152" fontFamily="'Special Elite', monospace">↑ DEHORS · PORTE DE SERVICE · DEDANS ↓</text>
      <g opacity={graze}>
        {small.map((p, i) => (
          <ellipse key={i} cx={p.x} cy={p.y} rx="5" ry="8.5" fill="#8f826a" opacity={0.55 - i * 0.05} />
        ))}
        {boots.map((p, i) => (
          <g key={i}>
            <rect x={p.x - 8} y={p.y - 13} width="16" height="26" rx="7" fill="#9b3d22" opacity="0.85" />
            <path d={`M${p.x - 6} ${p.y - 6}h12M${p.x - 6} ${p.y}h12M${p.x - 6} ${p.y + 6}h12`} stroke="#6e2a17" strokeWidth="1.5" />
          </g>
        ))}
      </g>
    </svg>
  );
}

function Notice(): ReactNode {
  return (
    <svg viewBox="0 0 234 300" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="234" height="300" fill="#f6efdc" stroke={INK} strokeWidth="3" />
      <rect x="0" y="0" width="234" height="46" fill="#b4532a" />
      <text x="117" y="32" fontSize="22" textAnchor="middle" fill="#fff6e2" fontFamily="'Special Elite', monospace">AVIS À TOUS</text>
      <foreignObject x="14" y="56" width="206" height="230">
        <p style={{ margin: 0, fontFamily: "'Special Elite', monospace", fontSize: "13.2px", lineHeight: 1.32, color: INK }}>
          Pendant l&apos;orage, des mordus sont entrés par la porte de service.<br /><br />
          Le Dr Okafor et le Sgt Bérard organisent la descente vers l&apos;étage 2.<br /><br />
          Ne prenez que le nécessaire. Ne remontez pas.
        </p>
      </foreignObject>
      <circle cx="117" cy="8" r="5" fill="#c4412a" stroke={INK} strokeWidth="1.5" />
    </svg>
  );
}

function Plan(): ReactNode {
  const label = { fontFamily: "'Patrick Hand', cursive", fill: INK } as const;
  return (
    <svg viewBox="0 0 260 200" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="260" height="200" fill="#eef1ea" stroke={INK} strokeWidth="3" />
      <path d="M0 14H260M0 28H260M0 42H260M0 56H260M0 70H260M0 84H260M0 98H260M0 112H260M0 126H260M0 140H260M0 154H260M0 168H260M0 182H260" stroke="#c9d6dc" strokeWidth="0.8" />
      <rect x="14" y="14" width="150" height="70" fill="none" stroke="#2f3f66" strokeWidth="2.4" />
      <text x="89" y="56" fontSize="17" textAnchor="middle" {...label}>Lits 1 à 6</text>
      <rect x="170" y="14" width="76" height="70" fill="none" stroke="#2f3f66" strokeWidth="2.4" />
      <text x="208" y="54" fontSize="14" textAnchor="middle" {...label}>Pharmacie</text>
      <rect x="14" y="92" width="110" height="94" fill="none" stroke="#2f3f66" strokeWidth="2.4" />
      <text x="69" y="136" fontSize="13.5" textAnchor="middle" {...label}>Bureau du</text>
      <text x="69" y="153" fontSize="13.5" textAnchor="middle" {...label}>Dr Okafor</text>
      <rect x="132" y="92" width="114" height="94" fill="#e3d5cc" stroke="#2f3f66" strokeWidth="2.4" />
      <path d="M132 92l114 94M246 92l-114 94" stroke="#b4532a" strokeWidth="1.5" opacity="0.6" />
      <text x="189" y="118" fontSize="14" textAnchor="middle" {...label}>Chambre 1 :</text>
      <text x="189" y="140" fontSize="15" textAnchor="middle" fill="#b4532a" fontFamily="'Special Elite', monospace">CONDAMNÉE</text>
      <text x="189" y="157" fontSize="12" textAnchor="middle" {...label}>(humidité)</text>
      <text x="189" y="178" fontSize="10.5" textAnchor="middle" {...label}>Ne pas déplacer l&apos;armoire.</text>
    </svg>
  );
}

/** Brouillon de l'avis : la note en marge est minuscule, lisible à la loupe. */
function Draft({ revealed }: ArtProps): ReactNode {
  const hand = { fontFamily: "'Patrick Hand', cursive", fill: INK } as const;
  return (
    <svg viewBox="0 0 240 300" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="240" height="300" fill="#f7f1e1" stroke={INK} strokeWidth="3" />
      <path d="M0 40H240M0 64H240M0 88H240M0 112H240M0 136H240M0 160H240M0 184H240M0 208H240M0 232H240M0 256H240M0 280H240" stroke="#c9d6dc" strokeWidth="0.8" />
      <path d="M150 0v300" stroke="#e0a49a" strokeWidth="1.2" />
      <text x="14" y="34" fontSize="16" {...hand}>AVIS À TOUS.</text>
      <text x="14" y="58" fontSize="12.5" {...hand}>Pendant l&apos;orage, des</text>
      <text x="14" y="82" fontSize="12.5" {...hand}>mordus sont entrés par</text>
      <text x="14" y="106" fontSize="12.5" {...hand}>la porte de service…</text>
      <path d="M14 126h110M14 150h96" stroke={INK} strokeWidth="1.4" opacity="0.5" />
      <path d="M10 122l120 8M10 146l104 6" stroke={INK} strokeWidth="1.2" opacity="0.6" />
      {/* Note en marge, minuscule : (En marge :) B. — c'est mieux ainsi. Personne ne doit savoir pour M. */}
      <g transform="rotate(-8 187 216)" opacity={revealed[0] ? 1 : 0.85}>
        <text x="157" y="200" fontSize="5.6" {...hand}>B. — c&apos;est mieux</text>
        <text x="157" y="208" fontSize="5.6" {...hand}>ainsi. Personne ne</text>
        <text x="157" y="216" fontSize="5.6" {...hand}>doit savoir</text>
        <text x="157" y="224" fontSize="5.6" {...hand}>pour M.</text>
      </g>
      <circle cx="200" cy="40" r="16" fill="none" stroke="#b98a5a" strokeWidth="5" opacity="0.25" />
    </svg>
  );
}

/** Feuille générique : lignes écrites à la main (pour un document sans dessin propre). */
export function LinesArt({ lines }: { lines: string[] }) {
  return (
    <div style={{ width: "100%", height: "100%", background: PAPER, border: `3px solid ${INK}`, padding: "10%", boxSizing: "border-box", fontFamily: "'Patrick Hand', cursive", color: INK, fontSize: "clamp(14px, 4.4cqw, 22px)", lineHeight: 1.3 }}>
      {lines.map((l, i) => <p key={i} style={{ margin: "0 0 0.4em" }}>{l}</p>)}
    </div>
  );
}

const ART: Record<string, (props: ArtProps) => ReactNode> = {
  inauguration: Inauguration,
  photoBack: PhotoBack,
  threshold: Threshold,
  notice: Notice,
  plan: Plan,
  draft: Draft,
  // Étage 1 : tous les autres gros plans (ui/inquiry/floor1Art.tsx).
  ...FLOOR1_ART,
};

/** Dessine une face ; `lines` seules donnent une feuille manuscrite. */
export function Art({ name, lines, ...props }: ArtProps & { name?: string; lines?: string[] }) {
  const draw = name ? ART[name] : undefined;
  if (draw) return <>{draw(props)}</>;
  return <LinesArt lines={lines ?? []} />;
}

export const ART_NAMES = Object.keys(ART);
