import { useState } from "react"
import { ArrowUp, Mic } from "lucide-react"
import { usePrototype } from "../PrototypeContext"

export function InputBar() {
  const { sendMessage } = usePrototype()
  const [text, setText] = useState("")

  const submit = () => {
    if (!text.trim()) return
    sendMessage(text)
    setText("")
  }

  return (
    <div className="px-4 pb-3 pt-1">
      <div className="capsule-ring flex items-center gap-2 rounded-full bg-white/[0.04] px-2.5 py-1.5 backdrop-blur-md light:bg-white/80">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Say something to the DJ..."
          className="font-mono flex-1 bg-transparent px-2 py-1.5 text-[13px] tracking-[0.04em] text-white/90 outline-none placeholder:text-white/30 light:text-black/85 light:placeholder:text-black/35"
          aria-label="Message DJ"
        />
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/8 hover:text-white light:text-black/70 light:hover:bg-black/8 light:hover:text-black"
          aria-label="Voice"
        >
          <Mic size={15} />
        </button>
        <button
          type="button"
          onClick={submit}
          className="grid h-8 w-8 place-items-center rounded-full bg-white text-black transition-transform hover:scale-[1.04] active:scale-95 light:bg-black light:text-white"
          aria-label="Send"
        >
          <ArrowUp size={15} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  )
}

export function Footer() {
  const { connected } = usePrototype()
  return (
    <div className="flex items-center justify-between px-5 pb-4 pt-1 font-pixel text-[10px] tracking-[0.32em] text-white/30 light:text-black/35">
      <span>CLAUDIO FM</span>
      <span className="inline-flex items-center gap-1.5">
        <span className={connected ? "inline-block h-1 w-1 rounded-full bg-[#29ffb8]" : "inline-block h-1 w-1 rounded-full bg-white/25 light:bg-black/25"} />
        {connected ? "CONNECTED" : "OFFLINE"}
      </span>
    </div>
  )
}
