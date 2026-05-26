import { useEffect, useMemo, useState } from "react"
import { ChevronDown, RefreshCw, Save, Wifi, WifiOff, Plus, Check, Trash2, Sparkles, ArrowRight } from "lucide-react"
import { clsx } from "clsx"
import { usePlayer } from "../state/PlayerContext"
import { api, type TasteProposal } from "../api/client"
import { NcmLoginPanel } from "./LoginCard"

type Props = { open: boolean; onClose: () => void }

export function SettingsView({ open, onClose }: Props) {
  const {
    health,
    connected,
    triggerScheduled,
    theme,
    toggleTheme,
    profiles,
    refreshProfiles,
    switchProfile,
    createProfile,
    refreshTaste,
    saveTasteFile,
  } = usePlayer()
  const [taste, setTaste] = useState<{ name: string; body: string }[] | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savedAt, setSavedAt] = useState<Record<string, number>>({})
  const [savingName, setSavingName] = useState<string | null>(null)
  const [openFile, setOpenFile] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [newProfileOpen, setNewProfileOpen] = useState(false)
  const [npId, setNpId] = useState("")
  const [npName, setNpName] = useState("")
  const [npErr, setNpErr] = useState<string | null>(null)

  const active = health?.activeProfile ?? "default"

  useEffect(() => {
    if (!open) return
    refreshTaste()
      .then(files => {
        setTaste(files)
        setDrafts(Object.fromEntries(files.map(f => [f.name, f.body])))
      })
      .catch(() => setTaste([]))
    refreshProfiles()
  }, [open, refreshTaste, refreshProfiles, active])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const dirty = useMemo(() => {
    if (!taste) return {}
    const out: Record<string, boolean> = {}
    for (const f of taste) out[f.name] = (drafts[f.name] ?? "") !== f.body
    return out
  }, [drafts, taste])

  if (!open) return null

  const handleSave = async (name: string) => {
    setSavingName(name)
    try {
      await saveTasteFile(name, drafts[name] ?? "")
      // Mark saved (collapse dirty state)
      setTaste(prev =>
        prev ? prev.map(f => (f.name === name ? { ...f, body: drafts[name] ?? "" } : f)) : prev,
      )
      setSavedAt(s => ({ ...s, [name]: Date.now() }))
    } catch (err) {
      alert(`保存失败：${(err as Error).message}`)
    } finally {
      setSavingName(null)
    }
  }

  const handleCreateProfile = async () => {
    setNpErr(null)
    try {
      await createProfile(npId, npName)
      setNpId("")
      setNpName("")
      setNewProfileOpen(false)
    } catch (err) {
      setNpErr((err as Error).message)
    }
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
              {npErr && (
                <p className="mb-2 font-mono text-[11px] text-rose-400">{npErr}</p>
              )}
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
            {profiles.length === 0 && <p className="font-mono text-[12px] text-white/35">加载中…</p>}
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
            <Row label="Claude CLI" value={health?.claude ? "ok" : "unavailable (fallback)"} ok={!!health?.claude} />
            <Row label="网易云" value="ok" ok />
            <Row
              label="TTS"
              value={
                health?.ttsProvider === "mimo"
                  ? "Xiaomi MiMo V2.5"
                  : health?.ttsProvider === "fish"
                  ? "Fish Audio"
                  : "silent fallback"
              }
              ok={health?.ttsProvider === "mimo" || health?.ttsProvider === "fish"}
            />
            <Row label="天气" value={health?.weather ? "open-meteo ok" : "—"} ok={!!health?.weather} />
            <Row label="飞书日历" value={health?.calendar ? "linked" : "not configured"} ok={!!health?.calendar} />
            <Row label="Naim 客厅" value={health?.naim ? "pushed" : "not configured"} ok={!!health?.naim} />
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
              onClick={async () => {
                setBusy(true)
                await triggerScheduled("用户在 Settings 里手动触发了一次播报")
                setBusy(false)
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 font-pixel text-[11px] tracking-[0.22em] text-white/85 transition-colors hover:bg-white/8 disabled:opacity-40"
            >
              <RefreshCw size={11} className={busy ? "animate-spin" : ""} />
              广播一首
            </button>
          </div>
        </section>

        {/* NCM login */}
        <NcmLoginPanel />

        {/* Taste import */}
        <TasteImport onApplied={async () => {
          const fresh = await refreshTaste()
          setTaste(fresh)
          setDrafts(Object.fromEntries(fresh.map(f => [f.name, f.body])))
        }} />

        {/* Taste editor */}
        <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <h3 className="mb-2 font-pixel text-[12px] tracking-[0.22em] text-white/55">
            品味语料（active profile <span className="text-white/80">{active}</span>）
          </h3>
          {!taste ? (
            <p className="font-mono text-[12px] text-white/40">读取中…</p>
          ) : taste.length === 0 ? (
            <p className="font-mono text-[12px] text-white/40">无语料文件</p>
          ) : (
            <div className="space-y-2">
              {taste.map(f => {
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
          )}
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

// Used to silence unused-import linting under tree-shake; kept for future
// per-profile delete UI.
void Trash2

// NcmLoginPanel now lives in ./LoginCard.tsx (shared between Header LOGIN
// modal and Settings).

function TasteImport({ onApplied }: { onApplied: () => Promise<void> }) {
  const [paste, setPaste] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [proposal, setProposal] = useState<TasteProposal | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [appliedAt, setAppliedAt] = useState<number | null>(null)
  // Live progress while Claude is streaming back
  const [phase, setPhase] = useState<"idle" | "spawn" | "thinking" | "writing" | "parsing" | "done">("idle")
  const [phaseNote, setPhaseNote] = useState<string>("")
  const [partialChars, setPartialChars] = useState(0)
  const [partialPreview, setPartialPreview] = useState("")
  const [elapsedSec, setElapsedSec] = useState(0)

  // Tick elapsed timer while analyzing
  useEffect(() => {
    if (!analyzing) return
    const t0 = Date.now()
    const id = window.setInterval(() => setElapsedSec(Math.round((Date.now() - t0) / 1000)), 1000)
    return () => window.clearInterval(id)
  }, [analyzing])

  const analyze = async () => {
    setErr(null)
    setProposal(null)
    setPartialChars(0)
    setPartialPreview("")
    setPhase("idle")
    setPhaseNote("")
    setElapsedSec(0)
    if (paste.trim().length < 4) {
      setErr("先粘几首歌进来再让 Claude 分析吧")
      return
    }
    setAnalyzing(true)
    try {
      const final = await api.analyzeTasteStream(paste, ev => {
        if (ev.kind === "phase") { setPhase(ev.phase); setPhaseNote(ev.note ?? "") }
        else if (ev.kind === "partial") { setPartialChars(ev.chars); setPartialPreview(ev.preview) }
        else if (ev.kind === "error") setErr(ev.message)
      })
      setProposal(final)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setAnalyzing(false)
    }
  }

  const apply = async () => {
    if (!proposal) return
    setApplying(true)
    setErr(null)
    try {
      const r = await api.applyTaste({
        taste_md: proposal.taste_md,
        playlists_json: proposal.playlists_json,
      })
      if (!r.ok) throw new Error(r.error ?? "apply failed")
      setAppliedAt(Date.now())
      await onApplied()
      // Clear after a beat so user sees the "已应用" state
      window.setTimeout(() => {
        setProposal(null)
        setPaste("")
        setAppliedAt(null)
      }, 2500)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setApplying(false)
    }
  }

  return (
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
        value={paste}
        onChange={e => setPaste(e.target.value)}
        spellCheck={false}
        placeholder={`粘进来就行。例：\n- Plastic Love · Mariya Takeuchi\n- 起风了 · 买辣椒也用券\n- Says · Nils Frahm\n...`}
        className="thin-scroll mt-2 h-40 w-full resize-y rounded-md bg-black/50 p-2 font-mono text-[12px] leading-snug text-white/85 outline-none placeholder:text-white/25"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="font-mono text-[11px] text-white/40">{paste.length} 字符</div>
        <div className="flex gap-2">
          {proposal && (
            <button
              type="button"
              onClick={() => setProposal(null)}
              className="rounded-md px-2.5 py-1 font-pixel text-[10px] tracking-[0.18em] text-white/55 hover:text-white"
            >
              丢弃提案
            </button>
          )}
          <button
            type="button"
            disabled={analyzing || !paste.trim()}
            onClick={analyze}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 font-pixel text-[10px] tracking-[0.18em] text-white hover:bg-white/8 disabled:opacity-30"
          >
            <Sparkles size={11} className={analyzing ? "animate-pulse" : ""} />
            {analyzing ? "Claude 分析中…" : "Claude 分析"}
          </button>
        </div>
      </div>

      {/* Live progress UI: phase chips + preview text streaming in */}
      {(analyzing || (phase !== "idle" && phase !== "done")) && (
        <div className="mt-3 rounded-xl border border-white/8 bg-black/30 p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(["spawn", "thinking", "writing", "parsing", "done"] as const).map(p => {
              const order = ["idle", "spawn", "thinking", "writing", "parsing", "done"]
              const reached = order.indexOf(phase) >= order.indexOf(p)
              const active = phase === p
              const label = p === "spawn" ? "唤起 Claude" : p === "thinking" ? "思考中" : p === "writing" ? "在写提案" : p === "parsing" ? "整理" : "完成"
              return (
                <span
                  key={p}
                  className={clsx(
                    "rounded-full px-2 py-0.5 font-pixel text-[10px] tracking-[0.16em] transition-colors",
                    active && "bg-[#29ffb8]/15 text-[#29ffb8]",
                    !active && reached && "bg-white/10 text-white/70",
                    !reached && "bg-white/5 text-white/30",
                  )}
                >
                  {label}
                </span>
              )
            })}
            <span className="ml-auto font-mono text-[10px] tabular-nums text-white/45">
              {elapsedSec}s · {partialChars} chars
            </span>
          </div>
          {phaseNote && <p className="mt-2 font-mono text-[10px] text-white/55">{phaseNote}</p>}
          {partialPreview && (
            <p className="thin-scroll mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-white/60">
              …{partialPreview}
            </p>
          )}
        </div>
      )}

      {err && <p className="mt-2 font-mono text-[11px] text-rose-400">{err}</p>}

      {proposal && (
        <div className="mt-3 space-y-2 rounded-xl bg-black/40 p-3">
          <div>
            <h4 className="font-pixel text-[11px] tracking-[0.18em] text-[#29ffb8]">分析摘要</h4>
            <p className="mt-1 font-serif text-[13px] leading-snug text-white/90">
              {proposal.summary || "(no summary)"}
            </p>
          </div>
          <div>
            <h4 className="font-pixel text-[11px] tracking-[0.18em] text-white/55">
              抽到 {proposal.detected_tracks.length} 首
            </h4>
            <div className="thin-scroll mt-1 max-h-32 overflow-y-auto font-mono text-[11px] leading-snug text-white/70">
              {proposal.detected_tracks.length === 0 ? (
                <p className="text-white/40">没抽到歌（贴的内容里只有零散关键词？）</p>
              ) : (
                proposal.detected_tracks.map((t, i) => (
                  <div key={i}>
                    {t.title}
                    {t.artist && <span className="text-white/40"> · {t.artist}</span>}
                  </div>
                ))
              )}
            </div>
          </div>
          <details className="rounded-md bg-white/[0.03] p-2">
            <summary className="cursor-pointer font-pixel text-[10px] tracking-[0.18em] text-white/55 marker:text-white/30">
              查看新 taste.md（{proposal.taste_md?.length ?? 0} 字符）
            </summary>
            <pre className="thin-scroll mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-white/80">
              {proposal.taste_md ?? "(unchanged)"}
            </pre>
          </details>
          <details className="rounded-md bg-white/[0.03] p-2">
            <summary className="cursor-pointer font-pixel text-[10px] tracking-[0.18em] text-white/55 marker:text-white/30">
              查看新 playlists.json
            </summary>
            <pre className="thin-scroll mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-white/80">
              {proposal.playlists_json
                ? JSON.stringify(proposal.playlists_json, null, 2)
                : "(unchanged)"}
            </pre>
          </details>
          <div className="flex items-center justify-end gap-2 pt-1">
            {appliedAt && (
              <span className="font-mono text-[11px] text-[#29ffb8]">已应用 ✓</span>
            )}
            <button
              type="button"
              disabled={applying || !!appliedAt}
              onClick={apply}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-pixel text-[10px] tracking-[0.18em] text-black hover:scale-[1.02] disabled:opacity-30"
            >
              {applying ? "写入中…" : "应用到当前 profile"}
              <ArrowRight size={11} />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
