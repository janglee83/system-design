#!/usr/bin/env sh
# Regenerates TS types from Rust into temp dirs and fails if they differ from the committed
# files (packages/sim/src/generated, packages/content/src/generated). Does not use git.
# An empty export or an empty committed dir fails too, so the check can never pass vacuously.
set -e
cd "$(dirname "$0")/.."

tmp=""
trap 'rm -rf "$tmp"' EXIT

check() {
  crate="$1"
  dir="$2"
  rm -rf "$tmp"
  tmp="$(mktemp -d)"
  TS_RS_EXPORT_DIR="$tmp" cargo test -q -p "$crate" --features ts export_bindings >/dev/null
  if [ -z "$(ls -A "$tmp")" ]; then
    echo "exporting $crate types produced no files: is the ts feature or export_bindings filter broken?"
    exit 1
  fi
  if [ ! -d "$dir" ] || [ -z "$(ls -A "$dir")" ]; then
    echo "committed types for $crate are missing: $dir is empty"
    exit 1
  fi
  if ! diff -r "$tmp" "$dir"; then
    # Absolute: cargo runs tests from the crate dir, so a relative export dir lands there.
    echo "generated types for $crate are STALE: regenerate with TS_RS_EXPORT_DIR=$PWD/$dir cargo test -p $crate --features ts export_bindings"
    exit 1
  fi
  echo "generated types for $crate are up to date"
}

check sim-core packages/sim/src/generated
check content packages/content/src/generated
