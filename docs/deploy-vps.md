# Self-hosted VPS deployment

**Verification status (2026-11-18):** CI and one staging deployment have passed for this repository. Staging web, API health, and OpenObserve HTTPS endpoints returned successfully, and the staging database had no registered users at the time of verification. Production deployment, rollback/restore drills, and a split database/storage VPS topology have not been verified.

The supplied Compose stack runs PostgreSQL 18, Caddy, the API, a separate pg-boss worker, SeaweedFS S3 storage, the web app, OpenTelemetry Collector, and OpenObserve together on one Ubuntu 24.04 VPS per environment. Staging and production are independent full-stack deployments; this example does not split the database or object storage onto a second VPS. The quality workflow exports iOS/Android JavaScript/assets bundles. Signed native release builds and mobile store submission require separate signing, device checks, and release steps. Cloudflare hosts public DNS and proxies the web hostnames. Cloudflare Universal SSL serves visitor-facing certificates; each VPS uses a Cloudflare Origin CA certificate in Caddy for Full (strict) origin TLS. The initial deployment retains direct SSH from GitHub Actions; Cloudflare Tunnel remains an option if you later want to remove public inbound SSH.

Existing PostgreSQL 17 deployments need a maintenance-window backup and restore before normal deployment to PostgreSQL 18. Follow the [PostgreSQL 18 upgrade guide](postgresql-18-upgrade.md); the deploy script blocks rollout until the restore has been verified and marked complete.

## Opt-in gates

Publishing and deployment are disabled by default. Only after configuring hosting, secrets, and protected `staging`/`production` GitHub Environments, set repository variables `ENABLE_IMAGE_PUBLISHING=true`, `DEPLOYMENT_PROVIDER=vps`, and `ENABLE_VPS_DEPLOYMENTS=true`. Unset variables skip the corresponding jobs. Keep these unset while validating source-only CI. Do not enable VPS deployment without image publishing and verified environment protection.

## Release flow

1. A pull request runs `npm ci`, lint, typecheck, and production builds.
2. A successful push to `main` builds API and web images and pushes immutable `sha-<commit>` tags to GHCR. The API image contains the API, worker, and migration runner.
3. The staging workflow deploys that exact tag to the staging VPS over SSH. The deploy starts PostgreSQL, runs the versioned Kysely migrations once, then starts API, worker, and web. Migration failure stops rollout. Compose waits for service health, then public HTTPS checks run; on failure, the previous application image is restored when one exists. Migrations must remain backward-compatible.
4. After staging review, run **Promote image to production VPS** manually and supply the same 40-character commit SHA (the suffix of the `sha-<commit>` image tag). The workflow checks out that commit's deployment script and deploys its already-published image. Configure the GitHub `production` Environment with required reviewers before using this workflow.

The staging and production VPSes do not share databases, volumes, or deploy secrets. CI runs on GitHub-hosted runners; no Actions runner is installed on either server.

