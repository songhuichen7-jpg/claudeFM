import Fastify from "fastify"
import fastifyWebsocket from "@fastify/websocket"
import fastifyStatic from "@fastify/static"
import fastifyCors from "@fastify/cors"
import { existsSync, statSync, mkdirSync, cpSync } from "node:fs"
import { writeFile, readFile, readdir } from "node:fs/promises"
import { dirname, join, resolve, basename } from "node:path"
import { fileURLToPath } from "node:url"

import { Hub } from "./hub.js"
import { runUserTurn } from "./router.js"
import { startScheduler, manualTrigger, lastMoodReport } from "./scheduler.js"
import {
  Messages,
  Plays,
  Plan,
  Prefs,
  Profiles,
  activeProfile,
  setActiveProfile,
} from "./state.js"
import { claudeAvailable } from "./claude.js"
import { CACHE_DIR as TTS_DIR, ttsProvider } from "./tts.js"
import { getWeather } from "./weather.js"
import { calendarEnabled } from "./feishu.js"
import { naimEnabled } from "./naim.js"
import { activeCorpusDir } from "./context.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")
const PORT = Number(process.env.PORT ?? 8080)
const DIST = join(ROOT, "dist")

const fastify = Fastify({ logger: true })

await fastify.register(fastifyCors, { origin: true })
await fastify.register(fastifyWebsocket)
await fastify.register(fastifyStatic, {
  root: TTS_DIR,
  prefix: "/tts/",
  decorateReply: false,
})

// Serve the built PWA shell when available; in dev the Vite server runs on
// :5173 and proxies API calls here.
if (existsSync(DIST) && statSync(DIST).isDirectory()) {
  await fastify.register(fastifyStatic, {
    root: DIST,
    prefix: "/",
    wildcard: false,
    decorateReply: false,
  })
}

const hub = new Hub()

fastify.get("/api/health", async () => ({
  ok: true,
  ts: Date.now(),
  claude: await claudeAvailable(),
  calendar: calendarEnabled(),
  naim: naimEnabled(),
  weather: !!(await getWeather()),
  fish: !!process.env.FISH_API_KEY,
  mimo: !!process.env.MIMO_API_KEY,
  ttsProvider: ttsProvider(),
  activeProfile: activeProfile(),
  moodProbe: lastMoodReport(),
}))

fastify.post("/api/chat", async (req, reply) => {
  const body = (req.body ?? {}) as { text?: string }
  const text = String(body.text ?? "").trim()
  if (!text) {
    reply.code(400)
    return { error: "text required" }
  }
  const turn = await runUserTurn(text)
  // Broadcast to all WS clients so the chat stream shows up everywhere
  hub.broadcast({ type: "dj", turn })
  return turn
})

fastify.get("/api/now", async () => {
  const lastDj = Messages.recent(20).find(m => m.kind === "dj")
  const lastPlay = Plays.recent(1)[0]
  return {
    last: lastDj
      ? {
          id: lastDj.id,
          text: lastDj.text,
          meta: lastDj.meta_json ? JSON.parse(lastDj.meta_json) : null,
          ts: lastDj.ts,
        }
      : null,
    nowPlaying: lastPlay ?? null,
  }
})

fastify.get("/api/next", async () => {
  // Simple "what would you queue next" — peek scheduled or use last_segue hint
  const segue = Prefs.get("last_segue")
  return { hint: segue, plays: Plays.recent(5) }
})

fastify.get("/api/taste", async () => {
  const dir = activeCorpusDir()
  let names: string[] = []
  try {
    names = await readdir(dir)
  } catch {
    return { files: [], profile: activeProfile() }
  }
  const files: { name: string; body: string }[] = []
  for (const n of names.sort()) {
    if (n.startsWith(".")) continue
    files.push({ name: n, body: await readFile(join(dir, n), "utf-8") })
  }
  return { files, profile: activeProfile() }
})

const TASTE_NAME_OK = /^[A-Za-z0-9_\-]+\.(md|json)$/

