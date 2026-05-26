import type { ChatMessage, DJMessage, Profile, Track } from "./types"
import { wordsFromText } from "./types"

export const mockTracks: Track[] = [
  {
    id: "t-plastic-love",
    title: "Plastic Love",
    artist: "Mariya Takeuchi",
    album: "Variety",
    duration: 285,
    era: "1984 · CITY POP",
  },
  {
    id: "t-says",
    title: "Says",
    artist: "Nils Frahm",
    album: "Spaces",
    duration: 248,
    era: "2013 · NEO-CLASSICAL",
  },
  {
    id: "t-rufeng",
    title: "如风",
    artist: "王菲",
    album: "迷",
    duration: 264,
    era: "1994 · 华语",
  },
  {
    id: "t-lost-stars",
    title: "Lost Stars",
    artist: "Adam Levine",
    album: "Begin Again",
    duration: 244,
    era: "2014 · OST",
  },
]

const dj = (id: string, timestamp: string, text: string, recommends?: Track[]): DJMessage => {
  const words = wordsFromText(text)
  return {
    id,
    kind: "dj",
    speaker: "Claudio",
    timestamp,
    text,
    words,
    duration: words.reduce((a, w) => Math.max(a, w.end), 0) || 2500,
    recommends,
    hasReplay: true,
  }
}

export const mockMessages: ChatMessage[] = [
  { id: "sys-1", kind: "system", text: "FM ON · 21:00" },
  dj(
    "dj-1",
    "21:02",
    "晚上好 mmguo，今天上海有点闷。先给你一首慢的，让肩膀松一下。",
    [mockTracks[1]],
  ),
  {
    id: "u-1",
    kind: "user",
    speaker: "mmguo",
    timestamp: "21:04",
    text: "想听点 city pop",
  },
  dj(
    "dj-2",
    "21:04",
    "懂了。八十年代东京的湿夜——Plastic Love 永远是入口。准备好被这条 bassline 接住。",
    [mockTracks[0]],
  ),
  {
    id: "u-2",
    kind: "user",
    speaker: "mmguo",
    timestamp: "21:09",
    text: "下一首换个语言",
  },
  dj(
    "dj-3",
    "21:09",
    "好。从涩谷拐回 1994 的香港，王菲的《如风》。同样是城市夜的句号。",
    [mockTracks[2]],
  ),
]

export const mockProfiles: Profile[] = [
  {
    id: "default",
    name: "mmguo",
    avatar: "🐱",
    corpus_dir: "profiles/default",
    created_at: Date.now() - 86400000 * 30,
  },
  {
    id: "weekend",
    name: "周末模式",
    avatar: "🌙",
    corpus_dir: "profiles/weekend",
    created_at: Date.now() - 86400000 * 7,
  },
]

export type HealthSnapshot = {
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

export const mockHealth: HealthSnapshot = {
  ok: true,
  claude: true,
  calendar: true,
  naim: false,
  weather: true,
  fish: false,
  mimo: true,
  ttsProvider: "mimo",
  activeProfile: "default",
  moodProbe: null,
}

export const mockTasteFiles = [
  {
    name: "taste.md",
    body: `# mmguo · taste

## 永远会按
- city pop / shibuya-kei (Mariya Takeuchi, Tatsuro Yamashita)
- neo-classical 慢钢琴 (Nils Frahm, Ólafur Arnalds)
- 90s 华语女声 (王菲, 林忆莲, 莫文蔚)

## 不要打
- EDM drop / 大型 build-up
- 抖音热歌口水翻唱
- 任何 BPM > 140 的舞曲（除非我点了）

## 听的时间表
- 早上：钢琴 / 环境
- 晚上：city pop / 9 0 年代华语
- 写代码：post-rock 慢轨`,
  },
  {
    name: "playlists.json",
    body: `{
  "rainy_night": ["Plastic Love", "Says", "如风"],
  "morning": ["Says", "Avril 14th"],
  "coding": ["Spiegel im Spiegel", "Untitled #1"]
}`,
  },
]
