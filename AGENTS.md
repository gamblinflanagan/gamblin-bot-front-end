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
- `db/`, `lib/auth.ts`, `lib/env.ts`, and `lib/session.ts` are server-only. Database/auth construction must remain lazy and must not contact Neon during import or build.
- Never expose `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BACKEND_API_KEY`, or other secrets through client imports or `NEXT_PUBLIC_*`. Do not log responses or credentials.
- Middleware is only an optimistic cookie-presence routing check. `app/(app)/layout.tsx` must retain authoritative server-side session validation. Every future protected Route Handler and Server Action must independently call the shared session helper; middleware and parent layouts are not sufficient.
- Missing auth configuration must fail closed and keep `/login` usable. Never add a fake login, fixed session, production mock user, or public sign-up bypass. Unit/browser mocks stay under `tests/` and are never imported by production code.
- Authentication/session tables only. Application data and account settings do not belong in Neon in this phase.

## UI conventions

Use the generated shadcn/ui components and Tailwind tokens in `app/globals.css`. Generate additional primitives with the shadcn CLI and keep their source under `components/ui/`. Do not add another UI framework, an ad-hoc stylesheet system, or an inline-style design system. Final dashboard/card designs and backend records belong to a later phase.

## Contracts and future phases

The browser will eventually call only Next.js. A future versioned Python contract will drive generated TypeScript and Zod types under `contract/`; do not hand-write a competing backend contract or placeholder proxy routes. Backend contract changes start in the backend repository and are consumed here by pinned release. No data proxy, user-management script, deployment adapter, Sentry integration, DynamoDB/SSM code, or cloud job is part of this scaffold.

See `docs/plan.md` for the master plan and `plans/02-repo-scaffold.md` for this phase.

## Required checks

Use Node 24 (`nvm use`) and run `make check` before handing off changes. It runs version floors, lint, strict types, Vitest, production build, standalone asset packaging, and Playwright standalone smoke tests. Run `pnpm db:generate` and `pnpm db:check` after schema changes; inspect generated SQL, but do not apply it to remote infrastructure without explicit approval.
