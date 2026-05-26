export type Track = {
  id: string
  title: string
  artist: string
  album?: string
  duration: number // seconds
  cover?: string
  era?: string
  url?: string
}

export type WordToken = {
  text: string
  start: number // ms from message start
  end: number
}

export type DJMessage = {
  id: string
  kind: "dj"
  speaker: "Claudio"
  timestamp: string // 21:02
  text: string
  words: WordToken[]
  duration: number // ms (used as the highlight horizon)
  recommends?: Track[]
  hasReplay?: boolean
  ttsUrl?: string
}

export type UserMessage = {
  id: string
  kind: "user"
  speaker: string
  timestamp: string
  text: string
  avatar?: string
}

export type SystemMessage = {
  id: string
  kind: "system"
  text: string
}

export type ChatMessage = DJMessage | UserMessage | SystemMessage

export type Theme = "dark" | "light"
