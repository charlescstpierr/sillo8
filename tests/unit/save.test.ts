// Sauvegardes : migration des anciennes versions, emplacements, code de sauvegarde, extensions, et la règle
// d'or « jamais de sauvegarde automatique en danger ».
import { describe, expect, it } from "vitest";
import { MIGRATIONS, SAVE_SCHEMA, migrateSave } from "@/game/migrate";
import { SAVE_KEY, SiloState, type KeyValueStore } from "@/game/state";
import { CODE_PREFIX, SLOTS, anySave, clearSlot, decodeCode, exportCode, importCode, latestSlot, listSlots, loadSlot, slotInfo, writeSlot } from "@/game/save";
import { DANGER, inDanger, inSafeRoom, safeSpot } from "@/game/safety";

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

/** Une vraie sauvegarde v2, telle que l'écrivait le jeu avant les emplacements (octobre 2026). */
const V2 = {
  game: "sillo8",
  schema: 2,
  health: 72,
  energy: 64,
  ammo: 12,
  reserve: 32,
  components: 2,
  medkits: 0,
  bandages: 1,
  cans: 1,
  cells: 2,
  notes: ["note_entrance", "note_generator"],
  upgraded: false,
  collected: ["part_0", "part_1", "part_2", "part_3", "part_4", "cell_1"],
  defeated: ["walker_gen"],
  facts: ["entrance_explored", "generator_powered", "hub_reached"],
  memory: ["Le joueur a exploré l'entrée du silo.", "La génératrice tourne. Les portes de sécurité sont alimentées."],
  player_position: [1.5, 0, 3.2],
  player_yaw: 2.1,
  elapsed: 812.5,
  visited: ["plaza", "exterior", "generator", "security", "hub"],
};

describe("migration des sauvegardes", () => {
  it("chaque version jusqu'à la courante a son étape", () => {
    for (let v = 2; v < SAVE_SCHEMA; v++) expect(MIGRATIONS[v], `v${v} → v${v + 1}`).toBeTypeOf("function");
  });

  it("une sauvegarde v2 se charge en v3 sans rien perdre", () => {
    const store = new MemoryStore();
    store.setItem(SAVE_KEY, JSON.stringify(V2));
    const s = new SiloState();
    expect(s.loadGame(store)).toBe("ok");
    expect(s.facts).toEqual(V2.facts);
    expect(s.notes).toEqual(V2.notes);
    expect(s.collected).toEqual(V2.collected);
    expect([s.health, s.energy, s.ammo, s.reserve, s.components, s.cells]).toEqual([72, 64, 12, 32, 2, 2]);
    expect(s.playerPosition).toEqual([1.5, 0, 3.2]);
    expect(s.visited).toEqual(V2.visited);
    // Nouveaux champs : valeurs par défaut.
    expect([s.floor, s.flags, s.relations, s.rechargeSpent, s.ext]).toEqual([1, [], {}, false, {}]);
    // Réécrite, elle passe au format courant.
    expect(s.saveGame(store, SAVE_KEY, 1000)).toBe("ok");
    const again = JSON.parse(store.getItem(SAVE_KEY)!);
    expect(again.schema).toBe(SAVE_SCHEMA);
    expect(again.saved_at).toBe(1000);
  });

  it("une v2 antérieure au plan du carnet (sans `visited`) se charge aussi", () => {
    const { visited: _, ...old } = V2;
    void _;
    const s = new SiloState();
    expect(s.loadText(JSON.stringify(old))).toBe("ok");
    expect(s.visited).toEqual([]);
  });

  it("la validation reste stricte après migration (données corrompues)", () => {
    const s = new SiloState();
    for (const bad of [
      { ...V2, facts: ["keycard"] }, { ...V2, ammo: 99 }, { ...V2, health: "100" }, { ...V2, extra: 1 },
      { ...V2, game: "silo9" }, { ...V2, schema: 1 }, { ...V2, visited: ["nulle_part"] },
    ]) expect(s.loadText(JSON.stringify(bad)), JSON.stringify(bad).slice(0, 60)).toBe("corrupt");
    expect(s.loadText("{")).toBe("corrupt");
    expect(migrateSave(null)).toBeNull();
    // Une sauvegarde d'une version plus récente n'est ni chargée ni déclarée corrompue.
    expect(s.loadText(JSON.stringify({ ...V2, schema: SAVE_SCHEMA + 1 }))).toBe("newer");
    expect(s.facts).toEqual([]);
  });

  it("les champs v3 sont validés", () => {
    const s = new SiloState();
    const v3 = JSON.parse(new SiloState().saveText(5)!);
    expect(s.loadText(JSON.stringify(v3))).toBe("ok");
    for (const bad of [
      { relations: { cuisine: 9 } }, { relations: { "Pas un id": 1 } }, { flags: ["a", "a"] }, { floor: 0 }, { floor: 1.5 },
      { recharge_spent: "oui" }, { ext: [] }, { ext: { Majuscule: 1 } }, { ext: { enquete: [[[[[[[[[[["trop profond"]]]]]]]]]]] } }, { saved_at: -1 },
    ]) expect(s.loadText(JSON.stringify({ ...v3, ...bad })), JSON.stringify(bad)).toBe("corrupt");
  });
});

