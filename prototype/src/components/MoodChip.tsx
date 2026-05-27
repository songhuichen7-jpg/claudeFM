import { ChevronDown } from "lucide-react"
import { usePrototype } from "../PrototypeContext"

type Props = { onOpen: () => void }

/**
 * Single mood pill that lives in the column's header row. Shows the
 * current mood's emoji + label + accent. Tapping it opens the
 * free-text MoodPicker.
 */
export function MoodChip({ onOpen }: Props) {
  const { currentMood } = usePrototype()
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 transition-colors hover:bg-white/[0.07] light:border-black/12 light:bg-black/[0.03] light:hover:bg-black/[0.07]"
      style={{
        boxShadow: `inset 0 0 0 1px ${currentMood.accent}33`,
      }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: currentMood.accent,
          boxShadow: `0 0 8px ${currentMood.accent}aa`,
        }}
      />
      <span className="text-[13px] leading-none">{currentMood.emoji}</span>
      <span className="font-pixel text-[12px] tracking-[0.18em] text-white/90 light:text-black/85">
        {currentMood.label.toUpperCase()}
      </span>
      <ChevronDown
        size={11}
        className="text-white/45 transition-transform group-hover:translate-y-0.5 light:text-black/45"
      />
    </button>
  )
}
