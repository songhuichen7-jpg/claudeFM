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
import type { ChatMessage, DJMessage, Profile, Theme, Track } from "./types"
import { wordsFromText } from "./types"
import {
  mockHealth,
  mockMessages,
  mockMoods,
  mockProfiles,
  mockTasteFiles,
  mockTracks,
  mockUpcoming,
  type HealthSnapshot,
  type Mood,
} from "./mockData"

export type AnalyserHandle = {
  freq: Uint8Array | null
  level: number
  isAudio: boolean
  channel: "music" | "tts" | null
}

type Health = HealthSnapshot

type State = {
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  liked: Record<string, boolean>

  theme: Theme
  hideChat: boolean

  messages: ChatMessage[]
  activeDJId: string | null
  djElapsedMs: number

  health: Health
  connected: boolean

  analyserRef: React.MutableRefObject<AnalyserHandle>

  profiles: Profile[]
  tasteFiles: { name: string; body: string }[]

  moods: Mood[]
  currentMood: Mood
  setMood: (id: string) => void
  createMood: (label: string) => void

  upcoming: { track: Track; caption: string }[]

  toast: { id: number; text: string; sub?: string } | null
  dismissToast: () => void

  toggleTheme: () => void
  toggleHideChat: () => void
  togglePlay: () => void
  next: () => void
  prev: () => void
  stop: () => void
  toggleLike: (trackId?: string) => void
  setVolume: (v: number) => void
  seek: (s: number) => void
  selectTrack: (t: Track) => void
  sendMessage: (text: string) => void
  replayDJ: (id: string) => void
  switchProfile: (id: string) => void
  saveTasteFile: (name: string, body: string) => void
}

const Ctx = createContext<State | null>(null)

function pickEmoji(label: string): string {
  const s = label.toLowerCase()
  if (/(睡|晚|夜|night|sleep|床|被)/i.test(label)) return "🌙"
  if (/(写|代码|code|email|邮件|工作|工位)/i.test(label)) return "⌨"
  if (/(走|散步|跑|walk|run|地铁|路上)/i.test(label)) return "🚶"
  if (/(雨|rain|下雨)/i.test(label)) return "🌧"
  if (/(咖啡|coffee|早|morning|醒)/i.test(label)) return "☕"
  if (/(做饭|吃饭|cook|dinner)/i.test(label)) return "🍳"
  if (/(放空|发呆|想|empty|空)/i.test(label)) return "✦"
  if (/(派对|party|爽|嗨)/i.test(label)) return "✺"
  return s.length > 0 ? "◉" : "◉"
}

