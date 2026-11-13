# Spec: Reusable Project Starter

## Objective

Create a root-level, reusable starter repository that can be copied or generated for future projects. A developer can start the web app, API, PostgreSQL, and Expo app locally with one documented setup. Multiple agents can work in independent workspaces with isolated service ports and PostgreSQL databases. The repository is ready to push to GitHub and includes CI plus configurable staging and production deployment workflows.

## Assumptions

- Use npm workspaces and TypeScript throughout; npm is the package manager for install, scripts, and CI.
- Use Node.js with Fastify for the API, Next.js for web, Expo/React Native for mobile, and a shared TypeScript package.
- Use PostgreSQL in Docker Compose for local development; each agent workspace gets a unique compose project, port range, and database volume/name.
- Target Docker Desktop/Engine with Compose v2 on macOS/Linux; the shell setup scripts target macOS/Linux.
- GitHub Actions hosted runners provide CI and build versioned Docker images in GHCR. VPS deploys use SSH from protected GitHub Environment jobs; no GitHub runner runs on the VPS.
- Staging and production run on separate Ubuntu 24.04 VPSes, each with its own Docker Compose project, PostgreSQL volume, Caddy reverse proxy, domains, and environment secrets.
- Staging deploys the commit image after CI succeeds on `main`; production manually promotes a commit image already built by CI.
- The starter includes functional health/status flows and a minimal connected web-to-API example, not a full product or authentication system.
- Local one-click means a setup script that checks prerequisites, creates environment files, starts dependencies, installs packages, and provides clear next commands.

## Tech Stack

- Node.js 22+, TypeScript, npm workspaces
- API: Fastify
- Web: Next.js
- Mobile: Expo with React Native
- Database: PostgreSQL, Docker Compose
- Validation: Zod
- CI/CD: GitHub Actions, GHCR, SSH deployment to separate VPSes
- VPS runtime: Docker Compose, PostgreSQL, Caddy reverse proxy with automatic HTTPS
- Local orchestration: Docker Compose plus scripts

## Commands

- Setup: `./scripts/setup.sh`
- Install: `npm install`
- Start API and web: `npm run dev`
- Start API, web, and Expo: `npm run dev:all`
- Start web: `npm run dev:web`
- Start API: `npm run dev:api`
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
packages/shared/       Shared schemas and types
compose.yaml           Local PostgreSQL service
scripts/               Setup and isolated-agent environment scripts
.github/workflows/     CI and deployment workflow templates
deploy/vps/            VPS Compose, Caddy, and deployment scripts
docs/                  Architecture, local development, agents, and VPS deployment
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
- Two named agent environments can run at the same time without port, database, or volume collisions.
- GitHub Actions CI checks all workspaces and publishes commit-tagged API/web images after quality checks pass.
- Staging and production use separate VPSes and databases; staging deploys after CI and production manually promotes the same image tag using protected environment secrets.
- README documents prerequisites, local setup, agent isolation, GitHub push/CI, deployment setup, and template reuse.

## Open Questions

- VPS host, DNS names, SSH deploy users/keys, and GHCR pull credentials are supplied during environment setup; no VPS credentials are committed.
- A real app store publishing pipeline is out of scope; Expo local development is included.

