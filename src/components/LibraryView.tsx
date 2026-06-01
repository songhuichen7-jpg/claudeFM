import { useEffect } from "react"
import { Play, X } from "lucide-react"
import { usePlayer } from "../state/PlayerContext"

type Props = { open: boolean; onClose: () => void }

/**
 * The user's saved taste — every ♥'d track (from GET /api/liked via
 * PlayerContext.likedTracks). Reachable from the header heart.
 */
export function LibraryView({ open, onClose }: Props) {
  const { likedTracks, toggleLike, selectTrack, currentTrack } = usePlayer()

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
	    <div className="surface-enter absolute inset-0 z-40 flex flex-col bg-[#060607]/97 backdrop-blur-sm light:bg-[#f4f1ea]/97">
      <div className="flex items-center justify-between border-b border-white/8 px-5 pt-4 pb-3 light:border-black/10">
        <div className="flex items-baseline gap-2.5">
          <span className="font-pixel text-[18px] tracking-[0.04em] text-white/90 light:text-black/85">Library</span>
          <span className="font-mono text-[10px] tracking-[0.26em]" style={{ color: "var(--accent)" }}>
            ♥ {likedTracks.length} SAVED
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close library"
	          className="pressable grid h-7 w-7 place-items-center rounded-md text-white/55 hover:bg-white/8 hover:text-white light:text-black/55 light:hover:bg-black/8 light:hover:text-black"
        >
          <X size={15} />
        </button>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto px-4 py-3 sm:px-5">
        {likedTracks.length === 0 ? (
          <div className="mt-16 text-center">
            <div className="font-mono text-[40px] leading-none text-white/15 light:text-black/15">♡</div>
            <p className="mt-4 font-mono text-[12px] tracking-[0.04em] text-white/45 light:text-black/50">
              还没 ♥ 过任何歌
            </p>
            <p className="mt-1.5 font-mono text-[10px] tracking-[0.04em] text-white/30 light:text-black/40">
              点歌曲卡片上的 ♡ —— Claudio 会从这里学你的口味
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {likedTracks.map((t, i) => {
              const isNow = t.id === currentTrack?.id
              return (
                <div
                  key={t.id}
	                  className="group flex items-center gap-3 rounded-md border border-white/8 px-3 py-2.5 transition-[background-color,border-color] duration-150 ease-[var(--ease-out)] hover:border-white/20 light:border-black/8 light:hover:border-black/20"
                  style={isNow ? { borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)", background: "var(--accent-soft)" } : undefined}
                >
                  <span className="w-5 shrink-0 font-mono text-[10px] tabular-nums text-white/30 light:text-black/35">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={() => { selectTrack(t); onClose() }}
                    aria-label="Play"
	                    className="pressable text-white/55 hover:text-white light:text-black/55 light:hover:text-black"
                  >
                    <Play size={13} fill="currentColor" />
                  </button>
                  <button type="button" onClick={() => { selectTrack(t); onClose() }} className="min-w-0 flex-1 text-left">
                    <div className="truncate font-mono text-[13px] text-white/90 light:text-black/85">
                      {t.title}
                      <span className="mx-1 text-white/30">·</span>
                      <span className="text-white/55 light:text-black/55">{t.artist}</span>
                    </div>
                    {t.era && (
                      <div className="font-mono text-[8.5px] tracking-[0.26em] text-white/30 light:text-black/40">{t.era}</div>
                    )}
                  </button>
                  {isNow && (
                    <span className="font-mono text-[8.5px] tracking-[0.24em]" style={{ color: "var(--accent)" }}>NOW</span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleLike(t.id)}
                    aria-label="Unlike"
	                    className="pressable font-mono text-[15px] leading-none"
                    style={{ color: "var(--accent)" }}
                  >
                    ♥
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
