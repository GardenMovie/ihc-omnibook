/** Reading TXT and Markdown books inside the app. */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const text = (page: Page) => page.getByRole("region", { name: "Texto do livro" });

async function add(page: Page, name: string, content: string) {
  await button(page, "Adicionar").click();
  await page.getByTestId("file-input").setInputFiles({
    name,
    mimeType: "text/plain",
    buffer: Buffer.from(content),
  });
  await button(page, "Continuar").click();
  await button(page, "Adicionar livro").click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByText("Sua biblioteca está vazia")).toBeVisible();
});

test("reads a text file and returns to the same place", async ({ page }) => {
  const paragraphs = Array.from({ length: 200 }, (_, i) => `Parágrafo ${i + 1}.`);
  await add(page, "Longo.txt", paragraphs.join("\n\n"));

  const open = button(page, "Abrir");
  await open.click();
  const reader = page.getByRole("dialog", { name: "Longo" });
  await expect(text(page)).toBeFocused();
  await expect(reader).toContainText("0% lido");

  await page.keyboard.press("End");
  await expect(reader).toContainText("100% lido");
  await page.keyboard.press("Escape");
  await expect(reader).toBeHidden();
  await expect(open).toBeFocused();

  await page.reload();
  await expect(open).toBeVisible();
  await page.keyboard.press("o");
  await expect(reader).toContainText("100% lido");
  await expect(page.getByText("Parágrafo 200.")).toBeInViewport();

  // The browser's Back button closes the reader, not the app.
  await page.goBack();
  await expect(reader).toBeHidden();
  await expect(open).toBeVisible();
});

test("opens a PDF in a new tab, typed as PDF", async ({ page }) => {
  // The test browsers have no PDF viewer, so check what the tab is given.
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob: Blob) => {
      document.documentElement.dataset.blobType = blob.type;
      return create(blob);
    };
  });
  await page.reload();
  await add(page, "Artigo.pdf", "%PDF-1.4\n%%EOF");

  const [tab] = await Promise.all([
    page.waitForEvent("popup"),
    button(page, "Abrir (abre em nova aba)").click(),
  ]);
  await expect(page.locator("html")).toHaveAttribute("data-blob-type", "application/pdf");
  expect(await tab.evaluate(() => window.opener).catch(() => null)).toBeNull();
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("loads readable sample books from the developer tools", async ({ page }) => {
  await page.getByText("Dev tools").click();
  await button(page, "Load sample books").click();
  await page.getByRole("button", { name: /Selecionar.*Dom Casmurro/ }).click();
  await button(page, "Abrir").click();
  await expect(text(page)).toContainText("The Project Gutenberg eBook of Dom Casmurro");
});

test("shows Markdown safely, with contents", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (/^https?:/.test(url) && !url.startsWith("http://localhost:")) external.push(url);
  });
  const alerts: string[] = [];
  page.on("dialog", (alert) => {
    alerts.push(alert.message());
    void alert.dismiss();
  });

  await add(
    page,
    "nota.md",
    [
      "# Nota",
      "![gráfico](https://example.com/a.png)",
      '<img src="x" onerror="alert(1)"><script>alert(2)</script>',
      "[perigo](javascript:alert(3))",
      ...Array.from({ length: 60 }, (_, i) => `Linha ${i + 1}.`),
      "## Fim",
      "Acabou.",
    ].join("\n\n"),
  );
  await button(page, "Abrir").click();
  await expect(text(page).getByRole("heading", { name: "Nota" })).toBeVisible();
  await expect(text(page)).toContainText("[Imagem não exibida: gráfico]");
  await expect(text(page).locator("img, script, a")).toHaveCount(0);
  if (page.context().browser()?.browserType().name() === "chromium") {
    const { violations } = await new AxeBuilder({ page }).include("[role=dialog]").analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);
  }

  // Escape closes the contents first, then the reader.
  const contents = button(page, "Sumário");
  await contents.click();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  await expect(contents).toBeFocused();
  await expect(contents).toHaveAttribute("aria-expanded", "false");

  await contents.click();
  await button(page, "Fim").click();
  await expect(text(page).getByRole("heading", { name: "Fim" })).toBeFocused();
  await expect(text(page).getByText("Acabou.")).toBeInViewport();

  await button(page, "Voltar à biblioteca").click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(external).toEqual([]);
  expect(alerts).toEqual([]);
});
