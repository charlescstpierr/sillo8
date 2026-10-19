"use client";
// Dessins des gros plans de l'étage 1 (contenu complet de l'enquête), style papier et encre. Chaque dessin est
// enregistré dans le registre de ui/inquiry/art.tsx. Les détails cachés « à la loupe » sont dessinés minuscules, à
// l'endroit indiqué par le contenu (game/investigation/content/objects.ts, `reveal.x` / `reveal.y`).
import type { ReactNode } from "react";
import type { ArtProps } from "./art";

const INK = "#3a2a1c";
const HAND = { fontFamily: "'Patrick Hand', cursive", fill: INK } as const;
const TYPE = { fontFamily: "'Special Elite', monospace", fill: INK } as const;
const CREAM = "#efe6cf";

/** Feuille de papier avec un texte (foreignObject : retour à la ligne automatique). */
function sheetText(w: number, h: number, lines: string[], title?: string): ReactNode {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width={w} height={h} fill="#f7f1e1" stroke={INK} strokeWidth="3" />
      {title ? <text x={w / 2} y="30" fontSize="18" textAnchor="middle" {...TYPE}>{title}</text> : null}
      <foreignObject x="14" y={title ? 42 : 14} width={w - 28} height={h - (title ? 56 : 28)}>
        <div style={{ margin: 0, fontFamily: "'Special Elite', monospace", fontSize: "14px", lineHeight: 1.3, color: INK }}>
          {lines.map((l, i) => <p key={i} style={{ margin: "0 0 0.45em" }}>{l}</p>)}
        </div>
      </foreignObject>
    </svg>
  );
}

function Rule(): ReactNode {
  return (
    <svg viewBox="0 0 234 300" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="234" height="300" fill="#f2ead2" stroke={INK} strokeWidth="3" />
      <rect x="12" y="12" width="210" height="276" fill="none" stroke="#2f3f66" strokeWidth="2" />
      <text x="117" y="70" fontSize="30" textAnchor="middle" {...TYPE}>RÈGLE N° 1</text>
      <path d="M40 86h154" stroke="#b4532a" strokeWidth="3" />
      <foreignObject x="26" y="104" width="182" height="120">
        <p style={{ margin: 0, fontFamily: "'Special Elite', monospace", fontSize: "17px", lineHeight: 1.35, color: INK, textAlign: "center" }}>
          Aucun mordu ne franchit la porte. Pas d&apos;exception.
        </p>
      </foreignObject>
      <text x="117" y="262" fontSize="15" textAnchor="middle" {...TYPE}>— Les fondateurs</text>
    </svg>
  );
}

function Bolts(): ReactNode {
  return (
    <svg viewBox="0 0 240 300" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="240" height="300" fill="#8d8b80" stroke={INK} strokeWidth="3" />
      <path d="M0 0h70v300H0z" fill="#7a786d" />
      <text x="35" y="290" fontSize="10" textAnchor="middle" fill={CREAM} fontFamily="'Special Elite', monospace">DEHORS</text>
      {[60, 150, 240].map((y) => (
        <g key={y}>
          <rect x="70" y={y - 26} width="120" height="52" rx="6" fill="#6d6152" stroke={INK} strokeWidth="2" />
          <rect x="30" y={y - 11} width="170" height="22" rx="10" fill="#b8ad97" stroke={INK} strokeWidth="2" />
          <rect x="150" y={y - 30} width="22" height="34" rx="4" fill="#4e4337" stroke={INK} strokeWidth="2" />
          {[84, 176].map((x) => <circle key={x} cx={x} cy={y + 16} r="4" fill="#3a3229" />)}
        </g>
      ))}
    </svg>
  );
}

