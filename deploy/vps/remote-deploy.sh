#!/usr/bin/env bash
set -euo pipefail

DEPLOY_TAG="${1:-}"
if [[ ! "$DEPLOY_TAG" =~ ^sha-[0-9a-f]{40}$ ]]; then
  echo "Expected image tag sha- followed by a full 40-character commit SHA." >&2
  exit 2
fi

: "${VPS_HOST:?Set VPS_HOST in the selected GitHub Environment}"
: "${VPS_USER:?Set VPS_USER in the selected GitHub Environment}"
: "${VPS_DEPLOY_PATH:?Set VPS_DEPLOY_PATH in the selected GitHub Environment}"
: "${VPS_SSH_PRIVATE_KEY:?Set VPS_SSH_PRIVATE_KEY in the selected GitHub Environment}"
: "${VPS_SSH_KNOWN_HOSTS:?Set VPS_SSH_KNOWN_HOSTS in the selected GitHub Environment}"
: "${VPS_SSH_PORT:=22}"
: "${GHCR_PULL_USERNAME:?Set GHCR_PULL_USERNAME in the selected GitHub Environment}"
: "${GHCR_PULL_TOKEN:?Set GHCR_PULL_TOKEN in the selected GitHub Environment}"

[[ "$VPS_USER" =~ ^[a-zA-Z0-9._-]+$ ]] || { echo "VPS_USER contains unsupported characters." >&2; exit 2; }
[[ "$VPS_HOST" =~ ^[a-zA-Z0-9.-]+$ ]] || { echo "VPS_HOST must be a hostname or IPv4 address." >&2; exit 2; }
[[ "$VPS_SSH_PORT" =~ ^[0-9]{1,5}$ ]] && ((VPS_SSH_PORT >= 1 && VPS_SSH_PORT <= 65535)) || { echo "VPS_SSH_PORT must be a TCP port from 1 to 65535." >&2; exit 2; }
[[ "$GHCR_PULL_USERNAME" =~ ^[a-zA-Z0-9-]+$ ]] || { echo "GHCR_PULL_USERNAME contains unsupported characters." >&2; exit 2; }
[[ "$VPS_DEPLOY_PATH" =~ ^/[a-zA-Z0-9_./-]+$ ]] || { echo "VPS_DEPLOY_PATH must be a simple absolute path." >&2; exit 2; }

TEMP_SSH_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_SSH_DIR"' EXIT
chmod 700 "$TEMP_SSH_DIR"
printf '%s\n' "$VPS_SSH_PRIVATE_KEY" > "$TEMP_SSH_DIR/id_ed25519"
printf '%s\n' "$VPS_SSH_KNOWN_HOSTS" > "$TEMP_SSH_DIR/known_hosts"
chmod 600 "$TEMP_SSH_DIR/id_ed25519" "$TEMP_SSH_DIR/known_hosts"

SSH=(ssh -p "$VPS_SSH_PORT" -i "$TEMP_SSH_DIR/id_ed25519" -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$TEMP_SSH_DIR/known_hosts")
SCP=(scp -P "$VPS_SSH_PORT" -i "$TEMP_SSH_DIR/id_ed25519" -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$TEMP_SSH_DIR/known_hosts")
TARGET="$VPS_USER@$VPS_HOST"

"${SSH[@]}" "$TARGET" "mkdir -p '$VPS_DEPLOY_PATH/deploy'"
"${SCP[@]}" deploy/vps/compose.yaml deploy/vps/Caddyfile deploy/vps/otel-collector.yaml deploy/vps/seaweedfs-s3-config.example.json deploy/vps/deploy.sh deploy/vps/postgres-18-preflight.sh "$TARGET:$VPS_DEPLOY_PATH/deploy/"
"${SSH[@]}" "$TARGET" "chmod 700 '$VPS_DEPLOY_PATH/deploy/deploy.sh'"

printf '%s' "$GHCR_PULL_TOKEN" | "${SSH[@]}" "$TARGET" "docker login ghcr.io --username '$GHCR_PULL_USERNAME' --password-stdin"
set +e
"${SSH[@]}" "$TARGET" "cd '$VPS_DEPLOY_PATH/deploy' && ./deploy.sh '$DEPLOY_TAG'"
DEPLOY_STATUS=$?
"${SSH[@]}" "$TARGET" "docker logout ghcr.io >/dev/null 2>&1 || true"
LOGOUT_STATUS=$?
set -e

if [[ "$DEPLOY_STATUS" -ne 0 ]]; then
  exit "$DEPLOY_STATUS"
fi
exit "$LOGOUT_STATUS"
