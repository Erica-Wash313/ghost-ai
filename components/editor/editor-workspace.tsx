import type { Project } from "@/types/project"

interface EditorWorkspaceProps {
  project: Project
}

export function EditorWorkspace({ project }: EditorWorkspaceProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center">
      <h1 className="text-lg font-medium text-copy-primary">{project.name}</h1>
      <p className="text-sm text-copy-muted">Canvas workspace coming soon.</p>
    </div>
  )
}
