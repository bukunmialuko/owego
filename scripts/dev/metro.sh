#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=scripts/lib.sh
source "$REPO/scripts/lib.sh"

ENV_NAME="${1:-development}"
PORT="${RCT_METRO_PORT:-8081}"
ENVFILE="$REPO/.env.$ENV_NAME"

require_file "$ENVFILE" "run: cp .env.example .env.$ENV_NAME"

for pid in $(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true); do
  command="$(ps -o command= -p "$pid" 2>/dev/null || true)"
  case "$command" in
    *react-native*start*|*metro*|*cli.js*start*)
      warn "Replacing the packager on port $PORT (pid $pid) so it serves .env.$ENV_NAME"
      kill "$pid" 2>/dev/null || true
      ;;
    '')
      ;;
    *)
      die "Port $PORT is held by something that is not Metro (pid $pid). Free it and retry."
      ;;
  esac
done

for _ in 1 2 3 4 5 6 7 8 9 10; do
  lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 || break
  sleep 0.5
done

info "Metro on .env.$ENV_NAME, port $PORT"
cd "$REPO"
ENVFILE=".env.$ENV_NAME" exec npx react-native start --port "$PORT" --reset-cache
