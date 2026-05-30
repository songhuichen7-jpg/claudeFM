import { useEffect, useMemo, useState } from "react"
import { Check, Plus, RefreshCw, Save, X } from "lucide-react"
import { clsx } from "clsx"
import { usePlayer } from "../state/PlayerContext"
import { api } from "../api/client"

const ACCENT = "var(--accent)"
type Props = { open: boolean; onClose: () => void }

export function SettingsView({ open, onClose }: Props) {
  const {
    health,
    connected,
    triggerScheduled,
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
  const [plan, setPlan] = useState<unknown>(null)

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
    api.planToday().then(r => setPlan(r.plan)).catch(() => setPlan(null))
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
      setTaste(prev => (prev ? prev.map(f => (f.name === name ? { ...f, body: drafts[name] ?? "" } : f)) : prev))
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
        <Section
          title="语料档 · CORPUS"
          action={
            <TinyBtn onClick={() => setNewProfileOpen(o => !o)}>
              <Plus size={11} className="-mt-px inline" /> 新建
            </TinyBtn>
          }
        >
          {newProfileOpen && (
            <div className="mb-2 rounded-md border border-white/8 p-3 light:border-black/8">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={npId}
                  onChange={e => setNpId(e.target.value.toLowerCase())}
                  placeholder="id (a-z0-9_-)"
                  className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-[12px] text-white outline-none placeholder:text-white/30 light:border-black/10 light:bg-white/50 light:text-black/80"
                />
                <input
                  value={npName}
                  onChange={e => setNpName(e.target.value)}
                  placeholder="显示名"
                  className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-[12px] text-white outline-none placeholder:text-white/30 light:border-black/10 light:bg-white/50 light:text-black/80"
                />
              </div>
              {npErr && <p className="mt-2 font-mono text-[11px] text-rose-400">{npErr}</p>}
              <div className="mt-2 flex justify-end gap-2">
                <TinyBtn onClick={() => setNewProfileOpen(false)}>取消</TinyBtn>
                <TinyBtn solid disabled={!npId || !npName} onClick={handleCreateProfile}>创建</TinyBtn>
              </div>
            </div>
          )}
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
            <Row label="Claude CLI" value={health?.claude ? "ok" : "fallback"} ok={!!health?.claude} />
            <Row label="网易云" value="ok" ok />
            <Row
              label="TTS"
              value={health?.ttsProvider === "mimo" ? "Xiaomi MiMo" : health?.ttsProvider === "fish" ? "Fish Audio" : "silent"}
              ok={health?.ttsProvider === "mimo" || health?.ttsProvider === "fish"}
            />
            <Row label="天气" value={health?.weather ? "open-meteo" : "—"} ok={!!health?.weather} />
            <Row label="飞书日历" value={health?.calendar ? "linked" : "—"} ok={!!health?.calendar} />
            <Row label="Naim 客厅" value={health?.naim ? "pushed" : "—"} ok={!!health?.naim} />
            <Row label="Profile" value={active} ok />
          </div>
        </Section>

        {/* Today's schedule */}
        <Section
          title="今日编排 · SCHEDULE"
          action={
            <TinyBtn disabled={busy} onClick={async () => { setBusy(true); await triggerScheduled("用户在 Settings 手动触发一次播报"); setBusy(false) }}>
              <RefreshCw size={11} className={clsx("-mt-px inline", busy && "animate-spin")} /> 广播一首
            </TinyBtn>
          }
        >
          <Schedule plan={plan} />
        </Section>

        {/* NCM account (real QR login) */}
        <Section title="网易云账号 · NCM">
          <NcmLoginPanel />
        </Section>

        {/* Taste files */}
        <Section title={`品味语料 · ${active}`}>
          {!taste ? (
            <p className="font-mono text-[11px] text-white/40 light:text-black/45">读取中…</p>
          ) : taste.length === 0 ? (
            <p className="font-mono text-[11px] text-white/40 light:text-black/45">无语料文件</p>
          ) : (
            <div className="flex flex-col gap-1">
              {taste.map(f => {
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
          )}
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
        <span className="inline-block h-1 w-1 rounded-full" style={{ background: ok ? ACCENT : "rgba(255,255,255,0.25)" }} />
        <span className={ok ? "text-white/85 light:text-black/80" : "text-white/40 light:text-black/45"}>{value}</span>
      </div>
    </>
  )
}

function TinyBtn({
  children,
  solid,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  solid?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-[10px] tracking-[0.14em] transition-colors disabled:opacity-30",
        solid ? "text-black" : "border border-white/12 text-white/85 hover:bg-white/8 light:border-black/15 light:text-black/80 light:hover:bg-black/8",
      )}
      style={solid ? { background: ACCENT } : undefined}
    >
      {children}
    </button>
  )
}

/** Render the day plan defensively — the scheduler's stored shape is loose. */
function Schedule({ plan }: { plan: unknown }) {
  if (!plan || (Array.isArray(plan) && plan.length === 0)) {
    return <p className="font-mono text-[11px] text-white/40 light:text-black/45">今天还没编排 —— Claudio 会按时段排。</p>
  }
  const blocks = Array.isArray(plan) ? plan : (plan as { blocks?: unknown[] }).blocks
  if (Array.isArray(blocks)) {
    return (
      <div className="flex flex-col gap-3">
        {blocks.map((b: any, i) => (
          <div key={i}>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[10px] tracking-[0.12em]" style={{ color: ACCENT }}>
                ▸ {b.range ?? b.time ?? ""}
              </span>
              <span className="font-mono text-[11px] text-white/85 light:text-black/80">{b.label ?? b.vibe ?? ""}</span>
              {b.device && (
                <span className="ml-auto font-mono text-[9px] tracking-[0.16em] text-white/30 light:text-black/40">{b.device}</span>
              )}
            </div>
            {Array.isArray(b.tracks) && (
              <ul className="mt-1 space-y-0.5 pl-3">
                {b.tracks.map((t: any, j: number) => (
                  <li key={j} className="font-mono text-[11px] leading-relaxed text-white/50 light:text-black/55">
                    · {typeof t === "string" ? t : `${t.title ?? ""}${t.artist ? ` · ${t.artist}` : ""}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    )
  }
  return (
    <pre className="thin-scroll max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[10.5px] leading-relaxed text-white/55 light:text-black/55">
      {JSON.stringify(plan, null, 2)}
    </pre>
  )
}

// ---- NCM login panel (real QR polling) ------------------------------------

function NcmLoginPanel() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof api.ncmStatus>> | null>(null)
  const [qr, setQr] = useState<{ key: string; qrimg: string } | null>(null)
  const [phase, setPhase] = useState<"idle" | "scanning" | "scanned" | "success" | "expired" | "error">("idle")
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const refresh = async () => {
    try { setStatus(await api.ncmStatus()) } catch {}
  }
  useEffect(() => { refresh() }, [])

  useEffect(() => {
    if (phase !== "scanning" && phase !== "scanned") return
    if (!qr) return
    let cancelled = false
    const tick = async () => {
      try {
        const r = await api.ncmQrCheck(qr.key)
        if (cancelled) return
        if (r.status === "success") { setPhase("success"); setQr(null); await refresh(); return }
        if (r.status === "scanned") setPhase("scanned")
        if (r.status === "expired") { setPhase("expired"); setQr(null); return }
        if (r.status === "error") { setPhase("error"); setErrMsg(r.message ?? "未知错误"); return }
        setTimeout(tick, 1500)
      } catch (err) {
        if (cancelled) return
        setPhase("error")
        setErrMsg((err as Error).message)
      }
    }
    tick()
    return () => { cancelled = true }
  }, [phase, qr])

  const startLogin = async () => {
    setErrMsg(null); setPhase("idle")
    try {
      const r = await api.ncmQrCreate()
      setQr(r); setPhase("scanning")
    } catch (err) {
      setPhase("error"); setErrMsg((err as Error).message)
    }
  }
  const logout = async () => {
    await api.ncmLogout(); setQr(null); setPhase("idle"); await refresh()
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        {status?.loggedIn ? (
          <TinyBtn onClick={logout}>退出</TinyBtn>
        ) : (
          <TinyBtn onClick={startLogin}>扫码登录</TinyBtn>
        )}
      </div>
      {status?.loggedIn ? (
        <div className="flex items-center gap-3 rounded-md border border-white/8 px-3 py-2.5 light:border-black/8">
          <span className="grid h-8 w-8 place-items-center rounded-full font-mono text-[12px] text-black" style={{ background: ACCENT }}>
            {(status.nickname ?? "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-[12px] text-white/90 light:text-black/85">{status.nickname ?? "（已登录）"}</div>
            <div className="font-mono text-[9.5px] text-white/40 light:text-black/45">
              uid {status.userId} · {status.vip ? `VIP（type ${status.vipType}）— 完整音频` : "无 VIP — 仅试听 30s"}
            </div>
          </div>
        </div>
      ) : qr ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-white/8 p-4 light:border-black/8">
          <img src={qr.qrimg} alt="NCM 登录二维码" className="h-44 w-44 rounded-md bg-white p-2" />
          <div className="font-mono text-[11px] tracking-[0.12em] text-white/70 light:text-black/65">
            {phase === "scanning" && "等待扫码…"}
            {phase === "scanned" && "已扫码，请在手机上确认"}
            {phase === "expired" && <button onClick={startLogin} style={{ color: ACCENT }} className="hover:underline">二维码过期，点击重试</button>}
            {phase === "error" && <span className="text-rose-400">错误：{errMsg}</span>}
          </div>
          <div className="text-center font-mono text-[10px] leading-relaxed text-white/35 light:text-black/45">
            打开网易云音乐 App → 「我的」 → 右上角扫一扫<br />
            登录后所有歌返回 320kbps 完整音频（前提你账号是 VIP）
          </div>
        </div>
      ) : phase === "error" ? (
        <p className="font-mono text-[11px] text-rose-400">错误：{errMsg}</p>
      ) : (
        <p className="font-mono text-[11px] leading-relaxed text-white/45 light:text-black/50">
          未登录只返回 30 秒试听。登录后能拿完整音频（前提：账号是 VIP）。
        </p>
      )}
    </div>
  )
}
