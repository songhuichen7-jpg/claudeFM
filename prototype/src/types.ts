export type Track = {
  id: string
  title: string
  artist: string
  album?: string
  duration: number
  cover?: string
  era?: string
  url?: string
}

export type WordToken = {
  text: string
  start: number
  end: number
}

export type DJMessage = {
  id: string
  kind: "dj"
  speaker: "Claudio"
  timestamp: string
  text: string
  words: WordToken[]
  duration: number
  recommends?: Track[]
  hasReplay?: boolean
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

export type Profile = {
  id: string
  name: string
  avatar: string | null
  corpus_dir: string
  created_at: number
}

export function wordsFromText(text: string, perWordMs = 220): WordToken[] {
  const tokens = text.split(/(\s+)/)
  let cursor = 0
  const out: WordToken[] = []
  for (const t of tokens) {
    if (!t.trim()) {
      out.push({ text: t, start: cursor, end: cursor })
      continue
    }
    const cjkCount = (t.match(/[　-鿿]/g) || []).length
    const otherCount = t.length - cjkCount
    const ms = Math.max(perWordMs, cjkCount * 180 + otherCount * 60 + 110)
    out.push({ text: t, start: cursor, end: cursor + ms })
    cursor += ms
  }
  return out
}
