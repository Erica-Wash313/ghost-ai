"use client"

import "@xyflow/react/dist/style.css"
import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-flow/styles.css"

import { useCallback, useRef, type DragEvent } from "react"
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow"
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react"

import { CanvasNodeRenderer } from "@/components/editor/canvas-node"
import { ShapePanel } from "@/components/editor/shape-panel"
import {
  SHAPE_DRAG_MIME_TYPE,
  type CanvasEdge,
  type CanvasNode,
  type ShapeDragPayload,
} from "@/types/canvas"

const nodeTypes = { canvasNode: CanvasNodeRenderer }

function CanvasContent() {
  const { screenToFlowPosition } = useReactFlow()
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })
  const dropCounterRef = useRef(0)

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const raw = event.dataTransfer.getData(SHAPE_DRAG_MIME_TYPE)
      if (!raw) return

      const payload = JSON.parse(raw) as ShapeDragPayload
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })

      dropCounterRef.current += 1
      const newNode: CanvasNode = {
        id: `${payload.shape}-${Date.now()}-${dropCounterRef.current}`,
        type: "canvasNode",
        position,
        width: payload.width,
        height: payload.height,
        data: { label: "", color: "default", shape: payload.shape },
      }

      onNodesChange([{ type: "add", item: newNode }])
    },
    [onNodesChange, screenToFlowPosition]
  )

  return (
    <div
      className="relative flex-1 bg-base"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        connectionMode={ConnectionMode.Loose}
        fitView
      >
        <Cursors />
        <Background variant={BackgroundVariant.Dots} />
        <MiniMap />
        <Panel position="bottom-center">
          <ShapePanel />
        </Panel>
      </ReactFlow>
    </div>
  )
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  )
}
