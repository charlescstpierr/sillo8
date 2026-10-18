// Contenu d'enquête de l'étage 1, joué (ordi et téléphone en portrait) : un mordu figé à la lampe qu'on examine
// (ticket du commis, cafétéria), le plan de l'infirmerie, X2 au tableau, l'armoire qu'on pousse et la chambre 1 ;
// le cadenas PECHES (entrepôt) puis C3 ; la feuille du guetteur (dehors) et la page arrachée à la loupe
// (génératrice), X3 ; le terminal de Bérard (MARCEAU, sécurité). Captures docs/screenshots/sillo8-enquete-contenu-*.
import { expect, test, type Locator, type Page } from "@playwright/test";

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
    // Les mordus ne poursuivent pas pendant le test : tous figés, comme par la lampe (longtemps).
    for (const z of engine.horde.zombies) engine.horde.damage(z.id, 0, 9999);
    engine.state.health = 100;
  });
  return errors;
}

const mode = (page: Page) => page.evaluate(() => (window as any).__silo.ui.get().mode as string);
const record = (page: Page) => page.evaluate(() => {
  const r = (window as any).__silo.state.ext.investigation ?? {};
  return { cards: [] as string[], deductions: [] as string[], unlocked: [] as string[], ...JSON.parse(JSON.stringify(r)) };
});

async function shot(page: Page, name: string) {
  await page.waitForTimeout(450);
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.__draw(engine.scene, engine.camera);
  });
  await page.screenshot({ path: `${SHOTS}/sillo8-enquete-contenu-${name}.png`, animations: "disabled" });
}

/** Place Lou ; `yaw` : direction du regard (0 = sud, π/2 = est, π = nord, −π/2 = ouest). */
async function teleport(page: Page, x: number, z: number, yaw: number) {
  await page.evaluate(([x, z, yaw]) => {
    const engine = (window as any).__silo;
    engine.input.pointer = null;
    engine.player.x = x;
    engine.player.z = z;
    engine.player.vx = engine.player.vz = 0;
    engine.player.yaw = yaw;
    engine.rig.snap(new engine.rig.focus.constructor(x, 0, z));
  }, [x, z, yaw] as const);
}

/** Va examiner un objet : attend qu'il soit l'objet visé, appuie sur E, attend le gros plan. */
async function examine(page: Page, id: string) {
  await expect.poll(() => page.evaluate(() => (window as any).__silo.focus?.examine ?? null), { timeout: 10_000 }).toBe(id);
  await page.evaluate(() => (window as any).__silo.input.trigger("interact"));
  await expect.poll(() => mode(page)).toBe("closeup");
}

/** Fige un mordu (comme la lampe) et place Lou à 2,5 m, face à lui. */
async function freezeAndFace(page: Page, enemy: string) {
  const at = await page.evaluate((id) => {
    const engine = (window as any).__silo;
    engine.horde.damage(id, 0, 60);
    const z = engine.horde.get(id);
    return { x: z.x, z: z.z };
  }, enemy);
  await teleport(page, at.x - 2.5, at.z, Math.PI / 2);
}

