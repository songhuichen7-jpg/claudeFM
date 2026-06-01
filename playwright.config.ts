import { defineConfig, devices } from "@playwright/test"

// E2E for the real app (web :5173 proxying to server :8080). Verifies the
// PRD §3 core journeys against the live backend (Claude CLI + NCM + TTS),
// asserting DOM/state rather than actual audio output.
export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: /desktop\.spec\.ts/,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:18734",
    headless: true,
    viewport: { width: 420, height: 900 },
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "CLAUDIO_E2E_STUB=1 PORT=18780 SERVER_PORT=18780 VITE_PORT=18734 pnpm dev",
    url: "http://127.0.0.1:18734",
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
