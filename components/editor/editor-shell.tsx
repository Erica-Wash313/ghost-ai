"use client"

import { useCallback, useRef, useState } from "react"

import type { CanvasHandle } from "@/components/editor/canvas"
import { EditorHome } from "@/components/editor/editor-home"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { EditorWorkspace } from "@/components/editor/editor-workspace"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave"
import { useProjectActions } from "@/hooks/use-project-actions"
import { cn } from "@/lib/utils"
import type { Project } from "@/types/project"

interface EditorShellProps {
  ownedProjects: Project[]
  sharedProjects: Project[]
  activeProject?: Project | null
}

export function EditorShell({
  ownedProjects,
  sharedProjects,
  activeProject = null,
}: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  // Tracks which project a save status belongs to, since switching projects
  // remounts EditorWorkspace (key={activeProject.id}) and its autosave state
  // resets asynchronously - without the id check, a prior project's "Saved"
  // or "Error" could render for the newly active project until the new
  // workspace's own status catches up.
  const [saveState, setSaveState] = useState<{
    projectId: string
    status: CanvasSaveStatus
  } | null>(null)
  const saveStatus: CanvasSaveStatus =
    saveState && saveState.projectId === activeProject?.id ? saveState.status : "idle"
  const canvasRef = useRef<CanvasHandle>(null)

  // Stable across re-renders (only changes when the active project does) -
  // Canvas's own effect depends on this callback's identity, so a fresh
  // function every render would re-fire that effect every render too.
  const activeProjectId = activeProject?.id
  const handleSaveStatusChange = useCallback(
    (status: CanvasSaveStatus) => {
      if (!activeProjectId) return
      setSaveState({ projectId: activeProjectId, status })
    },
    [activeProjectId]
  )

  function handleImportTemplate(template: CanvasTemplate) {
    canvasRef.current?.importTemplate(template)
  }

  const {
    dialog,
    name,
    setName,
    roomId,
    isLoading,
    error,
    openCreate,
    openRename,
    openDelete,
    close,
    submitCreate,
    submitRename,
    submitDelete,
  } = useProjectActions(activeProject?.id)

  return (
    <div className="flex h-screen flex-col">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        projectName={activeProject?.name}
        onShare={activeProject ? () => setIsShareDialogOpen(true) : undefined}
        onOpenTemplates={
          activeProject ? () => setIsTemplatesModalOpen(true) : undefined
        }
        isAiSidebarOpen={isAiSidebarOpen}
        onToggleAiSidebar={
          activeProject ? () => setIsAiSidebarOpen((open) => !open) : undefined
        }
        saveStatus={activeProject ? saveStatus : undefined}
        onSave={activeProject ? () => canvasRef.current?.save() : undefined}
        context={activeProject ? "workspace" : "home"}
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        projects={[...ownedProjects, ...sharedProjects]}
        activeProjectId={activeProject?.id}
        onCreateProject={openCreate}
        onRenameProject={openRename}
        onDeleteProject={openDelete}
      />
      <main
        className={cn(
          "flex flex-1 overflow-hidden transition-[margin-left] duration-200 ease-in-out",
          isSidebarOpen && "md:ml-72"
        )}
      >
        {activeProject ? (
          <EditorWorkspace
            key={activeProject.id}
            ref={canvasRef}
            project={activeProject}
            isAiSidebarOpen={isAiSidebarOpen}
            onCloseAiSidebar={() => setIsAiSidebarOpen(false)}
            onSaveStatusChange={handleSaveStatusChange}
          />
        ) : (
          <EditorHome onCreateProject={openCreate} />
        )}
      </main>
      <ProjectDialogs
        dialog={dialog}
        name={name}
        setName={setName}
        roomId={roomId}
        isLoading={isLoading}
        error={error}
        close={close}
        submitCreate={submitCreate}
        submitRename={submitRename}
        submitDelete={submitDelete}
      />
      {activeProject ? (
        <ShareDialog
          key={activeProject.id}
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          project={activeProject}
        />
      ) : null}
      {activeProject ? (
        <StarterTemplatesModal
          open={isTemplatesModalOpen}
          onOpenChange={setIsTemplatesModalOpen}
          onImport={handleImportTemplate}
        />
      ) : null}
    </div>
  )
}
