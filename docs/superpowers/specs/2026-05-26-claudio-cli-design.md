# Claudio CLI 设计 spec

- 日期：2026-05-26
- 范围：为 claudeFM 加一个 Node CLI 客户端，复用现有 Fastify 服务器（端口 8080）
- 状态：brainstorming 完成，待 writing-plans 衔接

## 1. 背景与约束

- 服务器：Fastify 5 + `@fastify/websocket`，已有 HTTP API 和 WS `/stream` 端点
- 现有 chat 流程：`POST /api/chat` 阻塞式 — 同步跑完 Claude 推理 + 网易云解曲 + TTS 合成后，返回完整 `DJTurn`，并通过 `hub.broadcast` 镜像到 WS
- `askDJ`（`server/claude.ts`）当前**不是** token 级流式
- 已有 SSE 流式参考：`/api/taste/analyze?stream=1`

CLI 不引入服务器端改动。所有 token 级流式诉求挪到未来工作。

## 2. 顶层决策（brainstorming 已敲定）

| 决策 | 选定 | 备选 |
|---|---|---|
| 流式语义 | A：仅订阅现有 WS，不动服务器 | B token 级、C 伪流、D SSE 端点 |
| 命令范围 | 2：chat + now / next / skip / like / unlike | 仅 chat / + REPL / 全套 |
| 输出格式 | II：segment 标头 + say + 曲目列表，chalk 上色 | 仅 say / 全字段 / II+verbose |
| 安装形态 | α：同仓 `cli/` 子目录 + bin 入口 | 独立包 / scripts / npx |
| 协议方案 | P1：POST 拿回复，WS 只做 `watch` 长跑 | P2 WS 收回复（竞态） / P3 双轨 |

## 3. 架构总览

```
claudeFM/
├─ cli/
│  ├─ index.ts              # bin 入口，commander 装命令
│  ├─ commands/
│  │  ├─ chat.ts            # claudio chat "<text>"
│  │  ├─ now.ts             # claudio now
│  │  ├─ next.ts            # claudio next
│  │  ├─ skip.ts            # claudio skip [trackId]
│  │  ├─ like.ts            # claudio like <trackId> / unlike <trackId>
│  │  └─ watch.ts           # claudio watch（唯一长跑命令，连 WS）
│  ├─ lib/
│  │  ├─ api.ts             # fetch 封装 + 错误归一
│  │  ├─ ws.ts              # WS 客户端（仅 watch 用）
│  │  ├─ render.ts          # 终端渲染
│  │  └─ config.ts          # baseUrl / json / verbose 配置
│  └─ tsconfig.json
├─ package.json             # 加 "bin": { "claudio": "./cli/dist/index.js" }
└─ tsconfig.cli.json        # cli/ 独立 build 配置
```

**命令表面**：

| 命令 | HTTP | WS | 说明 |
|---|---|---|---|
| `claudio chat "<text>"` | POST /api/chat | — | 同步等 DJTurn，渲染 |
| `claudio now` | GET /api/now | — | 当前播放 + 上一条 DJ |
| `claudio next` | GET /api/next | — | 队列 hint |
| `claudio skip [trackId]` | POST /api/skip | — | 跳过 |
| `claudio like <trackId>` | POST /api/like `{liked:true}` | — | 点赞 |
| `claudio unlike <trackId>` | POST /api/like `{liked:false}` | — | 取消 |
| `claudio watch` | — | /stream | 长跑，渲染广播事件直到 Ctrl-C |

**依赖**：

- `commander` ^12（subcommand API 干净）
- `ws` ^8（@types/ws 已在项目 devDeps）
- `chalk` ^5（ESM-only，与项目 `"type": "module"` 对齐）
- 不用 ora / spinner 库 — chat 等待 1-15s，写一个静默的 `Claudio …` 占位符到 stderr 就够

**全局选项**：

- `--server <url>` 或环境变量 `CLAUDIO_SERVER`，默认 `http://localhost:8080`
- `--json` 输出 raw JSON（管道友好）
- `--verbose` 额外打 reason / segue / ttsUrl

