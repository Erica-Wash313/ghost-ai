"use client"

import { useState } from "react"

import { EditorHome } from "@/components/editor/editor-home"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { EditorWorkspace } from "@/components/editor/editor-workspace"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { useProjectActions } from "@/hooks/use-project-actions"
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
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        projects={[...ownedProjects, ...sharedProjects]}
        onCreateProject={openCreate}
        onRenameProject={openRename}
        onDeleteProject={openDelete}
      />
      <main className="flex flex-1">
        {activeProject ? (
          <EditorWorkspace project={activeProject} />
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
    </div>
  )
}
