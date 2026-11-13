# Self-hosted VPS deployment

The TLS and delivery decisions are recorded in [ADR-0002](decisions/0002-cloudflare-origin-tls.md) and [ADR-0009](decisions/0009-github-vps-delivery.md).

The starter deploys the API and web app to two independent Ubuntu 24.04 VPSes. PostgreSQL, Caddy, the API, the web app, OpenTelemetry Collector, and OpenObserve run in Docker Compose on each host. The mobile app is built for iOS/Android by CI; mobile store submission is a separate step. Cloudflare hosts public DNS and proxies the web hostnames. Cloudflare Universal SSL serves visitor-facing certificates; each VPS uses a Cloudflare Origin CA certificate in Caddy for Full (strict) origin TLS. The initial deployment retains direct SSH from GitHub Actions; Cloudflare Tunnel remains an option if you later want to remove public inbound SSH.

## Release flow

1. A pull request runs `npm ci`, lint, typecheck, and production builds.
2. A successful push to `main` builds API and web images and pushes immutable `sha-<commit>` tags to GHCR.
3. The staging workflow deploys that exact tag to the staging VPS over SSH. Compose waits for service health, then the deploy script checks the public HTTPS endpoints. On failure, it restores the previously recorded image tag when one exists.
4. After staging review, run **Promote image to production VPS** manually and supply the same 40-character commit SHA (the suffix of the `sha-<commit>` image tag). The workflow checks out that commit's deployment script and deploys its already-published image. Configure the GitHub `production` Environment with required reviewers before using this workflow.

The two VPSes do not share databases, volumes, or deploy secrets. CI runs on GitHub-hosted runners; no Actions runner is installed on either server.