/** Lanterne d'enfant : « Lila » au crayon sous le socle, lisible en la basculant. */
function Lantern({ revealed, pitch }: ArtProps): ReactNode {
  const under = Math.max(revealed[0] ? 1 : 0, Math.min(1, (Math.abs(pitch) - 20) / 25));
  return (
    <svg viewBox="0 0 240 300" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="240" height="300" fill="#e9dfc6" />
      <path d="M80 60q40-50 80 0" fill="none" stroke={INK} strokeWidth="5" />
      <rect x="84" y="56" width="72" height="18" rx="4" fill="#6d6152" stroke={INK} strokeWidth="2" />
      <rect x="78" y="74" width="84" height="130" rx="12" fill="#f8f6ee" stroke={INK} strokeWidth="3" opacity="0.92" />
      <path d="M92 100l20 30M150 90l-12 22" stroke="#b9b4a2" strokeWidth="2" />
      <path d="M120 150v26" stroke="#c8b98a" strokeWidth="3" />
      <rect x="66" y="204" width="108" height="40" rx="8" fill="#6d6152" stroke={INK} strokeWidth="3" />
      <ellipse cx="120" cy="266" rx="54" ry="16" fill="#5c5244" stroke={INK} strokeWidth="2" />
      <text x="120" y="272" fontSize="16" textAnchor="middle" fill="#e9dfc6" fontFamily="'Patrick Hand', cursive" opacity={under}>Lila</text>
    </svg>
  );
}

