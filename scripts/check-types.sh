#!/usr/bin/env sh
# Regenerates TS types from Rust into a temp dir and fails if they differ
# from the committed files in packages/sim/src/generated. Does not use git.
set -e
cd "$(dirname "$0")/.."
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
TS_RS_EXPORT_DIR="$tmp" cargo test -q -p sim-core --features ts export_bindings >/dev/null
if ! diff -r "$tmp" packages/sim/src/generated; then
  echo "generated types are STALE: regenerate with TS_RS_EXPORT_DIR=packages/sim/src/generated cargo test -p sim-core --features ts export_bindings"
  exit 1
fi
echo "generated types are up to date"
