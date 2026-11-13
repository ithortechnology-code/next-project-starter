# Spec: Reusable Project Starter

## Objective

Create a root-level, reusable starter repository that can be copied or generated for future projects. A developer can start the web app, API, PostgreSQL, and Expo app locally with one documented setup. Multiple agents can work in independent workspaces with isolated service ports and PostgreSQL databases. The repository is ready to push to GitHub and includes CI plus configurable staging and production deployment workflows.

## Assumptions

- Use npm workspaces and TypeScript throughout; npm is the package manager for install, scripts, and CI.
- Use Node.js with Fastify for the API, Next.js for web, Expo/React Native for mobile, and a shared TypeScript package.
- Use PostgreSQL in Docker Compose for local development; each agent workspace gets a unique compose project, port range, and database volume/name.
- Use Kysely as the PostgreSQL query layer. Keep one ordered, append-only Kysely migration history per application/database; deployment must run migrations once before starting the new application version.
- Use REST APIs with OpenAPI generated from the Fastify route schemas; do not maintain a separate hand-written API schema.
- Use pg-boss for PostgreSQL-backed durable jobs. Run job handlers in a separate Node.js worker process/container; do not introduce Redis as a requirement by default.
- Operate file storage in the project: local filesystem for developer environments and a SeaweedFS S3-compatible adapter for self-hosted deployments, behind one application storage interface.
- Use provider-neutral SMTP configuration for sending email. Local and agent environments route mail to Mailpit; each product chooses its own real SMTP provider for staging and production.
- Target Docker Desktop/Engine with Compose v2 on macOS/Linux; the shell setup scripts target macOS/Linux.
- GitHub Actions hosted runners provide CI and build versioned Docker images in GHCR. VPS release procedures are documented in the deployment guide.
- API traces, metrics, and Pino logs use OpenTelemetry and an environment-local Collector; each Collector authenticates to its own OpenObserve instance. Collector ports stay on a private Docker network.
- The starter includes functional health/status flows and a minimal connected web-to-API example, not a full product or authentication system.
- Local one-click means a setup script that checks prerequisites, creates environment files, starts dependencies, installs packages, and provides clear next commands.

## Tech Stack

- Node.js 22.12+, TypeScript, npm workspaces
- API: Fastify
- Web: Next.js
- Mobile: Expo with React Native
- Database: PostgreSQL, Kysely, Kysely Migrator, Docker Compose
- API contract: REST, Fastify route schemas, generated OpenAPI
- Jobs: pg-boss on PostgreSQL; separate Node.js worker process/container
- Files: project-operated filesystem and SeaweedFS S3-compatible storage adapter
- Email: SMTP transport configured per product; Mailpit for local capture
- Validation: Zod
- CI/CD: GitHub Actions, GHCR, SSH deployment to separate VPSes
- VPS runtime: Docker Compose, PostgreSQL, pg-boss worker, SeaweedFS, OpenTelemetry Collector, OpenObserve, and Caddy
- Local orchestration: Docker Compose plus scripts

## Commands

- Setup: `./scripts/setup.sh`
- Install: `npm install`
- Start API and web: `npm run dev`
- Start API, web, Expo, and worker: `npm run dev:all`
- Start web: `npm run dev:web`
- Start API: `npm run dev:api`
- Start worker: `npm run dev:worker`
- Apply migrations: `npm run db:migrate --workspace=@starter/api`
- Start Expo: `npm run dev:mobile`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`
- Start an isolated agent environment: `./scripts/agent-env.sh create <name>`

## Project Structure

```text
apps/api/              Fastify API and health endpoint
apps/web/              Next.js web app consuming the API
apps/mobile/           Expo starter app
apps/api/src/migrations/  Coordinated application migration history
packages/shared/       Shared schemas and types
compose.yaml           Local PostgreSQL service
scripts/               Setup and isolated-agent environment scripts
.github/workflows/     CI and deployment workflow templates
deploy/vps/            VPS Compose, Caddy, Collector, and deployment scripts
docs/deploy-vps.md    VPS CI/CD, Cloudflare DNS/TLS, SSH, and operations guide
packages/storage/      Storage interface and filesystem/S3-compatible adapters
docs/                  Architecture, local development, agents, and VPS deployment
docs/email.md          SMTP configuration and Mailpit local capture
```

## Code Style

- TypeScript strict mode; ESM; named exports; `camelCase` values and `PascalCase` types/components.
- Validate inputs at boundaries with shared Zod schemas.
- Keep apps independent and put only genuinely cross-app contracts in `packages/shared`.
- Example:

```ts
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
});
```

## Verification Strategy

- CI runs dependency installation, lint, typecheck, and production builds.
- Docker Compose health checks validate local PostgreSQL readiness.
- Local verification includes launching API/web against PostgreSQL and confirming health/status endpoints.
- Expo is bundled in CI; simulator/device execution remains a developer workflow.

## Boundaries

- Always: keep secrets out of the repository; provide `.env.example`; use isolated names, ports, and volumes per agent workspace; document destructive cleanup separately from setup; use health checks and graceful startup errors.
- Ask first: configuring real VPS access credentials, changing the self-hosted deployment model, adding auth/billing, or introducing paid services.
- Never: commit credentials, make deployment workflows deploy without environment protection/secrets, or make setup delete user data.

## Success Criteria

- A fresh checkout can be configured with one setup command and started using documented commands.
- Docker runs PostgreSQL and any required local services with health checks.
- API and web starter apps run and demonstrate an end-to-end web-to-API request; Expo app launches with starter UI.
- PostgreSQL access uses Kysely and one migration history; a deployment runs migrations once before application rollout.
- REST route schemas generate the OpenAPI document.
- File-storage callers use one interface with a local filesystem adapter and a SeaweedFS S3-compatible deployment adapter.
- pg-boss is the selected PostgreSQL-backed durable-job integration; handlers use idempotency because jobs may be delivered more than once.
- Local and agent email sends are captured by Mailpit; staging and production use product-selected SMTP providers configured outside source control.
- The API exposes a provider-neutral SMTP mailer configured only from environment variables; no provider credentials are committed.
- Two named agent environments can run at the same time without port, database, or volume collisions.
- GitHub Actions CI checks all workspaces and publishes commit-tagged API/web images after quality checks pass.
- Staging and production use separate VPSes and databases; staging deploys after CI and production manually promotes the same image tag using protected environment secrets.
- Staging and production keep independent OpenObserve data volumes and credentials; API traces, metrics, and Pino logs flow through the private Collector.
- README documents prerequisites, local setup, agent isolation, GitHub push/CI, links to deployment guidance, and template reuse.

## Open Questions

- VPS host, DNS names, SSH deploy users/keys, and GHCR pull credentials are supplied during environment setup; no VPS credentials are committed.
- A real app store publishing pipeline is out of scope; Expo local development is included.
- Cloudflare Tunnel with Access may replace direct GitHub Actions SSH after its CI authentication and deployment flow are designed.
