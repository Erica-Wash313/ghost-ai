"use client"

import type { DragEvent } from "react"
import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Pill,
  RectangleHorizontal,
  type LucideIcon,
} from "lucide-react"

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

function handleDragStart(event: DragEvent<HTMLButtonElement>, shape: NodeShape) {
  const { width, height } = DEFAULT_SHAPE_SIZE[shape]
  const payload: ShapeDragPayload = { shape, width, height }
  event.dataTransfer.setData(SHAPE_DRAG_MIME_TYPE, JSON.stringify(payload))
  event.dataTransfer.effectAllowed = "move"
}

interface ShapePanelProps {
  onShapeSelect: (shape: NodeShape) => void
}

export function ShapePanel({ onShapeSelect }: ShapePanelProps) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-surface-border bg-surface p-1.5 shadow-lg">
      {SHAPE_ITEMS.map(({ shape, label, Icon }) => (
        <button
          key={shape}
          type="button"
          aria-label={`Add a ${label.toLowerCase()} node`}
          title={label}
          draggable
          onDragStart={(event) => handleDragStart(event, shape)}
          onClick={() => onShapeSelect(shape)}
          className="flex size-9 cursor-grab items-center justify-center rounded-full text-copy-secondary outline-none transition-colors hover:bg-elevated hover:text-copy-primary focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
        >
          <Icon className="size-5" />
        </button>
      ))}
    </div>
  )
}
