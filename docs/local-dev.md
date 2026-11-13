# Local development services

`./scripts/setup.sh` starts the default local dependencies in Docker Compose:

- PostgreSQL at `localhost:${DB_PORT:-5432}`
- Mailpit SMTP at `localhost:${SMTP_PORT:-1025}` and inbox at `http://localhost:${MAILPIT_UI_PORT:-8025}`
- OpenObserve at `http://localhost:${OPENOBSERVE_PORT:-5080}`
- OpenTelemetry Collector OTLP/HTTP at `localhost:${OTEL_HTTP_PORT:-4318}` and OTLP/gRPC at `localhost:${OTEL_GRPC_PORT:-4317}`

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

## Optional SeaweedFS S3 storage

By default the API uses the filesystem adapter. To try the S3-compatible adapter locally, start the optional SeaweedFS container and set `STORAGE_DRIVER=s3` in `.env`:

```sh
docker compose --profile seaweedfs up -d --wait seaweedfs
```

The local S3 endpoint and development credentials are in `.env.example` and `deploy/vps/seaweedfs-s3-config.local.json`. They are for local development only. Restart the API after changing `.env`. The API talks to SeaweedFS at `S3_ENDPOINT` (`http://127.0.0.1:8333` by default); SeaweedFS data persists in the `seaweedfs_local_data` volume. Switch back to `STORAGE_DRIVER=filesystem` and restart the API to use local files again.

## Agent workspaces

`./scripts/agent-env.sh create <name>` allocates ten deterministic ports per worktree: API, web, PostgreSQL, Expo, SMTP, Mailpit, OpenObserve, Collector gRPC, Collector HTTP, and SeaweedFS. Each Compose project has separate database and OpenObserve volumes; SeaweedFS starts only when its profile is enabled. Agent workspace credentials are local examples and must not be reused in deployed environments.
