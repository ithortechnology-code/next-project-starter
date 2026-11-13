# Capability Map: Reusable Project Starter

| Module id | Responsibility | Depends on |
|---|---|---|
| `starter-apps` | Opinionated TypeScript monorepo with Node.js API, web app, Expo app, shared package, PostgreSQL schema, and working starter flows | — |
| `local-environments` | One-command setup, Docker services, environment configuration, health checks, and isolated agent workspaces with separate ports and databases | `starter-apps` |
| `delivery-pipeline` | GitHub CI, GHCR image publishing, and protected deployment to separate staging/production VPSes | `starter-apps`, `local-environments` |

Build order: `starter-apps` → `local-environments` → `delivery-pipeline`.

