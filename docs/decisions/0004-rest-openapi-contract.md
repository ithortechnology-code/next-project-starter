# ADR-0004: Use REST with OpenAPI generated from route schemas

## Status

Accepted; generation integration pending

## Date

2026-11-14

## Context

Web, mobile, and future agents need a stable API contract without maintaining duplicate route and schema definitions.

## Decision

Expose REST endpoints in Fastify. Define validation/serialization schemas with routes and generate OpenAPI from those schemas. Do not keep a separate hand-maintained OpenAPI contract.

## Alternatives considered

- **GraphQL or tRPC:** deferred; REST is broadly supported by web/mobile tooling and can be documented with OpenAPI.
- **Hand-written OpenAPI separate from route code:** rejected because the two definitions can drift.

## Consequences

- Route schemas are the source of truth for validation and API documentation.
- Shared client types or SDKs can be generated from the emitted OpenAPI document.
