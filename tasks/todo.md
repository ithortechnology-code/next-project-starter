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

- [x] Workspace typecheck and API/web/Expo production builds pass in local checks and remote CI.
- [x] CI passed on Node 24 and 26 for commit `aea9aaa`; auth integration and GHCR image publishing completed successfully.
- [x] The reference staging VPS deployed commit `aea9aaa`; migrations and container health checks passed, and public HTTPS smoke checks passed for web, API health, and OpenObserve.
- [x] The staging database contained zero registered users when checked on 2026-11-18.
- [x] VPS Compose configuration renders; deploy shell scripts parse; `git diff --check` passes.
- [x] The npm registry audit completed. The production dependency audit reported zero vulnerabilities at the API documentation checkpoint.
- [ ] Run a controlled staging account lifecycle using a test inbox: sign up, verify email, sign in/out, request a password reset, and complete it.
- [ ] Exercise an application-level S3 upload/download and signed URL against the staging SeaweedFS bucket; current verification only confirmed bucket access with the app credentials.
- [ ] Generate a staging request and confirm its trace/log/metric appears in OpenObserve with no credential or personal-data leakage.
- [ ] Test off-server PostgreSQL/object-store backup and restore, then rehearse application rollback. These are not covered by the successful deploy smoke checks.
- [ ] Provision and verify a separate production environment; production has not been deployed.

## API documentation coverage

- [x] Generate individual Better Auth operations and combine them with the Fastify contract at `/openapi.json`. Serve interactive Swagger UI at `/docs/` with the same document.
- [ ] Recheck upstream-generated Better Auth response details when upgrading Better Auth, particularly provider-dependent errors and response payloads. The starter has no configured social providers, so provider-specific success flows were not exercised locally.
