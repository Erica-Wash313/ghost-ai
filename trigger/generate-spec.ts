import { randomUUID } from "node:crypto"

import { logger, metadata, schemaTask } from "@trigger.dev/sdk"
import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { put } from "@vercel/blob"
import { z } from "zod"

import { getLiveblocksClient } from "../lib/liveblocks"
import { APP_NAME } from "../lib/branding"
import { prisma } from "../lib/prisma"
import { NODE_COLORS, NODE_SHAPES } from "../types/canvas"
import { AI_STATUS_FEED_ID, aiChatFeedMessageSchema, type AiStatus } from "../types/tasks"

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_AI_API_KEY })

const specNodeSchema = z.object({
  id: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }),
  width: z.number().optional(),
  height: z.number().optional(),
  data: z.object({
    label: z.string(),
    color: z.enum(NODE_COLORS),
    shape: z.enum(NODE_SHAPES),
  }),
})

const specEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  data: z.object({ label: z.string() }),
})

export const generateSpecPayloadSchema = z.object({
  projectId: z.string().min(1),
  roomId: z.string().min(1),
  chatHistory: z.array(aiChatFeedMessageSchema),
  nodes: z.array(specNodeSchema),
  edges: z.array(specEdgeSchema),
})

type GenerateSpecPayload = z.infer<typeof generateSpecPayloadSchema>

const SYSTEM_PROMPT = `You are ${APP_NAME}, a technical writer that turns a system
design canvas and its design discussion into a Markdown technical specification.

Write a complete spec with an overview, the system's components (derived from
the canvas nodes), how they connect and communicate (derived from the canvas
edges and their labels), and any decisions or requirements raised in the chat
history. Use standard Markdown headings and lists. Write the document as a
standalone technical spec a reader could hand to an engineering team - do not
comment on the canvas or chat data itself.`

function buildUserPrompt(payload: GenerateSpecPayload): string {
  const graph = {
    nodes: payload.nodes.map((node) => ({
      id: node.id,
      shape: node.data.shape,
      color: node.data.color,
      label: node.data.label,
      x: node.position.x,
      y: node.position.y,
    })),
    edges: payload.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      label: edge.data.label,
    })),
  }

  const chat = payload.chatHistory
    .map((message) => `${message.sender} (${message.role}): ${message.content}`)
    .join("\n")

  return `Canvas graph:\n${JSON.stringify(graph)}\n\nDesign discussion:\n${
    chat || "(no chat history)"
  }\n\nGenerate the technical spec now.`
}

async function publishStatus(
  liveblocks: ReturnType<typeof getLiveblocksClient>,
  roomId: string,
  status: AiStatus,
  text: string
) {
  metadata.set("status", status).set("message", text)
  const data = { status, text }
  try {
    await liveblocks.createFeedMessage({ roomId, feedId: AI_STATUS_FEED_ID, data })
  } catch {
    // Most likely the feed doesn't exist in this room yet - create it once
    // and retry. A failure on the retry propagates like any other error.
    await liveblocks.createFeed({ roomId, feedId: AI_STATUS_FEED_ID })
    await liveblocks.createFeedMessage({ roomId, feedId: AI_STATUS_FEED_ID, data })
  }
}

// Best-effort - used from the catch block, so a failure here must never
// replace the real error that sent us into the catch block in the first place.
async function publishStatusSafely(
  liveblocks: ReturnType<typeof getLiveblocksClient>,
  roomId: string,
  status: AiStatus,
  text: string
) {
  try {
    await publishStatus(liveblocks, roomId, status, text)
  } catch (cleanupError) {
    logger.error("Failed to publish spec generation status", { roomId, status, cleanupError })
  }
}

export const generateSpecTask = schemaTask({
  id: "generate-spec",
  schema: generateSpecPayloadSchema,
  run: async (payload) => {
    const { projectId, roomId } = payload
    const liveblocks = getLiveblocksClient()

    logger.log("Spec generation task started", { projectId, roomId })

    try {
      await publishStatus(liveblocks, roomId, "start", `${APP_NAME} is reading the canvas...`)
      await publishStatus(liveblocks, roomId, "processing", `${APP_NAME} is writing the spec...`)

      const { text } = await generateText({
        model: google("gemini-3.6-flash"),
        system: SYSTEM_PROMPT,
        prompt: buildUserPrompt(payload),
        temperature: 0.3,
      })

      // Private, not public: same reasoning as canvas persistence - a spec
      // is only reachable through the authenticated, membership-checked
      // download route, never by a guessed/public Blob URL.
      const blob = await put(`specs/${projectId}/${randomUUID()}.md`, text, {
        access: "private",
        addRandomSuffix: false,
        contentType: "text/markdown",
      })

      const spec = await prisma.projectSpec.create({
        data: { projectId, filePath: blob.url },
      })

      await publishStatusSafely(liveblocks, roomId, "complete", `${APP_NAME} finished writing the spec.`)

      return { specId: spec.id }
    } catch (error) {
      logger.error("Spec generation task failed", { roomId, error })
      await publishStatusSafely(
        liveblocks,
        roomId,
        "error",
        `${APP_NAME} couldn't generate a spec. Please try again.`
      )
      throw error
    }
  },
})
