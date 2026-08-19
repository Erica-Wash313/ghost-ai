import type { Edge, Node } from "@xyflow/react"

export const NODE_COLORS = [
  "default",
  "blue",
  "purple",
  "orange",
  "red",
  "pink",
  "green",
  "teal",
] as const

export type NodeColor = (typeof NODE_COLORS)[number]

export const NODE_SHAPES = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
] as const

export type NodeShape = (typeof NODE_SHAPES)[number]

export interface CanvasNodeData extends Record<string, unknown> {
  label: string
  color: NodeColor
  shape: NodeShape
}

export type CanvasNode = Node<CanvasNodeData, "canvasNode">

export interface CanvasEdgeData extends Record<string, unknown> {
  label: string
}

export type CanvasEdge = Edge<CanvasEdgeData, "canvasEdge">

export const SHAPE_DRAG_MIME_TYPE = "application/x-ghost-shape"

export interface ShapeDragPayload {
  shape: NodeShape
  width: number
  height: number
}

export const DEFAULT_SHAPE_SIZE: Record<NodeShape, { width: number; height: number }> = {
  rectangle: { width: 160, height: 80 },
  diamond: { width: 160, height: 160 },
  circle: { width: 120, height: 120 },
  pill: { width: 160, height: 60 },
  cylinder: { width: 120, height: 110 },
  hexagon: { width: 170, height: 90 },
}
