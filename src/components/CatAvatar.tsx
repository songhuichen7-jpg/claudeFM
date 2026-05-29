import { clsx } from "clsx"

/**
 * High-fidelity tabby cat avatar — radial-gradient fur, smooth ears, round
 * eyes with pupils + catchlights, pink nose, whiskers. Renders inline as
 * SVG so it scales crisply at any avatar size from Header (26px) to
 * ProfileCard (70px) without rasterising a bitmap.
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
      <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="catBg" cx="50%" cy="38%" r="68%">
            <stop offset="0%" stopColor="#3a2c20" />
            <stop offset="100%" stopColor="#181014" />
          </radialGradient>
          <radialGradient id="furBody" cx="50%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#f3c188" />
            <stop offset="55%" stopColor="#d28f4c" />
            <stop offset="100%" stopColor="#7e4a22" />
          </radialGradient>
          <radialGradient id="cheek" cx="50%" cy="60%" r="40%">
            <stop offset="0%" stopColor="#fbe0bc" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fbe0bc" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="eye" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#b6f5b5" />
            <stop offset="55%" stopColor="#5dba5b" />
            <stop offset="100%" stopColor="#1f4f1f" />
          </radialGradient>
          <linearGradient id="earInner" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f6b6a3" />
            <stop offset="100%" stopColor="#a96649" />
          </linearGradient>
        </defs>

        {/* dark backdrop */}
        <rect width="64" height="64" fill="url(#catBg)" />

        {/* ears (outer) */}
        <path d="M14 22 L20 8 L28 22 Z" fill="url(#furBody)" />
        <path d="M50 22 L44 8 L36 22 Z" fill="url(#furBody)" />
        {/* ears (inner) */}
        <path d="M18 19 L20.5 12 L24 19 Z" fill="url(#earInner)" />
        <path d="M46 19 L43.5 12 L40 19 Z" fill="url(#earInner)" />

        {/* head */}
        <ellipse cx="32" cy="34" rx="20" ry="18" fill="url(#furBody)" />

        {/* tabby stripes — top of head */}
        <path d="M24 16 q2 6 0 12" stroke="#5b3418" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M32 14 q0 6 0 14" stroke="#5b3418" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M40 16 q-2 6 0 12" stroke="#5b3418" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.7" />

        {/* cheek light bloom */}
        <ellipse cx="20" cy="40" rx="7" ry="5" fill="url(#cheek)" />
        <ellipse cx="44" cy="40" rx="7" ry="5" fill="url(#cheek)" />

        {/* eyes — sclera + iris + slit pupil + catchlight */}
        <ellipse cx="24" cy="32" rx="4.6" ry="5" fill="url(#eye)" />
        <ellipse cx="40" cy="32" rx="4.6" ry="5" fill="url(#eye)" />
        <ellipse cx="24" cy="32" rx="1.1" ry="4.2" fill="#0a0a0a" />
        <ellipse cx="40" cy="32" rx="1.1" ry="4.2" fill="#0a0a0a" />
        <circle cx="22.6" cy="30.4" r="0.9" fill="#ffffff" />
        <circle cx="38.6" cy="30.4" r="0.9" fill="#ffffff" />

        {/* nose */}
        <path d="M30 39 L34 39 L32 42 Z" fill="#d4727a" />

        {/* mouth */}
        <path d="M32 42 Q30 45 28 44" stroke="#3a1d12" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        <path d="M32 42 Q34 45 36 44" stroke="#3a1d12" strokeWidth="1.3" strokeLinecap="round" fill="none" />

        {/* whiskers */}
        <g stroke="#f8e7c8" strokeWidth="0.7" strokeLinecap="round" opacity="0.85">
          <path d="M20 41 L9 39" />
          <path d="M20 43 L9 44" />
          <path d="M44 41 L55 39" />
          <path d="M44 43 L55 44" />
        </g>

        {/* chin highlight */}
        <ellipse cx="32" cy="46" rx="4.5" ry="2" fill="#fbe0bc" opacity="0.45" />
      </svg>
    </div>
  )
}
