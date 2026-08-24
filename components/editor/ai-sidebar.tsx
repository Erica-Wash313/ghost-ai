"use client"

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { useCreateFeed, useCreateFeedMessage, useFeedMessages, useSelf } from "@liveblocks/react"
import { useLiveblocksFlow } from "@liveblocks/react-flow"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { Bot, Download, FileText, Loader2, Send, Sparkles, X } from "lucide-react"
import Markdown, { type Components } from "react-markdown"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { APP_NAME } from "@/lib/branding"
import { cn } from "@/lib/utils"
import type { designAgentTask } from "@/trigger/design-agent"
import type { generateSpecTask } from "@/trigger/generate-spec"
import type { CanvasEdge, CanvasNode } from "@/types/canvas"
import {
  AI_CHAT_FEED_ID,
  AI_STATUS_FEED_ID,
  parseAiChatFeedMessage,
  parseAiStatusFeedMessage,
  type AiChatFeedMessage,
} from "@/types/tasks"

interface SpecListItem {
  id: string
  filename: string
  createdAt: string
}

function formatSpecDate(createdAt: string) {
  return new Date(createdAt).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

async function fetchSpecs(projectId: string): Promise<SpecListItem[]> {
  const res = await fetch(`/api/projects/${projectId}/specs`)
  if (!res.ok) throw new Error("Failed to load specs")
  const data = (await res.json()) as { specs: SpecListItem[] }
  return data.specs
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mt-4 mb-2 text-lg font-semibold text-copy-primary first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 mb-2 text-base font-semibold text-copy-primary first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1.5 text-sm font-semibold text-copy-primary first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-sm leading-relaxed text-copy-secondary last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-copy-secondary">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-copy-secondary">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-brand underline underline-offset-2 hover:text-brand/80"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-copy-primary">{children}</strong>,
  code: ({ children }) => (
    <code className="rounded-xl bg-subtle px-1.5 py-0.5 font-mono text-xs text-copy-primary">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-xl bg-subtle p-3 font-mono text-xs text-copy-primary">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-surface-border pl-3 text-sm text-copy-muted italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-surface-border" />,
}

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  roomId: string
}

// Identity the assistant's own chat bubbles are posted under - distinct from
// trigger/design-agent.ts's AI_USER_ID (that one is a Liveblocks presence
// identity for cursors/avatars, this is just a feed message sender).
const AI_SENDER_ID = "ghost-ai"
const AI_SENDER_NAME = APP_NAME

// The feed's own message order isn't documented, so pick the most recent by
// createdAt explicitly rather than assuming ascending/descending order.
function useLatestAiStatus() {
  const { messages } = useFeedMessages(AI_STATUS_FEED_ID)

  return useMemo(() => {
    if (!messages || messages.length === 0) return null
    const latest = messages.reduce((newest, message) =>
      message.createdAt > newest.createdAt ? message : newest
    )
    return parseAiStatusFeedMessage(latest.data)
  }, [messages])
}

interface ChatFeedEntry {
  id: string
  message: AiChatFeedMessage
}

// Same "don't assume feed ordering" reasoning as useLatestAiStatus above -
// sort explicitly by createdAt rather than trusting feed order.
function useAiChatMessages(): ChatFeedEntry[] {
  const { messages } = useFeedMessages(AI_CHAT_FEED_ID)

  return useMemo(() => {
    if (!messages) return []
    return messages
      .map((message) => ({ id: message.id, message: parseAiChatFeedMessage(message.data) }))
      .filter((entry): entry is ChatFeedEntry => entry.message !== null)
      .sort((a, b) => a.message.timestamp - b.message.timestamp)
  }, [messages])
}

function formatTimestamp(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

export function AiSidebar({ isOpen, onClose, projectId, roomId }: AiSidebarProps) {
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isSubmittingRun, setIsSubmittingRun] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [activeRun, setActiveRun] = useState<{ runId: string; publicToken: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [specs, setSpecs] = useState<SpecListItem[]>([])
  const [specsLoading, setSpecsLoading] = useState(true)
  const [specsError, setSpecsError] = useState<string | null>(null)

  const [isGeneratingSpec, setIsGeneratingSpec] = useState(false)
  const [activeSpecRun, setActiveSpecRun] = useState<{ runId: string; publicToken: string } | null>(
    null
  )
  const [generateSpecError, setGenerateSpecError] = useState<string | null>(null)

  const [previewSpec, setPreviewSpec] = useState<SpecListItem | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const self = useSelf()
  const chatMessages = useAiChatMessages()
  const createFeedMessage = useCreateFeedMessage()
  const createFeed = useCreateFeed()

  // Read-only second subscription to the same room's canvas storage that
  // components/editor/canvas.tsx already syncs via useLiveblocksFlow - safe
  // to call again here since they share the single RoomProvider connection
  // set up in canvas-room.tsx, and only nodes/edges are used (never the
  // onNodesChange/onEdgesChange/onConnect/onDelete mutators, which stay
  // owned by the canvas).
  const { nodes: canvasNodes, edges: canvasEdges } = useLiveblocksFlow<CanvasNode, CanvasEdge>({
    suspense: true,
    nodes: { initial: [] },
    edges: { initial: [] },
  })

  const aiStatus = useLatestAiStatus()
  const isRunActive = activeRun !== null
  const isBusy = isSending || isSubmittingRun || isRunActive
  const isSpecRunActive = activeSpecRun !== null

  useEffect(() => {
    let cancelled = false

    async function loadSpecs() {
      setSpecsLoading(true)
      setSpecsError(null)
      try {
        const result = await fetchSpecs(projectId)
        if (!cancelled) setSpecs(result)
      } catch {
        if (!cancelled) setSpecsError("Couldn't load specs.")
      } finally {
        if (!cancelled) setSpecsLoading(false)
      }
    }

    loadSpecs()
    return () => {
      cancelled = true
    }
  }, [projectId])

  async function handleSelectSpec(spec: SpecListItem) {
    setPreviewSpec(spec)
    setPreviewContent(null)
    setPreviewError(null)
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/specs/${spec.id}/download`)
      if (!res.ok) throw new Error("Failed to load spec content")
      setPreviewContent(await res.text())
    } catch {
      setPreviewError("Couldn't load this spec. Try again.")
    } finally {
      setPreviewLoading(false)
    }
  }

  function handleClosePreview() {
    setPreviewSpec(null)
    setPreviewContent(null)
    setPreviewError(null)
  }

  function handleDownloadSpec(spec: SpecListItem) {
    const link = document.createElement("a")
    link.href = `/api/projects/${projectId}/specs/${spec.id}/download`
    link.click()
  }

  async function postChatMessage(data: AiChatFeedMessage) {
    try {
      await createFeedMessage(AI_CHAT_FEED_ID, data)
    } catch {
      // Most likely the feed doesn't exist in this room yet - create it
      // once and retry, same pattern trigger/design-agent.ts uses server-side.
      await createFeed(AI_CHAT_FEED_ID)
      await createFeedMessage(AI_CHAT_FEED_ID, data)
    }
  }

  // Runs while a run is active: reads the run's terminal status and pushes a
  // final assistant chat message, then clears the run so the input re-enables.
  // The status feed's latest text (already published by trigger/design-agent.ts
  // before it returns) is used as the message content rather than run.output,
  // since fetching/rendering the final graph data is out of scope for this sidebar.
  useRealtimeRun<typeof designAgentTask>(activeRun?.runId, {
    accessToken: activeRun?.publicToken,
    enabled: activeRun !== null,
    skipColumns: ["payload", "output"],
    onComplete: (completedRun, err) => {
      const succeeded = completedRun.status === "COMPLETED" && !err
      const content =
        aiStatus?.text ??
        (succeeded
          ? `${APP_NAME} finished updating the canvas.`
          : `${APP_NAME} couldn't complete that request.`)

      postChatMessage({
        senderId: AI_SENDER_ID,
        sender: AI_SENDER_NAME,
        role: "assistant",
        content,
        timestamp: Date.now(),
      }).catch(() => {})

      setActiveRun(null)
    },
  })

  // Mirrors the design-run tracker above, but for generate-spec runs: on
  // completion it refreshes the spec list instead of posting a chat message,
  // since spec generation has no chat feed of its own.
  useRealtimeRun<typeof generateSpecTask>(activeSpecRun?.runId, {
    accessToken: activeSpecRun?.publicToken,
    enabled: activeSpecRun !== null,
    skipColumns: ["payload", "output"],
    onComplete: (completedRun, err) => {
      const succeeded = completedRun.status === "COMPLETED" && !err
      if (succeeded) {
        fetchSpecs(projectId)
          .then(setSpecs)
          .catch(() => {})
      } else {
        setGenerateSpecError(
          aiStatus?.text ?? `${APP_NAME} couldn't generate a spec. Please try again.`
        )
      }
      setActiveSpecRun(null)
    },
  })

  async function triggerSpecAgent() {
    const specRes = await fetch("/api/ai/spec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        chatHistory: chatMessages.map((entry) => entry.message),
        nodes: canvasNodes,
        edges: canvasEdges,
      }),
    })
    if (!specRes.ok) throw new Error("Failed to start spec run")
    const { runId } = (await specRes.json()) as { runId: string }

    const tokenRes = await fetch("/api/ai/spec/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId }),
    })
    if (!tokenRes.ok) throw new Error("Failed to authorize run tracking")
    const { token } = (await tokenRes.json()) as { token: string }

    return { runId, publicToken: token }
  }

  async function handleGenerateSpec() {
    if (isGeneratingSpec || isSpecRunActive) return

    setIsGeneratingSpec(true)
    setGenerateSpecError(null)
    try {
      const run = await triggerSpecAgent()
      setActiveSpecRun(run)
    } catch {
      setGenerateSpecError("Something went wrong generating that spec. Please try again.")
    } finally {
      setIsGeneratingSpec(false)
    }
  }

  async function triggerDesignAgent(prompt: string) {
    const designRes = await fetch("/api/ai/design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, roomId, projectId }),
    })
    if (!designRes.ok) throw new Error("Failed to start design run")
    const { runId } = (await designRes.json()) as { runId: string }

    const tokenRes = await fetch("/api/ai/design/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId }),
    })
    if (!tokenRes.ok) throw new Error("Failed to authorize run tracking")
    const { token } = (await tokenRes.json()) as { token: string }

    return { runId, publicToken: token }
  }

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || isBusy || !self) return

    setIsSending(true)
    setSendError(null)
    try {
      await postChatMessage({
        senderId: self.id,
        sender: self.info.name,
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      })
      setInput("")
    } catch {
      setSendError("Couldn't send your message. Try again.")
      setIsSending(false)
      return
    }
    setIsSending(false)

    setIsSubmittingRun(true)
    try {
      const run = await triggerDesignAgent(trimmed)
      setActiveRun(run)
    } catch {
      await postChatMessage({
        senderId: AI_SENDER_ID,
        sender: AI_SENDER_NAME,
        role: "assistant",
        content: "Something went wrong starting that request. Please try again.",
        timestamp: Date.now(),
      }).catch(() => {})
    } finally {
      setIsSubmittingRun(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  function handleChipClick(prompt: string) {
    setInput(prompt)
    textareaRef.current?.focus()
  }

  return (
    <aside
      aria-label="AI sidebar"
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={cn(
        "fixed top-16 right-0 z-40 flex h-[calc(100%-4rem)] w-96 flex-col border-l border-surface-border bg-base/95 shadow-lg transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-ai/20 text-ai-text">
            <Bot className="size-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-copy-primary">
              AI Workspace
            </span>
            <span className="text-xs text-copy-muted">
              Collaborate with {APP_NAME}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close AI sidebar"
        >
          <X className="size-4" />
        </Button>
      </div>

      <Tabs
        defaultValue="architect"
        className="flex flex-1 flex-col overflow-hidden px-4 pt-3"
      >
        <TabsList className="w-full">
          <TabsTrigger
            value="architect"
            className="flex-1 text-copy-muted data-active:bg-accent-dim! data-active:text-brand!"
          >
            AI Architect
          </TabsTrigger>
          <TabsTrigger
            value="specs"
            className="flex-1 text-copy-muted data-active:bg-accent-dim! data-active:text-brand!"
          >
            Specs
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="architect"
          className="-mx-4 flex flex-1 flex-col overflow-hidden"
        >
          <ScrollArea className="flex-1 px-4">
            {chatMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 px-2 py-8 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-ai/20 text-ai-text">
                  <Bot className="size-6" />
                </div>
                <p className="text-sm text-copy-muted">
                  Describe a system and {APP_NAME} will help you architect it
                  on the canvas.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleChipClick(prompt)}
                      className="rounded-full bg-subtle px-3 py-1.5 text-xs text-ai-text transition-colors hover:bg-elevated"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 py-4">
                {chatMessages.map((entry) => (
                  <ChatBubble
                    key={entry.id}
                    message={entry.message}
                    isOwnMessage={entry.message.senderId === self?.id}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {sendError && (
            <p className="border-t border-surface-border px-4 py-2 text-xs text-error">
              {sendError}
            </p>
          )}

          {isRunActive && aiStatus?.text && (
            <div
              className={cn(
                "flex items-center gap-2 border-t border-surface-border px-4 py-2 text-xs",
                aiStatus.status === "error"
                  ? "text-error"
                  : aiStatus.status === "complete"
                    ? "text-copy-muted"
                    : "text-ai-text"
              )}
            >
              <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
              <span className="truncate">{aiStatus.text}</span>
            </div>
          )}

          <div className="flex items-end gap-2 border-t border-surface-border px-4 py-3">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the system you want to build..."
              disabled={isBusy}
              className="min-h-[72px] max-h-[160px] flex-1 resize-none overflow-y-auto text-copy-primary"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isBusy}
              aria-label={isBusy ? `${APP_NAME} is generating` : "Send message"}
              className="shrink-0 bg-accent! text-white! hover:bg-accent/80!"
            >
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent
          value="specs"
          className="-mx-4 flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex flex-col gap-3 px-4 pt-1 pb-3">
            <Button
              onClick={handleGenerateSpec}
              disabled={isGeneratingSpec || isSpecRunActive}
              className="w-full gap-1.5 bg-accent! text-white! hover:bg-accent/80!"
            >
              {isGeneratingSpec || isSpecRunActive ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isSpecRunActive ? "Generating..." : "Generate Spec"}
            </Button>
            {isSpecRunActive && aiStatus?.text && (
              <div className="flex items-center gap-2 text-xs text-ai-text">
                <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
                <span className="truncate">{aiStatus.text}</span>
              </div>
            )}
            {generateSpecError && <p className="text-xs text-error">{generateSpecError}</p>}
            {specsError && <p className="text-xs text-error">{specsError}</p>}
          </div>

          <ScrollArea className="flex-1 px-4">
            {specsLoading ? (
              <p className="px-1 py-4 text-sm text-copy-muted">Loading specs...</p>
            ) : specs.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-2 py-8 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-ai/20 text-ai-text">
                  <FileText className="size-6" />
                </div>
                <p className="text-sm text-copy-muted">
                  No specs yet. Generate one from the current canvas architecture.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pb-4">
                {specs.map((spec) => (
                  <SpecListItemRow
                    key={spec.id}
                    spec={spec}
                    onSelect={handleSelectSpec}
                    onDownload={handleDownloadSpec}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <Dialog
        open={previewSpec !== null}
        onOpenChange={(open) => {
          if (!open) handleClosePreview()
        }}
      >
        <DialogContent className="flex max-h-[85vh] w-full flex-col gap-3 rounded-3xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate text-copy-primary">
              {previewSpec?.filename}
            </DialogTitle>
            {previewSpec && (
              <DialogDescription>{formatSpecDate(previewSpec.createdAt)}</DialogDescription>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1 rounded-2xl border border-surface-border bg-elevated">
            <div className="px-4 py-3">
              {previewLoading ? (
                <p className="text-sm text-copy-muted">Loading spec...</p>
              ) : previewError ? (
                <p className="text-sm text-error">{previewError}</p>
              ) : previewContent ? (
                <Markdown components={markdownComponents}>{previewContent}</Markdown>
              ) : null}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!previewSpec}
              onClick={() => previewSpec && handleDownloadSpec(previewSpec)}
            >
              <Download className="size-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}

function SpecListItemRow({
  spec,
  onSelect,
  onDownload,
}: {
  spec: SpecListItem
  onSelect: (spec: SpecListItem) => void
  onDownload: (spec: SpecListItem) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(spec)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelect(spec)
        }
      }}
      className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-surface-border bg-elevated p-3 text-left transition-colors hover:border-surface-border-subtle hover:bg-subtle"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-subtle text-ai-text">
        <FileText className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-copy-primary">{spec.filename}</p>
        <p className="text-xs text-copy-muted">{formatSpecDate(spec.createdAt)}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={(event) => {
          event.stopPropagation()
          onDownload(spec)
        }}
        aria-label={`Download ${spec.filename}`}
      >
        <Download className="size-4" />
      </Button>
    </div>
  )
}

function ChatBubble({
  message,
  isOwnMessage,
}: {
  message: AiChatFeedMessage
  isOwnMessage: boolean
}) {
  return (
    <div className={cn("flex flex-col gap-1", isOwnMessage ? "items-end" : "items-start")}>
      <span className="px-1 text-[11px] text-copy-faint">
        {message.sender} · {formatTimestamp(message.timestamp)}
      </span>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words",
          isOwnMessage
            ? "border-2 border-brand/50 bg-accent-dim text-copy-primary"
            : "border border-surface-border bg-elevated text-ai-text"
        )}
      >
        {message.content}
      </div>
    </div>
  )
}