/** Page suivante du journal : l'empreinte du crayon, à peine visible sans la loupe. */
function Imprint(): ReactNode {
  return (
    <svg viewBox="0 0 240 300" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="240" height="300" fill="#f3ecd8" stroke={INK} strokeWidth="3" />
      <path d="M0 6h240" stroke="#b9ad93" strokeWidth="6" strokeDasharray="4 6" />
      {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M0 ${36 + i * 22}H240`} stroke="#c9d6dc" strokeWidth="0.8" />)}
      <g opacity="0.38">
        <text x="20" y="134" fontSize="7.2" {...HAND}>…Marceau, retour d&apos;expédition :</text>
        <text x="20" y="146" fontSize="7.2" {...HAND}>avant-bras bandé. Tient mal la clé.</text>
        <text x="20" y="158" fontSize="7.2" {...HAND}>Il dit que c&apos;est la tôle. On n&apos;a pas</text>
        <text x="20" y="170" fontSize="7.2" {...HAND}>de tôle, aux épaves…</text>
      </g>
      <text x="120" y="270" fontSize="11" textAnchor="middle" fill="#8a7a5c" fontFamily="'Special Elite', monospace">ÉQUIPE TECHNIQUE</text>
    </svg>
  );
}

/** Poignet de Marceau : bracelet d'hôpital (minuscule) et alliance. */
function MarceauHand(): ReactNode {
  return (
    <svg viewBox="0 0 300 250" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="300" height="250" fill="#3e3a33" />
      <path d="M0 150q90-40 170-30l70 4q30 4 30 26t-30 24l-70 6q-80 10-170-6z" fill="#8f9a7c" stroke={INK} strokeWidth="3" />
      <path d="M0 120h60l10 70H0z" fill="#3b4a5a" stroke={INK} strokeWidth="2" />
      <rect x="98" y="102" width="20" height="74" rx="5" fill="#f4f1e6" stroke={INK} strokeWidth="2" />
      <text x="0" y="0" fontSize="3.6" {...TYPE} transform="translate(106 106) rotate(90)">CHAMBRE 1 — DR O. — PATIENT n° 1</text>
      <path d="M240 130q40-6 50 6" stroke="#8f9a7c" strokeWidth="16" strokeLinecap="round" fill="none" />
      <ellipse cx="262" cy="131" rx="5" ry="10" fill="none" stroke="#b9a04a" strokeWidth="4" />
    </svg>
  );
}

/** L'alliance, vue de l'intérieur (verso du gros plan a3). */
function Ring(): ReactNode {
  return (
    <svg viewBox="0 0 300 250" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="300" height="250" fill="#efe4c8" />
      <ellipse cx="150" cy="125" rx="110" ry="80" fill="none" stroke="#8a7330" strokeWidth="26" />
      <ellipse cx="150" cy="125" rx="110" ry="80" fill="none" stroke="#c9ad55" strokeWidth="14" />
      <text x="150" y="132" fontSize="20" textAnchor="middle" fill={INK} fontFamily="'Patrick Hand', cursive">M. — à ma Nuit</text>
    </svg>
  );
}

function ShedLeft(): ReactNode {
  return sheetText(225, 300, ["APRÈS UN REDÉMARRAGE, un circuit à la fois :", "– Jamais le CONTRÔLE en premier : la console tire trop.", "– L'INFIRMERIE passe juste après la ≈≈≈"], "CONSIGNE");
}

function ShedRight(): ReactNode {
  return sheetText(225, 300, ["≈≈ CAFÉTÉRIA.", "– Les DORTOIRS toujours avant la cafétéria : les petits dorment.", "– Le CONTRÔLE en dernier."], "DÉLESTAGE");
}

/** Tableau des circuits : 4 leviers, et sous eux la craie « D C I C », minuscule. */
function LeverBoard(): ReactNode {
  const labels = ["DORTOIRS", "CAFÉTÉRIA", "INFIRMERIE", "CONTRÔLE"];
  return (
    <svg viewBox="0 0 300 230" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="300" height="230" rx="8" fill="#5d6a72" stroke={INK} strokeWidth="3" />
      <text x="150" y="26" fontSize="13" textAnchor="middle" fill={CREAM} fontFamily="'Special Elite', monospace">DÉLESTAGE · CIRCUITS</text>
      {labels.map((l, i) => (
        <g key={l}>
          <rect x={30 + i * 66} y="44" width="40" height="110" rx="6" fill="#3a4248" stroke={INK} strokeWidth="2" />
          <rect x={46 + i * 66} y="56" width="8" height="70" rx="4" fill="#1e1e1e" />
          <circle cx={50 + i * 66} cy="62" r="11" fill="#c4412a" stroke={INK} strokeWidth="2" />
          <text x={50 + i * 66} y="146" fontSize="7.5" textAnchor="middle" fill={CREAM} fontFamily="'Special Elite', monospace">{l}</text>
        </g>
      ))}
      <text x="150" y="204" fontSize="7" textAnchor="middle" fill="#f5f5ee" opacity="0.55" fontFamily="'Patrick Hand', cursive" letterSpacing="5">D C I C</text>
    </svg>
  );
}

function Terminal(): ReactNode {
  return (
    <svg viewBox="0 0 300 230" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="300" height="230" rx="14" fill="#d8d0bb" stroke={INK} strokeWidth="3" />
      <rect x="22" y="20" width="256" height="160" rx="10" fill="#22302a" stroke={INK} strokeWidth="2" />
      <text x="40" y="58" fontSize="12" fill="#8ff0a8" fontFamily="'Special Elite', monospace">POSTE D&apos;ENTRÉE · SGT BÉRARD</text>
      <text x="40" y="94" fontSize="15" fill="#8ff0a8" fontFamily="'Special Elite', monospace">MOT DE PASSE : _</text>
      <g transform="rotate(4 230 150)">
        <rect x="186" y="112" width="86" height="72" fill="#ffe36b" stroke="#b39a2a" strokeWidth="1.5" />
        <foreignObject x="190" y="114" width="80" height="70">
          <p style={{ margin: 0, fontFamily: "'Patrick Hand', cursive", fontSize: "9.5px", lineHeight: 1.15, color: INK }}>Mot de passe : le nom de celui que je n&apos;aurais jamais laissé dehors.</p>
        </foreignObject>
      </g>
      <rect x="60" y="192" width="180" height="22" rx="5" fill="#bfb6a0" stroke={INK} strokeWidth="1.5" />
    </svg>
  );
}

function PostIt(): ReactNode {
  return (
    <svg viewBox="0 0 260 260" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="260" height="260" fill="#ffe36b" stroke="#b39a2a" strokeWidth="3" />
      <foreignObject x="18" y="22" width="224" height="220">
        <div style={{ fontFamily: "'Patrick Hand', cursive", fontSize: "20px", lineHeight: 1.2, color: INK }}>
          <p style={{ margin: "0 0 0.6em" }}>Code de l&apos;armoire à piles : ce qu&apos;on mange <b>ENCORE</b>.</p>
          <p style={{ margin: 0, fontSize: "16px" }}>(Comme ça, même le commis s&apos;en souviendra.)</p>
        </div>
      </foreignObject>
    </svg>
  );
}

/** Neuf traits à la craie sur la porte de la chambre froide, et la colonne « L'ÉTRANGER ». */
function Tally(): ReactNode {
  const strokes = Array.from({ length: 9 }, (_, i) => 36 + i * 20 + (i >= 5 ? 14 : 0));
  return (
    <svg viewBox="0 0 255 300" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="255" height="300" fill="#9aa3a6" stroke={INK} strokeWidth="3" />
      <rect x="10" y="10" width="235" height="280" fill="none" stroke="#7d878a" strokeWidth="3" />
      {strokes.map((x, i) => <path key={i} d={`M${x} 60l${i % 2 ? 3 : -2} 70`} stroke="#f5f5ee" strokeWidth="5" strokeLinecap="round" />)}
      <text x="128" y="200" fontSize="18" textAnchor="middle" fill="#f5f5ee" fontFamily="'Patrick Hand', cursive">L&apos;ÉTRANGER</text>
      <path d="M70 212h116" stroke="#f5f5ee" strokeWidth="2" opacity="0.5" />
    </svg>
  );
}

function Ticket(): ReactNode {
  return (
    <svg viewBox="0 0 300 200" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="300" height="200" fill="#9c9488" />
      <rect x="18" y="20" width="264" height="160" fill="#fbf6e6" stroke={INK} strokeWidth="2" />
      <path d="M18 20h264" stroke="#b4532a" strokeWidth="6" />
      <foreignObject x="30" y="34" width="240" height="140">
        <div style={{ fontFamily: "'Special Elite', monospace", fontSize: "15px", lineHeight: 1.3, color: INK }}>
          <p style={{ margin: "0 0 0.5em" }}>Plateau — chambre 1. Le poser devant la porte, frapper deux fois.</p>
          <p style={{ margin: 0 }}><b>NE PAS ENTRER.</b> — Dr O.</p>
        </div>
      </foreignObject>
    </svg>
  );
}

/** Cadenas à six molettes sur la porte de l'armoire à piles ; ouvert, l'anse sautée et la combinaison visible. */
function Padlock({ solved }: ArtProps): ReactNode {
  const letters = solved ? [..."PECHES"] : Array.from({ length: 6 }, () => "?");
  return (
    <svg viewBox="0 0 270 300" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="270" height="300" fill="#7c8a6a" stroke={INK} strokeWidth="3" />
      <path d="M135 0v300" stroke={INK} strokeWidth="2" />
      {solved ? (
        // Anse sortie de son logement et pivotée : le cadenas est ouvert.
        <path d="M95 92v-34a40 40 0 0 1 80 0v6" fill="none" stroke="#9a9a92" strokeWidth="12" transform="rotate(-18 95 100)" />
      ) : (
        <path d="M95 110v-34a40 40 0 0 1 80 0v34" fill="none" stroke="#9a9a92" strokeWidth="12" />
      )}
      <rect x="62" y="108" width="146" height="110" rx="14" fill="#d8a43a" stroke={INK} strokeWidth="3" />
      {solved ? <circle cx="175" cy="112" r="7" fill="#3b2a1d" /> : null}
      {letters.map((letter, i) => (
        <g key={i}>
          <rect x={74 + i * 21} y="140" width="17" height="44" rx="3" fill={solved ? "#2f4a2a" : "#3b2a1d"} stroke={INK} strokeWidth="1.5" />
          <text x={82.5 + i * 21} y="168" fontSize="13" textAnchor="middle" fill="#fff6e2" fontFamily="'Special Elite', monospace">{letter}</text>
        </g>
      ))}
      <text x="135" y="250" fontSize="12" textAnchor="middle" fill={CREAM} fontFamily="'Special Elite', monospace">{solved ? "OUVERT · PÊCHES" : "PILES · COMPTÉES"}</text>
    </svg>
  );
}

/** L'armoire de l'infirmerie, poussée : derrière, une porte. */
function Cabinet(): ReactNode {
  return (
    <svg viewBox="0 0 240 300" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="240" height="300" fill="#e3e8e2" stroke={INK} strokeWidth="3" />
      <rect x="20" y="40" width="110" height="250" fill="#3e3a33" stroke={INK} strokeWidth="3" />
      <text x="75" y="70" fontSize="13" textAnchor="middle" fill={CREAM} fontFamily="'Special Elite', monospace">CHAMBRE 1</text>
      <circle cx="116" cy="170" r="5" fill="#d8a43a" />
      <g transform="rotate(4 180 170)">
        <rect x="118" y="30" width="110" height="262" rx="4" fill="#7c8a6a" stroke={INK} strokeWidth="3" />
        <path d="M173 44v236" stroke={INK} strokeWidth="2" />
      </g>
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M18 ${292 - i * 2}q60 -${8 + i * 3} 120 0`} stroke="rgba(40,28,18,0.5)" strokeWidth="2" fill="none" />)}
    </svg>
  );
}