fastify.put<{ Params: { name: string }; Body: { body?: string } }>(
  "/api/taste/:name",
  async (req, reply) => {
    const name = basename(req.params.name)
    if (!TASTE_NAME_OK.test(name)) {
      reply.code(400)
      return { error: "name must match /^[A-Za-z0-9_-]+\\.(md|json)$/" }
    }
    const body = String(req.body?.body ?? "")
    if (body.length > 200_000) {
      reply.code(413)
      return { error: "body too large (>200KB)" }
    }
    if (name.endsWith(".json")) {
      try { JSON.parse(body) } catch (e) { reply.code(400); return { error: `invalid JSON: ${(e as Error).message}` } }
    }
    const dir = activeCorpusDir()
    mkdirSync(dir, { recursive: true })
    await writeFile(join(dir, name), body, "utf-8")
    return { ok: true, name, bytes: body.length }
  },
)

// ---- profiles ------------------------------------------------------------

fastify.get("/api/profiles", async () => ({
  active: activeProfile(),
  profiles: Profiles.list(),
}))

fastify.post<{ Body: { id?: string; name?: string; avatar?: string } }>("/api/profiles", async (req, reply) => {
  const id = String(req.body?.id ?? "").trim().toLowerCase()
  const name = String(req.body?.name ?? "").trim()
  if (!/^[a-z0-9_\-]{1,32}$/.test(id) || !name) {
    reply.code(400)
    return { error: "id must be [a-z0-9_-]{1,32} and name non-empty" }
  }
  if (Profiles.get(id)) {
    reply.code(409)
    return { error: "profile id already exists" }
  }
  const corpus_dir = `user.${id}`
  const dest = join(ROOT, corpus_dir)
  if (!existsSync(dest)) {
    // Seed from the default user/ directory so the new profile boots
    // with a sane starting taste corpus the user can then customise.
    cpSync(join(ROOT, "user"), dest, { recursive: true })
  }
  const profile = Profiles.create({
    id,
    name,
    avatar: req.body?.avatar ?? null,
    corpus_dir,
  })
  return { profile }
})

fastify.post<{ Body: { id?: string } }>("/api/profile/switch", async (req, reply) => {
  const id = String(req.body?.id ?? "")
  if (!Profiles.get(id)) {
    reply.code(404)
    return { error: "no such profile" }
  }
  setActiveProfile(id)
  return { ok: true, active: activeProfile() }
})

fastify.delete<{ Params: { id: string } }>("/api/profiles/:id", async (req, reply) => {
  const id = String(req.params.id)
  if (id === "default") {
    reply.code(400)
    return { error: "cannot delete the default profile" }
  }
  if (!Profiles.get(id)) {
    reply.code(404)
    return { error: "no such profile" }
  }
  Profiles.remove(id)
  if (activeProfile() === id) setActiveProfile("default")
  return { ok: true }
})

fastify.get("/api/mood", async () => ({ last: lastMoodReport() }))

// ---- NCM 账号登录 (扫码) ---------------------------------------------------

fastify.get("/api/ncm/status", async () => {
  const { whoami } = await import("./ncm-auth.js")
  const w = await whoami()
  return w ?? { loggedIn: false }
})

fastify.post("/api/ncm/login/qr/create", async (_req, reply) => {
  const { qrCreate } = await import("./ncm-auth.js")
  const r = await qrCreate()
  if (!r) {
    reply.code(503)
    return { error: "NCM qr_create failed" }
  }
  return r
})

fastify.post<{ Body: { key?: string } }>("/api/ncm/login/qr/check", async (req, reply) => {
  const key = String(req.body?.key ?? "")
  if (!key) {
    reply.code(400)
    return { error: "key required" }
  }
  const { qrCheck } = await import("./ncm-auth.js")
  const r = await qrCheck(key)
  return r
})

fastify.post("/api/ncm/logout", async () => {
  const { clearCookie } = await import("./ncm-auth.js")
  clearCookie()
  return { ok: true }
})

fastify.get("/api/plan/today", async () => {
  const today = new Date()
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  return { date: key, plan: Plan.get(key) }
})

fastify.get("/api/messages", async () => {
  return { messages: Messages.all().map(m => ({
    id: m.id,
    ts: m.ts,
    kind: m.kind,
    speaker: m.speaker,
    text: m.text,
    meta: m.meta_json ? JSON.parse(m.meta_json) : null,
  })) }
})

// Distinct liked tracks for the active profile — backs the Library view.
fastify.get("/api/liked", async () => ({ tracks: Plays.likedTracks() }))

