import type { ReactNode } from "react"
import { clsx } from "clsx"
import { usePrototype } from "../PrototypeContext"

export function Shell({ children }: { children: ReactNode }) {
  const { theme } = usePrototype()
  return (
    <div className="relative grid h-full w-full place-items-center px-3 py-4 sm:py-8">
      <FluidBackdrop />
      <div
        className={clsx(
          "shell-glow relative flex h-full max-h-[940px] w-full max-w-[560px] flex-col overflow-hidden rounded-[28px]",
          theme === "dark"
            ? "bg-[#07070b]/95 border border-white/8"
            : "bg-[#f1ece2]/95 border border-black/8 paper-grain",
        )}
      >
        <NoiseLayer />
        {children}
      </div>
    </div>
  )
}

function FluidBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <span className="absolute left-[10%] top-[18%] h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-700/30 blur-[140px] dark:bg-violet-700/30 light:bg-violet-400/20" />
      <span className="absolute right-[10%] top-[22%] h-[50vmin] w-[50vmin] translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-700/25 blur-[140px] light:bg-fuchsia-300/20" />
      <span className="absolute bottom-[-10%] left-[40%] h-[40vmin] w-[40vmin] rounded-full bg-indigo-600/25 blur-[140px] light:bg-indigo-400/20" />
    </div>
  )
}

function NoiseLayer() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      }}
    />
  )
}
