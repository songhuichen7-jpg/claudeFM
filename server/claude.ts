import { spawn } from "node:child_process"
import { tmpdir } from "node:os"

const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude"

// Run headless `claude -p` calls from a neutral directory so they DON'T pick up
// this repo's CLAUDE.md / .claude/settings.json (e.g. the SDD doc-sync Stop
// hook). The DJ prompt is fully self-contained; repo context only pollutes it
// (the model would otherwise reply about TODO.md instead of emitting DJ JSON).
const ISOLATED_CWD = tmpdir()

export type DJOutput = {
  say: string
  play: Array<{ title: string; artist: string; reason?: string }>
  reason?: string
  segue?: string
}

/**
 * Invoke Claude Code in non-interactive mode and parse the model's JSON reply.
 *
 * We rely on `claude -p <prompt> --output-format json` which streams a final
 * JSON envelope containing `result` (the assistant's reply text). The reply
 * itself is the DJ JSON we asked the model to emit.
 */
export async function askDJ(systemPrompt: string, userPrompt: string): Promise<DJOutput> {
  const combined = `${systemPrompt}\n\n---\n\n用户输入 / 触发：\n${userPrompt}`

  const args = [
    "-p",
    combined,
    "--output-format",
    "json",
    "--model",
    "claude-sonnet-4-6",
  ]

  return new Promise<DJOutput>((resolvePromise, reject) => {
    const proc = spawn(CLAUDE_BIN, args, {
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
      reject(new Error("claude: timed out after 60s"))
    }, 60_000)

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
        const envelope = JSON.parse(stdout)
        const replyText: string = envelope.result ?? envelope.text ?? ""
        const parsed = extractJSON(replyText)
        if (!parsed) {
          reject(new Error(`claude: could not parse DJ JSON from reply: ${replyText.slice(0, 400)}`))
          return
        }
        resolvePromise(normalize(parsed))
      } catch (err) {
        reject(new Error(`claude: bad JSON envelope (${(err as Error).message}); stdout head: ${stdout.slice(0, 400)}`))
      }
    })
  })
}

function extractJSON(text: string): any | null {
  // 1) plain JSON
  try {
    return JSON.parse(text.trim())
  } catch {}
  // 2) ```json ... ``` fenced block
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) {
    try {
      return JSON.parse(fence[1].trim())
    } catch {}
  }
  // 3) first { ... } balanced span
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch {}
  }
  return null
}

function normalize(obj: any): DJOutput {
  const say = String(obj.say ?? "").trim()
  const rawPlay = Array.isArray(obj.play) ? obj.play : []
  const play = rawPlay
    .filter((p: any) => p && typeof p === "object" && p.title)
    .map((p: any) => ({
      title: String(p.title).trim(),
      artist: String(p.artist ?? "").trim(),
      reason: p.reason ? String(p.reason) : undefined,
    }))
  return {
    say,
    play,
    reason: obj.reason ? String(obj.reason) : undefined,
    segue: obj.segue ? String(obj.segue) : undefined,
  }
}

/**
 * Quick health check: tries to invoke `claude --version`.
 */
export async function claudeAvailable(): Promise<boolean> {
  return new Promise<boolean>((res) => {
    const proc = spawn(CLAUDE_BIN, ["--version"], { stdio: ["ignore", "pipe", "pipe"] })
    let buf = ""
    proc.stdout.on("data", (d) => (buf += d.toString()))
    proc.on("error", () => res(false))
    proc.on("close", (code) => res(code === 0 && buf.includes("Claude")))
  })
}
