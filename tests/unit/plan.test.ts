// Plan du carnet : pièces visitées (détectées en se déplaçant), sauvegarde avec ou sans `visited`, brouillard.
import { describe, expect, it } from "vitest";
import { SiloState, type KeyValueStore } from "@/game/state";
import { checkTriggers } from "@/game/progress";
import { buildPlan, objectiveMark } from "@/game/plan";
import { ROOMS } from "@/game/level";

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

const states = (s: SiloState) => Object.fromEntries(buildPlan(s).rooms.map((r) => [r.room.id, r.state]));

describe("pièces visitées", () => {
  it("note chaque pièce traversée une seule fois, dans l'ordre", () => {
    const s = new SiloState();
    let calls = 0;
    s.subscribe(() => calls++);
    expect(s.visited).toEqual([]);
    checkTriggers(s, 0, 41); // départ, sur le parvis
    checkTriggers(s, 0.5, 40);
    expect(s.visited).toEqual(["plaza"]);
    checkTriggers(s, 30, 30); // zone extérieure
    checkTriggers(s, -20, 26); // génératrice
    checkTriggers(s, 100, 100); // hors du plan
    expect(s.visited).toEqual(["plaza", "exterior", "generator"]);
    expect(calls).toBe(3);
    expect(s.visitRoom("generator")).toBe(false);
    expect(s.visitRoom("inventée")).toBe(false);
    s.reset();
    expect(s.visited).toEqual([]);
  });

  it("se sauvegarde et se recharge", () => {
    const s = new SiloState();
    s.visitRoom("plaza");
    s.visitRoom("generator");
    const store = new MemoryStore();
    expect(s.saveGame(store)).toBe("ok");
    expect(JSON.parse(store.getItem("sillo8-save")!).visited).toEqual(["plaza", "generator"]);
    const restored = new SiloState();
    restored.visitRoom("hub");
    expect(restored.loadGame(store)).toBe("ok");
    expect(restored.visited).toEqual(["plaza", "generator"]);
  });

  it("charge une sauvegarde d'avant le plan (sans `visited`)", () => {
    const s = new SiloState();
    s.exploreEntrance();
    const store = new MemoryStore();
    s.saveGame(store);
    const old = JSON.parse(store.getItem("sillo8-save")!);
    delete old.visited;
    store.setItem("sillo8-save", JSON.stringify(old));
    const restored = new SiloState();
    restored.visitRoom("hub");
    expect(restored.loadGame(store)).toBe("ok");
    expect(restored.visited).toEqual([]);
    expect(restored.has("entrance_explored")).toBe(true);
    // La pièce courante reste sur le plan, même sans historique.
    expect(states(restored)).toMatchObject({ plaza: "current" });
  });

  it("rejette un `visited` incohérent", () => {
    const s = new SiloState();
    const store = new MemoryStore();
    s.saveGame(store);
    const valid = JSON.parse(store.getItem("sillo8-save")!);
    const restored = new SiloState();
    for (const visited of [["plaza", "plaza"], ["cuisine"], "plaza", [1], new Array(ROOMS.length + 1).fill("plaza")]) {
      store.setItem("sillo8-save", JSON.stringify({ ...valid, visited }));
      expect(restored.loadGame(store), JSON.stringify(visited)).toBe("corrupt");
    }
    store.setItem("sillo8-save", JSON.stringify({ ...valid, visited: ["plaza", "secret"] }));
    expect(restored.loadGame(store)).toBe("ok");
  });
});

describe("plan du carnet", () => {
  it("ne montre que les pièces visitées, et leurs voisines en pointillé", () => {
    const s = new SiloState();
    checkTriggers(s, 0, 41);
    const plan = states(s);
    expect(plan.plaza).toBe("current");
    // Voisines par une porte : zone extérieure, sécurité, génératrice.
    expect(plan).toMatchObject({ exterior: "hint", security: "hint", generator: "hint" });
    expect(plan.control).toBeUndefined();
    expect(plan.hub).toBeUndefined();
    expect(buildPlan(s).known).toBe(1);
    // Porte de sécurité hors tension : verrouillée.
    expect(buildPlan(s).doors.find((d) => d.door.id === "plaza_security")?.locked).toBe(true);
  });

  it("garde la pièce cachée invisible tant que le mur n'a pas cédé", () => {
    const s = new SiloState();
    s.visitRoom("dorms");
    s.visited.push("secret"); // même une sauvegarde qui la connaîtrait
    expect(states(s).secret).toBeUndefined();
    expect(buildPlan(s).doors.some((d) => d.door.id === "dorms_secret")).toBe(false);
    expect(buildPlan(s).total).toBe(ROOMS.length - 1);
    s.readNote("note_storage", true);
    expect(s.openSecretWall()).toBe(true);
    expect(states(s).secret).toBe("visited");
    expect(buildPlan(s).doors.find((d) => d.door.id === "dorms_secret")?.locked).toBe(false);
  });

  it("marque l'objectif en cours, les notes lues et l'héroïne", () => {
    const s = new SiloState();
    expect(objectiveMark(s)?.label).toBe("Porte de sécurité");
    s.exploreEntrance();
    expect(objectiveMark(s)).toMatchObject({ label: "Génératrice", x: -22, z: 26 });
    s.collect("p", "components", 3);
    s.powerGenerator();
    expect(objectiveMark(s)).toMatchObject({ room: "hub" });
    s.reachHub();
    expect(objectiveMark(s)?.label).toBe("Établi");
    s.readNote("note_entrance");
    const plan = buildPlan(s);
    expect(plan.notes).toEqual([{ id: "note_entrance", x: -8, z: 30 }]);
    expect(plan.player).toMatchObject({ x: 0, z: 41, yaw: Math.PI, room: "plaza" });
    expect(plan.doors.find((d) => d.door.id === "plaza_security")?.locked).toBe(false);
  });
});
