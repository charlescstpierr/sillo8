// Captures d'écran de référence de SILLO 8 (ordi et téléphone) dans un vrai navigateur.
// Le rendu logiciel (SwiftShader) est lent : la boucle est arrêtée, on téléporte le bricoleur et on n'avance
// que quelques images à la main.
import { expect, test, type Page } from "@playwright/test";

const SHOTS = process.env.SHOTS_DIR ?? "docs/screenshots";

test.setTimeout(600_000);

async function boot(page: Page, query = "") {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/" + query);
  await page.waitForFunction(() => Boolean((window as any).__silo), null, { timeout: 120_000 });
  // Le jeu s'ouvre sur le menu principal : on lance une partie, puis on arrête la boucle.
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.newGame();
    engine.stop();
  });
  return errors;
}

/** Exécute `setup` (avec `engine`), puis avance de `frames` images de 1/30 s. */
async function step(page: Page, frames: number, setup = "") {
  await page.evaluate(([n, code]) => {
    const engine = (window as any).__silo;
    engine.stop();
    if (code) new Function("engine", code as string)(engine);
    for (let i = 0; i < (n as number); i++) engine.tick(1 / 30);
  }, [frames, setup] as const);
}

/** Téléporte le bricoleur (et la caméra) en (x, z), tourné vers `yaw`. */
const teleport = (x: number, z: number, yaw = Math.PI) =>
  `engine.input.releaseAll(); engine.input.pointer = null; engine.player.x = ${x}; engine.player.z = ${z}; engine.player.yaw = ${yaw}; engine.player.vx = engine.player.vz = 0; engine.rig.snap(new engine.rig.focus.constructor(${x}, 0, ${z}));`;

/** Courant rétabli (3 ferrailles dans la génératrice). */
const POWER = `engine.state.collect('cap-p', 'components', 3); engine.state.exploreEntrance(); engine.state.powerGenerator();`;

test("ordi : entrée, génératrice, hub et armes du bricoleur", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = await boot(page);

  await step(page, 3, teleport(0, 38));
  await page.screenshot({ path: `${SHOTS}/sillo8-entree.png` });

  // Devant la génératrice : l'infobulle propose de l'alimenter.
  await step(page, 3, teleport(-19.8, 26, -Math.PI / 2));
  const prompt = await page.evaluate(() => (window as any).__silo.hud.get().prompt);
  expect(prompt?.name).toBe("Génératrice");
  await page.screenshot({ path: `${SHOTS}/sillo8-generatrice.png` });

  await step(page, 3, POWER + teleport(0, 4));
  expect(await page.evaluate(() => (window as any).__silo.state.has("hub_reached"))).toBe(true);
  await page.screenshot({ path: `${SHOTS}/sillo8-hub.png` });

  // Clé à molette sur le rampant du hub.
  await step(page, 1, teleport(1.9, 1.9, Math.PI / 4) + "const z = engine.horde.get ? engine.horde.get('walker_dorms') : null; if (z) { z.x = 3; z.z = 3; }");
  await step(page, 4, "engine.input.mouseFiring = true;");
  const swing = await page.evaluate(() => (window as any).__silo.combat.swingTime);
  expect(swing).toBeGreaterThan(0);
  await page.screenshot({ path: `${SHOTS}/sillo8-cle.png` });

  // Lance-clous.
  await step(page, 12, "engine.input.mouseFiring = false;");
  await step(page, 1, teleport(0, 2, Math.PI) + "engine.input.trigger('weapon2');");
  await step(page, 1, "engine.input.mouseFiring = true;");
  const gun = await page.evaluate(() => ({ weapon: (window as any).__silo.combat.weapon, ammo: (window as any).__silo.state.ammo }));
  expect(gun.weapon).toBe(1);
  expect(gun.ammo).toBeLessThan(16);
  await page.screenshot({ path: `${SHOTS}/sillo8-lance-clous.png` });

  // Lampe : éclair en cône.
  await step(page, 1, "engine.input.mouseFiring = false; engine.input.trigger('light');");
  const dazzle = await page.evaluate(() => (window as any).__silo.combat.dazzleTime);
  expect(dazzle).toBeGreaterThan(0);
  await page.screenshot({ path: `${SHOTS}/sillo8-lampe.png` });

  // Carnet et note.
  await step(page, 1, teleport(-28.6, -3.6) + "engine.interact(engine.world.interactables.get('note_storage').def);");
  const ui = await page.evaluate(() => (window as any).__silo.ui.get());
  expect([ui.mode, ui.character]).toEqual(["note", "note_storage"]);
  await page.screenshot({ path: `${SHOTS}/sillo8-note.png` });
  await step(page, 1, "engine.resume(); engine.input.trigger('journal');");
  expect(await page.evaluate(() => (window as any).__silo.ui.get().mode)).toBe("journal");
  await page.screenshot({ path: `${SHOTS}/sillo8-carnet.png` });
  expect(errors).toEqual([]);
});

test("téléphone paysage : commandes tactiles", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = await boot(page, "?low=1");
  await step(page, 1, "engine.input.device = 'touch';" + teleport(-6, 34));
  await step(page, 4, "engine.input.touchMove.x = 0.6; engine.input.touchMove.y = 0.5;");
  await page.screenshot({ path: `${SHOTS}/sillo8-mobile.png` });
  expect(errors).toEqual([]);
  await context.close();
});
