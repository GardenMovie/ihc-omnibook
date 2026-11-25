/** Keyboard shortcuts: using, listing, remapping and turning them off. */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("runs, remaps and turns off shortcuts", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const dialog = page.getByRole("dialog");
  const search = page.getByRole("combobox", { name: "Pesquisar livros" });
  const button = (name: string) => page.getByRole("button", { name, exact: true });
  await expect(page.getByText("Sua biblioteca está vazia")).toBeVisible();

  await page.keyboard.press("a");
  await expect(dialog.getByRole("heading", { name: "Adicionar novo livro" })).toBeVisible();
  await page.getByTestId("file-input").setInputFiles({
    name: "Um.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Um"),
  });
  await button("Continuar").click();
  await button("Adicionar livro").click();
  await expect(dialog).toBeHidden();
  await button("Limpar busca").waitFor({ state: "hidden" });
  await page.locator("body").click({ position: { x: 5, y: 300 } });

  // Each key is written on its button, and explained on hover.
  const caps = page.locator("main, header, aside").locator("button kbd");
  await expect(caps).toHaveText(["A", ",", "E", "O", "R", "D"]);
  await button("Baixar arquivo").hover();
  await expect(page.getByRole("tooltip")).toHaveText("Atalho: D");
  await page.mouse.move(0, 300);

  await page.keyboard.press("e");
  await expect(dialog.getByRole("heading", { name: "Editar metadados" })).toBeVisible();
  // Typing in a field is not a shortcut.
  await page.keyboard.press("a");
  await expect(dialog).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.keyboard.press("/");
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("");
  await search.blur();

  await page.keyboard.press("?");
  await expect(page.getByRole("tab", { name: "Atalhos" })).toBeFocused();
  if (page.context().browser()?.browserType().name() === "chromium") {
    const { violations } = await new AxeBuilder({ page }).include("[role=dialog]").analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);
  }

  const change = button("Alterar atalho: Pesquisar livros");
  await change.click();
  const recording = button("Pressione a tecla atalho: Pesquisar livros");
  // A key in use is refused, and Esc cancels without closing the window.
  await page.keyboard.press("a");
  await expect(page.getByText("A já é usada em “Adicionar livro”")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(recording).toHaveCount(0);
  await expect(dialog).toBeVisible();
  // Starting with the keyboard must not record Enter itself.
  await change.press("Enter");
  await expect(recording).toBeFocused();
  await page.keyboard.press("Control+k");
  await expect(page.getByText("“Pesquisar livros” agora usa Ctrl + K.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  // The button follows the new key at once.
  await expect(search).toHaveAttribute("title", "Atalho: Ctrl + K");

  await page.reload();
  await expect(search).toHaveAttribute("aria-keyshortcuts", "Control+k");
  await expect(page.getByRole("button", { name: /Selecionar/ })).toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(search).toBeFocused();
  await search.blur();

  await page.keyboard.press(",");
  await page.getByRole("tab", { name: "Atalhos" }).click();
  await page.getByRole("checkbox", { name: /Atalhos de uma tecla só/ }).uncheck();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.keyboard.press("a");
  await expect(dialog).toHaveCount(0);
  await page.keyboard.press("Control+k");
  await expect(search).toBeFocused();

  await button("Configurações").click();
  // Neither the window nor the tabs move from one tab to another.
  const places = new Set<string>();
  for (const name of ["Aparência", "Seus dados", "Atalhos"]) {
    const tab = page.getByRole("tab", { name });
    await tab.click();
    const [outer, first] = await Promise.all([
      dialog.boundingBox(),
      page.getByRole("tab", { name: "Aparência" }).boundingBox(),
    ]);
    places.add(`${outer?.y} ${outer?.height} ${first?.y}`);
  }
  expect(places.size).toBe(1);
  await button("Restaurar padrão").click();
  await page.keyboard.press("Escape");
  await expect(search).toHaveAttribute("aria-keyshortcuts", "/");
});
