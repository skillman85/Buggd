import { defineConfig } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  // CI runners share CPU with the real scanner Chromium process. Avoid competing owner journeys.
  workers: process.env.CI ? 1 : 2,
  use: { baseURL: "http://127.0.0.1:4173", browserName: "chromium" },
  webServer: {
    command: "node lib/cli/index.js --no-open --port 4173",
    env: { BUGGD_DATA_DIR: join(tmpdir(), `buggd-e2e-${process.pid}`) },
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
