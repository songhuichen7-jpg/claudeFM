import { Heart, PlayCircle } from "lucide-react"
import { clsx } from "clsx"
import { usePrototype } from "../PrototypeContext"
import { mockTracks } from "../mockData"
import type { Track } from "../types"

export function LibraryTab() {
  const { liked, toggleLike, selectTrack, currentTrack, currentMood, moods } = usePrototype()
  const allKnownTracks: Track[] = mockTracks
  const likedTracks = allKnownTracks.filter(t => liked[t.id])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div>
          <h3 className="font-pixel text-[13px] tracking-[0.18em] text-white">Library</h3>
          <p className="font-mono text-[10.5px] text-white/45">
            {likedTracks.length} liked · 来自所有 mood
          </p>
        </div>
        <div className="flex items-center gap-1">
          {moods.map(m => (
            <span
              key={m.id}
              title={m.label}
              className={clsx(
                "h-1.5 w-1.5 rounded-full",
                m.id === currentMood.id ? "" : "opacity-30",
              )}
              style={{ background: m.accent }}
            />
          ))}
        </div>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto px-3 pb-3">
        {likedTracks.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-white/8 bg-white/[0.02]">
              <Heart size={20} className="text-white/30" />
            </div>
            <p className="mt-3 font-serif text-[14px] text-white/55">
              还没有 ♥ 过任何歌
            </p>
            <p className="mt-1 font-mono text-[11px] text-white/35">
              Claudio 会从你 ♥ 的曲目里学你的口味
            </p>
          </div>
        ) : (
          likedTracks.map(t => {
            const isNow = t.id === currentTrack?.id
            return (
              <div
                key={t.id}
                className={clsx(
                  "group mb-1 flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors",
                  isNow
                    ? "border-[#29ffb8]/30 bg-[#29ffb8]/[0.06]"
                    : "border-white/6 bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.05]",
                )}
              >
                <button
                  type="button"
                  onClick={() => selectTrack(t)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/40 text-white/70 transition-colors hover:bg-black/60 hover:text-[#29ffb8]"
                  aria-label="Play"
                >
                  <PlayCircle size={18} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="truncate font-serif text-[14.5px] leading-tight text-white">
                    <span className="italic">{t.title}</span>
                    <span className="mx-1.5 text-white/30">·</span>
                    <span className="text-white/70">{t.artist}</span>
                  </div>
                  {t.era && (
                    <div className="truncate font-pixel text-[9.5px] tracking-[0.18em] text-white/35">
                      {t.era}
                      {t.album ? ` · ${t.album}` : ""}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => toggleLike(t.id)}
                  aria-label="Unlike"
                  className="grid h-8 w-8 place-items-center rounded-full text-pink-400 transition-colors hover:bg-white/8"
                >
                  <Heart size={15} fill="currentColor" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
