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

/** One sentence-sized chunk inside a DJ message. Used by FocusView to render
 *  the transcript as separate "Claudio · 0:MM" lines instead of one wall of
 *  text — matches the focus-mode screenshot in the spec. */
export type DJSegment = {
  text: string
  startMs: number // offset from start of broadcast
  endMs: number
  words: WordToken[] // words[].start/end are also broadcast-relative
}

export type DJMessage = {
  id: string
  kind: "dj"
  speaker: "Claudio"
  timestamp: string // 21:02 — wall-clock for ChatStream
  text: string
  words: WordToken[]
  segments: DJSegment[]
  duration: number // ms (used as the highlight horizon)
  /** Broadcast segment label e.g. "Monday Night Exhale" — shown as the
   *  big headline in FocusView. */
  segment?: string
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
