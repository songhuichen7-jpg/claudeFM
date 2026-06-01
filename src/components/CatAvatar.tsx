import { clsx } from "clsx"
import type { CSSProperties } from "react"

/**
 * Claudio's video-reference avatar, reused in Header, Focus, Profile, and chat.
 */
export function CatAvatar({
  size = 28,
  mobileSize,
  className,
}: {
  size?: number
  mobileSize?: number
  className?: string
}) {
  return (
    <div
      className={clsx(
        "relative h-[var(--avatar-size)] w-[var(--avatar-size)] shrink-0 overflow-hidden rounded-full max-sm:h-[var(--avatar-mobile-size)] max-sm:w-[var(--avatar-mobile-size)]",
        className,
      )}
      style={{
        "--avatar-size": `${size}px`,
        "--avatar-mobile-size": `${mobileSize ?? size}px`,
      } as CSSProperties}
    >
      <img
        src="/claudio-avatar.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
    </div>
  )
}
