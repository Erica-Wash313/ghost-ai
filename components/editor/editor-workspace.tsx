import { forwardRef } from "react"

import { AiSidebar } from "@/components/editor/ai-sidebar"
import type { CanvasHandle } from "@/components/editor/canvas"
import { CanvasRoom } from "@/components/editor/canvas-room"
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave"
import type { Project } from "@/types/project"

interface EditorWorkspaceProps {
  project: Project
  isAiSidebarOpen: boolean
  onCloseAiSidebar: () => void
  onSaveStatusChange?: (status: CanvasSaveStatus) => void
}

export const EditorWorkspace = forwardRef<CanvasHandle, EditorWorkspaceProps>(
  function EditorWorkspace(
    { project, isAiSidebarOpen, onCloseAiSidebar, onSaveStatusChange },
    ref
  ) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <CanvasRoom ref={ref} roomId={project.id} onSaveStatusChange={onSaveStatusChange}>
          <AiSidebar
            isOpen={isAiSidebarOpen}
            onClose={onCloseAiSidebar}
            projectId={project.id}
            roomId={project.id}
          />
        </CanvasRoom>
      </div>
    )
  }
)