Cloudflare proxying hides the origin address from visitors using proxied hostnames, but the address is not secret if another DNS record, service, or historical record reveals it. Restrict inbound TCP 443 at the VPS firewall to [Cloudflare's published IP ranges](https://www.cloudflare.com/ips/); do not publish port 80. The Caddy container publishes only 443 and serves the mounted Origin CA certificate. Browsers should reach the origin only through Cloudflare; a direct-origin connection will not trust Origin CA. The simple GitHub-hosted CI deployment still needs public SSH with key-only authentication. Cloudflare Tunnel plus Access can remove that inbound SSH port, but adds identity and CI connection setup. Track Origin CA expiry yourself because Cloudflare does not send expiry notices.

## VPS prerequisites

For each environment:

1. Create an Ubuntu 24.04 VPS and a dedicated non-root deploy account with [Docker Engine](https://docs.docker.com/engine/install/ubuntu/) and the [Compose v2 plugin](https://docs.docker.com/compose/install/linux/) installed. The account needs Docker access and a writable deployment directory; Docker access is highly privileged, so use a deploy-only SSH key.
2. For the simplest GitHub-hosted CI deployment, keep SSH reachable on your configured port (22 by default; set `VPS_SSH_PORT` for a custom port such as 2322) but disable password and root login; use a dedicated deploy account and key, and pin the host key in GitHub secrets. The known-hosts entry must use the same hostname or IP and port that the workflow uses. GitHub-hosted runners do not have a stable narrow egress range, so a strict source-IP allowlist is not a practical default. Do not open PostgreSQL port 5432. If public SSH is unacceptable, use Cloudflare Tunnel with Access for SSH and redesign the CI deploy connection as a separate hardening step.
3. Create proxied DNS records for all three hostnames and point each environment at its own VPS. Production defaults are `example.com`, `api.example.com`, and `observe.example.com`; staging defaults are `staging.example.com`, `staging-api.example.com`, and `staging-observe.example.com`. Replace these placeholders with your own domain names. These are all at most one subdomain level, so the free Universal SSL certificate can cover them. Set Cloudflare SSL/TLS mode to **Full (strict)**, enable TLS 1.3, and enable **Always Use HTTPS** (or an equivalent edge redirect from HTTP to HTTPS). Caddy uses an Origin CA certificate and does not request or rotate public certificates. Track Origin CA expiry yourself because Cloudflare does not send expiry notices.
4. Create `/home/deploy/starter/deploy/certs` on the VPS. In Cloudflare, create an Origin CA certificate covering that VPS's three hostnames (the apex and exact hostnames, or a wildcard that covers those names), then place the certificate at `origin.pem` and its private key at `origin-key.pem` in this directory. Keep the key out of Git and GitHub Actions; set restrictive permissions (for example, directory `700`, key `600`). Create `/home/deploy/starter` writable by the deploy account.
5. Copy the environment template for that server to `deploy/.env`, fill in its domains, GHCR image prefix, and unique long random database and OpenObserve passwords, and set permissions to `600`. OpenObserve passwords must contain uppercase and lowercase letters, a digit, and a symbol (8–128 characters). Password-generator settings such as “no symbols” may create a value that fails this check; verify each character class and keep staging and production values different:

   ```sh
   ssh deploy@STAGING_HOST 'mkdir -p /home/deploy/starter/deploy/certs && chmod 700 /home/deploy/starter/deploy/certs'
   scp deploy/vps/.env.staging.example deploy@STAGING_HOST:/home/deploy/starter/deploy/.env
   ssh deploy@STAGING_HOST 'chmod 600 /home/deploy/starter/deploy/.env'
   ```

   Repeat on the production VPS using `.env.production.example` and its own host/path.
   - Staging template: `deploy/vps/.env.staging.example`
   - Production template: `deploy/vps/.env.production.example`

6. Configure SeaweedFS on each VPS before the first release because Compose mounts this file. Copy the example template to each server, then create its private config file:

   ```sh
   scp deploy/vps/seaweedfs-s3-config.example.json deploy@STAGING_HOST:/home/deploy/starter/deploy/
   ssh deploy@STAGING_HOST 'cd /home/deploy/starter/deploy && cp seaweedfs-s3-config.example.json seaweedfs-s3-config.json && chmod 600 seaweedfs-s3-config.json'
   ```

   Repeat with the production host/path. Replace every placeholder in each private file with separate random admin and app credentials; keep the config file mode `600`. Put only the app identity credentials in that VPS's `.env` (`S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`); keep those secrets mode `600` too. The app identity is limited to read, write, and list access for `starter-files`; use the admin identity only to create the bucket. After first deployment, create the bucket once from the VPS with an AWS CLI container on the Compose storage network. Read the admin credentials interactively so they are not placed in the command history:

   ```sh
   read -r -p "S3 admin access key: " AWS_ACCESS_KEY_ID
   read -r -s -p "S3 admin secret: " AWS_SECRET_ACCESS_KEY
   export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
   docker run --rm --network starter-staging_storage -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY amazon/aws-cli s3api create-bucket --bucket starter-files --endpoint-url http://seaweedfs:8333
   unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
   ```

   Use `starter-production_storage` on production. SeaweedFS has no published host port and its data lives in a named volume; include it in encrypted off-server backups. Coordinate database and object backups if database rows reference stored objects.

Keep each server's `.env`, PostgreSQL volume, and OpenObserve volume separate. Use distinct long random alphanumeric passwords for PostgreSQL and OpenObserve in each environment. The deploy workflow updates `IMAGE_TAG` in that server's `.env` only after health checks pass. Use separate DNS records such as `staging-observe.example.com` and `observe.example.com`; OpenObserve's own login protects the UI. Set a data-retention period in OpenObserve for each environment and include its volume in off-server backups if telemetry history must survive VPS loss. This single-node local-disk setup is not highly available.

The API and worker send traces, metrics, and logs to the private Collector over OTLP/HTTP. The Collector authenticates to OpenObserve; its receiver ports are only exposed on the private Docker network. Browser and Expo client telemetry are not enabled in this starter yet.

Local API development uses `STORAGE_DRIVER=filesystem` and `FILE_STORAGE_DIRECTORY=../../.data/files` (the API command runs from `apps/api`). Start the local dependencies with `docker compose up -d --wait`, apply migrations with `npm run db:migrate --workspace=@starter/api`, then start the API and worker using `npm run dev:api` and `npm run dev:worker`. The generated OpenAPI document is at `/openapi.json`; in development, `POST /jobs/example` queues an example job using an `idempotencyKey`. The example enqueue and signed profile-image endpoints are disabled in production by default. Protect both with the product's authentication, ownership checks, and rate limits before enabling them.

Email uses generic SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `EMAIL_FROM`). Choose an SMTP provider for each product and environment, then store its credentials only in that VPS's mode-600 `.env`. Mailpit is only in the local development Compose stack and does not send mail to real recipients.

## GitHub setup

Create GitHub Environments named `staging` and `production`. Add the following secrets to each environment, using that environment's own VPS values:

| Secret                | Value                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `VPS_HOST`            | VPS IP address (stored only as a GitHub Environment secret); do not create a DNS-only SSH record pointing to it |
| `VPS_USER`            | SSH deploy account                                                                                              |
| `VPS_DEPLOY_PATH`     | Absolute writable directory, e.g. `/home/deploy/starter`                                                        |
| `VPS_SSH_PRIVATE_KEY` | Private key accepted by that VPS deploy account                                                                 |
| `VPS_SSH_KNOWN_HOSTS` | Pinned SSH host-key line for the VPS                                                                            |
| `VPS_SSH_PORT`        | SSH TCP port (optional; defaults to `22`)                                                                        |
| `GHCR_PULL_USERNAME`  | GitHub username or machine account with package read access                                                     |
| `GHCR_PULL_TOKEN`     | Read-only GHCR token for the API/web packages                                                                   |

GitHub-hosted Actions connects directly to the IP in `VPS_HOST`; the web hostnames remain proxied through Cloudflare. Set `IMAGE_PREFIX` in each server `.env` to `ghcr.io/<lowercase-owner>/<lowercase-repository>`. CI publishes `-api` and `-web` packages beneath that prefix. The deploy workflow logs in to GHCR only for the pull and logs out afterward. The VPS token needs only `read:packages`; see [GitHub Container Registry authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry). Keep the production environment protected with required reviewers and restrict deployment branches to `main`.

If the repository is private, verify that your GitHub plan supports deployment environments and protection rules for private repositories before relying on environment-scoped secrets.

GitHub warns that a self-hosted Actions runner can be persistently compromised by untrusted workflow code. This setup uses GitHub-hosted runners and a narrow SSH deploy account instead. See [GitHub's runner security guidance](https://docs.github.com/en/actions/reference/security/secure-use).

## Backups and recovery

Each PostgreSQL volume is local to its VPS and survives container replacement, but it does not survive VPS or disk loss. Configure encrypted, off-server PostgreSQL backups and test restoring them before storing important data. Keep the last known-good `IMAGE_TAG`; the deploy script uses it for application rollback. Database migrations must be backward-compatible with the currently running app before deployment.

## Important files

- `apps/api/Dockerfile` and `apps/web/Dockerfile`: production images
- `deploy/vps/compose.yaml`: Caddy, API, worker, migration runner, web, PostgreSQL, SeaweedFS, OpenObserve, Collector, private networks, and health checks
- `deploy/vps/Caddyfile`: HTTPS host routing with mounted Cloudflare Origin CA certificate paths
- `deploy/vps/otel-collector.yaml`: OTLP receiver and authenticated OpenObserve exporter
- `deploy/vps/deploy.sh`: pull, health check, record tag, and rollback
- `.github/workflows/ci.yml`: quality checks and GHCR publishing
- `.github/workflows/deploy-staging.yml`: automatic staging deploy
- `.github/workflows/deploy-production.yml`: manual production promotion
