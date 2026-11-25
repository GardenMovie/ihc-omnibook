/** The walkthrough: offered once, walked through, reopened from the settings. */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// A first visit: nothing saved yet.
test.use({ storageState: { cookies: [], origins: [] } });

async function expectAccessible(page: Page) {
  if (page.context().browser()?.browserType().name() !== "chromium") return;
  const { violations } = await new AxeBuilder({ page }).include("[role=dialog]").analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);
}

test("offers the walkthrough once and reopens it from the settings", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const dialog = page.getByRole("dialog");
  const button = (name: string) => page.getByRole("button", { name, exact: true });

  await expect(dialog.getByRole("heading", { name: "Primeira vez aqui?" })).toBeVisible();
  await expect(button("Ver o passo a passo")).toBeFocused();
  await expectAccessible(page);
  await button("Ver o passo a passo").click();
  await expect(dialog.getByText("Passo 1 de 7")).toBeVisible();
  await expect(dialog).toHaveCount(1);

  // Going back from the first step does nothing.
  await button("Voltar").click({ force: true });
  await expect(dialog.getByText("Passo 1 de 7")).toBeVisible();

  for (let step = 2; step <= 5; step++) await button("Próximo").click();
  await expect(dialog.getByRole("heading", { name: "Atalhos do teclado" })).toBeVisible();
  await expect(button("Próximo")).toBeFocused();
  await expectAccessible(page);
  await dialog.getByRole("checkbox", { name: /Atalhos de uma tecla só/ }).uncheck();
  await expect(dialog.getByText("Desligado")).toHaveCount(8);

  await button("Próximo").click();
  await button("Próximo").click();
  await button("Concluir").click();
  await expect(dialog).toBeHidden();
  await expect(button("Adicionar")).toBeFocused();

  // The choice about shortcuts holds, and the offer does not come back.
  await page.reload();
  await expect(page.getByText("Sua biblioteca está vazia")).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await page.keyboard.press("a");
  await expect(dialog).toHaveCount(0);

  await button("Configurações").click();
  await button("Ver o passo a passo").click();
  await expect(dialog).toHaveCount(1);
  await expect(dialog.getByText("Passo 1 de 7")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(button("Configurações")).toBeFocused();
});

test("does not offer it again after being declined", async ({ page }) => {
  await page.goto("/");
  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "Agora não" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Adicionar", exact: true })).toBeFocused();
  await page.reload();
  await expect(page.getByText("Sua biblioteca está vazia")).toBeVisible();
  await expect(dialog).toHaveCount(0);
});
