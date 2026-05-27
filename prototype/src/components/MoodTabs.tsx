import { clsx } from "clsx"
import { usePrototype } from "../PrototypeContext"

/**
 * Horizontal "channel selector" — the only navigation in the new
 * single-column layout. Each mood is a station; active gets an
 * accent-colored underline + faint glow underneath.
 */
export function MoodTabs() {
  const { moods, currentMood, setMood } = usePrototype()

  return (
    <nav
      className="relative mx-auto flex w-full max-w-[640px] items-stretch justify-between px-3 pb-1 pt-1"
      aria-label="Select mood"
    >
      {moods.map(m => {
        const active = m.id === currentMood.id
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => setMood(m.id)}
            className={clsx(
              "group relative flex flex-1 flex-col items-center gap-0.5 px-1 pb-3 pt-2 transition-colors",
              active
                ? "text-white light:text-black"
                : "text-white/45 hover:text-white/75 light:text-black/45 light:hover:text-black/75",
            )}
          >
            <span className="text-[16px] leading-none transition-transform group-hover:-translate-y-0.5">
              {m.emoji}
            </span>
            <span className="font-pixel text-[10.5px] tracking-[0.22em]">
              {m.label.toUpperCase()}
            </span>
            <span
              aria-hidden
              className={clsx(
                "absolute bottom-0 left-1/2 h-[2px] -translate-x-1/2 rounded-full transition-all duration-300",
                active ? "w-10 opacity-100" : "w-2 opacity-0",
              )}
              style={{
                background: m.accent,
                boxShadow: active ? `0 0 12px ${m.accent}99` : "none",
              }}
            />
          </button>
        )
      })}
    </nav>
  )
}
