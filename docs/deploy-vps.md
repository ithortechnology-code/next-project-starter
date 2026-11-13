# Self-hosted VPS deployment

The starter deploys the API and web app to two independent Ubuntu 24.04 VPSes. PostgreSQL, Caddy, the API, and the web app run in Docker Compose on each host. The mobile app is built for iOS/Android by CI; mobile store submission is a separate step.

## Release flow

1. A pull request runs `npm ci`, lint, typecheck, and production builds.
2. A successful push to `main` builds API and web images and pushes immutable `sha-<commit>` tags to GHCR.
3. The staging workflow deploys that exact tag to the staging VPS over SSH. Compose waits for service health, then the deploy script checks the public HTTPS endpoints. On failure, it restores the previously recorded image tag when one exists.
4. After staging review, run **Promote image to production VPS** manually and supply the same 40-character commit SHA (the suffix of the `sha-<commit>` image tag). The workflow checks out that commit's deployment script and deploys its already-published image. Configure the GitHub `production` Environment with required reviewers before using this workflow.

The two VPSes do not share databases, volumes, or deploy secrets. CI runs on GitHub-hosted runners; no Actions runner is installed on either server.

## VPS prerequisites

For each environment:

1. Create an Ubuntu 24.04 VPS and a dedicated non-root deploy account with [Docker Engine](https://docs.docker.com/engine/install/ubuntu/) and the [Compose v2 plugin](https://docs.docker.com/compose/install/linux/) installed. The account needs Docker access and a writable deployment directory; Docker access is highly privileged, so use a deploy-only SSH key.
2. Allow inbound SSH with password login disabled, plus TCP ports 80 and 443 from the internet. Do not open PostgreSQL port 5432. Pin the SSH host key in GitHub secrets and verify its fingerprint through a trusted channel.
3. Point `WEB_DOMAIN` and `API_DOMAIN` DNS A/AAAA records at that VPS. Caddy obtains and renews HTTPS certificates automatically; DNS must resolve and ports 80/443 must reach Caddy.
4. Create a directory writable by the deploy account, for example `/home/deploy/starter`.
5. Create the deployment directory, copy the environment template for that server to `deploy/.env`, fill in its domains, GHCR image prefix, and a unique long random alphanumeric database password, and set permissions to `600`:

   ```sh
   ssh deploy@STAGING_HOST 'mkdir -p /home/deploy/starter/deploy'
   scp deploy/vps/.env.staging.example deploy@STAGING_HOST:/home/deploy/starter/deploy/.env
   ssh deploy@STAGING_HOST 'chmod 600 /home/deploy/starter/deploy/.env'
   ```

   Repeat on the production VPS using `.env.production.example` and its own host/path.
   - Staging template: `deploy/vps/.env.staging.example`
   - Production template: `deploy/vps/.env.production.example`

Keep each server's `.env` and PostgreSQL volume separate. The deploy workflow updates `IMAGE_TAG` in that server's `.env` only after health checks pass.

## GitHub setup

Create GitHub Environments named `staging` and `production`. Add the following secrets to each environment, using that environment's own VPS values:

| Secret | Value |
|---|---|
| `VPS_HOST` | VPS hostname or IP |
| `VPS_USER` | SSH deploy account |
| `VPS_DEPLOY_PATH` | Absolute writable directory, e.g. `/home/deploy/starter` |
| `VPS_SSH_PRIVATE_KEY` | Private key accepted by that VPS deploy account |
| `VPS_SSH_KNOWN_HOSTS` | Pinned SSH host-key line for the VPS |
| `GHCR_PULL_USERNAME` | GitHub username or machine account with package read access |
| `GHCR_PULL_TOKEN` | Read-only GHCR token for the API/web packages |

Set `IMAGE_PREFIX` in each server `.env` to `ghcr.io/<lowercase-owner>/<lowercase-repository>`. CI publishes `-api` and `-web` packages beneath that prefix. The deploy workflow logs in to GHCR only for the pull and logs out afterward. The VPS token needs only `read:packages`; see [GitHub Container Registry authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry). Keep the production environment protected with required reviewers and restrict deployment branches to `main`.

If the repository is private, verify that your GitHub plan supports deployment environments and protection rules for private repositories before relying on environment-scoped secrets.

GitHub warns that a self-hosted Actions runner can be persistently compromised by untrusted workflow code. This setup uses GitHub-hosted runners and a narrow SSH deploy account instead. See [GitHub's runner security guidance](https://docs.github.com/en/actions/reference/security/secure-use).

## Backups and recovery

Each PostgreSQL volume is local to its VPS and survives container replacement, but it does not survive VPS or disk loss. Configure encrypted, off-server PostgreSQL backups and test restoring them before storing important data. Keep the last known-good `IMAGE_TAG`; the deploy script uses it for application rollback. Database migrations must be backward-compatible with the currently running app before deployment.

## Important files

- `apps/api/Dockerfile` and `apps/web/Dockerfile`: production images
- `deploy/vps/compose.yaml`: Caddy, API, web, PostgreSQL, private networks, and health checks
- `deploy/vps/Caddyfile`: HTTPS host routing
- `deploy/vps/deploy.sh`: pull, health check, record tag, and rollback
- `.github/workflows/ci.yml`: quality checks and GHCR publishing
- `.github/workflows/deploy-staging.yml`: automatic staging deploy
- `.github/workflows/deploy-production.yml`: manual production promotion
