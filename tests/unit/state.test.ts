// État de SILLO 8 : ressources (règles reprises de SILO 9), objectifs de l'étage 1, sauvegarde.
import { describe, expect, it } from "vitest";
import { SiloState, type KeyValueStore } from "@/game/state";

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

describe("ressources", () => {
  it("applique les règles de la lampe, des soins et des clous", () => {
    const s = new SiloState();
    expect(s.spendEnergy(20)).toBe(true);
    expect(s.energy).toBe(80);
    expect(s.spendEnergy(-10)).toBe(false);
    expect(s.spendEnergy(Infinity)).toBe(false);
    expect(s.collect("parts-a", "components", 10)).toBe(true);
    expect(s.collect("parts-a", "components", 10)).toBe(false);
    expect(s.collect("fake", "components", -1)).toBe(false);
    expect(s.collect("fake", "unknown", 1)).toBe(false);
    expect(s.upgrade()).toBe(true);
    expect([s.components, s.maxEnergy()]).toEqual([7, 150]);
    expect(s.upgrade()).toBe(false);
    s.spendEnergy(s.energy);
    s.recharge();
    expect(s.energy).toBe(150);
    s.damage(35);
    expect(s.health).toBe(65);
    s.damage(-100);
    expect(s.health).toBe(65);
    // Bandage (+30) pour une blessure légère, trousse (+60) quand il n'y a plus de bandage.
    expect(s.heal() && s.bandages === 1 && s.health === 95).toBe(true);
    s.damage(60);
    s.collect("m", "medkit", 1);
    expect(s.useMedkit() && s.health === 95).toBe(true);
    expect(s.collect("c", "can", 1) && s.eatCan() && s.health === 100).toBe(true);
    expect(s.eatCan()).toBe(false);
    s.spendEnergy(100);
    expect(s.useCell() && s.cells === 0 && s.energy === 90).toBe(true);
    expect(s.fireRound() && s.ammo === 15).toBe(true);
    expect(s.reloadRounds()).toBe(1);
    expect([s.reserve, s.ammo]).toEqual([15, 16]);
    expect(s.craftNails() && s.reserve === 31 && s.components === 6).toBe(true);
    s.markDefeated("z");
    s.markDefeated("z");
    expect(s.defeated).toEqual(["z"]);
    for (let i = 0; i < 80; i++) s.remember("event-" + i);
    expect(s.memory.length).toBeLessThanOrEqual(32);
    expect(s.memory).toContain("event-79");
  });
});

describe("objectifs de l'étage 1", () => {
  it("s'enchaînent dans l'ordre et avec leurs coûts", () => {
    const s = new SiloState();
    expect(s.objectiveChecklist().steps.every((x) => !x.done)).toBe(true);
    expect(s.exploreEntrance()).toBe(true);
    expect(s.exploreEntrance()).toBe(false);
    expect(s.reachHub()).toBe(false);
    expect(s.powerGenerator()).toBe(false);
    s.collect("p", "components", 5);
    expect(s.objective()).toContain("3/3");
    expect(s.powerGenerator()).toBe(true);
    expect(s.components).toBe(2);
    expect(s.reachHub()).toBe(true);
    expect(s.repairComms()).toBe(false);
    expect(s.craftRadioModule()).toBe(true);
    expect(s.components).toBe(0);
    expect(s.repairComms()).toBe(true);
    expect(s.takeKeycard()).toBe(false);
    expect(s.openSecretWall()).toBe(false);
    expect(s.readNote("note_storage", true)).toBe(true);
    expect(s.openSecretWall()).toBe(true);
    expect(s.takeKeycard()).toBe(true);
    expect(s.objectiveChecklist().steps.every((x) => x.done)).toBe(true);
    expect(s.phase).toBe(5);
    expect(s.reachFloor2()).toBe(true);
    expect(s.objective()).toBe("Étage 1 terminé.");
  });

  it("refuse l'étage 2 sans clé et le module sans pièces", () => {
    const s = new SiloState();
    expect(s.reachFloor2()).toBe(false);
    expect(s.craftRadioModule()).toBe(false);
  });
});

describe("sauvegarde", () => {
  it("sauvegarde, recharge et rejette les fichiers incohérents", () => {
    const s = new SiloState();
    s.exploreEntrance();
    s.collect("p", "components", 3);
    s.powerGenerator();
    s.reachHub();
    const store = new MemoryStore();
    expect(s.saveGame(store)).toBe("ok");
    const restored = new SiloState();
    expect(restored.loadGame(store)).toBe("ok");
    expect(restored.facts).toEqual(s.facts);
    const valid = JSON.parse(store.getItem("sillo8-save")!);
    const mutations: Record<string, unknown>[] = [
      { energy: -1 }, { ammo: 17 }, { health: "100" }, { player_position: [0, 0] }, { collected: ["a", "a"] },
      { facts: ["hub_reached"] }, { facts: ["keycard"] }, { facts: ["invented"] }, { game: "silo9" }, { extra: true }, { ammo: 1.5 },
    ];
    for (const mutation of mutations) {
      store.setItem("sillo8-save", JSON.stringify({ ...valid, ...mutation }));
      expect(restored.loadGame(store), JSON.stringify(mutation)).toBe("corrupt");
      expect(restored.has("hub_reached")).toBe(true);
    }
    store.setItem("sillo8-save", "x".repeat(70000));
    expect(restored.loadGame(store)).toBe("corrupt");
    expect(restored.loadGame(new MemoryStore())).toBe("missing");
  });

  it("notifie les abonnés et se remet à zéro", () => {
    const s = new SiloState();
    let calls = 0;
    s.subscribe(() => calls++);
    s.damage(10);
    s.reset();
    expect(s.health).toBe(100);
    expect(calls).toBe(2);
  });
});
