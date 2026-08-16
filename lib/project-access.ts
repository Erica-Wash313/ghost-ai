import { prisma } from "@/lib/prisma"
import type { Project } from "@/app/generated/prisma/client"

type ProjectAccessResult =
  | { status: "ok"; project: Project }
  | { status: "not_found" }
  | { status: "forbidden" }

export async function authorizeProjectOwner(
  projectId: string,
  userId: string,
): Promise<ProjectAccessResult> {
  const project = await prisma.project.findUnique({ where: { id: projectId } })

  if (!project) return { status: "not_found" }
  if (project.ownerId !== userId) return { status: "forbidden" }

  return { status: "ok", project }
}