/** Lampe de chevet : la douille vide, un minuscule éclat vert dedans. */
function BedLamp(): ReactNode {
  return (
    <svg viewBox="0 0 240 300" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="240" height="300" fill="#efe9da" stroke={INK} strokeWidth="3" />
      <path d="M70 40h100l30 70H40z" fill="#f4e7b8" stroke={INK} strokeWidth="3" />
      <rect x="104" y="78" width="32" height="26" rx="4" fill="#8a8578" stroke={INK} strokeWidth="2" />
      <ellipse cx="120" cy="90" rx="10" ry="6" fill="#3a3229" />
      <path d="M116 89l5 -3l2 5z" fill="#4fd36a" stroke="#1f6b31" strokeWidth="0.6" />
      <rect x="114" y="110" width="12" height="130" fill="#6d6152" />
      <ellipse cx="120" cy="250" rx="60" ry="16" fill="#6d6152" stroke={INK} strokeWidth="3" />
    </svg>
  );
}

function Lock(): ReactNode {
  return (
    <svg viewBox="0 0 270 300" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="270" height="300" fill="#cfd5d0" stroke={INK} strokeWidth="3" />
      <rect x="70" y="70" width="130" height="160" rx="10" fill="#5d6a72" stroke={INK} strokeWidth="3" />
      <circle cx="135" cy="110" r="10" fill="#7a2a1c" stroke={INK} strokeWidth="2" />
      <text x="135" y="150" fontSize="12" textAnchor="middle" fill={CREAM} fontFamily="'Special Elite', monospace">SERRURE</text>
      <text x="135" y="166" fontSize="12" textAnchor="middle" fill={CREAM} fontFamily="'Special Elite', monospace">ÉLECTRIQUE</text>
      <rect x="200" y="130" width="40" height="40" fill="#8d8b80" stroke={INK} strokeWidth="2" />
      <text x="220" y="196" fontSize="10" textAnchor="middle" {...TYPE}>gâche libre</text>
    </svg>
  );
}

