import { useEffect, useState } from "react"

import { UserButton } from "@clerk/nextjs"
import {
  AlertCircle,
  Check,
  LayoutTemplate,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave"
import { cn } from "@/lib/utils"

interface EditorNavbarProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  projectName?: string
  onShare?: () => void
  onOpenTemplates?: () => void
  isAiSidebarOpen?: boolean
  onToggleAiSidebar?: () => void
  saveStatus?: CanvasSaveStatus
  onSave?: () => void
  context: "home" | "workspace"
}

const SAVE_BUTTON_REVERT_MS = 2000

function SaveButton({
  status,
  onSave,
}: {
  status: CanvasSaveStatus
  onSave: () => void
}) {
  const [label, setLabel] = useState("Save")

  useEffect(() => {
    if (status === "saving") {
      setLabel("Saving…")
      return
    }
    if (status === "saved" || status === "error") {
      setLabel(status === "saved" ? "Saved" : "Error")
      const timeoutId = setTimeout(() => setLabel("Save"), SAVE_BUTTON_REVERT_MS)
      return () => clearTimeout(timeoutId)
    }
  }, [status])

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 rounded-full"
      onClick={onSave}
      disabled={status === "saving"}
    >
      {label}
    </Button>
  )
}

const SAVE_STATUS_CONFIG: Record<
  CanvasSaveStatus,
  { label: string; className: string; icon: React.ReactNode } | null
> = {
  idle: null,
  saving: {
    label: "Saving…",
    className: "text-copy-muted",
    icon: <Loader2 className="size-3.5 animate-spin" />,
  },
  saved: {
    label: "Saved",
    className: "text-copy-muted",
    icon: <Check className="size-3.5" />,
  },
  error: {
    label: "Error saving",
    className: "text-error",
    icon: <AlertCircle className="size-3.5" />,
  },
}

function SaveStatusIndicator({ status }: { status: CanvasSaveStatus }) {
  const config = SAVE_STATUS_CONFIG[status]
  if (!config) return null

  return (
    <span
      className={cn("flex items-center gap-1.5 text-xs", config.className)}
      role="status"
      aria-live="polite"
    >
      {config.icon}
      {config.label}
    </span>
  )
}

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  projectName,
  onShare,
  onOpenTemplates,
  isAiSidebarOpen,
  onToggleAiSidebar,
  saveStatus,
  onSave,
  context,
}: EditorNavbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-surface-border bg-base px-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="size-4" />
          ) : (
            <PanelLeftOpen className="size-4" />
          )}
        </Button>
        {projectName && (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-copy-primary">
              {projectName}
            </span>
            <span className="text-xs text-copy-muted">Workspace</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {saveStatus && <SaveStatusIndicator status={saveStatus} />}
        {onSave && <SaveButton status={saveStatus ?? "idle"} onSave={onSave} />}
        {onOpenTemplates && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={onOpenTemplates}
          >
            <LayoutTemplate className="size-4" />
            Templates
          </Button>
        )}
        {onShare && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={onShare}
          >
            <Share2 className="size-4" />
            Share
          </Button>
        )}
        {onToggleAiSidebar && (
          <Button
            variant={isAiSidebarOpen ? "default" : "outline"}
            size="sm"
            onClick={onToggleAiSidebar}
            className="gap-1.5 rounded-full"
            aria-label={
              isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"
            }
          >
            <Sparkles className="size-4" />
            AI
          </Button>
        )}
        {context === "home" && <UserButton />}
      </div>
    </header>
  )
}
