import { useEffect, useMemo, useState } from "react"
import { Check, Save, X } from "lucide-react"
import { clsx } from "clsx"
import { usePrototype } from "../PrototypeContext"
import { mockSchedule } from "../mockData"

type Props = { open: boolean; onClose: () => void }

const ACCENT = "var(--accent)"

export function SettingsView({ open, onClose }: Props) {
  const { health, connected, profiles, switchProfile, tasteFiles, saveTasteFile } = usePrototype()
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(tasteFiles.map(f => [f.name, f.body])),
  )
  const [savedAt, setSavedAt] = useState<Record<string, number>>({})
  const [savingName, setSavingName] = useState<string | null>(null)
  const [openFile, setOpenFile] = useState<string | null>(null)
  const active = health.activeProfile

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const dirty = useMemo(() => {
    const out: Record<string, boolean> = {}
    for (const f of tasteFiles) out[f.name] = (drafts[f.name] ?? "") !== f.body
    return out
  }, [drafts, tasteFiles])

  if (!open) return null

  const handleSave = (name: string) => {
    setSavingName(name)
    window.setTimeout(() => {
      saveTasteFile(name, drafts[name] ?? "")
      setSavedAt(s => ({ ...s, [name]: Date.now() }))
      setSavingName(null)
    }, 400)
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#060607]/97 backdrop-blur-sm light:bg-[#f4f1ea]/97">
      <div className="flex items-center justify-between border-b border-white/8 px-5 pt-4 pb-3 light:border-black/10">
        <span className="font-pixel text-[18px] tracking-[0.04em] text-white/90 light:text-black/85">Settings</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="grid h-7 w-7 place-items-center rounded-md text-white/55 transition-colors hover:bg-white/8 hover:text-white light:text-black/55 light:hover:bg-black/8 light:hover:text-black"
        >
          <X size={15} />
        </button>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        {/* Corpus / profiles */}
        <Section title="语料档 · CORPUS">
          <div className="flex flex-col gap-1">
            {profiles.map(p => {
              const isActive = p.id === active
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => !isActive && switchProfile(p.id)}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors"
                  style={
                    isActive
                      ? { borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)", background: "var(--accent-soft)" }
                      : { borderColor: "rgba(255,255,255,0.08)" }
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{p.avatar ?? "👤"}</span>
                    <div>
                      <div className="font-mono text-[12px] text-white/90 light:text-black/85">{p.name}</div>
                      <div className="font-mono text-[9px] tracking-[0.12em] text-white/35 light:text-black/40">
                        {p.id} · {p.corpus_dir}/
                      </div>
                    </div>
                  </div>
                  {isActive && <Check size={13} style={{ color: ACCENT }} />}
                </button>
              )
            })}
          </div>
        </Section>

        {/* Server status */}
        <Section title="服务器状态 · STATUS">
          <div className="grid grid-cols-2 gap-y-1.5">
            <Row label="WebSocket" value={connected ? "connected" : "offline"} ok={connected} />
            <Row label="Claude CLI" value={health.claude ? "ok" : "fallback"} ok={health.claude} />
            <Row label="网易云" value="ok" ok />
            <Row label="TTS" value={health.ttsProvider === "mimo" ? "Xiaomi MiMo" : health.ttsProvider === "fish" ? "Fish Audio" : "silent"} ok={health.ttsProvider !== "silent"} />
            <Row label="天气" value={health.weather ? "open-meteo" : "—"} ok={health.weather} />
            <Row label="飞书日历" value={health.calendar ? "linked" : "—"} ok={health.calendar} />
            <Row label="Naim 客厅" value={health.naim ? "pushed" : "—"} ok={health.naim} />
            <Row label="Profile" value={active} ok />
          </div>
        </Section>

        {/* Today's schedule — the time-blocked plan */}
        <Section title="今日编排 · SCHEDULE">
          <div className="flex flex-col gap-3">
            {mockSchedule.map(b => (
              <div key={b.range}>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[10px] tracking-[0.12em]" style={{ color: ACCENT }}>▸ {b.range}</span>
                  <span className="font-mono text-[11px] text-white/85 light:text-black/80">{b.label}</span>
                  <span className="ml-auto font-mono text-[9px] tracking-[0.16em] text-white/30 light:text-black/40">{b.device}</span>
                </div>
                <ul className="mt-1 space-y-0.5 pl-3">
                  {b.tracks.map(t => (
                    <li key={t} className="font-mono text-[11px] leading-relaxed text-white/50 light:text-black/55">· {t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* NCM account */}
        <Section
          title="网易云账号 · NCM"
          action={<TinyBtn>扫码登录</TinyBtn>}
        >
          <p className="font-mono text-[11px] leading-relaxed text-white/45 light:text-black/50">
            未登录只返回 30 秒试听。登录后拿完整音频（前提：账号是 VIP）。
          </p>
        </Section>

        {/* Taste files */}
        <Section title={`品味语料 · ${active}`}>
          <div className="flex flex-col gap-1">
            {tasteFiles.map(f => {
              const isDirty = !!dirty[f.name]
              const isSaving = savingName === f.name
              const justSaved = (savedAt[f.name] ?? 0) > Date.now() - 3000
              const isOpen = openFile === f.name
              return (
                <div key={f.name} className="rounded-md border border-white/8 light:border-black/8">
                  <button
                    type="button"
                    onClick={() => setOpenFile(o => (o === f.name ? null : f.name))}
                    className="flex w-full items-center justify-between px-3 py-2"
                  >
                    <span className="font-mono text-[11px] tracking-[0.06em] text-white/85 light:text-black/80">{f.name}</span>
                    <span className="font-mono text-[9px] tracking-[0.12em] text-white/35 light:text-black/40">
                      {isDirty && !justSaved && "· 未保存"}
                      {justSaved && !isDirty && <span style={{ color: ACCENT }}>· 已保存</span>}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3">
                      <textarea
                        value={drafts[f.name] ?? ""}
                        onChange={e => setDrafts(d => ({ ...d, [f.name]: e.target.value }))}
                        spellCheck={false}
                        className="thin-scroll h-48 w-full resize-y rounded-md border border-white/10 bg-black/40 p-2 font-mono text-[11px] leading-relaxed text-white/85 outline-none light:border-black/10 light:bg-white/50 light:text-black/80"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          disabled={!isDirty || isSaving}
                          onClick={() => handleSave(f.name)}
                          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-[10px] tracking-[0.14em] text-black disabled:opacity-30"
                          style={{ background: ACCENT }}
                        >
                          <Save size={11} className={isSaving ? "animate-pulse" : ""} /> 保存
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-mono text-[10px] tracking-[0.26em] text-white/45 light:text-black/45">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <>
      <div className="font-mono text-[11px] text-white/55 light:text-black/55">{label}</div>
      <div className="flex items-center justify-end gap-1.5 font-mono text-[11px]">
        <span
          className="inline-block h-1 w-1 rounded-full"
          style={{ background: ok ? ACCENT : "rgba(255,255,255,0.25)" }}
        />
        <span className={ok ? "text-white/85 light:text-black/80" : "text-white/40 light:text-black/45"}>{value}</span>
      </div>
    </>
  )
}

function TinyBtn({ children, solid }: { children: React.ReactNode; solid?: boolean }) {
  return (
    <button
      type="button"
      className={clsx(
        "rounded-md px-3 py-1 font-mono text-[10px] tracking-[0.14em] transition-colors",
        solid ? "text-black" : "border border-white/12 text-white/85 hover:bg-white/8 light:border-black/15 light:text-black/80 light:hover:bg-black/8",
      )}
      style={solid ? { background: ACCENT } : undefined}
    >
      {children}
    </button>
  )
}
