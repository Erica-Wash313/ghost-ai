"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import type { ChangeEvent, KeyboardEvent } from "react"
import { EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react"

import type { CanvasEdge } from "@/types/canvas"

interface EdgeActions {
  updateEdgeLabel: (id: string, label: string) => void
}

// Lets the edge renderer push label edits through the same Liveblocks-synced
// onEdgesChange used elsewhere, without threading callbacks through edge data.
export const EdgeActionsContext = createContext<EdgeActions | null>(null)

const LABEL_HINT = "Add label"
const STROKE_WIDTH = 1.75
// Wider invisible path so the edge is easy to hover/click/double-click without
// making the visible line itself any thicker.
const HIT_STROKE_WIDTH = 24

export function CanvasEdgeRenderer({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<CanvasEdge>) {
  const edgeActions = useContext(EdgeActionsContext)
  const savedLabel = data?.label ?? ""
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState(savedLabel)
  const inputRef = useRef<HTMLInputElement>(null)

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    // 0 keeps the turns square instead of the default rounded corner.
    borderRadius: 0,
  })

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  function startEditing() {
    setDraftLabel(savedLabel)
    setIsEditing(true)
  }

  function commitLabel() {
    edgeActions?.updateEdgeLabel(id, draftLabel.trim())
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setDraftLabel(event.target.value)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault()
      commitLabel()
      setIsEditing(false)
    }
  }

  function handleBlur() {
    commitLabel()
    setIsEditing(false)
  }

  const label = savedLabel.trim()
  const isBright = isHovered || selected

  return (
    <>
      <g
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={startEditing}
      >
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={HIT_STROKE_WIDTH}
          className="cursor-pointer"
        />
        <path
          d={path}
          fill="none"
          markerEnd={markerEnd}
          style={{
            stroke: "var(--edge-default-color)",
            strokeWidth: STROKE_WIDTH,
            strokeLinecap: "round",
            opacity: isBright ? 1 : 0.55,
            transition: "opacity 150ms ease",
          }}
        />
      </g>
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              value={draftLabel}
              size={Math.max(draftLabel.length || LABEL_HINT.length, 1)}
              placeholder={LABEL_HINT}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="rounded-full border border-surface-border bg-surface px-2 py-0.5 text-center text-xs text-copy-primary shadow-md outline-none placeholder:text-copy-faint"
            />
          ) : label ? (
            <button
              type="button"
              onDoubleClick={startEditing}
              className="cursor-text rounded-full border border-surface-border bg-surface px-2 py-0.5 text-xs text-copy-secondary shadow-md"
            >
              {label}
            </button>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
