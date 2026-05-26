import { Heart } from "lucide-react"
import { usePrototype } from "../PrototypeContext"

export function Toast() {
  const { toast, currentMood } = usePrototype()
  if (!toast) return null
  return (
    <div
      key={toast.id}
      className="pointer-events-none fixed left-1/2 bottom-8 z-50 -translate-x-1/2 animate-[toast-in_220ms_var(--ease-pop)]"
    >
      <div
        className="flex items-center gap-2.5 rounded-full border border-white/12 bg-[#0d0c12]/90 px-4 py-2 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] backdrop-blur-xl"
        style={{ boxShadow: `0 20px 50px -10px ${currentMood.accent}40, inset 0 0 0 1px ${currentMood.accent}33` }}
      >
        <Heart size={13} fill={currentMood.accent} className="text-transparent" />
        <div className="flex items-baseline gap-2">
          <span className="font-pixel text-[11px] tracking-[0.18em] text-white">{toast.text}</span>
          {toast.sub && (
            <span className="font-mono text-[10.5px] text-white/55">{toast.sub}</span>
          )}
        </div>
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  )
}