async function scenario(page: Page, device: "ordi" | "portrait") {
  const touch = device === "portrait";
  const press = async (locator: Locator) => (touch ? locator.tap() : locator.click());
  if (touch) await page.evaluate(() => { (window as any).__silo.input.device = "touch"; });
  const close = async () => {
    await press(page.getByRole("button", { name: /Reposer/ }));
    await expect.poll(() => mode(page)).toBe("playing");
  };
  const board = async () => {
    await page.evaluate(() => (window as any).__silo.setMode("journal", "enquete"));
    await expect(page.getByRole("tabpanel", { name: "Enquête" })).toBeVisible();
  };
  const leaveBoard = async () => {
    await page.evaluate(() => (window as any).__silo.resume());
    await expect.poll(() => mode(page)).toBe("playing");
  };
  const link = async (a: string, b: string, id: string) => {
    await press(page.getByRole("button", { name: "Relier deux cartes" }));
    await press(page.getByRole("button", { name: `Carte : ${a}`, exact: true }));
    await press(page.getByRole("button", { name: `Carte : ${b}`, exact: true }));
    await expect(page.getByRole("img", { name: "Tampon : Juste" }).first()).toBeVisible();
    expect((await record(page)).deductions).toContain(id);
  };

  // ——— 1. Cafétéria : le commis, figé à la lampe, porte le ticket de plateau. ———
  await freezeAndFace(page, "crawler_cafe");
  await examine(page, "note_tray_ticket");
  await expect(page.getByRole("heading", { name: "Ticket du plateau" })).toBeVisible();
  await shot(page, `ticket-${device}`);
  await close();
  expect((await record(page)).cards).toContain("note_tray_ticket");

  // ——— 2. Infirmerie : le plan au mur (« Chambre 1 : CONDAMNÉE »). ———
  await teleport(page, 10.95, -6.9, Math.PI);
  await examine(page, "note_infirmary_map");
  await close();

  // ——— 3. Tableau : X2, la chambre condamnée. ———
  await board();
  await link("Plan de l'infirmerie", "Ticket de plateau", "X2");
  await expect(page.getByText("On nourrissait quelqu'un dans une chambre condamnée.")).toBeVisible();
  await shot(page, `x2-${device}`);
  await leaveBoard();

  // ——— 4. L'armoire se pousse : la chambre 1. ———
  await teleport(page, 17.15, 6.58, Math.PI / 2);
  await examine(page, "room1_cabinet");
  await close();
  await expect.poll(() => page.evaluate(() => (window as any).__silo.scene.getObjectByName("story:room1_cabinet")?.position.z ?? 0), { timeout: 10_000 }).toBeLessThan(5.4);
  await teleport(page, 19.5, 6.6, Math.PI / 2);
  await expect(page.getByRole("status", { name: "Pensée de Lou" })).toContainText("condamnée", { timeout: 15_000 });
  expect(await page.evaluate(() => (window as any).__silo.scene.getObjectByName("story:room1_ceiling")?.visible)).toBe(false);
  await shot(page, `chambre1-${device}`);

  // ——— 5. Entrepôt : le cadenas à lettres. PECHES (menu du jour + post-it de Cuisine). ———
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.state.readNote("note_cafeteria");
    engine.inquiry.grantCard("note_cook_postit", false);
    engine.inquiry.grantCard("note_lila_2", false);
  });
  const cells = await page.evaluate(() => (window as any).__silo.state.cells);
  await teleport(page, -30.6, -4.5, Math.PI);
  await examine(page, "battery_locker");
  await expect(page.getByRole("group", { name: "Molettes du cadenas" })).toBeVisible();
  if (touch) {
    for (const [i, letter] of [..."PECHES"].entries()) {
      const forward = letter.charCodeAt(0) - 65;
      const steps = forward <= 13 ? forward : 26 - forward;
      const button = page.getByRole("button", { name: `Molette ${i + 1} : lettre ${forward <= 13 ? "suivante" : "précédente"}` });
      for (let s = 0; s < steps; s++) await button.tap();
    }
  } else {
    await page.getByLabel("Taper les lettres du cadenas").fill("POMMES");
    await page.getByRole("button", { name: "Ouvrir", exact: true }).click();
    await expect(page.getByLabel(/^Énigme/).getByRole("status", { name: "Pensée de Lou" })).toContainText("encore et encore");
    await shot(page, `cadenas-erreur-${device}`);
    await page.getByLabel("Taper les lettres du cadenas").fill("pêches");
  }
  await shot(page, `cadenas-${device}`);
  await press(page.getByRole("button", { name: "Ouvrir", exact: true }));
  await expect(page.getByText("Le cadenas s'ouvre.")).toBeVisible();
  await shot(page, `cadenas-ouvert-${device}`);
  await close();
  expect((await record(page)).cards).toContain("note_battery_count");
  expect(await page.evaluate(() => (window as any).__silo.state.cells)).toBe(cells + 3);

  // ——— 6. Tableau : C3, les piles. ———
  await board();
  const c3 = page.getByLabel("Phrase à compléter : Les piles");
  await c3.scrollIntoViewIfNeeded();
  await expect(c3).toContainText("Indices trouvés : 3");
  for (const word of ["lampes", "Lila", "Cuisine"]) await press(c3.getByRole("button", { name: word, exact: true }));
  await press(c3.getByRole("button", { name: "Valider la phrase" }));
  await expect(c3.getByRole("img", { name: "Tampon : Résolu" })).toBeVisible();
  await shot(page, `c3-${device}`);
  await leaveBoard();

  // ——— 7. Dehors : le guetteur, figé, porte la feuille d'expédition. ———
  await freezeAndFace(page, "walker_ext");
  await examine(page, "note_expedition");
  await close();

  // ——— 8. Génératrice : la page arrachée, à la loupe. ———
  await teleport(page, -27.9, 23.9, Math.PI);
  await examine(page, "a2");
  await press(page.getByRole("button", { name: "Loupe" }));
  await page.waitForTimeout(300);
  const object = (await page.getByTestId("closeup-object").boundingBox())!;
  await page.mouse.move(object.x + object.width * 0.3, object.y + object.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(object.x + object.width * 0.5, object.y + object.height * 0.5, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator("[data-revealed]")).toContainText("l'empreinte en creux", { timeout: 10_000 });
  await shot(page, `loupe-page-${device}`);
  await page.keyboard.press("Escape");
  await expect.poll(() => mode(page)).toBe("playing");

  // ——— 9. Tableau : X3, « RAS ». ———
  await board();
  await link("Feuille d'expédition", "Empreinte de la page arrachée", "X3");
  await expect(page.getByText("Marceau était blessé au retour. Bérard a menti.")).toBeVisible();
  await shot(page, `x3-${device}`);
  await leaveBoard();

  // ——— 10. Sécurité : le terminal de Bérard. GUETTEUR, puis MARCEAU. ———
  await teleport(page, 3.0, 16.4, 0);
  await examine(page, "terminal");
  const typeWord = async (word: string) => {
    if (touch) {
      for (const l of word) await page.getByRole("button", { name: `Lettre ${l}`, exact: true }).tap();
      await page.getByRole("button", { name: "Valider", exact: true }).tap();
    } else {
      await page.getByRole("textbox", { name: "Mot de passe", exact: true }).fill(word);
      await page.keyboard.press("Enter");
    }
  };
  await typeWord("GUETTEUR");
  await expect(page.getByLabel(/^Énigme/).getByRole("status", { name: "Pensée de Lou" })).toContainText("il l'a laissé dehors");
  await shot(page, `terminal-erreur-${device}`);
  await typeWord("MARCEAU");
  await expect(page.getByText("Le terminal s'allume sur le journal du poste.")).toBeVisible();
  await shot(page, `terminal-${device}`);
  await close();
  const r = await record(page);
  expect(r.cards).toContain("terminal_log");
  expect(r.deductions).toEqual(["X2", "C3", "X3"]);
  // Les conversations peuvent lire ce que l'enquête a établi.
  const flags = await page.evaluate(() => (window as any).__silo.state.flags as string[]);
  expect(flags).toEqual(expect.arrayContaining(["x2", "c3", "x3", "puzzle_locker", "puzzle_terminal"]));
}

