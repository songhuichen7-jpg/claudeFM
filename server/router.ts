import type { NcmTrack } from "./ncm.js"
import { resolveTrack, songUrl } from "./ncm.js"
import { askDJ, type DJOutput } from "./claude.js"
import { fallbackDJ } from "./fallback.js"
import { synthesize } from "./tts.js"
import { assemble, joinFragments } from "./context.js"
import { Messages, Plays, Prefs } from "./state.js"
import { pushToRoom, naimEnabled } from "./naim.js"

export type ResolvedTrack = NcmTrack & { url: string }

export type DJTurn = {
  id: string
  say: string
  ttsUrl: string
  ttsSilent: boolean
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
 *  - everything else (natural language) → claude
 */
export type Intent =
  | { kind: "command"; cmd: "skip" | "pause" | "play" | "like" | "unlike"; arg?: string }
  | { kind: "direct-music"; query: string }
  | { kind: "claude"; text: string }

export function classify(text: string): Intent {
  const t = text.trim()
  if (!t) return { kind: "claude", text: "" }

  // slash commands
  if (t.startsWith("/")) {
    const [cmd, ...rest] = t.slice(1).split(/\s+/)
    if (["skip", "next"].includes(cmd)) return { kind: "command", cmd: "skip", arg: rest.join(" ") }
    if (cmd === "pause") return { kind: "command", cmd: "pause" }
    if (cmd === "play") return { kind: "command", cmd: "play" }
    if (cmd === "like") return { kind: "command", cmd: "like" }
    if (cmd === "unlike") return { kind: "command", cmd: "unlike" }
  }

  // "play <X> by <Y>" / "放一首 <X>" / "听 <X>"
  const m1 = t.match(/^(?:play|放|来一首|听)\s+(.+?)(?:\s+(?:by|的)\s+(.+))?$/i)
  if (m1) {
    const query = m1[2] ? `${m1[1]} ${m1[2]}` : m1[1]
    return { kind: "direct-music", query }
  }

  return { kind: "claude", text: t }
}

export async function runUserTurn(text: string): Promise<DJTurn> {
  const ts = Date.now()
  const userId = `u-${ts}`
  Messages.insert({ id: userId, ts, kind: "user", speaker: "mmguo", text })

  const intent = classify(text)

  // direct-music: bypass claude, just resolve
  if (intent.kind === "direct-music") {
    const t = await resolveTrack({ title: intent.query })
    if (t) {
      const url = (await songUrl(t.id)) ?? ""
      if (url) {
        const resolved: ResolvedTrack = { ...t, url }
        return finalize({
          say: `好，给你放 ${t.title}。`,
          source: "user",
          reason: "direct music intent",
          tracks: [resolved],
        })
      }
    }
    return finalize({
      say: `没找到 ${intent.query}，要不你说个艺人名我再搜搜？`,
      source: "user",
      tracks: [],
    })
  }

  // claude path (default)
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
    console.warn("[router] claude failed, using fallback:", (err as Error).message)
    dj = await fallbackDJ(text)
  }

  Prefs.set("last_reason", dj.reason ?? "")
  Prefs.set("last_segue", dj.segue ?? "")

  const resolved: ResolvedTrack[] = []
  for (const seed of dj.play.slice(0, 3)) {
    const t = await resolveTrack(seed)
    if (!t) continue
    const url = await songUrl(t.id)
    if (!url) continue
    resolved.push({ ...t, url })
  }

  return finalize({
    say: dj.say || "（沉默了一下）",
    source: "user",
    reason: dj.reason,
    segue: dj.segue,
    tracks: resolved,
  })
}

export async function runScheduledBroadcast(
  reason: string,
  source: DJTurn["source"] = "scheduler",
): Promise<DJTurn> {
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
    console.warn("[router] scheduled claude failed, using fallback:", (err as Error).message)
    dj = await fallbackDJ(reason)
  }
  Prefs.set("last_reason", dj.reason ?? "")
  Prefs.set("last_segue", dj.segue ?? "")
  const resolved: ResolvedTrack[] = []
  for (const seed of dj.play.slice(0, 3)) {
    const t = await resolveTrack(seed)
    if (!t) continue
    const url = await songUrl(t.id)
    if (!url) continue
    resolved.push({ ...t, url })
  }
  return finalize({
    say: dj.say || "（沉默了一下）",
    source,
    reason: dj.reason,
    segue: dj.segue,
    tracks: resolved,
  })
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
  const tts = await synthesize(say)
  Messages.insert({
    id,
    ts,
    kind: "dj",
    speaker: "Claudio",
    text: say,
    meta: { tracks, ttsUrl: tts.url, source, reason, segue },
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
  return { id, say, ttsUrl: tts.url, ttsSilent: tts.silent, source, reason, segue, tracks, ts }
}
