import { useEffect, useRef, useState } from "react"
import { ArrowUp, Sparkles, X } from "lucide-react"
import { clsx } from "clsx"
import { usePrototype } from "../PrototypeContext"
import { mockMoodSuggestions } from "../mockData"

type Props = { open: boolean; onClose: () => void }

/**
 * Open-ended mood picker. Free-text input at top, your accumulating
 * library of moods below, and Claudio's contextual suggestions.
 * Submitting text creates a brand-new mood and switches to it.
 */
export function MoodPicker({ open, onClose }: Props) {
  const { moods, currentMood, setMood, createMood } = usePrototype()
  const [text, setText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const submit = () => {
    if (!text.trim()) return
    createMood(text)
    setText("")
    onClose()
  }

  return (
    <div className="absolute inset-0 z-40 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close mood picker"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-[6px] light:bg-black/40"
      />
      <div
        className="relative w-full max-w-[420px] overflow-hidden rounded-3xl border bg-[#0a090f]/95 px-5 pt-5 pb-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-2xl light:bg-[#faf6ec]/95"
        style={{
          borderColor: `${currentMood.accent}55`,
          boxShadow: `0 30px 80px -30px ${currentMood.accent}55, inset 0 0 0 1px ${currentMood.accent}22`,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-white/45 transition-colors hover:bg-white/8 hover:text-white light:text-black/45 light:hover:bg-black/8 light:hover:text-black"
        >
          <X size={14} />
        </button>

        <h2 className="font-serif text-[22px] leading-tight text-white light:text-black/90">
          <span className="italic">你现在是什么状态？</span>
        </h2>
        <p className="mt-1 font-mono text-[11.5px] text-white/45 light:text-black/55">
          一句话告诉 Claudio，他会接住你
        </p>

        <div
          className="mt-4 flex items-center gap-2 rounded-2xl border bg-black/30 px-3 py-2 light:bg-white/40"
          style={{ borderColor: `${currentMood.accent}55` }}
        >
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="比如：写代码 / 下雨夜 / 加班晚归"
            className="font-serif flex-1 bg-transparent text-[16px] text-white outline-none placeholder:text-white/30 light:text-black/85 light:placeholder:text-black/35"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            aria-label="Submit"
            className="grid h-8 w-8 place-items-center rounded-full transition-transform active:scale-95 disabled:opacity-30"
            style={{ background: currentMood.accent, color: "#000" }}
          >
            <ArrowUp size={14} strokeWidth={2.6} />
          </button>
        </div>

        {moods.length > 0 && (
          <section className="mt-5">
            <h3 className="font-pixel text-[10px] tracking-[0.24em] text-white/45 light:text-black/45">
              最近用过的
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {moods.map(m => {
                const active = m.id === currentMood.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMood(m.id)
                      onClose()
                    }}
                    className={clsx(
                      "group flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors",
                      active
                        ? "text-white light:text-black"
                        : "border-white/12 bg-white/[0.03] text-white/75 hover:bg-white/[0.07] light:border-black/12 light:bg-black/[0.03] light:text-black/75 light:hover:bg-black/[0.07]",
                    )}
                    style={
                      active
                        ? {
                            borderColor: m.accent,
                            background: `${m.accent}22`,
                            boxShadow: `inset 0 0 0 1px ${m.accent}66`,
                          }
                        : undefined
                    }
                  >
                    <span className="text-[12px] leading-none">{m.emoji}</span>
                    <span className="font-pixel text-[10.5px] tracking-[0.16em]">
                      {m.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        <section className="mt-5">
          <h3 className="flex items-center gap-1.5 font-pixel text-[10px] tracking-[0.24em] text-white/45 light:text-black/45">
            <Sparkles size={11} />
            Claudio 觉得你可能想…
          </h3>
          <div className="mt-2 flex flex-col gap-1.5">
            {mockMoodSuggestions.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  createMood(s)
                  onClose()
                }}
                className="group flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-left font-serif text-[14px] text-white/85 transition-colors hover:border-white/20 hover:bg-white/[0.05] hover:text-white light:border-black/10 light:bg-black/[0.02] light:text-black/80 light:hover:border-black/25 light:hover:bg-black/[0.05] light:hover:text-black"
              >
                <span className="italic">「{s}」</span>
                <span
                  className="font-pixel text-[10px] tracking-[0.18em] opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: currentMood.accent }}
                >
                  TUNE IN →
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
