import { FileText, Network, Share2, Sparkles } from "lucide-react"

import { APP_NAME } from "@/lib/branding"

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Architecture Generation",
    description: "Describe your system, AI maps it to nodes and edges on a live canvas.",
    badgeClassName: "bg-ai/15 text-ai-text",
  },
  {
    icon: Share2,
    title: "Real-time Collaboration",
    description: "Live cursors, presence indicators, and shared node editing across your team.",
    badgeClassName: "bg-accent-dim text-brand",
  },
  {
    icon: FileText,
    title: "Instant Spec Generation",
    description: "Export a complete Markdown technical spec directly from the canvas graph.",
    badgeClassName: "bg-success/15 text-success",
  },
] as const

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full">
      <div className="relative hidden w-1/2 flex-col justify-center gap-16 overflow-hidden bg-surface px-16 py-16 lg:flex">
        <div
          className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-accent-dim blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 -bottom-40 size-96 rounded-full bg-ai/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand">
            <Network className="size-4 text-[var(--bg-base)]" />
          </span>
          <span className="text-sm font-semibold text-copy-primary">{APP_NAME}</span>
        </div>

        <div className="relative flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl leading-tight font-semibold text-copy-primary">
              Design systems at the speed of thought.
            </h1>
            <p className="max-w-md text-base text-copy-muted">
              Describe your architecture in plain English. {APP_NAME} maps it
              to a shared canvas your whole team can refine in real time.
            </p>
          </div>

          <ul className="flex flex-col gap-5">
            {FEATURES.map(({ icon: Icon, title, description, badgeClassName }) => (
              <li key={title} className="flex items-start gap-3">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${badgeClassName}`}
                >
                  <Icon className="size-4" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-copy-primary">{title}</p>
                  <p className="text-sm text-copy-muted">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-copy-faint">
          © 2026 {APP_NAME}. All rights reserved.
        </p>
      </div>

      <div className="flex w-full items-center justify-center bg-base px-6 lg:w-1/2">
        {children}
      </div>
    </div>
  )
}
