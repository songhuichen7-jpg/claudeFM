// Feishu (Lark) calendar stub. Uses LARK_APP_ID / LARK_APP_SECRET if present;
// otherwise returns an empty schedule. Designed to drop in real OAuth later.

type LarkEvent = {
  start: number
  end: number
  title: string
}

const enabled = !!(process.env.LARK_APP_ID && process.env.LARK_APP_SECRET)

let tokenCache: { token: string; exp: number } | null = null

async function tenantToken(): Promise<string | null> {
  if (!enabled) return null
  if (tokenCache && tokenCache.exp > Date.now() + 30_000) return tokenCache.token
  try {
    const r = await fetch(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: process.env.LARK_APP_ID,
          app_secret: process.env.LARK_APP_SECRET,
        }),
      },
    )
    const j: any = await r.json()
    if (j.tenant_access_token) {
      tokenCache = { token: j.tenant_access_token, exp: Date.now() + (j.expire ?? 7100) * 1000 }
      return tokenCache.token
    }
  } catch (err) {
    console.warn("[lark] token failed", (err as Error).message)
  }
  return null
}

export async function todayCalendar(): Promise<LarkEvent[]> {
  if (!enabled) return []
  const tok = await tenantToken()
  if (!tok) return []
  // Real implementation would call /calendar/v4/calendars/{cal}/events with
  // start_time/end_time bounded to today. We just stub a passthrough; users
  // who want this should wire their primary calendar id via env.
  return []
}

export function calendarEnabled() {
  return enabled
}
