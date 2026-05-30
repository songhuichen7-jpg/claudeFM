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
