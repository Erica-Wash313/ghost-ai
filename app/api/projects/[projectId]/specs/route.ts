import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const identity = await getCurrentIdentity(userId)
  const access = await checkProjectAccess(projectId, identity)

  if (access.status === "not_found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const specs = await prisma.projectSpec.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, filePath: true, createdAt: true },
  })

  return NextResponse.json({
    specs: specs.map((spec) => ({
      id: spec.id,
      filename: spec.filePath.split("/").pop() ?? `${spec.id}.md`,
      createdAt: spec.createdAt,
    })),
  })
}
