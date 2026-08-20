"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import type { ChangeEvent, KeyboardEvent } from "react"
import { Trash2 } from "lucide-react"
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react"

import { NodeColorToolbar } from "@/components/editor/node-color-toolbar"
import { LABEL_PLACEHOLDER, MIN_NODE_HEIGHT, MIN_NODE_WIDTH, ShapeVisual } from "@/components/editor/shape-visual"
import type { CanvasNode, NodeColor } from "@/types/canvas"

interface NodeActions {
  updateNodeLabel: (id: string, label: string) => void
  updateNodeColor: (id: string, color: NodeColor) => void
  deleteNode: (id: string) => void
}

// Lets the node renderer push label/color edits through the same Liveblocks-synced
// onNodesChange used elsewhere, without threading callbacks through node data.
export const NodeActionsContext = createContext<NodeActions | null>(null)

// One handle per side, each acting as both a source and target: connectionMode
// is Loose (see canvas.tsx), so a single "source" handle can both start and
// receive connections — no need for a stacked source+target pair per side.
const HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]
const HANDLE_CLASSNAME =
  "size-2! border! border-[var(--bg-base)]! bg-[var(--handle-fill)]! opacity-0 transition-opacity duration-150 group-hover:opacity-100"

export function CanvasNodeRenderer({ id, data, width, height, selected }: NodeProps<CanvasNode>) {
  const nodeActions = useContext(NodeActionsContext)
  const [isEditing, setIsEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState(data.label)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus()
      textareaRef.current?.select()
    }
  }, [isEditing])

  function startEditing() {
    setDraftLabel(data.label)
    setIsEditing(true)
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value
    setDraftLabel(value)
    nodeActions?.updateNodeLabel(id, value)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      textareaRef.current?.blur()
    }
  }

  return (
    <div className="group relative size-full" onDoubleClick={startEditing}>
      {HANDLE_POSITIONS.map((position) => (
        <Handle key={position} type="source" position={position} id={position} className={HANDLE_CLASSNAME} />
      ))}
      {selected && nodeActions && (
        <div className="nodrag nopan absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 items-center gap-1.5">
          <NodeColorToolbar
            activeColor={data.color}
            onColorSelect={(color) => nodeActions.updateNodeColor(id, color)}
          />
          <button
            type="button"
            aria-label="Delete node"
            title="Delete"
            onClick={() => nodeActions.deleteNode(id)}
            onMouseDown={(event) => event.stopPropagation()}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-surface-border bg-surface text-copy-secondary shadow-lg outline-none transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      )}
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_NODE_WIDTH}
        minHeight={MIN_NODE_HEIGHT}
        keepAspectRatio
        handleClassName="!size-2 !rounded-[2px] !border !border-surface-border !bg-elevated"
        lineClassName="!border-surface-border"
      />
      <ShapeVisual
        shape={data.shape}
        width={width}
        height={height}
        color={data.color}
        selected={selected}
        label={data.label}
        hideLabel={isEditing}
      />
      {isEditing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-2">
          <textarea
            ref={textareaRef}
            className="nodrag nopan pointer-events-auto max-h-full w-full resize-none border-none bg-transparent text-center text-sm outline-none placeholder:text-copy-faint"
            style={{ color: `var(--node-${data.color}-text)` }}
            rows={1}
            value={draftLabel}
            placeholder={LABEL_PLACEHOLDER}
            onChange={handleChange}
            onBlur={() => setIsEditing(false)}
            onKeyDown={handleKeyDown}
            onMouseDown={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
