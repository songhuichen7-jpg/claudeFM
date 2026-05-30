import { useEffect, useRef } from "react"
import { Pause, Play } from "lucide-react"
import { usePlayer } from "../state/PlayerContext"
import type { DJMessage } from "../data/types"
import { WaveformBig } from "./Waveform"
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

      <div className="relative flex max-h-[94%] w-[88%] max-w-[400px] flex-col overflow-hidden rounded-[26px] bg-white text-black shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)]">
        {/* Dark top: header + waveform */}
        <div className="relative bg-[#0b0b0e] px-5 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CatAvatar size={22} className="ring-1 ring-white/20" />
              <span className="font-pixel text-[18px] tracking-[0.04em] text-white/90">Claudio</span>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-white/55">{fmt(currentTime)}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#34e29b" }} />
            <span className="font-mono text-[10px] tracking-[0.24em]" style={{ color: "#34e29b" }}>
              {activeDJId ? "SPEAKING…" : "ON AIR"}
            </span>
          </div>
          <div className="mt-3 h-12 text-white/85">
            <WaveformBig playing={isPlaying} color="#ffffff" height={48} />
          </div>
        </div>

        {/* White lower half */}
        <div className="flex min-h-0 flex-1 flex-col px-5 pt-4">
          <h2 className="font-sans text-[30px] font-bold leading-[1.04] tracking-[-0.01em]">{title}</h2>
          <p className="mt-1.5 font-sans text-[12.5px] text-black/45">{artist}</p>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="grid h-8 w-8 place-items-center rounded-full bg-black text-white"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="translate-x-px" />}
            </button>
            <div className="relative h-1 flex-1">
              <div className="absolute inset-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black/10" />
              <div
                className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black/70"
                style={{ width: total ? `${(currentTime / total) * 100}%` : "0%" }}
              />
            </div>
            <span className="font-sans text-[11px] tabular-nums text-black/40">
              {fmt(currentTime)} / {fmt(total)}
            </span>
          </div>

          <div ref={transcriptRef} className="thin-scroll relative mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-t-xl bg-black/[0.025] px-3.5 py-3.5">
            {djMessages.map(dj => (
              <Line key={dj.id} dj={dj} active={activeDJId === dj.id} elapsedMs={djElapsedMs} />
            ))}
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
