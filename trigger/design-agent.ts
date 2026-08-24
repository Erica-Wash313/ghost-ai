import { randomUUID } from "node:crypto"

import { logger, metadata, task } from "@trigger.dev/sdk"
import { generateObject, NoObjectGeneratedError } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { mutateFlow, type MutableFlow } from "@liveblocks/react-flow/node"
import { z } from "zod"

import { getLiveblocksClient } from "../lib/liveblocks"
import { APP_NAME } from "../lib/branding"
import {
  DEFAULT_SHAPE_SIZE,
  NODE_COLORS,
  NODE_SHAPES,
  type CanvasEdge,
  type CanvasNode,
} from "../types/canvas"
import { AI_STATUS_FEED_ID, type AiStatus } from "../types/tasks"

interface DesignAgentPayload {
  prompt: string
  roomId: string
}

// Ephemeral identity the design agent presents itself as in the room -
// shown via the existing collaborator avatar stack and live cursor, the
// same way any other participant's presence already renders.
const AI_USER_ID = "ai-agent"
const AI_USER_INFO = { name: APP_NAME, avatar: "", color: "#6457f9" }
// Rolling TTL kept alive by repeated setPresence calls while the task runs -
// see Liveblocks' ephemeral presence API ("useful for scenarios like showing
// an AI agent's presence in a room" - it needs no live WebSocket connection).
const PRESENCE_TTL_SECONDS = 30
// Short TTL used for the final "clear" call so the AI's presence disappears
// right away instead of lingering for the full rolling TTL above. 2 is the
// API's documented minimum - anything lower is rejected outright.
const PRESENCE_CLEAR_TTL_SECONDS = 2

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_AI_API_KEY })

// Position is deliberately two flat number fields, not a nested {x,y}
// object. A nested object here reliably destabilized gemini-3.6-flash: one
// run spontaneously flattened it into top-level x/y on its own, and another
// got stuck in a runaway loop repeating `"position":null` until it hit the
// output token limit. Flat fields avoid whatever's going on with nested
// required objects in this model's structured-output decoding.
const operationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("add_node"),
    id: z.string().min(1).describe("A short local id for this new node, referenced by later operations in this same response (e.g. add_edge)."),
    shape: z.enum(NODE_SHAPES),
    color: z.enum(NODE_COLORS),
    label: z.string(),
    x: z.number(),
    y: z.number(),
  }),
  z.object({
    type: z.literal("move_node"),
    id: z.string().min(1),
    x: z.number(),
    y: z.number(),
  }),
  z.object({
    type: z.literal("resize_node"),
    id: z.string().min(1),
    width: z.number().min(40).max(400),
    height: z.number().min(40).max(400),
  }),
  z.object({
    type: z.literal("update_node"),
    id: z.string().min(1),
    label: z.string().optional(),
    color: z.enum(NODE_COLORS).optional(),
    shape: z.enum(NODE_SHAPES).optional(),
  }),
  z.object({
    type: z.literal("delete_node"),
    id: z.string().min(1),
  }),
  z.object({
    type: z.literal("add_edge"),
    // No caller-supplied id - applyOperations always mints a fresh,
    // cross-client-unique edge id, so requiring one from the model here
    // was dead weight (and Gemini reasonably omitted it, which is what
    // originally failed schema validation).
    source: z.string().min(1),
    target: z.string().min(1),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal("delete_edge"),
    id: z.string().min(1),
  }),
])

type DesignOperation = z.infer<typeof operationSchema>

// Gemini reliably picks the right operation "type" and its meaningful
// fields (shape/color/label/source/target), but sometimes drifts on the
// most generic field name - emitting "node" instead of "id" - even when the
// schema and prompt both spell it out. Reconciling that before strict
// validation is more reliable than hoping prompting alone prevents it, and
// it doesn't loosen what's actually accepted. Also defensively flattens a
// nested {x,y} "position" object back to top-level x/y, in case a future
// model reintroduces one despite the schema no longer asking for it.
function normalizeOperation(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw
  const op = raw as Record<string, unknown>
  const normalized: Record<string, unknown> = { ...op }

  if (normalized.id === undefined && typeof normalized.node === "string") {
    normalized.id = normalized.node
  }
  if (
    normalized.x === undefined &&
    normalized.y === undefined &&
    typeof normalized.position === "object" &&
    normalized.position !== null
  ) {
    const position = normalized.position as Record<string, unknown>
    if (typeof position.x === "number" && typeof position.y === "number") {
      normalized.x = position.x
      normalized.y = position.y
    }
  }

  return normalized
}

