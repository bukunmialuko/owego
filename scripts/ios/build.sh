#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
IOS_DIR="$REPO/ios"
DIST_DIR="$REPO/dist/ios"
TEAM_ID="XXXXXXXXXX"
WORKSPACE="owego.xcworkspace"
# shellcheck source=scripts/ios/lib.sh
source "$SCRIPT_DIR/lib.sh"

usage() {
  cat >&2 <<'USAGE'
Usage: scripts/ios/build.sh --env <staging|production> [options]

  --env <name>             Environment: picks the scheme, the bundle id, the profile and
                           .env.<name>. Development is not distributable and is refused.
  --upload                 Upload the IPA to TestFlight in the same run (scripts/ios/upload.sh
                           does it later). Requires the App Store Connect API key.
  --build-number <n>       CFBundleVersion to stamp. Default: the latest TestFlight upload + 1,
                           which needs the App Store Connect API key (see --secrets); without
                           one, 1 with a warning — fine to inspect, rejected by TestFlight.
  --secrets <zip|dir>      Unpack an owego-ios-secrets bundle into place first. v1's layout,
                           unchanged.
  --envfile <path>         Override the .env file (default .env.<env>, repo-relative).
  --clean                  Run `xcodebuild clean` first.
  --reuse-archive          Export the .xcarchive this run would build, if it is already there,
                           instead of archiving again. For resuming after an export or upload
                           failed — the archive under ios/build/archives/ is kept on success.
  --dry-run                Print the resolved plan and the artifact path; build nothing.
  -h, --help               This text.

Examples:
  scripts/ios/build.sh --env staging
  scripts/ios/build.sh --env staging --upload --secrets ~/Dev/owego-ios-secrets.zip
  scripts/ios/build.sh --env production --build-number 42
  scripts/ios/build.sh --env staging --upload --build-number 155 --reuse-archive

Through npm every flag goes after `--`:
  npm run ios:deploy:stg -- --secrets ~/Dev/owego-ios-secrets.zip
USAGE
}

EXPORT_DIR=""; NUMBER_FILE=""; XC_LOG=""
cleanup() {
  secrets_cleanup
  if [[ -n "$EXPORT_DIR" && -d "$EXPORT_DIR" ]]; then rm -rf "$EXPORT_DIR"; fi
  if [[ -n "$NUMBER_FILE" && -f "$NUMBER_FILE" ]]; then rm -f "$NUMBER_FILE"; fi
}
trap cleanup EXIT
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

check_signing() {
  if distribution_identity_present "$TEAM_ID" && profile_installed "$PROFILE"; then
    ok "signing: distribution identity for $TEAM_ID and '$PROFILE' installed"
    return 0
  fi
  info "signing material for $BUNDLE_ID is not installed — fetching with match (readonly)"
  [[ -n "${MATCH_PASSWORD:-}" ]] \
    || info "MATCH_PASSWORD is not set — match will use the passphrase stored in your login keychain, or prompt for it"
  fastlane_lane sync_signing type:appstore \
    || die "match could not install the signing material (its own message is above). Run 'npm run ios:signing:sync' from a terminal, with MATCH_PASSWORD in secrets.env or exported"
  if ! distribution_identity_present "$TEAM_ID" || ! profile_installed "$PROFILE"; then
    die "Still no distribution identity for $TEAM_ID or no '$PROFILE' after match"
  fi
  ok "signing: installed by match"
}

arg_value() {
  [[ $# -ge 2 && -n "$2" ]] || die "$1 needs a value"
  printf '%s' "$2"
}

ENV=""; UPLOAD=0; BUILD_NUMBER=""; SECRETS=""; ENVFILE_OPT=""; CLEAN=0; DRY_RUN=0; REUSE_ARCHIVE=0
while (($#)); do
  case "$1" in
    --env)          ENV="$(arg_value "$@")"; shift 2 ;;
    --upload)       UPLOAD=1; shift ;;
    --build-number) BUILD_NUMBER="$(arg_value "$@")"; shift 2 ;;
    --secrets)      SECRETS="$(arg_value "$@")"; shift 2 ;;
    --envfile)      ENVFILE_OPT="$(arg_value "$@")"; shift 2 ;;
    --clean)        CLEAN=1; shift ;;
    --reuse-archive) REUSE_ARCHIVE=1; shift ;;
    --dry-run)      DRY_RUN=1; shift ;;
    -h|--help)      usage; exit 0 ;;
    *)              usage; die "Unknown argument: $1" ;;
  esac
done

case "$ENV" in
  staging)    SCHEME=Staging;    CONFIGURATION=Release-Stg; BUNDLE_ID=app.owego.superapp.stg ;;
  production) SCHEME=Production; CONFIGURATION=Release;     BUNDLE_ID=app.owego.superapp ;;
  "")          usage; die "--env is required" ;;
  development) die "--env development is not distributable: there is no App Store Connect record for app.owego.superapp.dev and it is not in the certificates repo. Use staging." ;;
  *)           die "--env must be staging or production (got '$ENV')" ;;
