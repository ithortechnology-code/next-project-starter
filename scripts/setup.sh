#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

for cmd in node npm docker; do
  command -v "$cmd" >/dev/null || { echo "Required command not found: $cmd" >&2; exit 1; }
done

NVM_SCRIPT="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
if [[ ! -s "$NVM_SCRIPT" && -s "$HOME/.nvm/nvm.sh" ]]; then
  NVM_SCRIPT="$HOME/.nvm/nvm.sh"
  NVM_DIR="$HOME/.nvm"
fi
if [[ -s "$NVM_SCRIPT" ]]; then
  # nvm is a shell function; load it in this non-interactive Bash process.
  # shellcheck disable=SC1090
  . "$NVM_SCRIPT"
  if ! nvm use --silent >/dev/null; then
    echo "The Node.js version in .nvmrc is not installed. Run 'nvm install' from the repository and retry." >&2
    exit 1
  fi
  NVM_VERSION="$(tr -d '[:space:]' < .nvmrc)"
  if NVM_NODE="$(nvm which "$NVM_VERSION" 2>/dev/null)"; then
    PATH="$(dirname "$NVM_NODE"):$PATH"
    export PATH
  fi
fi

NODE_VERSION="$(node -p 'process.versions.node')"
NODE_MAJOR="${NODE_VERSION%%.*}"
if [[ "$NODE_MAJOR" != "24" && "$NODE_MAJOR" != "26" ]]; then
  echo "Detected Node.js $NODE_VERSION at $(command -v node). Node.js 24 (default in .nvmrc) or 26 LTS is required. Run 'nvm install && nvm use' from the repository, or select a supported version with your Node version manager, then retry." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required. Install/update Docker Desktop and retry." >&2
  exit 1
fi

# Resolve the recipe before dependency installation or environment provisioning.
if [[ -f .starter/auth-selection.json ]]; then
  selected_auth="$(node -p 'JSON.parse(require("node:fs").readFileSync(".starter/auth-selection.json", "utf8")).choice')"
else
  selected_auth="${AUTH_RECIPE:-}"
  if [[ -z "$selected_auth" && -t 0 ]]; then
    read -r -p "Include Better Auth lifecycle? [y/N] " auth_answer
    case "$auth_answer" in y|Y|yes|YES) selected_auth="better-auth" ;; *) selected_auth="none" ;; esac
  fi
  selected_auth="${selected_auth:-none}"
fi
node scripts/scaffold-auth.mjs "${AUTH_RECIPE:-$selected_auth}"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Change the local password before use outside a dev machine."
else
  # Add new starter defaults on upgrades without replacing developer-specific values.
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" == \\#* ]] && continue
    if ! grep -q "^${key}=" .env; then
      printf '%s=%s\n' "$key" "$value" >> .env
    fi
  done < .env.example
fi

read_setting() {
  local file="$1"
  local name="$2"
  local default_value="${3:-}"
  local value
  if ! value="$(awk -F= -v name="$name" '$1 == name { sub(/^[^=]*=/, ""); print; found=1; exit } END { if (!found) exit 1 }' "$file")"; then
    value="$default_value"
  fi
  printf '%s' "$value"
}

if [[ "$selected_auth" == "better-auth" && -z "$(read_setting .env BETTER_AUTH_SECRET '')" ]]; then
  auth_secret="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64"))')"
  auth_env_tmp="$(mktemp "$ROOT_DIR/.env.XXXXXX")"
  trap '[[ ! -f "$auth_env_tmp" ]] || rm -f "$auth_env_tmp"' EXIT
  awk -F= -v secret="$auth_secret" '
    BEGIN { updated = 0 }
    $1 == "BETTER_AUTH_SECRET" { print "BETTER_AUTH_SECRET=" secret; updated = 1; next }
    { print }
    END { if (!updated) print "BETTER_AUTH_SECRET=" secret }
  ' .env > "$auth_env_tmp"
  mv "$auth_env_tmp" .env
  trap - EXIT
  echo "Generated a local Better Auth secret in .env."
fi

profile_enabled() {
  printf '%s\n' "$ACTIVE_PROFILES" | tr ',' '\n' | grep -Fxq "$1"
}

profile_state() {
  if profile_enabled "$1"; then printf 'enabled'; else printf 'disabled'; fi
}

print_url_row() {
  printf '  %-20s | %-20s | %s\n' "$1" "$2" "$3"
}

print_credential_row() {
  printf '  %-25s | %-38s | %s\n' "$1" "$2" "$3"
}

bash "$ROOT_DIR/deploy/vps/postgres-18-preflight.sh" postgres