const designSchema = z.object({
  operations: z.array(z.preprocess(normalizeOperation, operationSchema)),
})

const SYSTEM_PROMPT = `You are ${APP_NAME}, a system design assistant that edits a shared, real-time
system architecture canvas by emitting a list of graph operations.

Allowed node shapes and their meaning:
- rectangle: default general-purpose component
- diamond: decision / gateway
- circle: event / endpoint
- pill: service / process
- cylinder: database / storage
- hexagon: external system / boundary

Allowed node colors (use color to visually group related components; default to
"default" when unsure): ${NODE_COLORS.join(", ")}.

Layout and spacing rules:
- Lay nodes out left-to-right in the general direction data/requests flow.
- Space nodes at least 220px apart horizontally and 160px apart vertically so
  they never overlap each other or any existing node.
- Use the existing nodes' positions (given below) as the frame of reference -
  place new nodes in empty space near the components they relate to.

Operations:
- add_node: create a new node. Give it a short local "id" (e.g. "api-gateway")
  that later operations in the same response can reference as source/target/id.
- move_node / resize_node / update_node / delete_node: target an existing
  node's real id, or a local id you just used in an add_node in this response.
- add_edge: connect two nodes by id (existing or newly added in this response).
- delete_edge: remove an existing edge by its real id.

Only emit operations that are actually needed to satisfy the user's request.
When extending an existing design, prefer adding to it over replacing it,
unless the user explicitly asks to redo or remove something.

Use these exact field names - "id" (never "node"), and top-level "x"/"y"
number fields (never a nested "position" object):
{"type":"add_node","id":"api-gateway","shape":"pill","color":"blue","label":"API Gateway","x":340,"y":260}
{"type":"add_edge","source":"api-gateway","target":"database","label":"reads/writes"}`

function buildUserPrompt(prompt: string, nodes: readonly CanvasNode[], edges: readonly CanvasEdge[]) {
  const currentGraph = {
    nodes: nodes.map((node) => ({
      id: node.id,
      shape: node.data.shape,
      color: node.data.color,
      label: node.data.label,
      x: node.position.x,
      y: node.position.y,
      width: node.width,
      height: node.height,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.data?.label ?? "",
    })),
  }

  return `Current canvas graph:\n${JSON.stringify(currentGraph)}\n\nUser request:\n${prompt}`
}

