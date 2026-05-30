import { usePlayer } from "../state/PlayerContext"

const ACCENT = "#34e29b"

/** Transient ♥ feedback pill — fired by toggleLike, auto-dismisses. */
export function Toast() {
  const { toast, theme } = usePlayer()
  if (!toast) return null
  const isDark = theme === "dark"
  return (
    <div
      key={toast.id}
      className="pointer-events-none absolute bottom-20 left-1/2 z-50 -translate-x-1/2 animate-[toast-in_200ms_var(--ease-pop)]"
    >
      <div
        className={
          isDark
            ? "flex items-center gap-2.5 rounded-md border bg-[#0a0a0c]/95 px-3.5 py-2 backdrop-blur-xl"
            : "flex items-center gap-2.5 rounded-md border bg-white/95 px-3.5 py-2 backdrop-blur-xl"
        }
        style={{ borderColor: `${ACCENT}55` }}
      >
        <span className="font-mono text-[13px] leading-none" style={{ color: ACCENT }}>♥</span>
        <div className="flex items-baseline gap-2 whitespace-nowrap">
          <span className={isDark ? "font-mono text-[10px] tracking-[0.2em] text-white/90" : "font-mono text-[10px] tracking-[0.2em] text-black/85"}>
            {toast.text}
          </span>
          {toast.sub && (
            <span className={isDark ? "font-mono text-[10px] text-white/45" : "font-mono text-[10px] text-black/50"}>
              {toast.sub}
            </span>
          )}
        </div>
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, 6px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  )
}
