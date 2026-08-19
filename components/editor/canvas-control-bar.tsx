"use client"

import { Maximize, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react"
import type { ButtonHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

interface CanvasControlBarProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function CanvasControlBar({
  onZoomIn,
  onZoomOut,
  onFitView,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: CanvasControlBarProps) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-surface-border bg-surface p-1.5 shadow-lg">
      <ControlButton aria-label="Zoom out" title="Zoom out" onClick={onZoomOut}>
        <ZoomOut className="size-5" />
      </ControlButton>
      <ControlButton aria-label="Fit view" title="Fit view" onClick={onFitView}>
        <Maximize className="size-5" />
      </ControlButton>
      <ControlButton aria-label="Zoom in" title="Zoom in" onClick={onZoomIn}>
        <ZoomIn className="size-5" />
      </ControlButton>

      <div className="mx-1 h-5 w-px bg-surface-border" />

      <ControlButton aria-label="Undo" title="Undo" onClick={onUndo} disabled={!canUndo}>
        <Undo2 className="size-5" />
      </ControlButton>
      <ControlButton aria-label="Redo" title="Redo" onClick={onRedo} disabled={!canRedo}>
        <Redo2 className="size-5" />
      </ControlButton>
    </div>
  )
}

function ControlButton({
  className,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "flex size-9 cursor-pointer items-center justify-center rounded-full text-copy-secondary outline-none transition-colors hover:bg-elevated hover:text-copy-primary focus-visible:ring-3 focus-visible:ring-ring/50",
        disabled && "cursor-not-allowed text-copy-faint opacity-40 hover:bg-transparent hover:text-copy-faint",
        className
      )}
      {...props}
    />
  )
}
