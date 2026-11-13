# ADR-0008: Use an npm TypeScript monorepo for the starter apps

## Status

Accepted

## Date

2026-11-14

## Context

The reusable starter needs one install/build workflow for a Node API, web app, mobile app, and shared TypeScript contracts, while remaining approachable for a solo developer and parallel agents.

## Decision

Use Node.js 22+, npm workspaces, and TypeScript throughout. Use Fastify for the API, Next.js for web, Expo/React Native for mobile, and Zod for shared boundary validation.

## Alternatives considered

- **pnpm workspaces:** considered, but npm was preferred to avoid requiring developers and CI to install another package manager.
- **Separate repositories:** rejected for the starter because coordinated contracts and shared setup benefit from one repository.

## Consequences

- The root lockfile and npm scripts coordinate workspace installation and CI.
- Agent worktrees share conventions while keeping separate local environment files, Compose projects, ports, and databases.
