// Enquête jouable (ordi et téléphone en portrait) : bulle de pensée qui ne recouvre rien, gros plan qu'on
// tourne pour révéler un détail (et loupe), trace UV à la lampe, une déduction fausse puis une juste au tableau.
import { expect, test, type Locator, type Page } from "@playwright/test";

// Captures de l'enquête : toujours dans docs/screenshots (sauf ENQUETE_SHOTS_DIR).
const SHOTS = process.env.ENQUETE_SHOTS_DIR ?? "docs/screenshots";

async function boot(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("/");
  await page.waitForFunction(() => Boolean((window as any).__silo), null, { timeout: 30_000 });
  await page.evaluate(() => {
    window.localStorage.removeItem("sillo8-save");
    const engine = (window as any).__silo;
    engine.stop();
    const renderer = engine.renderer;
    engine.__draw = renderer.render.bind(renderer);
    renderer.render = () => undefined;
    setInterval(() => engine.tick(1 / 30), 40);
    engine.newGame();
  });
  return errors;
}

const mode = (page: Page) => page.evaluate(() => (window as any).__silo.ui.get().mode as string);
/** Enquête sauvegardée (state.ext.investigation). */
const record = (page: Page) => page.evaluate(() => {
  const r = (window as any).__silo.state.ext.investigation ?? {};
  return { cards: [], traces: [], deductions: [], ...JSON.parse(JSON.stringify(r)) };
});

async function shot(page: Page, name: string) {
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.__draw(engine.scene, engine.camera);
  });
  await page.screenshot({ path: `${SHOTS}/sillo8-enquete-${name}.png`, animations: "disabled" });
}

/** Place Lou (et la caméra) ; `yaw` : direction du regard (0 = vers le sud, +Z). */
async function teleport(page: Page, x: number, z: number, yaw?: number) {
  await page.evaluate(([x, z, yaw]) => {
    const engine = (window as any).__silo;
    engine.input.pointer = null;
    engine.player.x = x;
    engine.player.z = z;
    engine.player.vx = engine.player.vz = 0;
    if (yaw !== null) engine.player.yaw = yaw;
    engine.rig.snap(new engine.rig.focus.constructor(x, 0, z));
  }, [x, z, yaw ?? null] as const);
}

async function expectApart(target: Locator, others: [string, Locator][]) {
  const box = await target.boundingBox({ timeout: 10_000 });
  expect(box, "élément affiché").not.toBeNull();
  for (const [name, locator] of others) {
    if ((await locator.count()) === 0 || !(await locator.first().isVisible())) continue;
    const other = await locator.first().boundingBox();
    if (!other) continue;
    const apart = box!.y + box!.height <= other.y || other.y + other.height <= box!.y || box!.x + box!.width <= other.x || other.x + other.width <= box!.x;
    expect(apart, `la bulle de pensée chevauche « ${name} »`).toBe(true);
  }
}

function obstacles(page: Page): [string, Locator][] {
  const buttons = ["Examiner", "Frapper", "Éblouir", "Lampe UV", "Changer d'arme", "S'accroupir", "Pause", "Sac", "Carnet"]
    .map((name) => [name, page.getByRole("button", { name, exact: true })] as [string, Locator]);
  return [
    ...buttons,
    ["Vie et lampe", page.locator('section[aria-label="Vie et lampe"]')],
    ["État du survivant", page.locator('section[aria-label="État du survivant"]')],
    ["Objectifs", page.locator('section[aria-label="Objectifs"]')],
    ["bulle du tutoriel", page.getByRole("note", { name: "Conseil" })],
    ["avis", page.locator('p[role="status"]:not([aria-label])')],
  ];
}

/** Glisse la souris sur la scène du gros plan (tourner l'objet). */
async function drag(page: Page, dx: number, dy: number) {
  const stage = page.locator('[aria-label="Glissez pour tourner l\'objet"]');
  const box = (await stage.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x + (dx * i) / 8, y + (dy * i) / 8);
  await page.mouse.up();
}

