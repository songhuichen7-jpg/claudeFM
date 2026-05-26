import { clsx } from "clsx"
import { Settings as SettingsIcon } from "lucide-react"
import { usePrototype } from "../PrototypeContext"
import { CatAvatar } from "./CatAvatar"

type Props = {
  onOpenProfile: () => void
  onOpenSettings: () => void
}

export function Header({ onOpenProfile, onOpenSettings }: Props) {
  const { theme, toggleTheme, connected } = usePrototype()
  return (
    <header className="relative z-10 flex items-center justify-between px-5 pt-4 pb-3">
      <button
        type="button"
        onClick={onOpenProfile}
        className="group flex items-center gap-2.5 outline-none"
        aria-label="Open Claudio profile"
      >
        <CatAvatar size={28} className="ring-1 ring-black/10 transition-transform group-hover:scale-[1.06] dark:ring-white/20" />
        <span className="font-pixel text-[26px] leading-none tracking-[0.02em] text-black/85 transition-colors group-hover:text-black dark:text-white/90 dark:group-hover:text-white">
          Claudio
        </span>
      </button>
      <div className="flex items-center gap-3">
        <span
          className={clsx(
            "hidden h-1.5 w-1.5 rounded-full sm:inline-block",
            connected ? "bg-[#29ffb8]" : "bg-white/25",
          )}
          aria-label={connected ? "online" : "offline"}
        />
        <button
          type="button"
          onClick={onOpenSettings}
          className="grid h-7 w-7 place-items-center rounded-full text-black/55 transition-colors hover:bg-black/8 hover:text-black/85 dark:text-white/55 dark:hover:bg-white/8 dark:hover:text-white"
          aria-label="Open settings"
        >
          <SettingsIcon size={14} />
        </button>
        <div className="relative flex items-center rounded-full border border-black/10 bg-black/[0.04] p-0.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <button
            type="button"
            onClick={() => theme !== "dark" && toggleTheme()}
            className={clsx(
              "rounded-full px-3 py-1 font-pixel text-[11px] tracking-[0.22em] transition-all",
              theme === "dark"
                ? "bg-white text-black"
                : "text-black/55 hover:text-black/80 dark:text-white/55 dark:hover:text-white/80",
            )}
          >
            DARK
          </button>
          <button
            type="button"
            onClick={() => theme !== "light" && toggleTheme()}
            className={clsx(
              "rounded-full px-3 py-1 font-pixel text-[11px] tracking-[0.22em] transition-all",
              theme === "light"
                ? "bg-black text-white"
                : "text-black/55 hover:text-black/80 dark:text-white/55 dark:hover:text-white/80",
            )}
          >
            LIGHT
          </button>
        </div>
      </div>
    </header>
  )
}
