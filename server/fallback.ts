// Local fallback DJ — used when the Claude subprocess isn't available
// (no Max auth, gateway returns 401, network down, etc.). Picks a track from
// playlists.json based on current time + simple keyword routing on user text,
// and writes a brief "say" line in Claudio's voice. Deterministic enough that
// the rest of the system (ncm → tts → ws) can still demo end-to-end.

import { readFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { DJOutput } from "./claude.js"
import { Plays } from "./state.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

type Playlist = { label: string; mood: string[]; seeds: { title: string; artist: string }[] }

let playlistsCache: Record<string, Playlist> | null = null
async function loadPlaylists(): Promise<Record<string, Playlist>> {
  if (playlistsCache) return playlistsCache
  try {
    const body = await readFile(join(ROOT, "user", "playlists.json"), "utf-8")
    playlistsCache = JSON.parse(body)
    return playlistsCache!
  } catch {
    return {}
  }
}

function pickPlaylistKey(hour: number, text?: string): string {
  const t = (text ?? "").toLowerCase()
  if (/rain|雨/.test(t)) return "rainy_white"
  if (/华语|中文|chinese|国语/.test(t)) return "90s_chinese"
  if (/focus|专注|工作|deep|jazz|hip-?hop/.test(t)) return "deep_focus"
  if (/morning|早|起床|wake/.test(t)) return "morning_glow"
  if (/晚|night|late|exhale|睡|relax|安静|calm/.test(t)) return "monday_night_exhale"
  if (hour >= 6 && hour < 11) return "morning_glow"
  if (hour >= 11 && hour < 18) return "deep_focus"
  if (hour >= 18 && hour < 22) return "90s_chinese"
  return "monday_night_exhale"
}

const SAY_TEMPLATES: Record<string, (track: { title: string; artist: string }) => string> = {
  rainy_white: t => `下着雨的时候我习惯放 ${t.artist} 的 ${t.title}，让雨声跟琴声一起走。`,
  "90s_chinese": t => `${t.artist} 的 ${t.title}。90 年代华语里我反复回头听的一首，慢慢来。`,
  deep_focus: t => `${t.artist} 的 ${t.title}。节奏稳，不抢你的注意力，可以一直放着。`,
  morning_glow: t => `早，给你一首 ${t.title} — ${t.artist}，让今天开机别太用力。`,
  monday_night_exhale: t => `深夜了。给你一首 ${t.title} — ${t.artist}，让今天先慢慢落地。`,
}

export async function fallbackDJ(text: string): Promise<DJOutput> {
  const playlists = await loadPlaylists()
  const hour = new Date().getHours()
  const key = pickPlaylistKey(hour, text)
  const playlist = playlists[key]
  if (!playlist || playlist.seeds.length === 0) {
    return {
      say: "信号有点不稳，我先想想，等下回来。",
      play: [],
      reason: "fallback: no playlist available",
      segue: "next time try claude again",
    }
  }
  // Avoid repeating in last 24h
  const recent = new Set(Plays.recentTitles(24, 30).map(p => `${p.title}::${p.artist}`))
  const fresh = playlist.seeds.filter(s => !recent.has(`${s.title}::${s.artist}`))
  const seed = (fresh.length ? fresh : playlist.seeds)[Math.floor(Math.random() * (fresh.length || playlist.seeds.length))]
  const say = (SAY_TEMPLATES[key] ?? SAY_TEMPLATES.monday_night_exhale)(seed)
  return {
    say,
    play: [{ title: seed.title, artist: seed.artist, reason: `playlist:${key}` }],
    reason: `fallback path. playlist=${key}, hour=${hour}, signal=${text.slice(0, 40)}`,
    segue: `next: stay within ${key} unless user shifts mood`,
  }
}
