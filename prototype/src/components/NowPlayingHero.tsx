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
    <section className="relative flex flex-col items-center px-4 pt-3 pb-4">
      {/* Artwork panel — square, dominant */}
      <button
        type="button"
        onClick={onOpenFocus}
        aria-label="Open focus view"
        className="group relative aspect-square w-full max-w-[260px] sm:max-w-[280px] md:max-w-[300px] overflow-hidden rounded-full border border-white/10 bg-[#0a090f] light:border-black/10"
      >
        {currentTrack?.cover ? (
          <>
            <img
              src={currentTrack.cover}
              alt=""
              className={clsx(
                "absolute inset-0 h-full w-full object-cover transition-[transform,opacity] duration-500",
                isPlaying && "vinyl-spin",
              )}
              loading="lazy"
            />
            {/* Vinyl center dot */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: 36,
                height: 36,
                background: "rgba(0,0,0,0.85)",
                boxShadow: `inset 0 0 0 1px ${currentMood.accent}55, 0 0 12px ${currentMood.accent}40`,
              }}
            >
              <div
                className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: currentMood.accent }}
              />
            </div>
          </>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse at 30% 20%, ${currentMood.accent}55 0%, transparent 55%),
                  radial-gradient(ellipse at 70% 80%, ${currentMood.accent}33 0%, transparent 60%),
                  #0a090f
                `,
              }}
            />
            <div className="dot-matrix pointer-events-none absolute inset-0 opacity-40" aria-hidden />
            <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-white/85">
              <WaveformBig playing={isPlaying} />
            </div>
          </>
        )}

        {/* Mood-tinted vignette + bottom darken for legibility of overlays */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 30% 20%, ${currentMood.accent}33 0%, transparent 55%),
              linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.55) 100%)
            `,
          }}
        />

      </button>

      {/* Tonearm — anchored to top-right of the vinyl. Subtle pixel-y indicator
          that something is "playing" without overlaying the cover itself. */}
      {currentTrack?.cover && (
        <div
          aria-hidden
          className="pointer-events-none absolute right-[calc(50%-150px)] top-2 hidden md:block"
        >
          <div
            className="h-20 w-px origin-top rotate-[28deg]"
            style={{
              background: `linear-gradient(to bottom, transparent, ${currentMood.accent}aa)`,
              opacity: isPlaying ? 1 : 0.35,
              transition: "opacity 400ms",
            }}
          />
          <div
            className="absolute -right-1 -top-1 h-2 w-2 rounded-full"
            style={{
              background: currentMood.accent,
              boxShadow: `0 0 8px ${currentMood.accent}aa`,
              opacity: isPlaying ? 1 : 0.4,
            }}
          />
        </div>
      )}

      {/* Title */}
      <div className="mt-4 sm:mt-5 w-full text-center">
        <h2 className="font-serif text-[24px] sm:text-[26px] md:text-[28px] leading-[1.05] text-white light:text-black/90">
          <span className="italic">{title}</span>
        </h2>
        <p className="mt-1 font-mono text-[11.5px] sm:text-[12px] tracking-[0.04em] text-white/55 light:text-black/55">
          {artist}
          {era ? <span className="text-white/30 light:text-black/30">  ·  {era}</span> : null}
        </p>
      </div>

      {/* Progress */}
      <div className="mt-3 sm:mt-4 flex w-full items-center gap-3">
        <span className="font-pixel text-[10px] tracking-[0.18em] text-white/55 tabular-nums light:text-black/55">
          {fmt(currentTime)}
        </span>
        <Progress pct={pct} onSeek={p => seek(p * totalSec)} accent={currentMood.accent} />
        <span className="font-pixel text-[10px] tracking-[0.18em] text-white/55 tabular-nums light:text-black/55">
          {fmt(totalSec)}
        </span>
      </div>

      {/* Controls — Like, Prev, big Play, Next, More */}
      <div className="mt-3 sm:mt-4 flex items-center justify-center gap-4 sm:gap-6">
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
          className="grid h-12 w-12 place-items-center rounded-full text-black transition-transform hover:scale-[1.04] active:scale-[0.96] sm:h-14 sm:w-14"
          style={{
            background: currentMood.accent,
            boxShadow: `0 8px 24px -6px ${currentMood.accent}88, 0 0 0 1px ${currentMood.accent}33`,
          }}
        >
          {isPlaying ? (
            <Pause size={22} fill="currentColor" />
          ) : (
            <Play size={22} fill="currentColor" className="translate-x-0.5" />
          )}
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
