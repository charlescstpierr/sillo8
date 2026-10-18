// Port de tests/test_state.gd.
import { describe, expect, it } from "vitest";
import { SiloState, type KeyValueStore } from "@/game/state";

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

describe("SiloState", () => {
  it("applique les règles de la mission et de l'inventaire", () => {
    const s = new SiloState();
    expect(s.spendEnergy(20)).toBe(true);
    expect(s.energy).toBe(80);
    expect(s.spendEnergy(-10)).toBe(false);
    expect(s.spendEnergy(Infinity)).toBe(false);
    expect(s.discoverRelay()).toBe(true);
    expect(s.phase).toBe(1);
    expect(s.repairRelay()).toBe(false);
    expect(s.collect("parts-a", "components", 7)).toBe(true);
    expect(s.collect("parts-a", "components", 7)).toBe(false);
    expect(s.collect("fake", "components", -1)).toBe(false);
    expect(s.collect("fake", "unknown", 1)).toBe(false);
    expect(s.upgrade()).toBe(true);
    expect(s.components).toBe(4);
    expect(s.maxEnergy()).toBe(150);
    expect(s.upgrade()).toBe(false);
    s.spendEnergy(s.energy);
    s.recharge();
    expect(s.energy).toBe(150);
    expect(s.repairRelay()).toBe(true);
    expect([s.components, s.phase]).toEqual([1, 2]);
    expect(s.chooseEnding("mother")).toBe(false);
    expect(s.recoverCore()).toBe(true);
    expect(s.chooseEnding("invented")).toBe(false);
    expect(s.chooseEnding("n7") && s.phase === 4).toBe(true);
    expect(s.chooseEnding("mother")).toBe(false);
    s.damage(35);
    expect(s.health).toBe(65);
    s.damage(-100);
    expect(s.health).toBe(65);
    expect(s.heal() && s.medkits === 1 && s.health === 100).toBe(true);
    expect(s.heal()).toBe(false);
    expect(s.medkits).toBe(1);
    s.spendEnergy(100);
    expect(s.useCell() && s.cells === 1 && s.energy === 110).toBe(true);
    expect(s.fireRound() && s.ammo === 11).toBe(true);
    expect(s.reloadRounds()).toBe(1);
    expect([s.reserve, s.ammo]).toEqual([47, 12]);
    s.markDefeated("sentinel-a");
    s.markDefeated("sentinel-a");
    expect(s.defeated.length).toBe(1);
    for (let i = 0; i < 80; i++) s.remember("event-" + i);
    expect(s.memory.length).toBeLessThanOrEqual(32);
    expect(s.memory).toContain("event-79");
    s.addFact("arc_lock_disabled");
    expect(s.facts).toContain("arc_lock_disabled");
    expect(s.changeTrust("mother", 1) && s.relations.mother === 1).toBe(true);
    expect(s.changeTrust("mother", 99) || s.changeTrust("invented", 1)).toBe(false);
    for (let i = 0; i < 10; i++) s.changeTrust("n7", -1);
    expect(s.relations.n7).toBe(-5);

    const store = new MemoryStore();
    expect(s.saveGame(store)).toBe("ok");
    const restored = new SiloState();
    expect(restored.loadGame(store)).toBe("ok");
    expect(restored.ending).toBe("n7");
    expect(restored.upgraded).toBe(true);
    expect(restored.reserve).toBe(47);
    expect(restored.relations).toEqual({ mother: 1, n7: -5 });

    const valid = JSON.parse(store.getItem("silo9-save")!);
    const mutations: Record<string, unknown>[] = [
      { energy: -1 }, { phase: 2, ending: "n7" }, { ammo: 13 }, { health: "100" },
      { player_position: [0, 0] }, { collected: ["same", "same"] }, { phase: 0, ending: "" },
      { ammo: 1.5 }, { extra: true }, { relations: { mother: 0 } },
    ];
    for (const mutation of mutations) {
      store.setItem("silo9-save", JSON.stringify({ ...valid, ...mutation }));
      expect(restored.loadGame(store), JSON.stringify(mutation)).toBe("corrupt");
      expect(restored.ending === "n7" && restored.reserve === 47).toBe(true);
    }
    store.setItem("silo9-save", "x".repeat(70000));
    expect(restored.loadGame(store)).toBe("corrupt");
    store.setItem("silo9-save", "not json");
    expect(restored.loadGame(store)).toBe("corrupt");
    expect(restored.loadGame(new MemoryStore())).toBe("missing");
  });

  it("propose la fin MÈRE", () => {
    const m = new SiloState();
    m.discoverRelay();
    m.collect("parts", "components", 3);
    m.repairRelay();
    m.recoverCore();
    expect(m.chooseEnding("mother")).toBe(true);
  });

  it("dérive une liste d'objectifs à cocher de la phase", () => {
    const s = new SiloState();
    expect(s.objectiveChecklist().steps.map((x) => x.done)).toEqual([false, false, false, false]);
    expect(s.objectiveChecklist().title).toBe(s.objective());
    s.discoverRelay();
    s.collect("c1", "components", 2);
    const list = s.objectiveChecklist();
    expect(list.steps[0].done).toBe(true);
    expect(list.steps[1].label).toContain("2/3");
  });

  it("notifie les abonnés", () => {
    const s = new SiloState();
    let calls = 0;
    const off = s.subscribe(() => calls++);
    s.damage(1);
    off();
    s.damage(1);
    expect(calls).toBe(1);
  });
});
