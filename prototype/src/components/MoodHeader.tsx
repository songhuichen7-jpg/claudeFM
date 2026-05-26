import { useState } from "react"
import { ChevronDown, Settings as SettingsIcon } from "lucide-react"
import { clsx } from "clsx"
import { usePrototype } from "../PrototypeContext"
import { CatAvatar } from "./CatAvatar"

type Props = {
  onOpenProfile: () => void
  onOpenSettings: () => void
}

export function MoodHeader({ onOpenProfile, onOpenSettings }: Props) {
  const { theme, toggleTheme, currentMood, moods, setMood, connected } = usePrototype()
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <header className="relative z-10 flex items-center justify-between gap-2 px-4 pt-3.5 pb-2.5">
      <button
        type="button"
        onClick={onOpenProfile}
        className="group flex items-center gap-2 outline-none"
        aria-label="Open Claudio profile"
      >
        <CatAvatar size={24} className="ring-1 ring-black/10 dark:ring-white/20" />
        <span className="font-pixel text-[19px] leading-none tracking-[0.02em] text-black/85 transition-colors group-hover:text-black dark:text-white/90 dark:group-hover:text-white">
          Claudio
        </span>
      </button>

      <div className="relative flex-1">
        <button
          type="button"
          onClick={() => setPickerOpen(o => !o)}
          className={clsx(
            "mx-auto flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors",
            "border-white/12 bg-white/[0.03] hover:bg-white/[0.07]",
            "light:border-black/15 light:bg-black/[0.03] light:hover:bg-black/[0.07]",
          )}
          style={{ boxShadow: `inset 0 0 0 1px ${currentMood.accent}22` }}
        >
          <span className="text-[14px] leading-none">{currentMood.emoji}</span>
          <span className="font-pixel text-[12px] tracking-[0.18em] text-white/85 light:text-black/85">
            {currentMood.label.toUpperCase()}
          </span>
          <ChevronDown size={11} className="text-white/45 light:text-black/45" />
        </button>

        {pickerOpen && (
          <>
            <button
              type="button"
              aria-label="dismiss mood picker"
              onClick={() => setPickerOpen(false)}
              className="fixed inset-0 z-20 cursor-default"
            />
            <div className="absolute left-1/2 top-full z-30 mt-2 w-[240px] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0c12]/95 backdrop-blur-xl shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]">
              {moods.map(m => {
                const active = m.id === currentMood.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMood(m.id)
                      setPickerOpen(false)
                    }}
                    className={clsx(
                      "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors",
                      active ? "bg-white/[0.08]" : "hover:bg-white/[0.04]",
                    )}
                  >
                    <span className="text-[18px] leading-none">{m.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-pixel text-[12px] tracking-[0.14em] text-white">
                        {m.label}
                      </div>
                      <div className="font-mono text-[10px] text-white/45 truncate">{m.tagline}</div>
                    </div>
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.accent }} />
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className={clsx(
            "hidden h-1.5 w-1.5 rounded-full sm:inline-block",
            connected ? "bg-[#29ffb8]" : "bg-white/25",
          )}
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
