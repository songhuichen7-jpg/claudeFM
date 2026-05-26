import { useEffect, useState } from "react"

/**
 * Tailwind-style breakpoint matcher. Returns true while the viewport is
 * narrower than `maxPx`. SSR-safe (assumes desktop until mounted).
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return defaultValue
    return window.matchMedia(query).matches
  })
  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia(query)
    const h = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener("change", h)
    return () => mql.removeEventListener("change", h)
  }, [query])
  return matches
}

/** Below Tailwind's lg breakpoint (< 1024px). */
export function useIsCompact(): boolean {
  return useMediaQuery("(max-width: 1023px)", false)
}
