#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ACTION="${1:-}"
NAME="${2:-}"

usage() {
  echo "Usage: $0 create <name> | list | remove <name>" >&2
}

safe_name() {
  [[ "$1" =~ ^[a-z0-9][a-z0-9_-]{0,30}$ ]]
}

ports_for() {
  python3 - "$1" <<'PY'
import hashlib, sys
name = sys.argv[1].encode()
base = 20000 + int.from_bytes(hashlib.sha256(name).digest()[:4], "big") % 2500 * 10
print(*range(base, base + 10))
PY
}

ports_available() {
  python3 - "$@" <<'PY'
import socket, sys
ports = [int(p) for p in sys.argv[1:]]
sockets = []
try:
    for port in ports:
        sock = socket.socket()
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(("127.0.0.1", port))
        sockets.append(sock)
except OSError:
    sys.exit(1)
finally:
    for sock in sockets:
        sock.close()
PY
}

case "$ACTION" in
  create)
    [[ -n "$NAME" ]] && safe_name "$NAME" || { usage; exit 2; }
    command -v python3 >/dev/null || { echo "python3 is required for stable port allocation" >&2; exit 1; }
    git -C "$ROOT_DIR" rev-parse --show-toplevel >/dev/null 2>&1 || {
      echo "Initialize or clone this starter as a git repository before creating worktrees." >&2
      exit 1
    }
    if [[ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]]; then
      echo "Commit the starter baseline and working changes before creating agent worktrees." >&2
      exit 1
    fi
    WORKTREE="$ROOT_DIR/.agent-env/worktrees/$NAME"
    if [[ -e "$WORKTREE" ]]; then echo "Workspace already exists: $WORKTREE" >&2; exit 1; fi
    mkdir -p "$(dirname "$WORKTREE")"
    git -C "$ROOT_DIR" worktree add -b "agent/$NAME" "$WORKTREE" HEAD
    read -r API_PORT WEB_PORT DB_PORT EXPO_PORT SMTP_PORT MAILPIT_UI_PORT OPENOBSERVE_PORT OTEL_GRPC_PORT OTEL_HTTP_PORT S3_PORT < <(ports_for "$NAME")
    if ! ports_available "$API_PORT" "$WEB_PORT" "$DB_PORT" "$EXPO_PORT" "$SMTP_PORT" "$MAILPIT_UI_PORT" "$OPENOBSERVE_PORT" "$OTEL_GRPC_PORT" "$OTEL_HTTP_PORT" "$S3_PORT"; then
      git -C "$ROOT_DIR" worktree remove --force "$WORKTREE"
      git -C "$ROOT_DIR" branch -D "agent/$NAME" >/dev/null 2>&1 || true
      echo "The deterministic port block $API_PORT-$S3_PORT is already in use. Choose another name." >&2
      exit 1
    fi
    COMPOSE_PROJECT="starter-$NAME"
    COMPOSE_PROJECT="${COMPOSE_PROJECT//_/-}"
    COMPOSE_PROJECT="${COMPOSE_PROJECT//[^a-z0-9-]/-}"
    DB_NAME="starter_${NAME//-/_}"
    DB_PASSWORD="local-${NAME//[^a-zA-Z0-9]/x}-change-me"
    cat > "$WORKTREE/.env" <<EOF
COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT
COMPOSE_PROFILES=email,observability,seaweedfs
POSTGRES_DB=$DB_NAME
POSTGRES_USER=starter
POSTGRES_PASSWORD=$DB_PASSWORD
DB_PORT=$DB_PORT
API_PORT=$API_PORT
WEB_PORT=$WEB_PORT
EXPO_PORT=$EXPO_PORT
MAILPIT_UI_PORT=$MAILPIT_UI_PORT
OPENOBSERVE_PORT=$OPENOBSERVE_PORT
OTEL_GRPC_PORT=$OTEL_GRPC_PORT
OTEL_HTTP_PORT=$OTEL_HTTP_PORT
S3_PORT=$S3_PORT
SMTP_HOST=127.0.0.1
SMTP_PORT=$SMTP_PORT
SMTP_SECURE=false
EMAIL_FROM=no-reply@example.local
DATABASE_URL=postgresql://starter:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME
WEB_ORIGIN=http://localhost:$WEB_PORT
API_URL=http://localhost:$API_PORT
EXPO_PUBLIC_API_URL=http://localhost:$API_PORT
API_PUBLIC_URL=http://localhost:$API_PORT
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:$OTEL_HTTP_PORT
ZO_ROOT_USER_EMAIL=local-observe@example.local
ZO_ROOT_USER_PASSWORD=Local-Observe-2026!
FILE_URL_SIGNING_SECRET=local-development-only-change-this-to-a-random-secret-value
S3_ENDPOINT=http://127.0.0.1:$S3_PORT
S3_REGION=us-east-1
S3_BUCKET=starter-files
S3_ACCESS_KEY_ID=starter-local-access
S3_SECRET_ACCESS_KEY=local-only-seaweedfs-secret-change-me
EOF
    echo "Created $NAME at $WORKTREE"
    echo "Port mapping: API http://localhost:$API_PORT · Web http://localhost:$WEB_PORT · PostgreSQL localhost:$DB_PORT · Expo/Metro $EXPO_PORT · SMTP localhost:$SMTP_PORT · Mailpit http://localhost:$MAILPIT_UI_PORT · OpenObserve http://localhost:$OPENOBSERVE_PORT · OTLP HTTP $OTEL_HTTP_PORT · SeaweedFS S3 $S3_PORT"
    echo "The port block is derived from the workspace name and checked before creation; change the ports in .env if you need a custom mapping."
    echo "Next: cd '$WORKTREE' && npm ci && docker compose up -d --wait && npm run dev"
    ;;
  list)
    git -C "$ROOT_DIR" worktree list 2>/dev/null || { echo "Not a git worktree repository yet."; exit 1; }
    ;;
  remove)
    [[ -n "$NAME" ]] && safe_name "$NAME" || { usage; exit 2; }
    WORKTREE="$ROOT_DIR/.agent-env/worktrees/$NAME"
    [[ -d "$WORKTREE" ]] || { echo "Workspace does not exist: $NAME" >&2; exit 1; }
    COMPOSE_PROJECT="starter-$NAME"
    COMPOSE_PROJECT="${COMPOSE_PROJECT//_/-}"
    COMPOSE_PROJECT="${COMPOSE_PROJECT//[^a-z0-9-]/-}"
    docker compose -p "$COMPOSE_PROJECT" --env-file "$WORKTREE/.env" -f "$WORKTREE/compose.yaml" --profile email --profile observability --profile seaweedfs down
    git -C "$ROOT_DIR" worktree remove "$WORKTREE"
    echo "Stopped services and removed worktree $NAME. The agent branch is preserved."
    ;;
  *) usage; exit 2 ;;
esac
