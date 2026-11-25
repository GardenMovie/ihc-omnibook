/** Editing, deleting and exporting the reference of a book. */
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const card = (page: Page, title: string) =>
  page.getByRole("button", { name: new RegExp(`Selecionar.*${title}`) });
const field = (page: Page, name: string) => page.getByRole("textbox", { name, exact: true });
const editDialog = (page: Page) => page.getByRole("dialog", { name: "Editar metadados" });
const refDialog = (page: Page) => page.getByRole("dialog", { name: "Exportar referência" });

async function expectAccessible(page: Page) {
  if (page.context().browser()?.browserType().name() !== "chromium") return;
  const { violations } = await new AxeBuilder({ page }).include("[role=dialog]").analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  // No colour transitions, or axe may measure contrast halfway through one.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByText("Dev tools").click();
  await button(page, "Load sample books").click();
  await card(page, "Numerical Analysis").click();
});

test("edits a book, and deletes it with undo", async ({ page }) => {
  const edit = button(page, "Editar metadados");
  await edit.click();
  await expect(field(page, "Título")).toBeFocused();
  await expectAccessible(page);

  // Cancelling keeps the book as it was.
  await field(page, "Título").fill("Descartado");
  await button(page, "Cancelar").click();
  await expect(editDialog(page)).toBeHidden();
  await expect(edit).toBeFocused();
  await expect(card(page, "Numerical Analysis")).toBeVisible();

  await edit.click();
  await field(page, "Título").fill("");
  await button(page, "Salvar").click();
  await expect(page.getByText("Escreva o título do livro.")).toBeVisible();
  await field(page, "Título").fill("Análise Numérica");
  await field(page, "Editora").fill("Cengage");
  await button(page, "Salvar").click();
  await expect(editDialog(page)).toBeHidden();
  await expect(edit).toBeFocused();
  await expect(page.getByRole("heading", { name: "Análise Numérica" })).toBeVisible();

  await page.reload();
  await card(page, "Análise Numérica").click();
  await edit.click();
  await expect(field(page, "Editora")).toHaveValue("Cengage");

  // Backing out of the confirmation keeps what was typed.
  await field(page, "Editora").fill("Outra");
  await button(page, "Excluir livro").click();
  await expect(button(page, "Cancelar")).toBeFocused();
  await expect(editDialog(page)).toContainText("Excluir “Análise Numérica” da biblioteca?");
  await expectAccessible(page);
  await page.keyboard.press("Escape");
  await expect(field(page, "Editora")).toHaveValue("Outra");

  await button(page, "Excluir livro").click();
  await button(page, "Excluir livro").click();
  await expect(editDialog(page)).toBeHidden();
  await expect(card(page, "Análise Numérica")).toBeHidden();
  await expect(button(page, "Adicionar")).toBeFocused();
  await button(page, "Desfazer").click();
  await expect(card(page, "Análise Numérica")).toBeVisible();
});

test("shows, updates, downloads and copies a reference", async ({ page, browserName }) => {
  const open = button(page, "Exportar referência");
  await open.click();
  const preview = refDialog(page).getByRole("region", { name: "Referência em BibTeX" });
  await expect(preview).toContainText("@book{burden2010numerical,");
  await expect(refDialog(page)).toContainText("Faltam dados: Editora.");
  await expectAccessible(page);

  const download = page.waitForEvent("download");
  await button(page, "Baixar .bib").click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("Burden - Numerical Analysis (2010).bib");
  expect(await readFile(await file.path(), "utf8")).toContain("year = {2010}");

  // Fixing the missing data returns to the updated reference.
  await refDialog(page).getByRole("button", { name: "Editar metadados" }).click();
  await expect(field(page, "Título")).toBeFocused();
  await field(page, "Editora").fill("Cengage");
  await button(page, "Salvar").click();
  await expect(preview).toContainText("publisher = {Cengage}");
  await expect(refDialog(page)).not.toContainText("Faltam dados");

  await page.getByText("ABNT", { exact: true }).click();
  const abnt = refDialog(page).getByRole("region", { name: "Referência em ABNT" });
  await expect(abnt.locator("strong")).toHaveText("Numerical Analysis");
  await expect(refDialog(page)).toContainText("Faltam dados: Local de publicação.");
  await expectAccessible(page);

  if (browserName === "chromium") {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  }
  await button(page, "Copiar referência").click();
  await expect(refDialog(page).getByText("Referência copiada")).toBeVisible();
  if (browserName === "chromium") {
    const copied = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      const read = async (type: string) => (await item.getType(type)).text();
      return { text: await read("text/plain"), html: await read("text/html") };
    });
    expect(copied.text).toContain("BURDEN, Richard L.");
    expect(copied.html).toContain("<strong>Numerical Analysis</strong>");
  }

  await page.keyboard.press("Escape");
  await expect(refDialog(page)).toBeHidden();
  await expect(open).toBeFocused();
});
