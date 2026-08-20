import { useCallback, useEffect, useRef, useState } from "react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

export type CanvasSaveStatus = "idle" | "saving" | "saved" | "error"

const AUTOSAVE_DEBOUNCE_MS = 1500

interface UseCanvasAutosaveOptions {
  projectId: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  // Saving must not start until the initial load-from-blob attempt (see
  // canvas.tsx) has resolved - otherwise a save could fire first and
  // overwrite the saved canvas with the room's still-empty initial state.
  enabled: boolean
}

export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  enabled,
}: UseCanvasAutosaveOptions): { status: CanvasSaveStatus; save: () => Promise<void> } {
  const [status, setStatus] = useState<CanvasSaveStatus>("idle")
  const isFirstEnabledRun = useRef(true)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])
  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  const save = useCallback(async () => {
    setStatus("saving")
    try {
      const response = await fetch(`/api/projects/${projectId}/canvas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: nodesRef.current, edges: edgesRef.current }),
      })
      if (!response.ok) throw new Error("Save failed")
      setStatus("saved")
    } catch {
      setStatus("error")
    }
  }, [projectId])

  useEffect(() => {
    if (!enabled) return

    if (isFirstEnabledRun.current) {
      isFirstEnabledRun.current = false
      return
    }

    const timeoutId = setTimeout(save, AUTOSAVE_DEBOUNCE_MS)
    return () => clearTimeout(timeoutId)
  }, [enabled, nodes, edges, save])

  return { status, save }
}
