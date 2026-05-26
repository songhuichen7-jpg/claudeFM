import { useEffect } from "react"
import { ChevronDown, PlayCircle, X } from "lucide-react"
import { usePrototype } from "../PrototypeContext"

type Props = { open: boolean; onClose: () => void }

export function QueueSheet({ open, onClose }: Props) {
  const { upcoming, selectTrack, currentTrack } = usePrototype()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="absolute inset-0 z-40 flex flex-col" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close queue backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[4px]"
      />
      <div className="mt-12 relative flex flex-1 flex-col overflow-hidden rounded-t-[28px] border-t border-x border-white/10 bg-[#0a090f]/95 backdrop-blur-2xl shadow-[0_-30px_60px_-20px_rgba(0,0,0,0.6)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close queue"
          className="mx-auto mt-2 grid h-7 w-12 place-items-center rounded-full"
        >
          <span className="h-1 w-9 rounded-full bg-white/20" />
        </button>

        <div className="flex items-center justify-between px-5 pt-1 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[13px] tracking-[0.18em] text-white">
              Up Next
            </span>
            <span className="font-pixel text-[10px] tracking-[0.24em] text-white/40">
              · {upcoming.length} TRACKS
            </span>
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

        {currentTrack && (
          <div className="mx-3 mb-3 rounded-2xl border border-[#29ffb8]/30 bg-[#29ffb8]/[0.06] px-3.5 py-2.5">
            <div className="font-pixel text-[9px] tracking-[0.24em] text-[#29ffb8]">NOW PLAYING</div>
            <div className="mt-1 font-serif text-[15.5px] leading-tight text-white">
              <span className="italic">{currentTrack.title}</span>
              <span className="mx-1.5 text-white/30">·</span>
              <span className="text-white/75">{currentTrack.artist}</span>
            </div>
          </div>
        )}

        <div className="thin-scroll flex-1 overflow-y-auto px-3 pb-5">
          {upcoming.map((u, i) => (
            <button
              key={u.track.id + i}
              type="button"
              onClick={() => {
                selectTrack(u.track)
                onClose()
              }}
              className="group mb-1.5 flex w-full items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.025] px-3 py-2.5 text-left transition-colors hover:border-white/15 hover:bg-white/[0.05]"
            >
              <span className="mt-0.5 font-pixel text-[10px] tracking-[0.24em] text-white/40">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <div className="truncate font-serif text-[15px] leading-tight text-white">
                  <span className="italic">{u.track.title}</span>
                  <span className="mx-1.5 text-white/30">·</span>
                  <span className="text-white/70">{u.track.artist}</span>
                </div>
                <div className="mt-0.5 line-clamp-1 font-mono text-[11px] text-white/45">
                  "{u.caption}"
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <PlayCircle
                  size={20}
                  className="text-white/40 transition-colors group-hover:text-[#29ffb8]"
                />
                <span
                  role="button"
                  tabIndex={0}
                  onClick={e => {
                    e.stopPropagation()
                  }}
                  className="grid h-5 w-5 place-items-center rounded-full text-white/30 transition-colors hover:bg-white/8 hover:text-white/75"
                  aria-label="Remove from queue"
                >
                  <X size={11} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
