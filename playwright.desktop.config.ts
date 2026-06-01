import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /desktop\.spec\.ts/,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    headless: true,
    trace: "on-first-retry",
  },
})
