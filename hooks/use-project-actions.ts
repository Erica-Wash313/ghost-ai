"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { generateShortSuffix, slugify } from "@/lib/utils"
import type { Project } from "@/types/project"

type DialogState =
  | { type: "create" }
  | { type: "rename"; project: Project }
  | { type: "delete"; project: Project }
  | null

export function useProjectActions(activeProjectId?: string) {
  const router = useRouter()

  const [dialog, setDialog] = useState<DialogState>(null)
  const [name, setName] = useState("")
  const [suffix, setSuffix] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roomId = `${slugify(name) || "project"}-${suffix}`

  function openCreate() {
    if (isLoading) return
    setName("")
    setSuffix(generateShortSuffix())
    setError(null)
    setDialog({ type: "create" })
  }

  function openRename(project: Project) {
    if (isLoading) return
    setName(project.name)
    setError(null)
    setDialog({ type: "rename", project })
  }

  function openDelete(project: Project) {
    if (isLoading) return
    setError(null)
    setDialog({ type: "delete", project })
  }

  function close() {
    if (isLoading) return
    setDialog(null)
    setName("")
    setError(null)
  }

  async function submitCreate() {
    const trimmedName = name.trim()
    if (!trimmedName) return

    setIsLoading(true)
    setError(null)

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedName, id: roomId }),
    })

    if (!response.ok) {
      setError("Couldn't create the project. Try again.")
      setIsLoading(false)
      return
    }

    const { project } = (await response.json()) as { project: { id: string } }
    setDialog(null)
    setName("")
    setIsLoading(false)
    router.push(`/editor/${project.id}`)
  }

  async function submitRename() {
    if (dialog?.type !== "rename") return
    const trimmedName = name.trim()
    if (!trimmedName) return

    setIsLoading(true)
    setError(null)

    const response = await fetch(`/api/projects/${dialog.project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmedName }),
    })

    setIsLoading(false)

    if (!response.ok) {
      setError("Couldn't rename the project. Try again.")
      return
    }

    setDialog(null)
    setName("")
    router.refresh()
  }

  async function submitDelete() {
    if (dialog?.type !== "delete") return

    setIsLoading(true)
    setError(null)

    const response = await fetch(`/api/projects/${dialog.project.id}`, {
      method: "DELETE",
    })

    setIsLoading(false)

    if (!response.ok) {
      setError("Couldn't delete the project. Try again.")
      return
    }

    const wasActive = dialog.project.id === activeProjectId
    setDialog(null)

    if (wasActive) {
      router.push("/editor")
    } else {
      router.refresh()
    }
  }

  return {
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
  }
}

export type UseProjectActionsReturn = ReturnType<typeof useProjectActions>
