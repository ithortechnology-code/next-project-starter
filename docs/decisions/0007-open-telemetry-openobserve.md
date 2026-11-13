# ADR-0007: Use OpenTelemetry and self-hosted OpenObserve

## Status

Accepted; API and VPS pipeline implemented

## Date

2026-11-14

## Context

The starter needs portable server-side traces, metrics, and logs for its self-hosted staging and production environments, without starting with a paid observability service.

## Decision

Instrument the API with OpenTelemetry and send OTLP signals to an environment-local OpenTelemetry Collector. The Collector authenticates and exports to an OpenObserve instance running in Docker on that same VPS. Keep the Collector receiver private to its Docker network and keep staging and production telemetry stores separate.

## Alternatives considered

- **Direct vendor SDKs:** rejected because they couple application instrumentation to a backend.
- **Hosted observability as a required service:** deferred to individual products; the starter should work self-hosted.

## Consequences

- Server-side instrumentation remains portable through OTLP.
- Each environment needs storage retention, backup, and access-control settings for OpenObserve.
- Browser and Expo telemetry are not part of the current implementation.

See [the VPS guide](../deploy-vps.md) for deployment details.
