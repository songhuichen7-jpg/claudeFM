import { useEffect, useRef } from "react"
import { usePlayer } from "../state/PlayerContext"

function resolveColor(parent: HTMLElement | null, fallback = "#ffffff") {
  if (!parent) return fallback
  const probe = document.createElement("span")
  probe.style.color = "inherit"
  probe.style.position = "absolute"
  probe.style.pointerEvents = "none"
  probe.style.visibility = "hidden"
  parent.appendChild(probe)
  const c = window.getComputedStyle(probe).color
  parent.removeChild(probe)
  const c2 = document.createElement("canvas")
  c2.width = 1
  c2.height = 1
  const ctx2 = c2.getContext("2d")
  if (!ctx2) return c || fallback
  ctx2.fillStyle = c
  ctx2.fillRect(0, 0, 1, 1)
  const px = ctx2.getImageData(0, 0, 1, 1).data
  return `rgba(${px[0]}, ${px[1]}, ${px[2]}, ${(px[3] / 255).toFixed(3)})`
}

type Props = { playing: boolean; bars?: number; height?: number; color?: string }

/**
 * Small waveform — bound to the live audio AnalyserNode when something is
 * actually playing; otherwise falls back to procedural noise so the player
 * never looks dead.
 */
export function Waveform({ playing, bars = 14, height = 18, color }: Props) {
  const { analyserRef } = usePlayer()
  const ref = useRef<HTMLCanvasElement>(null)
  const raf = useRef<number | null>(null)
  const phase = useRef(0)
  const last = useRef(performance.now())
  const cache = useRef<number[]>(new Array(bars).fill(0.3))

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const cssH = height
    const cssW = bars * 4 - 1
    canvas.style.width = cssW + "px"
    canvas.style.height = cssH + "px"
    canvas.width = cssW * dpr
    canvas.height = cssH * dpr
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(dpr, dpr)

    const draw = (t: number) => {
      const dt = (t - last.current) / 1000
      last.current = t
      const a = analyserRef.current
      if (playing) phase.current += dt * 6

      // Pull buckets either from analyser FFT (real audio) or from the
      // procedural noise generator.
      for (let i = 0; i < bars; i++) {
        let target: number
        if (a.isAudio && a.freq) {
          // Pick a freq bin biased toward bass for the leftmost bars
          const slice = Math.floor((i / bars) * (a.freq.length * 0.6))
          target = a.freq[slice] / 255
        } else {
          const f1 = Math.sin(phase.current * 1.7 + i * 0.55)
          const f2 = Math.sin(phase.current * 2.4 + i * 1.1) * 0.5
          const f3 = Math.sin(phase.current * 0.9 + i * 0.3) * 0.3
          target = playing
            ? Math.min(1, Math.max(0.15, 0.45 + (f1 + f2 + f3) * 0.3))
            : 0.18
        }
        cache.current[i] += (target - cache.current[i]) * 0.28
      }

      ctx.clearRect(0, 0, cssW, cssH)
      ctx.fillStyle = color ?? resolveColor(canvas.parentElement)
      const bw = 2
      const gap = 2
      for (let i = 0; i < bars; i++) {
        const h = Math.max(1.5, cache.current[i] * cssH)
        const x = i * (bw + gap)
        const y = (cssH - h) / 2
        ctx.fillRect(x, y, bw, h)
      }
      raf.current = requestAnimationFrame(draw)
    }
    last.current = performance.now()
    raf.current = requestAnimationFrame(draw)
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current)
    }
  }, [analyserRef, bars, height, color, playing])

  return <canvas ref={ref} className="block" />
}

/**
 * Tall waveform used in the focus view. Same logic, more bars across the row.
 */
export function WaveformBig({ playing, color }: { playing: boolean; color?: string }) {
  const { analyserRef } = usePlayer()
  const ref = useRef<HTMLCanvasElement>(null)
  const raf = useRef<number | null>(null)
  const phase = useRef(0)
  const last = useRef(performance.now())
  const N = 64
  const cache = useRef<number[]>(new Array(N).fill(0.3))

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const cssH = 60
    const setSize = (cssW: number) => {
      canvas.width = cssW * dpr
      canvas.height = cssH * dpr
      canvas.style.height = cssH + "px"
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const ro = new ResizeObserver(entries => setSize(entries[0].contentRect.width))
    ro.observe(canvas)
    setSize(canvas.clientWidth || 320)
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const draw = (t: number) => {
      const dt = (t - last.current) / 1000
      last.current = t
      const a = analyserRef.current
      if (playing) phase.current += dt * 4.2

      const cssW = canvas.clientWidth
      ctx.clearRect(0, 0, cssW, cssH)
      ctx.fillStyle = color ?? resolveColor(canvas.parentElement)
      const bw = 3
      const gap = (cssW - bw * N) / (N - 1)
      for (let i = 0; i < N; i++) {
        let target: number
        if (a.isAudio && a.freq) {
          const slice = Math.floor((i / N) * (a.freq.length * 0.85))
          target = a.freq[slice] / 255
        } else {
          const f1 = Math.sin(phase.current * 1.5 + i * 0.21)
          const f2 = Math.sin(phase.current * 2.3 + i * 0.07) * 0.5
          const f3 = Math.cos(phase.current * 0.6 + i * 0.43) * 0.3
          target = playing
            ? Math.min(1, Math.max(0.08, 0.45 + (f1 + f2 + f3) * 0.32))
            : 0.08
        }
        cache.current[i] += (target - cache.current[i]) * 0.26
        const h = Math.max(2, cache.current[i] * cssH)
        const x = i * (bw + gap)
        const y = (cssH - h) / 2
        ctx.fillRect(x, y, bw, h)
      }
      raf.current = requestAnimationFrame(draw)
    }
    last.current = performance.now()
    raf.current = requestAnimationFrame(draw)
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current)
      ro.disconnect()
    }
  }, [analyserRef, color, playing])

  return <canvas ref={ref} className="block w-full" />
}
