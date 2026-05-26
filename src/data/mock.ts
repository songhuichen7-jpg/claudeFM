// Mock data was used during the initial pixel-perfect UI build. The real
// runtime now sources everything from the Fastify server (see src/api/client.ts
// and src/state/PlayerContext.tsx). We keep this file as an empty surface so
// existing imports don't break during refactors.
import type { ChatMessage, Track } from "./types"

export const tracks: Track[] = []
export const initialMessages: ChatMessage[] = []
export const initialTrack: Track | null = null
