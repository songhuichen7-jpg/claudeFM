import { Heart, Pause, Play, SkipBack, SkipForward, Square } from "lucide-react"
import { clsx } from "clsx"
import { usePrototype } from "../PrototypeContext"

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

/**
 * Mono transport bar matching the original: an EQ glyph + track + state on
 * the left, hairline icon transport on the right, a thin progress line, then
 * a QUEUE / N TRACKS meta row. All monospace, single green accent.
 */
export function PlayerBar() {
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
    upcoming,
  } = usePrototype()

  const total = currentTrack?.duration ?? duration ?? 0
  const pct = total > 0 ? Math.min(1, currentTime / total) : 0
  const isLiked = currentTrack ? !!liked[currentTrack.id] : false

  return (
    <div className="border-t border-white/8 px-4 pt-3 pb-2.5 sm:px-5 light:border-black/10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <EqGlyph playing={isPlaying} />
          <div className="min-w-0">
            <div className="truncate font-mono text-[12.5px] tracking-[0.02em] text-white/90 light:text-black/85">
              {currentTrack?.title ?? "—"}
              <span className="mx-1 text-white/30">·</span>
              <span className="text-white/55 light:text-black/55">{currentTrack?.artist ?? "Claudio FM"}</span>
            </div>
            <div
              className="font-mono text-[9px] tracking-[0.3em]"
              style={{ color: isPlaying ? "var(--accent)" : undefined }}
            >
              <span className={isPlaying ? "" : "text-white/35 light:text-black/40"}>
                {isPlaying ? "PLAYING" : currentTrack ? "PAUSED" : "STANDBY"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 text-white/65 light:text-black/60">
          <Icon label="Previous" onClick={prev}><SkipBack size={15} /></Icon>
          <Icon label={isPlaying ? "Pause" : "Play"} onClick={togglePlay}>
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          </Icon>
          <Icon label="Next" onClick={next}><SkipForward size={15} /></Icon>
          <Icon label="Stop" onClick={stop}><Square size={12} fill="currentColor" /></Icon>
          <Icon label="Like" onClick={() => toggleLike()} className={clsx(isLiked && "!text-pink-400")}>
            <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
          </Icon>
          <TextBtn onClick={toggleHideChat}>{hideChat ? "SHOW" : "HIDE"}</TextBtn>
          <TextBtn>FAV</TextBtn>
          <Vol volume={volume} setVolume={setVolume} />
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-3">
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
          <div
            className="absolute left-0 top-1/2 h-px -translate-y-1/2"
            style={{ width: `${pct * 100}%`, background: "var(--accent)" }}
          />
          <div
            className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
            style={{ left: `${pct * 100}%`, background: "var(--accent)" }}
          />
        </button>
        <span className="font-mono text-[10px] tabular-nums text-white/45 light:text-black/45">{fmt(total)}</span>
      </div>

      <div className="mt-2 flex items-center justify-between font-mono text-[9px] tracking-[0.3em] text-white/30 light:text-black/35">
        <span>QUEUE</span>
        <span>{upcoming.length} TRACKS</span>
      </div>
    </div>
  )
}

function EqGlyph({ playing }: { playing: boolean }) {
  return (
    <div className="flex h-5 w-5 shrink-0 items-end gap-[2px]" aria-hidden>
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
        "grid h-7 w-7 place-items-center rounded-md transition-colors hover:bg-white/8 hover:text-white light:hover:bg-black/8 light:hover:text-black",
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
      className="rounded-md px-1.5 py-1 font-mono text-[9px] tracking-[0.24em] text-white/45 transition-colors hover:bg-white/8 hover:text-white/85 light:text-black/45 light:hover:bg-black/8 light:hover:text-black/85"
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
