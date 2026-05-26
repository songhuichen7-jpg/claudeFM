// Cross-tab "only one tab plays audio" coordinator.
//
// On mount, each tab gets a random id and broadcasts CLAIM. A tab is the
// "master" if it has the most recent claim. Newest claim wins (newest tab
// becomes master automatically — when the user switches tabs the new one
// claims, the old one steps down and mutes its <audio>).
//
// Lifecycle messages over BroadcastChannel "claudio-fm-audio":
//   { type: "claim", tabId, ts }
//   { type: "heartbeat", tabId, ts }
//   { type: "bye", tabId }
//
// Heartbeat every 4s; if master goes silent for >9s, the next-living tab
// re-claims. A tab can also call claim() programmatically (e.g. when user
// clicks "play here").

const CHANNEL_NAME = "claudio-fm-audio"

export type TabMasterEvent =
  | { kind: "become-master" }
  | { kind: "lost-master" }

type Msg =
  | { type: "claim"; tabId: string; ts: number }
  | { type: "heartbeat"; tabId: string; ts: number }
  | { type: "bye"; tabId: string }

export class TabMaster {
  private tabId: string
  private ch: BroadcastChannel | null = null
  private masterId: string | null = null
  private masterLastSeen = 0
  private isMaster_ = false
  private hbTimer: number | null = null
  private watchTimer: number | null = null
  private listeners = new Set<(e: TabMasterEvent) => void>()

  constructor() {
    this.tabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  }

  start() {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
      // No multi-tab coordination available → become master immediately
      this.isMaster_ = true
      return
    }
    this.ch = new BroadcastChannel(CHANNEL_NAME)
    this.ch.onmessage = ev => this.onMessage(ev.data as Msg)

    // Wait 250ms to see if another tab is already master; if not, claim it.
    window.setTimeout(() => {
      if (Date.now() - this.masterLastSeen > 300) this.claim()
    }, 300)

    // Heartbeat
    this.hbTimer = window.setInterval(() => {
      if (this.isMaster_) this.send({ type: "heartbeat", tabId: this.tabId, ts: Date.now() })
    }, 4000)

    // Master-liveness watchdog (only relevant if we're NOT master)
    this.watchTimer = window.setInterval(() => {
      if (this.isMaster_) return
      if (this.masterId && Date.now() - this.masterLastSeen > 9000) {
        // Master has gone silent — claim it
        this.claim()
      }
    }, 3000)

    // When this tab closes, broadcast bye so others re-elect quickly
    window.addEventListener("beforeunload", () => {
      this.send({ type: "bye", tabId: this.tabId })
    })

    // Pagehide is more reliable than beforeunload on mobile / bfcache
    window.addEventListener("pagehide", () => {
      this.send({ type: "bye", tabId: this.tabId })
    })
  }

  stop() {
    if (this.hbTimer) window.clearInterval(this.hbTimer)
    if (this.watchTimer) window.clearInterval(this.watchTimer)
    try { this.send({ type: "bye", tabId: this.tabId }) } catch {}
    try { this.ch?.close() } catch {}
    this.ch = null
  }

  /** Explicitly claim master from this tab (e.g. user clicked "play here"). */
  claim() {
    const ts = Date.now()
    this.send({ type: "claim", tabId: this.tabId, ts })
    // Optimistically become master locally; if another tab's later claim
    // arrives we'll step down.
    this.setMaster(true, this.tabId, ts)
  }

  isMaster() {
    return this.isMaster_
  }

  subscribe(fn: (e: TabMasterEvent) => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private send(m: Msg) {
    try { this.ch?.postMessage(m) } catch {}
  }

  private setMaster(isMaster: boolean, masterId: string | null, lastSeen: number) {
    const was = this.isMaster_
    this.isMaster_ = isMaster
    this.masterId = masterId
    this.masterLastSeen = lastSeen
    if (was !== isMaster) {
      for (const l of this.listeners) l({ kind: isMaster ? "become-master" : "lost-master" })
    }
  }

  private onMessage(m: Msg) {
    if (m.type === "claim") {
      // Newer claim → step down (or update masterLastSeen if it's us)
      if (m.tabId === this.tabId) {
        this.masterLastSeen = m.ts
        return
      }
      // Another tab claims. Step down if we're master.
      if (this.isMaster_) this.setMaster(false, m.tabId, m.ts)
      else this.setMaster(false, m.tabId, m.ts)
    } else if (m.type === "heartbeat") {
      if (m.tabId !== this.tabId) {
        this.masterId = m.tabId
        this.masterLastSeen = m.ts
        // If we thought we were master but someone else is heartbeating, step down
        if (this.isMaster_) this.setMaster(false, m.tabId, m.ts)
      }
    } else if (m.type === "bye") {
      if (this.masterId === m.tabId) {
        // The master is leaving — open up for re-election. We claim after a
        // short delay to avoid thundering herd.
        window.setTimeout(() => {
          if (!this.isMaster_ && Date.now() - this.masterLastSeen > 500) this.claim()
        }, 200 + Math.random() * 300)
      }
    }
  }
}
