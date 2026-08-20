"use client"

import { forwardRef } from "react"
import { ClientSideSuspense, LiveblocksProvider, RoomProvider } from "@liveblocks/react"
import { ErrorBoundary } from "react-error-boundary"

import { Canvas, type CanvasHandle } from "@/components/editor/canvas"
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave"

interface CanvasRoomProps {
  roomId: string
  onSaveStatusChange?: (status: CanvasSaveStatus) => void
}

export const CanvasRoom = forwardRef<CanvasHandle, CanvasRoomProps>(function CanvasRoom(
  { roomId, onSaveStatusChange },
  ref
) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={roomId} initialPresence={{ cursor: null, thinking: false }}>
        <ErrorBoundary fallback={<CanvasConnectionError />}>
          <ClientSideSuspense fallback={<CanvasLoading />}>
            <Canvas ref={ref} onSaveStatusChange={onSaveStatusChange} />
          </ClientSideSuspense>
        </ErrorBoundary>
      </RoomProvider>
    </LiveblocksProvider>
  )
})

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
