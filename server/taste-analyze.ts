// Analyse a freeform paste of "tracks I've been listening to" and propose
// updates to the active profile's taste.md / playlists.json — without writing
// anything. The caller (PWA) shows a diff and then calls /api/taste/apply
// with the chosen fields.

import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { generateLLMText } from "./llm.js"
import { activeCorpusDir } from "./context.js"

export type TasteProposal = {
  summary: string
  taste_md?: string
  playlists_json?: unknown
  detected_tracks: { title: string; artist: string }[]
}

const REBUILD_SYSTEM = `你正在为 mmguo 的私人 AI 电台 Claudio **从零构建** taste.md 和 playlists.json。

**重要前提**：之前 taste.md 里写的任何「喜欢的标签 / 状态偏好 / 听法习惯」都是 demo 占位，**不是真实数据**，必须完全忽略。
下面 <SOURCE> 里的曲目列表，是用户在「汽水音乐」里真实点过 ❤️ 收藏的全部歌——这是构建口味画像的**唯一**真实信号源。

# 你要做

1. 从 <SOURCE> 抽取所有 (title, artist) 对（artist 不确定写空字符串但保留竖线）
2. 综合归纳：
   - **喜欢的标签**：3-10 条，每条形如「标签名（代表艺人 1 / 艺人 2 / 艺人 3）—— 一句话观感」。标签必须由曲目实际反映出来，不能凭空写「jazz-hiphop / city pop / 90s 华语」之类用户没在听的东西
   - **状态偏好**：根据曲目的情绪类型推断出来的状态映射（早上 / 工作 / 黄昏 / 深夜 / 雨天 等），只写有数据支持的状态
   - **听法习惯**：观察 slowed / sped up / 8D / 多版本 / 集中 like 某艺人等行为模式
   - **playlists.json**：从抽到的曲目里**实际选种子**，**每个 playlist 5-12 个种子**（选最有代表性的，不要把所有歌都塞进去），且种子必须真的在 <SOURCE> 里出现过；playlist 数量 6-12 个最合适

**playlists.json 的 schema 必须严格是这个形状**（顶层不要再包一层 "playlists" key）：
\`\`\`
{
  "playlist_key_snake_case": {
    "label": "中文或英文标签",
    "mood": ["tag1", "tag2", "tag3"],
    "seeds": [
      {"title": "歌名", "artist": "艺人"},
      ...
    ]
  },
  "another_key": { ... }
}
\`\`\`
顶层就是 playlist key → playlist 对象。不要再嵌一层 {"playlists": [...]}，不要给 playlist 加 id / description / name 字段，只用 label / mood / seeds 三个字段。playlist key 用 snake_case 英文。
3. 保留以下三节**逐字不动**（这是 Claudio 性格，不随用户口味变）：
   - 主播口吻
   - 不要做的事
4. 黑名单可以根据 <SOURCE> 里**没有**的风格反向推断（比如全无 EDM big-drop 类型，可以保留这条；如果数据里完全没有抖音热歌就可以加进黑名单）

# 输出协议（严格按格式，否则我无法解析）

四段，分隔符是 8 个等号 + 标签 + 8 个等号：

========SUMMARY========
（1-3 句话：抽到多少首、识别出哪几个主要簇、playlists 怎么分的）
========DETECTED========
title|artist
title|artist
...（每行一首）
========TASTE_MD========
（完整的新 taste.md，纯 markdown 文本，第一行就是 # mmguo 的品味语料，不要包 \`\`\` 代码块）
========PLAYLISTS_JSON========
（完整的 playlists.json，纯 JSON 对象，第一字符 {，最后字符 }）

# 必须保留的两节（粘到 taste.md 里）

## 主播口吻
- 用第一人称，"我"
- 像深夜电台主持，慢、有间隔
- 一次只推荐一首，介绍年代 + 一个让我想坐下来听的理由
- 不用形容词堆砌，不说"完美"、"经典"、"必听"
- 偶尔自嘲，偶尔停一拍

## 不要做的事
- 不要按"今日推荐"打包给我十首
- 不要解释为什么这首歌"好"
- 不要每次都问"想听什么"——你应该比我先一步知道

# 强约束

- 不要凭空发明用户没贴的歌，每个 playlist seed 必须能在 <SOURCE> 里找到
- 标签的"代表艺人"必须来自 <SOURCE>，不要写用户没听过的人
- taste.md 必须完整、playlists.json 必须是合法 JSON
- PLAYLISTS_JSON 后面不要再加任何字符`

