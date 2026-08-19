"use client"

import { useEffect } from "react"
import type { ReactFlowInstance } from "@xyflow/react"

const ZOOM_DURATION = 200

interface UseKeyboardShortcutsOptions {
  reactFlowInstance: ReactFlowInstance
  undo: () => void
  redo: () => void
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

export function useKeyboardShortcuts({ reactFlowInstance, undo, redo }: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return

      const isModifierPressed = event.metaKey || event.ctrlKey

      if (isModifierPressed && event.key.toLowerCase() === "z") {
        event.preventDefault()
        if (event.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      if (isModifierPressed && event.key.toLowerCase() === "y") {
        event.preventDefault()
        redo()
        return
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault()
        reactFlowInstance.zoomIn({ duration: ZOOM_DURATION })
        return
      }

      if (event.key === "-") {
        event.preventDefault()
        reactFlowInstance.zoomOut({ duration: ZOOM_DURATION })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [reactFlowInstance, undo, redo])
}
