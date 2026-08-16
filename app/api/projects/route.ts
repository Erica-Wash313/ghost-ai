import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"

const PROJECT_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

function parseProjectName(body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof (body as { name: unknown }).name === "string" &&
    (body as { name: string }).name.trim().length > 0
  ) {
    return (body as { name: string }).name.trim()
  }

  return "Untitled Project"
}

/**
 * The client precomputes this as the slugified room ID (see 07-wire-editor-home.md)
 * so a project's database ID and its Liveblocks room ID stay aligned. Returns
 * `undefined` when omitted (falls back to the schema default) or `null` when present
 * but invalid.
 */
function parseProjectId(body: unknown): string | null | undefined {
  if (typeof body !== "object" || body === null || !("id" in body)) {
    return undefined
  }

  const raw = (body as { id: unknown }).id
  if (typeof raw !== "string") return null

  const id = raw.trim()
  if (id.length === 0 || id.length > 100 || !PROJECT_ID_PATTERN.test(id)) {
    return null
  }

  return id
}

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ projects })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: unknown = await request.json().catch(() => null)
  const name = parseProjectName(body)
  const id = parseProjectId(body)

  if (id === null) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 })
  }

  try {
    const project = await prisma.project.create({
      data: { ...(id ? { id } : {}), ownerId: userId, name },
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Project id already exists" },
        { status: 409 },
      )
    }

    throw error
  }
}
