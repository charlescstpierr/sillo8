// Accessibilité et confort, sur téléphone en portrait (390 × 760) : texte très grand sans débordement, cibles
// tactiles d'au moins 44 px, sous-titres des sons, mode moins effrayant appliqué au moteur.
import { expect, test, type Page } from "@playwright/test";

const SHOTS = process.env.SHOTS_DIR ?? "docs/screenshots";
const PORTRAIT = { viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

async function boot(page: Page, settings?: Record<string, unknown>) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/");
  await page.evaluate((s) => {
    window.localStorage.removeItem("sillo8-save");
    if (s) window.localStorage.setItem("sillo8-settings", JSON.stringify(s));
    else window.localStorage.removeItem("sillo8-settings");
  }, settings ?? null);
  // Les réglages sont lus au démarrage : on recharge avec le stockage préparé.
  await page.reload();
  await page.waitForFunction(() => Boolean((window as any).__silo), null, { timeout: 30_000 });
  await page.evaluate(() => {
    // Rendu logiciel lent : la simulation tourne sans dessiner, on ne dessine qu'aux captures.
    const engine = (window as any).__silo;
    engine.stop();
    const renderer = engine.renderer;
    engine.__draw = renderer.render.bind(renderer);
    renderer.render = () => undefined;
    setInterval(() => engine.tick(1 / 30), 40);
  });
  return errors;
}

const mode = (page: Page) => page.evaluate(() => (window as any).__silo.ui.get().mode as string);

async function shot(page: Page, name: string, before?: () => Promise<unknown>) {
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.__draw(engine.scene, engine.camera);
  });
  // Le dessin logiciel prend du temps : ce qui est éphémère (sous-titres) est redemandé juste avant la capture.
  if (before) {
    await before();
    await page.waitForTimeout(150);
  }
  await page.screenshot({ path: `${SHOTS}/sillo8-a11y-${name}.png`, animations: "disabled" });
}

/**
 * Textes qui débordent : sortis de l'écran en largeur, ou coupés par un parent qui masque son contenu.
 * Retourne une description de chaque fautif (vide = tout tient).
 */
async function overflowing(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const bad: string[] = [];
    const vw = window.innerWidth;
    if (document.documentElement.scrollWidth > vw + 1) bad.push(`page large de ${document.documentElement.scrollWidth}px`);
    const all = document.querySelectorAll<HTMLElement>("body *");
    for (const el of all) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim().length > 0);
      if (!own) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (el.closest("[aria-hidden='true'], svg, option, select")) continue;
      const label = `${el.tagName.toLowerCase()}.${el.className.toString().split(" ")[0]} « ${el.textContent!.trim().slice(0, 30)} »`;
      if (r.left < -3 || r.right > vw + 3) { bad.push(`${label} hors écran (${Math.round(r.left)}→${Math.round(r.right)})`); continue; }
      // Texte coupé à l'intérieur de lui-même (une ligne trop longue qui ne passe pas à la ligne).
      if ((style.overflowX === "hidden" || style.overflowX === "clip") && el.scrollWidth > el.clientWidth + 2) {
        bad.push(`${label} coupé (${el.scrollWidth} > ${el.clientWidth})`);
        continue;
      }
      // Parent qui masque ce qui dépasse.
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (ps.overflowX === "visible" && ps.overflowY === "visible") continue;
        const pr = p.getBoundingClientRect();
        if (r.left < pr.left - 3 || r.right > pr.right + 3) bad.push(`${label} dépasse de ${p.tagName.toLowerCase()}.${p.className.toString().split(" ")[0]}`);
        break;
      }
    }
    return bad;
  });
}

