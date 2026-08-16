import { Loader2 } from "lucide-react"

import { EditorDialog } from "@/components/editor/editor-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { UseProjectActionsReturn } from "@/hooks/use-project-actions"

type ProjectDialogsProps = Pick<
  UseProjectActionsReturn,
  | "dialog"
  | "name"
  | "setName"
  | "roomId"
  | "isLoading"
  | "error"
  | "close"
  | "submitCreate"
  | "submitRename"
  | "submitDelete"
>

export function ProjectDialogs({
  dialog,
  name,
  setName,
  roomId,
  isLoading,
  error,
  close,
  submitCreate,
  submitRename,
  submitDelete,
}: ProjectDialogsProps) {
  return (
    <>
      <EditorDialog
        open={dialog?.type === "create"}
        onOpenChange={(open) => {
          if (!open) close()
        }}
        title={
          <span className="text-xl text-copy-primary">New Project</span>
        }
        description="Give your project a name to get started."
        footer={
          <Button
            onClick={submitCreate}
            disabled={!name.trim() || isLoading}
          >
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            Create project
          </Button>
        }
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="create-project-name"
            className="text-sm text-copy-secondary"
          >
            Project name
          </label>
          <Input
            id="create-project-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="My architecture project"
            className="text-copy-primary"
          />
          <p className="text-sm text-copy-muted">{roomId}</p>
          {dialog?.type === "create" && error ? (
            <p className="text-sm text-error">{error}</p>
          ) : null}
        </div>
      </EditorDialog>

      <EditorDialog
        open={dialog?.type === "rename"}
        onOpenChange={(open) => {
          if (!open) close()
        }}
        title={
          <span className="text-xl text-copy-primary">Rename Project</span>
        }
        description={
          dialog?.type === "rename"
            ? `Renaming "${dialog.project.name}".`
            : undefined
        }
        footer={
          <Button
            onClick={submitRename}
            disabled={!name.trim() || isLoading}
          >
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        }
      >
        <div className="flex flex-col gap-2">
          <Input
            id="project-name-input"
            autoFocus
            aria-label="Project name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitRename()
            }}
            className="text-copy-primary"
          />
          {dialog?.type === "rename" && error ? (
            <p className="text-sm text-error">{error}</p>
          ) : null}
        </div>
      </EditorDialog>

      <EditorDialog
        open={dialog?.type === "delete"}
        onOpenChange={(open) => {
          if (!open) close()
        }}
        title={
          <span className="text-xl text-copy-primary">Delete Project</span>
        }
        description={
          dialog?.type === "delete"
            ? `This will permanently delete "${dialog.project.name}". This cannot be undone.`
            : undefined
        }
        footer={
          <Button
            variant="destructive"
            onClick={submitDelete}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            Delete project
          </Button>
        }
      >
        {dialog?.type === "delete" && error ? (
          <p className="text-sm text-error">{error}</p>
        ) : null}
      </EditorDialog>
    </>
  )
}
