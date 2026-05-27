import { Settings as SettingsIcon } from "lucide-react"
import { usePrototype } from "../PrototypeContext"
import { CatAvatar } from "./CatAvatar"

type Props = {
  onOpenProfile: () => void
  onOpenSettings: () => void
}

export function MoodHeader({ onOpenProfile, onOpenSettings }: Props) {
  const { theme, toggleTheme, connected } = usePrototype()
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-[640px] items-center justify-between px-4 pt-3 pb-1">
      <button
        type="button"
        onClick={onOpenProfile}
        className="group flex items-center gap-2 outline-none"
        aria-label="Open Claudio profile"
      >
        <CatAvatar
          size={22}
          className="ring-1 ring-black/10 dark:ring-white/20"
        />
        <span className="font-pixel text-[16px] leading-none tracking-[0.04em] text-black/85 transition-colors group-hover:text-black dark:text-white/90 dark:group-hover:text-white">
          Claudio
        </span>
        <span className="font-pixel text-[9px] tracking-[0.32em] text-black/35 dark:text-white/35">
          FM
        </span>
      </button>
      <div className="flex items-center gap-1.5">
        <span
          className={
            connected
              ? "hidden h-1.5 w-1.5 rounded-full bg-[#29ffb8] sm:inline-block"
              : "hidden h-1.5 w-1.5 rounded-full bg-white/25 sm:inline-block"
          }
          aria-label={connected ? "online" : "offline"}
        />
        <button
          type="button"
          onClick={toggleTheme}
          className="grid h-7 w-7 place-items-center rounded-full text-black/55 transition-colors hover:bg-black/8 hover:text-black/85 dark:text-white/55 dark:hover:bg-white/8 dark:hover:text-white"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "☾" : "☀"}
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="grid h-7 w-7 place-items-center rounded-full text-black/55 transition-colors hover:bg-black/8 hover:text-black/85 dark:text-white/55 dark:hover:bg-white/8 dark:hover:text-white"
          aria-label="Open settings"
        >
          <SettingsIcon size={14} />
        </button>
      </div>
    </header>
  )
}
