#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=scripts/ios/lib.sh
source "$REPO/scripts/ios/lib.sh"

ENV_NAME="${1:-}"
DEVICE="${2:-}"
PORT="${RCT_METRO_PORT:-8081}"
ATTACH_TIMEOUT="${OWEGO_ATTACH_TIMEOUT:-120}"

case "$ENV_NAME" in
  development) APP_ID=app.owego.superapp.dev; IOS_CONFIGURATION=Debug-Dev ;;
  staging)     APP_ID=app.owego.superapp.stg; IOS_CONFIGURATION=Debug-Stg ;;
  production)  APP_ID=app.owego.superapp;     IOS_CONFIGURATION=Debug ;;
  *) die "Unknown environment '$ENV_NAME' (expected development, staging or production)." ;;
esac
SCHEME="$(capitalize "$ENV_NAME")"

need node
require_file "$REPO/.env.$ENV_NAME" "run: cp .env.example .env.$ENV_NAME"

start_inspector_watch() {
  INSPECTOR_STATE="$(mktemp -t owego-inspector)"
  # shellcheck disable=SC2016  # the single-quoted ${…} is JavaScript
  node -e '
    const http = require("http");
    const fs = require("fs");
    const [port, appId, stateFile, parentPid] = process.argv.slice(1);
    let stale = null;
    const record = (pages) => {
      const present = new Map();
      for (const page of pages) {
        if (page.appId !== appId) continue;
        present.set(page.reactNative?.logicalDeviceId ?? page.id, page.deviceName || "unknown device");
      }
      stale ??= new Set(present.keys());
      for (const id of stale) if (!present.has(id)) stale.delete(id);
      const lines = [...present].map(([id, name]) => `${stale.has(id) ? "stale" : "fresh"}\t${name}`);
      fs.writeFileSync(stateFile, lines.join("\n"));
    };
    const poll = () => {
      try {
        process.kill(Number(parentPid), 0);
      } catch {
        process.exit(0);
      }
      const req = http.get({ host: "localhost", port, path: "/json/list", timeout: 2000 }, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk)).on("end", () => {
          try {
            const pages = JSON.parse(body);
            if (Array.isArray(pages)) record(pages);
          } catch {}
          setTimeout(poll, 500);
        });
      });
      req.on("timeout", () => req.destroy());
      req.on("error", () => setTimeout(poll, 500));
    };
    poll();' "$PORT" "$APP_ID" "$INSPECTOR_STATE" "$$" &
  INSPECTOR_WATCH_PID=$!
  disown "$INSPECTOR_WATCH_PID"
  trap 'kill "$INSPECTOR_WATCH_PID" 2>/dev/null; rm -f "$INSPECTOR_STATE"' EXIT
}

wait_for_app() {
  local deadline=$(( SECONDS + ATTACH_TIMEOUT )) first
  info "Waiting up to ${ATTACH_TIMEOUT}s for $APP_ID to connect to Metro on port $PORT"
  while (( SECONDS < deadline )); do
    if grep -q '^fresh' "$INSPECTOR_STATE"; then
      first="$(head -n 1 "$INSPECTOR_STATE")"
      if [[ "$first" == stale* ]]; then
        warn "The debugger will attach to '$(cut -f 2 <<<"$first")', which was already running $APP_ID before this launch: React Native Tools takes the first device Metro lists. Close the app there and press F5 again to debug the device you picked."
      fi
      ok "$APP_ID is connected to Metro — attaching the debugger"
      return 0
    fi
    sleep 1
  done
  return 1
}

install_on_iphone() {
  local udid="$1" xcode_args app
  ensure_xcode
  pods_in_sync || die "ios/Pods does not match ios/Podfile.lock — run: npm run ios:pods"
  xcode_args=(-workspace ios/owego.xcworkspace -scheme "$SCHEME" -configuration "$IOS_CONFIGURATION"
    -destination 'generic/platform=iOS')

  info "Building the $SCHEME scheme ($IOS_CONFIGURATION) for iPhone"
  ENVFILE=".env.$ENV_NAME" xcodebuild -quiet "${xcode_args[@]}" build

  # shellcheck disable=SC2016  # the single-quoted ${…} is JavaScript
  app="$(xcodebuild "${xcode_args[@]}" -showBuildSettings -json 2>/dev/null | node -e '
    const targets = JSON.parse(require("fs").readFileSync(0, "utf8"));
    const app = targets.find((t) => t.buildSettings.WRAPPER_EXTENSION === "app");
    if (app) console.log(`${app.buildSettings.TARGET_BUILD_DIR}/${app.buildSettings.FULL_PRODUCT_NAME}`);')"
  [[ -d "$app" ]] || die "The build succeeded but no .app was found at '${app:-?}'."

  info "Installing on $udid"
  xcrun devicectl device install app --quiet --device "$udid" "$app"
}

launch_on_iphone() {
  info "Launching $APP_ID"
  xcrun devicectl device process launch --quiet --device "$1" --terminate-existing "$APP_ID"
}

case "$DEVICE" in
  ios-device:*|ios-simulator:*|android:*) ;;
  none|'')
    die "No device selected. Boot a simulator, start an emulator or plug in your phone, then press F5 again."
    ;;
  *)
    die "Unrecognised device '$DEVICE' — expected a value printed by scripts/dev/list-devices.sh."
    ;;
esac

cd "$REPO"
start_inspector_watch
case "$DEVICE" in
  ios-device:*)
    udid="${DEVICE#ios-device:}"
    install_on_iphone "$udid"
    launch_on_iphone "$udid"
    if ! wait_for_app; then
      warn "The app did not reach Metro — relaunching once"
      launch_on_iphone "$udid"
      wait_for_app || die "The app on the phone never connected to Metro. The phone must reach this Mac over the network: the same Wi-Fi, or the Mac on the phone's hotspot."
    fi
    ;;
  ios-simulator:*)
    "$SCRIPT_DIR/run-ios.sh" "$ENV_NAME" --udid "${DEVICE#ios-simulator:}"
    wait_for_app || die "The app never connected to Metro on port $PORT — check the Metro terminal."
    ;;
  android:*)
    "$SCRIPT_DIR/run-android.sh" "$ENV_NAME" --device "${DEVICE#android:}"
    wait_for_app || die "The app never connected to Metro on port $PORT — check the build output above."
    ;;
esac
