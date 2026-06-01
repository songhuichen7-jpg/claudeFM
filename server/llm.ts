import { spawn } from "node:child_process"
import { tmpdir } from "node:os"

// Run headless `claude -p` calls from a neutral directory so they don't pick up
// this repo's CLAUDE.md / .claude/settings.json. The prompts are self-contained.
const ISOLATED_CWD = tmpdir()

export type DJOutput = {
  say: string
  play: Array<{ title: string; artist: string; reason?: string }>
  reason?: string
  segue?: string
}

export type LLMBackend = "claude-cli" | "openai-compatible"
export type LLMStatus = {
  backend: LLMBackend
  provider: "claude-cli" | "deepseek" | "openai" | "openai-compatible"
  label: string
  configured: boolean
  available: boolean
  model: string
}

type GenerateOptions = {
  timeoutMs?: number
  jsonMode?: boolean
  maxTokens?: number
  temperature?: number
}

type OpenAIConfig = {
  apiKey: string | undefined
  baseUrl: string
  model: string
  provider: LLMStatus["provider"]
  label: string
}

/**
 * Generate plain assistant text through either Claude CLI or an
 * OpenAI-compatible Chat Completions endpoint.
 */
export async function generateLLMText(
  systemPrompt: string,
  userPrompt: string,
  options: GenerateOptions = {},
): Promise<string> {
  if (selectedBackend() === "openai-compatible") {
    return generateOpenAICompatible(systemPrompt, userPrompt, options)
  }
  return generateClaudeCli(systemPrompt, userPrompt, options)
}

/**
 * Generate and parse the strict DJ JSON contract used by router/scheduler.
 */
export async function askDJ(systemPrompt: string, userPrompt: string): Promise<DJOutput> {
  const replyText = await generateLLMText(systemPrompt, userPrompt, {
    jsonMode: true,
    maxTokens: Number(process.env.LLM_DJ_MAX_TOKENS ?? 1400),
    temperature: Number(process.env.LLM_TEMPERATURE ?? 0.8),
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 60_000),
  })
  const parsed = extractJSON(replyText)
  if (!parsed) {
    throw new Error(`llm: could not parse DJ JSON from reply: ${replyText.slice(0, 400)}`)
  }
  return normalizeDJOutput(parsed)
}

export async function llmStatus(): Promise<LLMStatus> {
  if (selectedBackend() === "openai-compatible") {
    const cfg = openAIConfig()
    return {
      backend: "openai-compatible",
      provider: cfg.provider,
      label: cfg.label,
      configured: !!cfg.apiKey,
      available: !!cfg.apiKey,
      model: cfg.model,
    }
  }

  const model = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6"
  const available = await claudeCliAvailable()
  return {
    backend: "claude-cli",
    provider: "claude-cli",
    label: "Claude CLI",
    configured: true,
    available,
    model,
  }
}

export async function llmAvailable(): Promise<boolean> {
  return (await llmStatus()).available
}

export async function claudeCliAvailable(): Promise<boolean> {
  return new Promise<boolean>((res) => {
    const proc = spawn(process.env.CLAUDE_BIN || "claude", ["--version"], {
      stdio: ["ignore", "pipe", "pipe"],
    })
    let buf = ""
    proc.stdout.on("data", (d) => (buf += d.toString()))
    proc.on("error", () => res(false))
    proc.on("close", (code) => res(code === 0 && buf.includes("Claude")))
  })
}

function selectedBackend(): LLMBackend {
  const requested = (process.env.LLM_PROVIDER ?? process.env.AI_PROVIDER ?? "").toLowerCase()
  if (["claude", "claude-cli"].includes(requested)) return "claude-cli"
  if (["deepseek", "openai", "openai-compatible", "openai_compatible", "compatible"].includes(requested)) {
    return "openai-compatible"
  }
  return hasOpenAICompatibleKey() ? "openai-compatible" : "claude-cli"
}

function hasOpenAICompatibleKey(): boolean {
  return !!(process.env.OPENAI_COMPAT_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY)
}

function openAIConfig(): OpenAIConfig {
  const requested = (process.env.LLM_PROVIDER ?? process.env.AI_PROVIDER ?? "").toLowerCase()
  const requestedGeneric = ["openai", "openai-compatible", "openai_compatible", "compatible"].includes(requested)
  const requestedDeepSeek = requested === "deepseek" || (!requestedGeneric && !!process.env.DEEPSEEK_API_KEY)
  const baseUrl = requestedDeepSeek
    ? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com"
    : process.env.OPENAI_COMPAT_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"
  const isDeepSeek =
    requestedDeepSeek ||
    /deepseek/i.test(baseUrl) ||
    /deepseek/i.test(process.env.OPENAI_COMPAT_MODEL ?? process.env.DEEPSEEK_MODEL ?? "")

  const provider: OpenAIConfig["provider"] = isDeepSeek
    ? "deepseek"
    : process.env.OPENAI_COMPAT_API_KEY
      ? "openai-compatible"
      : "openai"

  const model =
    (isDeepSeek
      ? process.env.DEEPSEEK_MODEL ?? process.env.OPENAI_COMPAT_MODEL ?? process.env.OPENAI_MODEL
      : process.env.OPENAI_COMPAT_MODEL ?? process.env.OPENAI_MODEL ?? process.env.DEEPSEEK_MODEL) ??
    (isDeepSeek ? "deepseek-v4-flash" : "gpt-4.1-mini")

  const apiKey = isDeepSeek
    ? process.env.DEEPSEEK_API_KEY ?? process.env.OPENAI_COMPAT_API_KEY ?? process.env.OPENAI_API_KEY
    : process.env.OPENAI_COMPAT_API_KEY ?? process.env.OPENAI_API_KEY ?? process.env.DEEPSEEK_API_KEY

  return {
    apiKey,
    baseUrl,
    model,
    provider,
    label:
      provider === "deepseek"
        ? "DeepSeek API"
        : provider === "openai"
          ? "OpenAI API"
          : "OpenAI-compatible API",
  }
}

