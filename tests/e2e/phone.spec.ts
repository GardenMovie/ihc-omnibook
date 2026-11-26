/** On a narrow screen the book details cover it until closed. */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

test.use({ viewport: { width: 390, height: 740 } });

test("shows book details over the screen, closed with the X", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await button(page, "Adicionar").click();
  await page.getByTestId("file-input").setInputFiles({
    name: "Notas.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Notas"),
  });
  await button(page, "Continuar").click();
  await button(page, "Adicionar livro").click();
  await expect(page.getByRole("dialog")).toBeHidden();

  const card = page.getByRole("button", { name: /Selecionar/ });
  const details = page.getByRole("dialog", { name: "Detalhes do livro" });
  await expect(button(page, "Abrir")).toBeHidden();
  await card.click();
  await expect(details).toBeVisible();
  expect(await details.boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 740 });
  if (page.context().browser()?.browserType().name() === "chromium") {
    const { violations } = await new AxeBuilder({ page }).include("[role=dialog]").analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);
  }

  // A modal opened from the details returns to them.
  await button(page, "Exportar referência").click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(button(page, "Exportar referência")).toBeFocused();

  await button(page, "Abrir").click();
  await button(page, "Voltar à biblioteca").click();
  await expect(button(page, "Abrir")).toBeFocused();

  // The book's shortcuts still work over its details.
  await page.keyboard.press("r");
  await expect(page.getByRole("dialog", { name: "Detalhes do livro" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(details).toBeVisible();

  await details.getByRole("button", { name: "Fechar janela" }).click();
  await expect(details).toBeHidden();
  await expect(card).toBeFocused();
});
