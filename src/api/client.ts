import type { ChatMessage, Track } from "../data/types"

export type ServerTrack = {
  id: string
  title: string
  artist: string
  album?: string
  duration: number
  cover?: string
  source: "ncm"
  url: string
}

export type DJTurn = {
  id: string
  say: string
  ttsUrl: string
  ttsSilent: boolean
  source?: "user" | "scheduler" | "manual" | "next"
  reason?: string
  segue?: string
  tracks: ServerTrack[]
  ts: number
}

export type ServerMessage = {
  id: string
  ts: number
  kind: "dj" | "user" | "system"
  speaker: string | null
  text: string
  meta: { tracks?: ServerTrack[]; ttsUrl?: string; reason?: string; segue?: string } | null
}

const BASE = "" // same-origin (Vite proxies /api and /tts to :8080)

async function requestJson<T>(p: string, init?: RequestInit, timeoutMs = 120_000): Promise<T> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs)
  let r: Response
  try {
    r = await fetch(BASE + p, { ...init, signal: ctrl.signal })
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new Error(`timeout ${p}`)
    throw err
  } finally {
    window.clearTimeout(timer)
  }
  if (!r.ok) throw new Error(`${r.status} ${p}`)
  return r.json() as Promise<T>
}

async function jget<T>(p: string): Promise<T> {
  return requestJson<T>(p)
}
async function jpost<T>(p: string, body: unknown): Promise<T> {
  return requestJson<T>(p, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

export type TasteProposal = {
  summary: string
  taste_md?: string
  playlists_json?: unknown
  detected_tracks: { title: string; artist: string }[]
}

export const api = {
  health: () => jget<{ ok: boolean; claude: boolean; calendar: boolean; naim: boolean; weather: boolean; fish: boolean; mimo: boolean; ttsProvider: "mimo" | "fish" | "silent"; activeProfile: string; moodProbe: unknown }>("/api/health"),
  messages: () => jget<{ messages: ServerMessage[] }>("/api/messages"),
  taste: () => jget<{ files: { name: string; body: string }[]; profile: string }>("/api/taste"),
  planToday: () => jget<{ date: string; plan: unknown }>("/api/plan/today"),
  liked: () => jget<{ tracks: { id: string; title: string; artist: string; ts: number }[] }>("/api/liked"),
  next: () => jget<{ hint: string | null; plays: { track_id: string; title: string; artist: string; duration_s: number | null }[] }>("/api/next"),
  chat: (text: string) => jpost<DJTurn>("/api/chat", { text }),
  skip: (trackId: string) => jpost<{ ok: true }>("/api/skip", { trackId }),
  like: (trackId: string, liked: boolean) => jpost<{ ok: true }>("/api/like", { trackId, liked }),
  trigger: (reason: string, source: "manual" | "next" = "manual") =>
    jpost<{ ok: true }>("/api/trigger", { reason, source }),
  analyzeTaste: (paste: string) =>
    jpost<{ proposal?: TasteProposal; error?: string }>("/api/taste/analyze", { paste }),
  applyTaste: (body: { taste_md?: string; playlists_json?: unknown }) =>
    jpost<{ ok: boolean; written?: string[]; error?: string }>("/api/taste/apply", body),
  ncmStatus: () =>
    jget<{ loggedIn: boolean; userId?: number; nickname?: string; vip?: boolean; vipType?: number }>("/api/ncm/status"),
  ncmQrCreate: () => jpost<{ key: string; qrimg: string }>("/api/ncm/login/qr/create", {}),
  ncmQrCheck: (key: string) =>
    jpost<{ status: "waiting" | "scanned" | "success" | "expired" | "error"; cookie?: string; message?: string }>(
      "/api/ncm/login/qr/check",
      { key },
    ),
  ncmLogout: () => jpost<{ ok: boolean }>("/api/ncm/logout", {}),
}

// --- Word-token timing helpers ----------------------------------------------

export function wordsFromText(
  text: string,
  perWordMs = 220,
): Array<{ text: string; start: number; end: number }> {
  const tokens = text.split(/(\s+)/)
  let cursor = 0
  const out: { text: string; start: number; end: number }[] = []
  for (const t of tokens) {
    if (!t.trim()) {
      out.push({ text: t, start: cursor, end: cursor })
      continue
    }
    // Chinese characters get a shorter slice each since they're CJK glyphs
    const cjkCount = (t.match(/[　-鿿]/g) || []).length
    const otherCount = t.length - cjkCount
    const ms = Math.max(perWordMs, cjkCount * 180 + otherCount * 60 + 110)
    out.push({ text: t, start: cursor, end: cursor + ms })
    cursor += ms
  }
  return out
}

export function serverTrackToUI(t: ServerTrack): Track & { url: string; cover?: string } {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    duration: t.duration,
    cover: t.cover,
    url: t.url,
  } as Track & { url: string; cover?: string }
}

export function serverMessagesToUI(msgs: ServerMessage[]): ChatMessage[] {
  return msgs.map(m => {
    if (m.kind === "system") {
      return { id: m.id, kind: "system", text: m.text }
    }
    const hh = new Date(m.ts)
    const stamp = `${String(hh.getHours()).padStart(2, "0")}:${String(hh.getMinutes()).padStart(2, "0")}`
    if (m.kind === "user") {
      return { id: m.id, kind: "user", speaker: m.speaker ?? "you", timestamp: stamp, text: m.text }
    }
    // dj
    const words = wordsFromText(m.text)
    const tracks = m.meta?.tracks?.map(serverTrackToUI) ?? []
    return {
      id: m.id,
      kind: "dj",
      speaker: "Claudio",
      timestamp: stamp,
      text: m.text,
      words,
      duration: words.reduce((acc, w) => Math.max(acc, w.end), 0),
      recommends: tracks,
      hasReplay: true,
      ttsUrl: m.meta?.ttsUrl,
    } as ChatMessage & { ttsUrl?: string }
  })
}
