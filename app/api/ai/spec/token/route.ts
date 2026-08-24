import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"

import { prisma } from "@/lib/prisma"

interface TokenBody {
  runId: string
}

function parseBody(body: unknown): TokenBody | null {
  if (typeof body !== "object" || body === null) return null
  const { runId } = body as Record<string, unknown>
  if (typeof runId !== "string" || runId.length === 0) return null
  return { runId }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: unknown = await request.json().catch(() => null)
  const parsed = parseBody(body)
  if (!parsed) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const taskRun = await prisma.taskRun.findUnique({ where: { runId: parsed.runId } })
  if (!taskRun || taskRun.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const token = await triggerAuth.createPublicToken({
    scopes: { read: { runs: [taskRun.runId] } },
    expirationTime: "1h",
  })

  return NextResponse.json({ token })
}
