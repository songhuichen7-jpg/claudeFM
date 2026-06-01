import { Heart, Pause, Play, SkipBack, SkipForward, Square } from "lucide-react"
import { clsx } from "clsx"
import { usePlayer } from "../state/PlayerContext"

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

type Props = { onOpenFocus?: () => void }

/**
 * Mono transport bar (the prototype's PlayerBar): EQ glyph + track + state,
 * hairline icon transport, and a thin progress line.
 * Single green accent. (Historically named Player.)
 */
export function Player({ onOpenFocus }: Props) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    liked,
    hideChat,
    togglePlay,
    next,
    prev,
    stop,
    toggleLike,
    setVolume,
    seek,
    toggleHideChat,
  } = usePlayer()

  const total = currentTrack?.duration ?? duration ?? 0
  const pct = total > 0 ? Math.min(1, currentTime / total) : 0
  const isLiked = currentTrack ? !!liked[currentTrack.id] : false

  return (
    <div className="relative z-10 border-y border-white/8 bg-black/22 px-7 pt-3 pb-2.5 sm:px-8 light:border-black/10 light:bg-white/18">
      <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
        <div className="flex min-w-0 items-center gap-2.5 max-sm:w-full">
          <button
            type="button"
            onClick={onOpenFocus}
            aria-label="Open focus view"
            className="pressable shrink-0"
          >
            <EqGlyph playing={isPlaying} />
          </button>
          <div className="min-w-0">
            <div className="truncate font-mono text-[14px] tracking-[0.02em] text-white/90 light:text-black/85">
              {currentTrack?.title ?? "—"}
              <span className="mx-1 text-white/30">·</span>
              <span className="text-white/55 light:text-black/55">{currentTrack?.artist ?? "Claudio FM"}</span>
            </div>
            <div className="mt-0.5 font-mono text-[10px] tracking-[0.3em]" style={{ color: isPlaying ? "var(--accent)" : undefined }}>
              <span className={isPlaying ? "" : "text-white/35 light:text-black/40"}>
                {isPlaying ? "PLAYING" : currentTrack ? "PAUSED" : "STANDBY"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-white/65 light:text-black/60 max-sm:w-full max-sm:justify-between">
          <Icon label="Previous" onClick={prev}><SkipBack size={15} /></Icon>
          <Icon label={isPlaying ? "Pause" : "Play"} onClick={togglePlay} dataTestId="transport-play">
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          </Icon>
          <Icon label="Next" onClick={next}><SkipForward size={15} /></Icon>
          <Icon label="Stop" onClick={stop}><Square size={12} fill="currentColor" /></Icon>
          <Icon label="Like" onClick={() => toggleLike()} dataTestId="transport-like" className={clsx(isLiked && "!text-pink-400")}>
            <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
          </Icon>
          <TextBtn onClick={toggleHideChat}>{hideChat ? "SHOW" : "HIDE"}</TextBtn>
          <TextBtn>FAV</TextBtn>
          <Vol volume={volume} setVolume={setVolume} />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <span className="font-mono text-[10px] tabular-nums text-white/45 light:text-black/45">{fmt(currentTime)}</span>
        <button
          type="button"
          className="group relative h-3 flex-1"
          onClick={e => {
            const r = e.currentTarget.getBoundingClientRect()
            seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * total)
          }}
        >
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/12 light:bg-black/15" />
          <div className="absolute left-0 top-1/2 h-px -translate-y-1/2" style={{ width: `${pct * 100}%`, background: "var(--accent)" }} />
          <div
            className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
            style={{ left: `${pct * 100}%`, background: "var(--accent)" }}
          />
        </button>
        <span className="font-mono text-[10px] tabular-nums text-white/45 light:text-black/45">{fmt(total)}</span>
      </div>
    </div>
  )
}

function EqGlyph({ playing }: { playing: boolean }) {
  return (
    <div className="flex h-5 w-5 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2, 3].map(i => (
        <span
          key={i}
          className="w-[2.5px] rounded-sm"
          style={{
            background: "var(--accent)",
            height: playing ? undefined : "30%",
            animation: playing ? `eq 900ms ease-in-out ${i * 140}ms infinite` : "none",
          }}
        />
      ))}
      <style>{`@keyframes eq { 0%,100%{height:25%} 50%{height:100%} }`}</style>
    </div>
  )
}

function Icon({
  children,
  label,
  onClick,
  className,
  dataTestId,
}: {
  children: React.ReactNode
  label: string
  onClick?: () => void
  className?: string
  dataTestId?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-testid={dataTestId}
      onClick={onClick}
      className={clsx(
        "pressable grid h-8 w-8 place-items-center rounded-full border border-white/10 hover:border-white/18 hover:bg-white/8 hover:text-white light:border-black/10 light:hover:bg-black/8 light:hover:text-black",
        className,
      )}
    >
      {children}
    </button>
  )
}

function TextBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable rounded-full border border-white/10 px-2.5 py-1.5 font-mono text-[9px] tracking-[0.24em] text-white/45 hover:border-white/18 hover:bg-white/8 hover:text-white/85 light:border-black/10 light:text-black/45 light:hover:bg-black/8 light:hover:text-black/85"
    >
      {children}
    </button>
  )
}

function Vol({ volume, setVolume }: { volume: number; setVolume: (v: number) => void }) {
  return (
    <div className="ml-1 hidden items-center gap-1.5 sm:flex">
      <span className="font-mono text-[9px] tracking-[0.24em] text-white/40 light:text-black/45">VOL</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(volume * 100)}
        onChange={e => setVolume(Number(e.target.value) / 100)}
        className="h-1 w-14 cursor-pointer appearance-none rounded-full bg-white/12 outline-none light:bg-black/15"
        style={{ accentColor: "var(--accent)" }}
        aria-label="Volume"
      />
    </div>
  )
}
