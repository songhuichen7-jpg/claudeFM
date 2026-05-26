import { useEffect, useState } from "react"
import { clsx } from "clsx"
import { Settings as SettingsIcon } from "lucide-react"
import { usePlayer } from "../state/PlayerContext"
import { CatAvatar } from "./CatAvatar"
import { api } from "../api/client"
import type { NcmStatus } from "./LoginCard"

type Props = {
  onOpenProfile: () => void
  onOpenSettings: () => void
  onOpenLogin: () => void
  /** Bumped by App.tsx whenever the login card closes — Header re-fetches
   *  status so the pill flips between "LOGIN" and the user's nickname. */
  loginRevision: number
}

export function Header({ onOpenProfile, onOpenSettings, onOpenLogin, loginRevision }: Props) {
  const { theme, toggleTheme } = usePlayer()
  const [ncm, setNcm] = useState<NcmStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    api.ncmStatus().then(r => { if (!cancelled) setNcm(r) }).catch(() => undefined)
    return () => { cancelled = true }
  }, [loginRevision])

  const loginLabel = ncm?.loggedIn
    ? (ncm.nickname && ncm.nickname.length > 0
        ? ncm.nickname.length > 6 ? ncm.nickname.slice(0, 6) + "…" : ncm.nickname
        : "ME")
    : "LOGIN"

  return (
    <header className="relative z-10 flex items-center justify-between gap-2 px-4 pt-4 pb-3">
      <button
        type="button"
        onClick={onOpenProfile}
        className="group flex min-w-0 shrink items-center gap-2 outline-none"
        aria-label="Open Claudio profile"
      >
        <CatAvatar size={26} className="ring-1 ring-black/10 transition-transform group-hover:scale-[1.06] dark:ring-white/20" />
        <span className="font-pixel text-[22px] leading-none tracking-[0.02em] text-black/85 transition-colors group-hover:text-black dark:text-white/90 dark:group-hover:text-white">
          Claudio
        </span>
      </button>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenLogin}
          className={clsx(
            "whitespace-nowrap rounded-full border px-2.5 py-1 font-pixel text-[10px] tracking-[0.2em] transition-colors",
            ncm?.loggedIn
              ? "border-[#29ffb8]/40 bg-[#29ffb8]/10 text-[#0a8e6a] dark:text-[#29ffb8]"
              : "border-black/15 text-black/70 hover:bg-black/5 hover:text-black/90 dark:border-white/15 dark:text-white/75 dark:hover:bg-white/8 dark:hover:text-white",
          )}
          aria-label={ncm?.loggedIn ? "Logged in to Netease Cloud Music" : "Login to Netease Cloud Music"}
        >
          {loginLabel}
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="hidden h-7 w-7 place-items-center rounded-full text-black/55 transition-colors hover:bg-black/8 hover:text-black/85 sm:grid dark:text-white/55 dark:hover:bg-white/8 dark:hover:text-white"
          aria-label="Open settings"
        >
          <SettingsIcon size={14} />
        </button>
        <div className="relative flex items-center rounded-full border border-black/10 bg-black/[0.04] p-0.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <button
            type="button"
            onClick={() => theme !== "dark" && toggleTheme()}
            className={clsx(
              "whitespace-nowrap rounded-full px-2.5 py-1 font-pixel text-[10px] tracking-[0.2em] transition-all",
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
              "whitespace-nowrap rounded-full px-2.5 py-1 font-pixel text-[10px] tracking-[0.2em] transition-all",
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
