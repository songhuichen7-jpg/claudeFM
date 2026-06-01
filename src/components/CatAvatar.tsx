import { clsx } from "clsx"
import type { CSSProperties } from "react"

const AVATARS = {
  claudio: "/claudio-avatar.png", // the AI DJ (model)
  veko: "/veko-avatar.png", // the listener (user)
} as const

/**
 * Round avatar, reused in Header, Focus, Profile, and chat. `who` picks the
 * identity — Claudio (the DJ/model) or veko (the listener/user). Defaults to
 * claudio so the model's call sites stay untouched.
 */
export function CatAvatar({
  size = 28,
  mobileSize,
  className,
  who = "claudio",
}: {
  size?: number
  mobileSize?: number
  className?: string
  who?: keyof typeof AVATARS
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
        src={AVATARS[who]}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
    </div>
  )
}
