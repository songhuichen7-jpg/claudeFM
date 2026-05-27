import { useMemo, useState } from "react"
import { Heart, Play, PlayCircle } from "lucide-react"
import { clsx } from "clsx"
import { usePrototype } from "../PrototypeContext"
import type { ChatMessage, Track } from "../types"

/**
 * The single-column "evening transcript". Combines DJ turns, user
 * messages, system stamps, and (optionally) filters down to just events
 * around ♥'d tracks. Replaces the old Chat / Up Next / Library sidebar.
 */
export function Timeline() {
  const {
    messages,
    activeDJId,
    djElapsedMs,
    replayDJ,
    selectTrack,
    toggleLike,
    liked,
    upcoming,
    currentMood,
  } = usePrototype()
  const [filter, setFilter] = useState<"all" | "liked">("all")

  const filtered = useMemo(() => {
    if (filter === "all") return messages
    return messages.filter(m => {
      if (m.kind !== "dj") return false
      return m.recommends?.some(t => liked[t.id])
    })
  }, [messages, filter, liked])

  return (
    <section className="mx-auto w-full max-w-[640px] px-4">
      <header className="flex items-center justify-between border-b border-white/8 pb-2 light:border-black/10">
        <div className="flex items-center gap-2">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-[#29ffb8]" />
          <span className="font-pixel text-[11px] tracking-[0.24em] text-white/85 light:text-black/85">
            EVENING TRANSCRIPT
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-white/10 p-0.5 light:border-black/10">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>ALL</FilterChip>
          <FilterChip
            active={filter === "liked"}
            onClick={() => setFilter("liked")}
            accent={currentMood.accent}
          >
            <Heart size={9} fill="currentColor" className="mr-0.5 inline-block" />
            ONLY
          </FilterChip>
        </div>
      </header>

      <ol className="relative">
        {upcoming.length > 0 && filter === "all" && (
          <UpNextPreviewRow accent={currentMood.accent} />
        )}
        {[...filtered].reverse().map(m => (
          <EventRow
            key={m.id}
            msg={m}
            activeDJId={activeDJId}
            djElapsedMs={djElapsedMs}
            onReplay={replayDJ}
            onPlayTrack={selectTrack}
            onToggleLike={toggleLike}
            liked={liked}
          />
        ))}
        {filter === "liked" && filtered.length === 0 && (
          <div className="py-12 text-center font-mono text-[12px] text-white/40 light:text-black/40">
            还没 ♥ 过 Claudio 推的歌
          </div>
        )}
      </ol>
    </section>
  )
}

function FilterChip({
  children,
  active,
  onClick,
  accent,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  accent?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-full px-2.5 py-0.5 font-pixel text-[9.5px] tracking-[0.22em] transition-colors",
        active
          ? "bg-white/15 text-white light:bg-black/15 light:text-black"
          : "text-white/45 hover:text-white/75 light:text-black/45 light:hover:text-black/75",
      )}
      style={active && accent ? { color: accent } : undefined}
    >
      {children}
    </button>
  )
}

function UpNextPreviewRow({ accent }: { accent: string }) {
  const { upcoming, selectTrack } = usePrototype()
  const first = upcoming[0]
  if (!first) return null
  return (
    <li className="relative grid grid-cols-[60px_1fr] gap-3 py-3 border-b border-dashed border-white/8 light:border-black/10">
      <div className="flex flex-col items-end pt-0.5">
        <span className="font-pixel text-[9.5px] tracking-[0.24em]" style={{ color: accent }}>
          UP NEXT
        </span>
        <span className="font-pixel text-[8.5px] tracking-[0.22em] text-white/30 light:text-black/35">
          IN ~{Math.floor((first.track.duration ?? 240) / 60)}M
        </span>
      </div>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => selectTrack(first.track)}
          className="group flex w-full items-center gap-3 text-left"
        >
          <div className="flex-1 min-w-0">
            <div className="truncate font-serif text-[15.5px] leading-tight text-white light:text-black/90">
              <span className="italic">{first.track.title}</span>
              <span className="mx-1.5 text-white/30 light:text-black/30">·</span>
              <span className="text-white/75 light:text-black/70">{first.track.artist}</span>
            </div>
            <div className="mt-0.5 line-clamp-1 font-mono text-[11px] text-white/45 light:text-black/50">
              "{first.caption}"
            </div>
          </div>
          <PlayCircle
            size={20}
            className="shrink-0 text-white/40 transition-colors group-hover:text-white/85 light:text-black/40 light:group-hover:text-black/85"
          />
        </button>
      </div>
    </li>
  )
}

