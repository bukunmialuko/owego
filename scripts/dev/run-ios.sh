#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=scripts/ios/lib.sh
source "$REPO/scripts/ios/lib.sh"

ENV_NAME="${1:-development}"
case "$ENV_NAME" in
  development|staging|production) ;;
  *) die "Unknown environment '$ENV_NAME' (expected development, staging or production)." ;;
esac

require_file "$REPO/.env.$ENV_NAME" "run: cp .env.example .env.$ENV_NAME"
SCHEME="$(capitalize "$ENV_NAME")"
require_file "$REPO/ios/Pods/Manifest.lock" "run: npm run ios:pods"

info "Installing the $SCHEME scheme"
cd "$REPO"
ENVFILE=".env.$ENV_NAME" exec npx react-native run-ios --scheme "$SCHEME" --no-packager "${@:2}"
