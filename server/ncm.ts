// NeteaseCloudMusicApi wrapper. The package exports each endpoint as a
// function. We wrap the endpoints we need: search, artist_songs, song_url,
// lyric, recommend.
// When the user is logged in (cookie stored via /api/ncm/login), the cookie
// is forwarded so VIP-flagged tracks return the full 320kbps audio.

import ncm from "NeteaseCloudMusicApi"
import { createHash } from "node:crypto"
import { getCookie } from "./ncm-auth.js"

type NcmFn = (params: Record<string, unknown>) => Promise<{ body: any }>

const search: NcmFn = (ncm as any).search
const artist_songs: NcmFn = (ncm as any).artist_songs
const song_url_v1: NcmFn = (ncm as any).song_url_v1 ?? (ncm as any).song_url
const lyric: NcmFn = (ncm as any).lyric
const personalized: NcmFn = (ncm as any).personalized_newsong ?? (ncm as any).top_song

const PLAYABLE_CACHE_MS = 8 * 60_000
const UNPLAYABLE_CACHE_MS = 30 * 60_000
const PENDING_CACHE_MS = 30_000
const songUrlCache = new Map<string, { expires: number; promise: Promise<string | null> }>()
const playableCache = new Map<string, { expires: number; promise: Promise<NcmResolveResult> }>()

function withCookie(p: Record<string, unknown>): Record<string, unknown> {
  const c = getCookie()
  return c ? { ...p, cookie: c, realIP: "116.25.146.177" } : p
}

function authCacheKey(): string {
  const cookie = getCookie()
  if (!cookie) return "anon"
  const fingerprint = createHash("sha1").update(cookie).digest("hex").slice(0, 12)
  return `auth:${fingerprint}`
}

