# Hourly Data Dashboard — Master Plan

Nov 4, 2026 · @Joey

## Purpose & scope

Build a small, production-grade web app with two pages — login and a main data page — that reads its data from a decoupled Python backend on AWS EC2. The backend collects and stores all app data on its own schedule; the web app keeps only user accounts and sessions. Every change lands through a reviewed PR, and any coding agent can do the work.

In scope for v1:

- A login page (email + password) that gates the rest of the app.
- A main page that shows the backend's data, newest first, and refreshes on an interval while it is open.
- An API layer added to the existing Python backend code, to be deployed on a new EC2 instance in us-east-1. Its data collection, calculation and formatting are already written and are wrapped, not rewritten; the new work is the FastAPI endpoints Next.js calls.
- A Neon Postgres database holding only user accounts and sessions; account settings come in a later update.
- A shared, versioned contract so either side can change without silently breaking the other.

Out of scope for v1: sign-up, password reset by email, account settings (a later update), data export, file uploads, scheduled jobs on the web side, multi-tenancy, and any page beyond the two above.

Work happens in order: agree this doc, set up accounts and services, then build phase by phase. Every item marked **Provisional** below is a default chosen to keep the plan complete; it holds unless an Open question overturns it.

## Key decisions

The stack in one table; anything marked Provisional can still change through the Open questions.

| Area | Decision | Status |
| --- | --- | --- |
| Architecture | Next.js full-stack (Route Handlers and Server Components) in front of a separate Python backend that owns the data | Decided |
| Data flow | Python collects and stores on its own schedule; the browser reads it through a Next.js proxy route whenever the page is open | Decided |
| Repos | Two repos: web (Next.js) and backend (Python), linked only by a versioned contract | Decided |
| Frontend | Next.js 15 App Router, latest patch and never below 15.5.28; React 19, latest patch and never below 19.2.1 (floors re-verified against official advisories at scaffold); TypeScript, Tailwind CSS v4, shadcn/ui (Radix primitives copied into `components/ui/`), TanStack Query; no Zustand | Decided |
| Backend | Existing Python 3.12 collection, calculation and formatting code, wrapped by a new FastAPI layer | Decided (FastAPI Provisional) |
| App data store | The backend's own store on EC2: SQLite holding the current snapshot only (each run adds, updates and deletes records to mirror the API; no history), nightly backup to S3 | Provisional |
| Accounts store | Neon Postgres + Drizzle ORM + Drizzle Kit: users and sessions only (account settings come in a later update) | Decided |
| Auth | Better Auth, email/password, session cookie cache (5 min) | Decided |
| Rate limiting | Better Auth's limiter on login; per-user limit in the proxy, counted in DynamoDB; global request-rate limit and `maxEnvironments` on the Web Function endpoint; backend ceiling in nginx | Decided (limits Provisional) |
| Scheduled work | Only the backend's hourly collection on EC2; none on the web side | Decided |
| Browser updates | Load on page open, then refresh at 2 minutes past every hour while the page is open (the collector runs on the hour) | Decided |
| Web hosting | Next.js on AWS Lambda Web Functions behind CloudFront; static files served by the Web Function and cached by CloudFront; phase 1 spike gates adoption | Decided |
| Web runtime | Node.js 24 on Arm64 (`nodejs24.x`); Next.js `output: 'standalone'` and `lambda-entry.js` wrapper; confirm linux/arm64 compatibility by deploy smoke test | Provisional |
| Backend hosting | New EC2 instance in us-east-1; OS, instance type and size resolved in Open question 14 | Decided |
| Region | us-east-1 (N. Virginia) for the Web Function, new EC2 backend and Neon; CloudFront ACM certificate also in us-east-1; verify Neon region availability when creating the project | Decided |
| Secrets | Never in the frontend bundle; SSM Parameter Store; Neon URL and backend API key only reachable by the web function, the key also on EC2; web function reads at startup through its IAM role (phase 1 check, Open question 22) | Decided (startup loading Provisional) |
| Build order | Contract first, then backend API, auth, proxy, UI | Decided |

## Application architecture

One Next.js app and one Python backend, each in its own repo, sharing a versioned contract. Python collects and stores all app data on EC2; Neon holds only accounts and sessions; Next.js sits between the browser and both. No separate API server is needed: Next.js Route Handlers and Server Components run on the server.

&#91;embedded content: application architecture · 6 parts\]

Web-host diagram label: **Next.js on Lambda Web Functions behind CloudFront**. The embedded diagram itself is not present in this Markdown file; update its external source to use this label.

**Web hosting and runtime**

