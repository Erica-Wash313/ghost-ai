import { auth } from "@clerk/nextjs/server"
import { get } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; specId: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId, specId } = await params
  const identity = await getCurrentIdentity(userId)
  const access = await checkProjectAccess(projectId, identity)

  if (access.status === "not_found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const spec = await prisma.projectSpec.findUnique({ where: { id: specId } })
  if (!spec || spec.projectId !== projectId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const blobResult = await get(spec.filePath, { access: "private", useCache: false })
  if (!blobResult || blobResult.statusCode !== 200) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return new NextResponse(blobResult.stream, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${specId}.md"`,
    },
  })
}
