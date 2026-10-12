#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
IOS_DIR="$REPO/ios"
DIST_DIR="$REPO/dist/ios"
# shellcheck source=scripts/ios/lib.sh
source "$SCRIPT_DIR/lib.sh"

usage() {
  cat >&2 <<'USAGE'
Usage: scripts/ios/upload.sh --env <staging|production> [options]

  --env <name>             Environment: picks the App Store Connect app (bundle id) to upload to.
  --ipa <path>             The IPA to upload. Default: the newest dist/ios/owego-<env>-*.ipa.
  --secrets <zip|dir>      Unpack an owego-ios-secrets bundle into place first, for the App
                           Store Connect API key.
  --dry-run                Print the resolved plan and the IPA path; upload nothing.
  -h, --help               This text.

Examples:
  scripts/ios/upload.sh --env staging
  scripts/ios/upload.sh --env production --ipa dist/ios/owego-production-1.0.7-155.ipa

Through npm every flag goes after `--`:
  npm run ios:upload:stg -- --ipa dist/ios/owego-staging-1.0.7-155.ipa
USAGE
}

trap secrets_cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

unpack_secrets() {
  local root
  secrets_root "$1"
  root="$SECRETS_ROOT"
  umask 077
  load_secrets_env "$root"
  place "$root/superapp/GoogleService-Info-staging.plist"    "$IOS_DIR/flavors/staging/GoogleService-Info.plist"
  place "$root/superapp/GoogleService-Info-production.plist" "$IOS_DIR/flavors/production/GoogleService-Info.plist"
  place "$root/superapp/app-store-connect-api-key.json"      "$IOS_DIR/fastlane/app-store-connect-api-key.json"
  umask 022
}

arg_value() {
  [[ $# -ge 2 && -n "$2" ]] || die "$1 needs a value"
  printf '%s' "$2"
}

ENV=""; IPA_OPT=""; SECRETS=""; DRY_RUN=0
while (($#)); do
  case "$1" in
    --env)      ENV="$(arg_value "$@")"; shift 2 ;;
    --ipa)      IPA_OPT="$(arg_value "$@")"; shift 2 ;;
    --secrets)  SECRETS="$(arg_value "$@")"; shift 2 ;;
    --dry-run)  DRY_RUN=1; shift ;;
    -h|--help)  usage; exit 0 ;;
    *)          usage; die "Unknown argument: $1" ;;
  esac
done

case "$ENV" in
  staging)    BUNDLE_ID=app.owego.superapp.stg ;;
  production) BUNDLE_ID=app.owego.superapp ;;
  "")         usage; die "--env is required" ;;
  *)          die "--env must be staging or production (got '$ENV')" ;;
esac

if [[ -n "$IPA_OPT" ]]; then
  IPA="$IPA_OPT"
  [[ "$IPA" == /* ]] || IPA="$REPO/$IPA"
else
  IPA="$(find "$DIST_DIR" -maxdepth 1 -name "owego-${ENV}-*.ipa" -print0 2>/dev/null \
    | xargs -0 ls -t 2>/dev/null | head -n 1 || true)"
  [[ -n "$IPA" ]] || die "No dist/ios/owego-${ENV}-*.ipa to upload. Build one first: npm run ios:release:$(npm_env_suffix "$ENV"), or pass --ipa."
fi

info "plan: upload ${IPA#"$REPO"/} → TestFlight ($BUNDLE_ID)"
if ((DRY_RUN)); then
  printf '%s\n' "$IPA"
  exit 0
fi

[[ -z "$SECRETS" ]] || unpack_secrets "$SECRETS"
[[ -z "${DELIVER_ALTOOL_ADDITIONAL_UPLOAD_PARAMETERS:-}" ]] || export DELIVER_ALTOOL_ADDITIONAL_UPLOAD_PARAMETERS

require_file "$IPA" "not an exported IPA"
ipa_id="$(ipa_bundle_id "$IPA")"
[[ "$ipa_id" == "$BUNDLE_ID" ]] \
  || die "${IPA#"$REPO"/} is '$ipa_id', not $BUNDLE_ID — it was built for another environment."
IPA_BUILD="$(ipa_build_number "$IPA")"
[[ "$IPA_BUILD" =~ ^[1-9][0-9]*$ ]] || die "${IPA#"$REPO"/} has no usable CFBundleVersion ('$IPA_BUILD')."
info "      CFBundleVersion $IPA_BUILD"
resolve_asc_key required

upload_to_testflight "$ENV" "$IPA" "$IPA_BUILD"
printf '%s\n' "$IPA"
