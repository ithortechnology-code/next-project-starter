# Implementation Plan: Reusable Project Starter

## Overview

Build a template-ready npm workspace with an API, web app, Expo app, shared contracts, Docker PostgreSQL, per-agent isolated compose environments, and GitHub CI/deployment templates.

## Architecture Decisions

- npm workspaces and one root lockfile keep package management native to Node.js.
- TypeScript is used throughout; shared Zod contracts make the web/API boundary explicit.
- Fastify API, Next.js web, Expo mobile, PostgreSQL and Docker Compose form the default app stack.
- Local agent isolation uses separate git worktrees plus generated `.env` and Compose project names; Docker host ports vary per agent while container ports remain stable.
- CI runs on GitHub-hosted Actions runners and publishes immutable SHA-tagged API/web images to GHCR after quality checks pass.
- Staging and production use separate Ubuntu VPSes with Caddy, Docker Compose, and independent PostgreSQL volumes.
- Staging deploys the passing `main` image automatically; production manually promotes the same SHA-tagged images after an environment approval.
- VPS deployment credentials live in protected GitHub Environments; the VPS itself does not run a GitHub Actions runner.

## Dependency Graph

Shared contracts → API → web integration. The app skeleton precedes Docker and agent isolation. CI runs against the completed workspaces; deployment templates follow CI.

## Task List

### Phase 1: Foundation
1. Create npm workspace manifests, TypeScript configuration, formatting/lint scripts, ignore files, and repository template docs.
2. Create shared Zod contracts and an API health route.

### Phase 2: Runnable applications
3. Create Next.js web starter that calls API and renders service/database status.
4. Create Expo mobile starter with API health screen and configurable API URL.
5. Add PostgreSQL Compose service, readiness checks, and API database connectivity.

### Phase 3: Local collaboration and delivery
6. Add setup and agent workspace scripts that allocate isolated git worktrees, Docker project names, database volumes, and host ports.
7. Add production Docker images, a VPS Compose stack, Caddy routing, and a rollback-capable deploy script.
8. Add GitHub Actions quality CI, GHCR publishing, automatic staging deployment, and manually approved production promotion.
9. Document VPS bootstrap, DNS, environment secrets, backups, deployment, and creating future projects from the template.

## Risks and Mitigations

- Mobile simulators need host-specific networking: expose `EXPO_PUBLIC_API_URL` and document emulator/device addresses.
- Dynamic ports can collide if independently assigned: allocate a deterministic range from a hash with collision detection and allow override.
- VPS access and domain values differ per project: inject them through separate GitHub Environments and configure each host's persistent `.env` once.
- Deploying from an untrusted self-hosted runner exposes the VPS: use GitHub-hosted runners and narrowly scoped SSH deployment secrets.
- Dependency installation may be network-restricted in this environment: keep manifests reproducible and report any verification blocked by that condition.

## Verification Checkpoints

- After tasks 1–3: npm workspace install, lint/typecheck/build, and API/web connected flow.
- After tasks 4–6: Expo typecheck plus concurrent isolated environment/port/database configuration checks.
- After tasks 7–9: inspect workflow triggers and protection conditions; check documentation commands against manifests.

