# Capability Map: Reusable Project Starter

| Module id | Responsibility | Depends on |
|---|---|---|
| `starter-apps` | Opinionated TypeScript monorepo with Node.js API, web app, Expo app, shared package, PostgreSQL schema, and working starter flows | — |
| `local-environments` | One-command setup, Docker services, environment configuration, health checks, and isolated agent workspaces with separate ports and databases | `starter-apps` |
| `persistence` | PostgreSQL access through Kysely with one coordinated, append-only application migration history | `starter-apps` |
| `api-contract` | REST routes whose schemas generate the OpenAPI contract | `starter-apps` |
| `file-storage` | One storage interface with local filesystem and SeaweedFS S3-compatible adapters | `local-environments` |
| `email` | Provider-neutral SMTP mailer, Mailpit local capture, and environment-specific product SMTP configuration | `local-environments` |
| `durable-jobs` | pg-boss on PostgreSQL selected; runtime worker integration remains to be implemented | `persistence` |
| `delivery-pipeline` | GitHub CI, GHCR image publishing, and protected deployment to separate staging/production VPSes | `persistence`, `api-contract`, `file-storage`, `email`, `local-environments` |
| `observability` | API traces, metrics, and Pino logs shipped through a private OpenTelemetry Collector to self-hosted OpenObserve per VPS environment | `delivery-pipeline` |

Build order: `starter-apps` → `persistence` / `api-contract` → `local-environments` → `file-storage` / `email` → `delivery-pipeline` → `observability`; `durable-jobs` follows `persistence`; pg-boss is selected and its worker integration remains to be implemented.

