import {
  Heart,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react"
import { clsx } from "clsx"
import { usePlayer } from "../state/PlayerContext"
import { Waveform } from "./Waveform"

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${String(r).padStart(2, "0")}`
}

type PlayerProps = { onOpenFocus?: () => void }

export function Player({ onOpenFocus }: PlayerProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    liked,
    hideChat,
    favsMode,
    togglePlay,
    next,
    prev,
    stop,
    toggleLike,
    setVolume,
    seek,
    toggleHideChat,
    toggleFavsMode,
  } = usePlayer()

  const totalSec = currentTrack?.duration ?? duration ?? 0
  const pct = totalSec > 0 ? Math.min(1, currentTime / totalSec) : 0
  const isLiked = currentTrack ? !!liked[currentTrack.id] : false
  const title = currentTrack?.title ?? "（待机中）"
  const artist = currentTrack?.artist ?? "Claudio FM"

  return (
    <section className="mx-3 mb-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 pt-3 pb-3 light:border-black/10 light:bg-black/[0.02]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenFocus}
          aria-label="Open focus view"
          className="text-white/85 transition-opacity hover:opacity-80 light:text-black/80"
        >
          <Waveform playing={isPlaying} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-serif text-[19px] leading-tight text-white light:text-black/90">
            <span className="italic">{title}</span>
            <span className="mx-1.5 text-white/30 light:text-black/30">—</span>
            <span className="text-white/85 light:text-black/75">{artist}</span>
          </div>
          <div className="font-pixel text-[10px] tracking-[0.28em] text-[#0a8e6a] dark:text-[#29ffb8]">
            {isPlaying ? "PLAYING" : currentTrack ? "PAUSED" : "STANDBY"}
          </div>
        </div>

        <div className="flex items-center gap-1 text-white/70 light:text-black/65">
          <IconBtn label="Previous" onClick={prev}><SkipBack size={16} /></IconBtn>
          <IconBtn label={isPlaying ? "Pause" : "Play"} onClick={togglePlay} active>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </IconBtn>
          <IconBtn label="Next" onClick={next}><SkipForward size={16} /></IconBtn>
          <IconBtn label="Stop" onClick={stop}><Square size={14} fill="currentColor" /></IconBtn>
          <IconBtn
            label="Like"
            onClick={() => toggleLike()}
            className={clsx(isLiked && "text-pink-400")}
          >
            <Heart size={15} fill={isLiked ? "currentColor" : "none"} />
          </IconBtn>
          <button
            type="button"
            onClick={toggleHideChat}
            className="ml-1 rounded-md px-2 py-1 font-pixel text-[10px] tracking-[0.22em] text-white/55 hover:bg-white/5 hover:text-white/85 light:text-black/55 light:hover:bg-black/5 light:hover:text-black/80"
          >
            {hideChat ? "SHOW" : "HIDE"}
          </button>
          <button
            type="button"
            onClick={toggleFavsMode}
            aria-pressed={favsMode}
            title="只看收藏的播报"
            className={clsx(
              "rounded-md px-2 py-1 font-pixel text-[10px] tracking-[0.22em] transition-colors",
              favsMode
                ? "bg-pink-400/15 text-pink-300 light:bg-pink-500/15 light:text-pink-700"
                : "text-white/55 hover:bg-white/5 hover:text-white/85 light:text-black/55 light:hover:bg-black/5 light:hover:text-black/80",
            )}
          >
            FAV
          </button>
          <VolumeSlider volume={volume} setVolume={setVolume} />
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-3">
        <span className="font-pixel text-[10px] tracking-[0.2em] text-white/55 tabular-nums light:text-black/55">
          {fmt(currentTime)}
        </span>
        <Progress pct={pct} onSeek={p => seek(p * totalSec)} />
        <span className="font-pixel text-[10px] tracking-[0.2em] text-white/55 tabular-nums light:text-black/55">
          {fmt(totalSec)}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between font-pixel text-[10px] tracking-[0.22em] text-white/35 light:text-black/35">
        <span>QUEUE</span>
        <span>0 TRACKS</span>
      </div>
    </section>
  )
}

function IconBtn({
  children,
  label,
  onClick,
  active = false,
  className,
}: {
  children: React.ReactNode
  label: string
  onClick?: () => void
  active?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={clsx(
        "grid h-7 w-7 place-items-center rounded-md transition-colors",
        "hover:bg-white/8 hover:text-white light:hover:bg-black/10 light:hover:text-black",
        active && "bg-white/10 text-white light:bg-black/10 light:text-black",
        className,
      )}
    >
      {children}
    </button>
  )
}

function Progress({ pct, onSeek }: { pct: number; onSeek: (p: number) => void }) {
  return (
    <button
      type="button"
      className="group relative h-4 w-full"
      onClick={e => {
        const r = e.currentTarget.getBoundingClientRect()
        onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)))
      }}
    >
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full bg-white/10 light:bg-black/15" />
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full bg-white/85 light:bg-black/75"
        style={{ width: `${pct * 100}%` }}
      />
      <div
        className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white opacity-0 transition-opacity group-hover:opacity-100 light:bg-black"
        style={{ left: `${pct * 100}%` }}
      />
    </button>
  )
}

function VolumeSlider({ volume, setVolume }: { volume: number; setVolume: (v: number) => void }) {
  return (
    <div className="ml-2 flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
        className="text-white/55 hover:text-white light:text-black/55 light:hover:text-black"
        aria-label="Volume"
      >
        {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(volume * 100)}
        onChange={e => setVolume(Number(e.target.value) / 100)}
        className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/12 accent-white outline-none light:bg-black/15"
        aria-label="Volume slider"
      />
    </div>
  )
}
