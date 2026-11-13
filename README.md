# Reusable Project Starter

An npm-workspaces monorepo with a TypeScript API, web app, Expo mobile app, shared contracts, and local PostgreSQL. The default local stack runs app processes on your machine and PostgreSQL in Docker.

## Stack

- Node.js 22+ and npm 10
- Fastify API (`apps/api`)
- Next.js web (`apps/web`)
- Expo / React Native mobile (`apps/mobile`)
- Shared TypeScript + Zod contracts (`packages/shared`)
- PostgreSQL 17 in Docker Compose
- GitHub Actions CI/CD to separate self-hosted staging and production VPSes

## Quick start

Prerequisites: Node.js, npm, Docker Desktop/Engine with Compose v2.

`package-lock.json` is committed for reproducible installs. When changing dependencies, run `npm install` and commit the updated lockfile.

```sh
./scripts/setup.sh --start
```

This creates `.env` if needed, installs packages, starts PostgreSQL, then launches the API, web, and Expo dev server together. Open `http://localhost:3000`; the API health route is at `http://localhost:4000/health`. To start services in separate terminals, run `./scripts/setup.sh`, then use `npm run dev` and `npm run dev:mobile`.

For a physical phone, set `EXPO_PUBLIC_API_URL` in `.env` to your computer's LAN IP (for example `http://192.168.1.20:4000`). Android emulator users can use `http://10.0.2.2:4000`.

Common commands:

```sh
npm run dev:api
npm run dev:web
npm run dev:mobile
npm run typecheck
npm run lint
npm run build
docker compose down       # Stop services; keeps the database volume
docker compose down -v    # Destructive: also deletes local database data
```

## Multiple agents

Each agent should get its own git worktree and Compose project. That gives it a separate source tree, `.env`, PostgreSQL container, and named database volume. First commit the starter baseline, then run from the cloned or initialized git repository:

```sh
./scripts/agent-env.sh create agent-a
./scripts/agent-env.sh create agent-b
./scripts/agent-env.sh list
```

Use lowercase names with letters, numbers, hyphens, or underscores. The script deterministically maps each name to a block of four host ports and checks that all four are available before creating the worktree. Each block assigns API at the base, web at base + 1, PostgreSQL at base + 2, and Expo/Metro at base + 3. Expo and Metro share the same dev-server port. Exact numbers are printed and saved in that worktree's `.env`; a workspace fails clearly if a port is busy. Edit `.env` to customize a mapping.

Then in that worktree:

```sh
npm ci
docker compose up -d --wait
npm run dev
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

See [the VPS deployment guide](docs/deploy-vps.md). CI builds API/web Docker images and publishes them to GHCR using the passing commit SHA. A successful `main` build deploys that exact image to the staging VPS. Production uses a manual workflow to promote the same image tag to its separate VPS. Both environments use independent databases, volumes, domains, and GitHub Environment secrets.

## Reuse this starter

Use GitHub's **Use this template** flow, or clone it and create a new remote. Change the npm package name, app display names, Expo slug/scheme, and environment defaults before beginning product work. Keep `.env` local; commit only `.env.example`.

See [SPEC.md](SPEC.md) and [CAPABILITIES.md](CAPABILITIES.md) for the starter contract.

## Official stack references

- [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces/)
- [Next.js `transpilePackages`](https://nextjs.org/docs/pages/api-reference/config/next-config-js/transpilePackages)
- [Expo monorepo support](https://docs.expo.dev/guides/monorepos/)
- [Docker Compose health checks and startup order](https://docs.docker.com/compose/how-tos/startup-order/)
- [Docker Compose in production](https://docs.docker.com/compose/how-tos/production/)
- [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- [GitHub Actions with GHCR](https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions)
