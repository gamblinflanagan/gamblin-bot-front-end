# Picks board frontend

Next.js 15 frontend for the local Python picks-board API, with a protected production home route and a development-only working preview. The main board is read-only; authentication/user provisioning and deployment remain separate phases.

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

For optional real authentication development, copy `.env.example` to `.env.local` only when you have a development Neon database and a random secret of at least 32 characters:

- `DATABASE_URL`: pooled Neon PostgreSQL connection string.
- `BETTER_AUTH_SECRET`: server-only auth secret.
- `BETTER_AUTH_URL`: application base URL.
- `BETTER_AUTH_TRUSTED_ORIGINS`: comma-separated exact origins.

Localhost HTTP is accepted only outside production. Production configuration requires HTTPS and secure cookies. No migrations or users are created automatically. Public sign-up remains disabled. Never commit `.env.local`.

`SENTRY_DSN` is reserved for the observability phase. There is no `ORIGIN_SECRET`.

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