describe("extensions (`ext`) et confiance", () => {
  it("sont sauvegardées et rechargées", () => {
    const s = new SiloState();
    expect(s.setExt("investigation", { v: 1, cards: ["c1", "c2"], board: { links: [["c1", "c2"]] } })).toBe(true);
    expect(s.setExt("bad key", 1)).toBe(false);
    expect(s.setExt("fn", () => 1)).toBe(false);
    expect(s.changeTrust("cuisine", 2)).toBe(true);
    expect(s.changeTrust("cuisine", 9)).toBe(false);
    expect(s.setFlag("cuisine_vu")).toBe(true);
    const store = new MemoryStore();
    s.saveGame(store);
    const r = new SiloState();
    expect(r.loadGame(store)).toBe("ok");
    expect(r.ext.investigation).toEqual({ v: 1, cards: ["c1", "c2"], board: { links: [["c1", "c2"]] } });
    expect(r.relations).toEqual({ cuisine: 2 });
    expect(r.knows("cuisine_vu")).toBe(true);
    // Lecture typée avec repli : une donnée inattendue n'empêche pas de jouer.
    const read = (raw: unknown) => (typeof raw === "object" && raw !== null && (raw as { v?: unknown }).v === 1 ? (raw as { cards: string[] }) : null);
    expect(r.getExt("investigation", read, () => ({ cards: [] })).cards).toEqual(["c1", "c2"]);
    r.setExt("investigation", { v: 99 });
    expect(r.getExt("investigation", read, () => ({ cards: [] })).cards).toEqual([]);
    // Copie profonde : modifier l'objet passé ne change pas la sauvegarde.
    const data = { v: 1, cards: ["x"] };
    r.setExt("investigation", data);
    data.cards.push("y");
    expect(r.ext.investigation).toEqual({ v: 1, cards: ["x"] });
  });
});

describe("emplacements", () => {
  it("trois emplacements, le plus récent pour « Continuer », choix possible", () => {
    const store = new MemoryStore();
    expect(anySave(store)).toBe(false);
    expect(latestSlot(store)).toBeNull();
    const s = new SiloState();
    expect(writeSlot(s, store, "floor", 1000)).toBe(true);
    s.exploreEntrance();
    expect(writeSlot(s, store, "safe", 3000)).toBe(true);
    s.readNote("note_entrance");
    expect(writeSlot(s, store, "manual", 2000)).toBe(true);
    expect(SLOTS.map((d) => d.key)).toContain(SAVE_KEY);
    expect(listSlots(store).map((i) => i.id).sort()).toEqual(["floor", "manual", "safe"]);
    expect(latestSlot(store)).toBe("safe");
    const info = slotInfo(store, "manual")!;
    expect(info).toMatchObject({ label: "Manuel", status: "ok", savedAt: 2000, floor: 1 });
    expect(info.sector).toBe("ENTRÉE (EXTÉRIEUR)");
    // Charger un emplacement choisi.
    const r = new SiloState();
    expect(loadSlot(r, store, "floor")).toBe("ok");
    expect(r.facts).toEqual([]);
    expect(loadSlot(r, store, "manual")).toBe("ok");
    expect(r.notes).toEqual(["note_entrance"]);
    // Un emplacement illisible est signalé mais n'empêche pas de choisir les autres.
    store.setItem("sillo8-save-safe", "{oups");
    expect(slotInfo(store, "safe")!.status).toBe("corrupt");
    expect(latestSlot(store)).toBe("manual");
    clearSlot(store, "safe");
    expect(slotInfo(store, "safe")).toBeNull();
  });

  it("une ancienne sauvegarde v2 devient l'emplacement « Manuel » et reste chargeable", () => {
    const store = new MemoryStore();
    store.setItem(SAVE_KEY, JSON.stringify(V2));
    expect(latestSlot(store)).toBe("manual");
    expect(slotInfo(store, "manual")!.savedAt).toBe(0);
  });
});

