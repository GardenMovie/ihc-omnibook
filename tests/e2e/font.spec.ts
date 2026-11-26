/** The font for dyslexic readers, chosen in the settings. */
import { expect, test } from "@playwright/test";

test("switches to the dyslexia font and keeps it after a reload", async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("omnibook-settings")) {
      localStorage.setItem("omnibook-settings", '{"tourSeen":true}');
    }
  });
  await page.goto("/");
  const font = () => page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(await font()).not.toContain("OpenDyslexic");

  await page.getByRole("button", { name: /Configurações/ }).click();
  await page.getByText("Para dislexia").click();
  await expect.poll(font).toContain("OpenDyslexic");

  await page.reload();
  await expect.poll(font).toContain("OpenDyslexic");
  // The font file is really there.
  await expect
    .poll(() => page.evaluate(async () => (await document.fonts.load("1em OpenDyslexic")).length))
    .toBeGreaterThan(0);
});
