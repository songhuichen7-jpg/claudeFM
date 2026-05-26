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

/** Coerce raw NCM `songs[i]` to our NcmTrack shape. */
function ncmSongToTrack(song: any): NcmTrack & { _raw: any } {
  const id = String(song.id)
  const title: string = song.name
  const rawArtists: { name: string; id: number }[] = song.artists ?? song.ar ?? []
  const artist: string = rawArtists.map(a => a.name).join(", ") || "Unknown"
  const album: string | undefined = song.album?.name ?? song.al?.name
  const duration: number = Math.round((song.duration ?? song.dt ?? 0) / 1000)
  const cover: string | undefined = song.album?.picUrl ?? song.al?.picUrl
  return { id, title, artist, album, duration, cover, source: "ncm", _raw: song }
}

/**
 * Detect NCM's UGC impersonation pattern. UGC uploaders pretend to be a
 * famous artist by listing them as the first artist with id=0 and a
 * disambiguator suffix like "周杰伦-" / "周杰伦." that won't collide with the
 * real artist (id 6452). Real artists have nonzero ids.
 */
function isImpostorArtist(rawArtist: { name: string; id: number }): boolean {
  if (rawArtist.id && rawArtist.id > 0) return false
  // id===0 and looks like "<famous>-" or "<famous>." or "<famous> "
  return /^[一-鿿A-Za-z][一-鿿A-Za-z0-9·\s]*[-_.\s]$/.test(rawArtist.name) ||
         rawArtist.name.endsWith("-") ||
         rawArtist.name.endsWith(".")
}

/** Strip noise tokens so we can compare titles fairly. */
function normaliseTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[（(].*?[)）]/g, "")     // parenthetical asides — "(Slowed)" / "（粤语）"
    .replace(/[\[\【].*?[\]\】]/g, "")  // bracketed — "[Live]" / "【翻唱】"
    .replace(/[\s\-_·,，.。!！?？]+/g, " ")
    .trim()
}

/** Tokens that demote a result if they appear in title but NOT in the seed. */
const COVER_TOKENS = [
  /翻唱|cover/i,
  /remix|混音/i,
  /slowed|sped\s*up|nightcore|0\.\d+x|加速|减速/i,
  /伴奏|inst(?:rumental)?|karaoke|无人声/i,
  /live|演唱会|现场|直播/i,
  /demo|试听|片段/i,
  /piano|guitar|cover by|改编/i,
]

type Scored = NcmTrack & { _score: number; _why: string[] }

/**
 * Search with multiple candidates and rank by artist+title match quality.
 * Penalises covers / remixes / live versions unless they were explicitly
 * asked for in the seed.
 */
