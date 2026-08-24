"use client"

import type { CursorsCursorProps } from "@liveblocks/react-flow"
import { useOther } from "@liveblocks/react"
import { Cursor } from "@liveblocks/react-ui"
import { Loader2 } from "lucide-react"

// The library's default cursor label resolves names via `useUser()`, which
// needs a `resolveUsers` callback we don't configure — this app already puts
// name/color directly on each connection's presence `info` at auth time
// (see app/api/liveblocks-auth/route.ts), so read it straight from there.
export function PresenceCursor({ connectionId }: CursorsCursorProps) {
  const info = useOther(connectionId, (other) => other.info)
  const thinking = useOther(connectionId, (other) => other.presence.thinking)

  if (!info?.name) {
    return <Cursor color={info?.color} />
  }

  return (
    <Cursor
      color={info.color}
      label={
        <span className="inline-flex items-center gap-1">
          {info.name}
          {thinking && <Loader2 className="size-3 animate-spin" aria-label="Thinking" />}
        </span>
      }
    />
  )
}
