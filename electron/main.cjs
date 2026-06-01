const { app, BrowserWindow, shell } = require("electron")
const { spawn } = require("node:child_process")
const net = require("node:net")
const path = require("node:path")

let mainWindow
let serverProcess
let isQuitting = false

console.log("[desktop] main starting")

function failStartup(err) {
  console.error("[desktop] startup failed", err)
  app.exit(1)
}

process.on("uncaughtException", failStartup)
process.on("unhandledRejection", failStartup)
app.on("will-quit", () => console.log("[desktop] app will quit"))

if (process.env.CLAUDIO_ELECTRON_USER_DATA) {
  app.setPath("userData", process.env.CLAUDIO_ELECTRON_USER_DATA)
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      server.close(() => resolve(address.port))
    })
  })
}

async function waitForServer(port) {
  const url = `http://127.0.0.1:${port}/api/health`
  const deadline = Date.now() + 30_000
  let lastError
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return
      lastError = new Error(`HTTP ${res.status}`)
    } catch (err) {
      lastError = err
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw lastError ?? new Error("Server did not start")
}

async function startLocalServer() {
  const root = path.resolve(__dirname, "..")
  const port = Number(process.env.CLAUDIO_DESKTOP_PORT || await findFreePort())
  const dataRoot = process.env.CLAUDIO_DATA_ROOT || path.join(app.getPath("userData"), "data")

  const serverEntry = path.join(root, "dist-server", "server", "index.js")
  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: app.isPackaged ? path.dirname(process.execPath) : root,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(port),
      HOST: "127.0.0.1",
      CLAUDIO_APP_ROOT: root,
      CLAUDIO_DATA_ROOT: dataRoot,
    },
    stdio: ["ignore", "pipe", "pipe"],
  })

  serverProcess.stdout.on("data", chunk => process.stdout.write(`[server] ${chunk}`))
  serverProcess.stderr.on("data", chunk => process.stderr.write(`[server] ${chunk}`))
  serverProcess.once("exit", (code, signal) => {
    serverProcess = undefined
    if (!isQuitting) {
      failStartup(new Error(`Local server exited early (${signal ?? code})`))
    }
  })

  await waitForServer(port)
  return port
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 860,
    minWidth: 390,
    minHeight: 720,
    title: "Claudio FM",
    backgroundColor: "#0c1117",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.once("ready-to-show", () => mainWindow.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: "deny" }
  })
  mainWindow.loadURL(`http://127.0.0.1:${port}/`)
}

async function boot() {
  console.log("[desktop] app ready")
  console.log("[desktop] starting local server")
  const port = await startLocalServer()
  console.log(`[desktop] local server ready on ${port}`)
  createWindow(port)

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port)
  })
}

app.on("ready", () => {
  boot().catch(failStartup)
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

app.on("before-quit", () => {
  isQuitting = true
  if (serverProcess && !serverProcess.killed) serverProcess.kill()
})
