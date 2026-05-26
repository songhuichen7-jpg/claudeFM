import { useEffect, useRef, useState } from "react"
import { clsx } from "clsx"
import { Play, PlayCircle, X, Heart, Music } from "lucide-react"
import { usePrototype } from "../PrototypeContext"
import type { ChatMessage, DJMessage, Track } from "../types"
import { InputBar } from "./InputBar"
import { LibraryTab } from "./LibraryTab"

export type SidePanelTab = "chat" | "queue" | "library"

type Props = {
  tab: SidePanelTab
  setTab: (t: SidePanelTab) => void
}

export function SidePanel({ tab, setTab }: Props) {
  const { messages } = usePrototype()
  const lastMsgIdRef = useRef<string | null>(null)

  // When a new DJ turn arrives while user is on a non-chat tab, briefly
  // signal the chat tab so the user knows there's a new message.
  const [chatBadge, setChatBadge] = useState(false)
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (!last) return
    if (lastMsgIdRef.current === last.id) return
    lastMsgIdRef.current = last.id
    if (tab !== "chat" && last.kind === "dj") setChatBadge(true)
  }, [messages, tab])
  useEffect(() => {
    if (tab === "chat") setChatBadge(false)
  }, [tab])

  return (
    <aside className="relative flex w-[400px] shrink-0 flex-col border-l border-white/8 light:border-black/10">
      <div className="flex items-center gap-1 px-3 pt-3 pb-2">
        <TabBtn active={tab === "chat"} onClick={() => setTab("chat")} badge={chatBadge && tab !== "chat"}>
          Chat
        </TabBtn>
        <TabBtn active={tab === "queue"} onClick={() => setTab("queue")}>
          Up Next
        </TabBtn>
        <TabBtn active={tab === "library"} onClick={() => setTab("library")}>
          Library
        </TabBtn>
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "chat" && <ChatTab />}
        {tab === "queue" && <QueueTab />}
        {tab === "library" && <LibraryTab />}
      </div>

      {tab === "chat" && (
        <div className="border-t border-white/8 light:border-black/10">
          <InputBar />
        </div>
      )}
    </aside>
  )
}

function TabBtn({
  children,
  active,
  onClick,
  badge,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  badge?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "relative rounded-full px-3 py-1.5 font-pixel text-[11px] tracking-[0.18em] transition-colors",
        active
          ? "bg-white/10 text-white light:bg-black/10 light:text-black"
          : "text-white/55 hover:bg-white/[0.05] hover:text-white/85 light:text-black/55 light:hover:bg-black/[0.05] light:hover:text-black/85",
      )}
    >
      {children}
      {badge && (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#29ffb8] shadow-[0_0_6px_rgba(41,255,184,0.7)]" />
      )}
    </button>
  )
}

// -------- Chat tab --------

