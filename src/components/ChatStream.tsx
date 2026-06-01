import { useEffect, useRef } from "react"
import { Play } from "lucide-react"
import { usePlayer } from "../state/PlayerContext"
import type { ChatMessage, Track } from "../data/types"
import { CatAvatar } from "./CatAvatar"

/**
 * The live chat stream — the spine of the home view (the prototype's ChatLive).
 * Monospace throughout, hairline-bordered message bubbles, ▸ track cards, the
 * DJ's current line karaoke-highlights word by word in the single accent.
 * (Historically named ChatStream.)
 */
export function ChatStream() {
  const { messages, activeDJId, djElapsedMs, replayDJ, selectTrack, liked, toggleLike, status, connected } = usePlayer()
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" })
    })
    return () => window.cancelAnimationFrame(raf)
  }, [activeDJId, messages, status])

  return (
    <section className="relative z-10 flex min-h-0 flex-1 flex-col px-7 pt-0 sm:px-8">
      <div className="mx-[-1.75rem] flex items-center justify-between border-b border-white/8 bg-black/35 px-7 py-3 light:border-black/10 light:bg-white/28 sm:mx-[-2rem] sm:px-8">
        <div className="flex items-center gap-2">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="font-pixel text-[22px] tracking-[0.06em] text-white/90 light:text-black/85">Claudio</span>
        </div>
        <span className="font-mono text-[9px] tracking-[0.3em]" style={{ color: "var(--accent)" }}>LIVE</span>
      </div>

      <div ref={scrollRef} className="thin-scroll min-h-0 flex-1 overflow-y-auto pb-7 pr-1">
        <div
          className={
            connected
              ? "py-2 text-center font-mono text-[9px] tracking-[0.3em] text-white/25 light:text-black/30"
              : "live-dot py-2 text-center font-mono text-[9px] tracking-[0.3em] text-white/45 light:text-black/45"
          }
        >
          {connected ? "CONNECTED TO CLAUDIO SERVER" : "CONNECTING TO CLAUDIO SERVER…"}
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
        {status === "thinking" && (
          <div className="py-3 text-center font-mono text-[9px] tracking-[0.28em] text-white/35 light:text-black/40">
            CLAUDIO IS TUNING…
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </section>
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
      <div className="my-2 flex items-start justify-end gap-3">
        <div className="flex min-w-0 max-w-[82%] flex-col items-end">
          <span className="mb-1 font-mono text-[9px] tracking-[0.26em] text-white/35 light:text-black/40">
            VEKO · {msg.timestamp}
          </span>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-[13px] leading-relaxed text-white/85 light:border-black/10 light:bg-black/[0.03] light:text-black/85">
            {msg.text}
          </div>
        </div>
        <CatAvatar who="veko" size={36} className="mt-5 shrink-0 ring-1 ring-white/15" />
      </div>
    )
  }

  return (
    <div className="my-5 flex items-start gap-3.5">
      <CatAvatar size={36} className="mt-6 shrink-0 ring-1 ring-white/15" />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="font-mono text-[9px] tracking-[0.26em] text-white/45 light:text-black/45">CLAUDIO</span>
          {active && (
            <span className="font-mono text-[9px] tracking-[0.26em]" style={{ color: "var(--accent)" }}>· LIVE</span>
          )}
        </div>
        <div className="rounded-md border border-white/10 bg-black/78 px-4 py-3.5 shadow-[0_18px_44px_-32px_rgba(0,0,0,0.9)] light:border-black/8 light:bg-white/70">
          <p className="font-mono text-[14px] leading-[1.62] text-white/90 light:text-black/85">
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
            <div className="mt-3 flex flex-col gap-1.5">
              {msg.recommends.map(t => (
                <TrackCard key={t.id} track={t} onPlay={() => onPlay(t)} onLike={() => onLike(t.id)} liked={!!liked[t.id]} />
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-2 flex items-center gap-3 pl-0.5">
          <span className="font-mono text-[9px] tracking-[0.24em] text-white/30 light:text-black/40">{msg.timestamp}</span>
          {msg.hasReplay && (
            <button
              type="button"
              onClick={() => onReplay(msg.id)}
              className="pressable inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 font-mono text-[9px] tracking-[0.2em] text-white/45 hover:border-white/18 hover:text-white/85 light:border-black/10 light:text-black/45 light:hover:text-black/85"
            >
              <Play size={8} fill="currentColor" /> REPLAY
            </button>
          )}
        </div>
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
      className="group flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 transition-[background-color,border-color] duration-150 ease-[var(--ease-out)]"
      style={
        liked
          ? { borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)", background: "var(--accent-soft)" }
          : { borderColor: "rgba(255,255,255,0.08)" }
      }
    >
      <button type="button" onClick={onPlay} aria-label="Play" className="pressable text-white/55 hover:text-white light:text-black/55 light:hover:text-black">
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
        className="pressable font-mono text-[14px] leading-none"
        style={{ color: liked ? "var(--accent)" : undefined }}
      >
        <span className={liked ? "" : "text-white/25 opacity-0 group-hover:opacity-100 light:text-black/30"}>
          {liked ? "♥" : "♡"}
        </span>
      </button>
    </div>
  )
}
