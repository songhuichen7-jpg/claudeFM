// NeteaseCloudMusicApi wrapper. The package exports each endpoint as a
// function. We wrap the four we need: search, song_url, lyric, recommend.
// When the user is logged in (cookie stored via /api/ncm/login), the cookie
// is forwarded so VIP-flagged tracks return the full 320kbps audio.

import ncm from "NeteaseCloudMusicApi"
import { getCookie } from "./ncm-auth.js"

type NcmFn = (params: Record<string, unknown>) => Promise<{ body: any }>

const search: NcmFn = (ncm as any).search
const song_url_v1: NcmFn = (ncm as any).song_url_v1 ?? (ncm as any).song_url
const lyric: NcmFn = (ncm as any).lyric
const personalized: NcmFn = (ncm as any).personalized_newsong ?? (ncm as any).top_song

function withCookie(p: Record<string, unknown>): Record<string, unknown> {
  const c = getCookie()
  return c ? { ...p, cookie: c, realIP: "116.25.146.177" } : p
}

export type NcmTrack = {
  id: string
  title: string
  artist: string
  album?: string
  cover?: string
  duration: number // seconds
  url?: string
  source: "ncm"
}

export async function searchTrack(query: string): Promise<NcmTrack | null> {
  try {
    const res = await search(withCookie({ keywords: query, limit: 1, type: 1 }))
    const song = res.body?.result?.songs?.[0]
    if (!song) return null
    const id = String(song.id)
    const title: string = song.name
    const artist: string = song.artists?.map((a: any) => a.name).join(", ") ?? "Unknown"
    const album: string | undefined = song.album?.name
    const duration: number = Math.round((song.duration ?? 0) / 1000)
    const cover: string | undefined = song.album?.picUrl
    return { id, title, artist, album, duration, cover, source: "ncm" }
  } catch (err) {
    console.warn("[ncm.searchTrack] failed", (err as Error).message)
    return null
  }
}

export async function resolveTrack(seed: { title: string; artist?: string }): Promise<NcmTrack | null> {
  const q = seed.artist ? `${seed.title} ${seed.artist}` : seed.title
  return searchTrack(q)
}

export async function songUrl(id: string): Promise<string | null> {
  // Logged-in users with VIP get "exhigh" (320kbps) full audio; anonymous
  // users get "standard" which on most copyrighted tracks degrades to a 30s
  // trial preview.
  const level = getCookie() ? "exhigh" : "standard"
  try {
    const res = await song_url_v1(withCookie({ id, level }))
    const url: string | undefined = res.body?.data?.[0]?.url
    return url ?? null
  } catch (err) {
    console.warn("[ncm.songUrl] failed", (err as Error).message)
    return null
  }
}

export async function songLyric(id: string): Promise<string | null> {
  try {
    const res = await lyric(withCookie({ id }))
    const lrc: string | undefined = res.body?.lrc?.lyric
    return lrc ?? null
  } catch (err) {
    console.warn("[ncm.songLyric] failed", (err as Error).message)
    return null
  }
}

export async function recommend(): Promise<NcmTrack[]> {
  try {
    const res = await personalized(withCookie({ limit: 8 }))
    const list = res.body?.result ?? res.body?.data ?? []
    return list
      .map((song: any) => ({
        id: String(song.id),
        title: song.name,
        artist: (song.artists ?? song.song?.artists ?? []).map((a: any) => a.name).join(", "),
        album: song.album?.name,
        duration: Math.round((song.duration ?? song.song?.duration ?? 0) / 1000),
        cover: song.picUrl ?? song.album?.picUrl,
        source: "ncm" as const,
      }))
      .filter((t: NcmTrack) => t.title && t.artist)
  } catch (err) {
    console.warn("[ncm.recommend] failed", (err as Error).message)
    return []
  }
}
