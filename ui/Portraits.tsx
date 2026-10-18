// Portraits dessinés en SVG, façon jouet en pâte : opératrice et interlocuteurs (provisoires).
import type { Character } from "@/game/state";

const INK = "#3a2a1c";

/** Opératrice en bonnet olive et veste moutarde (fiche personnage). */
export function OperatorPortrait() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden>
      <rect width="120" height="120" fill="#e9dcc0" />
      <circle cx="60" cy="62" r="54" fill="#f1e6cc" />
      {/* Veste moutarde, col cheminée et écharpe anthracite */}
      <path d="M18 120 C20 96 36 86 60 86 C84 86 100 96 102 120 Z" fill="#d8a43a" stroke={INK} strokeWidth="3" />
      <path d="M40 92 C48 100 72 100 80 92 L78 86 C70 92 50 92 42 86 Z" fill="#3b3a36" stroke={INK} strokeWidth="2.5" />
      <path d="M44 104 L76 120" stroke="#6a4528" strokeWidth="6" />
      {/* Cheveux arrière */}
      <path d="M30 58 C26 74 30 86 40 88 L80 88 C90 86 94 74 90 58 Z" fill="#7a4a2a" stroke={INK} strokeWidth="3" />
      {/* Visage */}
      <ellipse cx="60" cy="62" rx="25" ry="24" fill="#f3c9a4" stroke={INK} strokeWidth="3" />
      <ellipse cx="51" cy="65" rx="3.2" ry="4.2" fill={INK} />
      <ellipse cx="69" cy="65" rx="3.2" ry="4.2" fill={INK} />
      <circle cx="52" cy="63.5" r="1.1" fill="#fff" />
      <circle cx="70" cy="63.5" r="1.1" fill="#fff" />
      <ellipse cx="45" cy="72" rx="4" ry="2.4" fill="#e9957a" opacity="0.6" />
      <ellipse cx="75" cy="72" rx="4" ry="2.4" fill="#e9957a" opacity="0.6" />
      <path d="M56 75 Q60 78 64 75" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Mèches */}
      <path d="M35 56 C40 46 52 44 60 50 C66 44 80 46 86 58 C78 54 72 56 66 52 C62 58 50 58 44 54 C42 58 38 58 35 56 Z" fill="#7a4a2a" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      {/* Bonnet olive et son écusson */}
      <path d="M30 52 C28 26 44 14 60 14 C78 14 93 26 90 52 Z" fill="#6b7550" stroke={INK} strokeWidth="3" />
      <rect x="27" y="44" width="66" height="13" rx="6.5" fill="#556045" stroke={INK} strokeWidth="3" />
      <rect x="66" y="28" width="13" height="9" rx="2" fill="#c9a66b" stroke={INK} strokeWidth="2" transform="rotate(-10 72 32)" />
    </svg>
  );
}

/** MÈRE : l'œil du terminal. */
export function MotherPortrait() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden>
      <rect width="120" height="120" fill="#556045" />
      <rect x="14" y="22" width="92" height="76" rx="16" fill="#e9dcc0" stroke={INK} strokeWidth="3.5" />
      <ellipse cx="60" cy="60" rx="34" ry="24" fill="#fffaf0" stroke={INK} strokeWidth="3.5" />
      <circle cx="60" cy="60" r="17" fill="#2fb3b0" stroke={INK} strokeWidth="3.5" />
      <circle cx="60" cy="60" r="7" fill={INK} />
      <circle cx="54" cy="54" r="3.5" fill="#fff" />
      <circle cx="34" cy="90" r="3" fill="#d8a43a" />
      <circle cx="44" cy="90" r="3" fill="#6b7550" />
      <circle cx="54" cy="90" r="3" fill="#c4412a" />
    </svg>
  );
}

/** N-7 : petit robot ami. */
export function N7Portrait() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden>
      <rect width="120" height="120" fill="#d8a43a" />
      <line x1="60" y1="12" x2="60" y2="30" stroke={INK} strokeWidth="3.5" />
      <circle cx="60" cy="12" r="6" fill="#c4412a" stroke={INK} strokeWidth="3" />
      <rect x="20" y="30" width="80" height="62" rx="20" fill="#e9dcc0" stroke={INK} strokeWidth="3.5" />
      <rect x="30" y="42" width="60" height="32" rx="12" fill="#3b3a36" stroke={INK} strokeWidth="3" />
      <circle cx="47" cy="58" r="7" fill="#7fe0c9" />
      <circle cx="73" cy="58" r="7" fill="#7fe0c9" />
      <path d="M48 82 Q60 88 72 82" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="10" y="50" width="12" height="24" rx="5" fill="#6b7550" stroke={INK} strokeWidth="3" />
      <rect x="98" y="50" width="12" height="24" rx="5" fill="#6b7550" stroke={INK} strokeWidth="3" />
      <rect x="40" y="94" width="40" height="26" rx="6" fill="#7a4a2a" stroke={INK} strokeWidth="3" />
    </svg>
  );
}

export function CharacterPortrait({ character }: { character: Character }) {
  return character === "mother" ? <MotherPortrait /> : <N7Portrait />;
}
