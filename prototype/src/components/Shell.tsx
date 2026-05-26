import type { ReactNode } from "react"
import { clsx } from "clsx"
import { usePrototype } from "../PrototypeContext"

export function Shell({ children }: { children: ReactNode }) {
  const { theme, currentMood } = usePrototype()
  return (
    <div
      className={clsx(
        "relative isolate flex h-screen w-screen flex-col overflow-hidden",
        theme === "dark" ? "text-white" : "text-black/90 paper-grain",
      )}
    >
      <FluidBackdrop accent={currentMood.accent} />
      <NoiseLayer />
      {children}
    </div>
  )
}

function FluidBackdrop({ accent }: { accent: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <span
        className="absolute left-[15%] top-[12%] h-[55vmin] w-[55vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[160px]"
        style={{ background: `${accent}3a` }}
      />
      <span
        className="absolute right-[12%] top-[28%] h-[48vmin] w-[48vmin] translate-x-1/2 -translate-y-1/2 rounded-full blur-[160px]"
        style={{ background: `${accent}2a` }}
      />
      <span
        className="absolute bottom-[-10%] left-[45%] h-[42vmin] w-[42vmin] rounded-full blur-[160px]"
        style={{ background: `${accent}25` }}
      />
    </div>
  )
}

function NoiseLayer() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      }}
    />
  )
}