- Target: AWS Lambda Web Functions behind CloudFront. The supplied hosting decision cites an announcement on 2026-10-12; verify current availability and capabilities in the phase 1 spike. Its stated supported regions are us-east-1, us-east-2, us-west-2, ap-northeast-1 and eu-west-1; use us-east-1 and verify that Neon can be created there. CloudFront's ACM certificate must be in us-east-1.
- Build Next.js with `output: 'standalone'`. Add `lambda-entry.js` to parse `AWS_LAMBDA_HTTP_ENDPOINT` (host:port), set `HOSTNAME` and `PORT`, then start the standalone server. Include static files in the deploy artifact so `/_next/static/*` is served by the Web Function and cached by CloudFront; no separate static-assets bucket. Build for linux/arm64 or avoid native runtime dependencies (Provisional; prove on Node.js 24/Arm64 in the deploy smoke test).
- Deploy on merge to `main` through GitHub Actions OIDC using the `aws lambda-web` CLI, or Terraform if selected in phase 1 (Open question 22). Do not depend on unconfirmed SST support. Web Functions need no adapter; a later move to Next.js 16 has no adapter dependency (verify runtime compatibility in phase 1).
- **Maturity risk:** the supplied announcement date makes this feature about four weeks old at the 2026-11-09 decision. Phase 1 must prove Next.js standalone, CloudFront IamAuth + OAC, a JSON-body POST, unsigned direct-call rejection, and pricing. If the spike fails, fall back to Lambda Event Functions via OpenNext + SST; the supplied compatibility note says OpenNext's tested Next.js versions extend only through 15.3.x. Re-verify that matrix and the security floors before adopting the fallback; never downgrade below a security floor to fit it.
- **Cost estimate — Provisional, verify in AWS Pricing Calculator in phase 1:** US East/Arm requests $0.30 per million; active vCPU $0.0000276944 per vCPU-second; memory $0.0000036667 per GB-second. The supplied pricing model bills memory for the lifetime of each execution environment, including idle time, and has no Web Functions free tier; the 1M-request / 400,000 GB-second free tier is for Event Functions. For roughly 10 users, budget an estimated $0.15/month for requests and CPU, plus up to about $4–5/month if one 0.5 GB environment stays alive all month. This is a workload-dependent web-host estimate, not a quote or a total AWS bill.

The browser talks only to the Next.js server. Next.js checks the session, then reads the account and session from Neon or proxies data requests to Python with the API key. Python never sees Neon, and Neon never sees app data.

**Repositories**

| Repo | Holds |
| --- | --- |
| Web (Next.js) | `app/(auth)/login` and `app/(app)/` route groups, `middleware.ts` session check, `app/api/auth/[...all]` (Better Auth), `app/api/data/[...path]` (GET-only allowlisted proxy), `lib/backend.ts` (typed client), `components/cards/` (design-matched summary cards), `components/ui/` (shadcn/ui base components: button, input, label, card, skeleton, alert), `components.json`, `db/` (Better Auth tables and Drizzle migrations; no settings table), `scripts/users.ts` (create, reset, disable users), `contract/` (generated TS types + Zod pinned to a contract release), TanStack Query hooks, `lambda-entry.js`, deploy workflow / IaC config (Web Function, CloudFront, ACM, DynamoDB rate-limit table, IAM/SSM access and endpoint limits) |
| Backend (Python) | Existing calculation and formatting code, unchanged. New: `api/` (FastAPI app: `main.py`, `routes/records.py`, `routes/status.py`, `auth.py`) that calls the existing code; `models.py` (Pydantic response models matching the existing output, source of truth for the contract); `store/` and `collector/` only where the existing code lacks the required hourly collection and current-snapshot storage; `fixtures/`; nginx and systemd config, deploy and backup scripts for EC2 |

**Data stores (v1)**

| Store | Table | Columns | Notes |
| --- | --- | --- | --- |
| Neon (web) | `users`, `sessions`, `accounts`, `verifications` | Managed by Better Auth | Authentication/session data only; retain required Better Auth support tables, no app-data or settings table; fixed users created by admin script; public sign-up disabled (Decided) |
| EC2 (backend) | `records` | `key` (primary key, from the upstream record), `data` (JSON), `updated_at`, typed columns if needed | The current snapshot only: mirrors the latest API response, no history |
| EC2 (backend) | `snapshot_meta` | `version` (integer), `updated_at` | Single row; `version` goes up by one on every run that changes anything; used as the `ETag` |
| EC2 (backend) | `collection_runs` | `id`, `started_at`, `finished_at`, `status`, `added`, `updated`, `deleted`, `snapshot_version`, `error` | One row per run; powers `/v1/status` and "last updated" |

