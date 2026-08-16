import { Lock } from "lucide-react"
import Link from "next/link"

export function AccessDenied() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-base px-4 text-center">
      <Lock className="size-8 text-copy-muted" />
      <p className="text-sm text-copy-muted">
        You don&apos;t have access to this project.
      </p>
      <Link href="/editor" className="text-sm text-brand hover:underline">
        Back to editor
      </Link>
    </div>
  )
}