function centroid(points: { x: number; y: number }[]): { x: number; y: number } | null {
  if (points.length === 0) return null
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

const EDGE_MARKER_END = { type: "arrowclosed", color: "var(--edge-default-color)" } as const

function applyOperations(flow: MutableFlow<CanvasNode, CanvasEdge>, operations: DesignOperation[]) {
  const idMap = new Map<string, string>()
  const resolve = (id: string) => idMap.get(id) ?? id

  // Added nodes are resolved first so later operations in the same response
  // (in whatever order the model emitted them) can already reference them.
  for (const op of operations) {
    if (op.type !== "add_node") continue
    const size = DEFAULT_SHAPE_SIZE[op.shape]
    const realId = `${op.shape}-${randomUUID()}`
    idMap.set(op.id, realId)
    flow.addNode({
      id: realId,
      type: "canvasNode",
      position: { x: op.x, y: op.y },
      width: size.width,
      height: size.height,
      data: { label: op.label, color: op.color, shape: op.shape },
    })
  }

  for (const op of operations) {
    switch (op.type) {
      case "add_node":
        break
      case "move_node":
        flow.updateNode(resolve(op.id), { position: { x: op.x, y: op.y } })
        break
      case "resize_node":
        flow.updateNode(resolve(op.id), { width: op.width, height: op.height })
        break
      case "update_node": {
        const { label, color, shape } = op
        flow.updateNodeData(resolve(op.id), (data) => ({
          ...data,
          ...(label !== undefined ? { label } : {}),
          ...(color !== undefined ? { color } : {}),
          ...(shape !== undefined ? { shape } : {}),
        }))
        if (shape !== undefined) {
          const size = DEFAULT_SHAPE_SIZE[shape]
          flow.updateNode(resolve(op.id), { width: size.width, height: size.height })
        }
        break
      }
      case "delete_node": {
        const id = resolve(op.id)
        const connectedEdges = flow.edges.filter((edge) => edge.source === id || edge.target === id)
        flow.removeEdges(connectedEdges.map((edge) => edge.id))
        flow.removeNode(id)
        break
      }
      case "add_edge": {
        const source = resolve(op.source)
        const target = resolve(op.target)
        if (!flow.getNode(source) || !flow.getNode(target)) break
        flow.addEdge({
          id: `edge-${randomUUID()}`,
          type: "canvasEdge",
          source,
          target,
          markerEnd: EDGE_MARKER_END,
          data: { label: op.label ?? "" },
        })
        break
      }
      case "delete_edge":
        flow.removeEdge(resolve(op.id))
        break
    }
  }
}

async function setAiPresence(
  liveblocks: ReturnType<typeof getLiveblocksClient>,
  roomId: string,
  data: { thinking: boolean; cursor: { x: number; y: number } | null },
  ttl: number = PRESENCE_TTL_SECONDS
) {
  await liveblocks.setPresence(roomId, {
    userId: AI_USER_ID,
    userInfo: AI_USER_INFO,
    data,
    ttl,
  })
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

// Best-effort cleanup used from the catch block: a failure here must never
// replace the real error that sent us into the catch block in the first
// place, so it's logged and swallowed rather than thrown.
async function clearAiPresenceSafely(
  liveblocks: ReturnType<typeof getLiveblocksClient>,
  roomId: string
) {
  try {
    await setAiPresence(liveblocks, roomId, { thinking: false, cursor: null }, PRESENCE_CLEAR_TTL_SECONDS)
  } catch (cleanupError) {
    logger.error("Failed to clear AI presence during cleanup", { roomId, cleanupError })
  }
}

async function publishStatusSafely(
  liveblocks: ReturnType<typeof getLiveblocksClient>,
  roomId: string,
  status: AiStatus,
  text: string
) {
  try {
    await publishStatus(liveblocks, roomId, status, text)
  } catch (cleanupError) {
    logger.error("Failed to publish AI status during cleanup", { roomId, status, cleanupError })
  }
}

export const designAgentTask = task({
  id: "design-agent",
  run: async (payload: DesignAgentPayload) => {
    const { prompt, roomId } = payload
    const liveblocks = getLiveblocksClient()

    logger.log("Design agent task started", { roomId, prompt })

    try {
      await publishStatus(liveblocks, roomId, "start", `${APP_NAME} is reading the canvas...`)
      await setAiPresence(liveblocks, roomId, { thinking: true, cursor: null })

      await publishStatus(liveblocks, roomId, "processing", `${APP_NAME} is designing your architecture...`)

      let operationCount = 0
      await mutateFlow<CanvasNode, CanvasEdge>({ client: liveblocks, roomId }, async (flow) => {
        const { object } = await generateObject({
          model: google("gemini-3.6-flash"),
          schema: designSchema,
          system: SYSTEM_PROMPT,
          prompt: buildUserPrompt(prompt, flow.nodes, flow.edges),
          // Lower temperature for a structured-editing task that wants
          // consistent, deterministic-ish output, not creative variation -
          // and a hard output cap so a runaway repetition loop (observed
          // once already) fails fast and cheap instead of burning minutes
          // and tokens before hitting the model's own limit.
          temperature: 0.3,
          maxOutputTokens: 8192,
        })

        operationCount = object.operations.length

        const focusPoints = object.operations
          .filter((op) => op.type === "add_node" || op.type === "move_node")
          .map((op) => ({ x: op.x, y: op.y }))
        const focus = centroid(focusPoints)
        if (focus) {
          await setAiPresence(liveblocks, roomId, { thinking: true, cursor: focus })
        }

        applyOperations(flow, object.operations)
      })

      await clearAiPresenceSafely(liveblocks, roomId)
      await publishStatusSafely(
        liveblocks,
        roomId,
        "complete",
        operationCount > 0
          ? `${APP_NAME} updated the canvas (${operationCount} change${operationCount === 1 ? "" : "s"}).`
          : `${APP_NAME} didn't find any changes to make.`
      )

      return { operationCount }
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        // The bare error only carries a generic "did not match schema"
        // message - the actually useful diagnostics (what the model
        // returned, and why it failed Zod validation) live on these two
        // properties instead, and get lost if not logged explicitly.
        logger.error("Design agent task failed: model output did not match schema", {
          roomId,
          text: error.text,
          cause: error.cause,
          finishReason: error.finishReason,
        })
      } else {
        logger.error("Design agent task failed", { roomId, error })
      }
      await clearAiPresenceSafely(liveblocks, roomId)
      await publishStatusSafely(
        liveblocks,
        roomId,
        "error",
        `${APP_NAME} couldn't generate a design for that prompt. Please try again.`
      )
      throw error
    }
  },
})
