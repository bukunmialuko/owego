#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=scripts/lib.sh
source "$REPO/scripts/lib.sh"

AVD="${OWEGO_AVD:-}"
BOOT_TIMEOUT="${OWEGO_AVD_BOOT_TIMEOUT:-180}"

ANDROID_SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
ADB="$ANDROID_SDK/platform-tools/adb"
EMULATOR="$ANDROID_SDK/emulator/emulator"

[[ -x "$ADB" ]] || die "adb not found at $ADB — set ANDROID_HOME to your SDK location."

attached_device() { "$ADB" devices | awk '$2 == "device" { print $1; exit }'; }

existing="$(attached_device)"
if [[ -n "$existing" ]]; then
  ok "Android device already attached: $existing"
  exit 0
fi

[[ -x "$EMULATOR" ]] || die "No device attached and no emulator binary at $EMULATOR."

if [[ -z "$AVD" ]]; then
  AVD="$("$EMULATOR" -list-avds | head -n 1)"
  [[ -n "$AVD" ]] || die "No device attached and no AVD defined. Create one in Android Studio, or plug a phone in."
fi

info "No device attached — cold-booting AVD $AVD"
nohup "$EMULATOR" -avd "$AVD" -netdelay none -netspeed full >/dev/null 2>&1 &
disown || true

info "Waiting for $AVD to finish booting (up to ${BOOT_TIMEOUT}s)"
deadline=$(( SECONDS + BOOT_TIMEOUT ))
while (( SECONDS < deadline )); do
  if [[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
    ok "$AVD booted"
    exit 0
  fi
  sleep 2
done

die "$AVD did not report sys.boot_completed within ${BOOT_TIMEOUT}s."