const SYSTEM = `你是一个口味分析助手，帮 mmguo 的 AI DJ Claudio 把外部听歌记录转成 taste.md / playlists.json 的更新。

输入由两段拼成：
1. <CURRENT_CORPUS>：用户当前的 taste.md 和 playlists.json
2. <NEW_LISTENING>：用户粘贴的最近在汽水音乐（或任何 app）里听的歌

你的任务：
- 从 <NEW_LISTENING> 里抽取尽可能多的「歌名 + 艺人」对，artist 不确定就留空字符串
- 综合分析这批歌反映出来的偏好（流派、年代、情绪、是否要补黑名单）
- 输出**修订后的完整 taste.md**（中文 markdown，保留原结构 + 补充观察）
- 输出**修订后的完整 playlists.json**（保留原种子 + 把新发现的歌按情绪归到对应 playlist；可以新增 playlist）

# 输出协议（严格遵守，否则我无法解析）

按下面四段输出，**段与段之间必须用恰好一行的分隔符**。不要在分隔符前后加引号、空格、emoji 或解释。
分隔符就是 8 个等号后跟一个标签名。

完全按这个骨架：

===SUMMARY===
（这里写 1-3 句话告诉我你抽到了什么、调整了什么）
===DETECTED===
title|artist
title|artist
…（每行一首，用竖线分隔；artist 不确定写空但要保留竖线）
===TASTE_MD===
（这里直接写完整的新 taste.md 文本，**原样输出**，不要包代码块、不要做 JSON 转义、双引号原样保留）
===PLAYLISTS_JSON===
（这里直接写完整的 playlists.json 对象，纯 JSON，第一字符 {，最后字符 }）

# 关键约束

- 不要凭空发明用户没贴的歌
- 黑名单 / 不要做的事 / 主播口吻三节一字不动
- taste.md 必须完整（不是 diff）
- playlists.json 沿用 {key: {label, mood, seeds}} 的形状
- 不要在最后一个段落（PLAYLISTS_JSON 内容之后）再加任何文字`

export async function analyzePaste(paste: string): Promise<TasteProposal> {
  return analyzePasteRaw(paste)
}

/**
 * Raw entrypoint that parses taste_md / playlists_json / detected_tracks
 * directly from the configured LLM's sectioned text output.
 */
export async function analyzePasteRaw(paste: string): Promise<TasteProposal> {
  const dir = activeCorpusDir()
  let tasteMd = ""
  let playlistsJson = ""
  try {
    tasteMd = await readFile(join(dir, "taste.md"), "utf-8")
  } catch {
    /* missing taste.md is allowed */
  }
  try {
    playlistsJson = await readFile(join(dir, "playlists.json"), "utf-8")
  } catch {
    /* missing playlists.json is allowed */
  }

  const userPrompt = [
    "<CURRENT_CORPUS>",
    "## taste.md",
    "```markdown",
    tasteMd,
    "```",
    "",
    "## playlists.json",
    "```json",
    playlistsJson,
    "```",
    "</CURRENT_CORPUS>",
    "",
    "<NEW_LISTENING>",
    paste.trim(),
    "</NEW_LISTENING>",
    "",
    "现在按输出协议给我新的 taste_md + playlists_json + detected_tracks。",
  ].join("\n")

  try {
    const text = await generateLLMText(SYSTEM, userPrompt, {
      timeoutMs: 1200_000,
      maxTokens: Number(process.env.LLM_TASTE_MAX_TOKENS ?? 12_000),
      temperature: Number(process.env.LLM_TASTE_TEMPERATURE ?? 0.2),
    })
    const proposal = parseSectionedResponse(text)
    if (!proposal) {
      await writeFile("/tmp/llm-analyze-failed.txt", text).catch(() => undefined)
      throw new Error(`cannot parse (len=${text.length}, head=${text.slice(0, 150)})`)
    }
    return proposal
  } catch (err) {
    throw new Error(`llm analyze: ${(err as Error).message}`, { cause: err })
  }
}

/**
 * Rebuild path: ignore any existing taste.md / playlists.json baseline and
 * construct everything from the SOURCE tracks. Same sectioned output protocol
 * as analyzePasteRaw, but with a different system prompt that explicitly
 * forbids treating the prior corpus as ground truth.
 */
