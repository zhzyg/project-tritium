#!/usr/bin/env bash
set -euxo pipefail
TAG="${1:?need tag}"
LOCK="${2:-project-lock.json}"

burl="$(jq -r '.backend.url' "$LOCK")"
furl="$(jq -r '.frontend.url' "$LOCK")"

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT

resolve_one() {
  local url="$1" tag="$2" dir="$3"
  git clone --no-checkout --filter=blob:none --depth 1 "$url" "$dir" >/dev/null 2>&1 || true
  pushd "$dir" >/dev/null
  git fetch --tags --depth 1 origin "refs/tags/$tag:refs/tags/$tag" >/dev/null 2>&1
  git rev-list -n 1 "$tag"
  popd >/dev/null
}

bc="$(resolve_one "$burl" "$TAG" "$tmp/backend")"
fc="$(resolve_one "$furl" "$TAG" "$tmp/frontend")"

jq --arg ref "$TAG" --arg bc "$bc" --arg fc "$fc" \
  '.backend.ref=$ref | .frontend.ref=$ref | .backend.commit=$bc | .frontend.commit=$fc' \
  "$LOCK" > "$tmp/lock.json"

mv "$tmp/lock.json" "$LOCK"
echo "backend: $bc"
echo "frontend: $fc"