esac
if [[ -n "$BUILD_NUMBER" ]]; then
  [[ "$BUILD_NUMBER" =~ ^[1-9][0-9]*$ ]] || die "--build-number must be a positive integer (got '$BUILD_NUMBER')"
fi

need node
PROFILE="match AppStore $BUNDLE_ID"
VERSION="$(node -p "require('$REPO/package.json').version")"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] \
  || die "package.json version '$VERSION' is not x.y.z — App Store Connect rejects anything else."
ENVFILE_ABS="${ENVFILE_OPT:-.env.$ENV}"
[[ "$ENVFILE_ABS" == /* ]] || ENVFILE_ABS="$REPO/$ENVFILE_ABS"

resolve_paths() {
  local n="${BUILD_NUMBER:-<testflight+1>}"
  ARCHIVE="$IOS_DIR/build/archives/owego-${ENV}-${VERSION}-${n}.xcarchive"
  DEST="$DIST_DIR/owego-${ENV}-${VERSION}-${n}.ipa"
}
resolve_paths

info "plan: scheme $SCHEME, configuration $CONFIGURATION$( ((REUSE_ARCHIVE)) && echo ' (reusing the archive if it is there)')$( ((UPLOAD)) && echo ', then TestFlight')"
info "      env=$ENV bundle=$BUNDLE_ID version=$VERSION build=${BUILD_NUMBER:-<testflight+1>} profile='$PROFILE'"
info "      envfile=${ENVFILE_ABS#"$REPO"/}"
info "      archive ${ARCHIVE#"$REPO"/} → ${DEST#"$REPO"/}"
if ((DRY_RUN)); then
  printf '%s\n' "$DEST"
  exit 0
fi

[[ -z "$SECRETS" ]] || unpack_secrets "$SECRETS"
[[ -z "${DELIVER_ALTOOL_ADDITIONAL_UPLOAD_PARAMETERS:-}" ]] || export DELIVER_ALTOOL_ADDITIONAL_UPLOAD_PARAMETERS

need npm
ensure_xcode
require_file "$REPO/node_modules/.package-lock.json" "run 'npm ci' first — the bundling phase runs Metro from node_modules"
require_file "$ENVFILE_ABS" "copy it from the secret manager. .env.example lists the keys."

PLIST="$IOS_DIR/flavors/$ENV/GoogleService-Info.plist"
require_file "$PLIST" "pass --secrets, or drop the Firebase iOS config there (ios/flavors/$ENV/README.md). The '[owego] Copy Firebase config' build phase would fail after the whole compile."
plist_id="$(plist_bundle_id "$PLIST")"
[[ "$plist_id" == "$BUNDLE_ID" ]] \
  || die "${PLIST#"$REPO"/} is for bundle id '$plist_id', expected '$BUNDLE_ID' — the wrong flavor's file is in place."

pods_in_sync || die "Pods are out of date (Podfile.lock ≠ Pods/Manifest.lock): npm run ios:pods"

if ((UPLOAD)); then resolve_asc_key required; else resolve_asc_key; fi

check_signing

if [[ -z "$BUILD_NUMBER" ]]; then
  if [[ -n "$ASC_KEY" ]]; then
    NUMBER_FILE="$(mktemp "${TMPDIR:-/tmp}/owego-build-number.XXXXXX")"
    fastlane_lane resolve_build_number "env:$ENV" "version:$VERSION" "out:$NUMBER_FILE"
    BUILD_NUMBER="$(tr -d '[:space:]' < "$NUMBER_FILE")"
    [[ "$BUILD_NUMBER" =~ ^[1-9][0-9]*$ ]] || die "resolve_build_number wrote '$BUILD_NUMBER', not a positive integer"
    resolve_paths
    info "build number for this run: $BUILD_NUMBER → ${DEST#"$REPO"/}"
  else
    BUILD_NUMBER=1
    resolve_paths
    warn "No App Store Connect API key and no --build-number: stamping CFBundleVersion 1. Fine to inspect; TestFlight rejects a reused number."
  fi
fi

XC_LOG="$(mktemp "${TMPDIR:-/tmp}/owego-xcodebuild.XXXXXX")"
xcodebuild_clean_env=()
while IFS= read -r arg; do xcodebuild_clean_env+=("$arg"); done < <(secrets_env_unset_args)
xcodebuild() { env ${xcodebuild_clean_env[@]+"${xcodebuild_clean_env[@]}"} /usr/bin/xcodebuild "$@"; }
xcode_filter() { grep --line-buffered -E '^(=== |\*\* |PhaseScriptExecution|Ld )|: (error|warning): ' || true; }
xcode_failed() {
  err "xcodebuild $1 failed. Its own errors (full log: $XC_LOG):"
  grep -E '(^|[[:space:]])(error|fatal error): |^\*\* (ARCHIVE|EXPORT|CLEAN) FAILED' "$XC_LOG" | sort -u | head -40 >&2
  exit 1
}

if ((CLEAN)); then
  ((REUSE_ARCHIVE)) && die "--clean and --reuse-archive contradict each other."
  info "xcodebuild clean ($SCHEME / $CONFIGURATION)"
  (cd "$IOS_DIR" && xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" -configuration "$CONFIGURATION" clean 2>&1 \
    | tee "$XC_LOG" | xcode_filter 1>&2) || xcode_failed clean
fi

if ((REUSE_ARCHIVE)) && [[ -d "$ARCHIVE" ]]; then
  archived_version="$(plutil -extract ApplicationProperties.CFBundleShortVersionString raw -o - "$ARCHIVE/Info.plist" 2>/dev/null || true)"
  archived_build="$(plutil -extract ApplicationProperties.CFBundleVersion raw -o - "$ARCHIVE/Info.plist" 2>/dev/null || true)"
  [[ "$archived_version" == "$VERSION" && "$archived_build" == "$BUILD_NUMBER" ]] \
    || die "${ARCHIVE#"$REPO"/} holds $archived_version ($archived_build), not $VERSION ($BUILD_NUMBER). Drop --reuse-archive to build it again."
  ok "reusing ${ARCHIVE#"$REPO"/} ($VERSION ($BUILD_NUMBER))"
else
  ((REUSE_ARCHIVE)) && info "no archive at ${ARCHIVE#"$REPO"/} to reuse — building it"
  rm -rf "$ARCHIVE"
  mkdir -p "$(dirname "$ARCHIVE")"
  info "xcodebuild archive ($SCHEME / $CONFIGURATION, MARKETING_VERSION=$VERSION CURRENT_PROJECT_VERSION=$BUILD_NUMBER)"
  (
    cd "$IOS_DIR" \
      && xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" -configuration "$CONFIGURATION" \
           -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" archive \
           MARKETING_VERSION="$VERSION" CURRENT_PROJECT_VERSION="$BUILD_NUMBER" ENVFILE="$ENVFILE_ABS" 2>&1 \
      | tee "$XC_LOG" | xcode_filter 1>&2
    exit "${PIPESTATUS[0]}"
  ) || xcode_failed archive
fi

EXPORT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/owego-export.XXXXXX")"
cat > "$EXPORT_DIR/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store-connect</string>
	<key>destination</key>
	<string>export</string>
	<key>signingStyle</key>
	<string>manual</string>
	<key>teamID</key>
	<string>${TEAM_ID}</string>
	<key>provisioningProfiles</key>
	<dict>
		<key>${BUNDLE_ID}</key>
		<string>${PROFILE}</string>
	</dict>
	<key>manageAppVersionAndBuildNumber</key>
	<false/>
	<key>stripSwiftSymbols</key>
	<true/>
</dict>
</plist>
PLIST

info "xcodebuild -exportArchive (app-store-connect, manual signing, '$PROFILE')"
(
  xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportPath "$EXPORT_DIR" \
    -exportOptionsPlist "$EXPORT_DIR/ExportOptions.plist" 2>&1 \
    | tee -a "$XC_LOG" | xcode_filter 1>&2
  exit "${PIPESTATUS[0]}"
) || xcode_failed export
rm -f "$XC_LOG"

shopt -s nullglob
candidates=("$EXPORT_DIR"/*.ipa)
shopt -u nullglob
if [[ ${#candidates[@]} -ne 1 ]]; then
  die "Expected exactly one .ipa in the export, found ${#candidates[@]}. Xcode's export layout changed — update build.sh."
fi

mkdir -p "$DIST_DIR"
cp "${candidates[0]}" "$DEST"
DSYMS="${DEST%.ipa}.dSYMs.zip"
if [[ -d "$ARCHIVE/dSYMs" ]]; then
  rm -f "$DSYMS"
  ditto -c -k --keepParent "$ARCHIVE/dSYMs" "$DSYMS"
fi
ok "$(basename "$DEST")  $(du -h "$DEST" | cut -f1 | tr -d ' ')  sha256 $(shasum -a 256 "$DEST" | cut -c1-16)…"
info "archive kept at ${ARCHIVE#"$REPO"/}; dSYMs at ${DSYMS#"$REPO"/}"

if ((UPLOAD)); then
  upload_to_testflight "$ENV" "$DEST" "$BUILD_NUMBER"
fi

printf '%s\n' "$DEST"
