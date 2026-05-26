import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { api } from "../api/client"

export type NcmStatus = Awaited<ReturnType<typeof api.ncmStatus>>

/**
 * Self-contained NCM (Netease Cloud Music) login flow.
 * Used as an inline panel inside Settings, AND as a modal dialog opened by
 * the Header's LOGIN button. The two surfaces share the same QR poller.
 */
export function NcmLoginPanel({ onStatusChange }: { onStatusChange?: (s: NcmStatus | null) => void }) {
  const [status, setStatus] = useState<NcmStatus | null>(null)
  const [qr, setQr] = useState<{ key: string; qrimg: string } | null>(null)
  const [phase, setPhase] = useState<"idle" | "scanning" | "scanned" | "success" | "expired" | "error">("idle")
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const refresh = async () => {
    try {
      const r = await api.ncmStatus()
      setStatus(r)
      onStatusChange?.(r)
    } catch {}
  }

  useEffect(() => { refresh() }, [])

  // Poll QR check while scanning. The server returns one of:
  //   waiting / scanned / success / expired / error
  useEffect(() => {
    if (phase !== "scanning" && phase !== "scanned") return
    if (!qr) return
    let cancelled = false
    const tick = async () => {
      try {
        const r = await api.ncmQrCheck(qr.key)
        if (cancelled) return
        if (r.status === "success") {
          setPhase("success")
          setQr(null)
          await refresh()
          return
        }
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
    setErrMsg(null)
    setPhase("idle")
    try {
      const r = await api.ncmQrCreate()
      setQr(r)
      setPhase("scanning")
    } catch (err) {
      setPhase("error")
      setErrMsg((err as Error).message)
    }
  }

  const logout = async () => {
    await api.ncmLogout()
    setQr(null)
    setPhase("idle")
    await refresh()
  }

  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-pixel text-[12px] tracking-[0.22em] text-white/55">网易云账号</h3>
        {status?.loggedIn ? (
          <button
            type="button"
            onClick={logout}
            className="rounded-full border border-white/10 px-3 py-1 font-pixel text-[10px] tracking-[0.18em] text-white/70 hover:bg-white/8"
          >
            退出
          </button>
        ) : (
          <button
            type="button"
            onClick={startLogin}
            className="rounded-full border border-white/10 px-3 py-1 font-pixel text-[10px] tracking-[0.18em] text-white/85 hover:bg-white/8"
          >
            扫码登录
          </button>
        )}
      </div>

      {status?.loggedIn ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-black/30 p-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-rose-500/40 to-orange-400/30 font-pixel text-[12px] text-white">
            {(status.nickname ?? "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-pixel text-[13px] tracking-[0.04em] text-white">
              {status.nickname ?? "（已登录）"}
            </div>
            <div className="font-mono text-[10px] text-white/40">
              uid {status.userId} · {status.vip ? `VIP（type ${status.vipType}）— 完整音频可解锁` : "无 VIP — 仅试听 30s"}
            </div>
          </div>
        </div>
      ) : qr ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-lg bg-black/30 p-4">
          <img src={qr.qrimg} alt="NCM 登录二维码" className="h-44 w-44 rounded-md bg-white p-2" />
          <div className="font-pixel text-[11px] tracking-[0.18em] text-white/70">
            {phase === "scanning" && "等待扫码…"}
            {phase === "scanned" && "已扫码，请在手机上确认"}
            {phase === "expired" && (
              <button onClick={startLogin} className="text-[#29ffb8] hover:underline">二维码过期，点击重试</button>
            )}
            {phase === "error" && <span className="text-rose-400">错误：{errMsg}</span>}
          </div>
          <div className="text-center font-mono text-[10px] leading-snug text-white/35">
            打开网易云音乐 App → 「我的」 → 右上角扫一扫
            <br />
            登录后所有歌返回 320kbps 完整音频（前提是你账号是 VIP）
          </div>
        </div>
      ) : phase === "expired" ? (
        <p className="mt-3 font-mono text-[12px] text-white/45">二维码过期，重新「扫码登录」。</p>
      ) : phase === "error" ? (
        <p className="mt-3 font-mono text-[12px] text-rose-400">错误：{errMsg}</p>
      ) : (
        <p className="mt-3 font-mono text-[12px] text-white/45">
          未登录时所有带版权的歌只返回 30 秒试听。登录后能拿完整音频（前提：你账号是 VIP）。
        </p>
      )}
    </section>
  )
}

/**
 * Modal-shaped wrapper around <NcmLoginPanel/>. Header's LOGIN button opens
 * this. Closing the modal triggers an onLoggedInChange callback so the
 * Header label can refresh ("LOGIN" → nickname).
 */
export function LoginCard({
  open,
  onClose,
  onStatusChange,
}: {
  open: boolean
  onClose: () => void
  onStatusChange?: (s: NcmStatus | null) => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close login backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-[6px]"
      />
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-3xl border border-white/10 bg-[#0b0a10]/95 px-5 pt-5 pb-6 text-white shadow-[0_30px_80px_-30px_rgba(124,92,255,0.6)]">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-pixel text-[16px] tracking-[0.04em]">登录</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close login card"
            className="grid h-7 w-7 place-items-center rounded-full text-white/55 transition-colors hover:bg-white/8 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
        <NcmLoginPanel onStatusChange={onStatusChange} />
      </div>
    </div>
  )
}
