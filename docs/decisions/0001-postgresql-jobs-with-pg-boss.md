# ADR-0001: Use pg-boss for durable jobs

## Status

Accepted

## Date

2026-11-14

## Context

The starter uses PostgreSQL as its primary database and targets low-operations local development and self-hosted VPS deployments. Applications need a reliable way to run work outside an HTTP request, including email delivery, scheduled maintenance, and slow or retryable integrations. Adding a separate Redis service by default increases local and production operating requirements.

## Decision

Use pg-boss as the default durable job queue. Run handlers in a separate Node.js worker process/container, and let API processes enqueue work. Keep queue data in PostgreSQL. Handlers must be idempotent because delivery is at least once and a job can be retried after a crash or timeout.

## Alternatives considered

### In-process asynchronous work

Rejected for important work because process termination loses in-memory tasks and there is no built-in durable retry or scheduling.

### BullMQ with Redis

Deferred because it requires operating another service in the default stack. Reconsider if a product needs BullMQ's workflow features, Redis-backed throughput, or queue-specific scaling beyond PostgreSQL's practical capacity.

### Graphile Worker

Not selected because pg-boss provides the required PostgreSQL-native queue, retries, scheduling, and multi-process worker support with a direct Node.js API.

## Consequences

- Local, staging, and production need no queue datastore beyond PostgreSQL.
- Web/API and worker processes can scale and restart independently.
- Queue tables and job payloads share PostgreSQL operational and backup concerns; apply retention and avoid putting secrets or unnecessary personal data in payloads.
- At-least-once execution requires idempotent handlers and careful handling of external side effects.
- PostgreSQL connections are shared by the API, migrations, and workers; size each pool so total connections stay within the server limit.
- The starter should provide a worker entrypoint, graceful shutdown, queue registration, and observability when the runtime integration is implemented.
