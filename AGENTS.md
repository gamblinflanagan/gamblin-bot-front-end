# Frontend agent rules

## Scope

This is a single pnpm package, not a workspace or monorepo. Work in this frontend repository only. Do not modify the Python backend from a frontend task. Do not deploy, provision cloud resources, run remote migrations, create real users, commit, push, or open a PR without Joey's explicit permission.

## Pinned stack

- Node `24.22.2` (`.nvmrc`), pnpm `12.18.0` (`packageManager`).
- Next.js `15.5.29` with App Router and `middleware.ts`; React and React DOM `19.3.1`; strict TypeScript `5.9.3`.
- Tailwind CSS `4.3.5`, shadcn/ui source components, Radix `1.8.1`, TanStack Query `5.107.1`, Zod `4.6.7`.
- Better Auth and its Drizzle adapter `1.7.18`, Drizzle ORM `0.45.4`, Drizzle Kit `0.31.11`, Neon serverless `1.2.0`.
- All direct dependencies are exact pins in `package.json`; the resolved graph is in `pnpm-lock.yaml`. Next.js must stay on secure 15.x at or above `15.5.28`; React/DOM must stay matching secure 19.x at or above `19.2.1` until Joey separately approves a major upgrade. Never use force/legacy-peer-deps to hide conflicts.
- pnpm 12 settings live in `pnpm-workspace.yaml`. This file does not make the app a monorepo. `allowBuilds` explicitly permits only esbuild. Overrides keep PostCSS at `8.5.32`, esbuild at `0.28.2`, and TypeScript-ESLint's affected minimatch dependency at `11.0.1` without changing unrelated consumers.

## Boundaries and security

- Keep layouts and pages as Server Components unless interactivity requires `"use client"`. The QueryClient belongs in React state in `app/providers.tsx`, never a module-global shared across users.
- `db/`, `lib/auth.ts`, `lib/env.ts`, `lib/session.ts`, and `lib/backend.ts` are server-only. Database/auth construction must remain lazy and must not contact Neon during import or build.
- Never expose `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BACKEND_API_KEY`, or other secrets through client imports or `NEXT_PUBLIC_*`. Do not log responses or credentials.
- Middleware is only an optimistic cookie-presence routing check. `app/(app)/layout.tsx` must retain authoritative server-side session validation. Every protected Route Handler and Server Action must independently call the shared session helper; middleware and parent layouts are not sufficient.
- `/api/data`, `/api/status`, and `/api/record` proxy the current local Python API. They allow anonymous access only in `NODE_ENV === "development"` for the preview; production calls must retain their own authoritative session checks.
- Missing auth configuration must fail closed and keep `/login` usable. Never add a fake login, fixed session, production mock user, or public sign-up bypass. Unit/browser mocks stay under `tests/` and are never imported by production code.
- `/dev/home` is a local UI preview of the shared `components/home-page.tsx`. Keep its `NODE_ENV === "development"` gate and production 404 behavior. Never use it to bypass session checks on `/` or any other real application route.
- Authentication/session tables only. Application data and account settings do not belong in Neon in this phase.

## UI conventions

Use the generated shadcn/ui components and Tailwind tokens in `app/globals.css`. Generate additional primitives with the shadcn CLI and keep their source under `components/ui/`. Do not add another UI framework, an ad-hoc stylesheet system, or an inline-style design system. The main board lives in `components/board/` with `components/home-page.tsx` as its shared entry point. Preserve the dummy board's responsive/system-dark appearance through the `board-*` Tailwind tokens; do not copy its global stylesheet or alter login tokens.

## Contracts and future phases

The browser calls only Next.js. The current local integration uses the backend's unversioned `/data`, `/status`, and `/record` payload shapes in `lib/board/`; it is read-only and contains private local-board fields, so do not expose the Python server directly. When the backend publishes its planned versioned OpenAPI release, replace these local shapes with generated TypeScript/Zod types under `contract/` and migrate the proxy to the versioned endpoints. Backend contract changes start in the backend repository and are consumed here by pinned release. No user-management script, deployment adapter, Sentry integration, DynamoDB/SSM code, or cloud job is part of this phase.

See `docs/plan.md` for the master plan, `plans/02-repo-scaffold.md` for the scaffold, and `plans/03-main-board.md` for this board integration.

## Required checks

Use Node 24 (`nvm use`) and run `make check` before handing off changes. It runs version floors, lint, strict types, Vitest, production build, standalone asset packaging, and Playwright standalone smoke tests. Run `pnpm db:generate` and `pnpm db:check` after schema changes; inspect generated SQL, but do not apply it to remote infrastructure without explicit approval.
