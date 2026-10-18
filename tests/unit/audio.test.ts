// Son : logique de tension et de mixage (sans Web Audio), son muet sous Node, et événements déduits du moteur.
import { describe, expect, it } from "vitest";
import { Group } from "three";
import { GameAudio, SOUND_NAMES } from "@/game/audio";
import { GameEvents, type GameEvent } from "@/game/events";
import {
  approach, busLevels, computeTension, DEFAULT_SOUND, distanceGain, footstepGain, heartbeatInterval, heartbeatLevel,
  MYSTERY_CUES, nextMysteryDelay, panFor, TENSION_RANGE, zoneAmbience,
} from "@/game/mix";
import { PlayerController } from "@/game/player";
import { SiloState } from "@/game/state";
import { mixMode, SoundDirector, type SoundSource } from "@/game/sound";
import type { UiMode } from "@/game/ui";
import { ROOMS } from "@/game/level";

describe("tension", () => {
  it("reste nulle sans zombie proche, et pour un zombie en alerte au-delà de la portée", () => {
    expect(computeTension([])).toBe(0);
    expect(computeTension([{ distance: TENSION_RANGE + 1, alert: true, chasing: true }])).toBe(0);
    // Un zombie calme à 8 m ne crée pas de tension : seuls les zombies vraiment proches comptent.
    expect(computeTension([{ distance: 8, alert: false, chasing: false }])).toBe(0);
  });

  it("monte avec la proximité et la poursuite, sans dépasser 1", () => {
    const far = computeTension([{ distance: 8, alert: true, chasing: true }]);
    const near = computeTension([{ distance: 2, alert: true, chasing: true }]);
    const searching = computeTension([{ distance: 2, alert: true, chasing: false }]);
    expect(near).toBeGreaterThan(far);
    expect(near).toBeGreaterThan(searching);
    const crowd = computeTension(Array.from({ length: 12 }, () => ({ distance: 1, alert: true, chasing: true })));
    expect(crowd).toBeGreaterThan(near);
    expect(crowd).toBeLessThanOrEqual(1);
  });

  it("battement de cœur sous 30 de vie seulement, plus rapide quand la vie baisse", () => {
    expect(heartbeatLevel(100)).toBe(0);
    expect(heartbeatLevel(30)).toBe(0);
    expect(heartbeatLevel(0)).toBe(0);
    expect(heartbeatLevel(10)).toBeGreaterThan(heartbeatLevel(25));
    expect(heartbeatInterval(5)).toBeLessThan(heartbeatInterval(28));
  });

  it("fondu : approche la cible sans la dépasser, plus vite en montée qu'en descente", () => {
    let v = 0;
    for (let i = 0; i < 30; i++) v = approach(v, 1, 1 / 30, 0.9, 0.3);
    expect(v).toBeGreaterThan(0.5);
    expect(v).toBeLessThan(1);
    const down = approach(1, 0, 1, 0.9, 0.3);
    const up = approach(0, 1, 1, 0.9, 0.3);
    expect(1 - down).toBeLessThan(up);
  });
});

describe("mixage", () => {
  it("la musique baisse en pause, s'arrête à la mort et onglet caché", () => {
    const playing = busLevels(DEFAULT_SOUND, "playing");
    const paused = busLevels(DEFAULT_SOUND, "paused");
    expect(paused.music).toBeLessThan(playing.music);
    expect(paused.music).toBeGreaterThan(0);
    expect(busLevels(DEFAULT_SOUND, "death").music).toBe(0);
    expect(busLevels(DEFAULT_SOUND, "hidden")).toEqual({ master: 0, music: 0, sfx: 0, ambience: 0 });
  });

  it("respecte les curseurs et borne les valeurs", () => {
    expect(busLevels({ ...DEFAULT_SOUND, music: 0 }, "playing").music).toBe(0);
    expect(busLevels({ ...DEFAULT_SOUND, master: 3 }, "playing").master).toBe(1);
    expect(busLevels({ ...DEFAULT_SOUND, sfx: Number.NaN }, "playing").sfx).toBe(0);
  });

  it("spatialisation : volume selon la distance, gauche / droite selon l'écart", () => {
    expect(distanceGain(1)).toBe(1);
    expect(distanceGain(10)).toBeGreaterThan(distanceGain(15));
    expect(distanceGain(30)).toBe(0);
    expect(panFor(6, 6)).toBeGreaterThan(0);
    expect(panFor(-6, 6)).toBeLessThan(0);
    expect(Math.abs(panFor(100, 100))).toBeLessThanOrEqual(0.85);
  });

  it("pas plus doux accroupi, muets à l'arrêt", () => {
    expect(footstepGain("run")).toBeGreaterThan(footstepGain("walk"));
    expect(footstepGain("walk")).toBeGreaterThan(footstepGain("crouch-walk"));
    expect(footstepGain("idle")).toBe(0);
  });

  it("chaque salle a son ambiance ; le bourdonnement électrique attend la génératrice", () => {
    for (const room of ROOMS) expect(Object.keys(zoneAmbience(room.id, false).beds).length).toBeGreaterThan(0);
    expect(zoneAmbience("plaza", false).beds.wind).toBeGreaterThan(0);
    expect(zoneAmbience("hub", false).beds.hum ?? 0).toBe(0);
    expect(zoneAmbience("hub", true).beds.hum).toBeGreaterThan(0);
    // Tous les petits bruits d'ambiance et de mystère existent comme sons nommés.
    for (const room of ROOMS) for (const spot of Object.keys(zoneAmbience(room.id, true).spots)) expect(SOUND_NAMES).toContain(spot);
    for (const cue of MYSTERY_CUES) expect(SOUND_NAMES).toContain(cue);
    expect(nextMysteryDelay(0)).toBeGreaterThanOrEqual(45);
  });
});

