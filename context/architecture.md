# Architecture Context

## Stack

| Layer             | Technology               | Role                                                            |
| ------------------ | -------------------------- | ------------------------------------------------------------------ |
| Framework         | Next.js 16 + TypeScript   | Full-stack app with server/client boundaries                    |
| UI                | Tailwind + shadcn/ui       | Component composition and styling                                |
| Auth              | Clerk                      | User identity and route protection                               |
| Database          | Prisma + PostgreSQL        | Relational metadata: projects, collaborators, specs, task runs   |
| Canvas            | Liveblocks + React Flow    | Real-time collaborative canvas, presence, and cursors             |
| Background tasks  | Trigger.dev                | Durable AI generation workflows                                  |
| Artifact storage  | Vercel Blob                | Canvas snapshots and generated Markdown specs                    |

## System Boundaries

- `app/api` — Authenticated request handlers: input validation, ownership checks, task triggering, and persistence.
- `trigger` — Long-running background jobs: AI design generation and spec generation.
- `lib` — Shared infrastructure: Prisma client, access control helpers, and utilities.
- `components` — UI composition: canvas surfaces, sidebars, dialogs, and interactive elements.
- `prisma` — Database schema and generated client output.
- `data` — Legacy local directory. Not used for new artifacts.

## Storage Model

- **Database**: metadata, ownership, relationships, and task run records.
- **Vercel Blob**: generated artifacts — canvas snapshots at `canvas/{projectId}.json` (single mutable artifact, written only by Liveblocks snapshot export on room persistence or explicit export request) and specs at `specs/{projectId}/{specId}.md` (immutable, one per spec generation).
- **Canvas snapshot management**: The canonical snapshot `canvas/{projectId}.json` is updated only by authenticated room-export operations and includes a revision identifier (or version field) for concurrent save conflict detection. Concurrent saves and retries check the stored snapshot's revision before committing; if the stored revision is newer, the write is rejected to prevent overwriting newer canvas state. On restore, the stored snapshot's revision is always authoritative — it is loaded directly into the Liveblocks room at initialization.
- Project records, spec records, and task run records belong in PostgreSQL.
- Canvas content and Markdown output are stored in and retrieved from Vercel Blob.
- The blob URL is stored in the database (`canvasJsonPath`, `filePath`) as the reference to the artifact.
- **Artifact Access Control**: Vercel Blob artifacts are kept private; they are exposed only through authenticated routes that verify project membership before serving, or through time-limited signed URLs issued only after membership verification. Stored blob references in the database are not directly readable or accessible without authorization.

## Auth and Collaboration Model

- Every project has a single owner (Clerk user ID).
- Projects can include additional collaborators.
- Only authenticated users can access protected routes.
- **Owner-only mutations** (require ownership verification): project settings, project deletion, and collaborator membership management (adding/removing collaborators).
- **Collaborator-permitted mutations** (require membership verification): canvas edits (node/edge operations), design generation requests, and spec generation requests. Collaborator edits to the canvas are applied through the shared Liveblocks room and do not require direct ownership checks.
- Liveblocks room tokens are issued only after verifying the requesting user is an authenticated member (owner or collaborator) of the target project.

## Starter System Designs

- Prebuilt templates are static canvas snapshots stored in the codebase.
- Templates are loaded into the active Liveblocks room when a user imports one.
- Import can occur on canvas creation (empty room) or from within the editor at any time. When importing into a non-empty room, the import is treated as a merge: existing collaborator edits are preserved, imported node IDs are remapped to avoid collisions, and all edge references are updated to point to the remapped node IDs, ensuring no duplicate nodes or edges are created.
- Template data follows the same node/edge schema as user-created canvas content.
- Templates do not require a separate database record; they are resolved by template ID at import time.

## AI Generation Model

### Design Generation

- Input: user prompt, project context, and current canvas state.
- Execution: durable background task via Trigger.dev with revision-aware, idempotent updates: each task includes a base canvas revision, a unique operation ID for retry deduplication, and explicit append, merge, or replace semantics to prevent delayed tasks from overwriting newer edits or duplicating nodes and edges.
- Output: structured node and edge updates written into the shared Liveblocks room.

### Spec Generation

- Input: current canvas graph, project context, and current canvas revision identifier.
- Execution: durable background task via Trigger.dev.
- Output: Markdown technical spec saved to Vercel Blob at `specs/{projectId}/{specId}.md` with canvas revision metadata persisted in the database alongside the spec record. Stale-result policy: reject specs whose source canvas revision is no longer current, or explicitly expose them as historical artifacts in the UI while retaining their revision metadata for transparency.

## Invariants

1. Request handlers do not run long-lived AI work — that belongs in background tasks.
2. Metadata and large generated artifacts are stored in separate layers.
3. Auth and ownership are enforced at every mutation boundary.
4. Client components are used only where browser interactivity or real-time state requires them.
5. The canvas schema must remain consistent between user-created content and imported templates.