function EventRow({
  msg,
  activeDJId,
  djElapsedMs,
  onReplay,
  onPlayTrack,
  onToggleLike,
  liked,
}: {
  msg: ChatMessage
  activeDJId: string | null
  djElapsedMs: number
  onReplay: (id: string) => void
  onPlayTrack: (t: Track) => void
  onToggleLike: (id: string) => void
  liked: Record<string, boolean>
}) {
  if (msg.kind === "system") {
    return (
      <li className="py-3 text-center">
        <span className="font-pixel text-[10px] tracking-[0.28em] text-white/30 light:text-black/35">
          ── {msg.text} ──
        </span>
      </li>
    )
  }

  if (msg.kind === "user") {
    return (
      <li className="grid grid-cols-[60px_1fr] gap-3 py-3 border-b border-white/6 light:border-black/8">
        <span className="font-pixel text-[10px] tracking-[0.24em] text-white/35 text-right pt-0.5 light:text-black/40">
          {msg.timestamp}
        </span>
        <div>
          <span className="font-pixel text-[10px] tracking-[0.22em] text-white/45 light:text-black/45">
            你
          </span>
          <p className="mt-0.5 font-serif text-[15px] leading-snug text-white/90 light:text-black/85">
            {msg.text}
          </p>
        </div>
      </li>
    )
  }

  const isActive = msg.id === activeDJId
  return (
    <li className="relative grid grid-cols-[60px_1fr] gap-3 py-3 border-b border-white/6 light:border-black/8">
      <div className="text-right pt-0.5">
        <span className="font-pixel text-[10px] tracking-[0.24em] text-white/35 light:text-black/40">
          {msg.timestamp}
        </span>
        {isActive && (
          <div className="mt-1 inline-flex items-center gap-1 font-pixel text-[8.5px] tracking-[0.22em] text-[#29ffb8]">
            <span className="live-dot inline-block h-1 w-1 rounded-full bg-[#29ffb8]" />
            LIVE
          </div>
        )}
      </div>
      <div className="min-w-0">
        <span className="font-pixel text-[10px] tracking-[0.22em] text-white/55 light:text-black/55">
          CLAUDIO
        </span>
        <p className="mt-0.5 font-serif text-[15.5px] leading-[1.55] text-white/90 light:text-black/85">
          {msg.words.map((w, i) => {
            if (!w.text.trim()) return <span key={i}>{w.text}</span>
            let cls = ""
            if (isActive) {
              if (djElapsedMs >= w.start && djElapsedMs <= w.end) cls = "word active"
              else if (djElapsedMs > w.end) cls = "word past"
              else cls = "word"
            }
            return (
              <span key={i} className={cls}>
                {w.text}
              </span>
            )
          })}
        </p>
        {msg.recommends?.length ? (
          <div className="mt-2 flex flex-col gap-1.5">
            {msg.recommends.map(t => (
              <TimelineTrackCard
                key={t.id}
                track={t}
                onPlay={() => onPlayTrack(t)}
                onLike={() => onToggleLike(t.id)}
                liked={!!liked[t.id]}
              />
            ))}
          </div>
        ) : null}
        {msg.hasReplay && (
          <button
            type="button"
            onClick={() => onReplay(msg.id)}
            className="mt-2 inline-flex items-center gap-1 font-pixel text-[9.5px] tracking-[0.16em] text-white/45 transition-colors hover:text-white/85 light:text-black/45 light:hover:text-black/85"
          >
            <Play size={9} fill="currentColor" />
            REPLAY
          </button>
        )}
      </div>
    </li>
  )
}

function TimelineTrackCard({
  track,
  onPlay,
  onLike,
  liked,
}: {
  track: Track
  onPlay: () => void
  onLike: () => void
  liked: boolean
}) {
  return (
    <div className="group flex items-center gap-2.5 rounded-lg border border-white/8 bg-white/[0.025] px-2 py-1.5 transition-colors hover:border-white/15 hover:bg-white/[0.05] light:border-black/10 light:bg-white/50 light:hover:border-black/20 light:hover:bg-white/70">
      <button
        type="button"
        onClick={onPlay}
        className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md transition-transform hover:scale-[1.04]"
        aria-label="Play"
      >
        {track.cover ? (
          <img src={track.cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center bg-black/40">
            <PlayCircle size={18} className="text-white/70" />
          </span>
        )}
      </button>
      <button type="button" onClick={onPlay} className="min-w-0 flex-1 text-left">
        <div className="truncate font-serif text-[13.5px] leading-tight text-white/95 light:text-black/90">
          <span className="italic">{track.title}</span>
          <span className="mx-1 text-white/30 light:text-black/30">·</span>
          <span className="text-white/70 light:text-black/65">{track.artist}</span>
        </div>
        {track.era && (
          <div className="font-pixel text-[9px] tracking-[0.22em] text-white/35 light:text-black/40">
            {track.era}
          </div>
        )}
      </button>
      <button
        type="button"
        onClick={onLike}
        aria-label="Like"
        className={clsx(
          "grid h-7 w-7 place-items-center rounded-full transition-colors hover:bg-white/8 light:hover:bg-black/8",
          liked
            ? "text-pink-400"
            : "text-white/35 opacity-0 group-hover:opacity-100 light:text-black/35",
        )}
      >
        <Heart size={13} fill={liked ? "currentColor" : "none"} />
      </button>
    </div>
  )
}
