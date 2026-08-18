"use client"

import { ClientSideSuspense, LiveblocksProvider, RoomProvider } from "@liveblocks/react"
import { ErrorBoundary } from "react-error-boundary"

import { Canvas } from "@/components/editor/canvas"

interface CanvasRoomProps {
  roomId: string
}

export function CanvasRoom({ roomId }: CanvasRoomProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={roomId} initialPresence={{ cursor: null, isThinking: false }}>
        <ErrorBoundary fallback={<CanvasConnectionError />}>
          <ClientSideSuspense fallback={<CanvasLoading />}>
            <Canvas />
          </ClientSideSuspense>
        </ErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
}

function CanvasLoading() {
  return (
    <div className="flex flex-1 items-center justify-center bg-base">
      <p className="text-sm text-copy-muted">Connecting to canvas…</p>
    </div>
  )
}

function CanvasConnectionError() {
  return (
    <div className="flex flex-1 items-center justify-center bg-base">
      <p className="text-sm text-copy-muted">
        Couldn&apos;t connect to the canvas. Try refreshing the page.
      </p>
    </div>
  )
}
