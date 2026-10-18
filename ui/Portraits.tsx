// Portraits dessinés en SVG, façon jouet en pâte : le bricoleur (fiche personnage) et les voix provisoires.
import type { PortraitId } from "@/game/conversation";

const INK = "#3a2a1c";

/** Le bricoleur : bonnet olive à écusson, veste moutarde, écharpe anthracite, sangle de sacoche. */
export function HeroPortrait() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden>
      <rect width="120" height="120" fill="#e9dcc0" />
      <circle cx="60" cy="62" r="54" fill="#f1e6cc" />
      {/* Veste moutarde à capuche, col crème */}
      <path d="M16 120 C18 94 34 84 60 84 C86 84 102 94 104 120 Z" fill="#d8a43a" stroke={INK} strokeWidth="3" />
      <path d="M30 98 C34 90 40 86 46 86 L44 120 L34 120 Z" fill="#c9952f" stroke={INK} strokeWidth="2.5" />
      <path d="M48 96 L60 120 L72 96 Z" fill="#efe3c4" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M40 90 C48 99 72 99 80 90 L78 84 C70 90 50 90 42 84 Z" fill="#3b3a36" stroke={INK} strokeWidth="2.5" />
      {/* Sangle de cuir et boucle */}
      <path d="M38 88 L86 120" stroke="#6a4528" strokeWidth="7" />
      <path d="M38 88 L86 120" stroke={INK} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.5" />
      <rect x="57" y="100" width="9" height="8" rx="1.5" fill="#d9c58f" stroke={INK} strokeWidth="2" transform="rotate(34 61 104)" />
      {/* Cheveux arrière */}
      <path d="M30 58 C25 76 30 86 40 88 L80 88 C90 86 95 76 90 58 Z" fill="#7a4a2a" stroke={INK} strokeWidth="3" />
      {/* Visage */}
      <ellipse cx="60" cy="62" rx="25" ry="24" fill="#f3c9a4" stroke={INK} strokeWidth="3" />
      <ellipse cx="51" cy="65" rx="3.2" ry="4.4" fill={INK} />
      <ellipse cx="69" cy="65" rx="3.2" ry="4.4" fill={INK} />
      <circle cx="52" cy="63.5" r="1.1" fill="#fff" />
      <circle cx="70" cy="63.5" r="1.1" fill="#fff" />
      <ellipse cx="45" cy="72" rx="4" ry="2.4" fill="#e9957a" opacity="0.6" />
      <ellipse cx="75" cy="72" rx="4" ry="2.4" fill="#e9957a" opacity="0.6" />
      <path d="M56 75 Q60 78 64 75" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Mèches */}
      <path d="M35 56 C40 46 52 44 60 50 C66 44 80 46 86 58 C78 54 72 56 66 52 C62 58 50 58 44 54 C42 58 38 58 35 56 Z" fill="#7a4a2a" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M33 60 C30 66 31 72 34 76" stroke="#7a4a2a" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M87 60 C90 66 89 72 86 76" stroke="#7a4a2a" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* Bonnet olive, revers et écusson cuir */}
      <path d="M30 52 C28 26 44 14 60 14 C78 14 93 26 90 52 Z" fill="#6b7550" stroke={INK} strokeWidth="3" />
      <path d="M44 22 C46 30 46 40 44 46 M60 16 C61 26 61 38 60 46 M76 22 C74 30 74 40 76 46" stroke="#5c6644" strokeWidth="2" fill="none" />
      <rect x="27" y="44" width="66" height="13" rx="6.5" fill="#556045" stroke={INK} strokeWidth="3" />
      <rect x="66" y="28" width="13" height="9" rx="2" fill="#c9a66b" stroke={INK} strokeWidth="2" transform="rotate(-10 72 32)" />
    </svg>
  );
}

/** Voix à la radio : un poste. */
export function RadioPortrait() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden>
      <rect width="120" height="120" fill="#556045" />
      <path d="M78 26 L96 8" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <rect x="16" y="28" width="88" height="64" rx="12" fill="#d8a43a" stroke={INK} strokeWidth="3.5" />
      <circle cx="44" cy="60" r="20" fill="#e9dcc0" stroke={INK} strokeWidth="3" />
      {[50, 56, 62, 68].map((y) => <path key={y} d={`M30 ${y}h28`} stroke={INK} strokeWidth="2" opacity="0.6" />)}
      <rect x="72" y="42" width="22" height="12" rx="3" fill="#3b3a36" stroke={INK} strokeWidth="2.5" />
      <path d="M76 48h14" stroke="#7fe0c9" strokeWidth="2" />
      <circle cx="78" cy="72" r="6" fill="#6a4528" stroke={INK} strokeWidth="2.5" />
      <circle cx="92" cy="72" r="6" fill="#6a4528" stroke={INK} strokeWidth="2.5" />
    </svg>
  );
}

/** Survivant inconnu : silhouette encapuchonnée. */
export function SurvivorPortrait() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden>
      <rect width="120" height="120" fill="#7a4a2a" />
      <path d="M18 120 C20 92 38 80 60 80 C82 80 100 92 102 120 Z" fill="#6b7550" stroke={INK} strokeWidth="3" />
      <path d="M32 74 C28 40 42 20 60 20 C78 20 92 40 88 74 C80 86 40 86 32 74 Z" fill="#556045" stroke={INK} strokeWidth="3" />
      <ellipse cx="60" cy="60" rx="19" ry="20" fill="#3b3a36" />
      <circle cx="53" cy="60" r="2.6" fill="#f2d27a" />
      <circle cx="67" cy="60" r="2.6" fill="#f2d27a" />
    </svg>
  );
}

/** Portrait d'un interlocuteur de conversation (game/conversation.ts). */
export function SpeakerPortrait({ portrait }: { portrait: PortraitId }) {
  if (portrait === "radio") return <RadioPortrait />;
  if (portrait === "hero") return <HeroPortrait />;
  return <SurvivorPortrait />;
}
