import { createHash } from "node:crypto"
import { existsSync, mkdirSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { preprocessForTts } from "./tts-preprocess.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
export const CACHE_DIR = resolve(__dirname, "..", "cache", "tts")
mkdirSync(CACHE_DIR, { recursive: true })

// --- providers --------------------------------------------------------------

const MIMO_KEY = process.env.MIMO_API_KEY
const MIMO_VOICE = process.env.MIMO_VOICE ?? "苏打" // male Chinese — fits Claudio's late-night DJ
const MIMO_MODEL = process.env.MIMO_MODEL ?? "mimo-v2.5-tts"
const MIMO_BASE = process.env.MIMO_BASE_URL ?? "https://api.xiaomimimo.com/v1"

const FISH_KEY = process.env.FISH_API_KEY
const FISH_VOICE = process.env.FISH_VOICE_ID
const FISH_MODEL = process.env.FISH_MODEL ?? "s1"
const FISH_TEMP = Number(process.env.FISH_TEMP ?? 0.8)
const FISH_TOP_P = Number(process.env.FISH_TOP_P ?? 0.8)
const FISH_CHUNK_LEN = Number(process.env.FISH_CHUNK_LEN ?? 120)
const FISH_SPEED = Number(process.env.FISH_SPEED ?? 0.93)

const DJ_STYLE_INSTRUCTION =
  process.env.MIMO_STYLE ??
  "用自然、放松的语速念。中文按普通中文发音。英文单词、英文歌名、英文艺人名都按英文自然连读发音（不要逐个字母拼）。"

/**
 * Normalise the say text before sending to MiMo TTS:
 * - ALL-CAPS English tokens of 3+ letters → TitleCase (避免被当成首字母缩写)
 * - 多余空白合并
 */
function normaliseForTts(text: string): string {
  return text
    // ALL CAPS 单词 (3+ 字母) → TitleCase；保留 II / III / IV 等罗马数字与 OK / DJ / FM 等熟知缩写
    .replace(/\b[A-Z]{3,}\b/g, (m) => {
      const keep = new Set(["III", "VIII", "XII", "USA", "UK", "DJ", "FM", "OK", "EDM"])
      if (keep.has(m)) return m
      return m[0] + m.slice(1).toLowerCase()
    })
    .replace(/\s+/g, " ")
    .trim()
}

export type TtsResult = {
  hash: string
  url: string // public URL the PWA can play
  file: string
  cached: boolean
  bytes: number
  silent: boolean // true if we couldn't synthesize and wrote a placeholder
  provider: "mimo" | "fish" | "silent"
}

export async function synthesize(text: string): Promise<TtsResult> {
  const cleaned = text.trim()
  const provider: "mimo" | "fish" | "silent" = MIMO_KEY ? "mimo" : FISH_KEY ? "fish" : "silent"
  const ext = provider === "silent" ? "mp3" : provider === "mimo" ? "wav" : "mp3"
  const speechText =
    provider === "mimo" ? normaliseForTts(cleaned)
    : provider === "fish" ? preprocessForTts(cleaned, "natural")
    : cleaned

  // Cache key includes provider-specific tuning so changing temperature /
  // top_p / speed / model in .env invalidates old files automatically.
  const fishKnobs = provider === "fish"
    ? `${FISH_MODEL}::${FISH_TEMP}::${FISH_TOP_P}::${FISH_CHUNK_LEN}::${FISH_SPEED}`
    : ""
  const hash = createHash("sha256")
    .update(`${provider}::${MIMO_MODEL}::${MIMO_VOICE}::${FISH_VOICE ?? ""}::${fishKnobs}::${DJ_STYLE_INSTRUCTION}::${speechText}`)
    .digest("hex")
    .slice(0, 16)
  const file = join(CACHE_DIR, `${hash}.${ext}`)
  const url = `/tts/${hash}.${ext}`

  if (existsSync(file)) {
    return { hash, url, file, cached: true, bytes: 0, silent: false, provider }
  }

  if (provider === "mimo") {
    const result = await synthMimo(speechText, file)
    if (result) {
      return { hash, url, file, cached: false, bytes: result.bytes, silent: false, provider }
    }
    // mimo failed → write silent so <audio> doesn't 404, still return same url
    await writeFile(file, SILENT_MP3)
    return { hash, url, file, cached: false, bytes: SILENT_MP3.length, silent: true, provider: "silent" }
  }

  if (provider === "fish") {
    const result = await synthFish(speechText, file)
    if (result) {
      return { hash, url, file, cached: false, bytes: result.bytes, silent: false, provider }
    }
    await writeFile(file, SILENT_MP3)
    return { hash, url, file, cached: false, bytes: SILENT_MP3.length, silent: true, provider: "silent" }
  }

  // silent fallback
  await writeFile(file, SILENT_MP3)
  return { hash, url, file, cached: false, bytes: SILENT_MP3.length, silent: true, provider: "silent" }
}

// ---------------------------------------------------------------------------

async function synthMimo(text: string, outFile: string): Promise<{ bytes: number } | null> {
  if (!MIMO_KEY) return null
  try {
    // Only normalise ALL-CAPS English → TitleCase so the model doesn't read
    // those tokens as letter-by-letter acronyms. No inline style tag — that
    // turned out to make Chinese also sound robotic.
    const normalised = normaliseForTts(text)
    const body = {
      model: MIMO_MODEL,
      messages: [
        { role: "user", content: DJ_STYLE_INSTRUCTION },
        { role: "assistant", content: normalised },
      ],
      audio: { format: "wav", voice: MIMO_VOICE },
    }
    const res = await fetch(`${MIMO_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        // Docs are ambiguous about Authorization: Bearer vs api-key. Try
        // api-key first (matches their curl examples); some gateways accept
        // either.
        "api-key": MIMO_KEY,
        Authorization: `Bearer ${MIMO_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      console.warn("[tts.mimo] http", res.status, errText.slice(0, 200))
      return null
    }
    const j: any = await res.json()
    const b64: string | undefined = j?.choices?.[0]?.message?.audio?.data
    if (!b64) {
      console.warn("[tts.mimo] no audio in response, payload head:", JSON.stringify(j).slice(0, 200))
      return null
    }
    const buf = Buffer.from(b64, "base64")
    await writeFile(outFile, buf)
    return { bytes: buf.length }
  } catch (err) {
    console.warn("[tts.mimo] failed", (err as Error).message)
    return null
  }
}

async function synthFish(text: string, outFile: string): Promise<{ bytes: number } | null> {
  if (!FISH_KEY) return null
  try {
    // Text is already preprocessed in synthesize() — Fish's own `normalize`
    // is off so it doesn't re-expand numbers / English we already shaped.
    const payload: Record<string, unknown> = {
      text,
      reference_id: FISH_VOICE,
      format: "mp3",
      mp3_bitrate: 128,
      chunk_length: FISH_CHUNK_LEN,
      normalize: false,
      latency: "normal",
      temperature: FISH_TEMP,
      top_p: FISH_TOP_P,
    }
    // Prosody block: only s1 currently honors it. s1-mini / older speech-1.6
    // return 400 if it's present.
    if (FISH_MODEL === "s1") {
      payload.prosody = { speed: FISH_SPEED, volume: 0 }
    }
    const res = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FISH_KEY}`,
        "Content-Type": "application/json",
        model: FISH_MODEL,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      console.warn("[tts.fish] http", res.status, errText.slice(0, 200))
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    await writeFile(outFile, buf)
    return { bytes: buf.length }
  } catch (err) {
    console.warn("[tts.fish] failed", (err as Error).message)
    return null
  }
}

export function ttsProvider(): "mimo" | "fish" | "silent" {
  return MIMO_KEY ? "mimo" : FISH_KEY ? "fish" : "silent"
}

// 1-frame silent MP3 fallback so <audio> can attach without 404.
const SILENT_MP3 = Buffer.from(
  "/+MYxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV",
  "base64",
)
