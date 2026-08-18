import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"

import { getLiveblocksClient } from "@/lib/liveblocks"
import { prisma } from "@/lib/prisma"
import { authorizeProjectOwner } from "@/lib/project-access"
import { getClerkUsersByEmail } from "@/lib/project-collaborators"

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ projectId: string; collaboratorId: string }> },
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId, collaboratorId } = await params
  const access = await authorizeProjectOwner(projectId, userId)

  if (access.status === "not_found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (access.status === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const collaborator = await prisma.projectCollaborator.findFirst({
    where: { id: collaboratorId, projectId },
  })

  if (!collaborator) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.projectCollaborator.delete({ where: { id: collaborator.id } })

  // Best-effort: the database row is the source of truth for project access
  // and is already gone, so a Clerk/Liveblocks hiccup here shouldn't fail
  // the request. This only revokes a still-live Liveblocks token; a removed
  // collaborator can no longer obtain a new one via /api/liveblocks-auth.
  try {
    const usersByEmail = await getClerkUsersByEmail([collaborator.email])
    const removedUser = usersByEmail.get(collaborator.email.toLowerCase())

    if (removedUser) {
      const liveblocks = getLiveblocksClient()
      await liveblocks.updateRoom(projectId, {
        usersAccesses: { [removedUser.id]: null },
      })
    }
  } catch {
    // Ignore — see comment above.
  }

  return new NextResponse(null, { status: 204 })
}
