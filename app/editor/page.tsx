import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { EditorShell } from "@/components/editor/editor-shell"
import { getProjectsForUser } from "@/lib/projects"

export default async function EditorPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const { owned, shared } = await getProjectsForUser(userId)

  return <EditorShell ownedProjects={owned} sharedProjects={shared} />
}