async function searchCandidates(
  seed: { title: string; artist?: string },
  limit = 15,
): Promise<Scored[]> {
  const seedTitleNorm = normaliseTitle(seed.title)
  const seedArtistNorm = (seed.artist ?? "").toLowerCase().trim()
  const userWantsCover = COVER_TOKENS.some(re => re.test(seed.title))
  const query = seed.artist ? `${seed.title} ${seed.artist}` : seed.title

  let songs: any[] = []
  try {
    const res = await search(withCookie({ keywords: query, limit, type: 1 }))
    songs = res.body?.result?.songs ?? []
  } catch (err) {
    console.warn("[ncm.searchCandidates] search failed", (err as Error).message)
    return []
  }
  if (!songs.length) return []

  const scored: Scored[] = songs.map((song): Scored => {
    const t = ncmSongToTrack(song)
    const rawArtists: { name: string; id: number }[] = song.artists ?? song.ar ?? []
    let score = 0
    const why: string[] = []

    // Title match
    const titleNorm = normaliseTitle(t.title)
    if (titleNorm === seedTitleNorm) { score += 50; why.push("title=") }
    else if (titleNorm.startsWith(seedTitleNorm)) { score += 35; why.push("title^") }
    else if (titleNorm.includes(seedTitleNorm)) { score += 20; why.push("title⊆") }
    else if (seedTitleNorm.includes(titleNorm)) { score += 10; why.push("title⊇") }

    // UGC impostor penalty — kills "周杰伦-" / "周杰伦." entries (id=0).
    // Apply this regardless of whether seed has an explicit artist; the
    // pattern itself ("famous-name + hyphen/dot + id=0") is always a fake.
    const hasImpostor = rawArtists.some(isImpostorArtist)
    if (hasImpostor) {
      score -= 100
      why.push("ugc-impostor")
    }

    // All artists have real (nonzero) IDs → bonus
    const allRealIds = rawArtists.length > 0 && rawArtists.every(a => a.id && a.id > 0)
    if (allRealIds) {
      score += 12
      why.push("real-ids")
    }

    // Artist match (heavy weight — wrong artist = wrong track)
    if (seedArtistNorm) {
      // Compare against ONLY non-impostor artists; otherwise "周杰伦-" would
      // satisfy `.includes("周杰伦")` and falsely score high.
      const realArtistStr = rawArtists
        .filter(a => !isImpostorArtist(a))
        .map(a => a.name.toLowerCase())
        .join(", ")
      const artistTokens = seedArtistNorm.split(/[,，、\s]+/).filter(Boolean)
      const matches = artistTokens.filter(tok => realArtistStr.includes(tok)).length
      if (matches === artistTokens.length && artistTokens.length > 0) {
        score += 60
        why.push("artist=all")
        // Exact single-artist match (seed = one artist, track = exactly one
        // matching artist) — strongest signal of the canonical version
        if (artistTokens.length === 1 && rawArtists.filter(a => !isImpostorArtist(a)).length === 1) {
          score += 25
          why.push("artist=solo")
        }
      } else if (matches > 0) {
        score += 25
        why.push(`artist=${matches}/${artistTokens.length}`)
      } else {
        score -= 50
        why.push("artist≠")
      }
    }

    // Cover / remix penalty (unless user asked for it)
    if (!userWantsCover) {
      for (const re of COVER_TOKENS) {
        if (re.test(t.title)) {
          score -= 25
          why.push(`tok-${re.source.slice(0, 8)}`)
          break
        }
        if (re.test(t.album ?? "")) {
          score -= 10
          why.push("album-tok")
          break
        }
      }
    }

    // Popularity signals: song.fee (0=free, 1=VIP, 4=paid-album), pop, mvid
    const pop: number = (song as any).pop ?? 0
    if (pop >= 90) { score += 8; why.push("pop90+") }
    else if (pop >= 70) score += 3
    else if (pop < 20) score -= 3

    // Penalise extremely short tracks (likely snippet/clip)
    if (t.duration > 0 && t.duration < 60) {
      score -= 15
      why.push("dur<60")
    }

    // Bonus for tracks with a real album (less likely a UGC fragment)
    if ((song as any).album?.id && (song as any).album?.id > 0) score += 2

    return { ...t, _score: score, _why: why }
  })

  scored.sort((a, b) => b._score - a._score)
  return scored
}

export async function searchTrack(query: string): Promise<NcmTrack | null> {
  // Backward-compatible: single query string. Treats whole string as title
  // and pulls the highest-scoring candidate.
  const scored = await searchCandidates({ title: query })
  return scored[0] ? stripDebug(scored[0]) : null
}

export async function resolveTrack(seed: { title: string; artist?: string }): Promise<NcmTrack | null> {
  const scored = await searchCandidates(seed)
  if (scored.length === 0) return null

  // Three-tier preference when seed.artist is given:
  //   1. Real artist match (not impostor, exact or solo) → return it
  //   2. No real match but title match exists → fall back to best title
  //      (better to play SOMETHING than nothing — NCM just doesn't carry
  //      this artist's official catalog, e.g. Jay Chou)
  //   3. Nothing → null
  if (seed.artist) {
    const realMatch = scored.find(s => s._why.includes("artist=all") || s._why.includes("artist=solo"))
    if (realMatch && realMatch._score > 0) return stripDebug(realMatch)
    // Fall back to best title-only match. Log a warning so we know the
    // canonical version isn't on NCM.
    const titleOnly = scored.find(s => s._why.some(w => w.startsWith("title")) && s._score > -50)
    if (titleOnly) {
      console.warn(`[ncm.resolveTrack] '${seed.title}' by '${seed.artist}' — no official catalog match; falling back to '${titleOnly.title}' by '${titleOnly.artist}' (${titleOnly._why.join(",")})`)
      return stripDebug(titleOnly)
    }
    return null
  }

  // No artist seed — just take the highest scorer.
  return stripDebug(scored[0])
}

function stripDebug(t: Scored): NcmTrack {
  const { _score, _why, ...clean } = t as any
  void _score; void _why
  return clean
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
