import { useEffect, useRef, useState } from "react"
import { ArrowUp, Mic } from "lucide-react"
import { clsx } from "clsx"
import { usePlayer } from "../state/PlayerContext"

// WebSpeech is still vendor-prefixed in Chromium-based browsers and not in
// lib.dom.d.ts on every TS install. We declare the bare minimum surface we
// touch so the mic button compiles without polluting global type augments.
type SR = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((ev: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SRCtor = new () => SR

function getSpeechCtor(): SRCtor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function InputBar() {
  const { sendMessage } = usePlayer()
  const [text, setText] = useState("")
  const [recording, setRecording] = useState(false)
  const recRef = useRef<SR | null>(null)
  const baseTextRef = useRef("")
  const supportsVoice = getSpeechCtor() !== null

  const submit = (override?: string) => {
    const t = (override ?? text).trim()
    if (!t) return
    sendMessage(t)
    setText("")
  }

  const stopVoice = (commit: boolean) => {
    const rec = recRef.current
    if (rec) {
      try { rec.onresult = null; rec.onerror = null; rec.onend = null; rec.stop() } catch {}
      recRef.current = null
    }
    setRecording(false)
    if (commit) {
      // Use a microtask so the final result has already been flushed into `text`
      setTimeout(() => {
        setText(prev => {
          const t = prev.trim()
          if (t) sendMessage(t)
          return ""
        })
      }, 0)
    }
  }

  const startVoice = () => {
    const Ctor = getSpeechCtor()
    if (!Ctor) return
    let rec: SR
    try {
      rec = new Ctor()
    } catch {
      return
    }
    rec.continuous = false
    rec.interimResults = true
    // navigator.language falls back to en-US; Claudio's primary user is bi-
    // lingual so we let the recognizer auto-pick a fitting locale.
    rec.lang = navigator.language || "zh-CN"
    baseTextRef.current = text
    rec.onresult = (ev) => {
      let interim = ""
      let final = ""
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        if (r.isFinal) final += r[0].transcript
        else interim += r[0].transcript
      }
      const combined = `${baseTextRef.current}${final}${interim}`.replace(/\s+/g, " ").trimStart()
      setText(combined)
    }
    rec.onerror = () => stopVoice(false)
    rec.onend = () => {
      // Auto-submit when the recognizer stops on its own (user stopped talking)
      stopVoice(true)
    }
    try {
      rec.start()
      recRef.current = rec
      setRecording(true)
    } catch {
      // start() throws if a previous instance is still running
      setRecording(false)
    }
  }

  useEffect(() => {
    return () => {
      if (recRef.current) {
        try { recRef.current.stop() } catch {}
      }
    }
  }, [])

  const onMicClick = () => {
    if (!supportsVoice) {
      alert("当前浏览器不支持语音输入（试试 Chrome / Edge）")
      return
    }
    if (recording) stopVoice(true)
    else startVoice()
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
          placeholder={recording ? "在听你说话…" : "Say something to the DJ..."}
          className="font-mono flex-1 bg-transparent px-2 py-1.5 text-[13px] tracking-[0.04em] text-white/90 outline-none placeholder:text-white/30 light:text-black/85 light:placeholder:text-black/35"
          aria-label="Message DJ"
        />
        <button
          type="button"
          onClick={onMicClick}
          aria-label={recording ? "Stop voice input" : "Start voice input"}
          aria-pressed={recording}
          title={supportsVoice ? "按一下说话，再按一下发送" : "当前浏览器不支持语音输入"}
          className={clsx(
            "relative grid h-8 w-8 place-items-center rounded-full transition-colors",
            recording
              ? "bg-rose-500/90 text-white"
              : supportsVoice
                ? "text-white/70 hover:bg-white/8 hover:text-white light:text-black/70 light:hover:bg-black/8 light:hover:text-black"
                : "text-white/30 light:text-black/30",
          )}
        >
          <Mic size={15} />
          {recording && (
            <span
              aria-hidden
              className="absolute inset-0 -z-0 animate-ping rounded-full bg-rose-500/40"
            />
          )}
        </button>
        <button
          type="button"
          onClick={() => submit()}
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
  const { connected } = usePlayer()
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
