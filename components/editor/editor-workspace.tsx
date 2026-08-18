import { Bot, Sparkles } from "lucide-react"

import { CanvasRoom } from "@/components/editor/canvas-room"
import type { Project } from "@/types/project"

interface EditorWorkspaceProps {
  project: Project
  isAiSidebarOpen: boolean
}

export function EditorWorkspace({ project, isAiSidebarOpen }: EditorWorkspaceProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <CanvasRoom roomId={project.id} />

      {isAiSidebarOpen && (
        <aside
          aria-label={`AI sidebar for ${project.name}`}
          className="flex w-80 shrink-0 flex-col gap-4 border-l border-surface-border bg-surface p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-copy-primary">
                AI Copilot
              </span>
              <span className="text-xs text-copy-muted">Placeholder panel</span>
            </div>
            <Sparkles className="size-4 text-ai-text" />
          </div>

          <div className="flex gap-3 rounded-2xl border border-surface-border bg-elevated p-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ai/20 text-ai-text">
              <Bot className="size-4" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-copy-primary">
                Chat surface pending
              </p>
              <p className="text-xs text-copy-muted">
                The toggle is wired. Messaging and generation are intentionally
                out of scope here.
              </p>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-2 rounded-2xl border border-surface-border-subtle p-4">
            <p className="text-xs font-medium tracking-widest text-copy-faint uppercase">
              Future hooks
            </p>
            <p className="text-xs text-copy-muted">
              Prompt composer, run status, and architecture guidance will attach
              to this sidebar.
            </p>
          </div>
        </aside>
      )}
    </div>
  )
}
