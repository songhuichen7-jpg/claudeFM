import { clsx } from "clsx"

/**
 * Pixel-art tabby cat avatar — used in Header (small) and ProfileCard (big).
 * Constructed from <rect> pixels so it scales crisply at any size via SVG.
 */
export function CatAvatar({
  size = 28,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <div
      className={clsx("relative shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 16 16" className="absolute inset-0 h-full w-full" shapeRendering="crispEdges">
        {/* background */}
        <rect width="16" height="16" fill="#1d141d" />
        {/* sky gradient feel */}
        <rect x="0" y="0" width="16" height="6" fill="#2a1d2c" />
        <rect x="0" y="6" width="16" height="4" fill="#3a2738" />
        {/* ears */}
        <rect x="3" y="3" width="2" height="2" fill="#d99b62" />
        <rect x="11" y="3" width="2" height="2" fill="#d99b62" />
        <rect x="4" y="3" width="1" height="1" fill="#7a4c2a" />
        <rect x="11" y="3" width="1" height="1" fill="#7a4c2a" />
        {/* head */}
        <rect x="3" y="5" width="10" height="6" fill="#e6a86a" />
        <rect x="3" y="11" width="10" height="2" fill="#d99b62" />
        {/* stripes */}
        <rect x="5" y="5" width="1" height="2" fill="#b87f47" />
        <rect x="8" y="5" width="1" height="2" fill="#b87f47" />
        <rect x="10" y="5" width="1" height="2" fill="#b87f47" />
        {/* eyes */}
        <rect x="5" y="8" width="2" height="2" fill="#1d141d" />
        <rect x="9" y="8" width="2" height="2" fill="#1d141d" />
        <rect x="6" y="8" width="1" height="1" fill="#7ad7c8" />
        <rect x="10" y="8" width="1" height="1" fill="#7ad7c8" />
        {/* nose */}
        <rect x="7" y="10" width="2" height="1" fill="#ad5d4a" />
        {/* mouth */}
        <rect x="6" y="11" width="1" height="1" fill="#7a4c2a" />
        <rect x="9" y="11" width="1" height="1" fill="#7a4c2a" />
        {/* body hint */}
        <rect x="3" y="13" width="10" height="3" fill="#3a2738" />
      </svg>
    </div>
  )
}
