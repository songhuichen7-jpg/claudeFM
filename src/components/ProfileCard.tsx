import { useEffect } from "react"
import { X } from "lucide-react"
import { CatAvatar } from "./CatAvatar"

const GENRES = [
  "JAZZ-HIPHOP",
  "NEO-CLASSICAL",
  "90S 华语",
  "HIP-HOP",
  "柴可夫斯基 & EMINEM",
  "J-ROCK",
  "下雨白噪音",
  "POST-PUNK",
  "SHIBUYA-KEI",
]

type Props = { open: boolean; onClose: () => void; onOpenSettings?: () => void }

export function ProfileCard({ open, onClose, onOpenSettings }: Props) {
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
    <div
      className="absolute inset-0 z-40 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close profile backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-[6px]"
      />
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-3xl border border-white/10 bg-[#0b0a10]/95 px-6 pt-8 pb-7 text-white shadow-[0_30px_80px_-30px_rgba(124,92,255,0.6)]">
        {/* dotted hemisphere bg */}
        <div className="dot-matrix pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile card"
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-white/55 transition-colors hover:bg-white/8 hover:text-white"
        >
          <X size={14} />
        </button>

        <div className="relative flex items-center gap-4">
          <CatAvatar size={70} className="ring-1 ring-white/15" />
          <div className="min-w-0">
            <h2 className="font-pixel text-[28px] leading-none tracking-[0.02em] text-white">
              Claudio
            </h2>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-[#29ffb8]" />
              <span className="font-pixel text-[11px] tracking-[0.18em] text-[#29ffb8]">
                一开机我就打碟
              </span>
            </div>
          </div>
        </div>

        <div className="relative mt-5 space-y-1 font-serif text-[14.5px] leading-snug text-white/85">
          <p>mmguo 的私人 dj，会打碟的 taste.md 🎧</p>
          <p>Your mood is my prompt.</p>
          <p>I hate algorithm. I have taste.</p>
        </div>

        <div className="relative my-5 h-px bg-white/8" />

        <div className="relative grid grid-cols-3 gap-2 text-center">
          <Stat label="ON AIR" value="24/7" />
          <Stat label="GENRES" value="∞" />
          <Stat label="LISTENER" value="1" />
        </div>

        <div className="relative mt-5 flex flex-wrap gap-1.5">
          {GENRES.map(g => (
            <span
              key={g}
              className="rounded-full border border-white/12 px-2.5 py-1 font-pixel text-[10px] tracking-[0.16em] text-white/75"
            >
              {g}
            </span>
          ))}
        </div>

        <div className="relative mt-5 flex items-center justify-between gap-3 font-pixel text-[10px] tracking-[0.28em] text-white/35">
          <span>CLAUDE × MMGUO</span>
          {onOpenSettings && (
            <button
              type="button"
              onClick={() => { onOpenSettings(); onClose() }}
              className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-white/65 hover:bg-white/8 hover:text-white sm:hidden"
            >
              SETTINGS
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-pixel text-[10px] tracking-[0.24em] text-white/45">{label}</div>
      <div className="mt-1 font-pixel text-[24px] leading-none text-white">{value}</div>
    </div>
  )
}
