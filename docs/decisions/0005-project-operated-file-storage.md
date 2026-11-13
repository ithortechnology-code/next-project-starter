# ADR-0005: Operate file storage behind one adapter interface

## Status

Accepted; adapters pending implementation

## Date

2026-11-14

## Context

Projects need local file storage during development and self-hosted object storage in staging/production without coupling application code to a storage vendor.

## Decision

Define one application storage interface. Use the local filesystem for development and a SeaweedFS S3-compatible adapter for self-hosted deployments.

## Alternatives considered

- **Cloud-vendor-specific object storage SDKs:** deferred because the starter targets self-hosted VPSes and should avoid mandatory paid services.
- **Direct filesystem calls throughout app code:** rejected because it couples features to one environment and makes storage replacement difficult.

## Consequences

- Applications use the shared interface rather than vendor APIs.
- Production requires persistent storage volumes, backups, and an S3-compatible endpoint/credentials; these are product deployment configuration.
