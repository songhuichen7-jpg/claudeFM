import { useEffect, useRef } from "react"
import { ChevronDown } from "lucide-react"
import { usePrototype } from "../PrototypeContext"
import type { ChatMessage, DJMessage, Track } from "../types"
import { Play, PlayCircle } from "lucide-react"
import { InputBar } from "./InputBar"

type Props = { open: boolean; onClose: () => void }

export function ChatSheet({ open, onClose }: Props) {
  const { messages, activeDJId, djElapsedMs, replayDJ, selectTrack } = usePrototype()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [open, messages.length])

  if (!open) return null

  return (
    <div className="absolute inset-0 z-40 flex flex-col" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close chat backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[4px]"
      />
      <div className="mt-12 relative flex flex-1 flex-col overflow-hidden rounded-t-[28px] border-t border-x border-white/10 bg-[#0a090f]/95 backdrop-blur-2xl shadow-[0_-30px_60px_-20px_rgba(0,0,0,0.6)]">
        {/* drag handle */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="mx-auto mt-2 grid h-7 w-12 place-items-center rounded-full"
        >
          <span className="h-1 w-9 rounded-full bg-white/20" />
        </button>

        <div className="flex items-center justify-between px-5 pt-1 pb-3">
          <div className="flex items-center gap-2">
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-[#29ffb8]" />
            <span className="font-pixel text-[13px] tracking-[0.18em] text-white">
              Claudio
            </span>
            <span className="font-pixel text-[10px] tracking-[0.24em] text-[#29ffb8]">LIVE</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        <div ref={listRef} className="thin-scroll flex-1 overflow-y-auto px-3 pb-2">
          {messages.map(m => (
            <Row
              key={m.id}
              msg={m}
              activeDJId={activeDJId}
              djElapsedMs={djElapsedMs}
              onReplay={replayDJ}
              onPlayTrack={t => {
                selectTrack(t)
                onClose()
              }}
            />
          ))}
        </div>

        <div className="border-t border-white/8 pt-1">
          <InputBar />
        </div>
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
      <div className="my-3 flex items-center justify-center gap-2 font-pixel text-[10px] tracking-[0.28em] text-white/35">
        <span className="h-px w-8 bg-white/10" />
        <span>{msg.text}</span>
        <span className="h-px w-8 bg-white/10" />
      </div>
    )
  }
  if (msg.kind === "user") {
    return (
      <div className="my-2 flex items-end justify-end gap-2 pl-12">
        <div className="rounded-2xl rounded-br-md bg-white/8 px-3.5 py-2 font-serif text-[15px] leading-snug text-white/90">
          {msg.text}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-pixel text-[9px] tracking-[0.18em] text-white/40">
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
          <span className="font-pixel text-[11px] tracking-[0.22em] text-white/80">CLAUDIO</span>
          <span className="font-pixel text-[9px] tracking-[0.18em] text-white/35">• DJ</span>
        </div>
        <div className="rounded-2xl rounded-tl-md border border-white/6 bg-white/[0.04] px-3.5 py-2.5">
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
          <span className="font-pixel text-[9px] tracking-[0.2em] text-white/35">
            {msg.timestamp}
          </span>
          {msg.hasReplay ? (
            <button
              type="button"
              onClick={() => onReplay(msg.id)}
              className="inline-flex items-center gap-1 font-pixel text-[10px] tracking-[0.16em] text-white/65 hover:text-white"
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

function DJWords({ msg, active, elapsedMs }: { msg: DJMessage; active: boolean; elapsedMs: number }) {
  return (
    <p className="font-serif text-[15.5px] leading-[1.55] text-white/85">
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
      className="group flex w-full items-center gap-2.5 rounded-xl border border-white/6 bg-black/30 px-2.5 py-1.5 text-left transition-colors hover:border-white/15 hover:bg-black/40"
    >
      <PlayCircle size={22} className="shrink-0 text-white/70 transition-colors group-hover:text-[#29ffb8]" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-serif text-[14px] leading-tight text-white/95">
          <span className="italic">{track.title}</span>
          <span className="mx-1 text-white/30">·</span>
          <span className="text-white/70">{track.artist}</span>
        </div>
        {track.era && (
          <div className="font-pixel text-[9px] tracking-[0.22em] text-white/35">
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
