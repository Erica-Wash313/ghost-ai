# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- In progress

## Current Goal

- Design-token migration: bring `app/globals.css` and every app-owned component in line with `ui-context.md`'s real color palette (`--bg-base`, `--accent-primary` cyan, `--accent-ai` indigo, etc.), which is what the previous session's Open Questions flagged as not matching. Done for colors; radius scale partially deferred (see Open Questions).

## Completed

- Installed and configured `shadcn/ui` (`npx shadcn@latest init -d`) — preset `base-nova`, component library `@base-ui/react`, CSS variables theming.
- Added shadcn components: Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea (`components/ui/*`).
- Installed `lucide-react`.
- Created `lib/utils.ts` with `cn()` helper (clsx + tailwind-merge).
- Forced dark theme by default by adding `dark` class to `<html>` in `app/layout.tsx`, since `app/globals.css` had no existing theme to match (CNA defaults had been stripped) and the spec requires no default light styling.
- Verified: `tsc --noEmit` clean, `next lint` clean, `next build` succeeds, dev server renders `<html>` with `dark` class applied.
- Built `components/editor/editor-navbar.tsx` — fixed h-12 top bar, left/center/right sections, sidebar toggle button swapping `PanelLeftOpen`/`PanelLeftClose` based on an `isSidebarOpen` prop, dark background with bottom border via existing `bg-background`/base-layer border tokens.
- Built `components/editor/project-sidebar.tsx` — `fixed` panel (not in flex flow, so it never pushes canvas content), slides in/out via `translate-x` transition driven by an `isOpen` prop, header with "Projects" title + close button, shadcn `Tabs` (My Projects / Shared) each with an empty placeholder state, full-width "New Project" button with `Plus` icon pinned to the bottom.
- Built `components/editor/editor-dialog.tsx` — reusable pattern wrapping the existing `components/ui/dialog.tsx` primitives (title, description, footer actions), styled entirely from the tokens already in `dialog.tsx`/`global.css`. Not wired to any trigger yet, per spec ("do not build actual dialogs yet").
- Added `app/editor/page.tsx` (client component) wiring `EditorNavbar` + `ProjectSidebar` together with local `useState` so the toggle behavior is real and testable — this is the minimal "editor screen" the spec says these components frame.
- Verified end to end with a headless-browser pass (Playwright, since `chromium-cli` wasn't available in this environment): toggle button icon swaps, sidebar slides in without shifting the canvas, tab switching shows the correct empty state, closing returns to initial state, zero console/page errors. Screenshots + driver script left in the session scratchpad only (not committed).
- Verified: `tsc --noEmit` clean, `npm run lint` clean, `npm run build` succeeds (routes `/`, `/editor` both static).
- Implemented 03-auth.md end to end:
  - `proxy.ts` — switched from `clerkMiddleware()` (no-op) to protected-first: `createRouteMatcher` built from `NEXT_PUBLIC_CLERK_SIGN_IN_URL`/`NEXT_PUBLIC_CLERK_SIGN_UP_URL` marks only those two paths public, `auth.protect()` runs on everything else. Kept the existing static-asset-excluding `matcher` config as is.
  - `app/layout.tsx` — `ClerkProvider` now uses the `dark` theme from `@clerk/ui/themes` (was `shadcn`) with an explicit `variables` block mapping every Clerk color/radius token (`colorBackground`, `colorForeground`, `colorPrimary`, `colorPrimaryForeground`, `colorNeutral`, `colorMuted(Foreground)`, `colorInput(Foreground)`, `colorBorder`, `colorRing`, `colorDanger`, `borderRadius`) to the matching `var(--*)` CSS custom property already defined in `globals.css` — no hardcoded colors.
  - Removed the now-unused `@import "@clerk/ui/themes/shadcn.css"` from `globals.css` (that Tailwind `@source` scan was specific to the `shadcn` theme variant, which is no longer used).
  - `components/auth/auth-layout.tsx` (new) — shared two-panel shell: left panel (`hidden lg:flex`, so mobile is form-only) with compact `Ghost` lucide logo, one-line tagline, and a plain-text feature list (three lines, `Check` icon prefix, no cards); right panel centers `children`. No gradients, no hero, no scroll.
  - `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx` — now wrap `<SignIn />`/`<SignUp />` in `AuthLayout`.
  - `app/page.tsx` — now a Server Component: `await auth()` then `redirect("/editor")` if `isAuthenticated`, else `redirect("/sign-in")`. Dropped the old client-rendered sign-in/sign-up buttons.
  - `components/editor/editor-navbar.tsx` — since `/editor` is now fully behind proxy protection, dropped the `Show`/`SignInButton`/`SignUpButton` signed-out branch; right section renders Clerk's `UserButton` unconditionally.
  - `.env.local` already had all required Clerk env vars (publishable key, secret key, sign-in/up URLs, fallback redirect URLs) and `@clerk/ui` was already in `package.json` — no new install needed.
- Verified with a real headless-browser pass (Playwright via `npx`, driving the already-running `next dev` on :3000): `/` → redirects to `/sign-in` when signed out; `/sign-in` and `/sign-up` render the two-panel layout at 1440×900 and collapse to form-only at 390×844; dark theme reads correctly from the CSS variables (matches app surface/border colors, not stock Clerk `shadcn` colors); zero console errors on any of the four screenshots.
- Verified: `npm run build` succeeds (`/` and the two catch-all auth routes are dynamic as expected since they call `auth()`/render `<SignIn>`/`<SignUp>`; `/editor` still static), `npm run lint` clean.
- Filled in the four still-templated context files from direct codebase inspection (not invented):
  - `architecture.md` — real stack table, system boundaries (`app/`, `proxy.ts`, `components/{ui,editor,auth}/`, `lib/`), storage model (none yet), auth/access model (Clerk + protected-first `proxy.ts` + `/`'s explicit redirect), and four invariants.
  - `ui-context.md` — full dark-theme color table pulled straight from `app/globals.css`'s `.dark` block, typography (Geist Sans/Mono), the `--radius-*` scale and its formula, component library conventions, the three layout patterns actually built (editor, auth, modal), and icon sizing observed in the code.
  - `code-standards.md` — concretized every bracketed rule against what's actually true (strict TS, `@/*` alias, Server-Components-by-default, `proxy.ts`-only auth, CSS-variable-only styling, `components/ui/*` regenerate-don't-edit), left API Routes / Data & Storage explicitly unfilled since neither exists yet.
  - `ai-workflow-rules.md` — kept the already-correct generic scaffolding, made the examples concrete (numbered feature-spec files, `components/ui/*` as the protected path, `node_modules/next/dist/docs/` as a protected reference path).
  - `project-overview.md` — deliberately did **not** invent Goals, full Feature scope, Out of Scope, or Success Criteria, since no spec defines them; filled in only what's observably true (Clerk-gated editor shell, project sidebar with empty placeholder tabs, canvas placeholder) and left the rest explicitly marked as needing product input, per `ai-workflow-rules.md`'s own "don't invent product behavior" rule.
- Replaced all five of the above with the user's real, hand-written product spec (authored directly in the Downloads backup, then copied in verbatim):
  - `project-overview.md` — copied as-is: real-time collaborative system-design workspace, AI-generated architecture from a prompt onto a shared Liveblocks/React Flow canvas, spec generation to Markdown. No changes needed.
  - `architecture.md` — copied from their `architecture-context.md` content. Kept the in-repo filename as `architecture.md` (not `architecture-context.md`) to match `AGENTS.md`'s existing repo-relative read order rather than editing `AGENTS.md`.
  - `code-standards.md`, `ai-workflow-rules.md` — copied as-is, except fixed one mechanical bug: both files cross-reference `architecture-context.md`, which doesn't exist under that name in the repo (see above) — repointed both references to `architecture.md`.
  - `ui-context.md` — copied as-is.
  - Did **not** edit their prose to add things they didn't write (e.g. didn't insert `components/editor/`/`components/auth/` into `architecture.md`'s System Boundaries list even though those folders now exist) — flagged as an open question instead of silently rewriting their spec.
- Design-token migration (colors — see `ui-context.md#colors`):
  - `app/globals.css` — added the raw palette (`--bg-base`, `--bg-surface`, `--bg-elevated`, `--bg-subtle`, `--border-default`, `--border-subtle`, `--text-primary/secondary/muted/faint`, `--accent-primary` + `-dim`, `--accent-ai` + `-text`, `--state-error/success/warning`) and collapsed the old `:root`/`.dark` split into one `:root, .dark { }` block with identical values (the app is dark-only, so a separate light palette was dead code — see `ui-context.md#theme`). Left `--chart-1..5` on their original placeholder `oklch()` values since charts aren't used anywhere and weren't specced.
  - Kept every shadcn semantic variable (`--background`, `--foreground`, `--primary`, `--card`, `--muted`, `--border`, `--input`, `--ring`, `--sidebar*`, etc.) alive as a **value alias** onto the new palette (e.g. `--primary: var(--accent-primary)`) instead of renaming classes inside `components/ui/*`. That means every shadcn primitive (Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea) now renders the new palette automatically with zero hand-edits to those protected/generated files — `--primary` buttons are cyan now, `--destructive` is the new error red, etc.
  - Added the new semantic Tailwind utility keys from `ui-context.md` to the `@theme inline` block (`--color-base`, `-surface`, `-elevated`, `-subtle`, `-surface-border`, `-surface-border-subtle`, `-copy-primary/secondary/muted/faint`, `-brand`, `-accent-dim`, `-ai`, `-ai-text`, `-error/success/warning`) so `bg-base`, `text-copy-primary`, `border-surface-border`, `text-brand`, `bg-accent-dim`, etc. (the exact utility names both `ui-context.md` and `code-standards.md` call for) are real, working classes.
  - Migrated every app-owned (non-`components/ui/*`) file's explicit color classes to the new names, since `code-standards.md` requires the new utility names going forward: `app/layout.tsx` (Clerk `appearance.variables`, now pointing at `--bg-base`/`--accent-primary`/etc. directly instead of the shadcn-adapter var names), `components/auth/auth-layout.tsx`, `components/editor/editor-navbar.tsx`, `components/editor/project-sidebar.tsx`, `app/editor/page.tsx`.
  - Applied the modal radius from `ui-context.md#layout-patterns` (`rounded-3xl`) to `components/editor/editor-dialog.tsx`'s `DialogContent` via its own `className` override — that file is app-owned, not shadcn-generated, so no protected-file conflict.
  - Verified: `npm run build` and `npm run lint` clean; re-ran the Playwright screenshot pass against `/sign-in` and `/sign-up` — cyan `--accent-primary` now visibly renders on the primary button and links, near-black `--bg-base` background reads correctly, zero console errors.

## In Progress

- None — auth step, both context-doc passes, and the color half of the token migration are complete pending review. Radius is intentionally partial — see Open Questions.

## Next Up

- Wire the sidebar toggle button + "New Project" button into real state/actions once project data and creation flow are defined.
- Wire an actual dialog (e.g. "New Project") using the `EditorDialog` pattern once that flow is specced.
- Connect signed-in user identity (now available via `auth()`/`UserButton`) to project ownership/storage once that data model is specced.
- No feature spec exists yet for any of `project-overview.md`'s actual product (canvas, AI generation, spec generation, projects/collaborators). Specs 01–03 only cover design system, editor chrome, and auth. Per `ai-workflow-rules.md`'s own rule ("do not infer or invent behavior from scratch"), nothing in that vision should be built until a numbered spec (04+) defines it — this tracker entry exists so that's not silently skipped.

## Open Questions

- Spec 01-design-system.md said to match an "existing dark theme" in `global.css`, but no theme existed there (it only had `@import "tailwindcss";`). Resolved by defaulting the app to dark via a `dark` class on `<html>` rather than relying on `prefers-color-scheme`. Flag if a light/dark toggle is wanted later — this will need to move off a static class.
- 01-editor.md's spec text has a typo pointing the navbar at `componets/editor/editor-navbar.tsx` (missing "n"); implemented at the correctly spelled `components/editor/editor-navbar.tsx` to match the sidebar's path and the rest of the codebase's convention. Flag if that was actually intentional.
- Spec didn't say where/how these two chrome components should be composed into an actual screen. Added `app/editor/page.tsx` as the minimal host needed to verify the toggle behavior end to end — revisit/rename once the real editor route and layout are specced.
- ~~This entire `context/` directory lives outside the `ghost-ai` git repo...~~ Resolved: copied into `ghost-ai/context/` at the user's request, so `AGENTS.md`'s repo-relative `context/*.md` paths now resolve. The original at `~/Downloads/Six-File+Context+Methodology/templates/context/` is being kept in place intentionally, as a backup — the user confirmed not to delete it. It will not auto-sync with the in-repo copy; if the two need to match later, that's a manual re-copy.
- The Clerk sign-in/sign-up form heading reads "Sign in to **Ghose** AI" / presumably the same typo on sign-up — that's the application display name configured in the Clerk Dashboard, not something set from this codebase, so it couldn't be fixed here. Needs a rename in the Clerk Dashboard.
- ~~`project-overview.md`'s Overview, Goals, Feature scope...~~ Resolved — real product content now filled in (see Completed).
- ~~`ui-context.md`/`code-standards.md`'s design tokens don't match the actual `app/globals.css`...~~ Resolved for colors (see Completed). Two pieces intentionally deferred, not silently dropped:
  - **Radius scale isn't fully migrated.** `ui-context.md` calls for `rounded-xl` (inline/small UI), `rounded-2xl` (cards/panels), `rounded-3xl` (modals). `components/ui/card.tsx` and `components/ui/button.tsx` are shadcn-generated and still use the old proportional `--radius-*` scale (`rounded-xl`/`rounded-lg` sized off a single `--radius` base, unrelated to the new 3-tier role-based scale) — changing those class names directly would mean hand-editing protected files and would silently be wiped out by the next `npx shadcn add --overwrite`. Only fixed the one case that's app-owned, not generated: `components/editor/editor-dialog.tsx`'s `DialogContent` now gets `rounded-3xl` via its own `className` override. `Card` isn't used anywhere yet, so its `rounded-xl` (should be `rounded-2xl` per spec) has no visible impact today — whoever first uses `Card` for an actual card/panel should pass `className="rounded-2xl"` at the call site rather than editing `card.tsx`. Worth a real decision later: keep shadcn's proportional radius system as the exception, or invest in overriding it repo-wide.
  - **Sidebar isn't semi-transparent.** `ui-context.md`'s Layout Patterns says "Sidebars: floating overlay with dark semi-transparent background and subtle border" — `project-sidebar.tsx` kept its existing solid `bg-surface` rather than adding transparency/backdrop-blur, since that's a structural/visual change beyond a token rename. Flagging so it's not mistaken for done.
  - Also not addressed: `ui-context.md`'s Canvas section (node color palette, edge style, node shapes) — there's no canvas yet to apply it to; belongs with whatever spec first builds the canvas, not this token pass.
- **None of the new stack is installed.** `architecture.md` now specifies Prisma + PostgreSQL, Liveblocks + React Flow, Trigger.dev, and Vercel Blob — `package.json` has none of them (only `@clerk/nextjs`, `@clerk/ui`, `@base-ui/react`, `shadcn`-generated deps, `lucide-react`, `next`/`react`). Also referenced-but-missing: `app/api/`, `trigger/`, `prisma/`, `data/`, `types/canvas.ts`. None of this blocks current work, but the first canvas-related spec will need to land these as its own unit(s) per the scoping rules in `ai-workflow-rules.md` ("Real-time canvas state and database persistence" is explicitly called out there as a reason to split work).

## Architecture Decisions

- Used `shadcn@latest init -d` (tool defaults: template `next`, preset `base-nova`) rather than picking a specific preset/base library, since the spec didn't specify one and the CLI's presets (nova, vega, maia, lyra, mira, luma, sera, rhea) are unfamiliar/newer than training data — deferred to the tool's own recommended default.
- Component library is `@base-ui/react` (Base UI), not Radix UI — this shadcn CLI version's default, differs from the classic shadcn/Radix setup.
- Do not hand-edit `components/ui/*` — regenerate via `npx shadcn add <component> --overwrite` instead (per AGENTS.md/spec instruction).
- Sidebar open/close and navbar's icon state are lifted to the parent (`isOpen`/`isSidebarOpen` + callback props) rather than owned internally by either component, since the navbar's icon and the sidebar's visibility must stay in sync and future chapters will need to control both from a shared editor layout.
- `proxy.ts` uses the "protected-first" `clerkMiddleware` strategy (deny by default, allow-list `/sign-in` and `/sign-up`) rather than "public-first", per spec's "Protect everything else by default." Public paths are derived from `NEXT_PUBLIC_CLERK_SIGN_IN_URL`/`NEXT_PUBLIC_CLERK_SIGN_UP_URL` instead of hardcoded strings, so renaming those routes only requires an env change.
- `/` still does its own explicit `auth()` check + redirect in `app/page.tsx` (rather than relying solely on the proxy's automatic redirect-to-sign-in for unauthenticated visitors) since the spec calls out both directions of that redirect explicitly and the page-level check is correct regardless of how `proxy.ts`'s matcher/public-route list evolves later.

## Session Notes

- This Next.js project (16.3.0) ships a repo-specific `AGENTS.md` warning that APIs/conventions may differ from training data; confirmed via `node_modules/next/dist/docs/` that core CSS/Tailwind setup is unchanged, but the `shadcn` CLI itself (v4.16.2) is a materially newer generation (new preset names, `@base-ui/react` instead of Radix) — worth rechecking `npx shadcn@latest --help` before assuming behavior in future sessions.
