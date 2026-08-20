"use client"

import { useMemo } from "react"
import { UserButton, useUser } from "@clerk/nextjs"
import { useOthers } from "@liveblocks/react"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"

const MAX_VISIBLE_COLLABORATORS = 5

interface Collaborator {
  id: string
  name: string
  avatar: string
  color: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

export function CanvasPresence() {
  const { user } = useUser()
  const others = useOthers()

  const collaborators = useMemo<Collaborator[]>(() => {
    const seen = new Set<string>()
    const list: Collaborator[] = []
    for (const other of others) {
      if (!other.id || other.id === user?.id || seen.has(other.id)) continue
      seen.add(other.id)
      list.push({
        id: other.id,
        name: other.info?.name ?? "Anonymous",
        avatar: other.info?.avatar ?? "",
        color: other.info?.color ?? "var(--accent-primary)",
      })
    }
    return list
  }, [others, user?.id])

  const visibleCollaborators = collaborators.slice(0, MAX_VISIBLE_COLLABORATORS)
  const overflowCount = collaborators.length - visibleCollaborators.length

  return (
    <div className="flex items-center gap-2 rounded-full border border-surface-border bg-surface/90 p-1 shadow-lg backdrop-blur">
      {collaborators.length > 0 && (
        <>
          <AvatarGroup>
            {visibleCollaborators.map((collaborator) => (
              <Avatar key={collaborator.id} title={collaborator.name}>
                {collaborator.avatar && (
                  <AvatarImage src={collaborator.avatar} alt={collaborator.name} />
                )}
                <AvatarFallback
                  className="text-white"
                  style={{ backgroundColor: collaborator.color }}
                >
                  {getInitials(collaborator.name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {overflowCount > 0 && <AvatarGroupCount>+{overflowCount}</AvatarGroupCount>}
          </AvatarGroup>
          <div className="h-6 w-px bg-surface-border" aria-hidden="true" />
        </>
      )}
      <UserButton appearance={{ elements: { userButtonAvatarBox: "size-8" } }} />
    </div>
  )
}
