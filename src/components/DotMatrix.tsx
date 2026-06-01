import { useEffect, useRef } from "react"
import { clsx } from "clsx"

type Props = {
  className?: string
  density?: number
  strength?: number
}

export function DotMatrix({ className, density = 18, strength = 1 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const pointer = useRef({ x: -9999, y: -9999, active: 0 })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let raf = 0
    let width = 0
    let height = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height)
      pointer.current.active *= 0.94

      const root = document.documentElement
      const isLight = root.classList.contains("light")
      const base = isLight ? "20, 19, 26" : "255, 255, 255"
      const accent = isLight ? "31, 158, 110" : "52, 226, 155"
      const radius = 132
      const amp = reduceMotion ? 0 : 4.8 * strength

      for (let y = density / 2; y < height; y += density) {
        for (let x = density / 2; x < width; x += density) {
          const dx = x - pointer.current.x
          const dy = y - pointer.current.y
          const dist = Math.hypot(dx, dy)
          const near = Math.max(0, 1 - dist / radius) * pointer.current.active
          const phase = Math.sin(dist * 0.16 - time * 0.006)
          const push = near * phase * amp
          const ux = dist > 0 ? dx / dist : 0
          const uy = dist > 0 ? dy / dist : 0
          const px = x + ux * push
          const py = y + uy * push
          const dot = 0.82 + near * (1.35 + phase * 0.35)
          const alpha = (isLight ? 0.13 : 0.095) + near * 0.24

          ctx.beginPath()
          ctx.fillStyle = near > 0.12
            ? `rgba(${accent}, ${Math.min(0.42, alpha + 0.08)})`
            : `rgba(${base}, ${alpha})`
          ctx.arc(px, py, dot, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      if (!reduceMotion) raf = requestAnimationFrame(draw)
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
      pointer.current = { x, y, active: 1 }
    }

    const onPointerLeave = () => {
      pointer.current.active = Math.min(pointer.current.active, 0.55)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerleave", onPointerLeave)
    raf = requestAnimationFrame(draw)

    return () => {
      observer.disconnect()
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerleave", onPointerLeave)
      cancelAnimationFrame(raf)
    }
  }, [density, strength])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={clsx("pointer-events-none absolute inset-0 h-full w-full", className)}
    />
  )
}
