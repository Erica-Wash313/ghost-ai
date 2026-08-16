"use client"

import {
  FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  Check,
  Link2,
  Loader2,
  Mail,
  Trash2,
  UserRound,
} from "lucide-react"

import { EditorDialog } from "@/components/editor/editor-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Collaborator, ProjectOwner } from "@/types/collaborator"
import type { Project } from "@/types/project"

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
}

interface CollaboratorsResponse {
  owner: ProjectOwner
  collaborators: Collaborator[]
}

async function getErrorMessage(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null)

  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "string"
  ) {
    return (body as { error: string }).error
  }

  return fallback
}

export function ShareDialog({ open, onOpenChange, project }: ShareDialogProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [owner, setOwner] = useState<ProjectOwner | null>(null)
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isInviting, setIsInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return

    const controller = new AbortController()
    void fetch(`/api/projects/${project.id}/collaborators`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            await getErrorMessage(response, "Couldn't load collaborators"),
          )
        }

        return (await response.json()) as CollaboratorsResponse
      })
      .then((data) => {
        setOwner(data.owner)
        setCollaborators(data.collaborators)
        setError(null)
      })
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Couldn't load collaborators",
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [open, project.id])

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
    }
  }, [])

  async function inviteCollaborator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) return

    setIsInviting(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${project.id}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      })

      if (!response.ok) {
        setError(await getErrorMessage(response, "Couldn't invite collaborator"))
        return
      }

      const data = (await response.json()) as { collaborator: Collaborator }
      setCollaborators((current) => [...current, data.collaborator])
      setEmail("")
    } catch {
      setError("Couldn't invite collaborator")
    } finally {
      setIsInviting(false)
    }
  }

  async function removeCollaborator(collaboratorId: string) {
    setRemovingId(collaboratorId)
    setError(null)

    try {
      const response = await fetch(
        `/api/projects/${project.id}/collaborators/${collaboratorId}`,
        { method: "DELETE" },
      )

      if (!response.ok) {
        setError(await getErrorMessage(response, "Couldn't remove collaborator"))
        return
      }

      setCollaborators((current) =>
        current.filter((collaborator) => collaborator.id !== collaboratorId),
      )
    } catch {
      setError("Couldn't remove collaborator")
    } finally {
      setRemovingId(null)
    }
  }

  async function copyProjectLink() {
    const projectUrl = `${window.location.origin}/editor/${project.id}`

    try {
      await navigator.clipboard.writeText(projectUrl)
      setCopied(true)
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Couldn't copy the project link")
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setEmail("")
      setError(null)
      setCopied(false)
    }

    onOpenChange(nextOpen)
  }

  const activeCollaborators = collaborators.filter(
    (collaborator) => collaborator.status === "active",
  )
  const invitedCollaborators = collaborators.filter(
    (collaborator) => collaborator.status === "invited",
  )
  const peopleWithAccessCount = (owner ? 1 : 0) + activeCollaborators.length

  return (
    <EditorDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={<span className="text-xl text-copy-primary">Share Project</span>}
      description={
        project.isOwner
          ? "Invite people to collaborate on this workspace."
          : "People who currently have access to this workspace."
      }
      contentClassName="max-h-[calc(100vh-2rem)] overflow-y-auto p-6 sm:max-w-2xl"
    >
      <div className="flex flex-col gap-6">
        {project.isOwner ? (
          <section
            className="flex flex-col gap-4 rounded-2xl border border-surface-border-subtle bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
            aria-labelledby="project-link-title"
          >
            <div className="min-w-0">
              <h3
                id="project-link-title"
                className="text-sm font-semibold text-copy-primary"
              >
                Project link
              </h3>
              <p className="mt-1 truncate text-sm text-copy-muted">
                /editor/{project.id}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0 gap-2 rounded-xl"
              onClick={copyProjectLink}
            >
              {copied ? (
                <Check className="size-4 text-success" />
              ) : (
                <Link2 className="size-4" />
              )}
              <span aria-live="polite">{copied ? "Copied!" : "Copy link"}</span>
            </Button>
          </section>
        ) : null}

        {project.isOwner ? (
          <form
            className="flex gap-3 rounded-2xl border border-surface-border-subtle bg-surface p-4"
            onSubmit={inviteCollaborator}
          >
            <div className="relative min-w-0 flex-1">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-copy-muted" />
              <Input
                type="email"
                aria-label="Collaborator email"
                placeholder="collaborator@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 rounded-xl pl-9 text-copy-primary"
                disabled={isInviting || isLoading}
                required
              />
            </div>
            <Button
              type="submit"
              className="h-10 rounded-xl px-4"
              disabled={isInviting || isLoading || !email.trim()}
            >
              {isInviting && <Loader2 className="size-4 animate-spin" />}
              Invite
            </Button>
          </form>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-surface-border px-4 py-10 text-sm text-copy-muted">
            <Loader2 className="size-4 animate-spin" />
            Loading collaborators
          </div>
        ) : (
          <div className="flex max-h-[22rem] flex-col gap-6 overflow-y-auto pr-1">
            <AccessSection
              title="People with access"
              count={peopleWithAccessCount}
            >
              {owner ? (
                <PersonRow
                  person={owner}
                  role="owner"
                  canRemove={false}
                  removingId={removingId}
                  onRemove={removeCollaborator}
                />
              ) : null}
              {activeCollaborators.map((collaborator) => (
                <PersonRow
                  key={collaborator.id}
                  person={collaborator}
                  role="collaborator"
                  canRemove={project.isOwner}
                  removingId={removingId}
                  onRemove={removeCollaborator}
                />
              ))}
            </AccessSection>

            <AccessSection
              title="Invited people"
              count={invitedCollaborators.length}
            >
              {invitedCollaborators.length === 0 ? (
                <p className="rounded-2xl border border-surface-border bg-surface px-4 py-6 text-center text-sm text-copy-muted">
                  No collaborators yet
                </p>
              ) : (
                invitedCollaborators.map((collaborator) => (
                  <PersonRow
                    key={collaborator.id}
                    person={collaborator}
                    role="invited"
                    canRemove={project.isOwner}
                    removingId={removingId}
                    onRemove={removeCollaborator}
                  />
                ))
              )}
            </AccessSection>
          </div>
        )}

        {error ? <p className="text-sm text-error">{error}</p> : null}
      </div>
    </EditorDialog>
  )
}

