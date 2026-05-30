import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { ChatMessage, DJMessage, Theme, Track } from "../data/types"
import { api, serverMessagesToUI, serverTrackToUI, wordsFromText, type DJTurn, type ServerTrack } from "../api/client"

export type Profile = { id: string; name: string; avatar: string | null; corpus_dir: string; created_at: number }

type Health = {
  ok: boolean
  claude: boolean
  calendar: boolean
  naim: boolean
  weather: boolean
  fish: boolean
  mimo: boolean
  ttsProvider: "mimo" | "fish" | "silent"
  activeProfile: string
  moodProbe: unknown
}

/** Frequency-domain analyser snapshot, shared between Waveform + WaveformBig.
 * Updated ~60Hz from a single rAF loop in the provider. Components read,
 * don't subscribe — Waveform paints to canvas each frame anyway. */
export type AnalyserHandle = {
  freq: Uint8Array | null
  level: number // averaged loudness 0..1
  isAudio: boolean // true if a real audio source is wired (vs fallback)
  channel: "music" | "tts" | null
}

type PlayerState = {
  // playback
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number // seconds, actual <audio>
  duration: number
  volume: number
  liked: Record<string, boolean>

  // ui
  theme: Theme
  hideChat: boolean
  status: "idle" | "thinking" | "speaking" | "playing" | "error"

  // chat
  messages: ChatMessage[]
  activeDJId: string | null
  djElapsedMs: number

  // server status
  health: Health | null
  connected: boolean

  // analyser (real audio waveform)
  analyserRef: React.MutableRefObject<AnalyserHandle>

  // profiles
  profiles: Profile[]
  refreshProfiles: () => Promise<void>
  switchProfile: (id: string) => Promise<void>
  createProfile: (id: string, name: string) => Promise<void>

  // taste editor
  refreshTaste: () => Promise<{ name: string; body: string }[]>
  saveTasteFile: (name: string, body: string) => Promise<void>

  // library (liked tracks) + up-next + ♥ toast — additive, see ARCHITECTURE §5
  likedTracks: Track[]
  upcoming: { track: Track; caption: string }[]
  toast: { id: number; text: string; sub?: string } | null
  dismissToast: () => void

  // actions
  toggleTheme: () => void
  toggleHideChat: () => void
  togglePlay: () => void
  setPlaying: (v: boolean) => void
  next: () => void
  prev: () => void
  stop: () => void
  toggleLike: (trackId?: string) => void
  setVolume: (v: number) => void
  seek: (s: number) => void
  selectTrack: (t: Track) => void
  sendMessage: (text: string) => Promise<void>
  replayDJ: (id: string) => void
  triggerScheduled: (reason: string) => Promise<void>
}

