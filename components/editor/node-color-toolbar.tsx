import type { CSSProperties } from "react"

import { NODE_COLORS, type NodeColor } from "@/types/canvas"

interface NodeColorToolbarProps {
  activeColor: NodeColor
  onColorSelect: (color: NodeColor) => void
}

// Floating above a selected node (see canvas-node.tsx). nodrag/nopan plus the
// mousedown stop keep swatch clicks from dragging the node or panning the canvas.
export function NodeColorToolbar({ activeColor, onColorSelect }: NodeColorToolbarProps) {
  return (
    <div
      className="nodrag nopan flex items-center gap-1 rounded-full border border-surface-border bg-surface p-1.5 shadow-lg"
      onMouseDown={(event) => event.stopPropagation()}
    >
      {NODE_COLORS.map((color) => {
        const isActive = color === activeColor
        const style = {
          backgroundColor: `var(--node-${color}-fill)`,
          borderColor: `var(--node-${color}-text)`,
          boxShadow: isActive ? `0 0 0 2px var(--node-${color}-text)` : undefined,
          "--swatch-glow": `var(--node-${color}-text)`,
        } as CSSProperties

        return (
          <button
            key={color}
            type="button"
            aria-label={`Set node color to ${color}`}
            aria-pressed={isActive}
            title={color}
            onClick={() => onColorSelect(color)}
            className="size-6 cursor-pointer rounded-full border-[1.5px] outline-none transition-[box-shadow,transform] hover:scale-110 hover:shadow-[0_0_6px_var(--swatch-glow)] focus-visible:ring-2 focus-visible:ring-ring/50"
            style={style}
          />
        )
      })}
    </div>
  )
}