interface AccessSectionProps {
  title: string
  count: number
  children: ReactNode
}

function AccessSection({ title, count, children }: AccessSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-copy-primary">{title}</h3>
        <span className="text-xs text-copy-muted">{count} total</span>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

type PersonRole = "owner" | "collaborator" | "invited"

interface PersonRowProps {
  person: ProjectOwner | Collaborator
  role: PersonRole
  canRemove: boolean
  removingId: string | null
  onRemove: (personId: string) => void
}

function PersonRow({
  person,
  role,
  canRemove,
  removingId,
  onRemove,
}: PersonRowProps) {
  const label = person.displayName ?? person.email ?? "Project owner"

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface px-4 py-3">
      <Avatar size="lg">
        {person.imageUrl ? (
          <AvatarImage src={person.imageUrl} alt={label} />
        ) : null}
        <AvatarFallback>
          {role === "invited" ? (
            <Mail className="size-4" />
          ) : (
            <UserRound className="size-4" />
          )}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-copy-primary">
            {label}
          </p>
          <RoleBadge role={role} />
        </div>
        {person.email && person.displayName ? (
          <p className="mt-0.5 truncate text-xs text-copy-muted">
            {person.email}
          </p>
        ) : null}
      </div>
      {canRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${label}`}
          onClick={() => onRemove(person.id)}
          disabled={removingId !== null}
          className="text-copy-muted hover:text-error"
        >
          {removingId === person.id ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
        </Button>
      ) : null}
    </div>
  )
}

function RoleBadge({ role }: { role: PersonRole }) {
  const className =
    role === "owner"
      ? "border-brand/30 bg-accent-dim text-brand"
      : role === "invited"
        ? "border-warning/30 bg-warning/10 text-warning"
        : "border-surface-border-subtle bg-elevated text-copy-secondary"

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${className}`}
    >
      {role}
    </span>
  )
}
