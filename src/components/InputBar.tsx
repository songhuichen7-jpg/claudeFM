import { useState } from "react"
import { ArrowUp, Mic } from "lucide-react"
import { usePlayer } from "../state/PlayerContext"

/**
 * Bottom composer (the prototype's Composer): a hairline mono input,
 * "Say something to the DJ…", mic + send. Accent ring on focus.
 * (Historically named InputBar.)
 */
export function InputBar() {
  const { sendMessage } = usePlayer()
  const [text, setText] = useState("")
  const [focused, setFocused] = useState(false)

  const submit = () => {
    if (!text.trim()) return
    sendMessage(text)
    setText("")
  }

  return (
    <div className="relative z-10 border-t border-white/8 bg-black/32 px-5 pb-2 pt-2 sm:px-8 light:border-black/10 light:bg-white/24">
      <div
        className="flex items-center gap-2 rounded-[13px] border bg-black/42 px-3 py-1 transition-[background-color,border-color,box-shadow] duration-150 ease-[var(--ease-out)] light:bg-white/68"
        style={{
          borderColor: focused ? "var(--accent)" : "rgba(255,255,255,0.10)",
          boxShadow: focused ? "0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent)" : "none",
        }}
      >
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Say something to the DJ..."
          className="min-w-0 flex-1 bg-transparent px-1 py-0.5 font-mono text-[12.5px] tracking-[0.02em] text-white/90 outline-none placeholder:text-white/30 light:text-black/85 light:placeholder:text-black/35 sm:text-[13.5px]"
          aria-label="Message DJ"
        />
        <button
          type="button"
          className="pressable grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-white/55 hover:border-white/18 hover:bg-white/8 hover:text-white light:border-black/10 light:text-black/55 light:hover:bg-black/8 light:hover:text-black"
          aria-label="Voice"
        >
          <Mic size={14} />
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          className="pressable grid h-8 w-8 shrink-0 place-items-center rounded-full disabled:opacity-30"
          style={{ background: text.trim() ? "var(--accent)" : "rgba(255,255,255,0.08)", color: text.trim() ? "#04140d" : "rgba(255,255,255,0.5)" }}
          aria-label="Send"
        >
          <ArrowUp size={14} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  )
}
