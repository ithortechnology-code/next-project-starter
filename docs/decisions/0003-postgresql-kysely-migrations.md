# ADR-0003: Use Kysely with one coordinated migration history

## Status

Accepted; application integration pending

## Date

2026-11-14

## Context

The starter needs typed SQL access to PostgreSQL and predictable schema changes across local, agent, staging, and production environments.

## Decision

Use Kysely for PostgreSQL queries and Kysely Migrator for schema changes. Maintain one ordered, append-only migration history per application database. Deployments run migrations once before rolling out the new application version.

## Alternatives considered

- **Prisma or TypeORM:** not selected; Kysely keeps queries close to SQL and avoids a heavier model layer.
- **Uncoordinated per-service migrations:** rejected because shared database changes need one clear order and deployment owner.

## Consequences

- Developers write SQL-shaped queries with TypeScript types.
- Migration order and backward compatibility are deployment concerns; migrations must not be run independently by each API replica.
