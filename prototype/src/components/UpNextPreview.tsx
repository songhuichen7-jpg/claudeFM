import { ChevronUp } from "lucide-react"
import { usePrototype } from "../PrototypeContext"

type Props = { onOpenQueue: () => void }

export function UpNextPreview({ onOpenQueue }: Props) {
  const { upcoming } = usePrototype()
  const first = upcoming[0]

  return (
    <button
      type="button"
      onClick={onOpenQueue}
      className="group mx-3 mb-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.025] px-3.5 py-2.5 text-left transition-colors hover:border-white/15 hover:bg-white/[0.05] light:border-black/10 light:bg-black/[0.025] light:hover:border-black/20 light:hover:bg-black/[0.05]"
    >
      <div className="flex flex-col items-start">
        <span className="font-pixel text-[9px] tracking-[0.24em] text-white/40 light:text-black/40">
          UP NEXT
        </span>
        <span className="mt-0.5 font-pixel text-[9px] tracking-[0.22em] text-white/30 light:text-black/30">
          · {upcoming.length} ·
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate font-serif text-[14.5px] leading-tight text-white/95 light:text-black/85">
          <span className="italic">{first.track.title}</span>
          <span className="mx-1.5 text-white/30">·</span>
          <span className="text-white/70 light:text-black/65">{first.track.artist}</span>
        </div>
        <div className="truncate font-mono text-[10.5px] text-white/45 light:text-black/45">
          "{first.caption}"
        </div>
      </div>
      <ChevronUp
        size={16}
        className="shrink-0 text-white/35 transition-colors group-hover:text-white/75 light:text-black/35 light:group-hover:text-black/75"
      />
    </button>
  )
}
