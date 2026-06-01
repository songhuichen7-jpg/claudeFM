import { useEffect } from "react"
import { X } from "lucide-react"
import { CatAvatar } from "./CatAvatar"
import { DotMatrix } from "./DotMatrix"

const ACCENT = "var(--accent)"

const GENRES = [
  "深夜电子",
  "SLOWED + REVERB",
  "粤港软核",
  "SOFT R&B",
  "K-POP 情绪",
  "INDIE 心碎",
  "说唱软边缘",
  "梦境电子",
  "通勤节奏",
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
        className="overlay-enter absolute inset-0 bg-black/62 backdrop-blur-[7px]"
      />
	      <div className="panel-enter relative w-full max-w-[760px] overflow-hidden rounded-[28px] border border-white/12 bg-[#0a0a0c]/96 px-12 pt-16 pb-12 text-white shadow-[0_40px_120px_-36px_rgba(0,0,0,0.95)] light:border-black/10 light:bg-[#faf6ec]/97 light:text-black/85 max-sm:px-6 max-sm:pt-8 max-sm:pb-7">
        <DotMatrix className="z-0 opacity-90" strength={1.25} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile card"
	          className="pressable absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-md text-white/55 hover:bg-white/8 hover:text-white light:text-black/55 light:hover:bg-black/8 light:hover:text-black"
        >
          <X size={14} />
        </button>

        <div className="relative flex items-center gap-8 max-sm:gap-4">
          <CatAvatar size={92} mobileSize={64} className="ring-1 ring-white/15" />
          <div className="min-w-0">
            <h2 className="font-pixel text-[58px] leading-none tracking-[0.04em] text-white light:text-black/85 max-sm:text-[34px]">Claudio</h2>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
              <span className="font-mono text-[12px] tracking-[0.2em] max-sm:text-[10px]" style={{ color: ACCENT }}>一开机我就打碟</span>
            </div>
          </div>
        </div>

        <div className="relative mt-10 space-y-2 font-mono text-[20px] leading-relaxed text-white/75 light:text-black/70 max-sm:mt-6 max-sm:text-[13px]">
          <p>veko 的私人 DJ，只读自己的 taste.md。</p>
          <p>网易云是唱片箱，深夜和通勤都是线索。</p>
          <p>推荐要像接歌，不像榜单。</p>
        </div>

        <div className="relative my-12 h-px bg-white/8 light:bg-black/10 max-sm:my-6" />

        <div className="relative grid grid-cols-3 gap-2 text-center">
          <Stat label="ON AIR" value="24/7" />
          <Stat label="GENRES" value="∞" />
          <Stat label="LISTENER" value="1" />
        </div>

        <div className="relative mt-10 flex flex-wrap gap-2.5 max-sm:mt-6 max-sm:gap-1.5">
          {GENRES.map(g => (
            <span
              key={g}
              className="rounded-full border border-white/12 px-4 py-2 font-mono text-[14px] tracking-[0.12em] text-white/65 light:border-black/12 light:text-black/60 max-sm:px-2 max-sm:py-1 max-sm:text-[9.5px]"
            >
              {g}
            </span>
          ))}
        </div>

        <div className="relative mt-12 flex items-center justify-between font-mono text-[10px] tracking-[0.28em] text-white/30 light:text-black/40 max-sm:mt-6">
          <span>CLAUDIO × VEKO</span>
          <span>FM</span>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[12px] tracking-[0.22em] text-white/40 light:text-black/45 max-sm:text-[9px]">{label}</div>
      <div className="mt-2 font-pixel text-[34px] leading-none text-white light:text-black/85 max-sm:mt-1 max-sm:text-[22px]">{value}</div>
    </div>
  )
}