async function generateOpenAICompatible(
  systemPrompt: string,
  userPrompt: string,
  options: GenerateOptions,
): Promise<string> {
  const cfg = openAIConfig()
  if (!cfg.apiKey) {
    throw new Error("openai-compatible: missing API key (set DEEPSEEK_API_KEY or OPENAI_COMPAT_API_KEY)")
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), options.timeoutMs ?? 60_000)
  const body: Record<string, unknown> = {
    model: cfg.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    stream: false,
    temperature: options.temperature ?? 0.7,
  }
  if (options.maxTokens) body.max_tokens = options.maxTokens
  if (options.jsonMode) body.response_format = { type: "json_object" }
  if (cfg.provider === "deepseek" && (process.env.DEEPSEEK_THINKING || options.jsonMode)) {
    body.thinking = { type: process.env.DEEPSEEK_THINKING ?? "disabled" }
  }

  try {
    const res = await fetch(chatCompletionsUrl(cfg.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    const text = await res.text()
    if (!res.ok) {
      throw new Error(`openai-compatible ${res.status}: ${text.slice(0, 400)}`)
    }
    const data = JSON.parse(text) as {
      choices?: Array<{ message?: { content?: string | null }; text?: string | null }>
      error?: { message?: string }
    }
    const content = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text ?? ""
    if (!content) {
      throw new Error(`openai-compatible: empty response (${text.slice(0, 400)})`)
    }
    return content
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`openai-compatible: timed out after ${options.timeoutMs ?? 60_000}ms`, { cause: err })
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

function chatCompletionsUrl(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "")
  return base.endsWith("/chat/completions") ? base : `${base}/chat/completions`
}

function generateClaudeCli(
  systemPrompt: string,
  userPrompt: string,
  options: GenerateOptions,
): Promise<string> {
  const combined = `${systemPrompt}\n\n---\n\n用户输入 / 触发：\n${userPrompt}`
  const args = [
    "-p",
    combined,
    "--output-format",
    "json",
    "--model",
    process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6",
  ]

  return new Promise<string>((resolve, reject) => {
    const proc = spawn(process.env.CLAUDE_BIN || "claude", args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
      cwd: ISOLATED_CWD,
    })

    let stdout = ""
    let stderr = ""

    proc.stdout.on("data", (d) => (stdout += d.toString()))
    proc.stderr.on("data", (d) => (stderr += d.toString()))

    const timeout = setTimeout(() => {
      proc.kill("SIGKILL")
      reject(new Error(`claude: timed out after ${options.timeoutMs ?? 60_000}ms`))
    }, options.timeoutMs ?? 60_000)

    proc.on("error", (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    proc.on("close", (code) => {
      clearTimeout(timeout)
      if (code !== 0) {
        reject(new Error(`claude exited with ${code}: ${stderr.slice(0, 400)}`))
        return
      }
      try {
        const envelope = JSON.parse(stdout) as { result?: string; text?: string }
        resolve(envelope.result ?? envelope.text ?? "")
      } catch (err) {
        reject(new Error(`claude: bad JSON envelope (${(err as Error).message}); stdout head: ${stdout.slice(0, 400)}`))
      }
    })
  })
}

function extractJSON(text: string): unknown | null {
  try {
    return JSON.parse(text.trim())
  } catch {
    /* try fenced JSON below */
  }
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) {
    try {
      return JSON.parse(fence[1].trim())
    } catch {
      /* try brace extraction below */
    }
  }
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch {
      /* no parseable object */
    }
  }
  return null
}

function normalizeDJOutput(obj: unknown): DJOutput {
  const record = obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {}
  const say = String(record.say ?? "").trim()
  const rawPlay = Array.isArray(record.play) ? record.play : []
  const play = rawPlay
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object" && !!(p as Record<string, unknown>).title)
    .map((p) => ({
      title: String(p.title).trim(),
      artist: String(p.artist ?? "").trim(),
      reason: p.reason ? String(p.reason) : undefined,
    }))
  return {
    say,
    play,
    reason: record.reason ? String(record.reason) : undefined,
    segue: record.segue ? String(record.segue) : undefined,
  }
}
