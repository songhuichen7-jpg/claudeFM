import { useEffect, useState } from "react"
import { usePlayer } from "../state/PlayerContext"

const DAY = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
const p2 = (n: number) => String(n).padStart(2, "0")

/**
 * The centerpiece clock panel: a hairline-bordered box filled with a fine
 * dot-grid, a big pixel-font HH:MM, weekday/date and an ON AIR status.
 * (Historically named Clock; renders the ClockPanel from the prototype.)
 */
export function Clock({ onTap }: { onTap?: () => void }) {
  const { connected } = usePlayer()
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
      className="pressable-soft group relative z-10 block w-full overflow-hidden px-6 pt-8 pb-9 text-left sm:pt-10 sm:pb-10"
    >
      <div className="relative flex flex-col items-center">
        <div className="flex items-end gap-2 font-pixel text-[64px] leading-[0.82] tracking-[0.04em] text-white sm:gap-3 sm:text-[92px] light:text-black/85">
          <span>{p2(now.getHours())}</span>
          <span className={colon ? "opacity-100" : "opacity-20"}>:</span>
          <span>{p2(now.getMinutes())}</span>
        </div>
        <div className="mt-4 font-mono text-[15px] tracking-[0.02em] text-white/78 light:text-black/65">
          {DAY[now.getDay()].toLowerCase().replace(/^\w/, c => c.toUpperCase())}
        </div>
        <div className="mt-1.5 font-mono text-[11px] tracking-[0.28em] text-white/35 light:text-black/40">
          {p2(now.getDate())}·{MON[now.getMonth()]}·{now.getFullYear()}
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={connected
              ? "live-dot inline-block h-1.5 w-1.5 rounded-full"
              : "inline-block h-1.5 w-1.5 rounded-full bg-white/25 light:bg-black/25"}
            style={connected ? { background: "var(--accent)" } : undefined}
          />
          <span
            className={connected
              ? "font-mono text-[10px] tracking-[0.34em]"
              : "font-mono text-[10px] tracking-[0.34em] text-white/30 light:text-black/35"}
            style={connected ? { color: "var(--accent)" } : undefined}
          >
            {connected ? "ON AIR" : "OFF AIR"}
          </span>
        </div>
      </div>
    </button>
  )
}