function ChatTab() {
  const { messages, activeDJId, djElapsedMs, replayDJ, selectTrack } = usePrototype()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages.length])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-[#29ffb8]" />
          <h3 className="font-pixel text-[13px] tracking-[0.18em] text-white light:text-black/90">
            Claudio
          </h3>
          <span className="font-pixel text-[10px] tracking-[0.24em] text-[#29ffb8]">LIVE</span>
        </div>
        <span className="font-pixel text-[9.5px] tracking-[0.24em] text-white/35 light:text-black/40">
          {messages.length} · TODAY
        </span>
      </div>
      <div ref={ref} className="thin-scroll flex-1 overflow-y-auto px-3 pb-3">
        {messages.map(m => (
          <ChatRow
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

function ChatRow({
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
      <div className="my-2 flex items-end justify-end gap-2 pl-8">
        <div className="rounded-2xl rounded-br-md bg-white/8 px-3 py-1.5 font-serif text-[14px] leading-snug text-white/90 light:bg-black/8 light:text-black/85">
          {msg.text}
        </div>
        <span className="font-pixel text-[9px] tracking-[0.18em] text-white/40 light:text-black/40">
          {msg.timestamp}
        </span>
      </div>
    )
  }
  return (
    <div className="my-2 flex gap-2 pr-2">
      <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500/40 to-fuchsia-500/30 ring-1 ring-white/15">
        <span className="font-pixel text-[10px] text-white">C</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="rounded-2xl rounded-tl-md border border-white/6 bg-white/[0.04] px-3 py-2 light:border-black/8 light:bg-black/[0.03]">
          <DJWords msg={msg} active={activeDJId === msg.id} elapsedMs={djElapsedMs} />
          {msg.recommends?.length ? (
            <div className="mt-2 flex flex-col gap-1.5">
              {msg.recommends.map(t => (
                <TrackChip key={t.id} track={t} onPlay={() => onPlayTrack(t)} />
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
              className="inline-flex items-center gap-1 font-pixel text-[9.5px] tracking-[0.16em] text-white/65 hover:text-white light:text-black/60 light:hover:text-black"
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
    <p className="font-serif text-[14.5px] leading-[1.55] text-white/85 light:text-black/85">
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

function TrackChip({ track, onPlay }: { track: Track; onPlay: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group flex w-full items-center gap-2.5 rounded-lg border border-white/6 bg-black/30 px-2.5 py-1.5 text-left transition-colors hover:border-white/15 hover:bg-black/40"
    >
      <PlayCircle size={20} className="shrink-0 text-white/70 transition-colors group-hover:text-[#29ffb8]" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-serif text-[13.5px] leading-tight text-white/95">
          <span className="italic">{track.title}</span>
          <span className="mx-1 text-white/30">·</span>
          <span className="text-white/70">{track.artist}</span>
        </div>
        {track.era && (
          <div className="font-pixel text-[9px] tracking-[0.22em] text-white/35">
            {track.era}
          </div>
        )}
      </div>
    </button>
  )
}

// -------- Queue tab --------

function QueueTab() {
  const { upcoming, currentTrack, selectTrack, toggleLike, liked } = usePrototype()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h3 className="font-pixel text-[13px] tracking-[0.18em] text-white">Up Next</h3>
        <span className="font-pixel text-[10px] tracking-[0.24em] text-white/40">
          {upcoming.length} TRACKS
        </span>
      </div>
      <div className="thin-scroll flex-1 overflow-y-auto px-3 pb-3">
        {currentTrack && (
          <div className="mb-3 rounded-xl border border-[#29ffb8]/30 bg-[#29ffb8]/[0.06] px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[9px] tracking-[0.24em] text-[#29ffb8]">NOW</span>
              <Music size={11} className="text-[#29ffb8]" />
            </div>
            <div className="mt-1 truncate font-serif text-[14.5px] leading-tight text-white">
              <span className="italic">{currentTrack.title}</span>
              <span className="mx-1.5 text-white/30">·</span>
              <span className="text-white/75">{currentTrack.artist}</span>
            </div>
          </div>
        )}
        {upcoming.map((u, i) => {
          const isLiked = !!liked[u.track.id]
          return (
            <div
              key={u.track.id + i}
              className="group mb-1.5 flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.025] px-2.5 py-2"
            >
              <span className="mt-0.5 font-pixel text-[9.5px] tracking-[0.22em] text-white/40">
                {String(i + 1).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={() => selectTrack(u.track)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="truncate font-serif text-[14px] leading-tight text-white">
                  <span className="italic">{u.track.title}</span>
                  <span className="mx-1.5 text-white/30">·</span>
                  <span className="text-white/70">{u.track.artist}</span>
                </div>
                <div className="line-clamp-1 font-mono text-[10.5px] text-white/45">
                  "{u.caption}"
                </div>
              </button>
              <div className="flex shrink-0 flex-col items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => toggleLike(u.track.id)}
                  aria-label="Like"
                  className={clsx(
                    "grid h-6 w-6 place-items-center rounded-full transition-colors hover:bg-white/8",
                    isLiked ? "text-pink-400" : "text-white/40 hover:text-white/75",
                  )}
                >
                  <Heart size={11} fill={isLiked ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  className="grid h-6 w-6 place-items-center rounded-full text-white/30 transition-colors hover:bg-white/8 hover:text-white/75"
                  aria-label="Remove"
                >
                  <X size={11} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
