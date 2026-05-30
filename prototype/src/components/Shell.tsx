import type { ReactNode } from "react"
import { clsx } from "clsx"
import { usePrototype } from "../PrototypeContext"

/**
 * Austere full-screen container. Near-black, no gradient blobs, no glow —
 * the texture comes from monospace type, hairline borders and the fine
 * dot-grid that lives inside individual panels.
 */
export function Shell({ children }: { children: ReactNode }) {
  const { theme } = usePrototype()
  return (
    <div
      className={clsx(
        "relative isolate flex h-screen w-screen flex-col overflow-hidden",
        theme === "dark" ? "text-white/90" : "text-black/85 paper-grain",
      )}
    >
      <Vignette />
      {children}
    </div>
  )
}

/** Barely-there darkening toward the edges — keeps the flat black from
 * feeling like a void without introducing any color. */
function Vignette() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        background:
          "radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.025) 0%, transparent 50%)",
      }}
    />
  )
}