export async function rebuildPasteRaw(paste: string): Promise<TasteProposal> {
  const userPrompt = [
    "<SOURCE>",
    paste.trim(),
    "</SOURCE>",
    "",
    "上面 <SOURCE> 里是用户在汽水音乐里全部 ❤️ 收藏的歌。请按输出协议从零构建 taste.md 和 playlists.json。",
  ].join("\n")

  try {
    const text = await generateLLMText(REBUILD_SYSTEM, userPrompt, {
      timeoutMs: 1200_000,
      maxTokens: Number(process.env.LLM_TASTE_REBUILD_MAX_TOKENS ?? 16_000),
      temperature: Number(process.env.LLM_TASTE_TEMPERATURE ?? 0.2),
    })
    // Always dump raw output for inspection — this is a long, opaque run.
    await writeFile("/tmp/llm-rebuild-raw.txt", text).catch(() => undefined)
    const proposal = parseSectionedResponse(text)
    if (!proposal) {
      throw new Error(`cannot parse (len=${text.length}, head=${text.slice(0, 150)})`)
    }
    return proposal
  } catch (err) {
    throw new Error(`llm rebuild: ${(err as Error).message}`, { cause: err })
  }
}

/**
 * Parse the SUMMARY/DETECTED/TASTE_MD/PLAYLISTS_JSON sectioned format. We do
 * this instead of asking the model for a single nested JSON because long
 * string values are easy for providers to mangle with escaping.
 */
function parseSectionedResponse(text: string): TasteProposal | null {
  const re = /^={3,}(SUMMARY|DETECTED|TASTE_MD|PLAYLISTS_JSON)={3,}\s*$/gm
  const indices: { tag: string; start: number; end: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    indices.push({ tag: m[1], start: m.index, end: m.index + m[0].length })
  }
  if (indices.length === 0) return null

  const sections: Record<string, string> = {}
  for (let i = 0; i < indices.length; i++) {
    const next = indices[i + 1]
    const bodyStart = indices[i].end
    const bodyEnd = next ? next.start : text.length
    sections[indices[i].tag] = text.slice(bodyStart, bodyEnd).trim()
  }

  const summary = sections.SUMMARY ?? ""
  const detected = (sections.DETECTED ?? "")
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(l => {
      const idx = l.indexOf("|")
      if (idx === -1) return { title: l.replace(/^[-*]\s*/, "").trim(), artist: "" }
      const title = l.slice(0, idx).replace(/^[-*]\s*/, "").trim()
      const artist = l.slice(idx + 1).trim()
      return { title, artist }
    })
    .filter(t => t.title.length > 0)

  const taste_md = sections.TASTE_MD || undefined
  let playlists_json: unknown | undefined
  const pj = sections.PLAYLISTS_JSON
  if (pj) {
    // Trim trailing junk (some models add a closing fence)
    const trimmed = pj.replace(/```\s*$/g, "").trim()
    try {
      playlists_json = JSON.parse(trimmed)
    } catch {
      // Try brace-balanced extraction
      const obj = extractJSON(trimmed)
      if (obj) playlists_json = obj
    }
  }

  return {
    summary,
    taste_md,
    playlists_json,
    detected_tracks: detected,
  }
}

function extractJSON(text: string): unknown | null {
  try { return JSON.parse(text.trim()) } catch {
    /* try fenced JSON below */
  }
  // Strip a possible ```json … ``` outer fence WITHOUT greedy-matching the
  // inner ``` that might appear inside taste_md content (e.g. example
  // markdown blocks). We do this by trimming the leading fence header and
  // the trailing fence footer.
  const fenced = text.trim()
  if (fenced.startsWith("```")) {
    const noHead = fenced.replace(/^```(?:json)?\s*/i, "")
    const noTail = noHead.replace(/```\s*$/i, "")
    try { return JSON.parse(noTail) } catch {
      /* try brace extraction below */
    }
  }
  // Brace-balanced extraction with string-awareness (so braces inside JSON
  // strings don't confuse the counter).
  const start = text.indexOf("{")
  if (start === -1) return null
  let depth = 0
  let inStr = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (escape) { escape = false; continue }
    if (c === "\\") { escape = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (c === "{") depth++
    else if (c === "}") {
      depth--
      if (depth === 0) {
        const candidate = text.slice(start, i + 1)
        try { return JSON.parse(candidate) } catch { return null }
      }
    }
  }
  return null
}
