import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { AccessDenied } from "@/components/editor/access-denied"
import { EditorShell } from "@/components/editor/editor-shell"
import { getProjectForUser, getProjectsForUser } from "@/lib/projects"

interface EditorRoomPageProps {
  params: Promise<{ roomId: string }>
}

export default async function EditorRoomPage({ params }: EditorRoomPageProps) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const { roomId } = await params
  const [{ owned, shared }, access] = await Promise.all([
    getProjectsForUser(userId),
    getProjectForUser(userId, roomId),
  ])

  if (access.status === "not_found") return <AccessDenied />

  return (
    <EditorShell
      ownedProjects={owned}
      sharedProjects={shared}
      activeProject={access.project}
    />
  )
}
