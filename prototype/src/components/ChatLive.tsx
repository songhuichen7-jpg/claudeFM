import { useEffect, useRef } from "react"
import { Play } from "lucide-react"
import { usePrototype } from "../PrototypeContext"
import type { ChatMessage, Track } from "../types"

/**
 * The live chat stream — the spine of the home view. Monospace throughout,
 * hairline-bordered message bubbles, bordered ▸ track cards. The DJ's
 * current line karaoke-highlights word by word in the single accent green.
 */
export function ChatLive() {
  const { messages, activeDJId, djElapsedMs, replayDJ, selectTrack, liked, toggleLike } = usePrototype()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages.length])

  return (
    <div className="border-t border-white/8 px-4 pt-3 sm:px-5 light:border-black/10">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="font-pixel text-[14px] tracking-[0.06em] text-white/90 light:text-black/85">Claudio</span>
        </div>
        <span className="font-mono text-[9px] tracking-[0.3em]" style={{ color: "var(--accent)" }}>LIVE</span>
      </div>

      <div ref={ref} className="pb-2">
        <div className="py-2 text-center font-mono text-[9px] tracking-[0.3em] text-white/25 light:text-black/30">
          CONNECTED TO CLAUDIO SERVER
        </div>
        {messages.map(m => (
          <Row
            key={m.id}
            msg={m}
            active={activeDJId === m.id}
            elapsedMs={djElapsedMs}
            onReplay={replayDJ}
            onPlay={selectTrack}
            onLike={toggleLike}
            liked={liked}
          />
        ))}
      </div>
    </div>
  )
}

function Row({
  msg,
  active,
  elapsedMs,
  onReplay,
  onPlay,
  onLike,
  liked,
}: {
  msg: ChatMessage
  active: boolean
  elapsedMs: number
  onReplay: (id: string) => void
  onPlay: (t: Track) => void
  onLike: (id: string) => void
  liked: Record<string, boolean>
}) {
  if (msg.kind === "system") {
    return (
      <div className="py-2.5 text-center font-mono text-[9px] tracking-[0.3em] text-white/25 light:text-black/30">
        {msg.text}
      </div>
    )
  }

  if (msg.kind === "user") {
    return (
      <div className="my-2 flex flex-col items-end">
        <span className="mb-1 font-mono text-[9px] tracking-[0.26em] text-white/35 light:text-black/40">
          VEKO · {msg.timestamp}
        </span>
        <div className="max-w-[80%] rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-[13px] leading-relaxed text-white/85 light:border-black/10 light:bg-black/[0.03] light:text-black/85">
          {msg.text}
        </div>
      </div>
    )
  }

  return (
    <div className="my-3">
      <div className="mb-1 flex items-center gap-2">
        <span className="font-mono text-[9px] tracking-[0.26em] text-white/45 light:text-black/45">CLAUDIO</span>
        {active && (
          <span className="font-mono text-[9px] tracking-[0.26em]" style={{ color: "var(--accent)" }}>· LIVE</span>
        )}
      </div>
      <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3.5 py-3 light:border-black/8 light:bg-black/[0.02]">
        <p className="font-mono text-[13px] leading-[1.7] text-white/85 light:text-black/85">
          {msg.words.map((w, i) => {
            if (!w.text.trim()) return <span key={i}>{w.text}</span>
            let cls = ""
            if (active) {
              if (elapsedMs >= w.start && elapsedMs <= w.end) cls = "word active"
              else if (elapsedMs > w.end) cls = "word past"
              else cls = "word"
            }
            return <span key={i} className={cls}>{w.text}</span>
          })}
        </p>
        {msg.recommends?.length ? (
          <div className="mt-2.5 flex flex-col gap-1">
            {msg.recommends.map(t => (
              <TrackCard key={t.id} track={t} onPlay={() => onPlay(t)} onLike={() => onLike(t.id)} liked={!!liked[t.id]} />
            ))}
          </div>
        ) : null}
      </div>
      <div className="mt-1 flex items-center gap-3 pl-0.5">
        <span className="font-mono text-[9px] tracking-[0.24em] text-white/30 light:text-black/40">{msg.timestamp}</span>
        {msg.hasReplay && (
          <button
            type="button"
            onClick={() => onReplay(msg.id)}
            className="inline-flex items-center gap-1 font-mono text-[9px] tracking-[0.2em] text-white/45 transition-colors hover:text-white/85 light:text-black/45 light:hover:text-black/85"
          >
            <Play size={8} fill="currentColor" /> REPLAY
          </button>
        )}
      </div>
    </div>
  )
}

function TrackCard({
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
    <div
      className={`group flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 transition-colors ${
        liked
          ? "border-[color:var(--accent)]/40"
          : "border-white/8 hover:border-white/20 light:border-black/10 light:hover:border-black/25"
      }`}
      style={liked ? { borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)", background: "var(--accent-soft)" } : undefined}
    >
      <button type="button" onClick={onPlay} aria-label="Play" className="text-white/55 transition-colors hover:text-white light:text-black/55 light:hover:text-black">
        <Play size={13} fill="currentColor" />
      </button>
      <button type="button" onClick={onPlay} className="min-w-0 flex-1 text-left">
        <div className="truncate font-mono text-[12px] tracking-[0.01em] text-white/85 light:text-black/85">
          {track.title}
          <span className="mx-1 text-white/30">·</span>
          <span className="text-white/55 light:text-black/55">{track.artist}</span>
        </div>
        {track.era && (
          <div className="font-mono text-[8.5px] tracking-[0.26em] text-white/30 light:text-black/40">{track.era}</div>
        )}
      </button>
      <button
        type="button"
        onClick={onLike}
        aria-label="Like"
        className="font-mono text-[14px] leading-none transition-opacity"
        style={{ color: liked ? "var(--accent)" : undefined }}
      >
        <span className={liked ? "" : "text-white/25 opacity-0 group-hover:opacity-100 light:text-black/30"}>
          {liked ? "♥" : "♡"}
        </span>
      </button>
    </div>
  )
}
