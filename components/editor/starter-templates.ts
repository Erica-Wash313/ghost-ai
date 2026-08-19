import { MarkerType, Position } from "@xyflow/react"

import { DEFAULT_SHAPE_SIZE, type CanvasEdge, type CanvasNode, type NodeColor, type NodeShape } from "@/types/canvas"

// Matches canvas.tsx's EDGE_MARKER_END — kept local since importing it back
// from canvas.tsx (a "use client" component) would create a circular import.
const EDGE_MARKER_END = { type: MarkerType.ArrowClosed, color: "var(--edge-default-color)" }

export interface CanvasTemplate {
  id: string
  name: string
  description: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

// Template-local ids only need to be unique within one template — canvas.tsx
// remaps them to fresh ids on import, so different templates can safely reuse
// ids like "client" or "db".
function templateNode(
  id: string,
  label: string,
  shape: NodeShape,
  color: NodeColor,
  x: number,
  y: number
): CanvasNode {
  const { width, height } = DEFAULT_SHAPE_SIZE[shape]
  return {
    id,
    type: "canvasNode",
    position: { x, y },
    width,
    height,
    data: { label, color, shape },
  }
}

// sourceHandle/targetHandle are required, not optional: canvas-node.tsx
// registers four same-type ("source") handles per node, so React Flow's
// default handle resolution (used whenever an edge omits them) just picks
// the first one registered ("top") for both ends, regardless of where the
// nodes actually sit — every edge would render as a top-to-top stub.
function templateEdge(
  id: string,
  source: string,
  sourceHandle: Position,
  target: string,
  targetHandle: Position,
  label = ""
): CanvasEdge {
  return {
    id,
    type: "canvasEdge",
    source,
    sourceHandle,
    target,
    targetHandle,
    data: { label },
    markerEnd: EDGE_MARKER_END,
  }
}

const microservices: CanvasTemplate = {
  id: "microservices",
  name: "Microservices",
  description: "An API gateway routing to independent services backed by their own datastores.",
  nodes: [
    templateNode("client", "Client", "circle", "default", 320, 0),
    templateNode("gateway", "API Gateway", "hexagon", "blue", 300, 140),
    templateNode("auth-service", "Auth Service", "rectangle", "purple", 60, 300),
    templateNode("orders-service", "Orders Service", "rectangle", "purple", 260, 300),
    templateNode("inventory-service", "Inventory Service", "rectangle", "purple", 460, 300),
    templateNode("auth-db", "Auth DB", "cylinder", "teal", 60, 460),
    templateNode("orders-db", "Orders DB", "cylinder", "teal", 260, 460),
    templateNode("inventory-db", "Inventory DB", "cylinder", "teal", 460, 460),
  ],
  edges: [
    templateEdge("client-gateway", "client", Position.Bottom, "gateway", Position.Top),
    templateEdge("gateway-auth", "gateway", Position.Bottom, "auth-service", Position.Top),
    templateEdge("gateway-orders", "gateway", Position.Bottom, "orders-service", Position.Top),
    templateEdge("gateway-inventory", "gateway", Position.Bottom, "inventory-service", Position.Top),
    templateEdge("auth-authdb", "auth-service", Position.Bottom, "auth-db", Position.Top),
    templateEdge("orders-ordersdb", "orders-service", Position.Bottom, "orders-db", Position.Top),
    templateEdge(
      "inventory-inventorydb",
      "inventory-service",
      Position.Bottom,
      "inventory-db",
      Position.Top
    ),
  ],
}

const cicdPipeline: CanvasTemplate = {
  id: "cicd-pipeline",
  name: "CI/CD Pipeline",
  description: "A commit-to-deploy pipeline with build, test, and staged rollout gates.",
  nodes: [
    templateNode("commit", "Git Commit", "circle", "default", 0, 120),
    templateNode("build", "Build", "rectangle", "blue", 200, 120),
    templateNode("test", "Test Suite", "rectangle", "orange", 400, 120),
    templateNode("gate", "Approval Gate", "diamond", "pink", 600, 100),
    templateNode("staging", "Deploy to Staging", "pill", "green", 820, 20),
    templateNode("production", "Deploy to Production", "pill", "red", 820, 200),
  ],
  edges: [
    templateEdge("commit-build", "commit", Position.Right, "build", Position.Left),
    templateEdge("build-test", "build", Position.Right, "test", Position.Left),
    templateEdge("test-gate", "test", Position.Right, "gate", Position.Left),
    templateEdge("gate-staging", "gate", Position.Right, "staging", Position.Left, "on merge"),
    templateEdge("gate-production", "gate", Position.Right, "production", Position.Left, "on release"),
  ],
}

const eventDriven: CanvasTemplate = {
  id: "event-driven",
  name: "Event-Driven System",
  description: "Producers publish events onto a broker consumed by independent handlers.",
  nodes: [
    templateNode("producer-a", "Order Service", "rectangle", "blue", 0, 40),
    templateNode("producer-b", "Payment Service", "rectangle", "blue", 0, 220),
    templateNode("broker", "Event Broker", "hexagon", "purple", 260, 130),
    templateNode("consumer-a", "Notification Handler", "rectangle", "green", 540, 0),
    templateNode("consumer-b", "Analytics Handler", "rectangle", "green", 540, 140),
    templateNode("consumer-c", "Audit Log", "cylinder", "teal", 540, 300),
  ],
  edges: [
    templateEdge("producer-a-broker", "producer-a", Position.Right, "broker", Position.Left, "publish"),
    templateEdge("producer-b-broker", "producer-b", Position.Right, "broker", Position.Left, "publish"),
    templateEdge("broker-consumer-a", "broker", Position.Right, "consumer-a", Position.Left, "subscribe"),
    templateEdge("broker-consumer-b", "broker", Position.Right, "consumer-b", Position.Left, "subscribe"),
    templateEdge("broker-consumer-c", "broker", Position.Right, "consumer-c", Position.Left, "subscribe"),
  ],
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [microservices, cicdPipeline, eventDriven]
