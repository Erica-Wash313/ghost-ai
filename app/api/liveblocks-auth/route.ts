import { auth, currentUser } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"

import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"
import { getCursorColorForUser, getLiveblocksClient } from "@/lib/liveblocks"

function parseRoomId(body: unknown): string | null {
  if (
    typeof body === "object" &&
    body !== null &&
    "room" in body &&
    typeof (body as { room: unknown }).room === "string"
  ) {
    return (body as { room: string }).room
  }

  return null
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: unknown = await request.json().catch(() => null)
  const projectId = parseRoomId(body)

  if (!projectId) {
    return NextResponse.json({ error: "room is required" }, { status: 400 })
  }

  const identity = await getCurrentIdentity(userId)
  const access = await checkProjectAccess(projectId, identity)

  if (access.status !== "ok") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const liveblocks = getLiveblocksClient()

  await liveblocks.upsertRoom(projectId, {
    update: {
      defaultAccesses: [],
      usersAccesses: { [userId]: ["room:write"] },
    },
  })

  const user = await currentUser()
  const name = user?.fullName ?? user?.username ?? "Anonymous"
  const avatar = user?.imageUrl ?? ""
  const color = getCursorColorForUser(userId)

  const { status, body: sessionBody } = await liveblocks.identifyUser(
    { userId, groupIds: [] },
    { userInfo: { name, avatar, color } },
  )

  return new Response(sessionBody, { status })
}
