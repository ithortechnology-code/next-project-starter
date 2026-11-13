#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

for cmd in node npm docker; do
  command -v "$cmd" >/dev/null || { echo "Required command not found: $cmd" >&2; exit 1; }
done

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required. Install/update Docker Desktop and retry." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Change the local password before use outside a dev machine."
fi

npm ci
docker compose up -d --wait

if [[ "${1:-}" == "--start" ]]; then
  npm run dev:all
  exit $?
fi

cat <<'EOF'

Starter is ready.
  npm run dev         Start the API and web app
  npm run dev:mobile  Start Expo in another terminal
  ./scripts/setup.sh --start  Set up services and start API, web, and Expo

For an isolated agent workspace:
  ./scripts/agent-env.sh create <name>
EOF