export function clearNcmCaches() {
  songUrlCache.clear()
  playableCache.clear()
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

export type NcmPlayableTrack = NcmTrack & { url: string }
export type NcmResolveReason = "ok" | "not_found" | "unplayable"
export type NcmResolveResult = {
  track: NcmPlayableTrack | null
  candidate: NcmTrack | null
  reason: NcmResolveReason
}

type NcmSong = {
  id: number | string
  name?: string
  artists?: Array<{ name?: string }>
  ar?: Array<{ name?: string }>
  album?: { name?: string; picUrl?: string }
  al?: { name?: string; picUrl?: string }
  duration?: number
  dt?: number
}

type NcmSongUrlData = {
  url?: string | null
  time?: number
  freeTrialInfo?: unknown
  freeTrialPrivilege?: {
    listenType?: unknown
    freeLimitTagType?: unknown
    cannotListenReason?: unknown
  } | null
}

type TrackSearchRequest = {
  title: string
  artist?: string
}

type SearchOptions = TrackSearchRequest & {
  strictArtist?: boolean
}

const CJK_VERSION_NOISE = [
  "原唱",
  "翻唱",
  "正式版",
  "柔情版",
  "治愈版",
  "伤感版",
  "深情版",
  "女声",
  "男声",
  "童声",
  "钢琴",
  "吉他",
  "伴奏",
  "纯音乐",
  "加速",
  "降调",
]

const LATIN_VERSION_NOISE = [
  "cover",
  "remix",
  "mix",
  "mixed",
  "dj",
  "live",
  "beat",
  "piano",
  "slowed",
  "sped",
  "acoustic",
  "muffled",
  "reverb",
  "version",
  "ver",
]

function normaliseLoose(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[《》"'`‘’“”[\]{}()（）【】<>〈〉\s_\-.,，。/\\:：|·]+/g, "")
}

function normaliseName(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, "").trim()
}

function artistParts(value: string): string[] {
  const normalised = value
    .normalize("NFKC")
    .replace(/\s+(?:feat\.?|featuring|ft\.?)\s+/gi, ",")
    .replace(/\s+&\s+/g, ",")
    .replace(/\s+and\s+/gi, ",")

  const seen = new Set<string>()
  const out: string[] = []
  for (const part of normalised.split(/[,，、;；]+/)) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const key = normaliseName(trimmed)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

function primaryArtist(value: string): string {
  return artistParts(value)[0] ?? value
}

function bracketAliases(value: string): string[] {
  return Array.from(value.normalize("NFKC").matchAll(/[（(](.+?)[）)]/g), (match) => match[1])
}

function artistNameMatchesRequested(value: string, requested: string): boolean {
  const wanted = normaliseName(requested)
  if (normaliseName(value) === wanted) return true
  return bracketAliases(value).some((alias) => normaliseName(alias) === wanted)
}

function stripBracketedVersion(value: string): string {
  return value
    .replace(/[（(【\[].*?[）)】\]]/g, "")
    .replace(/《(.+?)》/g, "$1")
    .trim()
}

function songArtists(song: NcmSong): string[] {
  return (song.artists ?? song.ar ?? [])
    .map((a) => a.name?.trim())
    .filter((name): name is string => Boolean(name))
}

function mapSong(song: NcmSong): NcmTrack {
  return {
    id: String(song.id),
    title: song.name ?? "",
    artist: songArtists(song).join(", ") || "Unknown",
    album: song.album?.name ?? song.al?.name,
    duration: Math.round((song.duration ?? song.dt ?? 0) / 1000),
    cover: song.album?.picUrl ?? song.al?.picUrl,
    source: "ncm",
  }
}

function inferTrackRequest(seed: TrackSearchRequest): TrackSearchRequest {
  const explicitArtist = seed.artist?.trim()
  const title = seed.title.trim()
  if (explicitArtist) return { title, artist: explicitArtist }

  const byMatch = title.match(/^(.+?)\s+(?:by|的)\s+(.+)$/i)
  if (byMatch) {
    return { title: byMatch[1].trim(), artist: byMatch[2].trim() }
  }

  const parts = title.split(/\s+/).filter(Boolean)
  const last = parts.at(-1)
  if (parts.length >= 2 && last && /[\u3400-\u9fff]/.test(last)) {
    return { title: parts.slice(0, -1).join(" "), artist: last }
  }

  return { title }
}

function artistPossessiveRequest(title: string): TrackSearchRequest | null {
  const value = title.trim()
  const splitAt = value.lastIndexOf("的")
  if (splitAt <= 0 || splitAt >= value.length - 1) return null

  const artist = value.slice(0, splitAt).trim()
  const songTitle = value.slice(splitAt + 1).trim()
  if (!artist || !songTitle) return null

  if (!isPlausibleArtistHint(artist)) return null

  return { title: songTitle, artist }
}

function isPlausibleArtistHint(value: string): boolean {
  const compactArtist = normaliseLoose(value)
  if (compactArtist.length < 2 || compactArtist.length > 24) return false
  if (/^(我|我们|你|你们|他|他们|她|她们|它|它们|谁|什么|一首|首|歌|歌曲|音乐)$/.test(compactArtist)) {
    return false
  }

  return true
}

function bracketedTitleRequests(title: string): TrackSearchRequest[] {
  const match = title.trim().match(/^(.*?)《(.+?)》(.*)$/)
  if (!match) return []

  const before = match[1].replace(/[-–—:：|｜]+$/g, "").trim()
  const songTitle = match[2].trim()
  const after = match[3].replace(/^[-–—:：|｜]+/g, "").trim()
  if (!songTitle) return []

  const out: TrackSearchRequest[] = []
  if (before && isPlausibleArtistHint(before)) out.push({ title: songTitle, artist: before })
  if (after && isPlausibleArtistHint(after)) out.push({ title: songTitle, artist: after })
  out.push({ title: songTitle })
  return out
}

function hasAsciiLetter(value: string): boolean {
  return /[a-z]/i.test(value)
}

function splitIndexes(length: number): number[] {
  const preferred = [2, 1, 3, 4, 5]
  return preferred.filter((index) => index > 0 && index < length)
}

function splitPairRequests(title: string): TrackSearchRequest[] {
  const value = title.trim()
  const separator = value.match(/^(.+?)\s*(?:[-–—:：|｜])\s*(.+)$/)
  if (separator) {
    const left = separator[1].trim()
    const right = separator[2].trim()
    if (left && right) {
      return [
        { title: right, artist: left },
        { title: left, artist: right },
      ]
    }
  }

  const parts = value.split(/\s+/).filter(Boolean)
  if (parts.length === 2 && parts.every((part) => /[\u3400-\u9fff]/.test(part))) {
    return [
      { title: parts[0], artist: parts[1] },
      { title: parts[1], artist: parts[0] },
    ]
  }

  if (parts.length < 2 || parts.length > 6 || !parts.some(hasAsciiLetter)) return []

  const out: TrackSearchRequest[] = []
  for (const index of splitIndexes(parts.length)) {
    const left = parts.slice(0, index).join(" ")
    const right = parts.slice(index).join(" ")
    if (!left || !right) continue

    const leftHasAscii = hasAsciiLetter(left)
    const rightHasAscii = hasAsciiLetter(right)
    if (leftHasAscii && !rightHasAscii) {
      out.push({ title: right, artist: left }, { title: left, artist: right })
    } else if (rightHasAscii && !leftHasAscii) {
      out.push({ title: left, artist: right }, { title: right, artist: left })
    } else {
      out.push({ title: right, artist: left }, { title: left, artist: right })
    }
  }

  return out
}

function candidateTrackRequests(seed: TrackSearchRequest): TrackSearchRequest[] {
  const out: TrackSearchRequest[] = []
  const seen = new Set<string>()
  const add = (request: TrackSearchRequest | null) => {
    if (!request?.title.trim()) return
    const title = request.title.trim()
    const artist = request.artist?.trim()
    const key = `${normaliseLoose(title)}::${artist ? normaliseName(artist) : ""}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(artist ? { title, artist } : { title })
  }

  for (const request of bracketedTitleRequests(seed.title)) add(request)
  for (const request of splitPairRequests(seed.title)) add(request)

  const primary = inferTrackRequest(seed)
  add(primary)
  if (!primary.artist) add(artistPossessiveRequest(primary.title))

  return out
}

function playableCacheKey(seed: TrackSearchRequest): string {
  const request = inferTrackRequest(seed)
  return `${authCacheKey()}::${normaliseLoose(request.title)}::${request.artist ? normaliseName(request.artist) : ""}`
}

function containsNoise(value: string, requestedTitle: string): boolean {
  const haystack = value.normalize("NFKC").toLowerCase()
  const requested = requestedTitle.normalize("NFKC").toLowerCase()
  const cjkNoise = CJK_VERSION_NOISE.some((word) => haystack.includes(word) && !requested.includes(word))
  if (cjkNoise) return true

  const requestedTokens = new Set(requested.match(/[a-z0-9]+/g) ?? [])
  const haystackTokens = new Set(haystack.match(/[a-z0-9]+/g) ?? [])
  return LATIN_VERSION_NOISE.some((word) => haystackTokens.has(word) && !requestedTokens.has(word))
}

export function scoreSongCandidate(song: NcmSong, options: SearchOptions): number {
  const requestedTitle = options.title.trim()
  const wantedTitle = normaliseLoose(stripBracketedVersion(requestedTitle))
  const title = song.name ?? ""
  const baseTitle = normaliseLoose(stripBracketedVersion(title))
  const rawTitle = normaliseLoose(title)
  const album = song.album?.name ?? song.al?.name ?? ""
  const artists = songArtists(song)
  let score = 0

  if (baseTitle === wantedTitle) score += 70
  else if (rawTitle === wantedTitle) score += 55
  else if (baseTitle.includes(wantedTitle) || wantedTitle.includes(baseTitle)) score += 20
  else score -= 60

  if (containsNoise(title, requestedTitle)) score -= 35
  if (containsNoise(album, requestedTitle)) score -= 20

  const duration = Math.round((song.duration ?? song.dt ?? 0) / 1000)
  if (duration > 0 && duration < 100) score -= 20
  if (duration > 0 && duration > 900) score -= 15

  if (options.artist) {
    const requestedArtists = artistParts(options.artist)
    const exactMatches = requestedArtists.filter((requested) =>
      artists.some((artist) => artistNameMatchesRequested(artist, requested)),
    )
    const looseMatches = requestedArtists.filter((requested) => {
      const wantedArtistLoose = normaliseLoose(requested)
      return artists.some((artist) => normaliseLoose(artist).includes(wantedArtistLoose))
    })
    const exactArtist = requestedArtists.length > 0 && exactMatches.length === requestedArtists.length
    const primaryExact = requestedArtists[0]
      ? artists.some((artist) => artistNameMatchesRequested(artist, requestedArtists[0]))
      : false
    const looseArtist = looseMatches.length > 0
    const suspiciousAlias = artists.some((artist) => {
      const strict = normaliseName(artist)
      const loose = normaliseLoose(artist)
      return requestedArtists.some((requested) => {
        const wantedArtistName = normaliseName(requested)
        const wantedArtistLoose = normaliseLoose(requested)
        return loose.includes(wantedArtistLoose) && strict !== wantedArtistName && !artistNameMatchesRequested(artist, requested)
      })
    })

    if (exactArtist) score += 60
    else if (primaryExact) score += 35
    else if (looseArtist) score -= 20
    else score -= 90

    if (suspiciousAlias) score -= 45
    score -= Math.min(45, Math.max(0, artists.length - exactMatches.length) * 10)
  }

  return score
}

function pickBestSong(songs: NcmSong[], options: SearchOptions): NcmTrack | null {
  let best: { song: NcmSong; score: number } | null = null
  for (const song of songs) {
    const score = scoreSongCandidate(song, options)
    if (!best || score > best.score) best = { song, score }
  }

  if (!best) return null
  const minimum = options.strictArtist ? 85 : 25
  return best.score >= minimum ? mapSong(best.song) : null
}

function exactArtistMatch(
  artists: Array<{ id?: number | string; name?: string; alias?: string[] }>,
  requested: string,
): { id: number | string; name: string } | null {
  const match = artists.find((artist) => {
    const names = [artist.name, ...(artist.alias ?? [])].filter((name): name is string => Boolean(name))
    return names.some((name) => artistNameMatchesRequested(name, requested))
  })
  return match?.id && match.name ? { id: match.id, name: match.name } : null
}

async function searchArtistCatalog(request: TrackSearchRequest): Promise<NcmTrack | null> {
  if (!request.artist) return null

  const artist = primaryArtist(request.artist)
  const artistRes = await search(withCookie({ keywords: artist, limit: 8, type: 100 }))
  const artistMatch = exactArtistMatch(artistRes.body?.result?.artists ?? [], artist)
  if (!artistMatch) return null
  const catalogRequest = { ...request, artist: artistMatch.name }

  for (const offset of [0, 100, 200]) {
    const songsRes = await artist_songs(withCookie({ id: artistMatch.id, limit: 100, offset, order: "hot" }))
    const songs: NcmSong[] = songsRes.body?.songs ?? []
    const picked = pickBestSong(songs, { ...catalogRequest, strictArtist: true })
    if (picked) return picked
    if (songs.length < 100) break
  }

  return null
}

export async function searchTrack(query: string, options?: Partial<SearchOptions>): Promise<NcmTrack | null> {
  try {
    const request = inferTrackRequest({ title: options?.title ?? query, artist: options?.artist })
    const res = await search(withCookie({ keywords: query, limit: 25, type: 1 }))
    return pickBestSong(res.body?.result?.songs ?? [], {
      ...request,
      strictArtist: options?.strictArtist,
    })
  } catch (err) {
    console.warn("[ncm.searchTrack] failed", (err as Error).message)
    return null
  }
}

export async function resolveTrack(seed: { title: string; artist?: string }): Promise<NcmTrack | null> {
  for (const request of candidateTrackRequests(seed)) {
    const q = request.artist ? `${request.title} ${request.artist}` : request.title

    try {
      const catalogTrack = await searchArtistCatalog(request)
      if (catalogTrack) return catalogTrack
    } catch (err) {
      console.warn("[ncm.searchArtistCatalog] failed", (err as Error).message)
    }

    const track = await searchTrack(q, {
      ...request,
      strictArtist: Boolean(request.artist),
    })
    if (track) return track
  }

  return null
}

function isTrialOrPartialUrl(data: NcmSongUrlData, expectedDurationSeconds?: number): boolean {
  if (data.freeTrialInfo) return true

  const privilege = data.freeTrialPrivilege
  if (privilege?.listenType != null || privilege?.freeLimitTagType != null) return true

  const returnedMs = Number(data.time ?? 0)
  const expectedMs = expectedDurationSeconds ? expectedDurationSeconds * 1000 : 0
  if (expectedMs >= 90_000 && returnedMs > 0 && returnedMs < expectedMs * 0.8) return true

  return false
}

async function fetchSongUrl(id: string, expectedDurationSeconds?: number): Promise<string | null> {
  // Logged-in users with VIP get "exhigh" (320kbps) full audio; anonymous
  // users get "standard" which on most copyrighted tracks degrades to a 30s
  // trial preview.
  const level = getCookie() ? "exhigh" : "standard"
  try {
    const res = await song_url_v1(withCookie({ id, level }))
    const data = (res.body?.data?.[0] ?? {}) as NcmSongUrlData
    if (isTrialOrPartialUrl(data, expectedDurationSeconds)) return null
    const url: string | undefined | null = data.url
    return url ?? null
  } catch (err) {
    console.warn("[ncm.songUrl] failed", (err as Error).message)
    return null
  }
}

export async function songUrl(id: string, expectedDurationSeconds?: number): Promise<string | null> {
  const durationBucket =
    expectedDurationSeconds && expectedDurationSeconds >= 90
      ? String(Math.round(expectedDurationSeconds))
      : "unknown"
  const key = `${authCacheKey()}::${id}::${durationBucket}`
  const now = Date.now()
  const cached = songUrlCache.get(key)
  if (cached && cached.expires > now) return cached.promise

  const entry = {
    expires: now + PENDING_CACHE_MS,
    promise: fetchSongUrl(id, expectedDurationSeconds).then((url) => {
      entry.expires = Date.now() + (url ? PLAYABLE_CACHE_MS : UNPLAYABLE_CACHE_MS)
      return url
    }),
  }
  songUrlCache.set(key, entry)
  return entry.promise
}

async function resolvePlayableTrackUncached(seed: { title: string; artist?: string }): Promise<NcmResolveResult> {
  const candidate = await resolveTrack(seed)
  if (!candidate) {
    return { track: null, candidate: null, reason: "not_found" }
  }

  const url = await songUrl(candidate.id, candidate.duration)
  if (!url) {
    return { track: null, candidate, reason: "unplayable" }
  }

  return { track: { ...candidate, url }, candidate, reason: "ok" }
}

export async function resolvePlayableTrack(seed: { title: string; artist?: string }): Promise<NcmResolveResult> {
  const key = playableCacheKey(seed)
  const now = Date.now()
  const cached = playableCache.get(key)
  if (cached && cached.expires > now) return cached.promise

  const entry = {
    expires: now + PENDING_CACHE_MS,
    promise: resolvePlayableTrackUncached(seed).then((result) => {
      entry.expires = Date.now() + (result.reason === "ok" ? PLAYABLE_CACHE_MS : UNPLAYABLE_CACHE_MS)
      return result
    }),
  }
  playableCache.set(key, entry)
  return entry.promise
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
