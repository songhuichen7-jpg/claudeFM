import { readFile } from "node:fs/promises"
import { join as joinPath } from "node:path"
import type { NcmTrack } from "./ncm.js"
import type { NcmResolveResult } from "./ncm.js"
import { resolvePlayableTrack } from "./ncm.js"
import { askDJ, type DJOutput } from "./llm.js"
import { fallbackDJ } from "./fallback.js"
import { synthesize } from "./tts.js"
import { activeCorpusDir, assemble, joinFragments } from "./context.js"
import { Messages, Plays, Prefs } from "./state.js"
import { pushToRoom, naimEnabled } from "./naim.js"

export type ResolvedTrack = NcmTrack & { url: string }

export type DJTurn = {
  id: string
  say: string
  ttsUrl: string
  ttsSilent: boolean
  ttsPending?: boolean
  source: "user" | "scheduler" | "manual" | "next"
  reason?: string
  segue?: string
  tracks: ResolvedTrack[]
  ts: number
}

/**
 * Intent classification:
 *  - "/skip", "/next" → command
 *  - "play X by Y" / "放 X" → direct ncm search
 *  - everything else (natural language) → llm
 */
export type Intent =
  | { kind: "command"; cmd: "skip" | "pause" | "play" | "like" | "unlike"; arg?: string }
  | { kind: "direct-music"; query: string }
  | { kind: "llm"; text: string }

type Seed = { title: string; artist: string; reason?: string }
type Playlist = { label?: string; mood?: string[]; seeds?: Seed[] }
type PlaybackResolution = {
  tracks: ResolvedTrack[]
  sayOverride?: string
  reasonNote?: string
}

export function classify(text: string): Intent {
  const t = text.trim()
  if (!t) return { kind: "llm", text: "" }

  // slash commands
  if (t.startsWith("/")) {
    const [cmd, ...rest] = t.slice(1).split(/\s+/)
    if (["skip", "next"].includes(cmd)) return { kind: "command", cmd: "skip", arg: rest.join(" ") }
    if (cmd === "pause") return { kind: "command", cmd: "pause" }
    if (cmd === "play") return { kind: "command", cmd: "play" }
    if (cmd === "like") return { kind: "command", cmd: "like" }
    if (cmd === "unlike") return { kind: "command", cmd: "unlike" }
  }

  // "play <X> by <Y>" / "播放<X>" / "放一首<X>" / "来一首 <X>" / "听<X>"
  const directMusic = parseDirectMusic(t)
  if (directMusic) {
    const query = directMusic.artist ? `${directMusic.title} by ${directMusic.artist}` : directMusic.title
    return { kind: "direct-music", query }
  }

  return { kind: "llm", text: t }
}

function parseDirectMusic(text: string): { title: string; artist?: string } | null {
  const english = text.match(/^play\s+(.+?)(?:\s+by\s+(.+))?$/i)
  if (english) return directMusicPayload(english[1], english[2])

  const chinese = text.match(/^(?:(?:请|帮我|给我)\s*)?(?:(?:播(?:放)?|放)(?:一下|一首|首)?|来(?:一首|首)?|听(?!说))\s*(.+?)(?:\s+(?:by|的)\s+(.+))?$/i)
  if (chinese) return directMusicPayload(chinese[1], chinese[2])

  return null
}

function directMusicPayload(title: string, artist?: string): { title: string; artist?: string } | null {
  const cleanTitle = title.trim()
  const cleanArtist = artist?.trim()
  if (!cleanTitle) return null
  if (isGenericMusicAsk(cleanTitle, cleanArtist)) return null
  return cleanArtist ? { title: cleanTitle, artist: cleanArtist } : { title: cleanTitle }
}

