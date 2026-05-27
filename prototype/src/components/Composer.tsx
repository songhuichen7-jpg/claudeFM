import { useState } from "react"
import { ArrowUp, Mic } from "lucide-react"
import { usePrototype } from "../PrototypeContext"

/**
 * Always-on floating composer at the bottom of the column. Discreet pill
 * by default; expands into a full input row when focused/tapped.
 */
export function Composer() {
  const { sendMessage, currentMood } = usePrototype()
  const [text, setText] = useState("")
  const [focused, setFocused] = useState(false)

  const submit = () => {
    if (!text.trim()) return
    sendMessage(text)
    setText("")
  }

  const expanded = focused || text.length > 0

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
      <div className="pointer-events-auto mx-auto w-full max-w-[640px]">
        <div
          className="flex items-center gap-2 rounded-full border bg-[#0a090f]/80 px-2 py-1.5 backdrop-blur-xl transition-colors light:bg-[#faf6ec]/85"
          style={{
            borderColor: expanded ? currentMood.accent : "rgba(255,255,255,0.12)",
            boxShadow: expanded
              ? `0 12px 32px -12px ${currentMood.accent}66, 0 0 0 1px ${currentMood.accent}33`
              : "0 12px 28px -12px rgba(0,0,0,0.5)",
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
            placeholder={focused ? "Say something to Claudio..." : "和 Claudio 说点什么…"}
            className="font-mono flex-1 bg-transparent px-3 py-1.5 text-[13px] tracking-[0.04em] text-white/90 outline-none placeholder:text-white/35 light:text-black/85 light:placeholder:text-black/40"
            aria-label="Message Claudio"
          />
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-full text-white/65 transition-colors hover:bg-white/8 hover:text-white light:text-black/65 light:hover:bg-black/8 light:hover:text-black"
            aria-label="Voice"
          >
            <Mic size={14} />
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            className="grid h-8 w-8 place-items-center rounded-full transition-all active:scale-95 disabled:opacity-40"
            style={{
              background: text.trim() ? currentMood.accent : "rgba(255,255,255,0.08)",
              color: text.trim() ? "#000" : "rgba(255,255,255,0.55)",
            }}
            aria-label="Send"
          >
            <ArrowUp size={14} strokeWidth={2.6} />
          </button>
        </div>
      </div>
    </div>
  )
}
