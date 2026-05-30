import { useEffect } from "react"
import { X } from "lucide-react"
import { CatAvatar } from "./CatAvatar"

const ACCENT = "var(--accent)"

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

type Props = { open: boolean; onClose: () => void }

export function ProfileCard({ open, onClose }: Props) {
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
    <div className="absolute inset-0 z-40 flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close profile backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[4px]"
      />
      <div className="relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-white/12 bg-[#0a0a0c]/96 px-6 pt-7 pb-6 text-white shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] light:bg-[#faf6ec]/97 light:text-black/85 light:border-black/10">
        <div className="dot-matrix pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile card"
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-md text-white/55 transition-colors hover:bg-white/8 hover:text-white light:text-black/55 light:hover:bg-black/8 light:hover:text-black"
        >
          <X size={14} />
        </button>

        <div className="relative flex items-center gap-4">
          <CatAvatar size={60} className="ring-1 ring-white/15" />
          <div className="min-w-0">
            <h2 className="font-pixel text-[26px] leading-none tracking-[0.04em] text-white light:text-black/85">Claudio</h2>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
              <span className="font-mono text-[10px] tracking-[0.2em]" style={{ color: ACCENT }}>一开机我就打碟</span>
            </div>
          </div>
        </div>

        <div className="relative mt-5 space-y-1 font-mono text-[12.5px] leading-relaxed text-white/75 light:text-black/70">
          <p>veko 的私人 dj，会打碟的 taste.md</p>
          <p>Your mood is my prompt.</p>
          <p>I hate algorithm. I have taste.</p>
        </div>

        <div className="relative my-5 h-px bg-white/8 light:bg-black/10" />

        <div className="relative grid grid-cols-3 gap-2 text-center">
          <Stat label="ON AIR" value="24/7" />
          <Stat label="GENRES" value="∞" />
          <Stat label="LISTENER" value="1" />
        </div>

        <div className="relative mt-5 flex flex-wrap gap-1.5">
          {GENRES.map(g => (
            <span
              key={g}
              className="rounded-md border border-white/12 px-2 py-1 font-mono text-[9.5px] tracking-[0.12em] text-white/65 light:border-black/12 light:text-black/60"
            >
              {g}
            </span>
          ))}
        </div>

        <div className="relative mt-5 flex items-center justify-between font-mono text-[9px] tracking-[0.28em] text-white/30 light:text-black/40">
          <span>CLAUDE × VEKO</span>
          <span>FM</span>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] tracking-[0.22em] text-white/40 light:text-black/45">{label}</div>
      <div className="mt-1 font-pixel text-[22px] leading-none text-white light:text-black/85">{value}</div>
    </div>
  )
}
