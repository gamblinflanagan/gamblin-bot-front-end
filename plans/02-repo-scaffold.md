# Phase 2: frontend repository scaffold

## Goal

Create the production-intended Next.js 15 foundation without implementing the dashboard, backend proxy, account provisioning, or deployment.

## Files and behavior

- Single exact-pinned pnpm package on Node 24 with App Router, strict TypeScript, Tailwind v4, and six shadcn/ui primitives.
- Public login scaffold and protected starter home, with per-tree TanStack Query provider.
- Lazy Better Auth/Neon foundation, four auth tables, five-minute signed cookie cache, public sign-up disabled, and safe unconfigured behavior.
- Optimistic Next.js 15 middleware plus authoritative server-side session checks.
- Version-floor tests, unit/component tests, standalone Playwright smoke tests, CI, Dependabot, and agent/developer documentation.

## Acceptance criteria

`make check` passes; frozen installation has no peer errors; `/login` renders without credentials; missing auth disables submission; `/` remains inaccessible with missing or fabricated cookies; auth routes fail safely; standalone static assets work; no real secrets, users, application data, backend changes, remote migrations, or deployment are involved.
