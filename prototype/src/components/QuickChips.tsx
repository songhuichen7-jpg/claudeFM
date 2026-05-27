import { Sparkles } from "lucide-react"
import { usePrototype } from "../PrototypeContext"
import { mockFallbackChips, mockTrackChips } from "../mockData"

/**
 * Three contextual suggestions from Claudio about what to do next.
 * Refresh when the current track changes (so each new DJ turn brings
 * a fresh set of "would you like…" prompts). Not a fixed menu of seven
 * verbs anymore — these read as the DJ asking you, not a control panel.
 */
export function QuickChips() {
  const { sendMessage, currentTrack, currentMood } = usePrototype()
  const pool = (currentTrack && mockTrackChips[currentTrack.id]) ?? mockFallbackChips

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pb-3">
      <div className="mb-1.5 flex items-center gap-1.5 font-pixel text-[9.5px] tracking-[0.24em] text-white/40 light:text-black/45">
        <Sparkles size={10} style={{ color: currentMood.accent }} />
        CLAUDIO ASKS
      </div>
      <div className="flex flex-wrap gap-1.5">
        {pool.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => sendMessage(c)}
            className="group rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 font-serif text-[13.5px] italic text-white/85 transition-colors hover:bg-white/[0.07] hover:text-white active:scale-[0.97] light:border-black/12 light:bg-black/[0.025] light:text-black/85 light:hover:bg-black/[0.07] light:hover:text-black"
            style={{
              boxShadow: `inset 0 0 0 1px ${currentMood.accent}22`,
            }}
          >
            「{c}」
          </button>
        ))}
      </div>
    </div>
  )
}
