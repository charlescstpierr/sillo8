// Ambiances lumineuses : nuit dehors, intérieur plus sombre, génératrice rouge puis chaude.
import { describe, expect, it } from "vitest";
import { INSIDE, NIGHT, moodFor } from "@/game/render/atmosphere";
import { ROOMS } from "@/game/level";

describe("ambiances", () => {
  it("dehors, c'est la nuit : lune froide et ombres longues", () => {
    for (const room of ROOMS.filter((r) => r.outdoor)) expect(moodFor(room.id, true, false)).toBe(NIGHT);
    expect(NIGHT.elevation).toBeLessThan(INSIDE.elevation);
  });

  it("chaque pièce a une ambiance complète et lisible", () => {
    for (const room of ROOMS.filter((r) => !r.outdoor)) {
      for (const powered of [false, true]) {
        const mood = moodFor(room.id, false, powered);
        expect(mood.hemi).toBeGreaterThan(0.3);
        expect(mood.fogFar).toBeGreaterThan(mood.fogNear);
        expect(mood.shade).toHaveLength(3);
      }
    }
  });

  it("la génératrice passe du rouge au chaud une fois alimentée", () => {
    const off = moodFor("generator", false, false);
    const on = moodFor("generator", false, true);
    expect(off.hemiSky).not.toBe(on.hemiSky);
    expect(off.vignetteStrength).toBeGreaterThan(on.vignetteStrength);
    // Sans courant, l'intérieur est plus sombre.
    expect(moodFor("hub", false, false).hemi).toBeLessThan(moodFor("hub", false, true).hemi);
  });
});
