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
    <div className="px-4 pt-2 pb-2.5 sm:px-5">
      <div
        className="flex items-center gap-2 rounded-lg border bg-white/[0.02] px-2.5 py-1.5 transition-colors light:bg-black/[0.02]"
        style={{ borderColor: focused ? "var(--accent)" : "rgba(255,255,255,0.10)" }}
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
          className="font-mono flex-1 bg-transparent px-1.5 py-1 text-[12.5px] tracking-[0.02em] text-white/90 outline-none placeholder:text-white/30 light:text-black/85 light:placeholder:text-black/35"
          aria-label="Message DJ"
        />
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded-md text-white/55 transition-colors hover:bg-white/8 hover:text-white light:text-black/55 light:hover:bg-black/8 light:hover:text-black"
          aria-label="Voice"
        >
          <Mic size={14} />
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          className="grid h-7 w-7 place-items-center rounded-md transition-transform active:scale-95 disabled:opacity-30"
          style={{ background: text.trim() ? "var(--accent)" : "rgba(255,255,255,0.08)", color: text.trim() ? "#04140d" : "rgba(255,255,255,0.5)" }}
          aria-label="Send"
        >
          <ArrowUp size={14} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  )
}

export function Footer() {
  const { connected } = usePlayer()
  return (
    <div className="flex items-center justify-between px-5 pb-3 pt-0.5 font-mono text-[9px] tracking-[0.32em] text-white/25 light:text-black/35">
      <span>CLAUDIO FM</span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-1 w-1 rounded-full"
          style={{ background: connected ? "var(--accent)" : "rgba(255,255,255,0.25)" }}
        />
        {connected ? "CONNECTED" : "OFFLINE"}
      </span>
    </div>
  )
}