function isGenericMusicAsk(title: string, artist?: string): boolean {
  const compact = title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[《》"'`‘’“”[\]{}()（）【】<>〈〉\s_\-.,，。/\\:：|·]+/g, "")

  if (/^(歌|歌曲|音乐|点歌|一首歌|首歌|song|songs|music|track|tracks|something|anything)$/.test(compact)) return true
  if (!artist && /^(随便|随便一首|随便来首|随便来一首)$/.test(compact)) return true
  if (!artist && /^(华语|国语|中文|粤语|英文|欧美|日语|韩语)?(热门|流行|新歌|老歌|慢歌|快歌|情歌|民谣|电子|摇滚|说唱|爵士|rnb|rb|kpop)$/.test(compact)) return true
  if (!artist && /^(华语|国语|中文|粤语|英文|欧美|日语|韩语)(歌|音乐|曲子|歌曲)$/.test(compact)) return true
  if (!artist && /^(安静|睡前|凌晨|夜晚|提神|放松|开心|难过|emo)(的)?(歌|音乐|曲子|歌曲)?$/.test(compact)) return true
  if (!artist && /^(.*)(的歌|的音乐|风格)$/.test(compact)) return true

  return false
}

export async function runUserTurn(text: string): Promise<DJTurn> {
  const ts = Date.now()
  const userId = `u-${ts}`
  Messages.insert({ id: userId, ts, kind: "user", speaker: "veko", text })

  const intent = classify(text)

  if (process.env.CLAUDIO_E2E_STUB === "1") {
    return finalize(e2eTurn(text, "user"))
  }

  // direct-music: bypass LLM, just resolve
  if (intent.kind === "direct-music") {
    const result = await resolvePlayableTrack({ title: intent.query })
    if (result.track) {
      return finalize({
        say: `好，给你放 ${result.track.title}。`,
        source: "user",
        reason: "direct music intent",
        tracks: [result.track],
      })
    }
    if (result.candidate && result.reason === "unplayable") {
      return finalize({
        say: `找到了 ${result.candidate.title} · ${result.candidate.artist}，但网易云现在没有给这首的播放链接。我先不拿翻唱或混音版本凑数。`,
        source: "user",
        reason: "direct music intent unavailable",
        tracks: [],
      })
    }
    return finalize({
      say: `没找到 ${intent.query}，要不你说个艺人名我再搜搜？`,
      source: "user",
      tracks: [],
    })
  }

  // LLM path (default)
  const lastReason = Prefs.get("last_reason") ?? undefined
  const lastSegue = Prefs.get("last_segue") ?? undefined
  const fragments = await assemble({
    triggerKind: "user",
    triggerBody: text,
    lastReason,
    lastSegue,
  })
  const { system, user } = joinFragments(fragments)
  let dj: DJOutput
  try {
    dj = await askDJ(system, user)
  } catch (err) {
    console.warn("[router] llm failed, using fallback:", (err as Error).message)
    dj = await fallbackDJ(text)
  }

  Prefs.set("last_reason", dj.reason ?? "")
  Prefs.set("last_segue", dj.segue ?? "")

  const playback = await resolvePlayback(dj.play, text)

  return finalize({
    say: (playback.sayOverride ?? dj.say) || "（沉默了一下）",
    source: "user",
    reason: appendReason(dj.reason, playback.reasonNote),
    segue: dj.segue,
    tracks: playback.tracks,
  })
}

export async function runScheduledBroadcast(
  reason: string,
  source: DJTurn["source"] = "scheduler",
): Promise<DJTurn> {
  if (process.env.CLAUDIO_E2E_STUB === "1") {
    return finalize(e2eTurn(reason, source))
  }

  const lastReason = Prefs.get("last_reason") ?? undefined
  const lastSegue = Prefs.get("last_segue") ?? undefined
  const fragments = await assemble({
    triggerKind: "scheduler",
    triggerBody: reason,
    lastReason,
    lastSegue,
  })
  const { system, user } = joinFragments(fragments)
  let dj: DJOutput
  try {
    dj = await askDJ(system, user)
  } catch (err) {
    console.warn("[router] scheduled llm failed, using fallback:", (err as Error).message)
    dj = await fallbackDJ(reason)
  }
  Prefs.set("last_reason", dj.reason ?? "")
  Prefs.set("last_segue", dj.segue ?? "")
  const playback = await resolvePlayback(dj.play, reason)
  return finalize({
    say: (playback.sayOverride ?? dj.say) || "（沉默了一下）",
    source,
    reason: appendReason(dj.reason, playback.reasonNote),
    segue: dj.segue,
    tracks: playback.tracks,
  })
}

export async function resolvePlayback(seeds: Seed[], triggerText: string): Promise<PlaybackResolution> {
  const candidates = seeds.slice(0, 3)
  const failed: Array<{ seed: Seed; result: NcmResolveResult }> = []
  const blocked = new Set<string>()

  for (const seed of candidates) {
    blocked.add(seedKey(seed))
    const result = await resolvePlayableTrack(seed)
    if (result.track) {
      const note = failed.length ? `ncm recovered after ${failed.length} unavailable candidate(s)` : undefined
      return {
        tracks: [result.track],
        sayOverride: failed.length ? recoveredSay(failed[0].result, result.track) : undefined,
        reasonNote: note,
      }
    }
    failed.push({ seed, result })
  }

  const fallback = await findPlayableFallback(triggerText, blocked)
  if (fallback) {
    return {
      tracks: [fallback],
      sayOverride: recoveredSay(failed[0]?.result, fallback),
      reasonNote: "ncm fallback: selected playable seed from active playlist",
    }
  }

  const unavailable = failed.find((item) => item.result.reason === "unplayable" && item.result.candidate)?.result
  if (unavailable?.candidate) {
    return {
      tracks: [],
      sayOverride: `找到了 ${unavailable.candidate.title} · ${unavailable.candidate.artist}，但网易云现在没有给这首的播放链接。我先不拿翻唱或混音版本凑数。`,
      reasonNote: "ncm unavailable and no playable fallback found",
    }
  }

  return { tracks: [], reasonNote: failed.length ? "ncm found no playable result" : undefined }
}

function recoveredSay(firstFailure: NcmResolveResult | undefined, track: ResolvedTrack): string {
  if (firstFailure?.candidate && firstFailure.reason === "unplayable") {
    return `找到了 ${firstFailure.candidate.title} · ${firstFailure.candidate.artist}，但网易云现在没有给这首的播放链接。我换成 ${track.title} — ${track.artist}，不拿翻唱或混音版本凑数。`
  }
  return `网易云没找到前一首的可播放版本。我换成 ${track.title} — ${track.artist}。`
}

async function findPlayableFallback(triggerText: string, blocked: Set<string>): Promise<ResolvedTrack | null> {
  const seeds = await playlistSeeds(triggerText)
  const recent = new Set(Plays.recentTitles(24, 60).map(seedKey))
  let checked = 0

  for (const seed of seeds) {
    const key = seedKey(seed)
    if (blocked.has(key) || recent.has(key)) continue
    checked += 1
    const result = await resolvePlayableTrack(seed)
    if (result.track) return result.track
    if (checked >= 8) break
  }

  return null
}

async function playlistSeeds(triggerText: string): Promise<Seed[]> {
  let parsed: Record<string, Playlist>
  try {
    parsed = JSON.parse(await readFile(joinPath(activeCorpusDir(), "playlists.json"), "utf-8"))
  } catch {
    return []
  }

  const seen = new Set<string>()
  const ordered = Object.entries(parsed)
    .map(([key, playlist], index) => ({ key, playlist, index, score: playlistScore(key, playlist, triggerText) }))
    .sort((a, b) => a.score - b.score || a.index - b.index)

  const out: Seed[] = []
  for (const { playlist } of ordered) {
    for (const seed of playlist.seeds ?? []) {
      if (!seed.title || !seed.artist) continue
      const key = seedKey(seed)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(seed)
    }
  }
  return out
}

function playlistScore(key: string, playlist: Playlist, triggerText: string): number {
  const text = triggerText.toLowerCase()
  const haystack = `${key} ${playlist.label ?? ""} ${(playlist.mood ?? []).join(" ")}`.toLowerCase()
  let score = 100

  if (/华语|国语|中文|mandarin|chinese/.test(text) && /mandarin|chinese|国语|华语|中文|粤|hk|cantonese/.test(haystack)) score -= 60
  if (/粤|港|cantonese|eason|陈奕迅/.test(text) && /hk|cantonese|粤|港/.test(haystack)) score -= 70
  if (/夜|晚|凌晨|安静|睡|relax|calm|slowed|慢/.test(text) && /night|late|slowed|drift|入夜|深夜|漂流/.test(haystack)) score -= 50
  if (/r&b|rnb|sza|keshi|暧昧/.test(text) && /rnb|r&b|soft|暧昧/.test(haystack)) score -= 50
  if (/k-?pop|bigbang|韩/.test(text) && /kpop|k-pop|韩/.test(haystack)) score -= 50
  if (/电子|edm|lift|升空|illenium/.test(text) && /edm|electronic|电子|升空/.test(haystack)) score -= 50

  return score
}

function seedKey(seed: { title: string; artist: string }): string {
  return `${seed.title.trim().toLowerCase()}::${seed.artist.trim().toLowerCase()}`
}

function appendReason(reason: string | undefined, note: string | undefined): string | undefined {
  if (!note) return reason
  return reason ? `${reason} | ${note}` : note
}

function e2eTurn(triggerText: string, source: DJTurn["source"]): {
  say: string
  source: DJTurn["source"]
  reason: string
  segue: string
  tracks: ResolvedTrack[]
} {
  return {
    say: triggerText
      ? "收到。给你一首测试慢歌，先让节奏落下来。"
      : "晚上好。我先放一首测试慢歌，让频道热起来。",
    source,
    reason: "e2e stub: deterministic local turn",
    segue: "e2e stub: keep core flows deterministic",
    tracks: [{
      id: "e2e-slow-signal",
      title: "Slow Signal",
      artist: "Claudio Test",
      album: "E2E",
      duration: 147,
      cover: undefined,
      source: "ncm",
      url: "/tts/e2e-slow-signal.mp3",
    }],
  }
}

async function finalize({
  say,
  source,
  reason,
  segue,
  tracks,
}: {
  say: string
  source: DJTurn["source"]
  reason?: string
  segue?: string
  tracks: ResolvedTrack[]
}): Promise<DJTurn> {
  const ts = Date.now()
  const id = `dj-${ts}`
  Messages.insert({
    id,
    ts,
    kind: "dj",
    speaker: "Claudio",
    text: say,
    meta: { tracks, ttsUrl: "", ttsPending: true, source, reason, segue },
  })
  // Record first play so memory accumulates (skip flag stays 0 until user skips)
  if (tracks.length > 0) {
    const t = tracks[0]
    Plays.record({
      ts,
      track_id: t.id,
      title: t.title,
      artist: t.artist,
      duration_s: t.duration,
    })
    if (naimEnabled()) {
      pushToRoom(t.url, t.title, t.artist).catch(() => undefined)
    }
  }
  return { id, say, ttsUrl: "", ttsSilent: true, ttsPending: true, source, reason, segue, tracks, ts }
}

export async function hydrateTurnTts(
  turn: DJTurn,
  onReady?: (turn: DJTurn) => void,
): Promise<DJTurn> {
  if (!turn.ttsPending && turn.ttsUrl) return turn
  const tts = await synthesize(turn.say)
  const hydrated: DJTurn = {
    ...turn,
    ttsUrl: tts.url,
    ttsSilent: tts.silent,
    ttsPending: false,
  }
  Messages.updateMeta(turn.id, meta => ({
    ...meta,
    ttsUrl: tts.url,
    ttsPending: false,
  }))
  onReady?.(hydrated)
  return hydrated
}