**Lifecycle**

1. Every hour the collector fetches from the external API and makes the store match it in one transaction: new records added, changed ones updated, missing ones deleted, and the snapshot version bumped if anything changed. This runs whether or not anyone has the app open.
2. A user signs in on `/login`; Better Auth checks the password against Neon and sets the session cookie.
3. The main page renders on the server: it checks the session and loads the current snapshot through the proxy.
4. While the page is open, TanStack Query calls `GET /api/data/records` (sending `If-None-Match` with the snapshot version it holds) and `GET /api/data/status` on page load and at 2 minutes past every hour while the page is open. An unchanged snapshot returns 304 with no body.
5. The proxy route validates the session (from the cookie cache, so Neon is not hit each time), forwards the GET to Python with the API key and `If-None-Match` and a 10 s timeout, and returns Python's response with its `ETag`.

## Backend API contract

The Python backend collects on its own schedule and serves read-only JSON; only the Next.js server calls it, through the `/api/data` proxy. The browser never calls Python directly and never holds its key.

**Collection (on EC2)**

- A systemd timer runs the collector at the top of every hour, UTC, unless the existing code already schedules itself (Provisional; Open question 7).
- Each run fetches the full upstream response and makes the store match it, matching records by `key`: new records are inserted, changed records updated, and records no longer in the response deleted.
- The whole update is one transaction and bumps `snapshot_meta.version` only if something changed, so readers never see a half-updated snapshot.
- A failed run changes nothing; the previous snapshot keeps being served. It retries at 5 and 15 minutes, then waits for the next hour.
- The collector and the API are separate processes sharing the store, so a slow upstream never slows reads.

**Endpoints (Python API)**

| Method / path | Auth | Returns |
| --- | --- | --- |
| `GET /v1/records` | API key | The current snapshot: `{ schemaVersion, snapshotVersion, updatedAt, records: [...] }`, with `ETag` set to the snapshot version; a matching `If-None-Match` returns 304 with no body |
| `GET /v1/status` | API key | `{ schemaVersion, snapshotVersion, lastRunAt, lastSuccessAt, lastStatus, recordCount, added, updated, deleted }` for the latest run |
| `GET /health` | None | `{ status: "ok", version }` for uptime checks and deploy smoke tests |

A snapshot is 15–30 records, so `/v1/records` always returns the whole snapshot in one response, with no pagination.

**Transport and security**

| Part | Value |
| --- | --- |
| Transport | HTTPS only, on an API subdomain (e.g. `api.<domain>`) through nginx with a Let's Encrypt certificate; uvicorn bound to `127.0.0.1:8000` |
| Auth | `Authorization: Bearer <BACKEND_API_KEY>`, compared in constant time; rotation = add a second accepted key, switch the web app, remove the old key |
| Rate limit | nginx `limit_req`, 600 requests/min overall as a ceiling (Provisional); all traffic arrives from the web app's Lambda functions, so per-user limits live in the proxy (see Security) |
| Timeouts | Proxy side: 10 s per request, no retries (the next refetch is the retry) |
| Max size | 1 MB per response (Provisional; set once the payload is known) |
| EC2 network | Security group opens 443 (and 80 for certificate renewal) only; SSH limited to your IP |

**Record fields**

| Field | Type | Rule |
| --- | --- | --- |
| `key` | string | Stable identifier taken from the upstream record (field named in Open question 3); how runs match records |
| `updatedAt` | ISO 8601 UTC | When this record last changed in the snapshot |
| `data` | object | Shape taken from the existing code's output |

**Status codes, as the browser sees them**

| Status | From | Meaning | Page does |
| --- | --- | --- | --- |
| 200 | Python via proxy | New snapshot or status | Render |
| 304 | Python via proxy | Snapshot unchanged since the version the page holds | Keep current data |
| 401 | Proxy | No valid session | Redirect to `/login` |
| 502 | Proxy | Python returned 401 (bad key) or 5xx | Keep showing cached data, error banner |
| 504 | Proxy | Python timed out | Keep showing cached data, error banner |

**Single source of truth** — the backend repo's Pydantic models define the contract, written to describe what the existing calculation code already outputs; FastAPI publishes them as `openapi.json`, attached to a GitHub release on each tag. The web repo pins a release and generates TS types and Zod validators from it in CI. Breaking changes ship as a new path (`/v2/...`) next to the old one; the web app switches, then `/v1` is removed.

**Failure handling**

- Collector: every run is logged in `collection_runs` and to Sentry; two consecutive failed runs → Sentry alert to Slack `#build-log` (Provisional channel).
- Web: the main page shows a stale-data banner when `lastSuccessAt` is older than 75 minutes, and an error banner when the proxy returns 502 or 504.
- Backups: nightly copy of the SQLite file to S3, kept 30 days (Provisional); a restore is tested once in phase 8.