const DJ_RESPONSES = [
  "收到。我翻一翻今晚的牌堆。",
  "懂你这个情绪。下一首会更慢一点。",
  "好。换个温度试试这首。",
  "这一首应该正中你今晚的频率。",
]

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(mockTracks[0])
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(42)
  const [volume, setVolumeState] = useState(0.75)
  const [liked, setLiked] = useState<Record<string, boolean>>({ [mockTracks[0].id]: true })

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark"
    return window.localStorage.getItem("claudio-prototype-theme") === "light" ? "light" : "dark"
  })
  const [hideChat, setHideChat] = useState(false)

  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages)
  const [activeDJId, setActiveDJId] = useState<string | null>("dj-3")
  const [djElapsedMs, setDjElapsedMs] = useState(0)

  const [profiles] = useState<Profile[]>(mockProfiles)
  const [tasteFiles, setTasteFiles] = useState(mockTasteFiles)
  const [moods, setMoods] = useState<Mood[]>(mockMoods)
  const [currentMoodId, setCurrentMoodId] = useState<string>(() => {
    if (typeof window === "undefined") return mockMoods[0].id
    return window.localStorage.getItem("claudio-prototype-mood") ?? mockMoods[0].id
  })
  const [upcoming] = useState(mockUpcoming)
  const [toast, setToast] = useState<State["toast"]>(null)
  const toastTimerRef = useRef<number | null>(null)

  const showToast = useCallback((text: string, sub?: string) => {
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    setToast({ id: Date.now(), text, sub })
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2800)
  }, [])

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    setToast(null)
  }, [])

  const queueIndexRef = useRef(0)
  const analyserRef = useRef<AnalyserHandle>({ freq: null, level: 0, isAudio: false, channel: null })

  const duration = currentTrack?.duration ?? 0

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    root.classList.toggle("light", theme === "light")
    window.localStorage.setItem("claudio-prototype-theme", theme)
  }, [theme])

  // Tick playback time
  useEffect(() => {
    if (!isPlaying || !currentTrack) return
    const id = window.setInterval(() => {
      setCurrentTime(t => {
        const next = t + 1
        if (next >= (currentTrack.duration || 0)) {
          return 0
        }
        return next
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [isPlaying, currentTrack])

  // Tick DJ word highlight
  useEffect(() => {
    if (!activeDJId) return
    const dj = messages.find(m => m.id === activeDJId && m.kind === "dj") as DJMessage | undefined
    if (!dj) return
    let raf: number | null = null
    let last = performance.now()
    const tick = (t: number) => {
      const dt = t - last
      last = t
      setDjElapsedMs(prev => {
        const next = prev + dt
        if (next > dj.duration + 600) {
          setActiveDJId(null)
          return dj.duration
        }
        return next
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      if (raf != null) cancelAnimationFrame(raf)
    }
  }, [activeDJId, messages])

  const toggleTheme = useCallback(() => setTheme(t => (t === "dark" ? "light" : "dark")), [])
  const toggleHideChat = useCallback(() => setHideChat(v => !v), [])
  const togglePlay = useCallback(() => setIsPlaying(p => !p), [])

  const advanceTo = useCallback((track: Track) => {
    setCurrentTrack(track)
    setCurrentTime(0)
    setIsPlaying(true)
  }, [])

  const next = useCallback(() => {
    queueIndexRef.current = (queueIndexRef.current + 1) % mockTracks.length
    const t = mockTracks[queueIndexRef.current]
    advanceTo(t)
    const ts = new Date()
    const hhmm = `${String(ts.getHours()).padStart(2, "0")}:${String(ts.getMinutes()).padStart(2, "0")}`
    const text = "切一下。" + DJ_RESPONSES[Math.floor(Math.random() * DJ_RESPONSES.length)]
    const words = wordsFromText(text)
    const id = `dj-${ts.getTime()}`
    setMessages(prev => [
      ...prev,
      {
        id,
        kind: "dj",
        speaker: "Claudio",
        timestamp: hhmm,
        text,
        words,
        duration: words.reduce((a, w) => Math.max(a, w.end), 0) || 2500,
        recommends: [t],
        hasReplay: true,
      },
    ])
    setActiveDJId(id)
    setDjElapsedMs(0)
  }, [advanceTo])

  const prev = useCallback(() => {
    queueIndexRef.current = (queueIndexRef.current - 1 + mockTracks.length) % mockTracks.length
    advanceTo(mockTracks[queueIndexRef.current])
  }, [advanceTo])

  const stop = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  const toggleLike = useCallback((trackId?: string) => {
    const id = trackId ?? currentTrack?.id
    if (!id) return
    setLiked(prev => {
      const nextLiked = !prev[id]
      const all = [...mockTracks, ...upcoming.map(u => u.track)]
      const t = all.find(x => x.id === id) ?? currentTrack
      const moodLabel = currentMoodId
      const mood = mockMoods.find(m => m.id === moodLabel)
      if (t) {
        if (nextLiked) showToast(`已记入「${mood?.label ?? moodLabel}」`, `${t.title} · ${t.artist}`)
        else showToast(`从「${mood?.label ?? moodLabel}」移除`, `${t.title} · ${t.artist}`)
      }
      return { ...prev, [id]: nextLiked }
    })
  }, [currentTrack, currentMoodId, upcoming, showToast])

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)))
  }, [])

  const seek = useCallback((s: number) => {
    setCurrentTime(Math.max(0, Math.min(duration, s)))
  }, [duration])

  const selectTrack = useCallback((t: Track) => {
    advanceTo(t)
  }, [advanceTo])

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const ts = new Date()
    const hhmm = `${String(ts.getHours()).padStart(2, "0")}:${String(ts.getMinutes()).padStart(2, "0")}`
    const userId = `user-${ts.getTime()}`
    setMessages(m => [...m, { id: userId, kind: "user", speaker: "mmguo", timestamp: hhmm, text: trimmed }])
    // Fake DJ reply 700ms later
    window.setTimeout(() => {
      const stamp = new Date()
      const stampHHMM = `${String(stamp.getHours()).padStart(2, "0")}:${String(stamp.getMinutes()).padStart(2, "0")}`
      const reply = DJ_RESPONSES[Math.floor(Math.random() * DJ_RESPONSES.length)]
      const words = wordsFromText(reply)
      const id = `dj-${stamp.getTime()}`
      const rec = mockTracks[Math.floor(Math.random() * mockTracks.length)]
      setMessages(prev => [
        ...prev,
        {
          id,
          kind: "dj",
          speaker: "Claudio",
          timestamp: stampHHMM,
          text: reply,
          words,
          duration: words.reduce((a, w) => Math.max(a, w.end), 0) || 2500,
          recommends: [rec],
          hasReplay: true,
        },
      ])
      setActiveDJId(id)
      setDjElapsedMs(0)
    }, 700)
  }, [])

  const replayDJ = useCallback((id: string) => {
    setActiveDJId(id)
    setDjElapsedMs(0)
  }, [])

  const switchProfile = useCallback((_id: string) => {
    // Prototype: no-op; the active profile chip is purely visual.
  }, [])

  const announceMood = useCallback((m: Mood) => {
    const ts = new Date()
    const hhmm = `${String(ts.getHours()).padStart(2, "0")}:${String(ts.getMinutes()).padStart(2, "0")}`
    const text = `切到「${m.label}」。${m.tagline}。`
    const words = wordsFromText(text)
    const djId = `dj-mood-${ts.getTime()}`
    setMessages(prev => [
      ...prev,
      {
        id: djId,
        kind: "dj",
        speaker: "Claudio",
        timestamp: hhmm,
        text,
        words,
        duration: words.reduce((a, w) => Math.max(a, w.end), 0) || 2500,
        hasReplay: true,
      },
    ])
    setActiveDJId(djId)
    setDjElapsedMs(0)
  }, [])

  const setMood = useCallback((id: string) => {
    setCurrentMoodId(id)
    if (typeof window !== "undefined") window.localStorage.setItem("claudio-prototype-mood", id)
    const m = moods.find(x => x.id === id)
    if (m) announceMood(m)
  }, [moods, announceMood])

  /**
   * Make a new Mood from a free-text label. Used by the picker when the
   * user types something Claudio hasn't seen before. The accent cycles
   * through a small palette; the emoji is picked by a tiny keyword
   * heuristic; the tagline is just the label itself, since in production
   * Claude would author a richer one from your taste.md.
   */
  const createMood = useCallback((label: string) => {
    const trimmed = label.trim()
    if (!trimmed) return
    const palette = ["#b76cff", "#29ffb8", "#ff9b6b", "#6d4cff", "#ff6ab8", "#7aa5d6", "#ffce5e", "#9b8bf5"]
    const accent = palette[(moods.length + 1) % palette.length]
    const emoji = pickEmoji(trimmed)
    const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const m: Mood = { id, label: trimmed, emoji, tagline: trimmed, accent }
    setMoods(prev => [...prev, m])
    setCurrentMoodId(id)
    if (typeof window !== "undefined") window.localStorage.setItem("claudio-prototype-mood", id)
    announceMood(m)
  }, [moods.length, announceMood])

  const saveTasteFile = useCallback((name: string, body: string) => {
    setTasteFiles(prev => prev.map(f => (f.name === name ? { ...f, body } : f)))
  }, [])

  const value = useMemo<State>(() => ({
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    liked,
    theme,
    hideChat,
    messages,
    activeDJId,
    djElapsedMs,
    health: mockHealth,
    connected: true,
    analyserRef,
    profiles,
    tasteFiles,
    moods,
    currentMood: moods.find(m => m.id === currentMoodId) ?? moods[0],
    setMood,
    createMood,
    upcoming,
    toast,
    dismissToast,
    toggleTheme,
    toggleHideChat,
    togglePlay,
    next,
    prev,
    stop,
    toggleLike,
    setVolume,
    seek,
    selectTrack,
    sendMessage,
    replayDJ,
    switchProfile,
    saveTasteFile,
  }), [
    currentTrack, isPlaying, currentTime, duration, volume, liked,
    theme, hideChat, messages, activeDJId, djElapsedMs,
    profiles, tasteFiles, moods, currentMoodId, upcoming, setMood, createMood,
    toast, dismissToast,
    toggleTheme, toggleHideChat, togglePlay, next, prev, stop, toggleLike,
    setVolume, seek, selectTrack, sendMessage, replayDJ, switchProfile, saveTasteFile,
  ])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePrototype() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("usePrototype must be used inside PrototypeProvider")
  return ctx
}
