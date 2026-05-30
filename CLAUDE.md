# Claudio FM

私人 AI 电台（单听众）。本项目由 SDD 流程管理。**动任何代码前，先读 `docs/` 三件套**：

- `docs/PRD.md` —— MVP 范围、核心用户旅程、绝对不做的黑名单、验收标准
- `docs/DESIGN.md` —— 视觉规范（终端×编辑感 / 单绿 / 等宽）、组件规范、三态
- `docs/ARCHITECTURE.md` —— 技术栈、数据模型、接口契约、**禁止破坏的逻辑**、对齐策略

**设计事实源是 `prototype/`**（独立站 `pnpm dev:prototype` :5174）。真实应用 `src/` 偏离原型时一律以原型为准。

## 开发铁律（任何会话、任何入口都生效）

1. 一次只做一个 task，做完在 `TODO.md` 勾选。
2. 每改一个模块测四态（主流程 / 加载 / 空 / 报错）再 commit：`feat: xxx 通关`。
3. 大需求先改 `docs/PRD.md` + `docs/ARCHITECTURE.md`，再进 `TODO.md`——别绕过文档写代码。
4. 不碰 `docs/ARCHITECTURE.md` §7「禁止破坏的逻辑」：`server/` 契约只增不改、`state.db` schema 不改列、`PlayerContext` 的 audio/WS/analyser/autoplay-ticket 只读复用。
5. 改完代码同步 `TODO.md` / 相关文档——本项目有 Stop hook 会检查。

## 运行

- `pnpm dev` —— 真实 server(:8080) + web(:5173)
- `pnpm dev:prototype` —— 设计原型(:5174)
- `pnpm build` —— `tsc -b && vite build`
- E2E：`tests/e2e/`（Playwright，指向本地 `pnpm dev`）
