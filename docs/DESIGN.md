# Claudio FM — DESIGN

> 唯一事实源是 `prototype/`。本文件是它的提炼。真实 `src/` 偏离原型时，**以 `prototype/` 为准**。
> 气质一句话：**终端 × 编辑感**（terminal × editorial）—— 克制、留白、像一个有品味的工程师做的，不是"AI 生成的好看东西"。

## 1. 设计 token

- **底色**：近黑 `#060607`（dark）/ 米白 `#f4f1ea`（light，paper-grain）。无渐变光斑、无 glow 滥用。
- **单一强调色**：静音春绿 `--accent: #34e29b`（`--accent-soft: rgba(52,226,155,0.14)`）。**全站只有这一个 accent**——live dot、ON AIR、EQ、active 高亮、♥、发送键、进度条。
- **字体**：
  - 主体 = **等宽** `--font-mono`（JetBrains Mono）。这是产品的"声音"。
  - 像素字 `--font-pixel`（Doto）**只**用于 "Claudio" 字标 + 大时钟 + Library/Settings 标题里的少量大字。
  - **系统无衬线** `--font-sans`（Inter）**只**用于 Focus 白卡的大歌名（bold）+ 转录正文。
- **边框**：发丝级 `border-white/8`～`/12`（light: `black/8`～`/12`）。方盒子 + 圆角 `rounded-md/lg/xl`。
- **纹理**：精细工程点阵 `.dot-matrix`（18px 网格，极低透明度），只出现在面板内（时钟、Profile）。
- **设备框辉光**：`.shell-glow` —— 发丝顶高光 + 一层极淡冷光 + 一点点 accent 呼吸 + 投影。**不是紫色 AI glow**。

## 2. 布局（单列）

居中"设备框"：`max-w-[680px]`，桌面 `sm:` 有圆角 + 发丝边 + `.shell-glow`；移动全屏铺满。
列结构（上→下）：
`Header` → 滚动区(`ClockPanel` + `PlayerBar` + `ChatLive`) → `Composer` → `Footer`。
Focus / Settings / Library / ProfileCard / Toast 是覆盖层。

## 3. 组件规范（对齐 `prototype/src/components`）

| 组件 | 关键点 |
|---|---|
| `Header` | 像素字标 + `♥ N`(Library) + 齿轮(Settings) + DARK/LIGHT 段控 |
| `ClockPanel` | 点阵 + 像素大钟 + 星期/日期 + ●ON AIR；整块可点进 Focus |
| `PlayerBar` | EQ 字形(播放时动) + 曲目/状态 + prev/play/next/stop/♥ + HIDE/FAV/VOL + 发丝进度 + `QUEUE · N TRACKS` |
| `ChatLive` | `●Claudio … LIVE` 头 + `CONNECTED TO CLAUDIO SERVER`；用户气泡右对齐 `VEKO·时间`；DJ 段发丝盒 + 逐字高亮 + ▸曲目卡(▸播放 / ♡♥) + `时间 ▸REPLAY` |
| `Composer` | 发丝输入「Say something to the DJ...」+ mic + 发送；聚焦 accent 描边；发送键 accent 实底 |
| `FocusView` | 白卡 over 星空(Atmosphere：低透明径向 + 星点)；暗顶(字标+●SPEAKING…+波形) → 白底(粗 sans 大歌名 + 进度 + 转录，active 词 `#1f9e6e`) |
| `LibraryView` | `Library ♥ N SAVED`；喜欢曲目行(序号/▸/标题·歌手/era/NOW/♥)；空态 ♡ + 文案 |
| `SettingsView` | 段：语料档·CORPUS / 服务器状态·STATUS(单绿点) / 今日编排·SCHEDULE / 网易云账号·NCM / 品味语料 |
| `ProfileCard` | 像素 Claudio + ●一开机我就打碟 + 三句 slogan + 24/7·∞·1 + 流派标签 |
| `Toast` | 底部居中胶囊「记进了你的品味 / 曲目·歌手」，accent 边，~2.8s 自动消失 |

## 4. 三态（错误 / 加载 / 空）

- **加载中**：health/messages 未到 → 顶栏连接点灰、footer `OFFLINE`；聊天区只显示 `CONNECTED TO CLAUDIO SERVER`。
- **空数据**：Library 无喜欢 → 居中 ♡ + 「还没 ♥ 过任何歌 / Claudio 会从这里学你的口味」。Schedule 无 plan → 「今天还没编排」。
- **报错**：chat/trigger 失败 → 聊天流插一条 system 行说明（沿用 `PlayerContext.addSystemMessage`）；TTS 静音/连不上不阻塞 UI。

## 5. 动效

- live dot：1.6s 呼吸（仅透明度，无 halo）。
- EQ 字形：播放时 4 条柱 `eq` 关键帧。
- 逐字高亮：`.word.active`(accent) / `.word.past`(dim)，160ms。
- 波形：canvas（真实 analyser 驱动；无音频时程序化噪声）。
- toast：220ms 上浮淡入。
- **不要**：黑胶旋转、mood 渐变、大面积 glow/blur。
