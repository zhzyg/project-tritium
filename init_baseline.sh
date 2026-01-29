#!/usr/bin/env bash
set -euxo pipefail
LOCK="${1:-project-lock.json}"
readf(){ jq -r "$1" "$LOCK"; }

safe_checkout(){
  local dir="$1" url="$2" ref="$3" commit="$4"
  rm -rf "$dir"; mkdir -p "$dir"; pushd "$dir" >/dev/null
  git init
  git remote add origin "$url"
  if git fetch --depth 1 origin "$commit" 2>/dev/null; then
    echo "SHA fetch OK: $dir"
  else
    echo "SHA fetch failed, fetching ref depth=50: $dir"
    git fetch --depth 50 origin "refs/tags/$ref:refs/tags/$ref" 2>/dev/null || git fetch --depth 50 origin "$ref"
  fi
  git checkout -q "$commit" || { echo "CRITICAL: cannot checkout $commit"; exit 1; }
  [[ "$(git rev-parse HEAD)" == "$commit" ]] || { echo "CRITICAL: HEAD mismatch"; exit 1; }
  [ ! -f .gitmodules ] || { echo "CRITICAL: submodules detected"; cat .gitmodules; exit 1; }
  rm -rf .git
  popd >/dev/null
}

burl="$(readf '.backend.url')"; bref="$(readf '.backend.ref')"; bc="$(readf '.backend.commit')"
furl="$(readf '.frontend.url')"; fref="$(readf '.frontend.ref')"; fc="$(readf '.frontend.commit')"

safe_checkout backend "$burl" "$bref" "$bc"
safe_checkout frontend "$furl" "$fref" "$fc"

rm -rf .git
git init
git add -A
git commit -m "chore: init Project Tritium baseline (locked ref+commit)"