fastify.post("/api/skip", async (req) => {
  const body = (req.body ?? {}) as { trackId?: string }
  if (body.trackId) Plays.markSkipped(body.trackId)
  hub.broadcast({ type: "skip", trackId: body.trackId ?? "" })
  return { ok: true }
})

fastify.post("/api/like", async (req) => {
  const body = (req.body ?? {}) as { trackId?: string; liked?: boolean }
  if (body.trackId) Plays.markLiked(body.trackId, !!body.liked)
  hub.broadcast({ type: "like", trackId: body.trackId ?? "", liked: !!body.liked })
  return { ok: true }
})

// ---- taste import / analysis ---------------------------------------------

fastify.post<{ Body: { paste?: string } }>("/api/taste/analyze", async (req, reply) => {
  const paste = String(req.body?.paste ?? "").trim()
  if (paste.length < 4) {
    reply.code(400)
    return { error: "paste too short (need at least 4 chars)" }
  }
  if (paste.length > 60_000) {
    reply.code(413)
    return { error: "paste too large (>60KB)" }
  }
  const { analyzePasteRaw } = await import("./taste-analyze.js")
  try {
    const proposal = await analyzePasteRaw(paste)
    return { proposal }
  } catch (err) {
    reply.code(500)
    return { error: (err as Error).message }
  }
})

fastify.post<{ Body: { paste?: string } }>("/api/taste/rebuild", async (req, reply) => {
  const paste = String(req.body?.paste ?? "").trim()
  if (paste.length < 4) {
    reply.code(400)
    return { error: "paste too short" }
  }
  if (paste.length > 200_000) {
    reply.code(413)
    return { error: "paste too large (>200KB)" }
  }
  const { rebuildPasteRaw } = await import("./taste-analyze.js")
  try {
    const proposal = await rebuildPasteRaw(paste)
    return { proposal }
  } catch (err) {
    reply.code(500)
    return { error: (err as Error).message }
  }
})

fastify.post<{ Body: { taste_md?: string; playlists_json?: unknown } }>(
  "/api/taste/apply",
  async (req) => {
    const dir = activeCorpusDir()
    mkdirSync(dir, { recursive: true })
    const written: string[] = []
    if (typeof req.body?.taste_md === "string" && req.body.taste_md.length > 0) {
      await writeFile(join(dir, "taste.md"), req.body.taste_md, "utf-8")
      written.push("taste.md")
    }
    if (req.body?.playlists_json !== undefined) {
      const body =
        typeof req.body.playlists_json === "string"
          ? req.body.playlists_json
          : JSON.stringify(req.body.playlists_json, null, 2)
      // Validate JSON
      try { JSON.parse(body) } catch (e) {
        return { ok: false, error: `playlists_json invalid: ${(e as Error).message}` }
      }
      await writeFile(join(dir, "playlists.json"), body, "utf-8")
      written.push("playlists.json")
    }
    return { ok: true, written }
  },
)

// Silent NCM resolution — used by the PWA's prefetch path. Does not touch
// state.db, does not broadcast, does not run claude.
fastify.post<{ Body: { query?: string } }>("/api/resolve", async (req, reply) => {
  const query = String(req.body?.query ?? "").trim()
  if (!query) {
    reply.code(400)
    return { error: "query required" }
  }
  const { resolveTrack, songUrl } = await import("./ncm.js")
  const t = await resolveTrack({ title: query })
  if (!t) return { track: null }
  const url = (await songUrl(t.id)) ?? null
  return { track: url ? { ...t, url } : null }
})

fastify.post("/api/trigger", async (req) => {
  const body = (req.body ?? {}) as { reason?: string; source?: "manual" | "next" }
  await manualTrigger(hub, body.reason ?? "手动触发", body.source ?? "manual")
  return { ok: true }
})

fastify.register(async function (instance) {
  instance.get("/stream", { websocket: true }, (socket /* WebSocket */) => {
    hub.add(socket as any)
    socket.on("close", () => hub.remove(socket as any))
    socket.on("message", (raw: any) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg?.type === "ping") {
          ;(socket as any).send(JSON.stringify({ type: "pong", ts: Date.now() }))
        }
      } catch {}
    })
  })
})

startScheduler(hub)

try {
  await fastify.listen({ host: "0.0.0.0", port: PORT })
  console.log(`Claudio FM server up at http://localhost:${PORT}`)
} catch (err) {
  console.error(err)
  process.exit(1)
}
