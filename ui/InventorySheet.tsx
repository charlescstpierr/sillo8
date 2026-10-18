"use client";
// Sac du bricoleur : armes, soins, lampe et matériaux, rangés en poches cousues.
import type { ReactNode } from "react";
import type { Engine } from "@/game/engine";
import { CELL_CHARGE, GENERATOR_PARTS, HEAL, NAIL_CAPACITY, NAILS_PER_SCRAP, RADIO_PARTS, UPGRADE_PARTS } from "@/game/state";
import { PaperButton, Stamp, Tag } from "./Paper";
import { useHud } from "./useHud";
import { eatCan, hudExtra, useBandage, useCell, useMedkit } from "./compat";
import { Icon, type IconName } from "./icons";
import styles from "./sheets.module.css";

function Pocket({ title, area, children }: { title: string; area: string; children: ReactNode }) {
  return (
    <section className={styles.pocket} style={{ gridArea: area }} aria-label={title}>
      <h2 className={styles.pocketTitle}>{title}</h2>
      {children}
    </section>
  );
}

function Item({ icon, name, count, detail, badge, children }: {
  icon: IconName; name: string; count?: ReactNode; detail: ReactNode; badge?: string; children?: ReactNode;
}) {
  const empty = typeof count === "number" && count <= 0;
  return (
    <div className={styles.slot} data-empty={empty}>
      <Icon name={icon} className={styles.slotIcon} />
      <div className={styles.slotText}>
        <b>{name}{count !== undefined ? <span className={styles.slotCount}> ×{count}</span> : null}</b>
        <small>{detail}</small>
      </div>
      {badge ? <span className={styles.slotBadge}>{badge}</span> : null}
      {children}
    </div>
  );
}

export function InventorySheet({ engine, touch }: { engine: Engine; touch: boolean }) {
  const hud = useHud(engine.hud);
  const extra = hudExtra(engine, hud);
  const hurt = hud.health > 0 && hud.health < 100;
  const lampFull = hud.energy >= hud.maxEnergy;
  const nailgun = extra.weapon === 1;
  const use = (label: string, aria: string, disabled: boolean, run: () => void, hotkey?: string) => (
    <PaperButton className={styles.useBtn} variant="primary" aria-label={aria} hotkey={touch ? undefined : hotkey} disabled={disabled} onClick={run}>{label}</PaperButton>
  );

  return (
    <section className={styles.inventory} aria-label="Sac" data-sheet>
      <Stamp>SACOCHE · CUIR</Stamp>
      <header className={styles.invHead}>
        <Tag>SAC DE TERRAIN</Tag>
        <h1 className={styles.title}>Le sac</h1>
        <p className={styles.invLife}><Icon name="heart" /> Vie <b>{hud.health}</b>/100</p>
      </header>

      <div className={styles.pockets}>
        <Pocket title="Armes" area="armes">
          <Item icon="wrench" name="Clé à molette" detail="Corps à corps · 26 dégâts · silencieuse" badge={nailgun ? undefined : "EN MAIN"} />
          <Item icon="nailgun" name="Lance-clous" detail={<>Chargeur <b>{hud.ammo}</b>/{NAIL_CAPACITY} · 16 dégâts</>} badge={nailgun ? "EN MAIN" : undefined} />
          <Item icon="nails" name="Clous" count={hud.reserve} detail="Réserve dans la sacoche · R recharge" />
        </Pocket>

        <Pocket title="Soins" area="soins">
          <Item icon="bandage" name="Bandages" count={extra.bandages} detail={`+${HEAL.bandage} vie · égratignures`}>
            {use("Utiliser", "Utiliser un bandage", extra.bandages <= 0 || !hurt, () => useBandage(engine))}
          </Item>
          <Item icon="medkit" name="Trousses" count={extra.medkits} detail={`+${HEAL.medkit} vie · blessures graves`}>
            {use("Utiliser", "Utiliser une trousse", extra.medkits <= 0 || !hurt, () => useMedkit(engine))}
          </Item>
          <Item icon="can" name="Conserves" count={extra.cans} detail={`+${HEAL.can} vie · pêches au sirop`}>
            {use("Utiliser", "Manger une conserve", extra.cans <= 0 || !hurt, () => eatCan(engine))}
          </Item>
        </Pocket>

        <Pocket title="Lampe" area="lampe">
          <div className={styles.lampGauge} aria-label={`Charge de la lampe ${hud.energy} sur ${hud.maxEnergy}`}>
            <Icon name="lamp" />
            <div className={styles.lampBar}><div style={{ width: `${Math.min(100, (hud.energy / hud.maxEnergy) * 100)}%` }} /></div>
            <b>{hud.energy}/{hud.maxEnergy}</b>
          </div>
          <Item icon="cell" name="Piles" count={extra.cells} detail={`+${CELL_CHARGE} charge · éblouir coûte 15`}>
            {use("Mettre une pile", "Mettre une pile", extra.cells <= 0 || lampFull, () => useCell(engine), "B")}
          </Item>
        </Pocket>

        <Pocket title="Matériaux" area="materiaux">
          <Item icon="scrap" name="Ferraille" count={hud.components} detail="Pièces récupérées, à bricoler" />
          <ul className={styles.recipes}>
            <li><span>Génératrice</span><b>{GENERATOR_PARTS}</b></li>
            <li><span>Module radio</span><b>{RADIO_PARTS}</b></li>
            <li><span>Presse à clous · 1 → {NAILS_PER_SCRAP} clous</span><b>1</b></li>
            <li><span>Amélioration de la lampe</span><b>{UPGRADE_PARTS}</b></li>
          </ul>
        </Pocket>
      </div>

      <div className={styles.invFoot}>
        <PaperButton variant="ghost" className={styles.back} hotkey={touch ? undefined : "Tab"} autoFocus={!touch} onClick={() => engine.resume()}>Refermer le sac</PaperButton>
        <p className={styles.muted}>Borne de recharge gratuite au poste de sécurité. {touch ? "" : "H : se soigner au mieux."}</p>
      </div>
    </section>
  );
}
