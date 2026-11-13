# ADR-0009: Build on GitHub Actions and deploy immutable images to separate VPSes

## Status

Accepted

## Date

2026-11-14

## Context

The starter targets self-hosted staging and production VPSes while keeping builds reproducible and production promotion deliberate.

## Decision

Use GitHub-hosted Actions for CI and image builds, publish API/web images to GHCR tagged by commit SHA, deploy successful `main` builds to staging, and manually promote the same image to the separate production VPS. Use protected GitHub Environments and a dedicated key-only SSH deploy account. Do not run a persistent Actions runner on either VPS.

## Alternatives considered

- **Self-hosted Actions runner on the VPS:** rejected for the baseline because untrusted workflow code could compromise the host that runs production services.
- **Cloudflare Tunnel for CI SSH:** deferred because Access-based machine authentication and the GitHub deployment connection add setup; revisit if public SSH is unacceptable.

## Consequences

- Staging and production use separate data, credentials, and VPS hosts.
- Production promotion is explicit and uses an already-built immutable image.
- SSH remains publicly reachable for GitHub-hosted deployment; password/root login stays disabled and host keys are pinned.

See [the VPS deployment guide](../deploy-vps.md) for setup and secrets.
