import { defineConfig } from "@playwright/test";

const remote = process.env.BASE_URL?.trim();
const baseURL = (remote || "http://127.0.0.1:4174/").replace(/\/?$/, "/");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 12_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    browserName: "chromium",
    screenshot: "only-on-failure",
    trace: process.env.CI ? "on-first-retry" : "off",
  },
  webServer: remote
    ? undefined
    : {
        command: "node tests/static-server.mjs",
        url: "http://127.0.0.1:4174/",
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});
