// Icônes papier en SVG (encre brune, palette moutarde / olive / cuir), partagées HUD et fiches.
import type { ReactNode } from "react";

export const INK = "#3a2a1c";
const line = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export type IconName =
  | "scrap" | "cell" | "bandage" | "medkit" | "can" | "wrench" | "nailgun" | "nails"
  | "lamp" | "heart" | "journal" | "bag" | "hand" | "swap";

const ICONS: Record<IconName, ReactNode> = {
  // Ferraille : roue dentée et boulon
  scrap: (
    <>
      <path d="M24 5l4 5 6-2 1 6 6 2-2 6 4 4-5 3 1 6-6 1-2 6-6-2-5 4-3-5-6 0 0-6-5-3 3-5-3-5 5-3 0-6 6 0 3-5z" fill="#d8a43a" {...line} />
      <circle cx="24" cy="24" r="7" fill="#f4ecd6" {...line} />
      <path d="M21 24h6" {...line} />
    </>
  ),
  // Pile de rechange
  cell: (
    <>
      <rect x="13" y="11" width="22" height="31" rx="5" fill="#6b7550" {...line} />
      <rect x="19" y="5" width="10" height="7" rx="2" fill="#d8a43a" {...line} />
      <path d="M13 32h22" stroke={INK} strokeWidth="2.5" />
      <path d="M26 16l-6 9h7l-5 9" fill="none" stroke="#f2d27a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // Bandage roulé
  bandage: (
    <>
      <path d="M8 30c0-9 6-16 15-16h17v16H23" fill="#f4ecd6" {...line} />
      <ellipse cx="17" cy="30" rx="9" ry="9" fill="#efe3c4" {...line} />
      <circle cx="17" cy="30" r="3.5" fill="#e0cfa6" {...line} />
      <path d="M30 18v8M35 18v8" stroke="#c9b48a" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  // Trousse de soin
  medkit: (
    <>
      <rect x="7" y="14" width="34" height="26" rx="6" fill="#f4ecd6" {...line} />
      <path d="M18 14v-4h12v4" fill="none" {...line} />
      <path d="M24 20v14M17 27h14" stroke="#c4412a" strokeWidth="5" strokeLinecap="round" />
    </>
  ),
  // Conserve
  can: (
    <>
      <path d="M11 13v24c0 4 6 6 13 6s13-2 13-6V13" fill="#b4532a" {...line} />
      <ellipse cx="24" cy="13" rx="13" ry="5" fill="#d9d2c2" {...line} />
      <rect x="11" y="21" width="26" height="11" fill="#f4ecd6" stroke={INK} strokeWidth="2.5" />
      <circle cx="24" cy="26.5" r="3" fill="#d8a43a" stroke={INK} strokeWidth="1.8" />
    </>
  ),
  // Clé à molette
  wrench: (
    <>
      <path d="M33 6a9 9 0 0 0-8 12L8 35a4 4 0 0 0 6 6l17-17a9 9 0 0 0 12-8l-6 3-5-2-1-5 2-6z" fill="#b7b9b0" {...line} />
      <circle cx="11.5" cy="37.5" r="1.8" fill={INK} />
      <path d="M17 31l4 4" stroke="#6b7550" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  // Lance-clous
  nailgun: (
    <>
      <path d="M6 13h28l6 4v6H24l-3 4H6z" fill="#d8a43a" {...line} />
      <path d="M12 27l-2 14h9l3-14" fill="#6a4528" {...line} />
      <rect x="23" y="23" width="9" height="8" rx="2" fill="#6b7550" {...line} />
      <path d="M40 20h4" {...line} />
      <path d="M10 18h14" stroke="#f2d27a" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  // Poignée de clous
  nails: (
    <>
      {[11, 21, 31].map((x, i) => (
        <g key={x} transform={`rotate(${(i - 1) * 8} ${x + 3} 26)`}>
          <rect x={x - 2} y="8" width="10" height="4" rx="1.5" fill="#b7b9b0" {...line} strokeWidth={2.5} />
          <path d={`M${x + 3} 12v22l0 6`} stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
          <path d={`M${x + 3} 12v22`} stroke="#d0d2c8" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ))}
    </>
  ),
  // Lampe torche
  lamp: (
    <>
      <path d="M30 18L44 4M32 22l14-6M26 16l6-13" stroke="#e3a12a" strokeWidth="3" strokeLinecap="round" />
      <g transform="rotate(-45 22 26)">
        <rect x="4" y="20" width="22" height="12" rx="3" fill="#6b7550" {...line} />
        <path d="M26 17h9l3 3v12l-3 3h-9z" fill="#d8a43a" {...line} />
        <path d="M38 21v10" stroke="#fff3c4" strokeWidth="3" strokeLinecap="round" />
        <rect x="11" y="23" width="6" height="6" rx="1.5" fill="#c4412a" stroke={INK} strokeWidth="2" />
      </g>
    </>
  ),
  heart: (
    <path d="M24 41S7 30 7 18c0-6 4-10 9-10 4 0 6 2 8 5 2-3 4-5 8-5 5 0 9 4 9 10 0 12-17 23-17 23z" fill="#e0674a" {...line} />
  ),
  // Carnet en cuir
  journal: (
    <>
      <rect x="10" y="6" width="28" height="36" rx="4" fill="#7a4a2a" {...line} />
      <path d="M15 6v36" stroke="#e9dcc0" strokeWidth="2" strokeDasharray="3 3" />
      <rect x="20" y="13" width="13" height="8" rx="1.5" fill="#f4ecd6" stroke={INK} strokeWidth="2" />
      <path d="M38 22h4v8h-4" fill="#d8a43a" {...line} strokeWidth={2.5} />
    </>
  ),
  bag: (
    <>
      <path d="M15 16c0-6 4-9 9-9s9 3 9 9" fill="none" {...line} />
      <rect x="7" y="16" width="34" height="25" rx="6" fill="#7a4a2a" {...line} />
      <path d="M7 24h34" stroke={INK} strokeWidth="2.5" />
      <rect x="20" y="21" width="8" height="8" rx="1.5" fill="#d8a43a" stroke={INK} strokeWidth="2" />
    </>
  ),
  hand: (
    <path d="M14 26V14a3 3 0 0 1 6 0v8V10a3 3 0 0 1 6 0v12V12a3 3 0 0 1 6 0v12-6a3 3 0 0 1 6 0v12c0 8-5 13-12 13h-2c-5 0-8-3-11-7l-5-7a3 3 0 0 1 5-4z" fill="#f3c9a4" {...line} strokeWidth={2.6} />
  ),
  swap: (
    <>
      <path d="M8 17h28l-6-6M40 31H12l6 6" fill="none" {...line} strokeWidth={3.5} />
    </>
  ),
};

export function Icon({ name, size, className, title }: { name: IconName; size?: number; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
      {title ? <title>{title}</title> : null}
      {ICONS[name]}
    </svg>
  );
}