/** Dossier de la chambre 1 : la mention du « vieux dossier du fond » est minuscule. */
function RoomFile(): ReactNode {
  return (
    <svg viewBox="0 0 240 300" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="240" height="300" fill="#f7f1e1" stroke={INK} strokeWidth="3" />
      <rect x="0" y="0" width="240" height="26" fill="#b98a5a" />
      <text x="120" y="18" fontSize="12" textAnchor="middle" fill="#fff6e2" fontFamily="'Special Elite', monospace">CHAMBRE 1 · DR O.</text>
      <text x="14" y="62" fontSize="10.5" {...HAND}>Rapport n° 1 : patient M., morsure à l&apos;avant-bras.</text>
      <text x="50" y="92" fontSize="5" {...HAND}>Même forme que dans le vieux dossier du fond.</text>
      <foreignObject x="14" y="122" width="212" height="170">
        <div style={{ fontFamily: "'Patrick Hand', cursive", fontSize: "10.5px", lineHeight: 1.3, color: INK }}>
          <p style={{ margin: "0 0 0.8em" }}>Rapport n° 7 : sous deux lampes, il reste assis. Il se calme quand <u>elle</u> lui parle.</p>
          <p style={{ margin: 0 }}>Rapport n° 11 : il ne parle plus. Il ne grogne plus. Plus aucun bruit. — Dr O.</p>
        </div>
      </foreignObject>
    </svg>
  );
}