print_local_services() {
  local api_state="not started by this command"
  if [[ "${1:-}" == "--start" ]]; then api_state="starting via dev:all"; fi

  local api_port web_port expo_port db_port smtp_port mailpit_ui_port observe_port otel_http_port otel_grpc_port s3_port
  local api_url mobile_api_url db_name storage_driver file_directory profiles s3_endpoint
  api_port="$(read_setting .env API_PORT 4000)"
  web_port="$(read_setting .env WEB_PORT 3000)"
  expo_port="$(read_setting .env EXPO_PORT 8081)"
  db_port="$(read_setting .env DB_PORT 5432)"
  smtp_port="$(read_setting .env SMTP_PORT 1025)"
  mailpit_ui_port="$(read_setting .env MAILPIT_UI_PORT 8025)"
  observe_port="$(read_setting .env OPENOBSERVE_PORT 5080)"
  otel_http_port="$(read_setting .env OTEL_HTTP_PORT 4318)"
  otel_grpc_port="$(read_setting .env OTEL_GRPC_PORT 4317)"
  s3_port="$(read_setting .env S3_PORT 8333)"
  api_url="$(read_setting .env API_PUBLIC_URL "http://localhost:$api_port")"
  api_url="${api_url%/}"
  mobile_api_url="$(read_setting .env EXPO_PUBLIC_API_URL "$api_url")"
  db_name="$(read_setting .env POSTGRES_DB starter_dev)"
  storage_driver="$(read_setting .env STORAGE_DRIVER filesystem)"
  file_directory="$(read_setting .env FILE_STORAGE_DIRECTORY ../../.data/files)"
  s3_endpoint="$(read_setting .env S3_ENDPOINT "http://127.0.0.1:$s3_port")"
  profiles="$(read_setting .env COMPOSE_PROFILES '')"
  ACTIVE_PROFILES="$profiles"

  printf '\nLocal service URLs (profiles: %s)\n' "${profiles:-none}"
  printf '  %-20s | %-20s | %s\n' 'Service' 'State' 'URL / endpoint'
  printf '  %s\n' '---------------------+----------------------+------------------------------------------------------------'
  print_url_row 'Web app' "$api_state" "http://localhost:$web_port"
  print_url_row 'API health' "$api_state" "$api_url/health"
  print_url_row 'API OpenAPI' "$api_state" "$api_url/openapi.json"
  print_url_row 'Expo / Metro' "$api_state" "http://localhost:$expo_port (scan terminal QR for device)"
  print_url_row 'Worker' "$api_state" 'background process; logs in terminal'
  print_url_row 'PostgreSQL' 'core service' "postgresql://localhost:$db_port/$db_name"
  print_url_row 'Mailpit SMTP' "$(profile_state email)" "smtp://localhost:$smtp_port"
  print_url_row 'Mailpit inbox' "$(profile_state email)" "http://localhost:$mailpit_ui_port"
  print_url_row 'OpenObserve' "$(profile_state observability)" "http://localhost:$observe_port"
  print_url_row 'OTLP HTTP' "$(profile_state observability)" "http://localhost:$otel_http_port"
  print_url_row 'OTLP gRPC' "$(profile_state observability)" "localhost:$otel_grpc_port"
  print_url_row 'SeaweedFS S3' "$(profile_state seaweedfs)" "$s3_endpoint (bucket: $(read_setting .env S3_BUCKET starter-files))"
  print_url_row 'Filesystem store' 'always available' "$file_directory (relative to apps/api)"
  print_url_row 'Active file driver' "${storage_driver}" "example default: $(read_setting .env.example STORAGE_DRIVER filesystem)"

  printf '\nLocal example credentials (read from .env.example; .env overrides may differ)\n'
  printf '  %-25s | %-38s | %s\n' 'Service' 'Username / access key' 'Password / secret'
  printf '  %s\n' '--------------------------+----------------------------------------+------------------------------------------'
  print_credential_row 'PostgreSQL' "$(read_setting .env.example POSTGRES_USER starter)" "$(read_setting .env.example POSTGRES_PASSWORD '(not set)')"
  print_credential_row 'OpenObserve' "$(read_setting .env.example ZO_ROOT_USER_EMAIL '(not set)')" "$(read_setting .env.example ZO_ROOT_USER_PASSWORD '(not set)')"
  print_credential_row 'SeaweedFS S3' "$(read_setting .env.example S3_ACCESS_KEY_ID '(not set)')" "$(read_setting .env.example S3_SECRET_ACCESS_KEY '(not set)')"
  print_credential_row 'File URL signing' '—' "$(read_setting .env.example FILE_URL_SIGNING_SECRET '(not set)')"
  print_credential_row 'Mailpit SMTP' 'no authentication' 'no authentication'
}

npm install
if [[ "$selected_auth" == "none" ]]; then
  npx prettier --write apps/api/src/app.ts apps/api/src/email.ts apps/web/app/page.tsx apps/web/app/layout.tsx apps/mobile/App.tsx apps/mobile/app.json packages/shared/src/index.ts
fi
# Reconcile optional profiles so a disabled service from an earlier setup does not keep running.
docker compose --profile email --profile observability --profile seaweedfs stop mailpit openobserve otel-collector seaweedfs
docker compose up -d --wait
npm run db:migrate --workspace=@starter/api

print_local_services "${1:-}"

if [[ "${1:-}" == "--start" ]]; then
  npm run dev:all
  exit $?
fi

cat <<'EOF'

Starter is ready.
  npm run dev         Start the API and web app
  npm run dev:worker  Start the durable job worker
  npm run dev:mobile  Start Expo in another terminal
  ./scripts/setup.sh --start  Set up services and start API, web, Expo, and the worker

For an isolated agent workspace:
  ./scripts/agent-env.sh create <name>
EOF
