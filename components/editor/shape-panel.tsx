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

function handleDragStart(event: DragEvent<HTMLDivElement>, shape: NodeShape) {
  const { width, height } = DEFAULT_SHAPE_SIZE[shape]
  const payload: ShapeDragPayload = { shape, width, height }
  event.dataTransfer.setData(SHAPE_DRAG_MIME_TYPE, JSON.stringify(payload))
  event.dataTransfer.effectAllowed = "move"
}

export function ShapePanel() {
  return (
    <div className="flex items-center gap-1 rounded-full border border-surface-border bg-surface p-1.5 shadow-lg">
      {SHAPE_ITEMS.map(({ shape, label, Icon }) => (
        <div
          key={shape}
          role="button"
          aria-label={`Drag to add a ${label.toLowerCase()} node`}
          title={label}
          draggable
          onDragStart={(event) => handleDragStart(event, shape)}
          className="flex size-9 cursor-grab items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-elevated hover:text-copy-primary active:cursor-grabbing"
        >
          <Icon className="size-5" />
        </div>
      ))}
    </div>
  )
}
