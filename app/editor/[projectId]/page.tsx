import { auth } from "@clerk/nextjs/server"
import { notFound, redirect } from "next/navigation"

import { EditorShell } from "@/components/editor/editor-shell"
import { getProjectForUser, getProjectsForUser } from "@/lib/projects"

interface EditorProjectPageProps {
  params: Promise<{ projectId: string }>
}

export default async function EditorProjectPage({
  params,
}: EditorProjectPageProps) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const { projectId } = await params
  const [{ owned, shared }, access] = await Promise.all([
    getProjectsForUser(userId),
    getProjectForUser(userId, projectId),
  ])

  if (access.status === "not_found") notFound()

  return (
    <EditorShell
      ownedProjects={owned}
      sharedProjects={shared}
      activeProject={access.project}
    />
  )
}
