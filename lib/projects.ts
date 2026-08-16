import { currentUser } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"
import type { Project as PrismaProject } from "@/app/generated/prisma/client"
import type { Project } from "@/types/project"

export interface ProjectLists {
  owned: Project[]
  shared: Project[]
}

export type ProjectAccessResult =
  | { status: "ok"; project: Project }
  | { status: "not_found" }

function toProject(project: PrismaProject, isOwner: boolean): Project {
  return { id: project.id, name: project.name, isOwner }
}

async function getVerifiedEmail(): Promise<string | null> {
  const user = await currentUser()
  const primaryEmail = user?.primaryEmailAddress

  if (primaryEmail?.verification?.status !== "verified") return null

  return primaryEmail.emailAddress.toLowerCase()
}

export async function getProjectsForUser(userId: string): Promise<ProjectLists> {
  const email = await getVerifiedEmail()

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
): Promise<ProjectAccessResult> {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return { status: "not_found" }

  if (project.ownerId === userId) {
    return { status: "ok", project: toProject(project, true) }
  }

  const email = await getVerifiedEmail()
  const collaborator = email
    ? await prisma.projectCollaborator.findUnique({
        where: { projectId_email: { projectId, email } },
      })
    : null

  if (!collaborator) return { status: "not_found" }

  return { status: "ok", project: toProject(project, false) }
}
