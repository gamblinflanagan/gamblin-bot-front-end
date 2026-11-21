# Picks board frontend

Next.js 15 frontend for the local Python picks-board API, with self-hosted Better Auth backed by Neon Postgres, a protected production home route, and a development-only working preview. The main board is read-only; production deployment remains a separate phase.

## Install

Requirements: nvm, Node `24.22.2`, Corepack, and the backend's configured Python environment.

```sh
nvm install
nvm use
corepack enable
pnpm install --frozen-lockfile
```

## Run with the real backend

Start the Python API in its own terminal from `gamblin-bot-back-end`:

```sh
.venv/bin/python api.py
```

It listens on `http://127.0.0.1:8000` by default. Then start Next.js here:

```sh
pnpm dev
```

Open **http://localhost:3000/dev/home** to develop the main page without an account. This renders the same `components/home-page.tsx` used by the post-login `/` route. `/dev/home` returns 404 outside development, and `/` still requires a real session.

The browser calls same-origin Next.js endpoints, never Python directly:

| Browser request | Python request | Behavior |
| --- | --- | --- |
| `/api/data` | `/data` | Board load and 30-second polling |
| `/api/status` | `/status` | Collection/freshness state with the board |
| `/api/record` | `/record` | Loads when Record is selected, then polls every 60 seconds |

The proxy permits anonymous requests only during Next.js development. Production proxy requests independently validate the session. Responses are not cached; backend requests time out after 10 seconds. The board retains its last good data during later request failures.

The current Python payload includes private local-board settings and ledger data. Do not expose the Python server directly or deploy this unversioned local API as a public production service.

## Configuration

`BACKEND_API_URL` is used by the server-only proxy and defaults to `http://127.0.0.1:8000`. Set it in `.env.local` only if the backend uses another address. `BACKEND_API_KEY` is optional for the current local API and can provide a bearer token to a future secured backend. Neither value is sent to the browser as configuration.

For local Postgres development, select the Neon `dev` branch and pull only its Postgres settings:

```sh
neon checkout dev
neon env pull --service postgres --branch dev
```

This writes two server-only connection strings to `.env.local`:

- `DATABASE_URL_UNPOOLED`: direct connection used by local development and Drizzle Kit migrations.
- `DATABASE_URL`: pooled connection used in production and reserved for the deployed Lambda/serverless runtime.

The database environment is validated with Zod when the lazy client is first used; importing modules and running a build do not contact Neon. Only use the `dev` branch locally. Neon provides Postgres only for this app; do not enable Neon Auth, the Data API, Functions, Object Storage, AI Gateway, or Realtime.

The app uses `@neondatabase/serverless` with Drizzle's `neon-serverless` WebSocket adapter and a bounded `Pool`, supporting Better Auth's interactive transactions. Local development selects the direct URL; production selects the pooled URL for AWS Lambda. Drizzle migrations always use the direct URL.

Self-hosted Better Auth uses email/password only, disabled public sign-up, database-backed rate limiting, httpOnly/SameSite=Lax cookies, Secure cookies in production, and a five-minute signed session cookie cache. Its `user`, `session`, `account`, `verification`, and `rateLimit` tables are applied to the Neon `dev` branch. The auth environment requires:

- `BETTER_AUTH_SECRET`: server-only random secret of at least 32 characters.
- `BETTER_AUTH_URL`: application base URL.
- `BETTER_AUTH_TRUSTED_ORIGINS`: comma-separated exact origins.

Localhost HTTP is accepted only outside production. Production configuration requires HTTPS and secure cookies. No users are created automatically. Public sign-up remains disabled. Never commit `.env.local`.

`SENTRY_DSN` is reserved for the observability phase. There is no `ORIGIN_SECRET`.

## User administration

The admin script uses Better Auth's server-side internals rather than the disabled public sign-up endpoint. Passwords are generated securely and shown once; never pass a password as an argument.

```sh
pnpm users create --email user@example.com --name "Example User"
pnpm users reset-password --email user@example.com
pnpm users disable --email user@example.com
```

Password reset revokes existing sessions. Disable clears the credential hash and revokes sessions while retaining the user; reset-password restores access. Signed cookie-cache entries expire within five minutes.

After schema changes, generate SQL with `pnpm db:generate` and inspect it. Apply migrations only after confirming `NEON_BRANCH=dev` in `.env.local`, then run `pnpm exec drizzle-kit migrate`. Never run this against production without separate explicit approval.

Run the real auth integration check against the dev branch with `pnpm test:auth:dev`. It refuses other branches, creates a unique throwaway `.invalid` user through the admin script, checks sign-up rejection/sign-in/cookies/session storage/generic errors, and deletes the user and sessions afterwards. Secrets and passwords are never printed by the test runner.

## Main board

- To place, Placed, and Record tabs, including singles, parlays, results, P&L, and daily/league summaries.
- LocalStorage-backed tab selection, bankroll stake scaling, and alert dismissal.
- Enabled sportsbook app/browser links; write actions remain disabled because the API is read-only.
- Responsive desktop/mobile layout and system light/dark colors recreated with Tailwind/shadcn.
- Admin is not part of this port.

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

The preparation step copies `.next/static` and `public/` into the standalone output. Playwright starts this packaged server on port 3100 with auth/backend variables cleared; production smoke tests confirm anonymous proxy rejection and preview 404 behavior without needing Python.

## Later phases

A pinned backend OpenAPI release will replace the current local payload types with generated TypeScript/Zod types and move the proxy to versioned endpoints. Real account provisioning, admin/write workflows, Sentry, AWS Web Functions/CloudFront, remote migrations, and deployment remain later phases.

See `AGENTS.md`, `docs/plan.md`, and `plans/03-main-board.md` for implementation rules and task records.