## Pages

Two routes: `/login` is public, `/` is the protected main page; Next.js middleware sends any unauthenticated request for `/` to `/login`.

**`/login`**

- Email + password form, Zod-validated on client and server; Better Auth sets an httpOnly, Secure, SameSite=Lax session cookie.
- Error states: wrong credentials (generic message, no hint which field), locked out after 5 failures in 15 minutes, server error.
- Public sign-up disabled; no password-reset email, no SSO and no 2FA in v1 (Decided). Joey creates each account with `scripts/users.ts` (create, reset, disable) and hands over credentials, ideally by password-manager share; no email service. Every user sees the same data; no account settings page or settings table in v1.
- On success → redirect to `/`; already signed in → `/login` redirects to `/`.

**`/` (main page)**

- Header: app name, "Last updated \<time>" from the backend's `lastSuccessAt`, sign-out button.
- Body: the current snapshot as summary cards (15–30, all on one page), built to match the designs Joey provides; the designs are the source of truth for layout, the fields shown and their order. No tables, export or pagination. Build with shadcn/ui components and Tailwind v4 tokens; no ad-hoc CSS.
- First render happens on the server: the current snapshot through the proxy, so the page arrives filled.
- While open: TanStack Query loads the snapshot on page load and again at 2 minutes past every hour, giving the collector's on-the-hour run time to finish. When one arrives, added and changed cards highlight briefly and removed cards disappear. A "Refresh now" button checks immediately.
- States: loading skeleton, empty ("No data collected yet"), stale banner (backend's last success > 75 min ago), backend-unreachable banner that keeps showing the last snapshot loaded, fetch error with retry.
- The browser never sees DB credentials or the backend API key; everything goes through the Next.js server.

**Web app API**

| Route or action | Auth | Does |
| --- | --- | --- |
| `/api/auth/*` | — | Better Auth: sign in, sign out, session |
| `GET /api/data/records` | Session | Proxies to Python `GET /v1/records`, passing `If-None-Match` and returning `ETag` |
| `GET /api/data/status` | Session | Proxies to Python `GET /v1/status` |

The proxy forwards only these two paths and only `GET`; a valid session is required, no query parameters are accepted, and any other path returns 404 without reaching Python. It calls the configured Python host at `/v1/records` or `/v1/status`, forwarding only `Authorization: Bearer <BACKEND_API_KEY>`, `If-None-Match` (validated as an integer snapshot version), and a request id, never client cookies or other headers. Use a 10 s timeout and no retries. Validate body-bearing JSON responses with Zod; pass back only the body and `ETag`, preserving a bodyless 304 for an unchanged snapshot. Return generic 502 for backend errors or a bad backend key, and 504 for timeout, without exposing Python's error body.

## Security

The design is the backend-for-frontend pattern: the browser holds only an httpOnly session cookie, and every secret and every call to Python or Neon stays on the server. That is sound; the controls below are what make it hold, and each is part of a phase's done criteria.

| Layer | Control |
| --- | --- |
| Browser ↔ Next.js | HTTPS only through CloudFront with an ACM certificate; HSTS, CSP, `frame-ancestors 'none'`, `Referrer-Policy` and `X-Content-Type-Options` set by a CloudFront response-headers policy and in `next.config`; session cookie httpOnly, Secure, SameSite=Lax |
| CSRF | Better Auth `trustedOrigins` set to the production domain; proxy routes are GET-only and change nothing |
| Login | Better Auth's default password hashing, sign-in rate limit, generic error messages, lockout after repeated failures; public sign-up disabled in Better Auth, so an account exists only once an admin creates it; no 2FA in v1 |
| Session checks | Checked in every page, Route Handler and Server Action, not only in middleware: middleware is a redirect convenience, and CVE-2025-29927 showed it can be bypassed. Next.js 15 uses `middleware.ts` (`proxy.ts` in Next.js 16); enforce the version floors below |
| Cookie cache | Signed, so it cannot be forged; `maxAge` 5 minutes, so a revoked session stays usable for at most 5 minutes. Sign-out bypasses the cache and checks Neon |
| Lambda origin lock | Web Function endpoint uses AuthType `IamAuth`. CloudFront OAC: origin type `lambda`, signing behavior `always-amz-auth`. Function resource policy grants `cloudfront.amazonaws.com` the action `lambda:InvokeWebFunctionEndpoint`, restricted by `aws:SourceArn` to this distribution. Unsigned direct endpoint calls must return 403. `aws lambda-web deploy` is described as defaulting to a public `ApplicationManaged` endpoint: always explicitly set `--auth-type IamAuth` or its IaC equivalent, and verify in phase 1 |
| Static assets | `/_next/static/*` served by the Web Function origin and cached by CloudFront; no separate static-assets bucket |
| Proxy input | Exact allowlist of two GET paths; the Python host comes from config, never from the request (no SSRF); no query parameters accepted; `If-None-Match` validated as an integer version before it is forwarded |
| Proxy output | Sends Python only `Authorization`, `If-None-Match` and a request id, never client cookies or other headers; validates Python's response with Zod; passes back only the body and `ETag`; returns generic 502/504 without Python's error body |
| Per-user rate limit | 60 requests/min per user in the proxy, counted in a DynamoDB table with TTL, inside DynamoDB's free capacity (limit Provisional) |
| Edge protection | AWS Shield Standard, automatic and free. WAF deferred for v1: add via CloudFront's flat-rate plan or AWS WAF if sign-up opens or abuse appears |
| Cost guardrails | Set endpoint-level request rate limit (requests/second) and `maxEnvironments` on the Web Function endpoint (values Provisional, choose in phase 1). These are global, not a substitute for the DynamoDB per-user proxy limit. AWS Budgets alert at $5/month; Cost Anomaly Detection on |
| AWS access | One least-privilege IAM role per function (its own SSM parameters and the rate-limit table only); GitHub Actions deploys through OIDC with no long-lived AWS keys; CloudTrail management events on; CloudWatch log retention 14 days |
| Next.js → Python | TLS; 256-bit random key from SSM, constant-time compare, rotated every 90 days with the two-key method; nginx log format excludes `Authorization` |
| EC2 exposure | Recommended: a Cloudflare Tunnel so the instance has no inbound ports open at all, optionally with a Cloudflare Access service token as a second credential (Provisional). Otherwise the security group allows only 443 and 80 |
| Python process | FastAPI `/docs`, `/redoc` and `/openapi.json` disabled in production (the spec ships from CI instead); uvicorn on `127.0.0.1` as a non-root systemd user; the API process opens the data store read-only |
| EC2 host | SSM Session Manager instead of open SSH (Provisional); IMDSv2 required; IAM role limited to reading its own parameters and writing the backup bucket; automatic security updates |
| Backups | S3 bucket private with Block Public Access, server-side encryption and versioning |
| Neon | TLS required; pooled connection string or Neon's serverless driver, since many short-lived Lambda instances open connections; an app role without owner rights; credentials only in SSM for the web functions; separate credentials per dev branch |
| Supply chain & logs | Lockfiles committed; Dependabot or Renovate; GitHub secret scanning and push protection; CI jobs with least-privilege tokens; Sentry scrubs headers and cookies; no secrets in logs |
| Coding agents | Agents get dev credentials only, never production secrets; each agent's tokens are scoped to the minimum it needs |

**Version floors:** Next.js 15 on the latest patch, never below 15.5.28; React 19 on the latest patch, never below 19.2.1. Re-verify these floors against official security advisories when scaffolding the repo in phase 2; include an initial advisory check in phase 1. The supplied security note reports 15.5.28 as the first 15.x release containing the October 14, 2026 fixes and covering the earlier React Server Components RCE, CVE-2025-55182; verify rather than treating that report as an advisory. Next.js 15 is the maintenance line (security releases only); verify support status in phase 1. Dependabot or Renovate tracks updates; CI rejects resolved `next` or `react` versions below the floors. Open question 21 covers moving to Next.js 16.

**OAC risk:** login POST requests through CloudFront OAC are unverified. Phase 1 must demonstrate a JSON-body POST through the protected origin, including how body hashing/signing is supplied, before this design is accepted.

If users ever see different data (not planned), the proxy must also pass the user's identity to Python in a signed header, and Python must check it.

## Build workflow (agent-agnostic)

Any coding agent can build any phase: the rules live in the repos, not in the agent, and every change lands through a PR that Joey reviews.

1. Write a task file `plans/<phase>-<feature>.md` in the target repo: goal, files touched, acceptance criteria, tests to add. One repo per task; a contract change is two tasks: backend repo first (new version path), then web.
2. Point the agent of your choice at the task file and the repo's `AGENTS.md`; have it plan first, then implement on a `feat/*` branch.
3. The agent runs `make check` (lint, typecheck, tests) before opening a PR.
4. CI runs the same checks; Joey reviews and merges. Branch protection stops any agent committing to `main`.

**What every agent reads**

| File | Purpose |
| --- | --- |
| `AGENTS.md` | The single conventions file: stack, folder rules, server/client boundary, `make check`, contract-change rule, link to the other repo; web UI must use shadcn/ui components and Tailwind tokens, with no ad-hoc CSS |
| `CLAUDE.md`, `GEMINI.md` and similar | One line pointing to `AGENTS.md`, only for agents that don't read it natively |
| `docs/plan.md` | This plan, copied into both repos |
| `plans/` | Task files, kept after merge as a record |
| `.mcp.json` | Shared MCP server list for agents that support MCP; tokens come from each agent's own secret store |

## Services & accounts

Eleven services. Connection rules: MCP first, CLI second, raw API last; one scoped token per service per consumer; free tiers to start. No email service: an admin script creates users and resets passwords.

| Category | Service | Status | Agent access (MCP / CLI) | Used by |
| --- | --- | --- | --- | --- |
| Source control | GitHub (two new repos, Actions) | Have | GitHub MCP + `gh` | CI |
| Web hosting | AWS Lambda Web Functions (us-east-1) + CloudFront + ACM certificate | New | `aws` CLI (`aws lambda-web`) and GitHub Actions OIDC | Next.js |
| Rate-limit store | AWS DynamoDB table with TTL | New | `aws` CLI; deploy workflow / IaC config | Proxy |
| Backend hosting | New EC2 instance in us-east-1 (collector, FastAPI, nginx, systemd, SQLite); OS/type/size to decide | New | `aws` CLI + SSH | Python backend |
| Backups | AWS S3 bucket for nightly SQLite copies | New | `aws` CLI | Python backend |
| Accounts database | Neon Postgres in us-east-1, matching Web Function and EC2; verify availability at creation | New | Neon MCP + `neonctl` | Next.js (authentication, sessions only), Drizzle Kit |
| Domain / DNS | Cloudflare | Have | Cloudflare MCP + `wrangler` | CloudFront, API subdomain on EC2 |
| Error tracking | Sentry (Next.js + Python SDKs) | New | Sentry MCP | Web, backend |
| Library docs | Context7 | New | Context7 MCP | Coding tools |
| Browser testing | Playwright | New | Playwright MCP | CI |
| Chat ops | Slack `#build-log` | Have | Slack MCP | Sentry alerts |

Secrets/config to issue in phase 1: `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET` (web only), `BACKEND_API_URL` + `BACKEND_API_KEY` (web server; the key also on EC2), `SENTRY_DSN` per app, and any upstream API key the collector needs (EC2 only, Open question 3). Web values live in SSM Parameter Store and are read at startup through the function's IAM role (Provisional; confirm Web Functions environment-variable and secrets handling in the phase 1 spike, Open question 22). EC2 secrets also live in SSM Parameter Store as SecureString values, read through the instance's IAM role, never in a `.env` on disk (Provisional). Secrets never enter the browser bundle; the backend never gets `DATABASE_URL`, and the web app never gets upstream credentials. Neon requires TLS, a pooled connection string or serverless driver, and an app role without owner rights; Drizzle Kit runs migrations from CI.

## Dev environment

VS Code on the Mac, GitHub as source of truth, and one convention file pair read by every agent — now covering two languages.

| Item | Setup |
| --- | --- |
| JS tooling (web repo) | pnpm, single package (no workspaces or Turborepo); Node 24 via `fnm`, pinned in `.nvmrc` and CI to match `nodejs24.x` on Arm64 (Provisional); Next.js 15/React 19 latest patched releases subject to version floors, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query; no Zustand |
| Python tooling (backend repo) | Python 3.12 via `uv` (pinned in `.python-version`); `uv` for deps and lockfile; `ruff` lint + format; `pyright` types; `pytest` |
| Python libraries | `fastapi` + `uvicorn` (API), `httpx` (upstream calls), `pydantic` v2 (contract models), `sqlalchemy` 2 + `alembic` (store), `structlog`, `sentry-sdk` |
| Repo conventions | `AGENTS.md` in each repo is the single conventions file (stack, folder rules, `make check`, contract-change rule, link to the other repo); agent-specific files only point to it |
| Branching | Both repos: `main` protected; `feat/*`, `fix/*`; squash merge; conventional commits |
| Local databases | Web: Neon dev branch per developer (Provisional; alternative is Postgres in Docker). Backend: a local SQLite file seeded from fixtures |
| Local run | Backend: `uv run backend collect --once`, then `uv run uvicorn backend.api.main:app --reload --port 8000`. Web: `pnpm dev` on 3000 with `BACKEND_API_URL=http://localhost:8000` |
| Fixtures | Backend repo `fixtures/*.json` sample records, published with each contract release; web tests mock the API with them (MSW) |
| Env files | `.env.example` in each repo; real values from 1Password locally, SSM Parameter Store in production; Web Function startup loading through IAM is Provisional pending phase 1 |
| CI (web) | Node 24; lint, typecheck, Vitest, contract-version check, Drizzle migration check, version-floor check, Playwright on login → main; Drizzle Kit migrations in CI; deploy standalone linux/arm64 artifact to AWS on merge to `main` through GitHub OIDC, using `aws lambda-web` CLI or Terraform as selected in phase 1; explicitly set IamAuth |
| CI (backend) | ruff, pyright, pytest, Alembic migration check, OpenAPI diff check, contract release on tag; deploy to EC2 over SSH on merge to `main` (pull, `uv sync`, migrate, restart the services, check `/health`) |
| Editor | ESLint, Prettier, Tailwind, Python + Ruff extensions; plus extensions for whichever agents you use |

## Build phases

Nine phases; 0–1 are pre-work, 2–8 are each one or more agent tasks that end when their done-criteria pass in CI.

| # | Phase | Deliverable | Done when |
| --- | --- | --- | --- |
| 0 | Plan | This doc agreed, all Open questions closed, card designs provided | Joey signs off; card designs provided |
| 1 | Accounts & services | Create a new EC2 instance in us-east-1 after deciding OS/type/size within the hosting budget, then configure Python 3.12, `uv`, nginx/web server + TLS, systemd and security group; S3 backup bucket, API subdomain DNS; web AWS setup in us-east-1: GitHub OIDC deploy role, CloudFront distribution + ACM certificate in us-east-1, budget alert, cost anomaly detection; Neon in matching us-east-1 (verify availability), Sentry, Context7, Playwright; secrets issued. Web Functions spike verifies supported regions/runtime, standalone packaging, CLI vs Terraform deploy, SSM startup loading, version/security advisories, endpoint limits and pricing | Each CLI and MCP works from the Mac and from each agent you use; `https://api.<domain>` answers with a valid certificate. A hello-world Next.js standalone app runs on a Web Function in us-east-1 with IamAuth + CloudFront OAC: (1) page loads through CloudFront; (2) a login-style JSON-body POST succeeds (body hashing/signing unverified until tested); (3) direct unsigned endpoint request returns 403; (4) AWS Pricing Calculator confirms or corrects the web-host estimate. Prove Node 24/Arm64 runtime compatibility. If the spike fails, use the documented Event Functions fallback subject to security-floor compatibility |
| 2 | Repo scaffold | Web repo (pnpm) pins Next.js 15 and React 19 latest patched versions at or above re-verified floors, Node 24, Tailwind v4; version-floor CI check; initialize shadcn/ui with `components.json` and button, input, label, card, skeleton, alert in `components/ui/`. Backend repo (`uv`); each repo has `AGENTS.md` + pointer files, `.mcp.json`, task template, `make check`, CI, `.env.example` and `docs/plan.md` | `pnpm dev` and `uvicorn` start locally; CI green on empty PRs; a test task done by two different agents passes `make check`; `pnpm install` reports no peer-dependency errors; a shadcn/ui Button renders styled on the login page |
| 3 | Contract & schemas | Pydantic models v1, `openapi.json` release, TS/Zod codegen in web, backend store schema + Alembic, Drizzle schema for Better Auth's tables, fixtures | Codegen check passes; both migrations apply cleanly |
| 4 | Backend API | Finish the run logic so each run adds, updates and deletes records to mirror the latest API response; FastAPI wrapper around the existing code: `/v1/records` (with `ETag`), `/v1/status`, `/health`, API-key auth, response models; scheduler and S3 backup only where the existing code lacks them; deploy to EC2 | A run mirrors upstream exactly (added, changed and removed records, tested with fixtures); with key → 200 matching the schema, without → 401; unchanged snapshot → 304; `/docs` and `/openapi.json` return 404 in production; deployed `/health` returns ok |
| 5 | Auth & login page | Better Auth email/password with 5-minute session cookie cache, `middleware.ts`, `/login`, sign-up disabled, admin user script (create, reset, disable); session checks in pages, Route Handlers and Server Actions as well as middleware | Login/logout work; `/` redirects when signed out; signed-in `/login` redirects to `/`; protected handlers reject missing sessions; sign-out bypasses cookie cache and checks Neon; Playwright test passes |
| 6 | Data proxy | `/api/data/records` and `/api/data/status` proxy routes, `ETag` passthrough, per-user rate limit | No session → 401 without reaching Python; key absent from the browser bundle; unchanged snapshot → 304 end to end |
| 7 | Main page | Summary cards from the provided designs, load on open + hourly refresh at :02, last-updated, stale, empty and backend-down states | Cards match the provided designs; a new collection appears by 2 minutes past the hour without reload; Playwright test passes |
| 8 | Deploy & observe | Web Function live behind CloudFront with IamAuth + OAC, endpoint request rate limit and `maxEnvironments` set, and 14-day log retention; backend deploys to EC2 by GitHub Actions; Sentry on both web and backend; Slack alerts; backup restore tested | Production shows collected data; a forced collector failure alerts Slack; a restored backup serves data; a direct unsigned call to the Web Function endpoint returns 403 |

## Open questions

Every question below must be answered before phase 0 is signed off; each names the sections it changes.

**Data flow**

- [x] 1\. Who collects the data — decided 2026-11-09: the Python backend, on its own hourly schedule, storing all app data on EC2; the web app only reads it.
- [x] 2\. Push or pull — decided 2026-11-09: the web app reads from Python through a Next.js proxy route.
- [ ] 3\. Data source — answered 2026-11-09: an external API that returns JSON, scraped by the existing Python code; record shape is taken from the existing code's output in phase 3. Still open: which field uniquely identifies a record, and does the upstream API need a key or other credentials?
- [x] 4\. Snapshot size — answered 2026-11-09: 15–30 records, so the whole snapshot is returned in one response with no pagination.
- [x] 5\. How runs change the data — decided 2026-11-09: each run mirrors the latest API response, adding, updating and deleting records; the store holds the current snapshot only.
- [x] 6\. Retention — decided 2026-11-09: no history is kept; the nightly backups hold the last 30 days of snapshots.
- [x] 7\. Timing — decided 2026-11-09: the collector runs every hour on the hour; the main page loads data on open and refreshes at 2 minutes past every hour while it is open.
- [x] 19\. Backend store — decided 2026-11-09: SQLite on EC2.

**Main page**

- [x] 8\. Display — decided 2026-11-09: summary cards built from designs Joey provides.
- [x] 9\. Refresh rate — decided 2026-11-09: on page open and hourly (see question 7).
- [x] 10\. Export — decided 2026-11-09: no data export in v1.

**Users & auth**

- [x] 11\. Users — decided 2026-11-09: a fixed set of users; Joey creates each account and hands over the credentials; every user sees the same data.
- [x] 12\. Sign-up and recovery — decided 2026-11-09: no sign-up, no email reset, no SSO; Joey creates and resets accounts with the admin script.
- [x] 20\. Account settings — deferred to a later update; not in v1.

**Platform**

- [x] 13\. Web host — Decided 2026-11-09: AWS Lambda Web Functions behind CloudFront in us-east-1; fallback is OpenNext + SST on Event Functions. Backend host: a new EC2 instance in us-east-1.
- [ ] 14\. Backend framework and instance — framework decided 2026-11-09: FastAPI wrapping the existing Python code, with a systemd timer for the hourly run. Which OS, instance type and size should the new EC2 instance in us-east-1 use? Resolve before creating it in phase 1; instance type/size are cost decisions under the cloud-hosting budget.
- [x] 15\. Backend needs — decided 2026-11-09: the backend never needs anything from the web app; every call is stateless.
- [ ] 16\. App name and domain — still to be set up; needed before phase 1 (repo names, CloudFront domain, DNS and the API subdomain).
- [x] 17\. Which agents will you use? Decides which pointer files sit beside `AGENTS.md` and whether all of them can share `.mcp.json`.
- [x] 18\. Budget — decided 2026-11-09: paid spend only on cloud hosting (AWS) and the database (Neon); every other service stays on its free tier. Provisional web-host estimate for roughly 10 users: about $0.15/month requests + CPU, plus up to about $4–5/month if one 0.5 GB environment stays alive all month; Web Functions memory includes idle environment lifetime and has no Web Functions free tier under the supplied pricing model. Verify rates, usage assumptions and estimate in AWS Pricing Calculator during phase 1; EC2 instance type/size and other AWS services are additional hosting costs.
- [ ] 21\. Next.js version — Next.js 15 chosen 2026-11-09. Next.js 15 is on its maintenance line and Next.js 16 is already the current major (verify lifecycle status in phase 1). Web Functions need no adapter, so Next.js 16 is not blocked by OpenNext/SST. Before phase 2, decide whether to start on 16 instead (`middleware.ts` becomes `proxy.ts`).
- [ ] 22\. Deploy tooling and secrets — `aws lambda-web` CLI or Terraform for the deploy; SST support is unconfirmed; and how Web Functions read environment variables and secrets (SSM at startup is assumed). Resolve in the phase 1 spike.
