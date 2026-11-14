# Local development services

`./scripts/setup.sh` starts PostgreSQL 18 and the optional Docker services listed in `COMPOSE_PROFILES` in `.env`. The default `.env.example` enables all three profiles:

- `email`: Mailpit SMTP capture and inbox
- `observability`: OpenObserve and the OpenTelemetry Collector
- `seaweedfs`: local S3-compatible storage

Edit `COMPOSE_PROFILES` in `.env` to remove services a project does not use, then rerun `./scripts/setup.sh`; the script stops old optional containers before starting the selected profiles. For example, `COMPOSE_PROFILES=observability` keeps telemetry but skips Mailpit and SeaweedFS. PostgreSQL remains part of the default core stack. If observability is disabled, clear `OTEL_EXPORTER_OTLP_ENDPOINT` as well so the API and worker do not retry a missing Collector. If SeaweedFS is disabled, use `STORAGE_DRIVER=filesystem` unless `S3_ENDPOINT` points to another reachable S3 service.

If this checkout already has a PostgreSQL 17 data volume, follow the [PostgreSQL 18 upgrade guide](postgresql-18-upgrade.md) before rerunning setup. The setup script refuses to start an existing PostgreSQL 17 volume with the PostgreSQL 18 image.

After migrations, setup prints a URL table and a credentials table. The printed username/password/key values come from `.env.example` and are local examples; if `.env` overrides them, use the values from `.env` instead.

The `filesystem` adapter is always available to the API and stores data under `.data/files` by default. SeaweedFS runs alongside it by default, so both adapters are available locally at once. One API process uses the adapter selected by `STORAGE_DRIVER`; change that setting and restart the API to switch between them. This keeps stored objects in one selected backend instead of silently writing two copies.

To override profiles for a one-off Compose command without editing `.env`, set `COMPOSE_PROFILES` for that command, for example:

```sh
COMPOSE_PROFILES=seaweedfs docker compose up -d --wait
```

- PostgreSQL at `localhost:${DB_PORT:-5432}`
- Mailpit SMTP at `localhost:${SMTP_PORT:-1025}` and inbox at `http://localhost:${MAILPIT_UI_PORT:-8025}` (`email` profile)
- OpenObserve at `http://localhost:${OPENOBSERVE_PORT:-5080}` (`observability` profile)
- OpenTelemetry Collector OTLP/HTTP at `localhost:${OTEL_HTTP_PORT:-4318}` and OTLP/gRPC at `localhost:${OTEL_GRPC_PORT:-4317}` (`observability` profile)
- SeaweedFS S3 at `http://localhost:${S3_PORT:-8333}` (`seaweedfs` profile)

These are protocol endpoints, not browser pages. A `GET /` to the Collector's OTLP/HTTP port can return `404 page not found`; OTLP/HTTP exporters send `POST` requests to `/v1/traces`, `/v1/metrics`, and `/v1/logs`. This starter's Node SDK uses OTLP/HTTP exporters, so keep `OTEL_EXPORTER_OTLP_ENDPOINT` set to the Collector base URL (for example `http://127.0.0.1:4318`) and do not set `OTEL_EXPORTER_OTLP_PROTOCOL=grpc`. The Collector also listens for OTLP/gRPC on port 4317, but switching the app to gRPC requires gRPC exporters in the Node SDK; the port alone does not make the current HTTP exporters use gRPC. From the host, check that the Collector is running with `docker compose ps otel-collector` and inspect its logs with `docker compose logs --tail=100 otel-collector`. If an exporter reports 404, confirm the configured endpoint is the Collector port, not the OpenObserve UI port, and that Compose is using the checked-in Collector config.

OpenObserve credentials are `ZO_ROOT_USER_EMAIL` and `ZO_ROOT_USER_PASSWORD` in `.env`. API and worker traces, metrics, and Pino logs are sent through the local Collector. Collector and OpenObserve ports bind to loopback; they are not exposed to the LAN. OpenObserve keeps its data in the `openobserve_data` Docker volume. The API process remains on the host, where local file storage is easy to inspect under `.data/files`.

