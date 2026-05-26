import { useEffect, useMemo, useState } from "react"
import { ChevronDown, RefreshCw, Save, Wifi, WifiOff, Plus, Check, Sparkles, ArrowRight } from "lucide-react"
import { clsx } from "clsx"
import { usePrototype } from "../PrototypeContext"

type Props = { open: boolean; onClose: () => void }

export function SettingsView({ open, onClose }: Props) {
  const {
    health,
    connected,
    theme,
    toggleTheme,
    profiles,
    switchProfile,
    tasteFiles,
    saveTasteFile,
  } = usePrototype()

  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(tasteFiles.map(f => [f.name, f.body])),
  )
  const [savedAt, setSavedAt] = useState<Record<string, number>>({})
  const [savingName, setSavingName] = useState<string | null>(null)
  const [openFile, setOpenFile] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [newProfileOpen, setNewProfileOpen] = useState(false)
  const [npId, setNpId] = useState("")
  const [npName, setNpName] = useState("")

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

  const handleCreateProfile = () => {
    setNpId("")
    setNpName("")
    setNewProfileOpen(false)
  }

  const handleManualBroadcast = () => {
    setBusy(true)
    window.setTimeout(() => setBusy(false), 800)
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#07070b] text-white">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <span className="font-pixel text-[22px] tracking-[0.02em]">Settings</span>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close settings"
        >
          <ChevronDown size={18} />
        </button>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto px-5 pb-5">
        {/* Profile picker */}
        <section className="mb-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-pixel text-[12px] tracking-[0.22em] text-white/55">语料档</h3>
            <button
              type="button"
              onClick={() => setNewProfileOpen(o => !o)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 font-pixel text-[10px] tracking-[0.18em] text-white/80 hover:bg-white/8"
            >
              <Plus size={11} /> 新建
            </button>
          </div>

          {newProfileOpen && (
            <div className="mt-3 rounded-xl bg-black/40 p-3">
              <div className="mb-2 grid grid-cols-2 gap-2">
                <input
                  value={npId}
                  onChange={e => setNpId(e.target.value.toLowerCase())}
                  placeholder="id (a-z0-9_-)"
                  className="rounded-md bg-white/5 px-2 py-1.5 font-mono text-[12px] text-white outline-none placeholder:text-white/30"
                />
                <input
                  value={npName}
                  onChange={e => setNpName(e.target.value)}
                  placeholder="显示名"
                  className="rounded-md bg-white/5 px-2 py-1.5 font-mono text-[12px] text-white outline-none placeholder:text-white/30"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewProfileOpen(false)}
                  className="rounded-md px-2.5 py-1 font-pixel text-[10px] tracking-[0.18em] text-white/55 hover:text-white"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleCreateProfile}
                  disabled={!npId || !npName}
                  className="rounded-md bg-white px-2.5 py-1 font-pixel text-[10px] tracking-[0.18em] text-black disabled:opacity-30"
                >
                  创建
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 space-y-1.5">
            {profiles.map(p => {
              const isActive = p.id === active
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => !isActive && switchProfile(p.id)}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors",
                    isActive
                      ? "border-[#29ffb8]/40 bg-[#29ffb8]/10"
                      : "border-white/8 bg-white/[0.02] hover:bg-white/[0.05]",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-black/40 text-base">
                      {p.avatar ?? "👤"}
                    </span>
                    <div>
                      <div className="font-pixel text-[13px] tracking-[0.06em] text-white">
                        {p.name}
                      </div>
                      <div className="font-mono text-[10px] text-white/40">
                        {p.id} · {p.corpus_dir}/
                      </div>
                    </div>
                  </div>
                  {isActive && <Check size={14} className="text-[#29ffb8]" />}
                </button>
              )
            })}
          </div>
        </section>

        {/* Server status */}
        <section className="mb-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <h3 className="font-pixel text-[12px] tracking-[0.22em] text-white/55">服务器状态</h3>
          <div className="mt-3 grid grid-cols-2 gap-y-2 text-[13px]">
            <Row label="WebSocket" value={connected ? "connected" : "offline"} ok={connected} />
            <Row label="Claude CLI" value={health.claude ? "ok" : "unavailable (fallback)"} ok={health.claude} />
            <Row label="网易云" value="ok" ok />
            <Row
              label="TTS"
              value={
                health.ttsProvider === "mimo"
                  ? "Xiaomi MiMo V2.5"
                  : health.ttsProvider === "fish"
                  ? "Fish Audio"
                  : "silent fallback"
              }
              ok={health.ttsProvider !== "silent"}
            />
            <Row label="天气" value={health.weather ? "open-meteo ok" : "—"} ok={health.weather} />
            <Row label="飞书日历" value={health.calendar ? "linked" : "not configured"} ok={health.calendar} />
            <Row label="Naim 客厅" value={health.naim ? "pushed" : "not configured"} ok={health.naim} />
            <Row label="Active profile" value={active} ok />
          </div>
        </section>

        {/* Theme */}
        <section className="mb-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-pixel text-[12px] tracking-[0.22em] text-white/55">主题</h3>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full border border-white/10 px-3 py-1 font-pixel text-[11px] tracking-[0.22em] text-white/85 transition-colors hover:bg-white/8"
            >
              {theme.toUpperCase()}
            </button>
          </div>
        </section>

        {/* Manual trigger */}
        <section className="mb-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-pixel text-[12px] tracking-[0.22em] text-white/55">手动触发</h3>
            <button
              type="button"
              disabled={busy}
              onClick={handleManualBroadcast}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 font-pixel text-[11px] tracking-[0.22em] text-white/85 transition-colors hover:bg-white/8 disabled:opacity-40"
            >
              <RefreshCw size={11} className={busy ? "animate-spin" : ""} />
              广播一首
            </button>
          </div>
        </section>

        {/* NCM login (static prototype) */}
        <section className="mb-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-pixel text-[12px] tracking-[0.22em] text-white/55">网易云账号</h3>
            <button
              type="button"
              className="rounded-full border border-white/10 px-3 py-1 font-pixel text-[10px] tracking-[0.18em] text-white/85 hover:bg-white/8"
            >
              扫码登录
            </button>
          </div>
          <p className="mt-3 font-mono text-[12px] text-white/45">
            未登录时所有带版权的歌只返回 30 秒试听。登录后能拿完整音频（前提：你账号是 VIP）。
          </p>
        </section>

        {/* Taste import (static prototype) */}
        <section className="mb-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-pixel text-[12px] tracking-[0.22em] text-white/55">从汽水音乐导入</h3>
            <span className="font-mono text-[10px] text-white/35">paste → Claude → propose</span>
          </div>
          <p className="mt-1 font-mono text-[11px] leading-snug text-white/40">
            把你最近在汽水里听的歌粘进来（截屏 OCR / 列表 / 一行一首 都行），
            Claude 会对照现有 taste.md / playlists.json 给出改写提案，你确认后才落盘。
          </p>
          <textarea
            spellCheck={false}
            placeholder={`粘进来就行。例：\n- Plastic Love · Mariya Takeuchi\n- 起风了 · 买辣椒也用券\n- Says · Nils Frahm\n...`}
            className="thin-scroll mt-2 h-40 w-full resize-y rounded-md bg-black/50 p-2 font-mono text-[12px] leading-snug text-white/85 outline-none placeholder:text-white/25"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 font-pixel text-[10px] tracking-[0.18em] text-white hover:bg-white/8"
            >
              <Sparkles size={11} />
              Claude 分析
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-pixel text-[10px] tracking-[0.18em] text-black hover:scale-[1.02]"
            >
              应用到当前 profile
              <ArrowRight size={11} />
            </button>
          </div>
        </section>

        {/* Taste editor */}
        <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <h3 className="mb-2 font-pixel text-[12px] tracking-[0.22em] text-white/55">
            品味语料（active profile <span className="text-white/80">{active}</span>）
          </h3>
          <div className="space-y-2">
            {tasteFiles.map(f => {
              const isDirty = !!dirty[f.name]
              const isSaving = savingName === f.name
              const justSaved = (savedAt[f.name] ?? 0) > Date.now() - 3000
              const isOpen = openFile === f.name
              return (
                <div key={f.name} className="rounded-lg bg-black/30 p-3">
                  <button
                    type="button"
                    onClick={() => setOpenFile(o => (o === f.name ? null : f.name))}
                    className="flex w-full items-center justify-between"
                  >
                    <span className="font-pixel text-[11px] tracking-[0.18em] text-white/85">
                      {f.name}
                    </span>
                    <span className="font-mono text-[10px] text-white/35">
                      {isDirty && !justSaved && "·未保存"}
                      {justSaved && !isDirty && <span className="text-[#29ffb8]">·已保存</span>}
                    </span>
                  </button>
                  {isOpen && (
                    <>
                      <textarea
                        value={drafts[f.name] ?? ""}
                        onChange={e => setDrafts(d => ({ ...d, [f.name]: e.target.value }))}
                        spellCheck={false}
                        className="thin-scroll mt-2 h-56 w-full resize-y rounded-md bg-black/50 p-2 font-mono text-[12px] leading-snug text-white/85 outline-none"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          disabled={!isDirty || isSaving}
                          onClick={() => handleSave(f.name)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1 font-pixel text-[10px] tracking-[0.18em] text-black disabled:opacity-30"
                        >
                          <Save size={11} className={isSaving ? "animate-pulse" : ""} />
                          保存
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <>
      <div className="font-mono text-[12px] text-white/55">{label}</div>
      <div className="flex items-center justify-end gap-1.5 font-mono text-[12px]">
        {ok ? <Wifi size={11} className="text-[#29ffb8]" /> : <WifiOff size={11} className="text-white/35" />}
        <span className={ok ? "text-white/85" : "text-white/45"}>{value}</span>
      </div>
    </>
  )
}
