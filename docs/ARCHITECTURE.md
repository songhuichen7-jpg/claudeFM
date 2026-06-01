# Claudio FM — ARCHITECTURE

> 技术栈、数据模型、契约、**禁止破坏的逻辑**、对齐策略。动代码前必读。

## 1. 技术栈

- **前端**：React 19 + Vite 8 + Tailwind v4（`@tailwindcss/vite`）。真实应用入口 `index.html` → `src/main.tsx` → `src/App.tsx`。
- **后端**：Fastify 5（`server/index.ts`），`@fastify/websocket` + `@fastify/static` + `@fastify/cors`。`tsx` 直跑 TS。
- **DB**：better-sqlite3，`state.db`（WAL）。schema/迁移在 `server/state.ts`。
- **AI**：LLM 适配层（`server/llm.ts`，`llmStatus()`）支持 Claude CLI 与 OpenAI-compatible Chat Completions（DeepSeek 默认 `https://api.deepseek.com`）；出 DJ turn / 排程 / 品味分析；不可用时 `server/fallback.ts` 兜底。
- **音乐**：NeteaseCloudMusicApi（`server/ncm.ts`：search / songUrl / lyric / recommend；`ncm-auth.ts` 扫码登录）。匿名只拿 30s 试听 + 搜索。
- **TTS**：MiMo（`server/tts.ts`，`.env` MIMO_*），fallback Fish / silent。产物缓存到 `/tts/`。
- **其它**：weather(open-meteo)、feishu 日历、naim 客厅推送、scheduler(node-cron) —— 均可选，缺失有 fallback。

## 2. 运行

- `pnpm dev` → `dev:web`(vite :5173, 代理 /api /tts /stream → :8080) + `dev:server`(tsx watch :8080)。
- `pnpm dev:prototype` → 原型独立站 :5174（设计事实源，不依赖后端）。
- `pnpm build` = `tsc -b && vite build` → `dist/`，server 直接 serve。

## 3. 数据模型（`server/state.ts`）

- `profiles(id,name,avatar,corpus_dir,created_at)` —— 语料档（多 profile，默认 `default`）。
- `messages(id,ts,profile_id,kind,speaker,text,meta_json)` —— 聊天流；`kind∈{dj,user,system}`，`meta_json` 存 `{tracks,ttsUrl,reason,segue}`。
- `plays(id,ts,profile_id,track_id,title,artist,duration_s,skipped,liked)` —— 播放历史；**喜欢用 `liked=1` 落在这里**（`markLiked`、`recentLiked`）。
- `plan(date,profile_id,json)` —— 每日编排（schedule）。
- `prefs`、`scheduler_log`。
- 每张表都按 `profile_id` 隔离；`activeProfile()` 进程级 + prefs 持久化。

## 4. 真实接口契约（`server/index.ts`，**不许改既有的**）

- `GET /api/health` → `{ok,claude,llm,calendar,naim,weather,fish,mimo,ttsProvider,activeProfile,moodProbe}`（`claude` 为旧字段，前端读取 `llm`）
- `POST /api/chat {text}` → DJ turn，并 WS 广播 `{type:"dj",turn}`
- `GET /api/messages` → `{messages:[{id,ts,kind,speaker,text,meta}]}`
- `GET /api/now` / `GET /api/next` → 当前 / 队列提示 + 最近 plays
- `POST /api/skip {trackId}` / `POST /api/like {trackId,liked}` → 落 plays + WS 广播
- `GET /api/plan/today` → `{date, plan|null}`
- `GET /api/taste` / `PUT /api/taste/:name` → 品味语料读写
- `GET /api/profiles` / `POST /api/profiles` / `POST /api/profile/switch` / `DELETE /api/profiles/:id`
- `GET /api/ncm/status` / `POST /api/ncm/login/qr/{create,check}` / `POST /api/ncm/logout`
- `POST /api/resolve {query}` → 静默 NCM 解析（点歌/prefetch，不落库不广播）
- `POST /api/trigger {reason,source}` → 手动/排程触发
- `POST /api/taste/{analyze,rebuild,apply}` → 品味导入（UI 不暴露，端点保留）
- `WS /stream` → 服务端广播 `{type:"dj",turn}` / `{type:"now-playing",track}` / `{type:"skip"}` / `{type:"like"}`；客户端可发 `{type:"ping"}`

### 本轮唯一允许的新增

- `GET /api/liked` → `{tracks:[{id,title,artist}]}`（active profile 去重喜欢曲目；底层加 `Plays.likedTracks()`）。**只增不改。**

## 5. 前端状态层（`src/state/PlayerContext.tsx`）—— 复用，勿重写

`usePlayer()` 已提供：`currentTrack,isPlaying,currentTime,duration,volume,liked,theme,hideChat,status,messages,activeDJId,djElapsedMs,health,connected,analyserRef,profiles` + actions `toggleTheme,toggleHideChat,togglePlay,setPlaying,next,prev,stop,toggleLike,setVolume,seek,selectTrack,sendMessage,replayDJ,triggerScheduled,refreshProfiles,switchProfile,createProfile,refreshTaste,saveTasteFile`。

**本轮对状态层只做加法**（不动既有字段/逻辑）：
- `toast:{id,text,sub}|null` + `showToast()` + `dismissToast()`；`toggleLike` 时 fire。
- `likedTracks: Track[]`：从 `GET /api/liked` 拉取 + 本地 ♥ 即时合并；供 Library / 顶栏计数。
- `upcoming:{track,caption}[]`：从 `GET /api/next` 派生（仅供 PlayerBar 的 `QUEUE · N` 计数 + 可选预览）。
- `plan`（schedule）：Settings 打开时拉 `GET /api/plan/today`。

## 6. 目录结构（对齐后）

```
src/
  App.tsx                 # 单列布局组装（绑 usePlayer）
  index.css               # 设计 token（对齐 prototype/src/index.css）
  state/PlayerContext.tsx  # 真实状态层（WS/audio/TTS/API）— 加法扩展
  api/client.ts            # 加 liked() / next() / planToday()
  data/types.ts            # Track/DJMessage…（已含 ttsUrl）
  components/              # 从 prototype 移植、改绑 usePlayer：
    Header ClockPanel PlayerBar ChatLive Composer
    FocusView LibraryView SettingsView ProfileCard
    Shell CatAvatar Waveform Toast
server/                   # 维持现状，仅加 /api/liked
prototype/                # 设计事实源（保留，不删）
tests/e2e/                # Playwright 核心旅程
```

## 7. 禁止破坏的逻辑（红线）

1. `server/` 既有路由/契约/WS 协议 —— 只增不改不删。
2. `state.db` schema 与 v1→v2 迁移 —— 不改列；新增只能 `CREATE TABLE IF NOT EXISTS` / 新查询。
3. `PlayerContext` 的：隐藏 `<audio>` + WebAudio analyser 图、`/stream` 重连、`handleTurn` 去重、autoplay-ticket 一次性授权、TTS 词高亮 ticker、prefetch。**只读复用，不重写。**
4. `api/client.ts` 既有方法签名 —— 只加不改。
5. 真实应用与 `prototype/` 物理隔离：移植是"把原型组件抄进 src/ 并改 import 数据源为 usePlayer"，不是让 src/ 去依赖 prototype/。

## 8. 验收

`pnpm build` 通过；`pnpm dev` 起真实栈跑通 PRD 第 3 节 8 条旅程；`tests/e2e/` 全绿；红线无破坏。