test("ordi : enquête de l'étage 1, quatre pièces, trois déductions, deux énigmes", async ({ page }) => {
  test.setTimeout(900_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = await boot(page);
  await scenario(page, "ordi");
  expect(errors).toEqual([]);
});

test("téléphone portrait : enquête de l'étage 1 au doigt", async ({ browser }) => {
  test.setTimeout(900_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = await boot(page);
  await scenario(page, "portrait");
  expect(errors).toEqual([]);
  await context.close();
});

test("le paquet noué de la sacoche ne s'ouvre pas : « Pas maintenant. »", async ({ page }) => {
  test.setTimeout(900_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = await boot(page);
  await page.evaluate(() => (window as any).__silo.openInventory());
  await page.getByRole("button", { name: "Examiner le paquet noué" }).click();
  await expect.poll(() => mode(page)).toBe("closeup");
  await expect(page.getByRole("heading", { name: "Paquet noué" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Pensée de Lou" })).toContainText("Pas maintenant.", { timeout: 10_000 });
  await shot(page, "paquet-ordi");
  expect(errors).toEqual([]);
});

test("téléphone portrait : un avis arrivé pendant le gros plan (disjoncteur) s'affiche dans la feuille, sous le titre", async ({ browser }) => {
  test.setTimeout(600_000);
  const context = await browser.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = await boot(page);
  await page.evaluate(() => {
    const engine = (window as any).__silo;
    engine.input.device = "touch";
    engine.state.collect("e2e-p", "components", 3);
    engine.state.exploreEntrance();
    engine.state.powerGenerator();
    // Un avis d'avant le gros plan n'est pas repris dans la feuille.
    engine.notify("Avis d'avant le gros plan.");
    engine.inquiry.examine("levers");
  });
  await expect.poll(() => mode(page)).toBe("closeup");
  const heading = page.getByRole("heading", { name: "Tableau des circuits" });
  await expect(heading).toBeVisible();
  const notice = page.getByTestId("closeup-notice");
  await expect(notice).toHaveCount(0);
  // Mauvais ordre : le disjoncteur claque.
  for (const label of ["CONTRÔLE", "DORTOIRS", "CAFÉTÉRIA", "INFIRMERIE"]) await page.getByRole("button", { name: `Levier ${label}` }).tap();
  await expect(notice).toContainText("Le disjoncteur claque.");
  // L'avis flottant du jeu reste masqué en gros plan (il couvrait le titre).
  await expect(page.locator("p[data-mode]")).toHaveCount(0);
  await page.waitForTimeout(500); // la ligne glisse en place (animation d'entrée)
  const title = (await heading.boundingBox())!;
  const line = (await notice.boundingBox())!;
  const close = (await page.getByRole("button", { name: /Reposer/ }).boundingBox())!;
  expect(line.y).toBeGreaterThanOrEqual(title.y + title.height);
  expect(line.y + line.height).toBeLessThanOrEqual(close.y + 1);
  expect(close.y + close.height).toBeLessThanOrEqual(760);
  await shot(page, "avis-gros-plan-portrait");
  // Le bon ordre : le courant revient ; l'avis suivant remplace le premier.
  await page.waitForTimeout(500);
  for (const label of ["DORTOIRS", "CAFÉTÉRIA", "INFIRMERIE", "CONTRÔLE"]) await page.getByRole("button", { name: `Levier ${label}` }).tap();
  await expect(notice).toContainText("Le courant revient");
  expect(errors).toEqual([]);
  await context.close();
});

for (const [width, height] of [[390, 760], [375, 667]] as const) {
  test(`téléphone portrait ${width}×${height} : le clavier du terminal tient à l'écran, « Reposer » compris, cibles de 44 px`, async ({ browser }) => {
    test.setTimeout(600_000);
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = await boot(page);
    await page.evaluate(() => {
      const engine = (window as any).__silo;
      engine.input.device = "touch";
      engine.inquiry.examine("terminal");
    });
    await expect.poll(() => mode(page)).toBe("closeup");
    for (const l of "GUETTEUR") await page.getByRole("button", { name: `Lettre ${l}`, exact: true }).tap();
    await page.getByRole("button", { name: "Valider", exact: true }).tap();
    await expect(page.getByLabel(/^Énigme/).getByRole("status", { name: "Pensée de Lou" })).toContainText("il l'a laissé dehors");
    // Un avis en plus (le cas le plus chargé) : tout reste à l'écran.
    await page.evaluate(() => (window as any).__silo.notify("Le disjoncteur claque. Trois secondes de noir. Les leviers retombent."));
    await expect(page.getByTestId("closeup-notice")).toBeVisible();
    const problems = await page.locator("section[data-sheet]").evaluate((root, [vw, vh]) => {
      const out: string[] = [];
      for (const el of root.querySelectorAll("button, h1, [data-testid=closeup-notice]")) {
        const r = el.getBoundingClientRect();
        if (!r.width) continue;
        const name = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24);
        if (r.top < -0.5 || r.left < -0.5 || r.bottom > vh + 0.5 || r.right > vw + 0.5) out.push(`${name} hors de l'écran`);
        if (el.tagName === "BUTTON" && (r.width < 44 || r.height < 44)) out.push(`${name} : ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
      return out;
    }, [width, height] as const);
    expect(problems).toEqual([]);
    await shot(page, `terminal-${width}x${height}`);
    for (const l of "MARCEAU") await page.getByRole("button", { name: `Lettre ${l}`, exact: true }).tap();
    await page.getByRole("button", { name: "Valider", exact: true }).tap();
    await expect(page.getByText("Le terminal s'allume sur le journal du poste.")).toBeVisible();
    await page.getByRole("button", { name: /Reposer/ }).tap();
    await expect.poll(() => mode(page)).toBe("playing");
    expect(errors).toEqual([]);
    await context.close();
  });
}
