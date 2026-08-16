"use client"

import { useState } from "react"

import { MOCK_PROJECTS } from "@/lib/mock-projects"
import { slugify } from "@/lib/utils"
import type { Project } from "@/types/project"

type DialogState =
  | { type: "create" }
  | { type: "rename"; project: Project }
  | { type: "delete"; project: Project }
  | null

const MOCK_DELAY_MS = 400

export function useProjectDialogs() {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const slug = slugify(name)

  function openCreate() {
    if (isLoading) return
    setName("")
    setDialog({ type: "create" })
  }

  function openRename(project: Project) {
    if (isLoading) return
    setName(project.name)
    setDialog({ type: "rename", project })
  }

  function openDelete(project: Project) {
    if (isLoading) return
    setDialog({ type: "delete", project })
  }

  function close() {
    setDialog(null)
    setName("")
  }

  async function submitCreate() {
    const trimmedName = name.trim()
    if (!trimmedName) return

    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))
    setProjects((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: trimmedName,
        slug: slugify(trimmedName),
        isOwner: true,
      },
    ])
    setIsLoading(false)
    close()
  }

  async function submitRename() {
    if (dialog?.type !== "rename") return
    const trimmedName = name.trim()
    if (!trimmedName) return

    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))
    setProjects((prev) =>
      prev.map((project) =>
        project.id === dialog.project.id
          ? { ...project, name: trimmedName, slug: slugify(trimmedName) }
          : project
      )
    )
    setIsLoading(false)
    close()
  }

  async function submitDelete() {
    if (dialog?.type !== "delete") return

    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))
    setProjects((prev) =>
      prev.filter((project) => project.id !== dialog.project.id)
    )
    setIsLoading(false)
    close()
  }

  return {
    projects,
    dialog,
    name,
    setName,
    slug,
    isLoading,
    openCreate,
    openRename,
    openDelete,
    close,
    submitCreate,
    submitRename,
    submitDelete,
  }
}

export type UseProjectDialogsReturn = ReturnType<typeof useProjectDialogs>
