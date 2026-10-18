// Accessibilité et confort : réglages (et leur rétrocompatibilité), multiplicateurs du moteur, sous-titres des sons,
// marques et couleurs des mordus.
import { afterEach, describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { captionsActive, DEFAULT_A11Y, motionReduced, parseA11y, soundMuted, TEXT_SCALE } from "@/ui/accessibility";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_KEY } from "@/ui/settings";
import { COMFORT, comfortScales, DEFAULT_COMFORT, getComfort, SCARY_SOUNDS, setComfort } from "@/game/comfort";
import { CameraRig } from "@/game/camera";
import { GameAudio, SOUND_NAMES, type HeardSound } from "@/game/audio";
import { CAPTIONED, captionFor, direction } from "@/game/captions";
import { EYE, EYE_SAFE, eyeColor, markFor } from "@/game/render/zombie";
import { MYSTERY_CUES } from "@/game/mix";

/** localStorage minimal pour loadSettings / saveSettings sous Node. */
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
    removeItem: (k: string) => { data.delete(k); },
  };
  (globalThis as unknown as { window: unknown }).window = { localStorage: storage };
  return data;
}

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
  setComfort(DEFAULT_COMFORT);
});

describe("réglages d'accessibilité", () => {
  it("valeurs par défaut : texte normal, sous-titres auto, rien d'activé, animations comme le système", () => {
    expect(DEFAULT_A11Y).toEqual({ textSize: "normal", readableFont: false, captions: "auto", safeColors: false, gentle: false, motion: "auto" });
    expect(parseA11y(undefined)).toEqual(DEFAULT_A11Y);
    expect(parseA11y(null)).toEqual(DEFAULT_A11Y);
    expect(parseA11y("n'importe quoi")).toEqual(DEFAULT_A11Y);
  });

  it("ignore les valeurs abîmées et accepte d'anciens booléens", () => {
    expect(parseA11y({ textSize: "énorme", captions: 3, motion: "lent", gentle: "oui", safeColors: 1 })).toEqual(DEFAULT_A11Y);
    expect(parseA11y({ captions: true, motion: true }).captions).toBe("on");
    expect(parseA11y({ captions: false }).captions).toBe("off");
    expect(parseA11y({ motion: true }).motion).toBe("reduced");
    expect(parseA11y({ textSize: "xlarge", readableFont: true, captions: "on", safeColors: true, gentle: true, motion: "full" })).toEqual({
      textSize: "xlarge", readableFont: true, captions: "on", safeColors: true, gentle: true, motion: "full",
    });
  });

  it("les tailles de texte vont en croissant, normal = 1", () => {
    expect(TEXT_SCALE.normal).toBe(1);
    expect(TEXT_SCALE.small).toBeLessThan(1);
    expect(TEXT_SCALE.large).toBeGreaterThan(1);
    expect(TEXT_SCALE.xlarge).toBeGreaterThan(TEXT_SCALE.large);
  });

  it("rétrocompatibilité : un ancien réglage sans champs d'accessibilité garde ses volumes et prend les défauts", () => {
    fakeStorage({ [SETTINGS_KEY]: JSON.stringify({ lowQuality: true, endpoint: "", model: "", useServer: false, objectiveArrow: "never", master: 0.3, music: 0.2, sfx: 0.9, vibration: false }) });
    const settings = loadSettings();
    expect(settings.lowQuality).toBe(true);
    expect(settings.objectiveArrow).toBe("never");
    expect(settings.master).toBe(0.3);
    expect(settings.vibration).toBe(false);
    expect(settings.textSize).toBe("normal");
    expect(settings.captions).toBe("auto");
    expect(settings.gentle).toBe(false);
    expect(settings.motion).toBe("auto");
  });

  it("rétrocompatibilité : réglages très anciens (avant le son) et stockage vide ou illisible", () => {
    fakeStorage({ [SETTINGS_KEY]: JSON.stringify({ lowQuality: false, endpoint: "http://127.0.0.1:8080", model: "m" }) });
    expect(loadSettings()).toMatchObject({ endpoint: "http://127.0.0.1:8080", textSize: "normal", safeColors: false });
    fakeStorage();
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    fakeStorage({ [SETTINGS_KEY]: "{pas du json" });
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("aller-retour : ce qui est enregistré est relu à l'identique", () => {
    const data = fakeStorage();
    const settings = { ...DEFAULT_SETTINGS, textSize: "large" as const, captions: "on" as const, gentle: true, motion: "reduced" as const, safeColors: true, readableFont: true };
    expect(saveSettings(settings)).toBe(true);
    expect(data.get(SETTINGS_KEY)!.length).toBeLessThan(4096);
    expect(loadSettings()).toEqual(settings);
  });

  it("sous-titres : « auto » seulement sur téléphone son coupé ; « toujours » et « jamais » sans condition", () => {
    expect(captionsActive("auto", true, true)).toBe(true);
    expect(captionsActive("auto", true, false)).toBe(false);
    expect(captionsActive("auto", false, true)).toBe(false);
    expect(captionsActive("on", false, false)).toBe(true);
    expect(captionsActive("off", true, true)).toBe(false);
    expect(soundMuted({ supported: true, settings: { master: 0.8, sfx: 0.8 } })).toBe(false);
    expect(soundMuted({ supported: true, settings: { master: 0, sfx: 0.8 } })).toBe(true);
    expect(soundMuted({ supported: true, settings: { master: 0.8, sfx: 0 } })).toBe(true);
    expect(soundMuted({ supported: false, settings: { master: 0.8, sfx: 0.8 } })).toBe(true);
  });

  it("animations : « auto » suit prefers-reduced-motion, le réglage manuel l'emporte", () => {
    expect(motionReduced("auto", true)).toBe(true);
    expect(motionReduced("auto", false)).toBe(false);
    expect(motionReduced("reduced", false)).toBe(true);
    expect(motionReduced("full", true)).toBe(false);
  });
});

describe("confort du moteur (multiplicateurs)", () => {
  it("par défaut, rien ne change", () => {
    expect(comfortScales()).toMatchObject({ shake: 1, kick: 1, hitStop: 1, flash: 1, flicker: 1, zombiePace: 1, scare: 1, vibration: true, motion: true });
    expect(COMFORT.shake).toBe(1);
  });

  it("réduire les animations : ni tremblement, ni à-coup, ni arrêt sur image ; éclairs adoucis", () => {
    const s = comfortScales({ reduceMotion: true });
    expect([s.shake, s.kick, s.hitStop]).toEqual([0, 0, 0]);
    expect(s.flash).toBeLessThan(0.5);
    expect(s.flicker).toBeLessThan(0.5);
    expect(s.motion).toBe(false);
    // Ne touche ni aux mordus ni au son.
    expect(s.zombiePace).toBe(1);
    expect(s.scare).toBe(1);
  });

  it("moins effrayant : mordus plus lents, sons de sursaut atténués, ni vibration ni tremblement", () => {
    const s = comfortScales({ gentle: true });
    expect(s.zombiePace).toBeLessThan(1);
    expect(s.zombiePace).toBeGreaterThan(0.5);
    expect(s.scare).toBeLessThan(1);
    expect(s.vibration).toBe(false);
    expect(s.shake).toBe(0);
    expect(SCARY_SOUNDS.has("growl")).toBe(true);
    // Les indices sonores de l'enquête ne sont jamais atténués.
    expect(SCARY_SOUNDS.has("distant_knock")).toBe(false);
    for (const name of SCARY_SOUNDS) expect(SOUND_NAMES).toContain(name);
  });

  it("setComfort met à jour les multiplicateurs partagés et se combine", () => {
    setComfort({ gentle: true });
    setComfort({ reduceMotion: true });
    expect(getComfort()).toEqual({ gentle: true, reduceMotion: true, safeColors: false });
    expect(COMFORT.zombiePace).toBeLessThan(1);
    expect(COMFORT.hitStop).toBe(0);
    setComfort(DEFAULT_COMFORT);
    expect(COMFORT.zombiePace).toBe(1);
  });

  it("la caméra ne tremble plus quand le multiplicateur est à 0", () => {
    const shaken = () => {
      const rig = new CameraRig(new PerspectiveCamera());
      rig.snap(new Vector3());
      rig.addShake(0.3, 0.3);
      rig.kick(1, 0, 0.3);
      rig.update(1 / 60, new Vector3(), null);
      return rig.shake.length();
    };
    expect(shaken()).toBeGreaterThan(0.05);
    setComfort({ reduceMotion: true });
    expect(shaken()).toBe(0);
    setComfort({ reduceMotion: false, gentle: true });
    expect(shaken()).toBe(0);
  });

  it("moins effrayant coupe la vibration même si elle est activée dans le son", () => {
    const calls: unknown[] = [];
    (globalThis as unknown as { navigator?: unknown }).navigator ??= {};
    const nav = globalThis.navigator as unknown as { vibrate?: (p: unknown) => boolean };
    const before = nav.vibrate;
    nav.vibrate = (p) => { calls.push(p); return true; };
    try {
      const audio = new GameAudio({ attach: false });
      expect(audio.vibrate(50)).toBe(true);
      setComfort({ gentle: true });
      expect(audio.vibrate(50)).toBe(false);
      expect(calls).toHaveLength(1);
    } finally {
      nav.vibrate = before;
    }
  });
});

describe("sous-titres des sons", () => {
  const heard = (name: string, extra: Partial<HeardSound> = {}): HeardSound => ({ name, pan: 0, distance: 0, placed: false, far: false, intensity: 0.5, ...extra });

  it("chaque sous-titre correspond à un vrai son, et tous les bruits mystérieux en ont un", () => {
    for (const name of CAPTIONED) expect(SOUND_NAMES).toContain(name);
    for (const cue of MYSTERY_CUES) expect(CAPTIONED).toContain(cue);
  });

  it("direction : gauche, droite, tout près, au loin", () => {
    expect(direction({ pan: -0.8, distance: 8, placed: true, far: false })).toBe("à gauche");
    expect(direction({ pan: 0.8, distance: 8, placed: true, far: false })).toBe("à droite");
    expect(direction({ pan: 0.8, distance: 2, placed: true, far: false })).toBe("tout près");
    expect(direction({ pan: 0, distance: 20, placed: true, far: false })).toBe("au loin");
    expect(direction({ pan: -0.6, distance: 0, placed: false, far: true })).toBe("au loin, à gauche");
    expect(direction({ pan: 0, distance: 6, placed: true, far: false })).toBe("");
  });

  it("exemples : grognement à gauche, radio qui grésille au loin, porte qui claque", () => {
    expect(captionFor(heard("growl", { pan: -0.7, distance: 8, placed: true }))?.text).toBe("[grognement à gauche]");
    expect(captionFor(heard("growl", { pan: 0.7, distance: 6, placed: true, intensity: 1 }))).toMatchObject({ text: "[grognement furieux à droite]", danger: true });
    expect(captionFor(heard("radio_static", { far: true }))?.text).toBe("[radio qui grésille au loin]");
    expect(captionFor(heard("door_slam", { pan: 0.6, far: true }))?.text).toBe("[porte qui claque au loin, à droite]");
    expect(captionFor(heard("distant_knock", { pan: -0.5, far: true }))?.text).toBe("[trois coups, réguliers au loin, à gauche]");
  });

  it("les petits bruits (pas, gouttes, clics) restent sans sous-titre", () => {
    for (const name of ["step", "drip", "ui", "sheet", "swing", "clock_tick"]) expect(captionFor(heard(name))).toBeNull();
  });

  it("GameAudio annonce les sons demandés même sans Web Audio (son coupé), avec leur côté", () => {
    const audio = new GameAudio({ attach: false });
    const seen: HeardSound[] = [];
    const off = audio.listen((s) => seen.push(s));
    audio.update(0.016, { mode: "playing", x: 0, z: 0, room: null, powered: false, threats: [], health: 100 });
    audio.handle({ type: "zombie_growl", id: "z1", x: -8, z: 0, chasing: false });
    expect(audio.cue("door_slam")).toBe(true);
    expect(seen.map((s) => s.name)).toEqual(["growl", "door_slam"]);
    expect(seen[0].pan).toBeLessThan(0);
    expect(seen[0].placed).toBe(true);
    expect(seen[1].far).toBe(true);
    expect(captionFor(seen[0])?.text).toBe("[grognement à gauche]");
    off();
    audio.cue("radio_static");
    expect(seen).toHaveLength(2);
  });
});

describe("mordus : une forme par état, pas seulement une couleur", () => {
  const base = { eye: "calm" as const, alert: false, stunned: false, dormant: false, dead: -1 };

  it("marque au-dessus de la tête selon l'état", () => {
    expect(markFor(base)).toBe("none");
    expect(markFor({ ...base, alert: true })).toBe("alert");
    expect(markFor({ ...base, eye: "chase" })).toBe("chase");
    expect(markFor({ ...base, dormant: true })).toBe("sleep");
    // Étourdi : les étincelles en orbite servent de forme ; mort : rien.
    expect(markFor({ ...base, eye: "chase", stunned: true })).toBe("none");
    expect(markFor({ ...base, eye: "chase", dead: 0.5 })).toBe("none");
  });

  it("couleurs : d'origine par défaut, palette adaptée distincte sur demande", () => {
    expect(eyeColor("chase", false)).toBe(EYE.chase);
    expect(eyeColor("calm", true)).toBe(EYE_SAFE.calm);
    const safe = new Set([EYE_SAFE.calm, EYE_SAFE.chase, EYE_SAFE.stun]);
    expect(safe.size).toBe(3);
    setComfort({ safeColors: true });
    expect(eyeColor("chase")).toBe(EYE_SAFE.chase);
  });
});
