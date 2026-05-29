import { useEffect, useMemo, useState } from "react"
import { api } from "../api/client"

type Slot = {
  start: string // "09:12"
  end: string
  title: string // 房间先醒
  zone: string // naim宝宝
  songs: { title: string; artist: string }[]
}

const FALLBACK_SLOTS: Slot[] = [
  {
    start: "09:12",
    end: "10:00",
    title: "房间先醒",
    zone: "naim宝宝",
    songs: [
      { title: "颜色", artist: "不黄者" },
      { title: "空空如也", artist: "任然" },
      { title: "晨光序曲", artist: "陈绮贞" },
      { title: "一万个日出", artist: "魔岩" },
    ],
  },
  {
    start: "10:00",
    end: "12:00",
    title: "深度工作",
    zone: "sony小黑",
    songs: [
      { title: "A Walk", artist: "Tycho" },
      { title: "Cirrus", artist: "Bonobo" },
      { title: "Open Eye Signal", artist: "Jon Hopkins" },
      { title: "Silhouettes I, II & III", artist: "Floating Points" },
      { title: "Two Thousand and Seventeen", artist: "Four Tet" },
      { title: "Thrum", artist: "Klangstof" },
      { title: "Space 1.8", artist: "Nala Sinephro" },
      { title: "Afterglow", artist: "Deanigator" },
      { title: "On the Nature of Daylight", artist: "Max Richter" },
    ],
  },
  {
    start: "12:00",
    end: "13:00",
    title: "午休韩语",
    zone: "naim宝宝",
    songs: [
      { title: "It Goes Like (Nanana)", artist: "Peggy Gou" },
      { title: "Square", artist: "Yerin Baek" },
    ],
  },
]

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

function isActive(slot: Slot, now: Date): boolean {
  const cur = now.getHours() * 60 + now.getMinutes()
  return cur >= toMinutes(slot.start) && cur < toMinutes(slot.end)
}

type Props = { open: boolean; onClose: () => void }

export function ScheduleView({ open, onClose }: Props) {
  const [slots, setSlots] = useState<Slot[]>(FALLBACK_SLOTS)
  const now = useMemo(() => new Date(), [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    api
      .planToday()
      .then(r => {
        if (cancelled) return
        const fromPlan = coerceServerPlan(r?.plan)
        if (fromPlan && fromPlan.length > 0) setSlots(fromPlan)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [open])

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
      className="absolute inset-0 z-40 flex items-start justify-center px-4 pt-10 sm:items-center sm:pt-0"
      role="dialog"
      aria-modal="true"
      aria-label="今日电台"
    >
      <button
        type="button"
        aria-label="Close schedule backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-[6px]"
      />

      <div
        className="relative w-full max-w-[440px] overflow-hidden rounded-[14px] border border-white/10 bg-[#0c0c0f]/95 text-white shadow-[0_28px_70px_-20px_rgba(0,0,0,0.85)]"
        style={{ fontFamily: "'JetBrains Mono', 'VT323', ui-monospace, monospace" }}
      >
        {/* Window bar */}
        <div className="relative flex items-center border-b border-white/10 bg-[#15151a]/95 px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="h-3 w-3 rounded-full bg-[#ff5f57] ring-1 ring-black/40 transition-transform hover:scale-110"
            />
            <span className="h-3 w-3 rounded-full bg-[#febc2e] ring-1 ring-black/40" />
            <span className="h-3 w-3 rounded-full bg-[#28c840] ring-1 ring-black/40" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 text-center text-[12px] tracking-[0.04em] text-white/75">
            📻 今日电台: mmguo's Room Tone
          </div>
        </div>

        {/* Body */}
        <div className="thin-scroll max-h-[68vh] space-y-4 overflow-y-auto px-4 py-4 text-[13px] leading-[1.55] text-white/85">
          {slots.map((slot, i) => {
            const active = isActive(slot, now)
            return (
              <div key={i} className="space-y-1">
                <div
                  className={
                    active
                      ? "flex items-baseline gap-2 text-[#c084fc]"
                      : "flex items-baseline gap-2 text-white/90"
                  }
                >
                  <span className={active ? "text-[#29ffb8]" : "text-white/30"}>
                    {active ? "▶" : " "}
                  </span>
                  <span className="tabular-nums">
                    {slot.start}-{slot.end}
                  </span>
                  <span className="font-medium">{slot.title}</span>
                  <span className="text-white/55">{slot.zone}</span>
                </div>
                <ul className="ml-6 space-y-0.5 text-white/70">
                  {slot.songs.map((s, j) => (
                    <li key={j} className="flex items-baseline gap-2">
                      <span className="text-white/30">·</span>
                      <span className="truncate">
                        <span className="text-white/85">{s.title}</span>
                        <span className="mx-1.5 text-white/30">-</span>
                        <span className="text-white/60">{s.artist}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#0a0a0d]/95 px-3 py-1.5 text-[10px] tracking-[0.18em] text-white/35">
          <span>CLAUDIO FM</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1 w-1 rounded-full bg-[#29ffb8]" />
            ON AIR
          </span>
        </div>
      </div>
    </div>
  )
}

/** Best-effort adapter from /api/plan/today's loose payload into Slot[].
 *  Returns null when the shape doesn't include time-banded entries. */
function coerceServerPlan(plan: unknown): Slot[] | null {
  if (!plan || typeof plan !== "object") return null
  const arr = (plan as { slots?: unknown[]; segments?: unknown[] }).slots ??
    (plan as { segments?: unknown[] }).segments
  if (!Array.isArray(arr) || arr.length === 0) return null
  const out: Slot[] = []
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue
    const r = raw as Record<string, unknown>
    const start = typeof r.start === "string" ? r.start : null
    const end = typeof r.end === "string" ? r.end : null
    if (!start || !end) continue
    out.push({
      start,
      end,
      title: typeof r.title === "string" ? r.title : "—",
      zone: typeof r.zone === "string" ? r.zone : "",
      songs: Array.isArray(r.songs)
        ? (r.songs as { title?: string; artist?: string }[])
            .filter(s => s && typeof s.title === "string")
            .map(s => ({ title: s.title!, artist: typeof s.artist === "string" ? s.artist : "" }))
        : [],
    })
  }
  return out.length > 0 ? out : null
}
