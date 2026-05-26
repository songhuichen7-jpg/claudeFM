// Feishu (Lark) calendar integration. Requires three env vars:
//   LARK_APP_ID            — application id from open.feishu.cn
//   LARK_APP_SECRET        — application secret
//   LARK_CALENDAR_ID       — primary calendar id (looks like xxx@group.calendar.feishu.cn)
//
// Note on auth: this uses a *tenant* access token, which only sees calendars
// the Feishu app has been granted access to (the user must add the bot/app
// to their primary calendar with "see events" permission). For a fully
// personal flow you'd swap in user_access_token via OAuth, which is a
// separate redirect dance and out of scope for now.

export type LarkEvent = {
  id: string
  start: number // ms
  end: number   // ms
  title: string
}

const enabled = !!(process.env.LARK_APP_ID && process.env.LARK_APP_SECRET)
const CALENDAR_ID = process.env.LARK_CALENDAR_ID ?? ""

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

/** Cached events for 60s — context.ts hits this on every assemble() and the
 *  scheduler hook checks every 5 min; no point hammering Feishu. */
let eventsCache: { ts: number; events: LarkEvent[] } | null = null

export async function todayCalendar(): Promise<LarkEvent[]> {
  if (!enabled || !CALENDAR_ID) return []
  if (eventsCache && Date.now() - eventsCache.ts < 60_000) return eventsCache.events

  const tok = await tenantToken()
  if (!tok) return []

  // Window: now → end of local day. start_time / end_time are Unix seconds.
  const now = Date.now()
  const endOfDay = (() => {
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return d.getTime()
  })()
  const startSec = Math.floor(now / 1000)
  const endSec = Math.floor(endOfDay / 1000)

  try {
    const url =
      `https://open.feishu.cn/open-apis/calendar/v4/calendars/${encodeURIComponent(CALENDAR_ID)}/events` +
      `?start_time=${startSec}&end_time=${endSec}&page_size=50`
    const r = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } })
    const j: any = await r.json()
    if (j.code && j.code !== 0) {
      console.warn("[lark] calendar fetch err", j.code, j.msg)
      return []
    }
    const items: any[] = j.data?.items ?? []
    const events: LarkEvent[] = items
      .map(toLarkEvent)
      .filter((e): e is LarkEvent => e !== null)
      .sort((a, b) => a.start - b.start)
    eventsCache = { ts: Date.now(), events }
    return events
  } catch (err) {
    console.warn("[lark] calendar fetch failed", (err as Error).message)
    return []
  }
}

function toLarkEvent(e: any): LarkEvent | null {
  // Feishu returns start_time / end_time as objects: { date?, timestamp?, timezone? }
  // - timed events use `timestamp` (seconds, string)
  // - all-day events use `date` (YYYY-MM-DD); we skip those for "what's next" use.
  const s = e?.start_time
  const en = e?.end_time
  const startSec = Number(s?.timestamp ?? 0)
  const endSec = Number(en?.timestamp ?? 0)
  if (!startSec || !endSec) return null
  return {
    id: String(e.event_id ?? e.id ?? `${startSec}-${(e.summary ?? "").slice(0, 16)}`),
    start: startSec * 1000,
    end: endSec * 1000,
    title: String(e.summary ?? e.description?.slice?.(0, 40) ?? "(no title)"),
  }
}

export function calendarEnabled() {
  return enabled && !!CALENDAR_ID
}
