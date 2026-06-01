import type { WebSocket } from "ws"
import type { DJTurn, ResolvedTrack } from "./router.js"

export type WsEvent =
  | { type: "dj"; turn: DJTurn }
  | { type: "dj-tts"; turn: DJTurn }
  | { type: "now-playing"; track: ResolvedTrack | null; startedAt: number }
  | { type: "hello"; ts: number }
  | { type: "skip"; trackId: string }
  | { type: "like"; trackId: string; liked: boolean }

export class Hub {
  private clients = new Set<WebSocket>()
  private last: { track: ResolvedTrack | null; startedAt: number } = { track: null, startedAt: Date.now() }

  add(ws: WebSocket) {
    this.clients.add(ws)
    this.send(ws, { type: "hello", ts: Date.now() })
    if (this.last.track) {
      this.send(ws, { type: "now-playing", track: this.last.track, startedAt: this.last.startedAt })
    }
  }

  remove(ws: WebSocket) {
    this.clients.delete(ws)
  }

  setNowPlaying(track: ResolvedTrack | null) {
    this.last = { track, startedAt: Date.now() }
    this.broadcast({ type: "now-playing", track, startedAt: this.last.startedAt })
  }

  broadcast(ev: WsEvent) {
    if (ev.type === "dj" && ev.turn.tracks.length > 0) {
      this.last = { track: ev.turn.tracks[0], startedAt: Date.now() }
    }
    const data = JSON.stringify(ev)
    for (const ws of this.clients) {
      try {
        if (ws.readyState === 1 /* OPEN */) ws.send(data)
      } catch {}
    }
  }

  private send(ws: WebSocket, ev: WsEvent) {
    try {
      if (ws.readyState === 1) ws.send(JSON.stringify(ev))
    } catch {}
  }

  size() {
    return this.clients.size
  }
}
