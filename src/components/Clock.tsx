import { useEffect, useState } from "react"

const DAY = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
const p2 = (n: number) => String(n).padStart(2, "0")

/**
 * The centerpiece clock panel: a hairline-bordered box filled with a fine
 * dot-grid, a big pixel-font HH:MM, weekday/date and an ON AIR status.
 * (Historically named Clock; renders the ClockPanel from the prototype.)
 */
export function Clock({ onTap }: { onTap?: () => void }) {
  const [now, setNow] = useState(() => new Date())
  const [colon, setColon] = useState(true)

  useEffect(() => {
    const t = window.setInterval(() => {
      setNow(new Date())
      setColon(c => !c)
    }, 1000)
    return () => window.clearInterval(t)
  }, [])

  return (
    <button
      type="button"
      onClick={onTap}
      className="group relative block w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.015] px-6 pt-8 pb-7 text-left transition-colors hover:border-white/20 light:border-black/10 light:bg-black/[0.015] light:hover:border-black/20"
    >
      <div className="dot-matrix pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative flex flex-col items-center">
        <div className="flex items-end gap-2 font-pixel text-[72px] leading-[0.8] tracking-[0.04em] text-white sm:text-[88px] light:text-black/85">
          <span>{p2(now.getHours())}</span>
          <span className={colon ? "opacity-100" : "opacity-20"}>:</span>
          <span>{p2(now.getMinutes())}</span>
        </div>
        <div className="mt-4 font-mono text-[11px] tracking-[0.34em] text-white/70 light:text-black/65">
          {DAY[now.getDay()]}
        </div>
        <div className="mt-1.5 font-mono text-[10px] tracking-[0.34em] text-white/35 light:text-black/40">
          {p2(now.getDate())} {MON[now.getMonth()]} {now.getFullYear()}
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="font-mono text-[10px] tracking-[0.34em]" style={{ color: "var(--accent)" }}>ON AIR</span>
        </div>
      </div>
    </button>
  )
}
