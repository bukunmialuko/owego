#!/usr/bin/env bash

# shellcheck source=scripts/lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib.sh"

ensure_xcode() {
  need xcodebuild
  local dev
  dev="$(xcode-select -p 2>/dev/null || true)"
  [[ "$dev" == *.app/Contents/Developer ]] \
    || die "xcode-select points at '$dev', not a full Xcode. Run: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
  xcodebuild -version >/dev/null 2>&1 \
    || die "xcodebuild -version failed — accept the licence first: sudo xcodebuild -license accept"
}

pods_in_sync() {
  [[ -f "$REPO/ios/Pods/Manifest.lock" ]] || return 1
  cmp -s "$REPO/ios/Podfile.lock" "$REPO/ios/Pods/Manifest.lock"
}

distribution_identity_present() {
  security find-identity -v -p codesigning 2>/dev/null | grep -qE "Distribution: .*\($1\)"
}

profile_installed() {
  local wanted="$1" dir f name expires
  for dir in "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles" \
             "$HOME/Library/MobileDevice/Provisioning Profiles"; do
    [[ -d "$dir" ]] || continue
    for f in "$dir"/*.mobileprovision; do
      [[ -f "$f" ]] || continue
      name="$(security cms -D -i "$f" 2>/dev/null | plutil -extract Name raw -o - - 2>/dev/null || true)"
      [[ "$name" == "$wanted" ]] || continue
      expires="$(security cms -D -i "$f" 2>/dev/null | plutil -extract ExpirationDate raw -o - - 2>/dev/null || true)"
      if [[ -n "$expires" && "$expires" < "$(date -u +%Y-%m-%dT%H:%M:%SZ)" ]]; then
        warn "'$wanted' is installed but expired ($expires) — re-sync it"
      fi
      return 0
    done
  done
  return 1
}

plist_bundle_id() {
  plutil -extract BUNDLE_ID raw -o - "$1" 2>/dev/null || true
}

asc_key_shape_ok() {
  need node
  node -e '
    const fs = require("fs");
    let k;
    try { k = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); }
    catch (e) { console.error("not valid JSON"); process.exit(1); }
    const missing = ["key_id", "issuer_id", "key"].filter((f) => typeof k[f] !== "string" || k[f].trim() === "");
    if (missing.length) { console.error("missing or empty: " + missing.join(", ")); process.exit(1); }
    const pem = k.is_key_content_base64 === true ? Buffer.from(k.key, "base64").toString("utf8") : k.key;
    if (!pem.includes("BEGIN PRIVATE KEY")) {
      console.error(k.is_key_content_base64 === true
        ? "\"key\" does not decode to a PEM private key (is_key_content_base64 is true, so it must be the base64 of the whole .p8 file)"
        : "\"key\" is not a PEM private key (the .p8 contents with newlines as \\n, or set is_key_content_base64 true and base64-encode the file)");
      process.exit(1);
    }
  ' "$1"
}

resolve_asc_key() {
  ASC_KEY="${FASTLANE_APP_STORE_CONNECT_API_KEY_JSON:-$REPO/ios/fastlane/app-store-connect-api-key.json}"
  if [[ ! -f "$ASC_KEY" ]]; then
    if [[ "${1:-}" == required ]]; then
      require_file "$ASC_KEY" "the App Store Connect API key — superapp/app-store-connect-api-key.json in the secrets bundle, or set FASTLANE_APP_STORE_CONNECT_API_KEY_JSON"
    fi
    ASC_KEY=""
    return 0
  fi
  asc_key_shape_ok "$ASC_KEY" \
    || die "${ASC_KEY#"$REPO"/} is not an App Store Connect API key in fastlane's shape ({key_id, issuer_id, key[, is_key_content_base64]})."
  ok "App Store Connect API key: ${ASC_KEY#"$REPO"/}"
}

ipa_bundle_id() {
  unzip -p "$1" 'Payload/*.app/Info.plist' 2>/dev/null | plutil -extract CFBundleIdentifier raw -o - - 2>/dev/null || true
}

ipa_build_number() {
  unzip -p "$1" 'Payload/*.app/Info.plist' 2>/dev/null | plutil -extract CFBundleVersion raw -o - - 2>/dev/null || true
}

fastlane_lane() {
  ensure_ruby
  (cd "$REPO/ios" && bundle exec fastlane ios "$@") 1>&2
}

upload_to_testflight() {
  local env="$1" ipa="$2" build="$3"
  local grace="${OWEGO_UPLOAD_GRACE_SECONDS:-420}"
  local limit="${OWEGO_UPLOAD_TIMEOUT_SECONDS:-2700}"
  local version answer_file waited=0 step=15 lane_pid status
  version="$(node -p "require('$REPO/package.json').version")"

  ensure_ruby
  answer_file="$(mktemp "${TMPDIR:-/tmp}/owego-upload-answer.XXXXXX")"

  set -m
  ( cd "$REPO/ios" && exec bundle exec fastlane ios upload "env:$env" "ipa:$ipa" 1>&2 ) &
  lane_pid=$!
  set +m

  while kill -0 "$lane_pid" 2>/dev/null; do
    sleep "$step"
    waited=$((waited + step))

    if ((waited >= grace)) && ((waited % 60 < step)); then
      info "still uploading after ${waited}s — asking App Store Connect whether build $build arrived"
      : > "$answer_file"
      fastlane_lane testflight_has_build "env:$env" "version:$version" "build:$build" "out:$answer_file" || true
      if [[ "$(tr -d '[:space:]' < "$answer_file")" == yes ]]; then
        warn "build $build is on App Store Connect, but altool has not exited — a known hang in its"
        warn "telemetry queue, after the delivery. Ending it; the upload itself is complete."
        end_lane "$lane_pid"
        rm -f "$answer_file"
        return 0
      fi
    fi

    if ((waited >= limit)); then
      end_lane "$lane_pid"
      rm -f "$answer_file"
      local short; short="$(npm_env_suffix "$env")"
      die "Upload gave up after ${limit}s and build $build is not on App Store Connect. Check the fastlane output above, then retry with 'npm run ios:upload:$short'."
    fi
  done

  status=0
  wait "$lane_pid" || status=$?
  rm -f "$answer_file"
  ((status == 0)) || die "fastlane's upload lane failed (exit $status). Its output is above."
}

npm_env_suffix() {
  case "$1" in
    staging) printf 'stg' ;;
    production) printf 'prod' ;;
    *) printf '%s' "$1" ;;
  esac
}

end_lane() {
  disown "$1" 2>/dev/null || true
  kill -- -"$1" 2>/dev/null || true
  sleep 2
  kill -9 -- -"$1" 2>/dev/null || true
}
