/** Adding books, and the storage and extraction layers, in real browsers. */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { makeEpub, makePdf } from "../unit/fixtures";

const payload = async (name: string, blob: Blob) => ({
  name,
  mimeType: blob.type || "application/octet-stream",
  buffer: Buffer.from(await blob.arrayBuffer()),
});

const card = (page: Page, title: string) =>
  page.getByRole("button", { name: new RegExp(`Selecionar.*${title}`) });

const dialog = (page: Page) => page.getByRole("dialog", { name: "Adicionar novo livro" });
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

async function choose(page: Page, ...files: Awaited<ReturnType<typeof payload>>[]) {
  await page.getByTestId("file-input").setInputFiles(files);
}

async function expectAccessible(page: Page) {
  // Chromium only: Playwright's Firefox segfaults when files are chosen in a
  // page where axe has already run.
  if (page.context().browser()?.browserType().name() !== "chromium") return;
  const { violations } = await new AxeBuilder({ page }).include("[role=dialog]").analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`)).toEqual([]);
}

const markdown = (title: string) => payload(`${title}.md`, new Blob([`# ${title}`]));

test("adds files, keeps them after reload, and restores a backup", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => {
    if (/Could not|fake worker/i.test(message.text())) problems.push(message.text());
  });
  const external: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (/^https?:/.test(url) && !url.startsWith("http://localhost:")) external.push(url);
  });

  await page.goto("/");
  await expect(page.getByText("Sua biblioteca está vazia")).toBeVisible();

  await button(page, "Adicionar").click();
  await expect(button(page, "Escolher arquivos")).toBeFocused();
  await expectAccessible(page);
  await choose(
    page,
    await payload("a.pdf", makePdf({ info: "/Title (Livro PDF) /Author (Ana Souza)" })),
    await payload("b.epub", await makeEpub("<dc:title>Livro EPUB</dc:title>")),
    await markdown("Livro Markdown"),
    await payload("d.docx", new Blob(["x"])),
  );
  await expect(dialog(page).getByText("4 arquivos verificados.")).toBeVisible();
  await expect(dialog(page).getByText("Formato não aceito")).toBeVisible();
  await expectAccessible(page);
  await button(page, "Continuar").click();

  // Review the three drafts.
  const title = page.getByRole("textbox", { name: "Título" });
  await expect(title).toHaveValue("Livro PDF");
  await expect(title).toBeFocused();
  await expect(dialog(page)).toContainText("Livro 1 de 3");
  await page.getByRole("textbox", { name: "Ano" }).fill("abc");
  await button(page, "Adicionar livro").click();
  await expect(page.getByText("Use só números")).toBeVisible();
  await page.getByRole("textbox", { name: "Ano" }).fill("2020");

  // Escape closes the term input, not the modal.
  await button(page, "Adicionar área").click();
  await page.keyboard.press("Escape");
  await expect(button(page, "Adicionar área")).toBeFocused();
  await button(page, "Adicionar tópico").click();
  await page.keyboard.type("Grafos");
  await page.keyboard.press("Enter");
  await expect(button(page, "Remover Grafos")).toBeVisible();
  await page.keyboard.type("Redes"); // saved without pressing Enter
  await expectAccessible(page);
  await button(page, "Adicionar livro").click();

  await expect(title).toHaveValue("Livro EPUB");
  await expect(dialog(page)).toContainText("Livro 2 de 3");
  await title.press("Enter");
  await expect(title).toHaveValue("Livro Markdown");
  await button(page, "Adicionar livro").click();
  await expect(dialog(page)).toBeHidden();
  await expect(button(page, "Adicionar")).toBeFocused();

  for (const name of ["Livro PDF", "Livro EPUB", "Livro Markdown"]) {
    await expect(card(page, name)).toBeVisible();
  }
  // The first PDF page was rendered and stored as the cover.
  const cover = card(page, "Livro PDF").locator("img");
  await expect(cover).toBeVisible();
  expect(await cover.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(400);

  await page.reload();
  await expect(card(page, "Livro PDF").locator("img")).toBeVisible();
  for (const query of ["souza", "grafos", "redes", "2020"]) {
    await page.getByRole("searchbox").fill(query);
    await expect(card(page, "Livro EPUB")).toBeHidden();
    await expect(card(page, "Livro PDF")).toBeVisible();
  }
  await page.getByRole("searchbox").fill("");

  await page.getByText("Dev tools").click();
  const download = page.waitForEvent("download");
  await button(page, "Export backup").click();
  const zip = await (await download).path();

  page.once("dialog", (confirm) => void confirm.accept());
  await button(page, "Delete everything").click();
  await expect(page.getByText("Sua biblioteca está vazia")).toBeVisible();

  await page.getByTestId("dev-import").setInputFiles(zip);
  await expect(page.getByText("added 3, merged 0, skipped 0")).toBeVisible();
  await expect(card(page, "Livro PDF").locator("img")).toBeVisible();

  expect(problems).toEqual([]);
  expect(external).toEqual([]);
});