function Inseparables(): ReactNode {
  return (
    <svg viewBox="0 0 290 200" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="290" height="200" fill="#efe4c8" />
      <rect x="10" y="10" width="270" height="170" fill="#b8a888" />
      <rect x="150" y="40" width="110" height="110" rx="8" fill="#6d6152" stroke={INK} strokeWidth="2" />
      <circle cx="205" cy="95" r="26" fill="#857865" stroke={INK} strokeWidth="2" />
      {[90, 130].map((x, i) => (
        <g key={x}>
          <rect x={x - 18} y="96" width="36" height="76" rx="10" fill={i ? "#4e5d3a" : "#3b4a5a"} stroke={INK} strokeWidth="1.5" />
          <circle cx={x} cy="80" r="16" fill="#d9c7a3" stroke="#5c5244" strokeWidth="1.5" />
          <path d={`M${x - 7} 84q7 7 14 0`} stroke="#5c5244" strokeWidth="1.5" fill="none" />
          <path d={`M${x - 10} 100l12 8`} stroke="#2a2420" strokeWidth="4" opacity="0.5" />
        </g>
      ))}
      <path d="M108 104q12 -10 22 0" stroke="#d9c7a3" strokeWidth="9" fill="none" strokeLinecap="round" />
      <rect x="10" y="10" width="270" height="170" fill="none" stroke="#8a7a5c" strokeWidth="2" />
    </svg>
  );
}

function InseparablesBack(): ReactNode {
  return (
    <svg viewBox="0 0 290 200" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="290" height="200" fill="#f1e8d2" />
      <text x="145" y="100" fontSize="24" textAnchor="middle" fill="#2f3f66" fontFamily="'Patrick Hand', cursive" transform="rotate(-3 145 100)">Mes deux inséparables.</text>
      <text x="200" y="140" fontSize="24" textAnchor="middle" fill="#2f3f66" fontFamily="'Patrick Hand', cursive">— N.</text>
    </svg>
  );
}

/** Cahier de relève : à gauche une nuit ordinaire, serrée ; à droite la nuit de l'orage, avec son trou. */
function Logbook(): ReactNode {
  const dense = Array.from({ length: 12 }, (_, i) => `${Math.floor(i / 6) + 1} h ${String((i % 6) * 10).padStart(2, "0")} : RAS.`);
  return (
    <svg viewBox="0 0 320 237" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="320" height="237" rx="6" fill="#f7f1e1" stroke={INK} strokeWidth="3" />
      <path d="M160 0v237" stroke="#b98a5a" strokeWidth="3" />
      <text x="80" y="22" fontSize="10" textAnchor="middle" {...TYPE}>Nuit précédente</text>
      {dense.map((l, i) => <text key={i} x="14" y={40 + i * 15} fontSize="8.5" {...HAND}>{l}</text>)}
      <text x="240" y="22" fontSize="10" textAnchor="middle" {...TYPE}>Nuit de l&apos;orage</text>
      <text x="172" y="44" fontSize="10" {...HAND}>1 h 40 : RAS.</text>
      <text x="172" y="62" fontSize="10" {...HAND}>1 h 50 : canal 2 (Dr O. / Sgt B.).</text>
      <text x="172" y="80" fontSize="10" {...HAND}>2 h 00 : orage, coupure.</text>
      <text x="172" y="184" fontSize="10" {...HAND}>2 h 20 : RAS.</text>
      <text x="200" y="214" fontSize="11" fill="#2f3f66" fontFamily="'Patrick Hand', cursive">— Opératrice de nuit</text>
    </svg>
  );
}

/** Lampe de poche à filtre vert ; l'ébréchure est petite, sur le filtre. */
function GreenLamp(): ReactNode {
  return (
    <svg viewBox="0 0 300 273" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="300" height="273" fill="#3e3a33" />
      <rect x="110" y="110" width="170" height="54" rx="14" fill="#4e5d3a" stroke={INK} strokeWidth="3" />
      <path d="M110 100l-40 -20v114l40 -20z" fill="#5c5244" stroke={INK} strokeWidth="3" />
      <ellipse cx="74" cy="137" rx="16" ry="57" fill="#57c46a" stroke={INK} strokeWidth="3" opacity="0.95" />
      <path d="M72 128l7 -5l3 9z" fill="#3e3a33" />
      <rect x="200" y="104" width="22" height="8" rx="3" fill="#d8a43a" />
    </svg>
  );
}

