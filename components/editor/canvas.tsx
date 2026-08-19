"use client"

import "@xyflow/react/dist/style.css"
import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-flow/styles.css"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type DragEvent,
} from "react"
import { Cursors, useLiveblocksFlow } from "@liveblocks/react-flow"
import { useCanRedo, useCanUndo, useRedo, useRoom, useUndo } from "@liveblocks/react"
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type DefaultEdgeOptions,
} from "@xyflow/react"

import { CanvasControlBar } from "@/components/editor/canvas-control-bar"
import { CanvasEdgeRenderer, EdgeActionsContext } from "@/components/editor/canvas-edge"
import { CanvasNodeRenderer, NodeActionsContext } from "@/components/editor/canvas-node"
import { ShapePanel } from "@/components/editor/shape-panel"
import type { CanvasTemplate } from "@/components/editor/starter-templates"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import {
  DEFAULT_SHAPE_SIZE,
  SHAPE_DRAG_MIME_TYPE,
  type CanvasEdge,
  type CanvasNode,
  type NodeColor,
  type NodeShape,
  type ShapeDragPayload,
} from "@/types/canvas"

const nodeTypes = { canvasNode: CanvasNodeRenderer }
const edgeTypes = { canvasEdge: CanvasEdgeRenderer }

const EDGE_MARKER_END = { type: MarkerType.ArrowClosed, color: "var(--edge-default-color)" }
const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "canvasEdge",
  data: { label: "" },
  markerEnd: EDGE_MARKER_END,
}

// markerEnd round-trips through Liveblocks Storage as a freshly deserialized
// object every time, so it never `===` EDGE_MARKER_END even once already
// promoted — compare fields instead, or the promotion effect below would
// re-fire (and re-write Storage) forever.
function hasCanvasMarkerEnd(markerEnd: CanvasEdge["markerEnd"]) {
  return (
    typeof markerEnd === "object" &&
    markerEnd !== null &&
    markerEnd.type === EDGE_MARKER_END.type &&
    markerEnd.color === EDGE_MARKER_END.color
  )
}

const ZOOM_DURATION = 200

export interface CanvasHandle {
  importTemplate: (template: CanvasTemplate) => void
}

