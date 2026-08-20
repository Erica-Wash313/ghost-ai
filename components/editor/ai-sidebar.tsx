"use client"

import { useRef, useState, type KeyboardEvent } from "react"
import { Bot, Download, FileText, Send, Sparkles, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSend() {
    const trimmed = input.trim()
    if (!trimmed) return
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: trimmed },
    ])
    setInput("")
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
              Collaborate with Ghost AI
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
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 px-2 py-8 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-ai/20 text-ai-text">
                  <Bot className="size-6" />
                </div>
                <p className="text-sm text-copy-muted">
                  Describe a system and Ghost AI will help you architect it on
                  the canvas.
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
                {messages.map((message) => (
                  <ChatBubble key={message.id} message={message} />
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex items-end gap-2 border-t border-surface-border px-4 py-3">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the system you want to build..."
              className="min-h-[72px] max-h-[160px] flex-1 resize-none overflow-y-auto text-copy-primary"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim()}
              aria-label="Send message"
              className="shrink-0 bg-accent! text-white! hover:bg-accent/80!"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent
          value="specs"
          className="flex flex-1 flex-col gap-4 overflow-y-auto pb-4"
        >
          <Button className="w-full gap-1.5 bg-accent! text-white! hover:bg-accent/80!">
            <Sparkles className="size-4" />
            Generate Spec
          </Button>

          <div className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-elevated p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-subtle text-ai-text">
                <FileText className="size-4" />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-sm font-medium text-copy-primary">
                  E-commerce Backend Spec
                </p>
                <p className="text-xs text-copy-muted">
                  Services, data models, and API contracts generated from the
                  current canvas architecture.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled className="w-full gap-1.5">
              <Download className="size-4" />
              Download
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words",
          isUser
            ? "border-2 border-brand/50 bg-accent-dim text-copy-primary"
            : "border border-surface-border bg-elevated text-ai-text"
        )}
      >
        {message.content}
      </div>
    </div>
  )
}
