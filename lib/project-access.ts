import { currentUser } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"
import type { Project } from "@/app/generated/prisma/client"

export interface ProjectIdentity {
  userId: string
  email: string | null
}

export async function getCurrentIdentity(userId: string): Promise<ProjectIdentity> {
  const user = await currentUser()
  const primaryEmail = user?.primaryEmailAddress
  const email =
    primaryEmail?.verification?.status === "verified"
      ? primaryEmail.emailAddress.toLowerCase()
      : null

  return { userId, email }
}

export type ProjectAccessCheckResult =
  | { status: "ok"; project: Project; isOwner: boolean }
  | { status: "not_found" }

export async function checkProjectAccess(
  projectId: string,
  identity: ProjectIdentity,
): Promise<ProjectAccessCheckResult> {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return { status: "not_found" }

  if (project.ownerId === identity.userId) {
    return { status: "ok", project, isOwner: true }
  }

  const collaborator = identity.email
    ? await prisma.projectCollaborator.findUnique({
        where: { projectId_email: { projectId, email: identity.email } },
      })
    : null

  if (!collaborator) return { status: "not_found" }

  return { status: "ok", project, isOwner: false }
}

type ProjectOwnerAuthResult =
  | { status: "ok"; project: Project }
  | { status: "not_found" }
  | { status: "forbidden" }

export async function authorizeProjectOwner(
  projectId: string,
  userId: string,
): Promise<ProjectOwnerAuthResult> {
  const project = await prisma.project.findUnique({ where: { id: projectId } })

  if (!project) return { status: "not_found" }
  if (project.ownerId !== userId) return { status: "forbidden" }

  return { status: "ok", project }
}
