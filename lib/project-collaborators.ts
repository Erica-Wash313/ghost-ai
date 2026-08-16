import { clerkClient } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"
import type { Collaborator, ProjectOwner } from "@/types/collaborator"

const CLERK_EMAIL_BATCH_SIZE = 100

interface ClerkUserProfile {
  readonly fullName: string | null
  readonly username: string | null
  readonly imageUrl: string
  readonly primaryEmailAddress: { readonly emailAddress: string } | null
  readonly emailAddresses: ReadonlyArray<{ readonly emailAddress: string }>
}

export interface ProjectAccessList {
  owner: ProjectOwner
  collaborators: Collaborator[]
}

function chunkEmails(emails: string[]): string[][] {
  const chunks: string[][] = []

  for (let index = 0; index < emails.length; index += CLERK_EMAIL_BATCH_SIZE) {
    chunks.push(emails.slice(index, index + CLERK_EMAIL_BATCH_SIZE))
  }

  return chunks
}

function getUserByEmail(
  users: ClerkUserProfile[],
): Map<string, ClerkUserProfile> {
  const usersByEmail = new Map<string, ClerkUserProfile>()

  for (const user of users) {
    for (const emailAddress of user.emailAddresses) {
      usersByEmail.set(emailAddress.emailAddress.toLowerCase(), user)
    }
  }

  return usersByEmail
}

async function getClerkUsersByEmail(
  emails: string[],
): Promise<Map<string, ClerkUserProfile>> {
  if (emails.length === 0) return new Map()

  try {
    const client = await clerkClient()
    const responses = await Promise.all(
      chunkEmails(emails).map((emailBatch) =>
        client.users.getUserList({
          emailAddress: emailBatch,
          limit: CLERK_EMAIL_BATCH_SIZE,
        }),
      ),
    )

    return getUserByEmail(responses.flatMap((response) => response.data))
  } catch {
    // Clerk enrichment is optional. Database-backed access remains available
    // even when the Backend API is temporarily unavailable.
    return new Map()
  }
}

async function getProjectOwner(ownerId: string): Promise<ProjectOwner> {
  try {
    const client = await clerkClient()
    const user: ClerkUserProfile = await client.users.getUser(ownerId)

    return {
      id: ownerId,
      email:
        user.primaryEmailAddress?.emailAddress.toLowerCase() ??
        user.emailAddresses[0]?.emailAddress.toLowerCase() ??
        null,
      displayName: user.fullName ?? user.username ?? null,
      imageUrl: user.imageUrl,
    }
  } catch {
    return {
      id: ownerId,
      email: null,
      displayName: null,
      imageUrl: null,
    }
  }
}

export async function getProjectCollaborators(
  projectId: string,
): Promise<Collaborator[]> {
  const records = await prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  })
  const usersByEmail = await getClerkUsersByEmail(
    records.map((record) => record.email),
  )

  return records.map((record) => {
    const user = usersByEmail.get(record.email.toLowerCase())

    return {
      id: record.id,
      email: record.email,
      displayName: user?.fullName ?? user?.username ?? null,
      imageUrl: user?.imageUrl ?? null,
      status: user ? "active" : "invited",
    }
  })
}

export async function getProjectAccessList(
  projectId: string,
  ownerId: string,
): Promise<ProjectAccessList> {
  const [owner, collaborators] = await Promise.all([
    getProjectOwner(ownerId),
    getProjectCollaborators(projectId),
  ])

  return { owner, collaborators }
}
