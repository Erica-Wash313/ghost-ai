import { auth } from "@clerk/nextjs/server"
import { get, put } from "@vercel/blob"
import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"
import { NODE_COLORS, NODE_SHAPES, type CanvasEdge, type CanvasNode } from "@/types/canvas"

const MAX_REQUEST_BODY_BYTES = 2 * 1024 * 1024 // 2MB
const MAX_NODES = 2000
const MAX_EDGES = 4000

function isCanvasNode(value: unknown): value is CanvasNode {
  if (typeof value !== "object" || value === null) return false
  const node = value as Record<string, unknown>
  if (typeof node.id !== "string" || node.id.length === 0) return false
  if (node.type !== "canvasNode") return false

  const position = node.position as Record<string, unknown> | undefined
  if (typeof position !== "object" || position === null) return false
  if (typeof position.x !== "number" || typeof position.y !== "number") return false

  const data = node.data as Record<string, unknown> | undefined
  if (typeof data !== "object" || data === null) return false
  if (typeof data.label !== "string") return false
  if (!NODE_COLORS.includes(data.color as (typeof NODE_COLORS)[number])) return false
  if (!NODE_SHAPES.includes(data.shape as (typeof NODE_SHAPES)[number])) return false

  return true
}

function isCanvasEdge(value: unknown): value is CanvasEdge {
  if (typeof value !== "object" || value === null) return false
  const edge = value as Record<string, unknown>
  if (typeof edge.id !== "string" || edge.id.length === 0) return false
  if (edge.type !== "canvasEdge") return false
  if (typeof edge.source !== "string" || typeof edge.target !== "string") return false

  const data = edge.data as Record<string, unknown> | undefined
  if (typeof data !== "object" || data === null) return false
  if (typeof data.label !== "string") return false

  return true
}

function parseCanvasBody(body: unknown): { nodes: CanvasNode[]; edges: CanvasEdge[] } | null {
  if (typeof body !== "object" || body === null) return null
  const { nodes, edges } = body as { nodes?: unknown; edges?: unknown }
  if (!Array.isArray(nodes) || !Array.isArray(edges)) return null
  if (nodes.length > MAX_NODES || edges.length > MAX_EDGES) return null
  if (!nodes.every(isCanvasNode) || !edges.every(isCanvasEdge)) return null
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

  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (contentLength > MAX_REQUEST_BODY_BYTES) {
    return NextResponse.json({ error: "Invalid canvas data" }, { status: 400 })
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
