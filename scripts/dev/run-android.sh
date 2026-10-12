#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=scripts/android/lib.sh
source "$REPO/scripts/android/lib.sh"

ENV_NAME="${1:-development}"
case "$ENV_NAME" in
  development|staging|production) ;;
  *) die "Unknown environment '$ENV_NAME' (expected development, staging or production)." ;;
esac

require_file "$REPO/.env.$ENV_NAME" "run: cp .env.example .env.$ENV_NAME"
ensure_java

MODE="${ENV_NAME}PlayDebug"

SUFFIX_ARGS=()
case "$ENV_NAME" in
  development) SUFFIX_ARGS=(--appIdSuffix dev) ;;
  staging)     SUFFIX_ARGS=(--appIdSuffix stg) ;;
esac

info "Installing the $(capitalize "$ENV_NAME") flavor (mode $MODE)"
cd "$REPO"
ENVFILE=".env.$ENV_NAME" exec npx react-native run-android \
  --mode "$MODE" \
  ${SUFFIX_ARGS[@]+"${SUFFIX_ARGS[@]}"} \
  --active-arch-only \
  --no-packager \
  "${@:2}"
