import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { runs, tasks } from "@trigger.dev/sdk"

import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import type { designAgentTask } from "@/trigger/design-agent"

interface TriggerDesignBody {
  prompt: string
  projectId: string
  requestId: string
}

function parseBody(body: unknown): TriggerDesignBody | null {
  if (typeof body !== "object" || body === null) return null
  const { prompt, projectId, requestId } = body as Record<string, unknown>

  if (typeof prompt !== "string" || prompt.trim().length === 0) return null
  if (typeof projectId !== "string" || projectId.length === 0) return null
  if (typeof requestId !== "string" || requestId.length === 0) return null

  return { prompt, projectId, requestId }
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

  const identity = await getCurrentIdentity(userId)
  const access = await checkProjectAccess(parsed.projectId, identity)
  if (access.status !== "ok") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const handle = await tasks.trigger<typeof designAgentTask>(
    "design-agent",
    {
      prompt: parsed.prompt,
      roomId: parsed.projectId,
    },
    { idempotencyKey: parsed.requestId }
  )

  try {
    await prisma.taskRun.create({
      data: {
        runId: handle.id,
        projectId: parsed.projectId,
        userId,
      },
    })
  } catch (error) {
    await runs.cancel(handle.id).catch(() => {})
    throw error
  }

  return NextResponse.json({ runId: handle.id })
}
