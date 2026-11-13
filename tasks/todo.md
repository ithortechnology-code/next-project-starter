# Task Checklist: Reusable Project Starter

## Completed

- [x] npm workspace, TypeScript API/web/Expo apps, shared Zod contracts, and one-command local setup.
- [x] Local PostgreSQL and Mailpit; isolated agent worktrees, Compose projects, ports, and databases.
- [x] Kysely connection factory/types, PostgreSQL health query, ordered migrations, and CLI.
- [x] VPS deploy runs migrations once before API/worker rollout and stops on migration failure.
- [x] Fastify route schemas generate the OpenAPI contract at `/openapi.json`.
- [x] pg-boss producer, idempotency-key example job, separate worker, and graceful shutdown.
- [x] Filesystem and S3-compatible storage adapters behind `@starter/storage`.
- [x] Private persistent SeaweedFS S3 service with separate environment credentials and backup guidance.
- [x] Local OpenObserve/Collector stack, optional SeaweedFS profile, and signed profile-image URL flow for both storage adapters.
- [x] Correlated API/worker events, bounded request/job metrics, per-job spans, and local OpenObserve ingestion verification.
- [x] Default local filesystem and SeaweedFS availability; Compose profiles configure optional local service groups.
- [x] GitHub CI, GHCR images, staging deploy, protected production promotion, SMTP/Mailpit, OTel Collector/OpenObserve, and Cloudflare Origin CA Caddy configuration.
- [x] README, SPEC, CAPABILITIES, VPS guide, implementation plan, and task checklist reconciled.

## Final checkpoint

- [x] Workspace typecheck and API/web/Expo production builds pass.
- [x] VPS Compose configuration renders; deploy shell scripts parse; `git diff --check` passes.
- [ ] npm audit could not reach registry.npmjs.org in this environment.
- [ ] No live VPS, DNS, Cloudflare, or GitHub credentials were used; deployment configuration remains to be applied during environment setup.
