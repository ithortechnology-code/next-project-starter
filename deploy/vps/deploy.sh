#!/usr/bin/env bash
set -euo pipefail

DEPLOY_TAG="${1:-}"
if [[ ! "$DEPLOY_TAG" =~ ^sha-[0-9a-f]{40}$ ]]; then
  echo "Expected image tag sha- followed by a full 40-character commit SHA." >&2
  exit 2
fi

cd "$(dirname "${BASH_SOURCE[0]}")"
[[ -f .env ]] || { echo "Missing $PWD/.env. Copy the appropriate example and configure this VPS first." >&2; exit 1; }
command -v docker >/dev/null || { echo "Docker is required on the VPS." >&2; exit 1; }
command -v curl >/dev/null || { echo "curl is required for HTTPS health checks." >&2; exit 1; }

PREVIOUS_TAG="$(sed -n 's/^IMAGE_TAG=//p' .env | head -n 1)"
if [[ "$PREVIOUS_TAG" == "sha-0000000000000000000000000000000000000000" ]]; then
  PREVIOUS_TAG=""
fi
WEB_DOMAIN="$(sed -n 's/^WEB_DOMAIN=//p' .env | head -n 1)"
API_DOMAIN="$(sed -n 's/^API_DOMAIN=//p' .env | head -n 1)"
[[ "$WEB_DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]] || { echo "WEB_DOMAIN must be a DNS hostname." >&2; exit 1; }
[[ "$API_DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]] || { echo "API_DOMAIN must be a DNS hostname." >&2; exit 1; }
compose() {
  IMAGE_TAG="$1" docker compose --env-file .env -f compose.yaml "${@:2}"
}

rollback() {
  if [[ -n "$PREVIOUS_TAG" && "$PREVIOUS_TAG" != "$DEPLOY_TAG" ]]; then
    echo "Deployment failed; restoring image $PREVIOUS_TAG."
    compose "$PREVIOUS_TAG" up -d --pull always --remove-orphans --wait || true
  fi
}

echo "Pulling immutable images for $DEPLOY_TAG."
if ! compose "$DEPLOY_TAG" pull; then
  echo "Could not pull the requested images. Check GHCR access and the image tag." >&2
  exit 1
fi

if ! compose "$DEPLOY_TAG" up -d --remove-orphans --wait --wait-timeout 180; then
  rollback
  exit 1
fi

set +e
curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-connrefused "https://${API_DOMAIN}/health" >/dev/null
API_STATUS=$?
curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-connrefused "https://${WEB_DOMAIN}/" >/dev/null
WEB_STATUS=$?
set -e

if [[ "$API_STATUS" -ne 0 || "$WEB_STATUS" -ne 0 ]]; then
  rollback
  echo "Public HTTPS health checks failed; deployment was rolled back when a prior image existed." >&2
  exit 1
fi

if grep -q '^IMAGE_TAG=' .env; then
  sed "s/^IMAGE_TAG=.*/IMAGE_TAG=$DEPLOY_TAG/" .env > .env.tmp
else
  cat .env > .env.tmp
  printf '\nIMAGE_TAG=%s\n' "$DEPLOY_TAG" >> .env.tmp
fi
mv .env.tmp .env

echo "Deployed $DEPLOY_TAG successfully to https://${WEB_DOMAIN} and https://${API_DOMAIN}."
