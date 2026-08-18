import { Liveblocks } from "@liveblocks/node"

const globalForLiveblocks = globalThis as unknown as {
  liveblocks: Liveblocks | undefined
}

// Constructed lazily (not at module load) so that importing this module -
// e.g. during Next.js's build-time route analysis - never requires
// LIVEBLOCKS_SECRET_KEY to be present or validly formatted.
export function getLiveblocksClient(): Liveblocks {
  if (!globalForLiveblocks.liveblocks) {
    globalForLiveblocks.liveblocks = new Liveblocks({
      secret: process.env.LIVEBLOCKS_SECRET_KEY!,
    })
  }

  return globalForLiveblocks.liveblocks
}

// Mirrors the vivid --node-*-text values in app/globals.css, which are
// already tuned for contrast against the dark canvas background.
const CURSOR_COLOR_PALETTE = [
  "#52A8FF", // blue
  "#BF7AF0", // purple
  "#FF990A", // orange
  "#FF6166", // red
  "#F75F8F", // pink
  "#62C073", // green
  "#0AC7B4", // teal
] as const

export function getCursorColorForUser(userId: string): string {
  let hash = 0

  for (let index = 0; index < userId.length; index++) {
    hash = (hash * 31 + userId.charCodeAt(index)) | 0
  }

  return CURSOR_COLOR_PALETTE[Math.abs(hash) % CURSOR_COLOR_PALETTE.length]
}
