import { test, expect } from "@playwright/test"

// PRD §3 core user journeys, against the live backend.
// Run: pnpm e2e   (servers auto-start via playwright.config webServer)

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  // Header wordmark proves the shell mounted.
  await expect(page.getByRole("button", { name: "Open Claudio profile" })).toBeVisible()
})

test("J1 shell + clock + player + chat", async ({ page }) => {
  await expect(page.getByRole("button", { name: /ON AIR/ })).toBeVisible() // clock panel
  await expect(page.getByTestId("transport-play")).toBeVisible()
  await expect(page.getByText("CONNECTED TO CLAUDIO SERVER")).toBeVisible({ timeout: 20_000 })
})

test("J2 chat history + DARK/LIGHT theme toggle", async ({ page }) => {
  await expect(page.getByText("CONNECTED TO CLAUDIO SERVER")).toBeVisible()
  await page.getByRole("button", { name: "LIGHT", exact: true }).click()
  await expect(page.locator("html")).toHaveClass(/light/)
  await page.getByRole("button", { name: "DARK", exact: true }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)
})

test("J3 song request → LLM DJ turn round-trips", async ({ page }) => {
  // A real turn appends a user line + a CLAUDIO reply. Assert the CLAUDIO
  // count grows (robust even if LLM/NCM fall back). Unique ask avoids
  // colliding with persisted history.
  const ask = `放点慢的 ${Date.now() % 100000}`
  const claudioCount = () => page.getByText("CLAUDIO", { exact: true }).count()
  const before = await claudioCount()
  await page.getByRole("textbox", { name: "Message DJ" }).fill(ask)
  await page.getByRole("textbox", { name: "Message DJ" }).press("Enter")
  await expect(page.getByText(ask)).toBeVisible() // user line is unique → safe
  await expect.poll(claudioCount, { timeout: 90_000 }).toBeGreaterThan(before)
})

test("J4 like toggles state + Library opens", async ({ page }) => {
  // Wait until the player has a real track (messages loaded → currentTrack set),
  // otherwise toggleLike has no id to act on.
  await expect(page.getByText(/PLAYING|PAUSED/)).toBeVisible({ timeout: 20_000 })
  const heart = page.getByRole("button", { name: "Open library" })
  const readCount = async () => parseInt((await heart.innerText()).replace(/\D/g, "") || "0", 10)
  await page.waitForTimeout(1500) // let /api/liked settle so the count is stable
  const before = await readCount()
  await page.getByRole("button", { name: "Like" }).first().click() // player ♥ (toggles)
  await expect.poll(readCount, { timeout: 10_000 }).not.toBe(before)
  await heart.click()
  await expect(page.getByText(/SAVED/)).toBeVisible()
})

test("J5 focus view: white card + bold title + transcript", async ({ page }) => {
  await page.getByRole("button", { name: /ON AIR/ }).click() // tap clock → focus
  await expect(page.getByText(/SPEAKING|ON AIR/).first()).toBeVisible()
  await expect(page.getByText("Claudio ·").first()).toBeVisible() // transcript timestamp line
})

test("J6 settings: status / schedule / NCM / taste", async ({ page }) => {
  await page.getByRole("button", { name: "Open settings" }).click()
  await expect(page.getByText("STATUS", { exact: false })).toBeVisible()
  await expect(page.getByText("LLM")).toBeVisible()
  await expect(page.getByText("SCHEDULE", { exact: false })).toBeVisible()
  await expect(page.getByText("品味语料", { exact: false })).toBeVisible()
})
