/** Search filters, downloading one book, and the data tab of the settings. */
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

async function expectAccessible(page: Page) {
  // Chromium only: see library.spec.ts.
  if (page.context().browser()?.browserType().name() !== "chromium") return;
  // The book cards have a known "label in name" finding, outside this test.
  const { violations } = await new AxeBuilder({ page }).exclude("button[aria-pressed]").analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);
}

async function addBook(page: Page, title: string, topic: string) {
  await button(page, "Adicionar").click();
  await page.getByTestId("file-input").setInputFiles({
    name: `${title}.md`,
    mimeType: "text/markdown",
    buffer: Buffer.from(`# ${title}`),
  });
  await button(page, "Continuar").click();
  await button(page, "Adicionar tópico").click();
  await page.keyboard.type(topic);
  await page.keyboard.press("Enter");
  await button(page, "Adicionar livro").click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

test("filters with @, downloads a book, exports and deletes everything", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await addBook(page, "Primeiro", "Teoria dos Grafos");
  await addBook(page, "Segundo", "Redes");
  const cards = page.getByRole("button", { name: /Selecionar/ });
  await expect(cards).toHaveCount(2);

  const search = page.getByRole("combobox", { name: "Pesquisar livros" });
  await search.pressSequentially("@");
  await expect(page.getByRole("option")).toHaveCount(3);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(search).toHaveValue("@tópico:");
  await search.pressSequentially("graf");
  await page.keyboard.press("Enter");
  await expect(search).toHaveValue('@tópico:"Teoria dos Grafos" ');
  await expect(search).toBeFocused();
  await expect(cards).toHaveCount(1);
  await expect(page.locator("mark[data-filter=topic]")).toHaveText('@tópico:"Teoria dos Grafos"');

  // Escape closes the list and keeps the text.
  await search.pressSequentially("@");
  await expect(page.getByRole("option")).toHaveCount(3);
  await expectAccessible(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(search).toHaveValue('@tópico:"Teoria dos Grafos" @');
  await button(page, "Limpar busca").click();
  await expect(cards).toHaveCount(2);

  await search.pressSequentially("@arquivo");
  await expect(page.getByRole("option")).toHaveText([".txt", ".md", ".pdf", ".epub"]);
  await expectAccessible(page);
  await page.keyboard.press("Enter");
  await expect(search).toHaveValue("@arquivo:.txt ");
  await expect(cards).toHaveCount(0);
  await expect(page.locator("mark[data-filter=file]")).toHaveText("@arquivo:.txt");
  await button(page, "Limpar busca").click();
  await search.pressSequentially("@arquivo:md");
  await expect(cards).toHaveCount(2);
  await button(page, "Limpar busca").click();

  await cards.filter({ hasText: "Primeiro" }).click();
  const [file] = await Promise.all([page.waitForEvent("download"), button(page, "Baixar arquivo").click()]);
  expect(file.suggestedFilename()).toMatch(/Primeiro.*\.md$/);
  expect(await readFile(await file.path(), "utf8")).toBe("# Primeiro");

  await button(page, "Configurações").click();
  await page.getByRole("tab", { name: "Aparência" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Atalhos" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Seus dados" })).toBeFocused();
  await expectAccessible(page);
  const [backup] = await Promise.all([
    page.waitForEvent("download"),
    button(page, "Exportar tudo").click(),
  ]);
  expect(backup.suggestedFilename()).toMatch(/\.zip$/);
  await expect(page.getByText("Biblioteca exportada")).toBeVisible();

  await button(page, "Apagar tudo").click();
  await expect(button(page, "Cancelar")).toBeFocused();
  await expectAccessible(page);
  await page.keyboard.press("Escape");
  await expect(button(page, "Apagar tudo")).toBeFocused();
  await button(page, "Apagar tudo").click();
  await button(page, "Sim, apagar tudo").click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Sua biblioteca está vazia")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Sua biblioteca está vazia")).toBeVisible();
});