The API records RED metrics as `starter.http.server.request.count` and `starter.http.server.request.duration`, grouped by method, route template, and status class. Profile-image storage calls also record `starter.file_storage.operation.count` and `starter.file_storage.operation.duration`, grouped by storage driver, operation, and outcome. It emits structured `http.request.failed` and `http.request.slow` events with the Fastify request ID; profile-image uploads emit `profile_image.uploaded` and storage failures emit `profile_image.storage_failed`. The worker records `starter.worker.job.count` and `starter.worker.job.duration`, creates a span for each pg-boss job, and logs `job.processed` or `job.failed` with `entryPoint` and the job ID as its correlation ID. Metric dimensions use fixed queue, route, driver, and operation names; request and job IDs appear only in logs. Tokens, request bodies, and user identifiers are not included.

To inspect the signals, open OpenObserve and use the Logs, Traces, and Metrics views. API requests and queued example jobs produce traces; API and worker events produce logs; request and job handling populate the RED and outcome metrics. Browser and Expo telemetry are not enabled in this starter.

## Profile image URL example

The API provides a development example for profile images. It accepts JPEG, PNG, and WebP images up to 5 MiB, checks the file signature, and stores under a generated UUID. It uses the same storage interface for filesystem and SeaweedFS. Upload and download links are HMAC-signed, limited to one file and operation, and expire after ten minutes. Downloads are served by the API, so filesystem objects do not need to be public and the app can use the same API URL for either backend.

With the API running, request an upload URL and use it:

```sh
curl -s http://localhost:4000/files/upload-url \
  -H 'content-type: application/json' \
  -d '{"contentType":"image/png"}'
```

The response contains `fileId`, `uploadUrl`, `downloadUrl`, `expiresAt`, and `maxBytes`. Send image bytes to `uploadUrl` with the matching `Content-Type` using `PUT`; then open `downloadUrl` in a browser or fetch it with `curl`. Call `POST /files/{fileId}/download-url` to issue a fresh download URL later. The current starter has no user authentication or file ownership model, so these example routes are disabled in production by default. Before enabling them in a product, require authentication and ownership checks on URL issuance, and add suitable rate limits and lifecycle cleanup.

## SeaweedFS S3 storage

By default the API uses the filesystem adapter while SeaweedFS is available as a local service. To use the S3-compatible adapter, set `STORAGE_DRIVER=s3` in `.env` and ensure Compose is running:

```sh
docker compose up -d --wait
```

The local S3 endpoint and development credentials are in `.env.example` and `deploy/vps/seaweedfs-s3-config.local.json`. They are for local development only. Restart the API after changing `.env`. The API talks to SeaweedFS at `S3_ENDPOINT` (`http://127.0.0.1:8333` by default); SeaweedFS data persists in the `seaweedfs_local_data` volume. The S3 root URL is not a web console or bucket browser. Opening it in a browser issues an unsigned `GET /` and may return an XML `AccessDenied`; that alone does not show whether authenticated bucket/object operations work. Check the bucket using the configured S3 credentials, for example:

```sh
AWS_ACCESS_KEY_ID="$(sed -n 's/^S3_ACCESS_KEY_ID=//p' .env)" \
AWS_SECRET_ACCESS_KEY="$(sed -n 's/^S3_SECRET_ACCESS_KEY=//p' .env)" \
aws --endpoint-url "$(sed -n 's/^S3_ENDPOINT=//p' .env)" \
  s3api head-bucket --bucket "$(sed -n 's/^S3_BUCKET=//p' .env)"
```

If authenticated requests return `AccessDenied`, verify that the running SeaweedFS container loaded `deploy/vps/seaweedfs-s3-config.local.json` and that its credentials exactly match `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` in `.env`. Restart the SeaweedFS service after changing its mounted config (`docker compose up -d --force-recreate seaweedfs`). The local identity has `Admin` actions; for a restricted identity, ensure its policy also allows object deletion. Switch back to `STORAGE_DRIVER=filesystem` and restart the API to use local files again.

## Agent workspaces

`./scripts/agent-env.sh create <name>` allocates ten deterministic ports per worktree: API, web, PostgreSQL, Expo, SMTP, Mailpit, OpenObserve, Collector gRPC, Collector HTTP, and SeaweedFS. Generated workspaces enable all three optional profiles by default and have separate database, OpenObserve, and SeaweedFS volumes. Remove unused entries from that worktree's `COMPOSE_PROFILES` to reduce its services. Agent workspace credentials are local examples and must not be reused in deployed environments.
