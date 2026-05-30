import type { ReactNode } from "react"
import { clsx } from "clsx"
import { usePlayer } from "../state/PlayerContext"

/**
 * Austere full-screen container. Near-black, no gradient blobs, no glow —
 * texture comes from monospace type, hairline borders and the fine dot-grid
 * inside individual panels. The centered "device" frame lives in App.
 */
export function Shell({ children }: { children: ReactNode }) {
  const { theme } = usePlayer()
  return (
    <div
      className={clsx(
        "relative isolate flex h-screen w-screen flex-col overflow-hidden",
        theme === "dark" ? "text-white/90" : "text-black/85 paper-grain",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.025) 0%, transparent 50%)",
        }}
      />
      {children}
    </div>
  )
}
