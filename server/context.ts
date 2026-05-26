import { readFile, readdir } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Messages, Plays, Profiles, activeProfile } from "./state.js"
import { getWeather } from "./weather.js"
import { todayCalendar, calendarEnabled } from "./feishu.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

export function activeCorpusDir(): string {
  const p = Profiles.get(activeProfile())
  return join(ROOT, p?.corpus_dir ?? "user")
}

export type ContextFragments = {
  system: string
  user: string
  env: string
  memory: string
  trigger: string
  trace: string
}

let personaCache: string | null = null
async function persona() {
  if (personaCache) return personaCache
  personaCache = await readFile(join(ROOT, "prompts", "dj-persona.md"), "utf-8")
  return personaCache
}

async function readUserCorpus() {
  const dir = activeCorpusDir()
  let names: string[] = []
  try {
    names = await readdir(dir)
  } catch {
    return ""
  }
  const parts: string[] = []
  for (const name of names.sort()) {
    if (name.startsWith(".")) continue
    try {
      const body = await readFile(join(dir, name), "utf-8")
      parts.push(`## ${name}\n\n${body}`)
    } catch {}
  }
  return parts.join("\n\n")
}

async function envFragment() {
  const w = await getWeather()
  const now = new Date()
  const wd = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][now.getDay()]
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  const cal = calendarEnabled() ? await todayCalendar() : []
  const calLine = cal.length
    ? `日历：${cal.map(e => `${new Date(e.start).toTimeString().slice(0, 5)} ${e.title}`).join(" / ")}`
    : "日历：今天没有从飞书拉到事件（或未配置）"
  const wLine = w
    ? `天气：${w.condition}，${w.tempC.toFixed(0)}°C（体感 ${w.feelsC.toFixed(0)}°C）${w.rain ? "，有雨" : ""}，${w.isDay ? "白天" : "夜里"}`
    : "天气：未取到"
  return `现在：${date} ${wd} ${time}\n${wLine}\n${calLine}`
}

function memoryFragment() {
  const liked = Plays.recentLiked(168, 8)
  const skipped = Plays.recentSkipped(24, 8)
  const recentPlays = Plays.recentTitles(24, 12)
  const lastMsgs = Messages.recent(8).reverse()

  const likedLine = liked.length
    ? liked.map(p => `${p.title} — ${p.artist}`).join("\n")
    : "（这周没记录到 like）"
  const skippedLine = skipped.length
    ? skipped.map(p => `${p.title} — ${p.artist}`).join("\n")
    : "（24h 没记录到 skip）"
  const playsLine = recentPlays.length
    ? recentPlays.map(p => `${p.title} — ${p.artist}`).join("\n")
    : "（24h 内没有播放记录）"
  const msgsLine = lastMsgs.length
    ? lastMsgs
        .map(m => `${m.kind === "user" ? "user" : m.kind === "dj" ? "claudio" : "sys"}: ${m.text}`)
        .join("\n")
    : "（暂无最近对话）"

  return [
    "## 已检索记忆",
    "",
    "### 最近一周被 like 的（信号：fan moment，可以再多给点同人/同年代）",
    likedLine,
    "",
    "### 24h 内被 skip 的（千万别再放，artist 也要换一换）",
    skippedLine,
    "",
    "### 24h 已经放过的（同一首不要重复）",
    playsLine,
    "",
    "## 最近 8 条对话",
    msgsLine,
  ].join("\n")
}

export type TriggerKind = "user" | "scheduler" | "webhook"

export async function assemble({
  triggerKind,
  triggerBody,
  lastReason,
  lastSegue,
}: {
  triggerKind: TriggerKind
  triggerBody: string
  lastReason?: string
  lastSegue?: string
}): Promise<ContextFragments> {
  const [systemPersona, userCorpus, env] = await Promise.all([
    persona(),
    readUserCorpus(),
    envFragment(),
  ])

  const memory = memoryFragment()

  const triggerLabel = {
    user: "用户输入",
    scheduler: "调度器触发",
    webhook: "webhook 触发",
  }[triggerKind]

  const trace =
    lastReason || lastSegue
      ? `## 上一轮你的内部记录\nreason: ${lastReason ?? "(无)"}\nsegue: ${lastSegue ?? "(无)"}`
      : "## 上一轮你的内部记录\n（这是当前会话的第一轮）"

  return {
    system: systemPersona,
    user: `## 用户语料\n\n${userCorpus}`,
    env: `## 环境注入\n${env}`,
    memory,
    trigger: `## ${triggerLabel}\n${triggerBody}`,
    trace,
  }
}

export function joinFragments(f: ContextFragments): { system: string; user: string } {
  return {
    system: f.system,
    user: [f.user, f.env, f.memory, f.trace, f.trigger].join("\n\n---\n\n"),
  }
}
