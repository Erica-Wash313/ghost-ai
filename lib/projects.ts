import { prisma } from "@/lib/prisma"
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access"
import type { Project as PrismaProject } from "@/app/generated/prisma/client"
import type { Project } from "@/types/project"

export interface ProjectLists {
  owned: Project[]
  shared: Project[]
}

export type ProjectForUserResult =
  | { status: "ok"; project: Project }
  | { status: "not_found" }

function toProject(project: PrismaProject, isOwner: boolean): Project {
  return { id: project.id, name: project.name, isOwner }
}

export async function getProjectsForUser(userId: string): Promise<ProjectLists> {
  const { email } = await getCurrentIdentity(userId)

  const [owned, collaborations] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
    }),
    email
      ? prisma.projectCollaborator.findMany({
          where: { email },
          include: { project: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ])

  return {
    owned: owned.map((project) => toProject(project, true)),
    shared: collaborations.map((collaborator) => toProject(collaborator.project, false)),
  }
}

export async function getProjectForUser(
  userId: string,
  projectId: string,
): Promise<ProjectForUserResult> {
  const identity = await getCurrentIdentity(userId)
  const access = await checkProjectAccess(projectId, identity)

  if (access.status === "not_found") return { status: "not_found" }

  return { status: "ok", project: toProject(access.project, access.isOwner) }
}
