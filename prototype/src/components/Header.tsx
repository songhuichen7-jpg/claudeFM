import { clsx } from "clsx"
import { Settings as Gear } from "lucide-react"
import { usePrototype } from "../PrototypeContext"
import { CatAvatar } from "./CatAvatar"
import { mockTracks } from "../mockData"

type Props = {
  onOpenProfile: () => void
  onOpenSettings: () => void
  onOpenLibrary: () => void
}

/**
 * Top bar: cat avatar + pixel "Claudio" wordmark on the left; a ♥-count
 * Library shortcut, a settings gear, and a DARK / LIGHT segmented control
 * on the right. Restrained, mono.
 */
export function Header({ onOpenProfile, onOpenSettings, onOpenLibrary }: Props) {
  const { theme, toggleTheme, liked } = usePrototype()
  const likedCount = mockTracks.filter(t => liked[t.id]).length

  return (
    <header className="flex items-center justify-between px-4 pt-3.5 pb-2.5 sm:px-5">
      <button
        type="button"
        onClick={onOpenProfile}
        className="group flex items-center gap-2.5 outline-none"
        aria-label="Open Claudio profile"
      >
        <CatAvatar size={26} className="ring-1 ring-white/15" />
        <span className="font-pixel text-[22px] leading-none tracking-[0.04em] text-white/90 transition-colors group-hover:text-white light:text-black/85">
          Claudio
        </span>
      </button>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenLibrary}
          aria-label="Open library"
          className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] tracking-[0.12em] text-white/55 transition-colors hover:text-white/90 light:text-black/55 light:hover:text-black/85"
        >
          <span style={{ color: "var(--accent)" }}>♥</span>
          {likedCount}
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          className="grid h-7 w-7 place-items-center rounded-md text-white/55 transition-colors hover:bg-white/8 hover:text-white/90 light:text-black/55 light:hover:bg-black/8 light:hover:text-black"
        >
          <Gear size={14} />
        </button>
        <div className="ml-0.5 flex items-center rounded-full border border-white/10 p-0.5 light:border-black/12">
          <Seg active={theme === "dark"} onClick={() => theme !== "dark" && toggleTheme()}>DARK</Seg>
          <Seg active={theme === "light"} onClick={() => theme !== "light" && toggleTheme()}>LIGHT</Seg>
        </div>
      </div>
    </header>
  )
}

function Seg({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-full px-3 py-1 font-mono text-[10.5px] tracking-[0.18em] transition-colors",
        active
          ? "bg-white text-black light:bg-black light:text-white"
          : "text-white/45 hover:text-white/75 light:text-black/45 light:hover:text-black/75",
      )}
    >
      {children}
    </button>
  )
}
