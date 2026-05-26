import { Heart, MoreHorizontal, Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { clsx } from "clsx"
import { usePrototype } from "../PrototypeContext"
import { WaveformBig } from "./Waveform"

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${String(r).padStart(2, "0")}`
}

type Props = { onOpenFocus?: () => void }

export function NowPlayingHero({ onOpenFocus }: Props) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    liked,
    currentMood,
    togglePlay,
    next,
    prev,
    toggleLike,
    seek,
  } = usePrototype()

  const totalSec = currentTrack?.duration ?? duration ?? 0
  const pct = totalSec > 0 ? Math.min(1, currentTime / totalSec) : 0
  const isLiked = currentTrack ? !!liked[currentTrack.id] : false
  const title = currentTrack?.title ?? "（待机中）"
  const artist = currentTrack?.artist ?? "Claudio FM"
  const era = currentTrack?.era ?? ""

  return (
    <section className="relative flex flex-col items-center px-5 pb-4">
      {/* Artwork panel — square, dominant */}
      <button
        type="button"
        onClick={onOpenFocus}
        aria-label="Open focus view"
        className="group relative aspect-square w-full max-w-[300px] overflow-hidden rounded-[24px] border border-white/10 light:border-black/10"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, ${currentMood.accent}55 0%, transparent 55%),
            radial-gradient(ellipse at 70% 80%, ${currentMood.accent}33 0%, transparent 60%),
            #0a090f
          `,
        }}
      >
        <div className="dot-matrix pointer-events-none absolute inset-0 opacity-40" aria-hidden />

        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-[#29ffb8]" aria-hidden />
          <span className="font-pixel text-[10px] tracking-[0.24em] text-[#29ffb8]">ON AIR</span>
        </div>
        {era && (
          <div className="absolute right-3 top-3 font-pixel text-[10px] tracking-[0.24em] text-white/60">
            {era.split("·")[0]?.trim()}
          </div>
        )}

        {/* Big internal waveform */}
        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-white/85">
          <WaveformBig playing={isPlaying} />
        </div>

        <div className="absolute left-3 bottom-3 right-3 flex items-end justify-between">
          <span className="font-pixel text-[10px] tracking-[0.24em] text-white/55">
            CLAUDIO × {artist.toUpperCase()}
          </span>
          <span className="font-pixel text-[10px] tracking-[0.24em] text-white/55">FM</span>
        </div>
      </button>

      {/* Title */}
      <div className="mt-5 w-full text-center">
        <h2 className="font-serif text-[28px] leading-[1.05] text-white light:text-black/90">
          <span className="italic">{title}</span>
        </h2>
        <p className="mt-1 font-mono text-[12px] tracking-[0.04em] text-white/55 light:text-black/55">
          {artist}
          {era ? <span className="text-white/30 light:text-black/30">  ·  {era}</span> : null}
        </p>
      </div>

      {/* Progress */}
      <div className="mt-4 flex w-full items-center gap-3">
        <span className="font-pixel text-[10px] tracking-[0.18em] text-white/55 tabular-nums light:text-black/55">
          {fmt(currentTime)}
        </span>
        <Progress pct={pct} onSeek={p => seek(p * totalSec)} accent={currentMood.accent} />
        <span className="font-pixel text-[10px] tracking-[0.18em] text-white/55 tabular-nums light:text-black/55">
          {fmt(totalSec)}
        </span>
      </div>

      {/* Controls — Like, Prev, big Play, Next, More */}
      <div className="mt-4 flex items-center justify-center gap-6">
        <IconBtn
          label="Like"
          onClick={() => toggleLike()}
          className={clsx(isLiked && "text-pink-400")}
        >
          <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
        </IconBtn>
        <IconBtn label="Previous" onClick={prev}>
          <SkipBack size={22} fill="currentColor" />
        </IconBtn>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="grid h-14 w-14 place-items-center rounded-full bg-white text-black transition-transform hover:scale-[1.04] active:scale-[0.96] light:bg-black light:text-white"
        >
          {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="translate-x-0.5" />}
        </button>
        <IconBtn label="Next" onClick={next}>
          <SkipForward size={22} fill="currentColor" />
        </IconBtn>
        <IconBtn label="More">
          <MoreHorizontal size={20} />
        </IconBtn>
      </div>
    </section>
  )
}

function IconBtn({
  children,
  label,
  onClick,
  className,
}: {
  children: React.ReactNode
  label: string
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={clsx(
        "grid h-9 w-9 place-items-center rounded-full text-white/75 transition-colors",
        "hover:bg-white/8 hover:text-white",
        "light:text-black/70 light:hover:bg-black/8 light:hover:text-black",
        className,
      )}
    >
      {children}
    </button>
  )
}

function Progress({ pct, onSeek, accent }: { pct: number; onSeek: (p: number) => void; accent: string }) {
  return (
    <button
      type="button"
      className="group relative h-4 w-full"
      onClick={e => {
        const r = e.currentTarget.getBoundingClientRect()
        onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)))
      }}
    >
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-white/10 light:bg-black/12" />
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full"
        style={{ width: `${pct * 100}%`, background: accent }}
      />
      <div
        className="absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full transition-transform group-hover:scale-110"
        style={{ left: `${pct * 100}%`, background: accent, boxShadow: `0 0 12px ${accent}99` }}
      />
    </button>
  )
}