## 4. 模块边界与接口

每个模块"做一件事，依赖谁说清楚"。

### `cli/lib/config.ts`

```ts
export type CliConfig = {
  serverUrl: string   // 不带尾斜杠
  json: boolean
  verbose: boolean
}

export function resolveConfig(opts: {
  server?: string
  json?: boolean
  verbose?: boolean
}): CliConfig
```

优先级：`opts.server` > `process.env.CLAUDIO_SERVER` > `"http://localhost:8080"`。  
非法 URL → 抛错（CLI 入口接住，exit 2）。  
依赖：无。

### `cli/lib/api.ts`

```ts
export type ApiError = { status: number; body: unknown; message: string }

export async function apiGet<T>(cfg: CliConfig, path: string): Promise<T>
export async function apiPost<T>(cfg: CliConfig, path: string, body?: unknown, signal?: AbortSignal): Promise<T>
```

- Node 20+ 全局 `fetch`，不引 undici
- 非 2xx → 抛 `ApiError`，带服务器 `{error: "..."}` 文本
- ECONNREFUSED / ENOTFOUND 等 → 抛 `ApiError {status: 0, message: "server unreachable at <url>"}`
- 不内置 retry，不内置 timeout —— chat 命令用 AbortSignal + SIGINT 处理取消
- DJTurn 路径做轻量运行时形状校验（见 §6.2）

依赖：`config.ts`。

### `cli/lib/ws.ts`

```ts
import type { WsEvent } from "../../server/hub.js"

export type WsHandle = { close(): void }

export function connectStream(
  cfg: CliConfig,
  onEvent: (ev: WsEvent) => void,
  onError: (err: Error) => void,
): Promise<WsHandle>
```

- 把 `http://` → `ws://`，`https://` → `wss://`，拼上 `/stream`
- 30 秒心跳 `{type:"ping"}`，使用已有 pong 协议（`server/index.ts:392`）
- 断线指数退避重连：1/2/4/8/16/30s，连续 5 次失败 exit 1
- 类型从服务器导入，**不重新声明**

依赖：`ws` 库，`server/hub.ts` 的类型。

### `cli/lib/render.ts`

```ts
import type { DJTurn, ResolvedTrack } from "../../server/router.js"
import type { ApiError } from "./api.js"

export function renderTurn(turn: DJTurn, cfg: CliConfig): void
export function renderNowPlaying(track: ResolvedTrack | null, startedAt: number): void
export function renderError(err: ApiError | Error, cfg: CliConfig): void
```

**默认输出**：

```
[Monday Night Exhale]              ← chalk.dim.italic
Claudio: <say 文本>                ← "Claudio:" chalk.bold.cyan
  ♪ <title 1> — <artist 1>         ← chalk.green
  ♪ <title 2> — <artist 2>
```

- `--json`：`console.log(JSON.stringify(turn))`，跳过 chalk
- `--verbose`：追加 3 行 dim 显示 reason / segue / ttsUrl
- `renderError` 写 stderr；`--json` 模式下 stdout 额外打一行 `{"error": "...", "code": "...", "url": "..."}`

依赖：`chalk`，类型来自 server。

### `cli/commands/*.ts`

每个文件导出一个 `register(program: Command)`，把命令挂上去。命令文件 ≤30 行，只做参数解析 + 调 api + 调 render。

例 `chat.ts`：

```ts
export function registerChat(program: Command) {
  program.command("chat <text>")
    .description("Talk to Claudio")
    .action(async (text: string, _, cmd) => {
      const cfg = resolveConfig(cmd.optsWithGlobals())
      if (!text.trim()) {
        process.stderr.write("claudio chat: text must be non-empty\n")
        process.exit(2)
      }
      const ac = new AbortController()
      process.once("SIGINT", () => ac.abort())
      process.stderr.write(chalk.dim("Claudio …"))
      try {
        const turn = await apiPost<DJTurn>(cfg, "/api/chat", { text }, ac.signal)
        process.stderr.write("\r            \r")  // 擦占位
        renderTurn(turn, cfg)
      } catch (err) {
        process.stderr.write("\r            \r")
        if ((err as Error).name === "AbortError") {
          process.stderr.write("^C cancelled\n")
          process.exit(130)
        }
        renderError(err as ApiError, cfg)
        process.exit(1)
      }
    })
}
```

