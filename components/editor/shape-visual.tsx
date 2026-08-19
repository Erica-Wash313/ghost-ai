import type { ReactElement } from "react"

import type { NodeColor, NodeShape } from "@/types/canvas"

export const DEFAULT_NODE_WIDTH = 160
export const DEFAULT_NODE_HEIGHT = 80
export const MIN_NODE_WIDTH = 60
export const MIN_NODE_HEIGHT = 40
export const LABEL_PLACEHOLDER = "Untitled"

interface ShapeSvgProps {
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
}

function DiamondShape({ width, height, fill, stroke, strokeWidth }: ShapeSvgProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0"
      aria-hidden
    >
      <polygon
        points={`${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HexagonShape({ width, height, fill, stroke, strokeWidth }: ShapeSvgProps) {
  const inset = width * 0.2
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0"
      aria-hidden
    >
      <polygon
        points={`${inset},0 ${width - inset},0 ${width},${height / 2} ${width - inset},${height} ${inset},${height} 0,${height / 2}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CylinderShape({ width, height, fill, stroke, strokeWidth }: ShapeSvgProps) {
  const rx = width / 2
  const ry = height * 0.16
  const bodyPath = `M 0 ${ry} L 0 ${height - ry} A ${rx} ${ry} 0 0 0 ${width} ${height - ry} L ${width} ${ry} A ${rx} ${ry} 0 0 0 0 ${ry} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0"
      aria-hidden
    >
      <path d={bodyPath} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <ellipse
        cx={rx}
        cy={ry}
        rx={rx - strokeWidth / 2}
        ry={ry - strokeWidth / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </svg>
  )
}

const SVG_SHAPES: Partial<Record<NodeShape, (props: ShapeSvgProps) => ReactElement>> = {
  diamond: DiamondShape,
  hexagon: HexagonShape,
  cylinder: CylinderShape,
}

function borderRadiusClassName(shape: NodeShape) {
  switch (shape) {
    case "circle":
    case "pill":
      return "rounded-full"
    case "rectangle":
    default:
      return "rounded-xl"
  }
}

interface ShapeVisualProps {
  shape: NodeShape
  width?: number
  height?: number
  color?: NodeColor
  selected?: boolean
  label?: string
  // Suppresses the rendered label entirely, for when an overlay (e.g. an
  // inline-edit textarea) is showing its own text in the same spot instead.
  hideLabel?: boolean
  className?: string
}

// Shared by the real canvas node renderer and the shape panel's drag ghost,
// so a dragged preview always matches what actually lands on drop.
export function ShapeVisual({
  shape,
  width = DEFAULT_NODE_WIDTH,
  height = DEFAULT_NODE_HEIGHT,
  color = "default",
  selected = false,
  label = "",
  hideLabel = false,
  className,
}: ShapeVisualProps) {
  const fill = `var(--node-${color}-fill)`
  const vividStroke = `var(--node-${color}-text)`
  // Subtle at rest, full color once selected.
  const stroke = selected ? vividStroke : `color-mix(in srgb, ${vividStroke} 35%, transparent)`
  const strokeWidth = selected ? 2 : 1.5
  const SvgShape = SVG_SHAPES[shape]

  const labelContent = hideLabel ? null : label.trim() ? (
    label
  ) : (
    <span className="text-copy-faint">{LABEL_PLACEHOLDER}</span>
  )

  if (SvgShape) {
    return (
      <div
        className={`relative flex items-center justify-center ${className ?? ""}`}
        style={{ width, height }}
      >
        <SvgShape width={width} height={height} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <span
          className="relative z-10 px-2 text-center text-sm"
          style={{ color: vividStroke, maxWidth: width * 0.55 }}
        >
          {labelContent}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`flex items-center justify-center text-center text-sm ${borderRadiusClassName(shape)} ${className ?? ""}`}
      style={{
        width,
        height,
        backgroundColor: fill,
        borderColor: stroke,
        borderWidth: strokeWidth,
        borderStyle: "solid",
        color: vividStroke,
      }}
    >
      {labelContent}
    </div>
  )
}
