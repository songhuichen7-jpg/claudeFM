import { useEffect, useRef } from "react"
import { Pause, Play } from "lucide-react"
import { usePlayer } from "../state/PlayerContext"
import type { DJMessage } from "../data/types"
import { Waveform, WaveformBig } from "./Waveform"
import { CatAvatar } from "./CatAvatar"

const ACCENT = "#1f9e6e" // darker green so it reads on the white card
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

type Props = { open: boolean; onClose: () => void }

/**
 * The signature "Speaking" view: a white card floating over a deep
 * atmospheric backdrop. Dark top (Claudio header + waveform) flows into a
 * white lower half with a bold system-sans song title and a live,
 * timestamped transcript that karaoke-highlights as the DJ talks.
 */
export function FocusView({ open, onClose }: Props) {
  const { currentTrack, currentTime, isPlaying, togglePlay, messages, activeDJId, djElapsedMs } = usePlayer()
  const total = currentTrack?.duration ?? 0
  const title = currentTrack?.title ?? "—"
  const artist = currentTrack?.artist ?? "Claudio FM"
  const speaking = !!activeDJId
  const compact = typeof window !== "undefined" && window.innerWidth < 640
  const transcriptRef = useRef<HTMLDivElement>(null)

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

  const djMessages = messages.filter(m => m.kind === "dj") as DJMessage[]

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden">
      <Atmosphere />
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0" />

      <div className="panel-enter relative flex max-h-[94%] w-[66vw] max-w-[708px] min-w-[320px] flex-col overflow-hidden rounded-[34px] bg-white text-black shadow-[0_44px_130px_-30px_rgba(0,0,0,0.86)] max-sm:w-[88vw]">
        {/* Dark top: header + waveform */}
        <div className="relative bg-[#08090c] px-8 pt-8 pb-0 max-sm:px-5 max-sm:pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CatAvatar size={40} mobileSize={30} className="ring-1 ring-white/20" />
              <span className="font-pixel text-[42px] leading-none tracking-[0.04em] text-white/90 max-sm:text-[28px]">Claudio</span>
            </div>
            <span className="font-mono text-[20px] tabular-nums text-white/70 max-sm:text-[13px]">{fmt(currentTime)}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#34e29b" }} />
            <span className="font-mono text-[16px] tracking-[0.02em] max-sm:text-[11px]" style={{ color: "#34e29b" }}>
              {speaking ? "Speaking..." : "On air"}
            </span>
          </div>
          <div className="mt-12 h-[150px] text-white/85 max-sm:mt-6 max-sm:h-[84px]">
            <WaveformBig playing={isPlaying || speaking} color="#ffffff" height={compact ? 84 : 150} />
          </div>
        </div>

        {/* White lower half */}
        <div className="focus-sheet -mt-8 flex min-h-0 flex-1 flex-col bg-white px-8 pt-10 pb-6 max-sm:-mt-5 max-sm:px-5 max-sm:pt-7 max-sm:pb-4">
          <h2 className="font-sans text-[48px] font-bold leading-[1.04] tracking-[-0.01em] max-sm:text-[30px]">{title}</h2>
          <p className="mt-2 font-sans text-[18px] text-black/45 max-sm:text-[12.5px]">{artist}</p>

          <div className="mt-6 flex items-center gap-4 max-sm:mt-4 max-sm:gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="pressable grid h-11 w-11 place-items-center rounded-full bg-black text-white max-sm:h-8 max-sm:w-8"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="translate-x-px" />}
            </button>
            <div className="relative h-2 flex-1">
              <div className="absolute inset-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black/10" />
              <div
                className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black/70"
                style={{ width: total ? `${(currentTime / total) * 100}%` : "0%" }}
              />
            </div>
            <span className="font-sans text-[16px] tabular-nums text-black/40 max-sm:text-[11px]">
              {fmt(currentTime)} / {fmt(total)}
            </span>
          </div>

          <div ref={transcriptRef} className="focus-transcript thin-scroll relative mt-6 min-h-[210px] flex-1 space-y-5 overflow-y-auto rounded-[24px] px-6 py-6 max-sm:mt-4 max-sm:min-h-[180px] max-sm:space-y-3 max-sm:px-3.5 max-sm:py-3.5">
            {djMessages.map(dj => (
              <Line key={dj.id} dj={dj} active={activeDJId === dj.id} elapsedMs={djElapsedMs} />
            ))}
          </div>

          <div className="mt-6 flex items-center gap-4 max-sm:mt-4 max-sm:gap-2">
            <span className="w-12 font-sans text-[17px] tabular-nums text-black/70 max-sm:w-10 max-sm:text-[12px]">{fmt(currentTime)}</span>
            <div className="min-w-0 flex-1 overflow-hidden text-black">
              <Waveform playing={isPlaying || speaking} bars={112} height={28} color="#111111" />
            </div>
            <button
              type="button"
              onClick={togglePlay}
              className="pressable grid h-12 w-12 place-items-center rounded-full bg-black text-white max-sm:h-9 max-sm:w-9"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="translate-x-px" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Line({ dj, active, elapsedMs }: { dj: DJMessage; active: boolean; elapsedMs: number }) {
  return (
    <div data-active={active ? "true" : "false"}>
      <div className="font-sans text-[11px] text-black/40">Claudio · {dj.timestamp}</div>
      <p className="mt-0.5 font-sans text-[16px] leading-[1.45]">
        {dj.words.map((w, i) => {
          if (!w.text.trim()) return <span key={i}>{w.text}</span>
          let style: React.CSSProperties | undefined
          let cls = "transition-colors duration-200 "
          if (active) {
            if (elapsedMs >= w.start && elapsedMs <= w.end) style = { color: ACCENT }
            else if (elapsedMs > w.end) cls += "text-black"
            else cls += "text-black/30"
          } else {
            cls += "text-black/55"
          }
          return (
            <span key={i} className={cls} style={style}>
              {w.text}
            </span>
          )
        })}
      </p>
    </div>
  )
}

/** Deep, calm cosmic backdrop — layered low-alpha radials + a star-dot
 * texture. Atmospheric, not a flat "AI gradient" blob. */
function Atmosphere() {
  return (
    <div aria-hidden className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 50% at 50% 18%, rgba(64,84,150,0.22) 0%, transparent 60%)," +
            "radial-gradient(60% 50% at 78% 88%, rgba(96,70,140,0.16) 0%, transparent 60%)," +
            "#05060a",
        }}
      />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.7), transparent)," +
            "radial-gradient(1px 1px at 70% 20%, rgba(255,255,255,0.5), transparent)," +
            "radial-gradient(1px 1px at 40% 70%, rgba(255,255,255,0.6), transparent)," +
            "radial-gradient(1px 1px at 85% 60%, rgba(255,255,255,0.45), transparent)," +
            "radial-gradient(1px 1px at 55% 45%, rgba(255,255,255,0.4), transparent)," +
            "radial-gradient(1px 1px at 12% 80%, rgba(255,255,255,0.5), transparent)",
          backgroundSize: "320px 320px",
        }}
      />
    </div>
  )
}
