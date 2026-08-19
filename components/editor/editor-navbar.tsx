import { UserButton } from "@clerk/nextjs"
import { LayoutTemplate, PanelLeftClose, PanelLeftOpen, Share2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

interface EditorNavbarProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  projectName?: string
  onShare?: () => void
  onOpenTemplates?: () => void
  isAiSidebarOpen?: boolean
  onToggleAiSidebar?: () => void
}

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  projectName,
  onShare,
  onOpenTemplates,
  isAiSidebarOpen,
  onToggleAiSidebar,
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
      <div className="flex items-center gap-2">
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
        <UserButton />
      </div>
    </header>
  )
}