const CanvasContent = forwardRef<CanvasHandle>(function CanvasContent(_props, ref) {
  const reactFlowInstance = useReactFlow()
  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = reactFlowInstance
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNode, CanvasEdge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })
  const wrapperRef = useRef<HTMLDivElement>(null)
  const dropCounterRef = useRef(0)
  const room = useRoom()

  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  useKeyboardShortcuts({ reactFlowInstance, undo, redo })

  const nodesRef = useRef(nodes)
  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])
  const edgesRef = useRef(edges)
  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  // useLiveblocksFlow's onConnect builds new edges with @xyflow/react's plain
  // `addEdge`, which doesn't apply defaultEdgeOptions — so a freshly connected
  // edge has no type/data yet. Promote it to the custom canvas edge as soon as
  // it shows up, through the same collaborative edge data flow as label edits.
  useEffect(() => {
    const needsPromotion = edges.filter(
      (edge) => edge.type !== "canvasEdge" || !hasCanvasMarkerEnd(edge.markerEnd)
    )
    if (needsPromotion.length === 0) return
    onEdgesChange(
      needsPromotion.map((edge) => ({
        type: "replace",
        id: edge.id,
        item: {
          ...edge,
          type: "canvasEdge",
          data: { label: edge.data?.label ?? "" },
          markerEnd: EDGE_MARKER_END,
        },
      }))
    )
  }, [edges, onEdgesChange])

  const updateNodeLabel = useCallback(
    (id: string, label: string) => {
      const node = nodesRef.current.find((candidate) => candidate.id === id)
      if (!node) return
      onNodesChange([{ type: "replace", id, item: { ...node, data: { ...node.data, label } } }])
    },
    [onNodesChange]
  )
  const updateNodeColor = useCallback(
    (id: string, color: NodeColor) => {
      const node = nodesRef.current.find((candidate) => candidate.id === id)
      if (!node) return
      onNodesChange([{ type: "replace", id, item: { ...node, data: { ...node.data, color } } }])
    },
    [onNodesChange]
  )
  const nodeActions = useMemo(
    () => ({ updateNodeLabel, updateNodeColor }),
    [updateNodeLabel, updateNodeColor]
  )

  const updateEdgeLabel = useCallback(
    (id: string, label: string) => {
      const edge = edgesRef.current.find((candidate) => candidate.id === id)
      if (!edge) return
      onEdgesChange([{ type: "replace", id, item: { ...edge, data: { ...edge.data, label } } }])
    },
    [onEdgesChange]
  )
  const edgeActions = useMemo(() => ({ updateEdgeLabel }), [updateEdgeLabel])

  const createShapeNode = useCallback(
    (payload: ShapeDragPayload, position: { x: number; y: number }) => {
      dropCounterRef.current += 1
      const newNode: CanvasNode = {
        id: `${payload.shape}-${Date.now()}-${dropCounterRef.current}-${crypto.randomUUID()}`,
        type: "canvasNode",
        position,
        width: payload.width,
        height: payload.height,
        data: { label: "", color: "default", shape: payload.shape },
      }

      onNodesChange([{ type: "add", item: newNode }])
    },
    [onNodesChange]
  )

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
      const flowCenter = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const position = {
        x: flowCenter.x - payload.width / 2,
        y: flowCenter.y - payload.height / 2,
      }
      createShapeNode(payload, position)
    },
    [createShapeNode, screenToFlowPosition]
  )

  const handleShapeSelect = useCallback(
    (shape: NodeShape) => {
      const rect = wrapperRef.current?.getBoundingClientRect()
      const center = rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      const flowCenter = screenToFlowPosition(center)
      const { width, height } = DEFAULT_SHAPE_SIZE[shape]
      const position = { x: flowCenter.x - width / 2, y: flowCenter.y - height / 2 }
      createShapeNode({ shape, width, height }, position)
    },
    [createShapeNode, screenToFlowPosition]
  )

  const importTemplate = useCallback(
    (template: CanvasTemplate) => {
      // Template nodes/edges carry template-local ids — remap them to fresh,
      // cross-client-unique ids on import (same reasoning as createShapeNode's
      // ids: two clients importing at once must not collide).
      const idMap = new Map<string, string>()
      const newNodes: CanvasNode[] = template.nodes.map((node) => {
        const id = `${node.id}-${crypto.randomUUID()}`
        idMap.set(node.id, id)
        return { ...node, id }
      })
      const newEdges: CanvasEdge[] = template.edges.map((edge) => ({
        ...edge,
        id: `${edge.id}-${crypto.randomUUID()}`,
        source: idMap.get(edge.source) ?? edge.source,
        target: idMap.get(edge.target) ?? edge.target,
      }))

      // Each of onNodesChange/onEdgesChange is itself a Liveblocks mutation
      // (its own room.batch under the hood) — without an outer batch here,
      // the clear-and-replace would land as two separate history entries and
      // remote clients would briefly see the new nodes with no edges yet.
      room.batch(() => {
        onNodesChange([
          ...nodesRef.current.map((node) => ({ type: "remove" as const, id: node.id })),
          ...newNodes.map((item) => ({ type: "add" as const, item })),
        ])
        onEdgesChange([
          ...edgesRef.current.map((edge) => ({ type: "remove" as const, id: edge.id })),
          ...newEdges.map((item) => ({ type: "add" as const, item })),
        ])
      })

      requestAnimationFrame(() => fitView({ duration: ZOOM_DURATION }))
    },
    [fitView, onEdgesChange, onNodesChange, room]
  )

  useImperativeHandle(ref, () => ({ importTemplate }), [importTemplate])

  return (
    <div
      ref={wrapperRef}
      className="relative flex-1 bg-base"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <NodeActionsContext.Provider value={nodeActions}>
        <EdgeActionsContext.Provider value={edgeActions}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDelete={onDelete}
            connectionMode={ConnectionMode.Loose}
            fitView
          >
            <Cursors />
            <Background variant={BackgroundVariant.Dots} />
            <Panel position="bottom-center">
              <ShapePanel onShapeSelect={handleShapeSelect} />
            </Panel>
            <Panel position="bottom-left">
              <CanvasControlBar
                onZoomIn={() => zoomIn({ duration: ZOOM_DURATION })}
                onZoomOut={() => zoomOut({ duration: ZOOM_DURATION })}
                onFitView={() => fitView({ duration: ZOOM_DURATION })}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
              />
            </Panel>
          </ReactFlow>
        </EdgeActionsContext.Provider>
      </NodeActionsContext.Provider>
    </div>
  )
})

export const Canvas = forwardRef<CanvasHandle>(function Canvas(_props, ref) {
  return (
    <ReactFlowProvider>
      <CanvasContent ref={ref} />
    </ReactFlowProvider>
  )
})