Cloudflare proxying hides the origin address from visitors using proxied hostnames, but the address is not secret if another DNS record, service, or historical record reveals it. Restrict inbound TCP 443 at the VPS firewall to [Cloudflare's published IP ranges](https://www.cloudflare.com/ips/); do not publish port 80. The Caddy container publishes only 443 and serves the mounted Origin CA certificate. Browsers should reach the origin only through Cloudflare; a direct-origin connection will not trust Origin CA. The simple GitHub-hosted CI deployment still needs public SSH with key-only authentication. Cloudflare Tunnel plus Access can remove that inbound SSH port, but adds identity and CI connection setup. Track Origin CA expiry yourself because Cloudflare does not send expiry notices.

## VPS prerequisites

For each environment:

1. Create an Ubuntu 24.04 VPS and a dedicated non-root deploy account with [Docker Engine](https://docs.docker.com/engine/install/ubuntu/) and the [Compose v2 plugin](https://docs.docker.com/compose/install/linux/) installed. The account needs Docker access and a writable deployment directory; Docker access is highly privileged, so use a deploy-only SSH key.
2. For the simplest GitHub-hosted CI deployment, keep SSH reachable on port 22 but disable password and root login; use a dedicated deploy account and key, and pin the host key in GitHub secrets. GitHub-hosted runners do not have a stable narrow egress range, so a strict source-IP allowlist is not a practical default. Do not open PostgreSQL port 5432. If public SSH is unacceptable, use Cloudflare Tunnel with Access for SSH and redesign the CI deploy connection as a separate hardening step.
3. Create proxied DNS records for all three hostnames and point each environment at its own VPS. Production defaults are `example.com`, `api.example.com`, and `observe.example.com`; staging defaults are `staging.example.com`, `staging-api.example.com`, and `staging-observe.example.com`. These are all at most one subdomain level, so the free Universal SSL certificate can cover them. Set Cloudflare SSL/TLS mode to **Full (strict)**, enable TLS 1.3, and configure an edge redirect from HTTP to HTTPS. Caddy uses an Origin CA certificate and does not request or rotate public certificates.
4. Create `/home/deploy/starter/deploy/certs` on the VPS. In Cloudflare, create an Origin CA certificate covering that VPS's three hostnames (the apex and exact hostnames, or a wildcard that covers those names), then place the certificate at `origin.pem` and its private key at `origin-key.pem` in this directory. Keep the key out of Git and GitHub Actions; set restrictive permissions (for example, directory `700`, key `600`). Create `/home/deploy/starter` writable by the deploy account.
5. Copy the environment template for that server to `deploy/.env`, fill in its domains, GHCR image prefix, a unique long random alphanumeric database password, and a separate long random OpenObserve password, and set permissions to `600`:

   ```sh
   ssh deploy@STAGING_HOST 'mkdir -p /home/deploy/starter/deploy/certs && chmod 700 /home/deploy/starter/deploy/certs'
   scp deploy/vps/.env.staging.example deploy@STAGING_HOST:/home/deploy/starter/deploy/.env
   ssh deploy@STAGING_HOST 'chmod 600 /home/deploy/starter/deploy/.env'
   ```

   Repeat on the production VPS using `.env.production.example` and its own host/path.
   - Staging template: `deploy/vps/.env.staging.example`
   - Production template: `deploy/vps/.env.production.example`

Keep each server's `.env`, PostgreSQL volume, and OpenObserve volume separate. Use distinct long random alphanumeric passwords for PostgreSQL and OpenObserve in each environment. The deploy workflow updates `IMAGE_TAG` in that server's `.env` only after health checks pass. Use separate DNS records such as `staging-observe.example.com` and `observe.example.com`; OpenObserve's own login protects the UI. Set a data-retention period in OpenObserve for each environment and include its volume in off-server backups if telemetry history must survive VPS loss. This single-node local-disk setup is not highly available.

The API's OpenTelemetry SDK sends traces, metrics, and Pino logs to the private Collector over OTLP/HTTP. The Collector authenticates to OpenObserve; its receiver ports are only exposed on the private Docker network. Browser and Expo client telemetry are not enabled in this starter yet.

Email uses generic SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `EMAIL_FROM`). Choose an SMTP provider for each product and environment, then store its credentials only in that VPS's mode-600 `.env`. Mailpit is only in the local development Compose stack and does not send mail to real recipients.

## GitHub setup

Create GitHub Environments named `staging` and `production`. Add the following secrets to each environment, using that environment's own VPS values:

| Secret | Value |
|---|---|
| `VPS_HOST` | VPS IP address (stored only as a GitHub Environment secret); do not create a DNS-only SSH record pointing to it |
| `VPS_USER` | SSH deploy account |
| `VPS_DEPLOY_PATH` | Absolute writable directory, e.g. `/home/deploy/starter` |
| `VPS_SSH_PRIVATE_KEY` | Private key accepted by that VPS deploy account |
| `VPS_SSH_KNOWN_HOSTS` | Pinned SSH host-key line for the VPS |
| `GHCR_PULL_USERNAME` | GitHub username or machine account with package read access |
| `GHCR_PULL_TOKEN` | Read-only GHCR token for the API/web packages |

GitHub-hosted Actions connects directly to the IP in `VPS_HOST`; the web hostnames remain proxied through Cloudflare. Set `IMAGE_PREFIX` in each server `.env` to `ghcr.io/<lowercase-owner>/<lowercase-repository>`. CI publishes `-api` and `-web` packages beneath that prefix. The deploy workflow logs in to GHCR only for the pull and logs out afterward. The VPS token needs only `read:packages`; see [GitHub Container Registry authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry). Keep the production environment protected with required reviewers and restrict deployment branches to `main`.

If the repository is private, verify that your GitHub plan supports deployment environments and protection rules for private repositories before relying on environment-scoped secrets.

GitHub warns that a self-hosted Actions runner can be persistently compromised by untrusted workflow code. This setup uses GitHub-hosted runners and a narrow SSH deploy account instead. See [GitHub's runner security guidance](https://docs.github.com/en/actions/reference/security/secure-use).

## Backups and recovery

Each PostgreSQL volume is local to its VPS and survives container replacement, but it does not survive VPS or disk loss. Configure encrypted, off-server PostgreSQL backups and test restoring them before storing important data. Keep the last known-good `IMAGE_TAG`; the deploy script uses it for application rollback. Database migrations must be backward-compatible with the currently running app before deployment.

## Important files

- `apps/api/Dockerfile` and `apps/web/Dockerfile`: production images
- `deploy/vps/compose.yaml`: Caddy, API, web, PostgreSQL, OpenObserve, Collector, private networks, and health checks
- `deploy/vps/Caddyfile`: HTTPS host routing with mounted Cloudflare Origin CA certificate paths
- `deploy/vps/otel-collector.yaml`: OTLP receiver and authenticated OpenObserve exporter
- `deploy/vps/deploy.sh`: pull, health check, record tag, and rollback
- `.github/workflows/ci.yml`: quality checks and GHCR publishing
- `.github/workflows/deploy-staging.yml`: automatic staging deploy
- `.github/workflows/deploy-production.yml`: manual production promotion