/** Cibles tactiles visibles de moins de 44 × 44 px (boutons, onglets, listes, interrupteurs, curseurs). */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const bad: string[] = [];
    const targets = new Set<HTMLElement>();
    for (const el of document.querySelectorAll<HTMLElement>("button, a[href], select, input:not([type=checkbox]):not([type=radio]), [role=tab], [role=radio]")) targets.add(el);
    // Un interrupteur se touche par son étiquette entière.
    for (const input of document.querySelectorAll<HTMLInputElement>("input[type=checkbox]")) {
      const label = input.closest("label");
      if (label) targets.add(label);
    }
    for (const el of targets) {
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none" || style.pointerEvents === "none") continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.bottom < 0 || r.top > window.innerHeight * 4) continue;
      if (r.width < 43.5 || r.height < 43.5) {
        const name = el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 30) ?? el.tagName;
        bad.push(`${el.tagName.toLowerCase()} « ${name} » ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    }
    return bad;
  });
}

async function expectComfortable(page: Page, where: string) {
  expect(await overflowing(page), `débordements : ${where}`).toEqual([]);
  expect(await smallTargets(page), `cibles tactiles trop petites : ${where}`).toEqual([]);
}

test("portrait : texte très grand sans débordement, cibles de 44 px, réglages rangés en sections", async ({ browser }) => {
  test.setTimeout(600_000);
  const context = await browser.newContext(PORTRAIT);
  const page = await context.newPage();
  const errors = await boot(page);
  await expect.poll(() => mode(page)).toBe("menu");

  // Réglages : quatre sections dans l'ordre, puis le choix « Très grand » s'applique tout de suite.
  await page.getByRole("button", { name: "Réglages" }).tap();
  const sections = await page.locator("section[aria-label='Réglages'] h2").allTextContents();
  expect(sections.slice(0, 4)).toEqual(["Affichage", "Son", "Accessibilité", "Aide"]);
  await page.getByRole("radio", { name: /Très grand/ }).tap();
  await expect(page.getByRole("radio", { name: /Très grand/ })).toHaveAttribute("aria-checked", "true");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--text-scale").trim())).toBe("1.3");
  await expectComfortable(page, "réglages");
  await shot(page, "reglages-tres-grand");
  await page.getByRole("button", { name: /Appliquer et revenir/ }).tap();
  await expect.poll(() => mode(page)).toBe("menu");
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem("sillo8-settings")!).textSize)).toBe("xlarge");
  await expectComfortable(page, "menu");
  await shot(page, "menu-tres-grand");

  // Partie : HUD, rail déplié, objectifs dépliés.
  await page.evaluate(() => (window as any).__silo.newGame());
  await expect.poll(() => mode(page)).toBe("playing");
  await page.waitForTimeout(400);
  await expectComfortable(page, "jeu");
  await page.locator('section[aria-label="Objectifs"] button').tap();
  await page.locator('section[aria-label="Vie et lampe"] button').first().tap();
  await page.waitForTimeout(300);
  await expectComfortable(page, "jeu, panneaux dépliés");
  await shot(page, "jeu-tres-grand");

  // Fiches : note, carnet (notes et plan), sac, pause, mort.
  const screens: [string, string, string?][] = [
    ["note", "note", "note_entrance"],
    ["carnet", "journal", "note_entrance"],
    ["plan", "journal", "plan"],
    ["sac", "inventory"],
    ["pause", "pause"],
    ["mort", "death"],
  ];
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.state.readNote("note_entrance", false);
    engine.state.readNote("note_storage", true);
  });
  for (const [name, ui, character] of screens) {
    await page.evaluate(([m, c]) => (window as any).__silo.setMode(m, c), [ui, character] as const);
    await expect.poll(() => mode(page)).toBe(ui);
    await page.waitForTimeout(400);
    await expectComfortable(page, name);
    if (name === "note" || name === "carnet" || name === "sac") await shot(page, `${name}-tres-grand`);
  }
  expect(errors).toEqual([]);
  await context.close();
});

test("portrait : sous-titres des sons (auto quand le son est coupé, toujours, jamais)", async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext(PORTRAIT);
  const page = await context.newPage();
  const captions = page.getByRole("log", { name: "Sous-titres des sons" });
  const growlLeft = () => page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.audio.update(0.016, { mode: "playing", x: engine.player.x, z: engine.player.z, room: null, powered: false, threats: [], health: 100 });
    engine.audio.handle({ type: "zombie_growl", id: "test", x: engine.player.x - 8, z: engine.player.z, chasing: false });
  });

  // Par défaut (auto), sur téléphone, son coupé : les sous-titres s'affichent.
  let errors = await boot(page, { master: 0 });
  await page.evaluate(() => (window as any).__silo.newGame());
  await expect.poll(() => mode(page)).toBe("playing");
  await growlLeft();
  await expect(captions).toContainText("[grognement à gauche]");
  await page.evaluate(() => (window as any).__silo.audio.cue("radio_static"));
  await expect(captions).toContainText("radio qui grésille au loin");
  await expect(captions.locator("p")).toHaveCount(2);
  // Ligne discrète en bas de l'écran, au-dessus des commandes tactiles, dans la largeur.
  const box = (await captions.boundingBox())!;
  expect(box.y).toBeGreaterThan(760 / 2);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  for (const name of ["Frapper", "Éblouir", "Interagir"]) {
    const b = await page.getByRole("button", { name, exact: true }).boundingBox();
    if (!b) continue;
    const apart = box.y + box.height <= b.y || b.y + b.height <= box.y || box.x + box.width <= b.x || b.x + b.width <= box.x;
    expect(apart, `les sous-titres couvrent « ${name} »`).toBe(true);
  }
  await shot(page, "sous-titres", async () => {
    await growlLeft();
    await page.evaluate(() => (window as any).__silo.audio.cue("radio_static"));
  });
  // Les lignes s'effacent d'elles-mêmes.
  await expect(captions.locator("p")).toHaveCount(0, { timeout: 8_000 });

  // Auto avec le son : pas de sous-titres.
  errors = errors.concat(await boot(page, { master: 0.8 }));
  await page.evaluate(() => (window as any).__silo.newGame());
  await expect.poll(() => mode(page)).toBe("playing");
  await growlLeft();
  await page.waitForTimeout(400);
  await expect(captions.locator("p")).toHaveCount(0);

  // « Toujours » : affichés même avec le son ; « Jamais » : jamais, même son coupé.
  errors = errors.concat(await boot(page, { master: 0.8, captions: "on" }));
  await page.evaluate(() => (window as any).__silo.newGame());
  await growlLeft();
  await expect(captions).toContainText("[grognement à gauche]");
  errors = errors.concat(await boot(page, { master: 0, captions: "off" }));
  await page.evaluate(() => (window as any).__silo.newGame());
  await growlLeft();
  await page.waitForTimeout(400);
  await expect(captions.locator("p")).toHaveCount(0);
  expect(errors).toEqual([]);
  await context.close();
});

test("portrait : mode moins effrayant appliqué (mordus plus lents, ni vibration ni tremblement)", async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext(PORTRAIT);
  const page = await context.newPage();

  /** Vitesse de poursuite mesurée d'un marcheur, vibrations demandées et tremblement de caméra après un coup reçu. */
  const measure = () => page.evaluate(async () => {
    const engine = (window as any).__silo;
    const calls: unknown[] = [];
    (navigator as any).vibrate = (p: unknown) => { calls.push(p); return true; };
    const walker = engine.horde.zombies.find((z: any) => z.kind === "walker" && z.alive && z.spawn.patrol.length > 1);
    // Le joueur se place sur un point de patrouille du marcheur (sol praticable), à quelques mètres de lui.
    const [px, pz] = walker.spawn.patrol.reduce((best: number[], p: number[]) =>
      Math.hypot(p[0] - walker.x, p[1] - walker.z) > Math.hypot(best[0] - walker.x, best[1] - walker.z) ? p : best);
    engine.player.x = px;
    engine.player.z = pz;
    engine.player.vx = engine.player.vz = 0;
    walker.mode = "chase";
    walker.seesTarget = true;
    walker.stunned = 0;
    let top = 0;
    for (let i = 0; i < 40; i++) {
      engine.horde.update(1 / 30, { ...(engine as any).hordeContext, player: { x: px, z: pz, crouched: false, alive: true }, damagePlayer: () => undefined });
      walker.mode = "chase";
      top = Math.max(top, walker.speed);
    }
    // Le son se resynchronise après une téléportation : une image d'abord, pour que le coup soit bien entendu.
    engine.tick(1 / 30);
    // Coup reçu : vibration et tremblement de caméra (le combat les demande à chaque image).
    const health = engine.state.health;
    engine.damagePlayer(5);
    engine.tick(1 / 30);
    engine.rig.addShake(0.3, 0.4);
    engine.rig.update(1 / 30, engine.rig.focus.clone(), null);
    const shake = engine.rig.shake.length();
    engine.state.health = health;
    return { top, vibrations: calls.length, shake };
  });

  let errors = await boot(page, { gentle: false, vibration: true });
  await page.evaluate(() => (window as any).__silo.newGame());
  await expect.poll(() => mode(page)).toBe("playing");
  const normal = await measure();
  expect(normal.top).toBeGreaterThan(1.5);
  expect(normal.shake).toBeGreaterThan(0.01);
  expect(normal.vibrations).toBeGreaterThan(0);

  errors = errors.concat(await boot(page, { gentle: true, vibration: true }));
  await page.evaluate(() => (window as any).__silo.newGame());
  await expect.poll(() => mode(page)).toBe("playing");
  expect(await page.evaluate(() => document.documentElement.dataset.gentle)).toBe("true");
  const gentle = await measure();
  expect(gentle.top).toBeGreaterThan(0.5);
  expect(gentle.top).toBeLessThan(normal.top * 0.85);
  expect(gentle.vibrations).toBe(0);
  expect(gentle.shake).toBe(0);
  // L'histoire ne change pas : mêmes mordus, mêmes objectifs.
  expect(await page.evaluate(() => (window as any).__silo.horde.zombies.length)).toBeGreaterThan(0);

  // Les réglages se voient dans la fiche : l'interrupteur est coché.
  await page.evaluate(() => (window as any).__silo.setMode("pause"));
  await page.getByRole("button", { name: "Réglages" }).tap();
  await expect(page.getByRole("checkbox", { name: /Moins effrayant/ })).toBeChecked();
  expect(errors).toEqual([]);
  await context.close();
});

test("portrait : couleurs adaptées et marques des mordus, animations réduites", async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext(PORTRAIT);
  const page = await context.newPage();
  const errors = await boot(page, { safeColors: true, motion: "reduced", captions: "on", lowQuality: false });
  await page.evaluate(() => (window as any).__silo.newGame());
  await expect.poll(() => mode(page)).toBe("playing");
  expect(await page.evaluate(() => [document.documentElement.dataset.palette, document.documentElement.dataset.motion])).toEqual(["safe", "reduced"]);
  // Deux mordus devant le joueur : l'un en chasse (« ! »), l'autre en alerte (« ? »).
  const marks = await page.evaluate(() => {
    const engine = (window as any).__silo;
    const [a, b] = engine.horde.zombies.filter((z: any) => z.alive);
    const x = engine.player.x;
    const z = engine.player.z;
    a.x = x - 1.6; a.z = z - 2.2; a.mode = "chase";
    b.x = x + 2.2; b.z = z + 0.6; b.mode = "investigate"; b.searchRemaining = 30;
    // Ni l'un ni l'autre ne réévalue ce qu'il voit pendant la capture : « ! » et « ? » restent affichés.
    a.senseRemaining = b.senseRemaining = 1e9;
    b.destX = b.x; b.destZ = b.z;
    engine.state.health = 20;
    engine.horde.update(0.0001, { ...(engine as any).hordeContext, damagePlayer: () => undefined });
    a.mode = "chase";
    engine.tick(0.0001);
    return [a.rig.markKind, b.rig.markKind, a.rig.mark?.visible, b.rig.mark?.visible];
  });
  expect(marks).toEqual(["chase", "alert", true, true]);
  // Animations réduites : la vignette de blessure ne bat pas.
  expect(await page.evaluate(() => {
    const hurt = document.querySelector("[data-level]") as HTMLElement | null;
    return hurt ? getComputedStyle(hurt).animationName : "none";
  })).toBe("none");
  await shot(page, "mordus-marques");
  expect(errors).toEqual([]);
  await context.close();
});
