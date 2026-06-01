import { clsx } from "clsx"
import { Settings as Gear } from "lucide-react"
import { usePlayer } from "../state/PlayerContext"
import { CatAvatar } from "./CatAvatar"

type Props = {
  onOpenProfile: () => void
  onOpenSettings: () => void
  onOpenLibrary?: () => void
}

/**
 * Top bar: veko (listener) avatar + pixel "Claudio" station wordmark; a ♥-count Library shortcut,
 * a settings gear, and a DARK / LIGHT segmented control. Restrained, mono.
 */
export function Header({ onOpenProfile, onOpenSettings, onOpenLibrary }: Props) {
  const { theme, toggleTheme, likedTracks } = usePlayer()
  return (
    <header className="relative z-10 flex items-center justify-between gap-2 px-3 pt-4 pb-4 sm:px-8 sm:pt-6 sm:pb-5">
      <button
        type="button"
        onClick={onOpenProfile}
        className="pressable group flex min-w-0 items-center gap-2.5 outline-none sm:gap-3"
        data-hover-lift="true"
        aria-label="Open Claudio profile"
      >
        <CatAvatar who="veko" size={42} mobileSize={32} className="ring-1 ring-white/15" />
        <span className="truncate font-pixel text-[26px] leading-none tracking-[0.04em] text-white/90 transition-colors group-hover:text-white light:text-black/85 sm:text-[42px]">
          Claudio
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onOpenLibrary}
          aria-label="Open library"
          className="pressable flex h-7 items-center gap-1 rounded-full border border-white/10 px-2 font-mono text-[9px] tracking-[0.08em] text-white/55 hover:border-white/16 hover:text-white/90 light:border-black/12 light:text-black/55 light:hover:text-black/85 sm:h-8 sm:gap-1.5 sm:px-3 sm:text-[10px] sm:tracking-[0.14em]"
        >
          <span style={{ color: "var(--accent)" }}>♥</span>
          {likedTracks.length}
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          className="pressable grid h-7 w-7 place-items-center rounded-full border border-white/10 text-white/55 hover:border-white/16 hover:bg-white/8 hover:text-white/90 light:border-black/12 light:text-black/55 light:hover:bg-black/8 light:hover:text-black sm:h-8 sm:w-8"
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
      aria-pressed={active}
      className={clsx(
        "pressable rounded-full px-2.5 py-1.5 font-mono text-[9px] tracking-[0.12em] sm:px-3.5 sm:text-[10.5px] sm:tracking-[0.18em]",
        active
          ? "bg-white text-black light:bg-black light:text-white"
          : "text-white/45 hover:text-white/75 light:text-black/45 light:hover:text-black/75",
      )}
    >
      {children}
    </button>
  )
}