describe("GameAudio sans Web Audio", () => {
  it("tout est un no-op sans erreur", () => {
    const audio = new GameAudio();
    expect(audio.supported).toBe(false);
    expect(audio.unlock()).toBe(false);
    expect(audio.play("bonk")).toBe(false);
    expect(audio.cue("radio_static", 3, 4)).toBe(true);
    expect(audio.cue("inconnu")).toBe(false);
    expect(audio.vibrate(50)).toBe(false);
    audio.configure({ master: 0.5, vibration: false });
    audio.update(1 / 30, { mode: "playing", x: 0, z: 0, room: "hub", powered: true, threats: [{ distance: 2, alert: true, chasing: true }], health: 20 });
    expect(audio.tension).toBeGreaterThan(0);
    expect(audio.heartbeat).toBeGreaterThan(0);
    const debug = audio.debug();
    expect(debug.state).toBe("none");
    expect(debug.settings.master).toBe(0.5);
    expect(debug.requested.radio_static).toBe(1);
    audio.dispose();
  });
});

describe("événements déduits du moteur", () => {
  function rig() {
    const state = new SiloState();
    const player = new PlayerController(0, 30, 0);
    const zombie = { id: "z1", x: 4, z: 30, hit: 0, alive: true, dead: -1, mode: "patrol", stunned: 0 };
    let mode: UiMode = "menu";
    let previous: UiMode = "menu";
    const src: SoundSource = {
      state,
      player,
      combat: { weapon: 0, swingTime: 0, dazzleTime: 0 },
      horde: { root: new Group(), zombies: [zombie] } as unknown as SoundSource["horde"],
      ui: { get: () => ({ mode, previous }) },
      hud: { get: () => ({ autosaved: false }) },
    };
    const audio = new GameAudio();
    const events = new GameEvents();
    const log: GameEvent[] = [];
    events.on((e) => log.push(e));
    const director = new SoundDirector(audio, events);
    const setMode = (m: UiMode) => { previous = mode; mode = m; };
    return { state, player, zombie, src, audio, log, director, setMode };
  }

  it("coups, tirs, zombie touché puis tombé, joueur frappé, mort", () => {
    const { src, zombie, director, log, setMode, state, player, audio } = rig();
    director.update(1 / 30, src);
    setMode("playing");
    director.update(1 / 30, src);
    expect(log).toHaveLength(0);

    src.combat.swingTime = 0.32;
    zombie.hit = 0.18;
    director.update(1 / 30, src);
    expect(log.map((e) => e.type)).toEqual(expect.arrayContaining(["swing", "zombie_hit"]));
    expect(log.find((e) => e.type === "swing")).toMatchObject({ hits: 1 });

    log.length = 0;
    player.shotTime = 0.18;
    zombie.alive = false;
    zombie.dead = 0;
    director.update(1 / 30, src);
    expect(log.map((e) => e.type)).toEqual(expect.arrayContaining(["shot", "zombie_down"]));

    log.length = 0;
    state.damage(10);
    director.update(1 / 30, src);
    expect(log.map((e) => e.type)).toContain("player_hit");
    state.damage(500);
    director.update(1 / 30, src);
    expect(log.map((e) => e.type)).toContain("player_death");
    expect(audio.debug().requested.death).toBe(1);
  });

  it("ramassage, note-indice, objectif, génératrice et portes qui s'ouvrent", () => {
    const { src, director, log, setMode, state } = rig();
    setMode("playing");
    director.update(1 / 30, src);
    state.collect("e2e_scrap", "components", 3);
    state.readNote("note_storage", true);
    director.update(1 / 30, src);
    expect(log.map((e) => e.type)).toEqual(expect.arrayContaining(["pickup", "note_found"]));
    expect(log.find((e) => e.type === "note_found")).toMatchObject({ clue: true });

    log.length = 0;
    state.exploreEntrance();
    state.powerGenerator();
    director.update(1 / 30, src);
    const types = log.map((e) => e.type);
    expect(types).toContain("objective");
    expect(types).toContain("generator");
    expect(types).toContain("door_open");
  });

  it("grognements espacés et spatialisés quand un zombie poursuit tout près ; tension en jeu seulement", () => {
    const { src, zombie, director, log, setMode, audio } = rig();
    setMode("playing");
    director.update(1 / 30, src);
    zombie.mode = "chase";
    for (let i = 0; i < 30 * 6; i++) director.update(1 / 30, src);
    const growls = log.filter((e) => e.type === "zombie_growl");
    expect(growls.length).toBeGreaterThanOrEqual(1);
    expect(growls.length).toBeLessThanOrEqual(4);
    expect(growls[0]).toMatchObject({ x: 4, z: 30, chasing: true });
    expect(audio.tension).toBeGreaterThan(0.3);
    setMode("pause");
    expect(mixMode("pause")).toBe("paused");
    expect(mixMode("settings", "menu")).toBe("menu");
  });

  it("une nouvelle partie se resynchronise sans rien jouer", () => {
    const { src, director, log, setMode, state } = rig();
    setMode("playing");
    state.collect("a", "cell", 1);
    director.update(1 / 30, src);
    state.reset();
    director.update(1 / 30, src);
    expect(log.filter((e) => e.type === "pickup")).toHaveLength(0);
  });
});
