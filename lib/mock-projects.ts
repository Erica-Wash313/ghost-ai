import type { Project } from "@/types/project"

export const MOCK_PROJECTS: Project[] = [
  { id: "1", name: "Checkout Service", slug: "checkout-service", isOwner: true },
  { id: "2", name: "Event Ingestion Pipeline", slug: "event-ingestion-pipeline", isOwner: true },
  { id: "3", name: "Payments Gateway", slug: "payments-gateway", isOwner: false },
]
