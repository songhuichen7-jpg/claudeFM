import { test, expect, chromium, type Browser, type Page } from "@playwright/test"
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import { mkdtemp } from "node:fs/promises"
import { createRequire } from "node:module"
import net from "node:net"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "../..")
const require = createRequire(import.meta.url)

type DesktopFixture = {
  browser: Browser
  child: ChildProcessWithoutNullStreams
  page: Page
  logs: () => string
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      server.close(() => resolve(typeof address === "object" && address ? address.port : 0))
    })
  })
}

async function waitForHttp(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return
      lastError = new Error(`HTTP ${res.status}`)
    } catch (err) {
      lastError = err
    }
    await delay(250)
  }
  throw lastError instanceof Error ? lastError : new Error(`Timed out waiting for ${url}`)
}

async function waitForWindowPage(browser: Browser, appPort: number, timeoutMs = 30_000): Promise<Page> {
  const deadline = Date.now() + timeoutMs
  const expected = `http://127.0.0.1:${appPort}/`
  while (Date.now() < deadline) {
    for (const context of browser.contexts()) {
      const page = context.pages().find(p => p.url().startsWith(expected))
      if (page) return page
    }
    await delay(250)
  }
  throw new Error(`Timed out waiting for Electron window at ${expected}`)
}

async function launchDesktop(): Promise<DesktopFixture> {
  const userData = await mkdtemp(path.join(tmpdir(), "claudio-fm-e2e-"))
  const packagedExecutable = process.env.CLAUDIO_DESKTOP_EXECUTABLE
  const executablePath = packagedExecutable || require("electron")
  const appPort = Number(process.env.CLAUDIO_DESKTOP_PORT || await findFreePort())
  const debugPort = await findFreePort()
  let logs = ""

  const child = spawn(executablePath, [
    `--remote-debugging-port=${debugPort}`,
    ...(packagedExecutable ? [] : [repoRoot]),
  ], {
    cwd: repoRoot,
    detached: true,
    env: {
      ...process.env,
      CLAUDIO_DESKTOP_PORT: String(appPort),
      CLAUDIO_ELECTRON_USER_DATA: userData,
      CLAUDIO_DATA_ROOT: path.join(userData, "data"),
    },
  })
  child.stdout.on("data", chunk => { logs += chunk.toString() })
  child.stderr.on("data", chunk => { logs += chunk.toString() })

  await waitForHttp(`http://127.0.0.1:${appPort}/api/health`)
  await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`)

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`)
  const page = await waitForWindowPage(browser, appPort)
  return { browser, child, page, logs: () => logs }
}

function killDesktop(child: ChildProcessWithoutNullStreams, signal: NodeJS.Signals = "SIGTERM") {
  if (!child.pid) return
  try {
    process.kill(-child.pid, signal)
  } catch {
    child.kill(signal)
  }
}

test("desktop app boots the local server and completes core UI flows", async () => {
  const desktop = await launchDesktop()
  const { page } = desktop

  try {
    await expect(page.getByRole("button", { name: "Open Claudio profile" })).toBeVisible()
    await expect(page.getByRole("button", { name: /ON AIR/ })).toBeVisible()
    await expect(page.getByText("CONNECTED", { exact: false }).last()).toBeVisible({ timeout: 25_000 })

    await page.getByRole("button", { name: "LIGHT" }).click()
    await expect(page.locator("html")).toHaveClass(/light/)
    await page.getByRole("button", { name: "DARK" }).click()
    await expect(page.locator("html")).toHaveClass(/dark/)

    await page.getByRole("button", { name: "Open settings" }).click()
    await expect(page.getByText("STATUS", { exact: false })).toBeVisible()
    await expect(page.getByText("LLM")).toBeVisible()
  } finally {
    killDesktop(desktop.child)
    await Promise.race([
      desktop.browser.close().catch(() => undefined),
      delay(1_000),
    ])
    await delay(250)
    killDesktop(desktop.child, "SIGKILL")
  }
})