/** Porte du local technique, vue de biais : le loquet manuel tourné de l'intérieur. */
function Latch({ revealed, pitch }: ArtProps): ReactNode {
  void pitch;
  return (
    <svg viewBox="0 0 270 300" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="270" height="300" fill="#5d6a72" stroke={INK} strokeWidth="3" />
      <text x="135" y="40" fontSize="14" textAnchor="middle" fill={CREAM} fontFamily="'Special Elite', monospace">LOCAL TECHNIQUE</text>
      <rect x="150" y="120" width="60" height="70" rx="6" fill="#3a4248" stroke={INK} strokeWidth="2" />
      <circle cx="180" cy="140" r="7" fill="#57c46a" />
      <rect x="226" y="60" width="14" height="220" fill="#1a1612" />
      <g opacity={revealed[0] ? 1 : 0.35}>
        <rect x="229" y="150" width="8" height="26" fill="#d8a43a" />
        <path d="M233 150v-10" stroke="#d8a43a" strokeWidth="5" />
      </g>
      <text x="80" y="200" fontSize="11" textAnchor="middle" fill={CREAM} fontFamily="'Special Elite', monospace">INTERPHONE</text>
      <rect x="50" y="210" width="60" height="40" rx="4" fill="#3a4248" stroke={INK} strokeWidth="2" />
    </svg>
  );
}

function Folded(): ReactNode {
  return (
    <svg viewBox="0 0 240 300" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="240" height="300" fill="#3b4a5a" />
      <path d="M50 70h140v170H50z" fill="#f3ecd8" stroke={INK} strokeWidth="3" />
      <path d="M50 155h140M120 70v170" stroke="#c9bd9e" strokeWidth="2" />
      <rect x="150" y="40" width="20" height="70" rx="8" fill="#c9c2b0" stroke={INK} strokeWidth="2" transform="rotate(20 160 75)" />
      <text x="120" y="280" fontSize="11" textAnchor="middle" fill={CREAM} fontFamily="'Special Elite', monospace">POCHE DE POITRINE</text>
    </svg>
  );
}

function KeyTag(): ReactNode {
  return (
    <svg viewBox="0 0 300 200" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="300" height="200" fill="#d9cfb6" />
      <rect x="20" y="50" width="130" height="84" rx="8" fill="#e8e3d5" stroke={INK} strokeWidth="3" />
      <rect x="34" y="66" width="40" height="28" fill="#d8a43a" />
      <text x="85" y="122" fontSize="11" textAnchor="middle" {...TYPE}>ACCÈS ÉTAGE 2</text>
      <path d="M150 92q30 0 40 -10" stroke={INK} strokeWidth="2" fill="none" />
      <g transform="rotate(-6 236 90)">
        <rect x="176" y="42" width="112" height="96" rx="6" fill="#fbf6e6" stroke={INK} strokeWidth="2" />
        <circle cx="190" cy="56" r="5" fill="none" stroke={INK} strokeWidth="2" />
        <foreignObject x="184" y="64" width="98" height="72">
          <p style={{ margin: 0, fontFamily: "'Patrick Hand', cursive", fontSize: "12.5px", lineHeight: 1.15, color: INK }}>Pour Lila — ferme derrière toi. — Dr O.</p>
        </foreignObject>
      </g>
    </svg>
  );
}

