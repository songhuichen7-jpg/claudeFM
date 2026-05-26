import { MessageCircle } from "lucide-react"
import { usePrototype } from "../PrototypeContext"
import type { DJMessage } from "../types"

type Props = { onOpenChat: () => void }

export function DJCaption({ onOpenChat }: Props) {
  const { messages, activeDJId, djElapsedMs } = usePrototype()
  const lastDJ = [...messages].reverse().find(m => m.kind === "dj") as DJMessage | undefined
  if (!lastDJ) return null

  const isLive = activeDJId === lastDJ.id

  return (
    <button
      type="button"
      onClick={onOpenChat}
      className="group mx-4 mb-2 flex items-start gap-2.5 rounded-2xl border border-white/8 bg-white/[0.025] px-3.5 py-2.5 text-left transition-colors hover:border-white/15 hover:bg-white/[0.05] light:border-black/10 light:bg-black/[0.025] light:hover:border-black/20 light:hover:bg-black/[0.05]"
    >
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/40 to-fuchsia-500/30 ring-1 ring-white/15">
        <span className="font-pixel text-[8px] text-white">C</span>
      </span>
      <p className="font-serif text-[14px] leading-snug text-white/85 light:text-black/85 line-clamp-2 flex-1">
        {lastDJ.words.map((w, i) => {
          if (!w.text.trim()) return <span key={i}>{w.text}</span>
          let cls = ""
          if (isLive) {
            if (djElapsedMs >= w.start && djElapsedMs <= w.end) cls = "word active"
            else if (djElapsedMs > w.end) cls = "word past"
            else cls = "word"
          }
          return (
            <span key={i} className={cls}>
              {w.text}
            </span>
          )
        })}
      </p>
      <MessageCircle
        size={14}
        className="mt-1 shrink-0 text-white/35 transition-colors group-hover:text-white/75 light:text-black/35 light:group-hover:text-black/75"
      />
    </button>
  )
}
