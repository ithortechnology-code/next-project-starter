# Reusable Project Starter

An npm-workspaces monorepo with a TypeScript API, web app, Expo mobile app, shared contracts, and local PostgreSQL. The default local stack runs app processes on your machine and PostgreSQL, Mailpit, OpenTelemetry Collector, and OpenObserve in Docker. SeaweedFS is an optional local S3 service.

## Stack

- Node.js 24 LTS baseline (CI also checks Node 26 LTS) and npm workspaces; TypeScript throughout
- Fastify API, Next.js web app, Expo / React Native mobile app, and shared Zod contracts
- Tailwind CSS 4 and shadcn/ui for web; NativeWind 4 with Tailwind CSS 3 for Expo mobile styling (see [design guidelines](docs/design-guidelines.md))
- PostgreSQL 18 with Kysely and one coordinated application migration history
- REST API with OpenAPI generated from route schemas
- pg-boss for PostgreSQL-backed durable jobs, processed by a separate Node.js worker
- `@starter/storage`: local filesystem and SeaweedFS S3-compatible adapters
- Provider-neutral SMTP with Mailpit for local email capture
- OpenTelemetry Collector and OpenObserve for API/worker traces, metrics, and Pino logs
- GitHub Actions and GHCR; separate staging and production VPSes
- Cloudflare Universal SSL at the edge; Caddy uses a Cloudflare Origin CA certificate in Full (strict) mode

See [SPEC.md](SPEC.md) for the starter contract, [CAPABILITIES.md](CAPABILITIES.md) for implementation status, [email setup](docs/email.md), the [PostgreSQL 18 upgrade guide](docs/postgresql-18-upgrade.md), and the [VPS deployment guide](docs/deploy-vps.md).

## Quick start

Prerequisites: Node.js 24 (selected by `.nvmrc`), npm, Docker Desktop/Engine with Compose v2. Node.js 26 LTS is also supported.

With nvm installed, run `nvm install && nvm use` from the repository to install and select the default Node.js version before setup. Other version managers should select Node.js 24 based on `.nvmrc`; automated agents should read `.nvmrc` and switch their runtime before running npm commands. The setup script checks for Node.js 24 or 26 and prints this guidance if the active version is unsupported.

`package-lock.json` is committed for reproducible installs. When changing dependencies, run `npm install` and commit the updated lockfile.

```sh
./scripts/setup.sh --start
```

This creates `.env` if needed (and adds newly introduced defaults without replacing existing values), installs packages, starts PostgreSQL and the optional services selected by `COMPOSE_PROFILES` (Mailpit, OpenObserve/Collector, and SeaweedFS by default), applies database migrations, then launches the API, web, Expo dev server, and job worker together. The setup script prints a table of service URLs and local example credentials from `.env.example`. Open `http://localhost:3000` for web, `http://localhost:4000/health` for API health, `http://localhost:8025` for captured email, `http://localhost:5080` for OpenObserve, and `http://localhost:8333` for the local S3 endpoint. The API and worker send telemetry through the Collector to OpenObserve. See [local development](docs/local-dev.md) for profile selection, logs, SeaweedFS, and signed profile-image URLs. To start app processes in separate terminals, run `./scripts/setup.sh`, then use `npm run dev`, `npm run dev:worker`, and `npm run dev:mobile` in separate terminals.

For a physical phone, set `EXPO_PUBLIC_API_URL` in `.env` to your computer's LAN IP (for example `http://192.168.1.20:4000`). Android emulator users can use `http://10.0.2.2:4000`.

Common commands:

```sh
npm run dev:api
npm run dev:worker
npm run dev:web
npm run dev:mobile
npm run typecheck
npm run lint
npm run build
docker compose down       # Stop services; keeps named data volumes
docker compose down -v    # Destructive: deletes database, telemetry, and optional SeaweedFS data
```

## Multiple agents

Each agent should get its own git worktree and Compose project. That gives it a separate source tree, `.env`, PostgreSQL, and isolated named data volumes. Generated workspaces enable Mailpit, OpenObserve/Collector, and SeaweedFS by default; remove unused entries from `COMPOSE_PROFILES` to reduce services. Its ten-port block includes app services, PostgreSQL, Mailpit, OpenObserve, OTLP, and SeaweedFS so agents can run the selected services in parallel. First commit the starter baseline, then run from the cloned or initialized git repository:

```sh
./scripts/agent-env.sh create agent-a
./scripts/agent-env.sh create agent-b
./scripts/agent-env.sh list
```

Use lowercase names with letters, numbers, hyphens, or underscores. The script deterministically maps each name to a block of ten host ports and checks that they are available before creating the worktree. The block assigns API, web, PostgreSQL, Expo/Metro, SMTP, Mailpit UI, OpenObserve, OTLP gRPC, OTLP HTTP, and SeaweedFS S3 in that order. Exact numbers are printed and saved in that worktree's `.env`; a workspace fails clearly if a port is busy. Edit `.env` to customize a mapping.

Then in that worktree:

```sh
npm ci
docker compose up -d --wait
npm run db:migrate --workspace=@starter/api
npm run dev
npm run dev:worker
```

`./scripts/agent-env.sh remove agent-a` stops only that Compose project and removes its worktree; its agent branch remains. Database volumes are retained. To delete an agent's database, explicitly run `docker compose -p starter-agent-a --env-file .agent-env/worktrees/agent-a/.env -f .agent-env/worktrees/agent-a/compose.yaml down -v` before removing the worktree.

## GitHub and CI

Create an empty GitHub repository, then push this starter:

```sh
git init -b main
git add .
git commit -m "Initial project starter"
git remote add origin git@github.com:YOUR_ORG/YOUR_REPO.git
git push -u origin main
```

Pull requests and pushes to `main` run `npm ci`, lint, typecheck, and builds in `.github/workflows/ci.yml`. Configure branch protection to require the `quality` job before merging.

## Staging and production VPSes

For CI/CD, staging and production environments, and the VPS network and TLS configuration, see [the VPS deployment guide](docs/deploy-vps.md).

## Reuse this starter

Use GitHub's **Use this template** flow, or clone it and create a new remote. Change the npm package name, app display names, Expo slug/scheme, and environment defaults before beginning product work. Keep `.env` local; commit only `.env.example`.

See [SPEC.md](SPEC.md) and [CAPABILITIES.md](CAPABILITIES.md) for the starter contract.

## Official stack references

- [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces/)
- [Next.js `transpilePackages`](https://nextjs.org/docs/pages/api-reference/config/next-config-js/transpilePackages)
- [Expo monorepo support](https://docs.expo.dev/guides/monorepos/)
- [Docker Compose health checks and startup order](https://docs.docker.com/compose/how-tos/startup-order/)
- [Docker Compose in production](https://docs.docker.com/compose/how-tos/production/)
- [Cloudflare Origin CA certificates](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/)
- [Cloudflare proxy status](https://developers.cloudflare.com/dns/proxy-status/)
- [GitHub Actions with GHCR](https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions)