### `cli/index.ts`

```ts
#!/usr/bin/env node
import { Command } from "commander"
import { registerChat } from "./commands/chat.js"
// ... 其他 register

const program = new Command()
  .name("claudio")
  .description("Claudio FM remote control")
  .version("0.1.0")
  .option("--server <url>", "server base URL")
  .option("--json", "raw JSON output")
  .option("--verbose", "include reason/segue/ttsUrl")

registerChat(program)
registerNow(program)
registerNext(program)
registerSkip(program)
registerLike(program)
registerWatch(program)

process.on("uncaughtException", (err) => {
  console.error(chalk.red(`claudio: internal error: ${err.message}`))
  if (process.env.CLAUDIO_DEBUG) console.error(err.stack)
  process.exit(1)
})

program.parseAsync(process.argv)
```

### 类型复用

CLI **不重复声明** `DJTurn` / `WsEvent` / `ResolvedTrack`，直接 `import type` 自 `server/*.ts`。  
`tsconfig.cli.json` 允许跨目录 import-type，`outDir` 限定在 `cli/dist`，不会把服务器代码带进运行时。

## 5. 数据流

### 5.1 `claudio chat "今晚想听点放松的"`

1. **argv 解析**：commander 切出 text，全局 opts → `resolveConfig` → `CliConfig`
2. **校验**：`text.trim() === ""` → exit 2
3. **占位**：`stderr` 写 `Claudio …`（不污染 `--json` stdout）
4. **发送**：`apiPost<DJTurn>(cfg, "/api/chat", {text}, ac.signal)`，无 HTTP timeout
5. **服务器**：`runUserTurn` 跑 classify → assemble → askDJ → resolveTrack × N → synthesize → finalize → broadcast，**HTTP 直接返回 `DJTurn`**（不绕 WS）
6. **渲染**：擦占位，`renderTurn(turn, cfg)`
7. **退出 0**

### 5.2 `claudio now`

`GET /api/now` → `{ last, nowPlaying }`：

- `nowPlaying` 存在 → 输出 `♪ <title> — <artist>  ⏱  started <relative>`
- `last` 存在 → 接 `前一条 DJ：[segment] <text 截断 80 字>`
- 都没有 → `Claudio 安静着。`

### 5.3 `claudio next`

`GET /api/next` → `{ hint, plays }`，打印 hint + 最近 5 条 plays。

### 5.4 `claudio skip / like / unlike`

`POST /api/skip {trackId?}` 或 `POST /api/like {trackId, liked}`：

- 成功 → `chalk.green("✓ skipped / liked / unliked")`，exit 0
- 失败 → `✗ <server message>`，exit 1

服务器侧的 `hub.broadcast` 是给 watch 镜像看的，不影响 CLI 退出。

### 5.5 `claudio watch`

1. `connectStream` 建 `ws://localhost:8080/stream`
2. 收到 `hello` → `chalk.dim("connected at <ts>")`
3. 收到 `now-playing` → `renderNowPlaying`
4. 收到 `dj` → `renderTurn`（含自己 chat 命令在另一终端引发的回声）
5. 收到 `skip` → `chalk.yellow("⤳ skipped <id>")`
6. 收到 `like` → `chalk.magenta("♥ <id> liked=<bool>")`
7. 每 30s 发 `{type:"ping"}`
8. SIGINT → `ws.close(1000)` → exit 0
9. 非主动 close → 指数退避重连，5 次失败 exit 1

## 6. 错误处理

### 6.1 退出码约定

- `0` 成功
- `1` 运行错（网络、HTTP 错、内部异常、watch 重连失败）
- `2` 用法错（参数、URL 非法、空 text）
- `130` SIGINT 取消

