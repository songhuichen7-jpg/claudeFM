import { useEffect, useState } from "react"
import { usePlayer } from "../state/PlayerContext"

const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const
const MONTH = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

export function Clock({ onTap }: { onTap?: () => void }) {
  const { activeDJId } = usePlayer()
  const [now, setNow] = useState(() => new Date())
  const [colon, setColon] = useState(true)

  useEffect(() => {
    const t = window.setInterval(() => {
      setNow(new Date())
      setColon(c => !c)
    }, 1000)
    return () => window.clearInterval(t)
  }, [])

  const hh = pad2(now.getHours())
  const mm = pad2(now.getMinutes())
  const day = DAY_FULL[now.getDay()]
  const dd = pad2(now.getDate())
  const mo = MONTH[now.getMonth()]
  const yr = now.getFullYear()

  const status = activeDJId ? "Speaking" : "ON AIR"

  return (
    <section
      onClick={onTap}
      className="relative mx-3 mb-3 cursor-pointer overflow-hidden rounded-2xl border border-white/8 bg-black/40 px-6 pt-7 pb-6 transition-colors hover:border-white/15 dark:bg-black/40 light:border-black/8 light:bg-white/60 light:hover:border-black/20"
    >
      <div className="dot-matrix pointer-events-none absolute inset-0 opacity-90" aria-hidden />
      {/* corner ticks */}
      <CornerTicks />
      <div className="relative flex flex-col items-center">
        <div className="flex items-end gap-2 font-pixel text-[88px] leading-[0.85] tracking-[0.02em] text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.15)] dark:text-white light:text-black/85">
          <span>{hh}</span>
          <span className={colon ? "opacity-100" : "opacity-25"}>:</span>
          <span>{mm}</span>
        </div>
        <div className="mt-3 font-pixel text-[13px] tracking-[0.22em] text-white/80 light:text-black/70">
          {day}
        </div>
        <div className="mt-1.5 font-pixel text-[11px] tracking-[0.32em] text-white/45 light:text-black/45">
          {dd} · {mo} · {yr}
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-[#0a8e6a] dark:bg-[#29ffb8]" aria-hidden />
          <span className="font-pixel text-[11px] tracking-[0.24em] text-[#0a8e6a] dark:text-[#29ffb8]">{status}</span>
        </div>
      </div>
    </section>
  )
}

function CornerTicks() {
  const tick = "absolute h-3 w-3 border-white/30 light:border-black/30"
  return (
    <>
      <span className={`${tick} left-2 top-2 border-l border-t`} />
      <span className={`${tick} right-2 top-2 border-r border-t`} />
      <span className={`${tick} left-2 bottom-2 border-l border-b`} />
      <span className={`${tick} right-2 bottom-2 border-r border-b`} />
    </>
  )
}
