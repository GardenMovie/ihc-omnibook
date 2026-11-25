/** The storage and extraction layers in real browsers (via the dev tools). */
import { expect, test, type Page } from "@playwright/test";
import { makeEpub, makePdf } from "../unit/fixtures";

const payload = async (name: string, blob: Blob) => ({
  name,
  mimeType: blob.type || "application/octet-stream",
  buffer: Buffer.from(await blob.arrayBuffer()),
});

const card = (page: Page, title: string) =>
  page.getByRole("button", { name: new RegExp(`Selecionar.*${title}`) });

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

  await page.getByTestId("dev-add").setInputFiles([
    await payload("a.pdf", makePdf({ info: "/Title (Livro PDF) /Author (Ana Souza)" })),
    await payload("b.epub", await makeEpub("<dc:title>Livro EPUB</dc:title>")),
    await payload("c.md", new Blob(["# Livro Markdown"])),
  ]);
  for (const title of ["Livro PDF", "Livro EPUB", "Livro Markdown"]) {
    await expect(card(page, title)).toBeVisible();
  }
  // The first PDF page was rendered and stored as the cover.
  const cover = card(page, "Livro PDF").locator("img");
  await expect(cover).toBeVisible();
  expect(await cover.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(400);

  await page.reload();
  await expect(card(page, "Livro PDF").locator("img")).toBeVisible();
  await page.getByRole("searchbox").fill("souza");
  await expect(card(page, "Livro EPUB")).toBeHidden();
  await expect(card(page, "Livro PDF")).toBeVisible();
  await page.getByRole("searchbox").fill("");

  await page.getByText("Dev tools").click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const zip = await (await download).path();

  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Delete everything" }).click();
  await expect(page.getByText("Sua biblioteca está vazia")).toBeVisible();

  await page.getByTestId("dev-import").setInputFiles(zip);
  await expect(page.getByText("added 3, merged 0, skipped 0")).toBeVisible();
  await expect(card(page, "Livro PDF").locator("img")).toBeVisible();

  expect(problems).toEqual([]);
  expect(external).toEqual([]);
});
