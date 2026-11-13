# ADR-0002: Use Cloudflare Origin CA for VPS TLS

## Status

Accepted

## Date

2026-11-14

## Context

The starter uses Cloudflare DNS and its proxied edge for staging and production web traffic. Caddy currently routes requests to the web app, API, and OpenObserve on each VPS. We want Cloudflare to manage visitor-facing certificates and do not want Caddy requesting and rotating public ACME certificates.

## Decision

Use Cloudflare Universal SSL at the edge and a Cloudflare Origin CA certificate at Caddy, with Cloudflare SSL/TLS set to Full (strict). Use flat, one-level hostnames so the free Universal SSL certificate can cover production and staging hostnames:

- Production: `example.com`, `api.example.com`, `observe.example.com`
- Staging: `staging.example.com`, `staging-api.example.com`, `staging-observe.example.com`

Each VPS receives its own Origin CA certificate and private key outside Git and CI. Caddy loads them from a read-only mounted `deploy/certs` directory. Publish only origin TCP 443; restrict it at the VPS firewall to Cloudflare's published IP ranges. Do not publish port 80.

## Alternatives considered

### Caddy-managed publicly trusted ACME certificates

Rejected because the user wants certificate issuance and rotation handled by Cloudflare.

### Cloudflare Tunnel

Deferred as an option. It removes public origin web ingress, but adds Tunnel configuration and does not by itself replace the separate SSH-based GitHub Actions deployment path.

## Consequences

- Visitors receive Cloudflare-managed edge certificates; Caddy does not request or renew public certificates.
- Cloudflare-to-Caddy traffic remains encrypted and validated in Full (strict) mode.
- Origin CA is not browser-trusted. Direct clients must not connect to the origin; the firewall enforces this for web traffic.
- Cloudflare does not notify about Origin CA expiry; track expiry and replace certificates before they expire.
- SSH remains separately reachable for GitHub-hosted deployment until a Tunnel/Access CI path is designed.
