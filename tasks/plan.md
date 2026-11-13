# Implementation Plan: Reusable Project Starter

## Goal

Complete the starter architecture chosen in the project discussion: npm/TypeScript apps, PostgreSQL and Kysely, generated REST/OpenAPI, pg-boss jobs, project-operated storage, SMTP, OpenObserve telemetry, and separate staging/production VPS deployments. Keep architecture notes concise in README/SPEC/CAPABILITIES; this file tracks delivery only.

## Implementation status

### Completed baseline

- [x] npm workspace with TypeScript API, web, Expo app, shared contracts, local PostgreSQL, Mailpit, OpenObserve, and Collector.
- [x] Isolated agent worktrees, Compose projects, ten service ports, and independent database/telemetry volumes.
- [x] API/web images, GitHub CI, GHCR, staging deployment, and manual production promotion.
- [x] SMTP mailer; OpenTelemetry API/worker instrumentation, Collector, and per-VPS OpenObserve.
- [x] Cloudflare Origin CA certificates served by Caddy in Full (strict) mode.

### Completed starter runtime

- [x] Kysely connection factory and database types shared by API/migrator; PostgreSQL health query uses Kysely.
- [x] Ordered Kysely migration directory and CLI. VPS deploy starts PostgreSQL and runs migrations before API/worker rollout; migration errors stop rollout.
- [x] Fastify route schemas generate `/openapi.json`.
- [x] PostgreSQL-backed pg-boss producer and separate worker entrypoint, graceful shutdown, and idempotency-key example.
- [x] Typed `@starter/storage` interface with filesystem and S3-compatible adapters, configured from environment variables.
- [x] Private persistent SeaweedFS S3 service in VPS Compose; staging and production use separate credentials and volumes.
- [x] Optional local SeaweedFS profile and signed, short-lived profile-image upload/download URLs across filesystem and S3 adapters.
- [x] OpenObserve API request and worker job signals: correlated structured events, bounded RED/outcome metrics, and a trace span per worker job.
- [x] README, SPEC, CAPABILITIES, deployment guide, and this checklist reflect the implemented stack.

## Verification completed

- [x] Workspace typecheck.
- [x] API, web, and Expo production builds.
- [x] VPS Compose config rendering, deployment shell syntax, and `git diff --check`.
- [ ] Dependency audit: npm registry was unreachable in the current environment, so the advisory check could not complete.
- [ ] Live database, SeaweedFS, VPS, Cloudflare, and GitHub deployment checks remain environment setup tasks; no live credentials were available.

## Operational constraints

- Use additive/backward-compatible migrations so old app images tolerate the deployed schema during rollback.
- Treat pg-boss jobs as at-least-once; make real handlers idempotent and keep secrets/needless personal data out of payloads.
- Keep filesystem/S3 keys provider-neutral and storage credentials outside Git.
- Example signed-file routes are disabled in production unless explicitly enabled; add product authentication, ownership checks, and rate limits before enabling them for real users.
- Bound PostgreSQL pools across API and worker processes to fit the VPS connection budget.