/** Dessin de Lila : le silo en coupe, quatre étages, « ICI ÇA TAPE » au troisième, une croix au dernier. */
function Drawing(): ReactNode {
  return (
    <svg viewBox="0 0 210 300" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="210" height="300" fill="#fbf8ee" stroke={INK} strokeWidth="3" />
      <path d="M20 40q85 -30 170 0" stroke="#4e8a3a" strokeWidth="5" fill="none" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="40" y={50 + i * 58} width="130" height="52" fill="none" stroke="#2f3f66" strokeWidth="3" strokeLinejoin="round" />
          <text x="48" y={70 + i * 58} fontSize="12" fill="#2f3f66" fontFamily="'Patrick Hand', cursive">{i + 1}</text>
        </g>
      ))}
      <path d="M90 236l40 30M130 236l-40 30" stroke="#c4412a" strokeWidth="4" />
      <path d="M200 192h-28" stroke="#c4412a" strokeWidth="3" />
      <path d="M172 192l8 -6M172 192l8 6" stroke="#c4412a" strokeWidth="3" />
      <text x="140" y="182" fontSize="11" fill="#c4412a" fontFamily="'Patrick Hand', cursive" textAnchor="middle">ICI ÇA TAPE</text>
      <circle cx="100" cy="76" r="6" fill="#f2c23a" />
    </svg>
  );
}

/** Le paquet noué de Lou : un chiffon serré, qu'il n'ouvre pas. */
function Bundle(): ReactNode {
  return (
    <svg viewBox="0 0 300 250" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="300" height="250" fill="#7a4f2c" />
      <path d="M70 90q80 -40 160 0q20 60 0 100q-80 30 -160 0q-20 -50 0 -100z" fill="#cdbf9f" stroke={INK} strokeWidth="3" />
      <path d="M90 110q60 20 120 0M85 160q65 -15 130 2" stroke="#a89878" strokeWidth="2" fill="none" />
      <path d="M150 70q-14 30 0 70q14 -40 0 -70z" fill="#a89878" stroke={INK} strokeWidth="2" />
      <path d="M130 128q20 -12 40 0q-20 14 -40 0z" fill="#8a7a5c" stroke={INK} strokeWidth="2" />
      <path d="M150 140q-24 30 -40 40M150 140q24 30 40 40" stroke="#8a7a5c" strokeWidth="5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Montre de l'infirmier : verre fendu ; l'heure, petite, se lit à la loupe. */
function Watch(): ReactNode {
  const hour = ((2 + 14 / 60) / 12) * Math.PI * 2;
  const minute = (14 / 60) * Math.PI * 2;
  return (
    <svg viewBox="0 0 300 250" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="300" height="250" fill="#e3e8e2" />
      <rect x="120" y="0" width="60" height="250" fill="#5b5145" />
      <circle cx="150" cy="112" r="56" fill="#f4f1e6" stroke={INK} strokeWidth="5" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <path key={i} d={`M${150 + Math.sin(a) * 44} ${112 - Math.cos(a) * 44}L${150 + Math.sin(a) * 50} ${112 - Math.cos(a) * 50}`} stroke={INK} strokeWidth="2" />;
      })}
      <path d={`M150 112L${150 + Math.sin(hour) * 26} ${112 - Math.cos(hour) * 26}`} stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d={`M150 112L${150 + Math.sin(minute) * 40} ${112 - Math.cos(minute) * 40}`} stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M118 80l26 30l-8 22M160 100l26 -8" stroke="#8a8578" strokeWidth="1.2" fill="none" />
      <text x="150" y="146" fontSize="6" textAnchor="middle" {...TYPE}>2 h 14</text>
    </svg>
  );
}

export const FLOOR1_ART: Record<string, (props: ArtProps) => ReactNode> = {
  rule: Rule,
  bolts: Bolts,
  lantern: Lantern,
  imprint: Imprint,
  hand: MarceauHand,
  ring: Ring,
  shedLeft: ShedLeft,
  shedRight: ShedRight,
  levers: LeverBoard,
  terminal: Terminal,
  postit: PostIt,
  tally: Tally,
  ticket: Ticket,
  padlock: Padlock,
  cabinet: Cabinet,
  bedLamp: BedLamp,
  lock: Lock,
  file: RoomFile,
  inseparables: Inseparables,
  inseparablesBack: InseparablesBack,
  logbook: Logbook,
  greenLamp: GreenLamp,
  latch: Latch,
  folded: Folded,
  keyTag: KeyTag,
  drawing: Drawing,
  bundle: Bundle,
  watch: Watch,
};
