// Son synthétisé : démarré au premier geste, sans erreur console, réglages de son affichés et mémorisés.
import { expect, test, type Page } from "@playwright/test";

async function boot(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/");
  await prepare(page);
  return errors;
}

async function prepare(page: Page) {
  await page.waitForFunction(() => Boolean((window as any).__silo), null, { timeout: 30_000 });
  await page.evaluate(() => {
    // Rendu logiciel lent : la simulation tourne sans dessiner (comme ui.spec.ts).
    const engine = (window as any).__silo;
    engine.stop();
    engine.renderer.render = () => undefined;
    setInterval(() => engine.tick(1 / 30), 40);
  });
}

const audio = (page: Page) => page.evaluate(() => (window as any).__silo.audio.debug());

test("son : démarrage au premier geste, réglages mémorisés, effets joués", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = await boot(page);
  await page.evaluate(() => window.localStorage.removeItem("sillo8-settings"));

  // Avant tout geste : pas de contexte audio (contrainte des navigateurs mobiles).
  expect((await audio(page)).started).toBe(false);

  // Premier clic : l'AudioContext est créé et tourne.
  await page.getByRole("button", { name: "Réglages" }).click();
  await expect.poll(async () => (await audio(page)).state).toBe("running");
  expect((await audio(page)).supported).toBe(true);

  // Réglages de son dans la fiche papier.
  await expect(page.getByRole("heading", { name: "Son" })).toBeVisible();
  const music = page.getByRole("slider", { name: /Musique/ });
  await expect(page.getByRole("slider", { name: /Volume général/ })).toBeVisible();
  await expect(page.getByRole("slider", { name: /Effets et ambiance/ })).toBeVisible();
  await expect(page.getByText(/Vibration quand on est frappé/)).toBeVisible();
  await music.fill("30");
  await page.getByRole("slider", { name: /Effets et ambiance/ }).fill("65");
  await page.getByText(/Vibration quand on est frappé/).click();
  await expect.poll(async () => (await audio(page)).settings.music).toBeCloseTo(0.3);
  await page.getByRole("button", { name: /Appliquer et revenir/ }).click();
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem("sillo8-settings") ?? "{}"));
  expect(saved).toMatchObject({ music: 0.3, sfx: 0.65, vibration: false });

  // Après rechargement, les réglages sont relus et appliqués au son.
  await page.reload();
  await prepare(page);
  expect((await audio(page)).settings).toMatchObject({ music: 0.3, sfx: 0.65, vibration: false });
  await page.getByRole("button", { name: "Réglages" }).click();
  await expect(page.getByRole("slider", { name: /Musique/ })).toHaveValue("30");
  await expect(page.getByText("30 %")).toBeVisible();
  // Annuler rétablit les réglages d'avant les essais.
  await page.getByRole("slider", { name: /Musique/ }).fill("80");
  await page.getByRole("button", { name: "Annuler" }).click();
  expect((await audio(page)).settings.music).toBeCloseTo(0.3);

  // En jeu : effets nommés, musique et ambiance programmées, pause qui baisse la musique.
  await page.getByRole("button", { name: /NOUVELLE DESCENTE/ }).click();
  await expect.poll(async () => (await audio(page)).mode).toBe("playing");
  await expect.poll(async () => (await audio(page)).state).toBe("running");
  const cued = await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.combat.swing();
    return engine.audio.cue("radio_static", engine.player.x + 6, engine.player.z);
  });
  expect(cued).toBe(true);
  await expect.poll(async () => (await audio(page)).played.swing ?? 0).toBeGreaterThan(0);
  expect((await audio(page)).played.radio_static).toBeGreaterThan(0);
  await expect.poll(async () => (await audio(page)).musicNotes).toBeGreaterThan(0);
  // Chaque son nommé se programme sans erreur (par petits groupes, pour laisser les voix se libérer).
  const names: string[] = (await audio(page)).names;
  for (let i = 0; i < names.length; i += 6) {
    await expect.poll(async () => (await audio(page)).voices, { timeout: 15_000 }).toBeLessThan(10);
    await page.evaluate((batch) => batch.forEach((n) => (window as any).__silo.audio.play(n)), names.slice(i, i + 6));
  }
  await expect.poll(async () => Object.keys((await audio(page)).played).length, { timeout: 15_000 }).toBe(names.length);
  expect((await audio(page)).failed).toBe(0);
  await page.keyboard.press("Escape");
  await expect.poll(async () => (await audio(page)).mode).toBe("paused");
  // Les voix se libèrent après usage.
  await expect.poll(async () => (await audio(page)).voices, { timeout: 15_000 }).toBeLessThan(6);

  expect(errors).toEqual([]);
});
