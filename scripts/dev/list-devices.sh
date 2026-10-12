#!/usr/bin/env bash
# shellcheck disable=SC2016  # the single-quoted ${…} and $(…) are JavaScript and VS Code icons
set -euo pipefail

exec 2>/dev/null

ANDROID_SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
ADB="$ANDROID_SDK/platform-tools/adb"

list_iphones() {
  local json
  json="$(mktemp -t owego-devices)"
  if xcrun devicectl list devices --json-output "$json" >/dev/null; then
    node -e '
      const { result } = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
      const field = (s) => String(s).replace(/\|/g, "/");
      for (const { hardwareProperties: hw, connectionProperties: conn, deviceProperties: dev } of result.devices) {
        if (hw.reality !== "physical" || hw.platform !== "iOS") continue;
        // A phone paired once but not reachable now is still listed, without a transport.
        if (conn.pairingState !== "paired" || !conn.transportType) continue;
        const via = { wired: "USB", localNetwork: "Wi-Fi" }[conn.transportType] ?? conn.transportType;
        console.log(`ios-device:${hw.udid}|$(device-mobile) ${field(dev.name)}|iOS ${dev.osVersionNumber} · ${via}`);
      }' "$json" || true
  fi
  rm -f "$json"
}

list_simulators() {
  xcrun simctl list devices booted --json | node -e '
    const { devices } = JSON.parse(require("fs").readFileSync(0, "utf8"));
    const field = (s) => String(s).replace(/\|/g, "/");
    for (const [runtime, sims] of Object.entries(devices)) {
      const version = /SimRuntime\.iOS-(\d+)-(\d+)$/.exec(runtime);
      if (!version) continue;
      for (const sim of sims) {
        if (sim.state !== "Booted" || !sim.isAvailable) continue;
        console.log(`ios-simulator:${sim.udid}|$(vm) ${field(sim.name)}|iOS ${version[1]}.${version[2]} · Simulator`);
      }
    }' || true
}

list_android() {
  [[ -x "$ADB" ]] || return 0
  local serial state details name kind
  "$ADB" devices -l | tail -n +2 | while read -r serial state details; do
    [[ "$state" == "device" ]] || continue
    if [[ "$serial" == emulator-* ]]; then
      name="$("$ADB" -s "$serial" emu avd name </dev/null | head -n 1 | tr -d '\r' || true)"
      kind="Emulator"
    else
      name="$(sed -n 's/.*model:\([^ ]*\).*/\1/p' <<<"$details" | tr '_' ' ')"
      kind="Device"
    fi
    printf 'android:%s|$(device-mobile) %s|Android · %s\n' "$serial" "${name:-$serial}" "$kind"
  done || true
}

if ! command -v node >/dev/null; then
  echo "none|node is not on VS Code's PATH|Start VS Code from a terminal with \`code .\`"
  exit 0
fi

devices="$(list_iphones; list_simulators; list_android)"
if [[ -n "$devices" ]]; then
  printf '%s\n' "$devices"
else
  echo "none|No device running or connected|Boot a simulator, start an emulator or plug in your phone, then press F5 again"
fi
