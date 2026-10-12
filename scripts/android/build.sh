#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
ANDROID_DIR="$REPO/android"
DIST_DIR="$REPO/dist/android"
# shellcheck source=scripts/android/lib.sh
source "$SCRIPT_DIR/lib.sh"

usage() {
  cat >&2 <<'USAGE'
Usage: scripts/android/build.sh --env <development|staging|production> [options]

  --env <name>             Environment: picks .env.<name>, the Firebase project and the icons.
  --store <play|dappStore> Which store's key signs the build (default: play).
  --artifact <apk|aab>     What to produce (default: apk). aab is Play-only.
  --version-code <n>       versionCode to stamp. Default 1: fine to sideload, rejected by every
                           store. The release lanes always pass one.
  --abis <list>            Comma-separated ABIs. Defaults: apk armeabi-v7a,arm64-v8a;
                           aab armeabi-v7a,arm64-v8a,x86_64. arm64-v8a alone is fastest locally.
  --envfile <path>         Override the .env file (default .env.<env>, repo-relative).
  --secrets <zip|dir>      Unpack a secrets bundle into place first.
  --clean                  Run `gradlew clean` first.
  --dry-run                Print the resolved plan and the artifact path; build nothing.
  -h, --help               This text.

Examples:
  scripts/android/build.sh --env staging
  scripts/android/build.sh --env production --artifact aab --version-code 42
  scripts/android/build.sh --env staging --store dappStore --abis arm64-v8a
USAGE
}

trap secrets_cleanup EXIT INT TERM

unpack_secrets() {
  local root
  secrets_root "$1"
  root="$SECRETS_ROOT"

  umask 077
  load_secrets_env "$root"

  place "$root/upload-keystore.jks"           "$ANDROID_DIR/app/upload-keystore.jks"
  place "$root/dappstore-keystore.jks"        "$ANDROID_DIR/app/dappstore-keystore.jks"
  place "$root/key.properties"                "$ANDROID_DIR/key.properties"
  place "$root/circlefin-maven.properties"    "$ANDROID_DIR/circlefin-maven.properties"
  place "$root/play-service-account.json"     "$ANDROID_DIR/fastlane/play-service-account.json"
  place "$root/google-service-account.json" "$ANDROID_DIR/fastlane/google-service-account.json"
  local e
  for e in development staging production; do
    place "$root/env/.env.$e"                 "$REPO/.env.$e"
    place "$root/google-services/$e.json"     "$ANDROID_DIR/app/src/$e/google-services.json"
    place "$root/GoogleService-Info/$e.plist" "$REPO/ios/flavors/$e/GoogleService-Info.plist"
  done
  umask 022
}

