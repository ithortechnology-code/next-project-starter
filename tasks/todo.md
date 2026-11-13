# Task Checklist: Reusable Project Starter

- [ ] Create npm workspace foundation and repository conventions.
  - Acceptance: root `package.json` declares workspaces; strict TypeScript and standard scripts are configured.
  - Verify: `npm install`, `npm run typecheck`, `npm run lint`.
  - Files: root manifests/configuration and `.gitignore`.
- [ ] Add shared contracts and functional API health route.
  - Acceptance: API serves health and database status; shared response schema validates it.
  - Verify: API health route returns API and database status.
  - Files: `packages/shared`, `apps/api`.
- [ ] Add connected Next.js web starter.
  - Acceptance: home page calls API and displays status/errors accessibly.
  - Verify: workspace typecheck/build and local smoke check.
  - Files: `apps/web`.
- [ ] Add Expo mobile starter.
  - Acceptance: screen displays API status using configurable URL.
  - Verify: workspace typecheck and Expo config validation.
  - Files: `apps/mobile`.
- [ ] Add local PostgreSQL Compose setup.
  - Acceptance: DB has persistent volume and health check; API connects and reports DB status.
  - Verify: Compose config validation and local health route.
  - Files: `compose.yaml`, `apps/api`, `infra`.
- [ ] Add setup and isolated agent environment scripts.
  - Acceptance: named agent workspace has unique worktree, project name, host ports, and DB volume/config; cleanup targets only that workspace.
  - Verify: script dry-run/config checks for two distinct names.
  - Files: `scripts` and agent docs.
- [ ] Add production Docker images and separate VPS runtime.
  - Acceptance: API/web images build; Caddy fronts the services; PostgreSQL is private; each VPS has its own volume and Compose project.
  - Verify: build both Dockerfiles and validate Compose config.
  - Files: `apps/*/Dockerfile`, `deploy/vps`.
- [ ] Add GitHub Actions CI, GHCR publishing, and staging/production promotion.
  - Acceptance: successful main CI publishes commit-tagged images; staging deploys that image; production validates the commit and manually promotes the same image on its own VPS.
  - Verify: inspect workflows and run CI commands locally.
  - Files: `.github/workflows`.
- [ ] Complete starter usage documentation.
  - Acceptance: fresh-user flow, environment setup, agent collaboration, GitHub push, CI, deployment, and template reuse are documented.
  - Verify: command cross-check against package scripts.
  - Files: `README.md`, `docs`.

## Checkpoint: Foundation and connected web/API flow
- [ ] Workspace scripts pass.
- [ ] API and web connect end-to-end.
- [ ] Review the runnable starter before adding deployment adapters.

