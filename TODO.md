# TODO — 真实 src/ 对齐 prototype/

> 规则：一次一个 task；做完测四态（主流程/加载/空/报错）→ commit `feat: xxx 通关` → 勾选。
> 红线见 `docs/ARCHITECTURE.md §7`。设计以 `prototype/` 为准。

## A. 地基（token + 状态层 + 后端新增）

- [x] A1. `src/index.css` 对齐原型 token：近黑底、单绿 `--accent`、等宽主体、点阵、`.shell-glow`、去紫渐变/glow。
- [x] A2. 后端加 `Plays.likedTracks()` + `GET /api/liked`（只增不改）；`api/client.ts` 加 `liked() / next() / planToday()`。
- [x] A3. `PlayerContext` 加法扩展：`toast`+`showToast`+`dismissToast`（toggleLike 时 fire）、`likedTracks`（拉 /api/liked + 本地合并）、`upcoming`（派生自 /api/next）。不动既有 audio/WS/analyser/ticket。

## B. 组件移植（prototype → src，改绑 usePlayer）

- [x] B1. `Shell`（去渐变 blob + vignette）。
- [x] B2. `Header`（字标 + ♥N Library + 齿轮 + DARK/LIGHT）。
- [x] B3. `ClockPanel`（点阵 + 像素钟 + ON AIR，点击进 Focus）。
- [x] B4. `PlayerBar`（EQ + 传输 + HIDE/FAV/VOL + 进度 + QUEUE 计数）。
- [x] B5. `ChatLive`（发丝气泡 + ▸曲目卡 + 逐字高亮 + REPLAY）。
- [x] B6. `Composer`（输入 + mic + 发送；聚焦 accent）。
- [x] B7. `Toast`（♥ 反馈）。
- [x] B8. `FocusView`（白卡 over 星空 + 波形 + 大歌名 + 转录）。
- [x] B9. `LibraryView`（喜欢曲目列表，绑 likedTracks）。
- [x] B10. `SettingsView`（状态/语料档/今日编排(plan)/网易云/品味语料，等宽单绿）。
- [x] B11. `ProfileCard`（像素 Claudio + 流派标签）。
- [x] B12. `App.tsx` 重组单列布局 + 接 Library/Toast；删除/替换旧 `Clock/Player/ChatStream/InputBar`。
- [x] B13. veko 改名、点歌话术、去掉汽水导入入口 —— 全部对齐原型。

## C. 收尾

- [x] C1. `pnpm build` 通过；本地 `pnpm dev` 起真实栈，手动过 PRD §3 八条旅程（四态）。
- [x] C2. E2E：`tests/e2e/` Playwright 覆盖核心旅程，全绿。
- [x] C3. 回填 `ARCHITECTURE.md` 实际目录；提交 + push。

## D. codex 批次（LLM 后端 / 桌面端 / 解析强化）—— 已落代码，本次补记 + 提交

> 来源：用 codex 在工作区做的未提交改动（37 改 +10 新，server+web 双 tsc 通过）。已逐条核对 ARCHITECTURE §7 红线：schema 未改列、路由/WS/签名只增不改、prototype 隔离守住。