### 6.2 失败矩阵

| 层 | 情况 | 退出 | 输出 |
|---|---|---|---|
| 参数 | 缺 text / trackId / 非法 URL | 2 | commander 默认 / 显式提示 |
| 网络 | ECONNREFUSED / ENOTFOUND | 1 | `✗ cannot reach Claudio at <url>` + hint |
| HTTP | 4xx / 5xx | 1 | `✗ server returned <status>: <body.error>` |
| chat 取消 | Ctrl-C 进行中 | 130 | `^C cancelled`，服务器侧仍跑完（已知单边） |
| WS 初连失败 | watch 起不来 | 1 | `✗ cannot connect to ws://…` |
| WS 重连超 5 次 | watch 长跑掉线 | 1 | `✗ giving up after 5 reconnects` |
| 非法 JSON / 未知 type | watch 流容错 | — | stderr 一行，不退出 |
| 内部异常 | uncaughtException | 1 | `claudio: internal error: <msg>`（`CLAUDIO_DEBUG=1` 才打 stack） |

### 6.3 形状校验

```ts
function assertDJTurn(x: unknown): asserts x is DJTurn {
  if (!x || typeof (x as any).say !== "string" || !Array.isArray((x as any).tracks))
    throw new Error("server returned unexpected shape for DJTurn")
}
```

只在 `POST /api/chat` 响应这一条路径上 assert。不上 zod。

### 6.4 `--json` 模式错误

stderr 仍走人类文案，**stdout 一行 JSON**：

```json
{"error": "server unreachable", "code": "ECONNREFUSED", "url": "http://localhost:8080"}
```

确保 `claudio chat "x" --json | jq` 在错误时也不炸。

## 7. 测试策略

### 7.1 单测（vitest）

| 模块 | 覆盖 |
|---|---|
| `config.ts` | flag > env > 默认；非法 URL 抛错 |
| `render.ts` | 固定 DJTurn → 断言输出含 segment / say / tracks；`--json` 可 `JSON.parse`；`--verbose` 多 3 行 |
| `api.ts` 错误归一 | mock fetch → ECONNREFUSED / 4xx / 5xx → 断言 `ApiError.status/message` |

### 7.2 契约测试

- `pnpm tsc -b` 在 CI 必须通过，server 类型一改 CLI 立刻飘红
- 运行时 `assertDJTurn` 兜底未知形状

### 7.3 端到端冒烟

`cli/test/smoke.test.ts`，前置 `pnpm dev:server` 已起：

- chat happy path：exit 0，stdout 含 `Claudio:`
- `now` 无播放：exit 0
- `--json` 模式：stdout 可 JSON parse
- chat 服务器挂掉：exit 1，stderr 含 hint

只覆盖 happy path，4-5 个测，不追覆盖率指标。

### 7.4 手测清单（README）

```
□ pnpm dev:server  → 另开终端
□ claudio chat "你好"             → 看到 segment + say + tracks
□ claudio chat "你好" --json | jq .say
□ claudio now                    → 当前播放
□ claudio watch                  → hello 事件 + 30s 内不掉
□ 杀掉服务器后 claudio chat       → 友好报错，exit 1
□ 杀掉服务器后 claudio watch     → 重连尝试，5 次后 exit 1
□ Ctrl-C chat 进行中             → exit 130，"^C cancelled"
```

### 7.5 不测什么

- 不 mock WebSocket 模拟 watch（在测 mock 本身）
- 不测 commander argv 解析（别人家的库）
- 不设覆盖率门槛

## 8. 未在本 spec 范围

- token 级真流式（需要改 `server/claude.ts` 用 Anthropic SDK stream API + 新 WS 协议 `chat-delta`）
- REPL / 交互模式
- profile 切换、messages 历史回看子命令
- 远程部署 / 鉴权（CLI 假设本地 localhost）
- 多 profile 并发 chat

## 9. 衔接

下一步：用 `superpowers:writing-plans` 把 §3-§7 拆成可执行的实施 plan（vertical slicing、任务依赖图、size 标 XS-XL）。
