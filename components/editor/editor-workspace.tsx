import { Bot, Compass, Sparkles } from "lucide-react"

import type { Project } from "@/types/project"

interface EditorWorkspaceProps {
  project: Project
  isAiSidebarOpen: boolean
}

export function EditorWorkspace({ project, isAiSidebarOpen }: EditorWorkspaceProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-base">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--border-default) 1px, transparent 1px), linear-gradient(to bottom, var(--border-default) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 0%, transparent 70%)",
            opacity: 0.4,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 50% 35%, var(--accent-primary) 0%, transparent 60%)",
            opacity: 0.08,
          }}
        />

        <div className="relative flex max-w-md flex-col items-center gap-3 px-6 text-center">
          <div className="mb-1 flex size-14 items-center justify-center rounded-2xl border border-brand/30 bg-accent-dim text-brand">
            <Compass className="size-6" />
          </div>
          <p className="text-xs font-medium tracking-widest text-copy-faint uppercase">
            Workspace shell
          </p>
          <h1 className="text-2xl font-semibold text-copy-primary">
            Canvas and collaboration tooling land here next.
          </h1>
          <p className="text-sm text-copy-muted">
            This room is ready for the shared architecture canvas, durable AI
            workflows, and real-time presence. For now, the shell is wired with
            project context and navigation only.
          </p>
        </div>
      </div>

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
