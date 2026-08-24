import { z } from "zod"

// Room-scoped Liveblocks feed every AI task publishes its progress to, so
// everyone in the room sees the same activity - not just whoever triggered
// the run. See trigger/design-agent.ts for the current publisher.
export const AI_STATUS_FEED_ID = "ai-status-feed"

export const AI_STATUSES = ["start", "processing", "complete", "error"] as const
export type AiStatus = (typeof AI_STATUSES)[number]

// Shape of a feed message's `data` on the ai-status feed. Kept generic (a
// status plus optional free-text) so design generation, spec generation, and
// future AI tasks can all publish to the same feed.
export const aiStatusFeedMessageSchema = z.object({
  status: z.enum(AI_STATUSES),
  text: z.string().optional(),
})

export type AiStatusFeedMessage = z.infer<typeof aiStatusFeedMessageSchema>

export function parseAiStatusFeedMessage(payload: unknown): AiStatusFeedMessage | null {
  const result = aiStatusFeedMessageSchema.safeParse(payload)
  return result.success ? result.data : null
}

// Room-scoped Liveblocks feed for collaborative sidebar chat between the
// people in a room. Kept separate from ai-status-feed above, which is for AI
// progress/presence broadcasts only - this feed never carries status data,
// and the status feed never carries chat messages.
export const AI_CHAT_FEED_ID = "ai-chat"

export const aiChatFeedMessageSchema = z.object({
  senderId: z.string().min(1),
  sender: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
  timestamp: z.number(),
})

export type AiChatFeedMessage = z.infer<typeof aiChatFeedMessageSchema>

export function parseAiChatFeedMessage(payload: unknown): AiChatFeedMessage | null {
  const result = aiChatFeedMessageSchema.safeParse(payload)
  return result.success ? result.data : null
}
