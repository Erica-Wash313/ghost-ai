"use client"

import { useState, type DragEvent } from "react"
import { createPortal } from "react-dom"
import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Pill,
  RectangleHorizontal,
  type LucideIcon,
} from "lucide-react"

import { ShapeVisual } from "@/components/editor/shape-visual"
import {
  DEFAULT_SHAPE_SIZE,
  SHAPE_DRAG_MIME_TYPE,
  type NodeShape,
  type ShapeDragPayload,
} from "@/types/canvas"

const SHAPE_ITEMS: { shape: NodeShape; label: string; Icon: LucideIcon }[] = [
  { shape: "rectangle", label: "Rectangle", Icon: RectangleHorizontal },
  { shape: "diamond", label: "Diamond", Icon: Diamond },
  { shape: "circle", label: "Circle", Icon: Circle },
  { shape: "pill", label: "Pill", Icon: Pill },
  { shape: "cylinder", label: "Cylinder", Icon: Cylinder },
  { shape: "hexagon", label: "Hexagon", Icon: Hexagon },
]

interface ShapePanelProps {
  onShapeSelect: (shape: NodeShape) => void
}

interface DragPreviewState {
  shape: NodeShape
  x: number
  y: number
}

export function ShapePanel({ onShapeSelect }: ShapePanelProps) {
  const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null)

  function handleDragStart(event: DragEvent<HTMLButtonElement>, shape: NodeShape) {
    const { width, height } = DEFAULT_SHAPE_SIZE[shape]
    const payload: ShapeDragPayload = { shape, width, height }
    event.dataTransfer.setData(SHAPE_DRAG_MIME_TYPE, JSON.stringify(payload))
    event.dataTransfer.effectAllowed = "move"

    // The visible preview is rendered by React below. Suppress the browser's
    // inconsistent native snapshot so SVGs behave the same across engines.
    const transparentDragImage = document.createElement("div")
    transparentDragImage.style.cssText =
      `position:fixed;left:${event.clientX}px;top:${event.clientY}px;` +
      "width:1px;height:1px;opacity:0;pointer-events:none;"
    document.body.appendChild(transparentDragImage)
    event.dataTransfer.setDragImage(transparentDragImage, 0, 0)
    window.setTimeout(() => transparentDragImage.remove(), 0)

    setDragPreview({ shape, x: event.clientX, y: event.clientY })
  }

  function handleDrag(event: DragEvent<HTMLButtonElement>, shape: NodeShape) {
    // Browsers report 0,0 for the final drag event immediately before dragend.
    if (event.clientX === 0 && event.clientY === 0) return
    setDragPreview({ shape, x: event.clientX, y: event.clientY })
  }

  const previewSize = dragPreview ? DEFAULT_SHAPE_SIZE[dragPreview.shape] : null

  return (
    <>
      {dragPreview && previewSize &&
        createPortal(
          <div
            aria-hidden
            className="pointer-events-none fixed z-[9999] opacity-80"
            style={{
              left: dragPreview.x - previewSize.width / 2,
              top: dragPreview.y - previewSize.height / 2,
            }}
          >
            <ShapeVisual
              shape={dragPreview.shape}
              width={previewSize.width}
              height={previewSize.height}
            />
          </div>,
          document.body
        )}

      <div className="flex items-center gap-1 rounded-full border border-surface-border bg-surface p-1.5 shadow-lg">
        {SHAPE_ITEMS.map(({ shape, label, Icon }) => (
          <button
            key={shape}
            type="button"
            aria-label={`Add a ${label.toLowerCase()} node`}
            title={label}
            draggable
            onDragStart={(event) => handleDragStart(event, shape)}
            onDrag={(event) => handleDrag(event, shape)}
            onDragEnd={() => setDragPreview(null)}
            onClick={() => onShapeSelect(shape)}
            className="flex size-9 cursor-grab items-center justify-center rounded-full text-copy-secondary outline-none transition-colors hover:bg-elevated hover:text-copy-primary focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
          >
            <Icon className="size-5" />
          </button>
        ))}
      </div>
    </>
  )
}
