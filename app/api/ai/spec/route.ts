import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { runs, tasks } from "@trigger.dev/sdk"
import { z } from "zod"

import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import { NODE_COLORS, NODE_SHAPES } from "@/types/canvas"
import {
  aiChatFeedMessageSchema,
  MAX_SPEC_CHAT_MESSAGE_LENGTH,
  MAX_SPEC_CHAT_MESSAGES,
  MAX_SPEC_EDGES,
  MAX_SPEC_LABEL_LENGTH,
  MAX_SPEC_NODES,
} from "@/types/tasks"
import type { generateSpecTask } from "@/trigger/generate-spec"

const specNodeSchema = z.object({
  id: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }),
  width: z.number().optional(),
  height: z.number().optional(),
  data: z.object({
    label: z.string().max(MAX_SPEC_LABEL_LENGTH),
    color: z.enum(NODE_COLORS),
    shape: z.enum(NODE_SHAPES),
  }),
})

const specEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  data: z.object({ label: z.string().max(MAX_SPEC_LABEL_LENGTH) }),
})

const specChatMessageSchema = aiChatFeedMessageSchema.extend({
  content: z.string().min(1).max(MAX_SPEC_CHAT_MESSAGE_LENGTH),
})

const triggerSpecBodySchema = z.object({
  roomId: z.string().min(1),
  chatHistory: z.array(specChatMessageSchema).max(MAX_SPEC_CHAT_MESSAGES),
  nodes: z.array(specNodeSchema).max(MAX_SPEC_NODES),
  edges: z.array(specEdgeSchema).max(MAX_SPEC_EDGES),
})

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: unknown = await request.json().catch(() => null)
  const parsed = triggerSpecBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { roomId, chatHistory, nodes, edges } = parsed.data

  const identity = await getCurrentIdentity(userId)
  const access = await checkProjectAccess(roomId, identity)
  if (access.status !== "ok") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const handle = await tasks.trigger<typeof generateSpecTask>("generate-spec", {
    projectId: access.project.id,
    roomId,
    chatHistory,
    nodes,
    edges,
  })

  try {
    await prisma.taskRun.create({
      data: {
        runId: handle.id,
        projectId: access.project.id,
        userId,
      },
    })
  } catch (error) {
    await runs.cancel(handle.id).catch(() => {})
    throw error
  }

  return NextResponse.json({ runId: handle.id })
}
