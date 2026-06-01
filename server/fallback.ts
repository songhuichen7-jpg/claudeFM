// Local fallback DJ — used when the configured LLM isn't available
// (missing auth, gateway returns 401, network down, etc.). Picks a track from
// playlists.json based on current time + simple keyword routing on user text,
// and writes a brief "say" line in Claudio's voice. Deterministic enough that
// the rest of the system (ncm → tts → ws) can still demo end-to-end.

import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { DJOutput } from "./llm.js"
import { activeCorpusDir } from "./context.js"
import { Plays } from "./state.js"

type Playlist = { label: string; mood: string[]; seeds: { title: string; artist: string }[] }

let playlistsCache: Record<string, Playlist> | null = null
let playlistsCacheDir = ""
async function loadPlaylists(): Promise<Record<string, Playlist>> {
  const dir = activeCorpusDir()
  if (playlistsCache && playlistsCacheDir === dir) return playlistsCache
  try {
    const body = await readFile(join(dir, "playlists.json"), "utf-8")
    playlistsCache = JSON.parse(body)
    playlistsCacheDir = dir
    return playlistsCache!
  } catch {
    return {}
  }
}

function playlistScore(key: string, playlist: Playlist, hour: number, text?: string): number {
  const t = (text ?? "").toLowerCase()
  const haystack = `${key} ${playlist.label ?? ""} ${(playlist.mood ?? []).join(" ")}`.toLowerCase()
  let score = 100

  if (/华语|中文|国语|mandarin|chinese/.test(t) && /mandarin|chinese|国语|华语|中文|粤|hk|cantonese/.test(haystack)) score -= 60
  if (/粤|港|cantonese|陈奕迅|eason/.test(t) && /hk|cantonese|粤|港/.test(haystack)) score -= 70
  if (/r&b|rnb|sza|keshi|暧昧/.test(t) && /rnb|r&b|soft|暧昧/.test(haystack)) score -= 50
  if (/k-?pop|bigbang|韩/.test(t) && /kpop|k-pop|韩/.test(haystack)) score -= 50
  if (/电子|edm|lift|升空|illenium/.test(t) && /edm|electronic|电子|升空/.test(haystack)) score -= 50
  if (/晚|night|late|凌晨|睡|relax|安静|calm|slowed|慢/.test(t) && /night|late|slowed|drift|入夜|深夜|漂流/.test(haystack)) score -= 50

  if (hour >= 6 && hour < 11 && /morning|glow|早/.test(haystack)) score -= 25
  if (hour >= 11 && hour < 18 && /focus|deep|工作|专注/.test(haystack)) score -= 25
  if (hour >= 18 && hour < 22 && /mandarin|hk|cantonese|国语|华语|粤/.test(haystack)) score -= 25
  if ((hour >= 22 || hour < 6) && /night|late|slowed|drift|入夜|深夜|漂流/.test(haystack)) score -= 25

  return score
}

const SAY_TEMPLATES: Record<string, (track: { title: string; artist: string }) => string> = {
  hk_cantonese_soul: t => `${t.artist} 的 ${t.title}。这首先贴近一点，声音不要太满。`,
  late_night_mandarin: t => `深夜了。给你一首 ${t.title} — ${t.artist}，让今天先慢慢落地。`,
  slowed_drift: t => `${t.artist} 的 ${t.title}。速度放低一点，适合把灯也调暗。`,
  rnb_soft_focus: t => `${t.artist} 的 ${t.title}。留一点空气，不急着往前走。`,
  melodic_edm_lift: t => `${t.artist} 的 ${t.title}。情绪往上抬一点，但不吵。`,
}

export async function fallbackDJ(text: string): Promise<DJOutput> {
  const playlists = await loadPlaylists()
  const hour = new Date().getHours()
  if (Object.keys(playlists).length === 0) {
    return {
      say: "信号有点不稳，我先想想，等下回来。",
      play: [],
      reason: "fallback: no playlist available",
      segue: "next time try llm again",
    }
  }
  const ranked = Object.entries(playlists)
    .map(([key, playlist], index) => ({ key, playlist, index, score: playlistScore(key, playlist, hour, text) }))
    .sort((a, b) => a.score - b.score || a.index - b.index)

  const recent = new Set(Plays.recentTitles(24, 30).map(p => `${p.title}::${p.artist}`))
  let picked: { key: string; seed: { title: string; artist: string } } | null = null
  for (const { key, playlist } of ranked) {
    const fresh = playlist.seeds.filter(s => !recent.has(`${s.title}::${s.artist}`))
    const pool = fresh.length ? fresh : playlist.seeds
    if (pool.length === 0) continue
    picked = { key, seed: pool[Math.floor(Math.random() * pool.length)] }
    break
  }
  if (!picked) {
    return {
      say: "信号有点不稳，我先想想，等下回来。",
      play: [],
      reason: "fallback: no playlist seeds available",
      segue: "next time try llm again",
    }
  }

  const say = (SAY_TEMPLATES[picked.key] ?? ((t) => `给你一首 ${t.title} — ${t.artist}，先让它自己说话。`))(picked.seed)
  return {
    say,
    play: [{ title: picked.seed.title, artist: picked.seed.artist, reason: `playlist:${picked.key}` }],
    reason: `fallback path. playlist=${picked.key}, hour=${hour}, signal=${text.slice(0, 40)}`,
    segue: `next: stay within ${picked.key} unless user shifts mood`,
  }
}