async function scenario(page: Page, device: "ordi" | "portrait") {
  const touch = device === "portrait";
  const press = async (locator: Locator) => (touch ? locator.tap() : locator.click());
  if (touch) await page.evaluate(() => { (window as any).__silo.input.device = "touch"; });

  // 1. Pensée de Lou devant la grande porte : « Pas tous. Alors quelqu'un est encore là-dedans. »
  await teleport(page, 0.5, 26.5, Math.PI);
  const thought = page.getByRole("status", { name: "Pensée de Lou" });
  await expect(thought).toContainText("Pas tous", { timeout: 15_000 });
  await page.waitForTimeout(400);
  await expectApart(thought, obstacles(page));
  await shot(page, `pensee-${device}`);
  // La pensée suivante se tait presque : « Je ne devais pas entrer… »
  await expect(thought).toContainText("Je ne devais pas entrer", { timeout: 15_000 });
  await expectApart(thought, obstacles(page));
  expect((await record(page)).cards).toContain("chalk_door");

  // 2. Gros plan du seuil de la porte de service : on l'incline, la lumière rasante montre les pas.
  await teleport(page, -9.2, 27, -Math.PI / 2);
  await expect.poll(() => page.evaluate(() => (window as any).__silo.focus?.examine ?? null)).toBe("a15");
  await page.evaluate(() => (window as any).__silo.input.trigger("interact"));
  await expect.poll(() => mode(page)).toBe("closeup");
  await expect(page.getByRole("heading", { name: "Seuil de la porte de service" })).toBeVisible();
  await expect(page.getByRole("note", { name: "Consigne" })).toContainText("Inclinez la marche");
  await shot(page, `grosplan-${device}`);
  await drag(page, 0, -110);
  await expect(page.locator("[data-revealed]")).toContainText("bottes qui entre", { timeout: 10_000 });
  await expect(page.getByRole("status", { name: /Nouvel indice : Seuil de la porte de service/ })).toBeVisible();
  await shot(page, `grosplan-revele-${device}`);
  expect((await record(page)).cards).toContain("service_threshold");
  await press(page.getByRole("button", { name: /Reposer/ }));
  await expect.poll(() => mode(page)).toBe("playing");

  // 3. Photo de l'inauguration : on la retourne (verso), puis la loupe sur la personne de dos → Lou se tait.
  await page.evaluate(() => (window as any).__silo.inquiry.examine("a1"));
  await expect.poll(() => mode(page)).toBe("closeup");
  await press(page.getByRole("button", { name: "Retourner" }));
  await expect(page.locator("[data-revealed]").first()).toContainText("Jour de la porte", { timeout: 10_000 });
  await press(page.getByRole("button", { name: "Retourner" }));
  await press(page.getByRole("button", { name: "Loupe" }));
  await page.waitForTimeout(400);
  const object = (await page.getByTestId("closeup-object").boundingBox())!;
  await page.mouse.move(object.x + object.width * 0.5, object.y + object.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(object.x + object.width * 0.29, object.y + object.height * 0.77, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByTestId("loupe")).toBeVisible();
  await expect(page.getByRole("status", { name: "Pensée de Lou" })).toContainText("Ce triangle", { timeout: 10_000 });
  await shot(page, `loupe-${device}`);
  await expect(page.getByRole("status", { name: "Pensée de Lou" })).toHaveText("…", { timeout: 10_000 });
  await page.keyboard.press("Escape");
  await expect.poll(() => mode(page)).toBe("playing");

  // 4. Lampe UV au seuil (rien) puis à l'infirmerie (une traînée part de l'armoire).
  await teleport(page, -6.5, 27, -Math.PI / 2);
  if (touch) await page.getByRole("button", { name: "Lampe UV" }).dispatchEvent("pointerdown");
  else await page.keyboard.press("KeyU");
  await expect.poll(() => page.evaluate(() => (window as any).__silo.inquiry.uvOn)).toBe(true);
  await expect.poll(async () => (await record(page)).traces, { timeout: 10_000 }).toContain("c1");
  const energy = await page.evaluate(() => (window as any).__silo.state.energy);
  expect(energy, "la lampe UV consomme la charge").toBeLessThan(100);
  await teleport(page, 11.4, 0.4, Math.atan2(5, 3.4));
  await expect.poll(async () => (await record(page)).traces, { timeout: 10_000 }).toContain("c2");
  await page.waitForTimeout(500);
  await shot(page, `uv-${device}`);
  // Éblouir repasse en lumière blanche : on fige OU on révèle.
  await page.evaluate(() => (window as any).__silo.input.trigger("light"));
  await expect.poll(() => page.evaluate(() => (window as any).__silo.inquiry.uvOn)).toBe(false);

  // 5. Tableau d'enquête : l'avis officiel (lu au hub), une liaison fausse, puis la bonne.
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.inquiry.examine("poster_notice");
    engine.resume();
    engine.setMode("journal", "enquete");
  });
  await expect(page.getByRole("tabpanel", { name: "Enquête" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comment les mordus sont-ils entrés ?" })).toBeVisible();
  await shot(page, `tableau-${device}`);
  await press(page.getByRole("button", { name: "Relier deux cartes" }));
  await press(page.getByRole("button", { name: "Carte : Avis à tous" }));
  await press(page.getByRole("button", { name: "Carte : Seuil de la porte de service" }));
  const boardThought = page.getByRole("tabpanel", { name: "Enquête" }).getByRole("status", { name: "Pensée de Lou" });
  await expect(boardThought).toBeVisible();
  await shot(page, `erreur-${device}`);
  expect((await record(page)).deductions).toEqual([]);
  // Le mode « relier » reste ouvert après une erreur : on réessaie.
  await expect(page.getByRole("button", { name: "Annuler" })).toBeVisible();
  await press(page.getByRole("button", { name: "Carte : Avis à tous" }));
  await press(page.getByRole("button", { name: "Carte : Seuil, à la lampe UV" }));
  await expect(page.getByRole("img", { name: "Tampon : Juste" })).toBeVisible();
  await expect(page.getByText("Personne n'est entré par la porte de service.")).toBeVisible();
  expect((await record(page)).deductions).toEqual(["X1"]);
  await shot(page, `juste-${device}`);

  // 6. Phrase à trous C1 : aide « Réfléchir », puis la phrase entière depuis la banque de mots.
  await press(page.getByRole("button", { name: "Réfléchir" }));
  await expect(boardThought).toBeVisible();
  await page.evaluate(() => { (window as any).__silo.inquiry.grantCard("note_infirmary_map", false); });
  const sentence = page.getByLabel("Phrase à compléter : L'origine");
  await sentence.scrollIntoViewIfNeeded();
  await expect(sentence).toContainText("Indices trouvés : 3");
  for (const word of ["la porte de service", "la chambre 1", "l'infirmerie"]) await press(sentence.getByRole("button", { name: word, exact: true }));
  await press(sentence.getByRole("button", { name: "Valider la phrase" }));
  await expect(sentence.getByRole("img", { name: "Tampon : Résolu" })).toBeVisible();
  await expect(sentence).toContainText("Tiroir du bureau");
  expect((await record(page)).deductions).toEqual(["X1", "C1"]);
  await shot(page, `phrase-${device}`);
}

test("ordi : enquête — pensée, gros plan, loupe, lampe UV, tableau", async ({ page }) => {
  test.setTimeout(900_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = await boot(page);
  await scenario(page, "ordi");
  expect(errors).toEqual([]);
});

test("téléphone portrait : enquête au doigt", async ({ browser }) => {
  test.setTimeout(900_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = await boot(page);
  await scenario(page, "portrait");
  expect(errors).toEqual([]);
  await context.close();
});

test("téléphone paysage : gros plan et tableau tiennent à l'écran", async ({ browser }) => {
  test.setTimeout(900_000);
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = await boot(page);
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.input.device = "touch";
    for (const id of ["poster_notice", "c1", "service_threshold", "c2", "note_infirmary_map"]) engine.inquiry.grantCard(id, false);
    engine.inquiry.examine("a1");
  });
  await expect.poll(() => mode(page)).toBe("closeup");
  for (const name of ["Retourner", "Loupe", "Reposer"]) {
    const box = await page.getByRole("button", { name: new RegExp(name) }).boundingBox();
    expect(box !== null && box.y + box.height <= 390, `« ${name} » visible`).toBe(true);
  }
  await shot(page, "grosplan-paysage");
  await page.getByRole("button", { name: /Reposer/ }).tap();
  await page.evaluate(() => (window as any).__silo.setMode("journal", "enquete"));
  await expect(page.getByRole("tabpanel", { name: "Enquête" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Relier deux cartes" })).toBeInViewport();
  await shot(page, "tableau-paysage");
  expect(errors).toEqual([]);
  await context.close();
});
