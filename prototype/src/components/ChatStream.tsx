import { useEffect, useRef } from "react"
import { Play, PlayCircle } from "lucide-react"
import { usePrototype } from "../PrototypeContext"
import type { ChatMessage, DJMessage, Track } from "../types"

export function ChatStream() {
  const { messages, activeDJId, djElapsedMs, replayDJ, selectTrack } = usePrototype()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages.length])

  return (
    <div className="mx-3 mb-3 flex-1 overflow-hidden">
      <div className="flex items-center justify-between border-t border-white/8 px-1 pt-3 pb-1 light:border-black/10">
        <div className="flex items-center gap-2 text-white/85 light:text-black/80">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-[#29ffb8]" />
          <span className="font-pixel text-[12px] tracking-[0.18em]">Claudio</span>
        </div>
        <span className="font-pixel text-[10px] tracking-[0.22em] text-[#0a8e6a] dark:text-[#29ffb8]">LIVE</span>
      </div>

      <div
        ref={ref}
        className="thin-scroll relative h-full max-h-[320px] overflow-y-auto pr-1 pb-2 pt-1"
      >
        {messages.map(m => (
          <Row
            key={m.id}
            msg={m}
            activeDJId={activeDJId}
            djElapsedMs={djElapsedMs}
            onReplay={replayDJ}
            onPlayTrack={selectTrack}
          />
        ))}
      </div>
    </div>
  )
}

function Row({
  msg,
  activeDJId,
  djElapsedMs,
  onReplay,
  onPlayTrack,
}: {
  msg: ChatMessage
  activeDJId: string | null
  djElapsedMs: number
  onReplay: (id: string) => void
  onPlayTrack: (t: Track) => void
}) {
  if (msg.kind === "system") {
    return (
      <div className="my-3 flex items-center justify-center gap-2 font-pixel text-[10px] tracking-[0.28em] text-white/35 light:text-black/35">
        <span className="h-px w-8 bg-white/10 light:bg-black/10" />
        <span>{msg.text}</span>
        <span className="h-px w-8 bg-white/10 light:bg-black/10" />
      </div>
    )
  }

  if (msg.kind === "user") {
    return (
      <div className="my-2 flex items-end justify-end gap-2 pl-12">
        <div className="rounded-2xl rounded-br-md bg-white/8 px-3.5 py-2 font-serif text-[15px] leading-snug text-white/90 light:bg-black/8 light:text-black/85">
          {msg.text}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-pixel text-[9px] tracking-[0.18em] text-white/40 light:text-black/40">
            {msg.timestamp}
          </span>
          <UserAvatar />
        </div>
      </div>
    )
  }

  return (
    <div className="my-2 flex gap-2 pr-8">
      <DJAvatar />
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-baseline gap-1.5">
          <span className="font-pixel text-[11px] tracking-[0.22em] text-white/80 light:text-black/75">
            CLAUDIO
          </span>
          <span className="font-pixel text-[9px] tracking-[0.18em] text-white/35 light:text-black/40">
            • DJ
          </span>
        </div>
        <div className="rounded-2xl rounded-tl-md border border-white/6 bg-white/[0.04] px-3.5 py-2.5 light:border-black/8 light:bg-black/[0.03]">
          <DJWords msg={msg} active={activeDJId === msg.id} elapsedMs={djElapsedMs} />
          {msg.recommends?.length ? (
            <div className="mt-2.5 flex flex-col gap-1.5">
              {msg.recommends.map(t => (
                <TrackCard key={t.id} track={t} onPlay={() => onPlayTrack(t)} />
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2 pl-1">
          <span className="font-pixel text-[9px] tracking-[0.2em] text-white/35 light:text-black/40">
            {msg.timestamp}
          </span>
          {msg.hasReplay ? (
            <button
              type="button"
              onClick={() => onReplay(msg.id)}
              className="inline-flex items-center gap-1 font-pixel text-[10px] tracking-[0.16em] text-white/65 hover:text-white light:text-black/65 light:hover:text-black"
            >
              <Play size={9} fill="currentColor" />
              REPLAY
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function DJWords({
  msg,
  active,
  elapsedMs,
}: {
  msg: DJMessage
  active: boolean
  elapsedMs: number
}) {
  return (
    <p className="font-serif text-[15.5px] leading-[1.55] text-white/85 light:text-black/85">
      {msg.words.map((w, i) => {
        if (!w.text.trim()) return <span key={i}>{w.text}</span>
        let cls = ""
        if (active) {
          if (elapsedMs >= w.start && elapsedMs <= w.end) cls = "word active"
          else if (elapsedMs > w.end) cls = "word past"
          else cls = "word"
        }
        return (
          <span key={i} className={cls}>
            {w.text}
          </span>
        )
      })}
    </p>
  )
}

function TrackCard({ track, onPlay }: { track: Track; onPlay: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group flex w-full items-center gap-2.5 rounded-xl border border-white/6 bg-black/30 px-2.5 py-1.5 text-left transition-colors hover:border-white/15 hover:bg-black/40 light:border-black/8 light:bg-white/40 light:hover:border-black/20"
    >
      <PlayCircle
        size={22}
        className="shrink-0 text-white/70 transition-colors group-hover:text-[#29ffb8] light:text-black/70"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-serif text-[14px] leading-tight text-white/95 light:text-black/85">
          <span className="italic">{track.title}</span>
          <span className="mx-1 text-white/30">·</span>
          <span className="text-white/70 light:text-black/65">{track.artist}</span>
        </div>
        {track.era && (
          <div className="font-pixel text-[9px] tracking-[0.22em] text-white/35 light:text-black/40">
            {track.era}
            {track.album ? ` · ${track.album}` : ""}
          </div>
        )}
      </div>
    </button>
  )
}

function DJAvatar() {
  return (
    <div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500/40 to-fuchsia-500/30 ring-1 ring-white/15">
      <span className="font-pixel text-[11px] text-white">C</span>
    </div>
  )
}

function UserAvatar() {
  return (
    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-400/60 to-rose-500/40 ring-1 ring-white/15">
      <span className="font-pixel text-[9px] text-white">m</span>
    </div>
  )
}
