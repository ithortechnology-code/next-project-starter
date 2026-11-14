#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${1:?Usage: postgres-18-preflight.sh <service> [docker-compose-args...]}"
shift

PROJECT_NAME="$(docker compose "$@" config --format yaml | sed -n '1s/^name: //p')"
if [[ -z "$PROJECT_NAME" ]]; then
  echo "Could not determine the Docker Compose project name for the PostgreSQL volume check." >&2
  exit 1
fi

OLD_VOLUME="${PROJECT_NAME}_postgres_data"

if docker volume inspect "$OLD_VOLUME" >/dev/null 2>&1; then
  MIGRATION_MARKER="$(docker compose "$@" run --rm --no-deps --entrypoint sh "$SERVICE_NAME" -c '
    if [ -f "$PGDATA/.starter-postgres-18-migrated" ]; then
      printf migrated
    fi
  ')"

  if [[ "$MIGRATION_MARKER" != *migrated* ]]; then
    echo "Found the existing PostgreSQL 17 volume $OLD_VOLUME. Follow docs/postgresql-18-upgrade.md, restore and verify the database into PostgreSQL 18, then mark the migration before continuing." >&2
    exit 1
  fi
fi
