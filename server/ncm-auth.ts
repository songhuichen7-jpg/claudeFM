// NCM 登录 / cookie 管理。cookie 进 state.db 的 prefs 表，存在 __system 空间。
// 登录后 ncm.ts 的所有 song_url / search / lyric 调用会带 cookie，
// 网易云会返回完整 320kbps 音频（前提是你账号是 VIP）。

import ncm from "NeteaseCloudMusicApi"
import { Prefs } from "./state.js"

type AnyFn = (params: Record<string, unknown>) => Promise<{ body: any }>

const login_qr_key: AnyFn = (ncm as any).login_qr_key
const login_qr_create: AnyFn = (ncm as any).login_qr_create
const login_qr_check: AnyFn = (ncm as any).login_qr_check
const user_account: AnyFn = (ncm as any).user_account

const COOKIE_KEY = "ncm_cookie"
const PROFILE_NS = "__system" // cookie is global, not per-profile

export function getCookie(): string | null {
  return Prefs.get(COOKIE_KEY, PROFILE_NS)
}

export function setCookie(cookie: string) {
  Prefs.set(COOKIE_KEY, cookie, PROFILE_NS)
}

export function clearCookie() {
  Prefs.set(COOKIE_KEY, "", PROFILE_NS)
}

/** Step 1: get a fresh QR key + image. Returns base64 dataurl for the PWA to show. */
export async function qrCreate(): Promise<{ key: string; qrimg: string } | null> {
  try {
    const k = await login_qr_key({ timestamp: Date.now() })
    const unikey: string | undefined = k.body?.data?.unikey
    if (!unikey) return null
    const c = await login_qr_create({ key: unikey, qrimg: true, timestamp: Date.now() })
    const qrimg: string | undefined = c.body?.data?.qrimg
    if (!qrimg) return null
    return { key: unikey, qrimg }
  } catch (err) {
    console.warn("[ncm-auth.qrCreate]", (err as Error).message)
    return null
  }
}

/** Step 2: poll with the key until user scans + confirms on phone. */
export async function qrCheck(key: string): Promise<{
  status: "waiting" | "scanned" | "success" | "expired" | "error"
  cookie?: string
  message?: string
}> {
  try {
    const r = await login_qr_check({ key, timestamp: Date.now() })
    const code: number = r.body?.code ?? 0
    const message: string = r.body?.message ?? ""
    if (code === 803) {
      const cookie: string = r.body?.cookie ?? ""
      if (cookie) setCookie(cookie)
      return { status: "success", cookie, message }
    }
    if (code === 802) return { status: "scanned", message }
    if (code === 801) return { status: "waiting", message }
    if (code === 800) return { status: "expired", message }
    return { status: "error", message: `unknown code ${code}` }
  } catch (err) {
    return { status: "error", message: (err as Error).message }
  }
}

/** Read account info using the stored cookie. Returns null if not logged in. */
export async function whoami(): Promise<{
  loggedIn: boolean
  userId?: number
  nickname?: string
  vip?: boolean
  vipType?: number
} | null> {
  const cookie = getCookie()
  if (!cookie) return { loggedIn: false }
  try {
    const r = await user_account({ cookie })
    const account = r.body?.account
    const profile = r.body?.profile
    if (!account || !profile) return { loggedIn: false }
    // vipType: 0 = no VIP, 11 = monthly VIP, 1/4/5 等 = various levels
    const vipType: number = profile.vipType ?? account.vipType ?? 0
    return {
      loggedIn: true,
      userId: profile.userId ?? account.id,
      nickname: profile.nickname,
      vip: vipType > 0,
      vipType,
    }
  } catch (err) {
    console.warn("[ncm-auth.whoami]", (err as Error).message)
    return { loggedIn: false }
  }
}
