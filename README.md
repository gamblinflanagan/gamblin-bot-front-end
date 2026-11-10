# Frontend scaffold

Production-intended Next.js 15 foundation for the hourly data dashboard. This phase contains the app/auth structure and safe login shell only; it does not contain dashboard data, a Python proxy, user provisioning, or deployment code.

## Install and start

Requirements: nvm, Node `24.22.2`, and Corepack.

```sh
nvm install
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000/login`. No database or auth credentials are needed for this starter. With configuration absent, the page displays **Authentication not configured**, sign-in is disabled, and `/` remains protected.

For main-page UI development without an account, open `http://localhost:3000/dev/home`. This renders the same `components/home-page.tsx` used by the post-login `/` route. The preview returns 404 outside Next.js development mode and does not bypass authentication on `/`.

## Optional auth configuration

Copy `.env.example` to `.env.local` only when you have a development Neon database and a random secret of at least 32 characters:

- `DATABASE_URL`: pooled Neon PostgreSQL connection string.
- `BETTER_AUTH_SECRET`: server-only auth secret.
- `BETTER_AUTH_URL`: application base URL.
- `BETTER_AUTH_TRUSTED_ORIGINS`: comma-separated exact origins.

Localhost HTTP is accepted only outside production. Production configuration requires HTTPS and secure cookies. No migrations or users are created automatically. The Better Auth schema and local Drizzle SQL are present, but configured login and account provisioning require a later isolated integration phase. Never commit `.env.local`.

`BACKEND_API_URL` and `BACKEND_API_KEY` are reserved for the later data proxy and are not read now. `SENTRY_DSN` is reserved for the observability phase. There is no `ORIGIN_SECRET`.

## Checks

```sh
pnpm lint                 # ESLint
pnpm typecheck            # strict TypeScript
pnpm run check:versions   # actual resolved Next/React security floors
pnpm test                 # Vitest unit/component tests
pnpm exec playwright install chromium
pnpm run test:e2e         # build, package standalone assets, run browser smoke tests
make check                # complete check wrapper
```

`pnpm db:generate` regenerates local SQL after schema edits and `pnpm db:check` checks migration consistency. Neither command applies a migration. Do not run `drizzle-kit migrate` against shared or production infrastructure without explicit approval.

For a manual standalone run:

```sh
pnpm build
pnpm run prepare:standalone
node .next/standalone/server.js
```

The preparation step copies `.next/static` and `public/` into the standalone output. Playwright starts this packaged server on port 3100 with auth variables cleared.

## What exists now

- App Router route groups for public login and the protected application shell.
- shadcn/ui Button, Input, Label, Card, Skeleton, and Alert with Tailwind v4 tokens.
- Per-provider-tree TanStack QueryClient; no shared global client.
- Lazy server-only Better Auth, Neon HTTP, and Drizzle setup with authentication tables only.
- Email/password auth configuration with public sign-up disabled and a five-minute signed session cookie cache.
- Optimistic middleware routing plus authoritative session validation in the protected layout.
- Explicit missing-auth state, generic auth route failures, tests, CI, and Dependabot.

## Later phases

A pinned backend OpenAPI contract will generate TypeScript/Zod types. Only then should the session-protected `/api/data/records` and `/api/data/status` proxy routes be added. Finished cards, hourly refresh behavior, admin user scripts, real account provisioning, Sentry, AWS Web Functions/CloudFront, remote migrations, and deployment are intentionally out of scope here.

See `AGENTS.md` and `docs/plan.md` for implementation rules and the master plan.