check_signing() {
  local env_prefix suffix label
  if [[ "$STORE" == play ]]; then
    env_prefix=ANDROID; suffix=""; label="Play upload key"
  else
    env_prefix=DAPP_ANDROID; suffix="-dapp"; label="dApp Store key"
  fi

  local path_var="${env_prefix}_KEYSTORE_PATH"
  if [[ -n "${!path_var:-}" ]]; then
    require_file "${!path_var}" "$path_var points at a file that is not there"
    local v
    for v in "${env_prefix}_KEYSTORE_ALIAS" "${env_prefix}_KEYSTORE_PASSWORD" "${env_prefix}_KEYSTORE_PRIVATE_KEY_PASSWORD"; do
      [[ -n "${!v:-}" ]] || die "$v is not set ($path_var is, so the environment route is in use)."
    done
    ok "$label: from the environment"
    return 0
  fi

  local props="$ANDROID_DIR/key.properties" k store
  require_file "$props" "the $label has nowhere to come from"
  for k in storeFile storePassword keyAlias keyPassword; do
    [[ -n "$(read_property "$props" "$k$suffix")" ]] \
      || die "key.properties has no non-empty '$k$suffix', so the $label is incomplete"
  done
  store="$(read_property "$props" "storeFile$suffix")"
  [[ "$store" == /* ]] || store="$ANDROID_DIR/app/$store"
  require_file "$store" "storeFile$suffix in key.properties names a keystore that is not there"
  ok "$label: key.properties → ${store#"$REPO"/}"
}

arg_value() {
  [[ $# -ge 2 && -n "$2" ]] || die "$1 needs a value"
  printf '%s' "$2"
}

ENV=""; STORE=play; ARTIFACT=apk; VERSION_CODE=""; ABIS=""; ENVFILE_OPT=""; SECRETS=""
CLEAN=0; DRY_RUN=0
while (($#)); do
  case "$1" in
    --env)          ENV="$(arg_value "$@")"; shift 2 ;;
    --store)        STORE="$(arg_value "$@")"; shift 2 ;;
    --artifact)     ARTIFACT="$(arg_value "$@")"; shift 2 ;;
    --version-code) VERSION_CODE="$(arg_value "$@")"; shift 2 ;;
    --abis)         ABIS="$(arg_value "$@")"; shift 2 ;;
    --envfile)      ENVFILE_OPT="$(arg_value "$@")"; shift 2 ;;
    --secrets)      SECRETS="$(arg_value "$@")"; shift 2 ;;
    --clean)        CLEAN=1; shift ;;
    --dry-run)      DRY_RUN=1; shift ;;
    -h|--help)      usage; exit 0 ;;
    *)              usage; die "Unknown argument: $1" ;;
  esac
done

case "$ENV" in
  development|staging|production) ;;
  "") usage; die "--env is required" ;;
  *)  die "--env must be development, staging or production (got '$ENV')" ;;
esac
case "$STORE" in
  play|dappStore) ;;
  *) die "--store must be play or dappStore (got '$STORE')" ;;
esac
case "$ARTIFACT" in
  apk|aab) ;;
  *) die "--artifact must be apk or aab (got '$ARTIFACT')" ;;
esac
if [[ "$ARTIFACT" == aab && "$STORE" == dappStore ]]; then
  die "The dApp Store takes APKs; an AAB is Play-only (--store play)."
fi
if [[ -z "$VERSION_CODE" ]]; then
  VERSION_CODE=1
  warn "No --version-code: stamping versionCode 1. Fine to sideload; a store rejects it, and it may refuse to install over a distributed build."
fi
[[ "$VERSION_CODE" =~ ^[1-9][0-9]*$ ]] || die "--version-code must be a positive integer (got '$VERSION_CODE')"

need node
ENV_CAP="$(capitalize "$ENV")"
STORE_CAP="$(capitalize "$STORE")"
VARIANT="${ENV}${STORE_CAP}"
if [[ "$ARTIFACT" == apk ]]; then
  TASK=":app:assemble${ENV_CAP}${STORE_CAP}Release"
  OUT_DIR="$ANDROID_DIR/app/build/outputs/apk/${VARIANT}/release"
  [[ -n "$ABIS" ]] || ABIS="armeabi-v7a,arm64-v8a"
else
  TASK=":app:bundle${ENV_CAP}${STORE_CAP}Release"
  OUT_DIR="$ANDROID_DIR/app/build/outputs/bundle/${VARIANT}Release"
  [[ -n "$ABIS" ]] || ABIS="armeabi-v7a,arm64-v8a,x86_64"
fi
ENVFILE_ABS="${ENVFILE_OPT:-.env.$ENV}"
[[ "$ENVFILE_ABS" == /* ]] || ENVFILE_ABS="$REPO/$ENVFILE_ABS"
VERSION_NAME="$(node -p "require('$REPO/package.json').version")"
DEST="$DIST_DIR/owego-${ENV}-${STORE}-${VERSION_NAME}-${VERSION_CODE}.${ARTIFACT}"

info "plan: $TASK"
info "      env=$ENV store=$STORE artifact=$ARTIFACT versionName=$VERSION_NAME versionCode=$VERSION_CODE"
info "      abis=$ABIS envfile=${ENVFILE_ABS#"$REPO"/}"
info "      output ${OUT_DIR#"$REPO"/} → ${DEST#"$REPO"/}"
if ((DRY_RUN)); then
  printf '%s\n' "$DEST"
  exit 0
fi

[[ -z "$SECRETS" ]] || unpack_secrets "$SECRETS"

need npm
ensure_java
require_file "$REPO/node_modules/.package-lock.json" "run 'npm ci' first — Gradle autolinking reads node_modules"
require_file "$ENVFILE_ABS" "copy it from the secret manager or pass --secrets. .env.example lists the keys."
if [[ -z "${PWSDK_MAVEN_URL:-}" && ! -f "$ANDROID_DIR/circlefin-maven.properties" ]]; then
  die "Circle Programmable Wallet SDK credentials missing. Export PWSDK_MAVEN_URL / PWSDK_MAVEN_USERNAME / PWSDK_MAVEN_PASSWORD, or copy android/circlefin-maven.properties.example to android/circlefin-maven.properties. See docs/installation.md > Circle wallet SDK on Android."
fi
check_signing

gradle_args=()
if ((CLEAN)); then gradle_args+=(clean); fi
gradle_args+=("$TASK" "-PreactNativeArchitectures=$ABIS")

info "gradlew ${gradle_args[*]}"
GRADLE_LOG="$(mktemp "${TMPDIR:-/tmp}/owego-gradle.XXXXXX")"
(
  cd "$ANDROID_DIR" \
    && ENVFILE="$ENVFILE_ABS" ANDROID_VERSION_CODE="$VERSION_CODE" ./gradlew "${gradle_args[@]}" 2>&1 \
    | tee "$GRADLE_LOG" 1>&2
) || {
  err "Gradle failed. Its own diagnosis (full log: $GRADLE_LOG):"
  awk '/^FAILURE: |^\* What went wrong/ { p = 1 } p' "$GRADLE_LOG" \
    | grep -vE '^\* Try:|^> Run with|^> Get more help|Build Scan|^Deprecated Gradle|warning-mode|^For more on this|^[[:space:]]*$' \
    | head -40 >&2
  exit 1
}
rm -f "$GRADLE_LOG"

shopt -s nullglob
candidates=("$OUT_DIR"/*."$ARTIFACT")
shopt -u nullglob
count=${#candidates[@]}
if [[ $count -ne 1 ]]; then
  die "Expected exactly one .$ARTIFACT in ${OUT_DIR#"$REPO"/}, found $count. Gradle's output layout changed — update build.sh."
fi

"$SCRIPT_DIR/print-artifact-signer.sh" "${candidates[0]}"

mkdir -p "$DIST_DIR"
cp "${candidates[0]}" "$DEST"
ok "$(basename "$DEST")  $(du -h "$DEST" | cut -f1 | tr -d ' ')  sha256 $(shasum -a 256 "$DEST" | cut -c1-16)…"
printf '%s\n' "$DEST"
