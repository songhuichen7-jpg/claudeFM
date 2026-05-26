import { usePrototype } from "../PrototypeContext"
import { mockChips } from "../mockData"

export function QuickChips() {
  const { sendMessage } = usePrototype()

  return (
    <div className="mx-1 mb-2 flex gap-1.5 overflow-x-auto px-3 pb-1 thin-scroll" style={{ scrollbarWidth: "none" }}>
      <style>{`.qc::-webkit-scrollbar { display: none; }`}</style>
      <div className="qc flex gap-1.5">
        {mockChips.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => sendMessage(c)}
            className="shrink-0 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 font-mono text-[11.5px] text-white/80 transition-colors hover:border-white/25 hover:bg-white/[0.08] hover:text-white active:scale-[0.97] light:border-black/12 light:bg-black/[0.03] light:text-black/80 light:hover:border-black/25 light:hover:bg-black/[0.08] light:hover:text-black"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}
