"use client";
// Inventaire (port de open_inventory de main.gd), icônes papier en SVG.
import type { ReactNode } from "react";
import type { Engine } from "@/game/engine";
import { PaperButton, Stamp, Tag } from "./Paper";
import { useHud } from "./useHud";
import styles from "./sheets.module.css";

const INK = "#3a2a1c";
const line = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

const ICONS: Record<string, ReactNode> = {
  components: (
    <svg viewBox="0 0 48 48" aria-hidden>
      <path d="M24 6l4 5 6-2 1 6 6 2-2 6 4 4-5 3 1 6-6 1-2 6-6-2-5 4-3-5-6 0 0-6-5-3 3-5-3-5 5-3 0-6 6 0 3-5z" fill="#d8a43a" {...line} />
      <circle cx="24" cy="25" r="7" fill="#f4ecd6" {...line} />
    </svg>
  ),
  medkits: (
    <svg viewBox="0 0 48 48" aria-hidden>
      <rect x="8" y="14" width="32" height="26" rx="6" fill="#f4ecd6" {...line} />
      <path d="M18 14v-4h12v4" fill="none" {...line} />
      <path d="M24 20v14M17 27h14" stroke="#c4412a" strokeWidth="5" strokeLinecap="round" />
    </svg>
  ),
  cells: (
    <svg viewBox="0 0 48 48" aria-hidden>
      <rect x="14" y="10" width="20" height="32" rx="5" fill="#6b7550" {...line} />
      <rect x="20" y="5" width="8" height="6" rx="2" fill="#d8a43a" {...line} />
      <path d="M26 16l-6 10h6l-4 10" fill="none" stroke="#f2d27a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  battery: (
    <svg viewBox="0 0 48 48" aria-hidden>
      <rect x="5" y="14" width="34" height="20" rx="5" fill="#f4ecd6" {...line} />
      <rect x="39" y="20" width="5" height="8" rx="1.5" fill={INK} />
      <rect x="9" y="18" width="20" height="12" rx="2.5" fill="#45bfae" />
    </svg>
  ),
  reserve: (
    <svg viewBox="0 0 48 48" aria-hidden>
      {[10, 20, 30].map((x) => (
        <g key={x}>
          <path d={`M${x} 18c0-8 8-8 8 0v22h-8z`} fill="#d8a43a" {...line} />
          <path d={`M${x} 32h8`} {...line} />
        </g>
      ))}
    </svg>
  ),
};

export function InventorySheet({ engine, touch }: { engine: Engine; touch: boolean }) {
  const hud = useHud(engine.hud);
  const items: [string, ReactNode, string][] = [
    ["components", hud.components, "composants"],
    ["medkits", hud.medkits, "trousses"],
    ["cells", hud.cells, "cellules"],
    ["battery", `${hud.energy}/${hud.maxEnergy}`, "batterie"],
    ["reserve", hud.reserve, "réserve D9"],
  ];
  return (
    <section className={styles.inventory} aria-label="Inventaire" data-sheet>
      <Stamp>INVENTAIRE / OPÉRATEUR</Stamp>
      <Tag>SAC DE TERRAIN</Tag>
      <h1 className={styles.title}>Équipement</h1>
      <ul className={styles.items} style={{ listStyle: "none", padding: 0 }}>
        {items.map(([key, value, label]) => (
          <li key={key} className={styles.item}>
            {ICONS[key]}
            <b>{value}</b>
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <div className={styles.itemButtons}>
        <PaperButton variant="primary" hotkey={touch ? undefined : "H"} disabled={hud.medkits <= 0} autoFocus={!touch} onClick={() => engine.useMedkit()}>
          Utiliser une trousse
        </PaperButton>
        <PaperButton variant="olive" hotkey={touch ? undefined : "B"} disabled={hud.cells <= 0} onClick={() => engine.useCell()}>
          Utiliser une cellule
        </PaperButton>
        <PaperButton variant="ghost" className={styles.back} hotkey={touch ? undefined : "Tab"} onClick={() => engine.resume()}>Retour au terrain</PaperButton>
      </div>
      <p className={styles.muted}>
        La borne de recharge gratuite est au poste de sécurité. L&apos;atelier fabrique et améliore avec des pièces.
        Amélioration de batterie : 3 composants.
      </p>
    </section>
  );
}
