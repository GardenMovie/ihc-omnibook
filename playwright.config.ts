import { defineConfig, devices } from "@playwright/test";

const PORT = 3217;

export default defineConfig({
  testDir: "tests/e2e",
  // One worker: the tests share one dev server.
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Not a first visit, so the walkthrough offer does not cover the page.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${PORT}`,
          localStorage: [{ name: "omnibook-settings", value: '{"tourSeen":true}' }],
        },
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Set CHROMIUM_PATH to use an installed Chromium instead of Playwright's.
        launchOptions: { executablePath: process.env.CHROMIUM_PATH },
      },
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
  },
});