- [x] D1. LLM 适配层 `server/llm.ts`：claude-cli + OpenAI-compatible（DeepSeek 默认）双后端；`claude.ts` 退化为 re-export shim（`claudeAvailable` 不变）；`/api/health` 加 `llm` 字段、保留旧 `claude`。
- [x] D2. NCM 可播放解析：`resolvePlayableTrack` + `/api/resolve` 候选打分回退 + songUrl/playable 缓存；`api/client.ts` 加 `resolve()`（additive）。
- [x] D3. TTS 异步化：`dj` 消息先发 `ttsPending:true`、再用新 WS `dj-tts` 补链接（既有 `dj` payload 只多可选字段，前端已配套）。
- [x] D4. 音频 ducking：TTS 播放时音乐降到 0.32 倍（`rampMusicVolume`，独立机制，不改 TTS ticker）。
- [x] D5. Electron 桌面端：`electron/main.cjs` + `server/paths.ts` 路径抽象 + `pack:mac`/`dist:mac` 脚本 + 桌面 E2E（`playwright.desktop.config.ts` / `tests/e2e/desktop.spec.ts`）。
- [x] D6. ✅ **红线③擦边已验（web/StrictMode 实测）**：`<audio>` 挂 DOM 安全。DOM 正好 3 个元素（无重复泄漏）、`createMediaElementSource` 零 `InvalidStateError`、真实 NCM url 出声 currentTime 推进、FocusView 两波形 canvas 逐帧动（analyser 实时产数据）。最坏情况不成立。
- [ ] D7. 文档债：PRD/ARCHITECTURE 尚未把「桌面端 + DeepSeek 后端」纳入正式 scope（ARCHITECTURE 仅补了 llm 一行）。大需求按铁律 §3 应回填 PRD。
- [x] D8. ✅ **桌面端阻断已修复**（验证中发现）：`pnpm desktop` / `e2e:desktop` 启动即崩——内嵌 server `ERR_DLOPEN_FAILED`，better-sqlite3 ABI 不匹配（node 147 vs electron 143）。根因：`prepare:desktop`(`electron-builder install-app-deps`) 默认 `buildFromSource=false`，下的是 node-ABI 预编译产物。**修复**：`package.json` `build` 段加 `"buildDependenciesFromSource": true` → install-app-deps 从源码针对 electron 头编译。验证：`pnpm e2e:desktop` 跑绿（6.8s，server boot + UI + 主题切换 + LLM 可见）。手动启动也确认 server 起、UI 加载、TTS wav 流（206）。
- [x] D10. ✅ **头像区分 user/model**：veko(你)=萨摩耶 `public/veko-avatar.png`，Claudio(模型)=橘猫 `public/claudio-avatar.png`。`CatAvatar` 泛化加 `who:"claudio"|"veko"`（默认 claudio，Profile/Focus/CLAUDIO 消息零改动）；Header 顶部头像→veko、字标仍电台名 Claudio；ChatStream 给 VEKO 消息加右侧萨摩耶头像。实测：header=萨摩耶、VEKO 消息右=萨摩耶、CLAUDIO 消息左=猫。
- [ ] D9. 🟡 follow-up（不阻断）：`tests/e2e/desktop.spec.ts` 的 `waitForHttp` 默认 30s，对 from-source **冷编译后首启**偏紧（第二次跑因此 flaky，warm 重跑即绿）。建议提到 ~60s。另：web↔desktop 切换需各自 rebuild better-sqlite3（`prepare:web-native` 已接进 `e2e`；`pnpm dev` 之后跑过 desktop 要手动 `pnpm rebuild better-sqlite3` 切回 node-ABI）。

## E. 体验打磨（真实用户 + Apple-PM 视角）

- [x] E1. 🔴 **输入法回车 bug**：Composer 的 Enter 处理无 IME 守卫——中文打拼音时按回车选字会**误发半成品消息**。修：`if (e.key === "Enter" && !e.nativeEvent.isComposing)`。src `InputBar.tsx` + 原型 `Composer.tsx` 同步改，placeholder `...`→`…`。tsc 通过。
- [x] E2a. ✅ **单绿对齐**：transport ♥ 点赞从 `text-pink-400` 粉色改 `var(--accent)` 绿——`DESIGN.md` §颜色明确把「♥」列为全站唯一 accent，粉色是文档化违规（原型自身偏离设计法）。src `Player` + 原型 `PlayerBar` 同步。Playwright 实测：点赞后 ♥ = rgb(52,226,155) 绿填充。
- [ ] E2b. 观察（产品决策，待你定）：`FAV`、`Mic` 是死按钮（无 onClick）。Mic=语音输入（未实现）、FAV≈与 Header 的 ♥Library 重复？要么接功能、要么移除/去交互感。不擅自改原型布局。
- [x] E5. 🎨 **accent 单一事实源 + FocusView 状态诚实**：src 里 Toast、FocusView 把硬编码 `#34e29b` 改 `var(--accent)`（accent 改了能跟随；零视觉变化）。FocusView 顶部指示接 `connected`：断线→dim "Off air"、连上→绿 "On air"/"Speaking…"（`...`→`…`）。（FocusView 白卡上的深绿 `#1f9e6e` 是可读性故意为之，保留。）Playwright 实测：On air = rgb(52,226,155)、无破版。
- [x] E3. 🟠 **状态诚实**：PlayerContext 有真实 `connected`(WS open/close)，但两处常驻指示**写死**——ChatStream 顶部恒显 "CONNECTED TO CLAUDIO SERVER"、Clock 恒显绿 "ON AIR"，server 断了也撒谎。接上：连上=原样；断开→ChatStream 脉冲 dim "CONNECTING TO CLAUDIO SERVER…"、Clock dim "OFF AIR"（保持单绿不引入新色）。happy path 文案样式不变无回归。Playwright 双态实测：连上 ON AIR/CONNECTED、断开 OFF AIR/CONNECTING…。
- [x] E4. ♿ **键盘焦点环**：全局缺 `:focus-visible`，键盘用户 Tab 无一致焦点态。加 on-brand 绿环（零特异性 `:where`，排除表单控件以免与 composer 自带环双环）。Playwright 实测：按钮得绿环、输入框保留自带环不双环。仅键盘触发不影响鼠标。light/mobile(390) 截图确认无破版、无横向溢出。
