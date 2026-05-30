import type { ChatMessage, DJMessage, Profile, Track } from "./types"
import { wordsFromText } from "./types"

export type Mood = {
  id: string
  label: string
  emoji: string
  tagline: string
  accent: string
}

export const mockMoods: Mood[] = [
  { id: "tonight", label: "今晚", emoji: "🌙", tagline: "慢一点，让肩膀松", accent: "#b76cff" },
  { id: "coding", label: "写代码", emoji: "⌨", tagline: "后摇 + 环境，不要人声", accent: "#29ffb8" },
  { id: "walking", label: "散步", emoji: "🚶", tagline: "90s 华语 + city pop", accent: "#ff9b6b" },
  { id: "sleep", label: "入睡", emoji: "🌃", tagline: "钢琴 + 雨", accent: "#6d4cff" },
]

/**
 * Contextual chip pools. Each entry is what Claudio "would suggest"
 * given the currently playing track. In production these are generated
 * by Claude looking at the live state; here we hand-author per-track.
 */
export const mockTrackChips: Record<string, string[]> = {
  "t-plastic-love": [
    "再多来几首 city pop",
    "降一点 BPM",
    "换个语言试试？",
  ],
  "t-says": [
    "继续慢一点",
    "想换成钢琴 + 雨？",
    "再来一首 Nils",
  ],
  "t-rufeng": [
    "继续 90s 华语",
    "回到日文歌？",
    "找首林忆莲",
  ],
  "t-lost-stars": [
    "再多来几首电影歌",
    "升一点情绪",
    "讲讲这首歌的故事",
  ],
}

/** Fallback chips when current track has no specific pool. */
export const mockFallbackChips = [
  "再来一首",
  "换个心情",
  "讲讲这首歌",
]

/** Claudio's mood suggestions in the picker. */
export const mockMoodSuggestions = [
  "加班晚归 想放空",
  "下雨夜 想被音乐接住",
  "写邮件 但不想烦",
  "醒来还赖在床上",
  "做饭 一个人",
]

// Cover art is inlined as an SVG data URI here so the prototype works
// without network access. In the real app these come from the NCM search
// response: `song.album.picUrl` (see server/ncm.ts:42), optionally with
// ?param=600y600 appended for a higher-res variant.
const cov = (g1: string, g2: string, accent: string, accent2: string) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'><defs><linearGradient id='b' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${g1}'/><stop offset='1' stop-color='${g2}'/></linearGradient><radialGradient id='g1' cx='28%' cy='22%' r='0.6'><stop offset='0' stop-color='${accent}' stop-opacity='0.8'/><stop offset='1' stop-color='${accent}' stop-opacity='0'/></radialGradient><radialGradient id='g2' cx='75%' cy='80%' r='0.5'><stop offset='0' stop-color='${accent2}' stop-opacity='0.7'/><stop offset='1' stop-color='${accent2}' stop-opacity='0'/></radialGradient></defs><rect width='600' height='600' fill='url(#b)'/><rect width='600' height='600' fill='url(#g1)'/><rect width='600' height='600' fill='url(#g2)'/><circle cx='180' cy='220' r='110' fill='${accent}' opacity='0.18'/><circle cx='430' cy='450' r='150' fill='${accent2}' opacity='0.16'/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export const mockTracks: Track[] = [
  {
    id: "t-plastic-love",
    title: "Plastic Love",
    artist: "Mariya Takeuchi",
    album: "Variety",
    duration: 285,
    era: "1984 · CITY POP",
    cover: cov("#ff6ab8", "#3b1c4a", "#ffce5e", "#a06bff"),
  },
  {
    id: "t-says",
    title: "Says",
    artist: "Nils Frahm",
    album: "Spaces",
    duration: 248,
    era: "2013 · NEO-CLASSICAL",
    cover: cov("#3d5a80", "#0d1b2a", "#e0e1dd", "#7aa5d6"),
  },
  {
    id: "t-rufeng",
    title: "如风",
    artist: "王菲",
    album: "迷",
    duration: 264,
    era: "1994 · 华语",
    cover: cov("#c44a3c", "#2a0a14", "#ffb380", "#7c2532"),
  },
  {
    id: "t-lost-stars",
    title: "Lost Stars",
    artist: "Adam Levine",
    album: "Begin Again",
    duration: 244,
    era: "2014 · OST",
    cover: cov("#4a2cb8", "#0c0a2b", "#9b8bf5", "#2bb8ad"),
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
    "晚上好 veko，今天上海有点闷。先给你一首慢的，让肩膀松一下。",
    [mockTracks[1]],
  ),
  {
    id: "u-1",
    kind: "user",
    speaker: "veko",
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
    speaker: "veko",
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

export const mockUpcoming: { track: Track; caption: string }[] = [
  { track: mockTracks[2], caption: "拐回 1994 香港，给你一个干净的落点" },
  { track: mockTracks[1], caption: "降下温度，让心跳慢下来" },
  { track: mockTracks[3], caption: "收尾，留一点夏夜的余温" },
]

/** The day, pre-planned into time blocks — each with a vibe label, a target
 * speaker, and a tracklist. Mirrors the original's terminal schedule view. */
export const mockSchedule: { range: string; label: string; device: string; tracks: string[] }[] = [
  {
    range: "09:12–10:00",
    label: "房间先醒",
    device: "naim 宝宝",
    tracks: ["颜色 · 许美静", "取消资格 · 陈小春", "分分钟需要你 · 林忆莲", "黑色领带 · 陈晓东"],
  },
  {
    range: "10:00–12:00",
    label: "深度工作",
    device: "sony 小黑",
    tracks: ["A Walk · Tycho", "Cirrus · Bonobo", "Open Eye Signal · Jon Hopkins", "Thrown · Kiasmos", "On the Nature of Daylight · Max Richter"],
  },
  {
    range: "12:00–13:00",
    label: "午休韩语",
    device: "naim 宝宝",
    tracks: ["Square · Yerin Baek", "Tik Tak Tok · 실리카겔"],
  },
  {
    range: "21:00–23:30",
    label: "今晚 · 收尾",
    device: "naim 宝宝",
    tracks: ["Says · Nils Frahm", "Plastic Love · Mariya Takeuchi", "如风 · 王菲"],
  },
]

export const mockProfiles: Profile[] = [
  {
    id: "default",
    name: "veko",
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
    body: `# veko · taste

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
