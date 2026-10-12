#!/usr/bin/env bash

# shellcheck source=scripts/lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib.sh"

ensure_java() {
  if [[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/java" ]]; then
    export PATH="$JAVA_HOME/bin:$PATH"
    return 0
  fi
  if java -version >/dev/null 2>&1; then
    return 0
  fi
  local candidate
  for candidate in \
    /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
    /usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home"; do
    if [[ -x "$candidate/bin/java" ]]; then
      export JAVA_HOME="$candidate"
      export PATH="$JAVA_HOME/bin:$PATH"
      warn "java was not runnable on PATH — using JAVA_HOME=$JAVA_HOME"
      return 0
    fi
  done
  die "No runnable JDK found. Install JDK 17 and export JAVA_HOME (React Native 0.86 targets Java 17)."
}
