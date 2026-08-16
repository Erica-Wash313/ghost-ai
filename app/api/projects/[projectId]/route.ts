import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authorizeProjectOwner } from "@/lib/project-access"

function parseRenameInput(body: unknown): string | null {
  if (
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof (body as { name: unknown }).name === "string" &&
    (body as { name: string }).name.trim().length > 0
  ) {
    return (body as { name: string }).name.trim()
  }

  return null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const access = await authorizeProjectOwner(projectId, userId)

  if (access.status === "not_found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (access.status === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body: unknown = await request.json().catch(() => null)
  const name = parseRenameInput(body)

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { name },
  })

  return NextResponse.json({ project })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const access = await authorizeProjectOwner(projectId, userId)

  if (access.status === "not_found") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (access.status === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.project.delete({ where: { id: projectId } })

  return new NextResponse(null, { status: 204 })
}
