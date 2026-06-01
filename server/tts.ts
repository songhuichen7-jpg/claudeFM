import { createHash } from "node:crypto"
import { existsSync, mkdirSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { dataPath } from "./paths.js"

export const CACHE_DIR = dataPath("cache", "tts")
mkdirSync(CACHE_DIR, { recursive: true })

// --- providers --------------------------------------------------------------

const MIMO_KEY = process.env.MIMO_API_KEY
const MIMO_VOICE = process.env.MIMO_VOICE ?? "苏打" // male Chinese — fits Claudio's late-night DJ
const MIMO_MODEL = process.env.MIMO_MODEL ?? "mimo-v2.5-tts"
const MIMO_BASE = process.env.MIMO_BASE_URL ?? "https://api.xiaomimimo.com/v1"

const FISH_KEY = process.env.FISH_API_KEY
const FISH_VOICE = process.env.FISH_VOICE_ID

const TTS_NORMALISE_VERSION = "tts-polish-v2"
const KEEP_CAPS = new Set(["III", "VIII", "XII", "USA", "UK", "DJ", "FM", "OK", "EDM"])
const DJ_STYLE_INSTRUCTION =
  process.env.MIMO_STYLE ??
  "像深夜电台主持一样念：音量稳定，语速放松，短句之间自然停顿。中文用普通话自然口语；英文歌名、艺人名、单词按英文连读，不要逐字母拼读。不要念出标点、破折号、括号或 Markdown 符号。"

/**
 * Normalise the displayed DJ copy into speech-friendly text before TTS.
 * This does not change the chat transcript; it only prevents engines from
 * reading UI punctuation / Markdown / separators as literal words.
 */
function normaliseForTts(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|mailto:|tel:|ftp:\/\/)[^)]+\)/g, "$1")
    .replace(/[`*_~#>]+/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\bfeat\.?\b/gi, "featuring")
    .replace(/\bft\.?\b/gi, "featuring")
    .replace(/&/g, " and ")
    .replace(/[《》「」『』“”"()（）[\]{}]/g, "")
    .replace(/[·•]/g, "，")
    .replace(/\s*[—–]\s*/g, "，")
    .replace(/\s+-\s+/g, "，")
    .replace(/\s*\/\s*/g, "，")
    .replace(/\b[A-Z]{3,}\b/g, (m) => {
      if (KEEP_CAPS.has(m)) return m
      return m[0] + m.slice(1).toLowerCase()
    })
    .replace(/([。！？!?]){2,}/g, "$1")
    .replace(/([,，、]){2,}/g, "，")
    .replace(/\s*([,，、。！？!?])\s*/g, "$1")
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
  const provider: "mimo" | "fish" | "silent" =
    process.env.CLAUDIO_E2E_STUB === "1" ? "silent" : MIMO_KEY ? "mimo" : FISH_KEY ? "fish" : "silent"
  const ext = provider === "silent" ? "mp3" : provider === "mimo" ? "wav" : "mp3"
  const speechText = provider === "mimo" ? normaliseForTts(cleaned) : cleaned

  // Cache key includes the spoken text and style instruction so old robotic
  // MiMo files created with previous prompt tags are not silently reused.
  const hash = createHash("sha256")
    .update(`${TTS_NORMALISE_VERSION}::${provider}::${MIMO_MODEL}::${MIMO_VOICE}::${FISH_VOICE ?? ""}::${DJ_STYLE_INSTRUCTION}::${speechText}`)
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
    const result = await synthFish(cleaned, file)
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
    // Keep style as a separate instruction. Inline tags in the spoken content
    // made the Chinese delivery sound stiff in MiMo.
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
    const body = JSON.stringify({
      text,
      reference_id: FISH_VOICE,
      format: "mp3",
      mp3_bitrate: 128,
      normalize: true,
      latency: "normal",
    })
    const res = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FISH_KEY}`,
        "Content-Type": "application/json",
      },
      body,
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
