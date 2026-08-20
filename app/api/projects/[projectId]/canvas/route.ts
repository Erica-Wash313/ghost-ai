import { auth } from "@clerk/nextjs/server"
import { get, put } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"

function parseCanvasBody(body: unknown): { nodes: unknown[]; edges: unknown[] } | null {
  if (typeof body !== "object" || body === null) return null
  const { nodes, edges } = body as { nodes?: unknown; edges?: unknown }
  if (!Array.isArray(nodes) || !Array.isArray(edges)) return null
  return { nodes, edges }
}

export async function PUT(
  request: NextRequest,
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

  const body: unknown = await request.json().catch(() => null)
  const canvas = parseCanvasBody(body)

  if (!canvas) {
    return NextResponse.json({ error: "Invalid canvas data" }, { status: 400 })
  }

  // Private, not public: architecture.md requires canvas artifacts stay
  // inaccessible without going through an authenticated, membership-checked
  // route - a public blob would be readable by anyone who learned the URL.
  const blob = await put(`canvas/${projectId}.json`, JSON.stringify(canvas), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  })

  await prisma.project.update({
    where: { id: projectId },
    data: { canvasJsonPath: blob.url },
  })

  return NextResponse.json({ url: blob.url })
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

  if (!access.project.canvasJsonPath) {
    return NextResponse.json({ nodes: [], edges: [] })
  }

  const blobResult = await get(access.project.canvasJsonPath, {
    access: "private",
    useCache: false,
  })
  if (!blobResult || blobResult.statusCode !== 200) {
    return NextResponse.json({ nodes: [], edges: [] })
  }

  const canvas: unknown = await new Response(blobResult.stream)
    .json()
    .catch(() => null)
  const parsed = parseCanvasBody(canvas)

  return NextResponse.json(parsed ?? { nodes: [], edges: [] })
}
