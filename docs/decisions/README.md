# Architecture decisions

This index summarizes the starter's current defaults. [SPEC.md](../../SPEC.md) is the normative starter contract; [CAPABILITIES.md](../../CAPABILITIES.md) tracks what is implemented and pending. Decision records preserve rationale, while [the VPS guide](../deploy-vps.md) and [email guide](../email.md) describe operation.

| Area | Default | Status | Decision record |
|---|---|---|---|
| Workspace and apps | Node.js 22+, npm workspaces, TypeScript, Fastify, Next.js, Expo, Zod | Accepted | [ADR-0008](0008-typescript-npm-monorepo.md) |
| Database | PostgreSQL, Kysely, one coordinated migration history | Selected; integration pending | [ADR-0003](0003-postgresql-kysely-migrations.md) |
| API contract | REST; OpenAPI generated from Fastify route schemas | Selected; generation pending | [ADR-0004](0004-rest-openapi-contract.md) |
| Durable jobs | pg-boss backed by PostgreSQL; separate Node worker | Selected; worker pending | [ADR-0001](0001-postgresql-jobs-with-pg-boss.md) |
| Files | Local filesystem in development; SeaweedFS S3 adapter for self-hosting | Selected; adapters pending | [ADR-0005](0005-project-operated-file-storage.md) |
| Email | Nodemailer over provider-neutral SMTP; Mailpit locally | Local mailer implemented | [ADR-0006](0006-provider-neutral-smtp.md) |
| Telemetry | OpenTelemetry API SDK and Collector; OpenObserve per VPS environment | API/VPS pipeline implemented | [ADR-0007](0007-open-telemetry-openobserve.md) |
| Edge TLS | Cloudflare Universal SSL; Caddy with Origin CA in Full (strict); flat hostnames | Config/docs implemented; certs and firewall provisioned per VPS | [ADR-0002](0002-cloudflare-origin-tls.md) |
| Delivery | GitHub Actions, GHCR, automatic staging, manual production promotion to separate VPSes | Implemented; host credentials remain environment setup | [ADR-0009](0009-github-vps-delivery.md) |
