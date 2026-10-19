#!/usr/bin/env sh
# Regenerates TS types from Rust into temp dirs and fails if they differ from the committed
# files (packages/sim/src/generated, packages/content/src/generated). Does not use git.
set -e
cd "$(dirname "$0")/.."

check() {
  crate="$1"
  dir="$2"
  tmp="$(mktemp -d)"
  TS_RS_EXPORT_DIR="$tmp" cargo test -q -p "$crate" --features ts export_bindings >/dev/null
  if ! diff -r "$tmp" "$dir"; then
    rm -rf "$tmp"
    # Absolute: cargo runs tests from the crate dir, so a relative export dir lands there.
    echo "generated types for $crate are STALE: regenerate with TS_RS_EXPORT_DIR=$PWD/$dir cargo test -p $crate --features ts export_bindings"
    exit 1
  fi
  rm -rf "$tmp"
  echo "generated types for $crate are up to date"
}

check sim-core packages/sim/src/generated
check content packages/content/src/generated