const PlayerContext = createContext<PlayerState | null>(null)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.75)
  const [liked, setLiked] = useState<Record<string, boolean>>({})

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark"
    return window.localStorage.getItem("claudio-theme") === "light" ? "light" : "dark"
  })
  const [hideChat, setHideChat] = useState(false)
  const [status, setStatus] = useState<PlayerState["status"]>("idle")

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeDJId, setActiveDJId] = useState<string | null>(null)
  const [djElapsedMs, setDjElapsedMs] = useState(0)

  const [health, setHealth] = useState<Health | null>(null)
  const [connected, setConnected] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])

  // Library / ♥ toast — additive UI state (ARCHITECTURE §5).
  // `upcoming` is derived from the message stream in the value memo below.
  const [likedTracks, setLikedTracks] = useState<Track[]>([])
  const [toast, setToast] = useState<{ id: number; text: string; sub?: string } | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ttsRef = useRef<HTMLAudioElement | null>(null)
  const prefetchRef = useRef<HTMLAudioElement | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const currentTrackRef = useRef<Track | null>(null)
  const playSeqRef = useRef(0)
  const recentTracksRef = useRef<Map<string, Track>>(new Map())
  // One-shot permission for the next DJ turn to change playback. A user action
  // can only spend this once, so a burst of WS turns cannot cascade through
  // several songs from one prompt or one impatient click.
  const autoplayTicketRef = useRef<{ expiresAt: number } | null>(null)
  const chatInFlightRef = useRef(false)
  const nextInFlightRef = useRef(false)
  const lastSystemNoticeRef = useRef<{ text: string; ts: number } | null>(null)
  // Set of WS-delivered turn ids we've already processed — guards against the
  // server (or strict-mode double-mount) replaying the same turn.
  const handledTurnsRef = useRef<Set<string>>(new Set())

  // ---- WebAudio analyser ------------------------------------------------
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioAnalyserRef = useRef<AnalyserNode | null>(null)
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null)
  const audioSrcRef = useRef<MediaElementAudioSourceNode | null>(null)
  const ttsSrcRef = useRef<MediaElementAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserHandle>({ freq: null, level: 0, isAudio: false, channel: null })

  useEffect(() => {
    currentTrackRef.current = currentTrack
  }, [currentTrack])

  const applyServerMessages = useCallback((ms: Parameters<typeof serverMessagesToUI>[0]) => {
    const ui = serverMessagesToUI(ms)
    setMessages(ui)
    const lastDj = [...ui].reverse().find(
      m => m.kind === "dj" && (m as DJMessage).recommends?.[0],
    ) as DJMessage | undefined
    const lastTrack = lastDj?.recommends?.[0]
    if (lastTrack && !currentTrackRef.current) {
      setCurrentTrack(lastTrack)
      currentTrackRef.current = lastTrack
      recentTracksRef.current.set(lastTrack.id, lastTrack)
    }
    return ui
  }, [])

  // Initialize hidden audio elements + analyser graph
  useEffect(() => {
    if (typeof window === "undefined") return
    const a = new Audio()
    a.preload = "metadata"
    a.crossOrigin = "anonymous"
    audioRef.current = a
    const tts = new Audio()
    tts.preload = "auto"
    tts.crossOrigin = "anonymous"
    ttsRef.current = tts
    const prefetch = new Audio()
    prefetch.preload = "auto"
    prefetch.crossOrigin = "anonymous"
    prefetch.muted = true
    prefetchRef.current = prefetch

    const onTime = () => setCurrentTime(a.currentTime)
    const onDur = () => setDuration(a.duration || 0)
    const onEnded = () => {
      setIsPlaying(false)
      setStatus("idle")
    }
    a.addEventListener("timeupdate", onTime)
    a.addEventListener("loadedmetadata", onDur)
    a.addEventListener("ended", onEnded)

    // When the TTS finishes loading, write the real duration back to the DJ
    // message so word-highlight ticks against the *actual* synthesized length,
    // not the character-count estimate.
    const ttsMeta = () => {
      const realMs = tts.duration > 0.1 ? Math.round(tts.duration * 1000) : 0
      if (!realMs) return
      setMessages(prev => prev.map(m => {
        if (m.kind !== "dj") return m
        const dj = m as DJMessage & { ttsUrl?: string }
        if (dj.ttsUrl !== tts.src && !tts.src.endsWith(dj.ttsUrl ?? "")) return m
        if (!dj.words.length) return m
        const scale = realMs / Math.max(1, dj.duration)
        const scaled = dj.words.map(w => ({
          text: w.text,
          start: Math.round(w.start * scale),
          end: Math.round(w.end * scale),
        }))
        return { ...dj, duration: realMs, words: scaled }
      }))
    }
    tts.addEventListener("loadedmetadata", ttsMeta)
    tts.addEventListener("ended", () => setStatus(s => (s === "speaking" ? "playing" : s)))

    return () => {
      a.removeEventListener("timeupdate", onTime)
      a.removeEventListener("loadedmetadata", onDur)
      a.removeEventListener("ended", onEnded)
      tts.removeEventListener("loadedmetadata", ttsMeta)
      a.pause(); tts.pause(); prefetch.pause()
    }
  }, [])

  /** Lazily attach a single AudioContext + Analyser. Browsers require a user
   * gesture to "unlock" the context, so we boot it on the first play() call
   * via ensureAudioGraph(). */
  const ensureAudioGraph = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current
    const Ctx: typeof AudioContext | undefined = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return null
    const ctx = new Ctx()
    audioCtxRef.current = ctx
    if (audioRef.current) {
      try {
        const src = ctx.createMediaElementSource(audioRef.current)
        const an = ctx.createAnalyser()
        an.fftSize = 256
        an.smoothingTimeConstant = 0.78
        src.connect(an)
        an.connect(ctx.destination)
        audioSrcRef.current = src
        audioAnalyserRef.current = an
      } catch (err) {
        console.warn("audio analyser hookup failed", err)
      }
    }
    if (ttsRef.current) {
      try {
        const src = ctx.createMediaElementSource(ttsRef.current)
        const an = ctx.createAnalyser()
        an.fftSize = 256
        an.smoothingTimeConstant = 0.78
        src.connect(an)
        an.connect(ctx.destination)
        ttsSrcRef.current = src
        ttsAnalyserRef.current = an
      } catch (err) {
        console.warn("tts analyser hookup failed", err)
      }
    }
    return ctx
  }, [])

  // Single rAF loop that publishes the current analyser snapshot to a ref
  // Waveform components read each frame.
  useEffect(() => {
    let raf: number | null = null
    const buf = new Uint8Array(128)
    const tick = () => {
      const ttsActive = ttsRef.current && !ttsRef.current.paused && ttsRef.current.readyState >= 2
      const audActive = audioRef.current && !audioRef.current.paused && audioRef.current.readyState >= 2
      const an = ttsActive ? ttsAnalyserRef.current : audActive ? audioAnalyserRef.current : null
      const channel: "tts" | "music" | null = ttsActive ? "tts" : audActive ? "music" : null
      if (an) {
        an.getByteFrequencyData(buf as any)
        let sum = 0
        for (let i = 0; i < buf.length; i++) sum += buf[i]
        analyserRef.current = {
          freq: buf,
          level: sum / (buf.length * 255),
          isAudio: true,
          channel,
        }
      } else {
        analyserRef.current = { freq: null, level: 0, isAudio: false, channel: null }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      if (raf != null) cancelAnimationFrame(raf)
    }
  }, [])

  // Sync theme class
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    root.classList.toggle("light", theme === "light")
    window.localStorage.setItem("claudio-theme", theme)
  }, [theme])

  // Volume → element
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
    if (ttsRef.current) ttsRef.current.volume = volume
  }, [volume])

  // Bootstrap: load health + recent messages
  useEffect(() => {
    api.health().then(setHealth).catch(() => undefined)
    api
      .messages()
      .then(({ messages: ms }) => {
        const ui = applyServerMessages(ms)
        if (ui.length === 0) {
          // First-run: ask the server for a kick-off broadcast
          api.trigger("首次打开，给我一个简短的开场。").catch(() => undefined)
        }
      })
      .catch(() => undefined)
  }, [applyServerMessages])

  // WebSocket: stream
  useEffect(() => {
    if (typeof window === "undefined") return
    let closed = false
    let reconnectTimer: number | null = null

    const wsUrl = (() => {
      const proto = location.protocol === "https:" ? "wss:" : "ws:"
      return `${proto}//${location.host}/stream`
    })()

    const open = () => {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      ws.onopen = () => {
        setConnected(true)
        api.health().then(setHealth).catch(() => undefined)
        api.messages().then(({ messages: ms }) => {
          applyServerMessages(ms)
        }).catch(() => undefined)
      }
      ws.onclose = () => {
        setConnected(false)
        if (closed) return
        reconnectTimer = window.setTimeout(open, 1500)
      }
      ws.onerror = () => {
        // close handler reconnects
      }
      ws.onmessage = ev => {
        try {
          const m = JSON.parse(ev.data)
          if (m.type === "dj") handleTurn(m.turn as DJTurn)
          else if (m.type === "now-playing" && m.track) {
            const t = serverTrackToUI(m.track as ServerTrack)
            recentTracksRef.current.set(t.id, t)
            currentTrackRef.current = t
            setCurrentTrack(t)
          }
        } catch {}
      }
    }
    open()
    return () => {
      closed = true
      if (reconnectTimer != null) window.clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
  }, [])

  // Word highlight ticker tied to TTS audio progress
  useEffect(() => {
    if (!activeDJId) return
    const tts = ttsRef.current
    if (!tts) return
    let raf: number | null = null
    let last = performance.now()
    const active = messages.find(m => m.id === activeDJId && m.kind === "dj") as DJMessage | undefined
    if (!active) return
    const tick = (t: number) => {
      const dt = t - last
      last = t
      // If TTS audio is real (not silent), use its currentTime
      const useReal = !tts.paused && tts.duration > 0.1 && !Number.isNaN(tts.currentTime)
      if (useReal) {
        const ratio = Math.min(1, tts.currentTime / tts.duration)
        setDjElapsedMs(ratio * active.duration)
      } else {
        setDjElapsedMs(prev => {
          const next = prev + dt
          if (next > active.duration + 400) {
            setActiveDJId(null)
            return active.duration
          }
          return next
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      if (raf != null) cancelAnimationFrame(raf)
    }
  }, [activeDJId, messages])

  const issueAutoplayTicket = useCallback(() => {
    ensureAudioGraph()
    const ctx = audioCtxRef.current
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => undefined)
    autoplayTicketRef.current = { expiresAt: Date.now() + 120_000 }
  }, [ensureAudioGraph])

  const consumeAutoplayTicket = useCallback(() => {
    const ticket = autoplayTicketRef.current
    autoplayTicketRef.current = null
    return !!ticket && Date.now() <= ticket.expiresAt
  }, [])

  const addSystemMessage = useCallback((text: string) => {
    const ts = new Date()
    const last = lastSystemNoticeRef.current
    if (last?.text === text && ts.getTime() - last.ts < 3000) return
    lastSystemNoticeRef.current = { text, ts: ts.getTime() }
    setMessages(prev => [
      ...prev,
      {
        id: `system-${ts.getTime()}-${Math.random().toString(36).slice(2)}`,
        kind: "system",
        text,
      },
    ])
  }, [])

  // ♥ toast (transient) + Library refresh ----------------------------------
  const showToast = useCallback((text: string, sub?: string) => {
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    setToast({ id: Date.now(), text, sub })
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2800)
  }, [])

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    setToast(null)
  }, [])

  const refreshLiked = useCallback(async () => {
    try {
      const { tracks } = await api.liked()
      setLikedTracks(
        tracks.map(t => ({ id: t.id, title: t.title, artist: t.artist, duration: 0 } as Track)),
      )
      // Seed the boolean map so ♥ states render filled on load.
      setLiked(prev => {
        const next = { ...prev }
        for (const t of tracks) next[t.id] = true
        return next
      })
    } catch {}
  }, [])

  // Load the Library on mount (declared here, after refreshLiked, to avoid TDZ).
  useEffect(() => { refreshLiked() }, [refreshLiked])

  const playTrack = useCallback((t: Track) => {
    const a = audioRef.current
    if (!a || !t.url) return
    const seq = ++playSeqRef.current
    // First-play unlocks WebAudio analyser
    ensureAudioGraph()
    const ctx = audioCtxRef.current
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => undefined)
    // Hard-stop the previous playback BEFORE swapping src. Otherwise a
    // still-resolving play() promise from the old track can overlap with the
    // new one for a beat — symptom: two songs audible at once after rapid
    // skip / replay.
    try {
      a.pause()
      a.currentTime = 0
      // Detach old src so the browser truly tears down the previous buffer.
      a.removeAttribute("src")
      a.load()
    } catch {}
    a.src = t.url
    a.play()
      .then(() => {
        if (seq !== playSeqRef.current) return
        setIsPlaying(true)
        setStatus("playing")
      })
      .catch(() => {
        if (seq !== playSeqRef.current) return
        setIsPlaying(false)
      })
  }, [ensureAudioGraph])

  /** Try to put the most-likely next track in the prefetch <audio> so when
   * the user hits "next" the browser can swap with minimal stall. */
  const prefetchNext = useCallback(async (hint?: string) => {
    const p = prefetchRef.current
    if (!p) return
    try {
      const seed = hint?.trim()
      if (!seed) return
      // /api/resolve is the silent NCM lookup — no state.db / WS noise.
      const r = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: seed }),
      })
      if (!r.ok) return
      const j = (await r.json()) as { track: { url?: string } | null }
      const url = j.track?.url
      if (url) {
        p.pause()
        p.src = url
        p.load() // hint browser to start filling buffer
      }
    } catch {}
  }, [])

  const handleTurn = useCallback((turn: DJTurn) => {
    // Idempotent: server occasionally double-broadcasts (scheduler + user
    // turn racing, WS reconnect replay, etc.). Drop any turn we've already
    // processed.
    if (handledTurnsRef.current.has(turn.id)) return
    handledTurnsRef.current.add(turn.id)

    const stamp = new Date(turn.ts)
    const hhmm = `${String(stamp.getHours()).padStart(2, "0")}:${String(stamp.getMinutes()).padStart(2, "0")}`
    const words = wordsFromText(turn.say)
    const dj: DJMessage = {
      id: turn.id,
      kind: "dj",
      speaker: "Claudio",
      timestamp: hhmm,
      text: turn.say,
      words,
      duration: words.reduce((a, w) => Math.max(a, w.end), 0) || 2500,
      recommends: turn.tracks.map(serverTrackToUI),
      hasReplay: true,
      ttsUrl: turn.ttsUrl,
    }
    setMessages(prev => (prev.some(p => p.id === dj.id) ? prev : [...prev, dj]))

    // Cache recommended tracks. Playback changes only when a fresh user
    // action issued a one-shot autoplay ticket; scheduler/proactive turns
    // should add a chat card without stealing the current song.
    if (dj.recommends && dj.recommends.length > 0) {
      const t = dj.recommends[0]
      recentTracksRef.current.set(t.id, t)
      const shouldAutoPlay = turn.source !== "scheduler" && consumeAutoplayTicket()
      if (shouldAutoPlay || !currentTrackRef.current) {
        setCurrentTrack(t)
        currentTrackRef.current = t
      }
      if (shouldAutoPlay) {
        nextInFlightRef.current = false
        playTrack(t)
      }
    }

    // Start TTS + word highlight (always — DJ should be heard talking even if
    // we don't swap the song)
    setActiveDJId(turn.id)
    setDjElapsedMs(0)
    setStatus("speaking")
    if (ttsRef.current && turn.ttsUrl && !turn.ttsSilent) {
      try {
        ensureAudioGraph()
        const ctx = audioCtxRef.current
        if (ctx && ctx.state === "suspended") ctx.resume().catch(() => undefined)
        ttsRef.current.src = turn.ttsUrl
        ttsRef.current.currentTime = 0
        ttsRef.current.play().catch(() => undefined)
      } catch {}
    }

    // Pre-warm the prefetch <audio> with the segue hint so the user's next
    // tap doesn't stall on network. /api/resolve does NOT generate a DJ turn.
    if (turn.segue) prefetchNext(turn.segue)
  }, [consumeAutoplayTicket, ensureAudioGraph, playTrack, prefetchNext])

  const toggleTheme = useCallback(() => setTheme(t => (t === "dark" ? "light" : "dark")), [])
  const toggleHideChat = useCallback(() => setHideChat(v => !v), [])

  const togglePlay = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) {
      if (a.src) {
        const seq = ++playSeqRef.current
        a.play()
          .then(() => {
            if (seq === playSeqRef.current) setIsPlaying(true)
          })
          .catch(() => {
            if (seq === playSeqRef.current) setIsPlaying(false)
          })
      }
    } else {
      ++playSeqRef.current
      a.pause()
      setIsPlaying(false)
    }
  }, [])

  const setPlaying = useCallback((v: boolean) => {
    const a = audioRef.current
    if (!a) return
    if (v) {
      const seq = ++playSeqRef.current
      a.play()
        .then(() => {
          if (seq === playSeqRef.current) setIsPlaying(true)
        })
        .catch(() => {
          if (seq === playSeqRef.current) setIsPlaying(false)
        })
    } else {
      ++playSeqRef.current
      a.pause()
      setIsPlaying(false)
    }
  }, [])

  const next = useCallback(() => {
    if (nextInFlightRef.current) {
      addSystemMessage("下一首已经在路上了，先不重复排队。")
      return
    }
    nextInFlightRef.current = true
    issueAutoplayTicket()
    setStatus("thinking")
    if (currentTrack) {
      api.skip(currentTrack.id).catch(() => undefined)
    }
    api
      .trigger("用户点了下一首，给一首过渡。", "next")
      .catch(() => {
        autoplayTicketRef.current = null
        setStatus("error")
        addSystemMessage("下一首没排上：后台现在连不上。")
      })
      .finally(() => {
        nextInFlightRef.current = false
      })
  }, [addSystemMessage, currentTrack, issueAutoplayTicket])

  const prev = useCallback(() => {
    const a = audioRef.current
    if (a && a.currentTime > 4) {
      a.currentTime = 0
      return
    }
    // Walk back through messages
    const djs = messages.filter(m => m.kind === "dj") as DJMessage[]
    const cur = djs.findIndex(m => m.recommends?.[0]?.id === currentTrack?.id)
    if (cur > 0) {
      const prevT = djs[cur - 1].recommends?.[0]
      if (prevT) {
        setCurrentTrack(prevT)
        playTrack(prevT)
      }
    }
  }, [messages, currentTrack, playTrack])

  const stop = useCallback(() => {
    const a = audioRef.current
    ++playSeqRef.current
    if (a) {
      a.pause()
      a.currentTime = 0
    }
    setIsPlaying(false)
    setStatus("idle")
  }, [])

  const toggleLike = useCallback((trackId?: string) => {
    const id = trackId ?? currentTrack?.id
    if (!id) return
    // Resolve the track object (current, recently-seen, or known liked) for
    // the toast sub-line + optimistic Library update.
    const track =
      (currentTrack?.id === id ? currentTrack : undefined) ??
      recentTracksRef.current.get(id) ??
      likedTracks.find(t => t.id === id)
    setLiked(prev => {
      const nextLiked = !prev[id]
      api.like(id, nextLiked).catch(() => undefined)
      if (track) {
        if (nextLiked) {
          showToast("记进了你的品味", `${track.title} · ${track.artist}`)
          setLikedTracks(list => (list.some(t => t.id === id) ? list : [track, ...list]))
        } else {
          showToast("从品味里移除", `${track.title} · ${track.artist}`)
          setLikedTracks(list => list.filter(t => t.id !== id))
        }
      }
      return { ...prev, [id]: nextLiked }
    })
  }, [currentTrack, likedTracks, showToast])

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)))
  }, [])

  const seek = useCallback((s: number) => {
    const a = audioRef.current
    if (a) a.currentTime = Math.max(0, Math.min(a.duration || 0, s))
  }, [])

  const selectTrack = useCallback((t: Track) => {
    currentTrackRef.current = t
    setCurrentTrack(t)
    if (t.url) playTrack(t)
  }, [playTrack])

  const replayDJ = useCallback((id: string) => {
    setActiveDJId(id)
    setDjElapsedMs(0)
    // restart TTS playback
    const dj = messages.find(m => m.id === id && m.kind === "dj") as DJMessage | undefined
    if (ttsRef.current && dj?.ttsUrl) {
      try {
        ttsRef.current.src = dj.ttsUrl
        ttsRef.current.currentTime = 0
        ttsRef.current.play().catch(() => undefined)
      } catch {}
    }
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (chatInFlightRef.current) {
      addSystemMessage("Claudio 还在回上一句，等他说完再发。")
      return
    }
    chatInFlightRef.current = true
    issueAutoplayTicket()
    const ts = new Date()
    const hhmm = `${String(ts.getHours()).padStart(2, "0")}:${String(ts.getMinutes()).padStart(2, "0")}`
    const userId = `user-${ts.getTime()}`
    setMessages(m => [...m, { id: userId, kind: "user", speaker: "mmguo", timestamp: hhmm, text: trimmed }])
    setStatus("thinking")
    try {
      // The server broadcasts via WS too, but we kick the request so the user
      // sees a response even if WS is momentarily down.
      const turn = await api.chat(trimmed)
      // If WS hasn't delivered the turn within 400ms, fall back to applying
      // it from the HTTP response. handleTurn dedupes by id internally.
      setTimeout(() => {
        if (!handledTurnsRef.current.has(turn.id)) handleTurn(turn)
      }, 400)
    } catch (err) {
      console.warn("[ctx] chat failed", err)
      autoplayTicketRef.current = null
      setStatus("error")
      addSystemMessage(`发送失败：${(err as Error).message}`)
    } finally {
      chatInFlightRef.current = false
    }
  }, [addSystemMessage, handleTurn, issueAutoplayTicket])

  const triggerScheduled = useCallback(async (reason: string) => {
    try {
      await api.trigger(reason)
    } catch {
      // ignore
    }
  }, [])

  // ---- profiles ---------------------------------------------------------
  const refreshProfiles = useCallback(async () => {
    try {
      const r = await fetch("/api/profiles")
      if (!r.ok) return
      const j = (await r.json()) as { active: string; profiles: Profile[] }
      setProfiles(j.profiles)
    } catch {}
  }, [])

  const switchProfile = useCallback(async (id: string) => {
    try {
      await fetch("/api/profile/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      // Reload everything from the new profile
      currentTrackRef.current = null
      setCurrentTrack(null)
      setCurrentTime(0)
      setDuration(0)
      setLiked({})
      setLikedTracks([])
      const ms = await api.messages()
      applyServerMessages(ms.messages)
      const h = await api.health()
      setHealth(h)
      await refreshProfiles()
      await refreshLiked()
    } catch (err) {
      console.warn("[ctx] switchProfile failed", err)
    }
  }, [applyServerMessages, refreshProfiles, refreshLiked])

  const createProfile = useCallback(async (id: string, name: string) => {
    try {
      const r = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name }),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({}))
        throw new Error((e as any).error ?? `HTTP ${r.status}`)
      }
      await refreshProfiles()
    } catch (err) {
      console.warn("[ctx] createProfile failed", err)
      throw err
    }
  }, [refreshProfiles])

  // ---- taste editor -----------------------------------------------------
  const refreshTaste = useCallback(async () => {
    const r = await api.taste()
    return r.files
  }, [])
  const saveTasteFile = useCallback(async (name: string, body: string) => {
    const r = await fetch(`/api/taste/${encodeURIComponent(name)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    })
    if (!r.ok) {
      const e = await r.json().catch(() => ({}))
      throw new Error((e as any).error ?? `HTTP ${r.status}`)
    }
  }, [])

  useEffect(() => { refreshProfiles() }, [refreshProfiles])

  // Up-next, derived from the message stream: the most recent DJ-recommended
  // tracks Claudio has surfaced, minus whatever is playing now. Real radio has
  // no fixed queue — this is "what Claudio has lined up", deduped.
  const upcoming = useMemo(() => {
    const seen = new Set<string>(currentTrack ? [currentTrack.id] : [])
    const out: { track: Track; caption: string }[] = []
    for (let i = messages.length - 1; i >= 0 && out.length < 6; i--) {
      const m = messages[i]
      if (m.kind !== "dj") continue
      const dj = m as DJMessage
      for (const t of dj.recommends ?? []) {
        if (seen.has(t.id)) continue
        seen.add(t.id)
        out.push({ track: t, caption: dj.text.slice(0, 48) })
      }
    }
    return out
  }, [messages, currentTrack])

  const value = useMemo<PlayerState>(() => ({
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    liked,
    theme,
    hideChat,
    status,
    messages,
    activeDJId,
    djElapsedMs,
    health,
    connected,
    analyserRef,
    profiles,
    refreshProfiles,
    switchProfile,
    createProfile,
    refreshTaste,
    saveTasteFile,
    likedTracks,
    upcoming,
    toast,
    dismissToast,
    toggleTheme,
    toggleHideChat,
    togglePlay,
    setPlaying,
    next,
    prev,
    stop,
    toggleLike,
    setVolume,
    seek,
    selectTrack,
    sendMessage,
    replayDJ,
    triggerScheduled,
  }), [
    currentTrack, isPlaying, currentTime, duration, volume, liked,
    theme, hideChat, status, messages, activeDJId, djElapsedMs,
    health, connected, profiles,
    refreshProfiles, switchProfile, createProfile, refreshTaste, saveTasteFile,
    likedTracks, upcoming, toast, dismissToast,
    toggleTheme, toggleHideChat, togglePlay, setPlaying, next, prev,
    stop, toggleLike, setVolume, seek, selectTrack, sendMessage, replayDJ, triggerScheduled,
  ])

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider")
  return ctx
}
