import cron from "node-cron"
import { runScheduledBroadcast, type DJTurn } from "./router.js"
import { Plays, SchedulerLog } from "./state.js"
import type { Hub } from "./hub.js"

/** Public read-only state of the current mood probe for diagnostics. */
export type MoodReport = {
  ts: number
  hour: number
  signals: {
    skipsLastHour: number
    likesLastHour: number
    playsLastHour: number
    distinctArtistsLastHour: number
  }
  decision: "broadcast" | "stay-quiet"
  reason: string
}

let lastReport: MoodReport | null = null
export function lastMoodReport() {
  return lastReport
}

function computeMood(): { broadcast: boolean; reason: string; signals: MoodReport["signals"] } {
  const s = Plays.signalsLastHour()
  // 安静时段
  const hr = new Date().getHours()
  if (hr < 8 || hr >= 23) {
    return { broadcast: false, reason: `quiet hours (hr=${hr})`, signals: s }
  }
  // 频繁 skip → restless → 主动来一句道歉 + 换流派
  if (s.skipsLastHour >= 3) {
    return { broadcast: true, reason: `restless: skipsLastHour=${s.skipsLastHour}，主动转一个口味`, signals: s }
  }
  // 多次 like 同一时段 → fan moment → 顺势再给一首
  if (s.likesLastHour >= 2) {
    return { broadcast: true, reason: `fan moment: likesLastHour=${s.likesLastHour}，继续延续`, signals: s }
  }
  // 一首都没放（且白天） → 提醒一下还在
  if (s.playsLastHour === 0 && hr >= 8 && hr < 22) {
    return { broadcast: true, reason: `idle: 没在播，给一首低门槛的`, signals: s }
  }
  // 风格太单一 → 换味
  if (s.playsLastHour >= 4 && s.distinctArtistsLastHour <= 1) {
    return { broadcast: true, reason: `monotone: 4+ plays from 1 artist，换味`, signals: s }
  }
  return { broadcast: false, reason: `nothing to do (skips=${s.skipsLastHour} likes=${s.likesLastHour} plays=${s.playsLastHour})`, signals: s }
}

export function startScheduler(hub: Hub) {
  // 07:00 — 日计划
  cron.schedule("0 7 * * *", async () => {
    SchedulerLog.add("daily_plan", "07:00 唤醒")
    const turn = await runScheduledBroadcast(
      "现在是 07:00，给我做一个今天的简短开场，一首钢琴或弦乐，慢慢起。",
    )
    hub.broadcast({ type: "dj", turn })
  })

  // 09:00 — 早间播报
  cron.schedule("0 9 * * *", async () => {
    SchedulerLog.add("morning_broadcast", "09:00 早间")
    const turn = await runScheduledBroadcast(
      "现在是 09:00，给我一首 city pop 或 shibuya-kei，简短开场。",
    )
    hub.broadcast({ type: "dj", turn })
  })

  // 每小时整点 mood probe — 真的决策
  cron.schedule("0 * * * *", async () => {
    const decision = computeMood()
    const report: MoodReport = {
      ts: Date.now(),
      hour: new Date().getHours(),
      signals: decision.signals,
      decision: decision.broadcast ? "broadcast" : "stay-quiet",
      reason: decision.reason,
    }
    lastReport = report
    SchedulerLog.add("mood_probe", JSON.stringify(report))
    if (!decision.broadcast) return
    const turn = await runScheduledBroadcast(
      `每小时情绪检查 (hr=${report.hour})：${decision.reason}。请根据这个信号做出动作。`,
    )
    hub.broadcast({ type: "dj", turn })
  })

  console.log("[scheduler] cron jobs armed: 07:00 daily plan, 09:00 morning, hourly mood probe")
}

export function manualTrigger(
  hub: Hub,
  reason = "手动触发",
  source: DJTurn["source"] = "manual",
): Promise<void> {
  SchedulerLog.add("manual", reason)
  return runScheduledBroadcast(reason, source)
    .then(turn => hub.broadcast({ type: "dj", turn }))
    .catch(err => console.warn("[scheduler] manual trigger failed", (err as Error).message))
}
