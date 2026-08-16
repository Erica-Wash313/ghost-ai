import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"

import { Prisma } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import {
  checkProjectAccess,
  getCurrentIdentity,
  authorizeProjectOwner,
} from "@/lib/project-access"
import {
  getProjectAccessList,
  getProjectCollaborators,
} from "@/lib/project-collaborators"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseEmail(body: unknown): string | null {
  if (
    typeof body !== "object" ||
    body === null ||
    !("email" in body) ||
    typeof (body as { email: unknown }).email !== "string"
  ) {
    return null
  }

  const email = (body as { email: string }).email.trim().toLowerCase()
  return email.length <= 320 && EMAIL_PATTERN.test(email) ? email : null
}

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

  const accessList = await getProjectAccessList(
    projectId,
    access.project.ownerId,
  )
  return NextResponse.json(accessList)
}

export async function POST(
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
  const email = parseEmail(body)

  if (!email) {
    return NextResponse.json(
      { error: "A valid email is required" },
      { status: 400 },
    )
  }

  try {
    await prisma.projectCollaborator.create({
      data: { projectId, email },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This person already has access" },
        { status: 409 },
      )
    }

    throw error
  }

  const collaborators = await getProjectCollaborators(projectId)
  const collaborator = collaborators.find((item) => item.email === email)

  if (!collaborator) {
    throw new Error("Created collaborator could not be loaded")
  }

  return NextResponse.json({ collaborator }, { status: 201 })
}