test("keeps unreviewed books, discards with undo, and spots duplicates", async ({ page }) => {
  await page.goto("/");
  await button(page, "Adicionar").click();
  await choose(page, await markdown("Primeiro"), await markdown("Segundo"));
  await expect(dialog(page).getByText("2 arquivos verificados.")).toBeVisible();
  await page.keyboard.press("Escape");

  // Nothing is lost by closing, even after a reload.
  await page.reload();
  const review = button(page, "Revisar 2 livros pendentes");
  await review.click();
  const title = page.getByRole("textbox", { name: "Título" });
  await expect(title).toHaveValue("Primeiro");

  await button(page, "Descartar").click();
  await expect(title).toHaveValue("Segundo");
  await button(page, "Desfazer").click();
  await expect(title).toHaveValue("Primeiro");

  await button(page, "Adicionar livro").click();
  await expect(title).toHaveValue("Segundo");
  await button(page, "Descartar").click();
  await expect(dialog(page)).toBeHidden();
  await button(page, "Desfazer").click();
  await expect(button(page, "Revisar 1 livro pendente")).toBeVisible();

  await button(page, "Adicionar").click();
  await choose(page, await markdown("Primeiro"));
  await expect(dialog(page).getByText("Este arquivo já está na biblioteca.")).toBeVisible();
  await button(page, "Ver na biblioteca").click();
  await expect(dialog(page)).toBeHidden();
});

test("leaves the fields empty when auto-fill is off", async ({ page }) => {
  await page.goto("/");
  await button(page, "Adicionar").click();
  await page.getByRole("checkbox", { name: /Preencher os dados/ }).uncheck();
  await choose(page, await payload("sem-dados.pdf", makePdf({ info: "/Title (Outro)" })));
  await button(page, "Continuar").click();
  await expect(page.getByRole("textbox", { name: "Título" })).toHaveValue("sem-dados");
  await expect(dialog(page).getByText("Preenchido automaticamente")).toBeHidden();
});

test("adds a pasted file and a dropped file", async ({ page }) => {
  await page.goto("/");
  await button(page, "Adicionar").click();
  for (const [type, name] of [["paste", "Colado"], ["drop", "Solto"]]) {
    await page.getByText("Arraste ou cole seu arquivo aqui").evaluate(
      (target, [type, name]) => {
        const data = new DataTransfer();
        data.items.add(new File([`# ${name}`], `${name}.md`));
        const init = { bubbles: true, cancelable: true };
        const event =
          type === "paste"
            ? new ClipboardEvent("paste", init)
            : new DragEvent("drop", { ...init, dataTransfer: data });
        // Firefox gives a script-made paste event no files, so attach them.
        if (type === "paste") Object.defineProperty(event, "clipboardData", { value: data });
        target.dispatchEvent(event);
      },
      [type, name],
    );
    await expect(dialog(page).getByText(`${name}.md`)).toBeVisible();
  }
});
