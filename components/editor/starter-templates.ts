import { DEFAULT_SHAPE_SIZE, type CanvasEdge, type CanvasNode, type NodeColor, type NodeShape } from "@/types/canvas"

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

function templateEdge(id: string, source: string, target: string, label = ""): CanvasEdge {
  return {
    id,
    type: "canvasEdge",
    source,
    target,
    data: { label },
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
    templateEdge("client-gateway", "client", "gateway"),
    templateEdge("gateway-auth", "gateway", "auth-service"),
    templateEdge("gateway-orders", "gateway", "orders-service"),
    templateEdge("gateway-inventory", "gateway", "inventory-service"),
    templateEdge("auth-authdb", "auth-service", "auth-db"),
    templateEdge("orders-ordersdb", "orders-service", "orders-db"),
    templateEdge("inventory-inventorydb", "inventory-service", "inventory-db"),
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
    templateEdge("commit-build", "commit", "build"),
    templateEdge("build-test", "build", "test"),
    templateEdge("test-gate", "test", "gate"),
    templateEdge("gate-staging", "gate", "staging", "on merge"),
    templateEdge("gate-production", "gate", "production", "on release"),
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
    templateEdge("producer-a-broker", "producer-a", "broker", "publish"),
    templateEdge("producer-b-broker", "producer-b", "broker", "publish"),
    templateEdge("broker-consumer-a", "broker", "consumer-a", "subscribe"),
    templateEdge("broker-consumer-b", "broker", "consumer-b", "subscribe"),
    templateEdge("broker-consumer-c", "broker", "consumer-c", "subscribe"),
  ],
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [microservices, cicdPipeline, eventDriven]