describe("code de sauvegarde", () => {
  it("s'exporte et s'importe dans « Manuel » (accents compris)", () => {
    const a = new MemoryStore();
    const s = new SiloState();
    s.remember("Lou a lu « PÊCHES » sur l'étagère.");
    s.setExt("investigation", { v: 1, note: "éàç" });
    writeSlot(s, a, "safe", 10);
    const code = exportCode(a)!;
    expect(code.startsWith(CODE_PREFIX)).toBe(true);
    const b = new MemoryStore();
    // Retours à la ligne et espaces ajoutés par une messagerie : tolérés.
    expect(importCode(b, `  ${code.slice(0, 20)}\n${code.slice(20)} `, 99)).toBe("ok");
    expect(latestSlot(b)).toBe("manual");
    const r = new SiloState();
    expect(loadSlot(r, b, "manual")).toBe("ok");
    expect(r.memory).toContain("Lou a lu « PÊCHES » sur l'étagère.");
    expect(r.ext.investigation).toEqual({ v: 1, note: "éàç" });
    expect(importCode(b, "SILLO8-pas-un-code")).toBe("corrupt");
    expect(importCode(b, "")).toBe("corrupt");
    expect(exportCode(new MemoryStore())).toBeNull();
  });

  it("un code d'une ancienne version est migré", () => {
    const code = CODE_PREFIX + Buffer.from(JSON.stringify(V2), "utf8").toString("base64");
    const decoded = decodeCode(code);
    expect(decoded.result).toBe("ok");
    expect(decoded.state!.facts).toEqual(V2.facts);
  });
});

describe("jamais de sauvegarde automatique en danger", () => {
  const calm = { x: 0, z: 15, health: 100, sinceHurt: Infinity, threats: [] };

  it("lieu sûr : pièce sûre, hors danger", () => {
    expect(inSafeRoom(0, 15)).toBe(true); // poste de sécurité
    expect(inSafeRoom(0, 0)).toBe(false); // hub
    expect(safeSpot(calm)).toBe(true);
    expect(safeSpot({ ...calm, x: 0, z: 0 })).toBe(false);
  });

  it("mordu en alerte proche, mordu tout près, vie basse en plein combat", () => {
    expect(inDanger({ ...calm, threats: [{ x: 0, z: 15 + DANGER.alertRadius - 1, alert: true }] })).toBe(true);
    expect(inDanger({ ...calm, threats: [{ x: 0, z: 15 + DANGER.alertRadius + 1, alert: true }] })).toBe(false);
    expect(inDanger({ ...calm, threats: [{ x: 0, z: 15 + DANGER.nearRadius - 1, alert: false }] })).toBe(true);
    expect(inDanger({ ...calm, threats: [{ x: 0, z: 15 + DANGER.nearRadius + 1, alert: false }] })).toBe(false);
    expect(inDanger({ ...calm, health: 5, sinceHurt: 2 })).toBe(true);
    // Vie basse mais combat fini depuis longtemps : on peut souffler et sauvegarder.
    expect(inDanger({ ...calm, health: 5, sinceHurt: 60 })).toBe(false);
    expect(inDanger({ ...calm, health: 0 })).toBe(true);
    expect(safeSpot({ ...calm, threats: [{ x: 2, z: 15, alert: false }] })).toBe(false);
  });
});
