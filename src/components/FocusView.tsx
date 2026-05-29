import { useEffect, useMemo, useRef } from "react"
import { ChevronDown, Pause, Play } from "lucide-react"
import { usePlayer } from "../state/PlayerContext"
import type { DJMessage, DJSegment, WordToken } from "../data/types"
import { Waveform } from "./Waveform"
import { CatAvatar } from "./CatAvatar"

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${String(r).padStart(2, "0")}`
}

/** "Claudio · 0:01" style label — broadcast-relative offset, not wall clock. */
function fmtOffset(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

type Props = { open: boolean; onClose: () => void }

export function FocusView({ open, onClose }: Props) {
  const {
    currentTrack,
    duration,
    messages,
    activeDJId,
    djElapsedMs,
    isTtsPlaying,
    ttsElapsedSec,
    toggleTtsPlay,
  } = usePlayer()
  const totalSec = currentTrack?.duration ?? duration ?? 0
  const transcriptRef = useRef<HTMLDivElement>(null)

  // Pick the headline broadcast: the one Claudio is currently speaking, else
  // the most recent one. Its segment + first recommend drive the big card.
  const headline = useMemo<DJMessage | null>(() => {
    const djs = messages.filter(m => m.kind === "dj") as DJMessage[]
    if (activeDJId) {
      const a = djs.find(m => m.id === activeDJId)
      if (a) return a
    }
    return djs[djs.length - 1] ?? null
  }, [messages, activeDJId])

  const segmentLabel = headline?.segment ?? (currentTrack ? "Now Playing" : "Claudio FM")
  const headlineTrack = headline?.recommends?.[0]
  const trackTitle = currentTrack?.title ?? headlineTrack?.title ?? "—"
  const trackArtist = currentTrack?.artist ?? headlineTrack?.artist ?? "Claudio FM"

  // Auto-scroll the active sentence into view as TTS progresses
  useEffect(() => {
    if (!open) return
    const el = transcriptRef.current?.querySelector('[data-active="true"]') as HTMLElement | null
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [open, activeDJId, djElapsedMs])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  const isLive = activeDJId === headline?.id
  const ttsTimer = fmt(ttsElapsedSec)

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <CatAvatar size={26} className="ring-1 ring-white/15" />
          <span className="font-pixel text-[22px] tracking-[0.02em]">Claudio</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-pixel text-[11px] tabular-nums text-white/65">
            {ttsTimer}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close focus view"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 pb-3">
        <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-[#29ffb8]" />
        <span className="font-pixel text-[11px] tracking-[0.22em] text-[#29ffb8]">
          {isLive ? "Speaking..." : "ON AIR"}
        </span>
      </div>

      <div className="relative mx-4 mt-2 flex-1 overflow-hidden rounded-3xl bg-white text-black">
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white to-white/0" />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-white/0" />
        <div className="absolute right-5 top-5 font-pixel text-[11px] tabular-nums text-black/45">
          {fmt(totalSec)}
        </div>
        <div className="px-6 pt-6 pb-2 font-serif">
          <h2 className="break-words text-[34px] leading-[1.05]">{segmentLabel}</h2>
          <p className="mt-1 font-mono text-[12px] tracking-[0.04em] text-black/55">
            <span className="italic">{trackTitle}</span>
            <span className="mx-1.5 text-black/30">—</span>
            <span>{trackArtist}</span>
          </p>
          <div className="mt-4 h-px w-full bg-black/12" />
        </div>
        <div ref={transcriptRef} className="thin-scroll max-h-[42vh] space-y-4 overflow-y-auto px-6 pt-2 pb-10">
          {headline ? (
            headline.segments.length > 0 ? (
              headline.segments.map((seg, idx) => (
                <SegmentLine
                  key={idx}
                  seg={seg}
                  active={isLive && djElapsedMs >= seg.startMs - 80 && djElapsedMs <= seg.endMs + 240}
                  elapsedMs={djElapsedMs}
                />
              ))
            ) : (
              // Fallback: legacy DJ messages with no segments[] — render the whole
              // say as a single block so old broadcasts still display.
              <SegmentLine
                seg={{ text: headline.text, startMs: 0, endMs: headline.duration, words: headline.words }}
                active={isLive}
                elapsedMs={djElapsedMs}
              />
            )
          ) : (
            <p className="font-mono text-[12px] text-black/40">
              （还没有 Claudio 的播报。先随便和她聊几句。）
            </p>
          )}
        </div>
      </div>

      {/* Bottom TTS control dock: elapsed time, equalizer waveform, round play/pause */}
      <div className="mt-3 flex items-center gap-3 px-5">
        <span className="font-pixel text-[12px] tabular-nums text-white/75 tracking-[0.05em]">
          {ttsTimer}
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="flex h-[26px] items-center text-white/85">
            <Waveform playing={isTtsPlaying} bars={26} height={22} />
          </div>
        </div>
        <button
          type="button"
          onClick={toggleTtsPlay}
          aria-label={isTtsPlaying ? "Pause speech" : "Play speech"}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/12 text-white/90 backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          {isTtsPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between px-5 pb-5 font-pixel text-[10px] tracking-[0.32em] text-white/35">
        <span>CLAUDIO × MMGUO</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1 w-1 rounded-full bg-[#29ffb8]" />
          ON AIR
        </span>
      </div>
    </div>
  )
}

function SegmentLine({
  seg,
  active,
  elapsedMs,
}: {
  seg: DJSegment
  active: boolean
  elapsedMs: number
}) {
  return (
    <div data-active={active ? "true" : "false"}>
      <div className="font-mono text-[11px] tracking-[0.04em] text-black/45">
        Claudio · {fmtOffset(seg.startMs)}
      </div>
      <p className="mt-1 font-serif text-[20px] leading-snug text-black">
        {seg.words.map((w: WordToken, i: number) => {
          if (!w.text.trim()) return <span key={i}>{w.text}</span>
          let cls = "transition-colors duration-200"
          if (active) {
            if (elapsedMs >= w.start && elapsedMs <= w.end)
              cls += " text-[#29ffb8] [text-shadow:0_0_14px_rgba(41,255,184,0.35)]"
            else if (elapsedMs > w.end) cls += " text-black"
            else cls += " text-black/55"
          } else {
            cls += " text-black/60"
          }
          return (
            <span key={i} className={cls}>
              {w.text}
            </span>
          )
        })}
      </p>
    </div>
  )
}
