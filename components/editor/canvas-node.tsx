import type { ReactElement } from "react"
import type { NodeProps } from "@xyflow/react"

import type { CanvasNode, NodeShape } from "@/types/canvas"

const DEFAULT_WIDTH = 160
const DEFAULT_HEIGHT = 80

interface ShapeSvgProps {
  width: number
  height: number
  fill: string
  stroke: string
}

function DiamondShape({ width, height, fill, stroke }: ShapeSvgProps) {
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
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HexagonShape({ width, height, fill, stroke }: ShapeSvgProps) {
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
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CylinderShape({ width, height, fill, stroke }: ShapeSvgProps) {
  const rx = width / 2
  const ry = Math.min(height * 0.16, 16)
  const bodyPath = `M 0 ${ry} L 0 ${height - ry} A ${rx} ${ry} 0 0 0 ${width} ${height - ry} L ${width} ${ry} A ${rx} ${ry} 0 0 0 0 ${ry} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0"
      aria-hidden
    >
      <path d={bodyPath} fill={fill} stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
      <ellipse cx={rx} cy={ry} rx={rx - 0.75} ry={ry - 0.75} fill={fill} stroke={stroke} strokeWidth={1.5} />
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

export function CanvasNodeRenderer({ data, width, height }: NodeProps<CanvasNode>) {
  const w = width ?? DEFAULT_WIDTH
  const h = height ?? DEFAULT_HEIGHT
  const fill = `var(--node-${data.color}-fill)`
  const stroke = `var(--node-${data.color}-text)`
  const SvgShape = SVG_SHAPES[data.shape]

  if (SvgShape) {
    return (
      <div className="relative flex items-center justify-center" style={{ width: w, height: h }}>
        <SvgShape width={w} height={h} fill={fill} stroke={stroke} />
        <span
          className="relative z-10 px-2 text-center text-sm"
          style={{ color: stroke, maxWidth: w * 0.55 }}
        >
          {data.label}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center border px-3 py-2 text-center text-sm ${borderRadiusClassName(data.shape)}`}
      style={{ width: w, height: h, backgroundColor: fill, borderColor: stroke, color: stroke }}
    >
      {data.label}
    </div>
  )
}
