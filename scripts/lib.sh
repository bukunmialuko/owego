#!/usr/bin/env bash

if [[ -t 2 ]]; then
  _BOLD=$'\e[1m'; _RED=$'\e[31m'; _GREEN=$'\e[32m'; _YELLOW=$'\e[33m'; _RESET=$'\e[0m'
else
  _BOLD=''; _RED=''; _GREEN=''; _YELLOW=''; _RESET=''
fi

info() { printf '%s▸%s %s\n' "$_BOLD" "$_RESET" "$*" >&2; }
ok()   { printf '%s✓%s %s\n' "$_GREEN" "$_RESET" "$*" >&2; }
warn() { printf '%s⚠%s %s\n' "$_YELLOW" "$_RESET" "$*" >&2; }
err()  { printf '%s✗%s %s\n' "$_RED" "$_RESET" "$*" >&2; }
die()  { err "$@"; exit 1; }

need() { command -v "$1" >/dev/null 2>&1 || die "Required tool not on PATH: $1"; }

require_file() {
  [[ -f "$1" ]] && return 0
  local shown="${1#"${REPO:-}"/}"
  die "Missing: $shown${2:+  — $2}"
}

read_property() {
  local line
  line="$(grep -E "^${2}=" "$1" 2>/dev/null | head -n 1)" || true
  printf '%s' "${line#*=}"
}

capitalize() {
  printf '%s%s' "$(printf '%s' "${1:0:1}" | tr '[:lower:]' '[:upper:]')" "${1:1}"
}

SECRETS_TMP=""

secrets_cleanup() {
  if [[ -n "$SECRETS_TMP" && -d "$SECRETS_TMP" ]]; then rm -rf "$SECRETS_TMP"; fi
}

SECRETS_ROOT=""
secrets_root() {
  local source="$1" root marker
  if [[ -d "$source" ]]; then
    root="$source"
  elif [[ -f "$source" ]]; then
    need unzip
    SECRETS_TMP="$(mktemp -d)"
    unzip -q "$source" -d "$SECRETS_TMP"
    root="$SECRETS_TMP"
  else
    die "--secrets: no such file or directory: $source"
  fi
  marker="$(find "$root" -maxdepth 2 -name secrets.env -not -path '*/__MACOSX/*' | head -n 1)"
  [[ -n "$marker" ]] || die "--secrets: no secrets.env in $source."
  # shellcheck disable=SC2034  # read by the build scripts that source this file
  SECRETS_ROOT="$(dirname "$marker")"
}

SECRETS_ENV_KEYS=()
load_secrets_env() {
  set -a
  # shellcheck disable=SC1090,SC1091
  source "$1/secrets.env"
  set +a
  local key
  while IFS= read -r key; do
    SECRETS_ENV_KEYS+=("$key")
  done < <(sed -nE 's/^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=.*/\2/p' "$1/secrets.env")
}

secrets_env_unset_args() {
  local key
  for key in ${SECRETS_ENV_KEYS[@]+"${SECRETS_ENV_KEYS[@]}"} \
             MATCH_PASSWORD MATCH_KEYCHAIN_PASSWORD MATCH_GIT_BASIC_AUTHORIZATION; do
    printf -- '-u\n%s\n' "$key"
  done
}

place() {
  [[ -f "$1" ]] || return 0
  mkdir -p "$(dirname "$2")"
  cp "$1" "$2"
  chmod 600 "$2"
  ok "placed ${2#"${REPO:-}"/}"
}

ensure_ruby() {
  if _ruby_is_usable; then return 0; fi
  local candidate
  for candidate in /opt/homebrew/opt/ruby@3.4/bin /usr/local/opt/ruby@3.4/bin; do
    if [[ -x "$candidate/ruby" && -x "$candidate/bundle" ]]; then
      export PATH="$candidate:$PATH"
      if _ruby_is_usable; then
        warn "bundle on PATH was not Ruby 3.4's — using $candidate (add it to PATH in ~/.zshrc)"
        return 0
      fi
    fi
  done
  die "No Ruby 3.4 with Bundler and the vendored gems found. brew install ruby@3.4, put /opt/homebrew/opt/ruby@3.4/bin first on PATH, then bundle install (gems go to vendor/bundle per .bundle/config)."
}

_ruby_is_usable() {
  command -v ruby >/dev/null 2>&1 && command -v bundle >/dev/null 2>&1 || return 1
  [[ "$(ruby -e 'print RUBY_VERSION' 2>/dev/null)" == 3.4.* ]] || return 1
  (cd "${REPO:?REPO must be set before ensure_ruby}" && bundle check >/dev/null 2>&1) || return 1
  if [[ "$(uname -m)" == arm64 && "$(ruby -e 'print RbConfig::CONFIG[%q{arch}]' 2>/dev/null)" == x86_64* ]]; then
    warn "Your Mac is arm64 but ruby is x86_64 — gems may build for the wrong architecture."
  fi
  return 0
}
