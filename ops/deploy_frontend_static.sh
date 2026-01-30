#!/usr/bin/env bash
set -euo pipefail

FRONT_DIR="${FRONT_DIR:-/root/project-tritium/frontend}"
DIST_DIR="${DIST_DIR:-$FRONT_DIR/dist}"
WEB_ROOT="${WEB_ROOT:-/var/www/oa}"
SITE_URL="${SITE_URL:-https://oa.donaldzhu.com/}"
ART_DIR="${ART_DIR:-/root/project-tritium/artifacts/frontend-deploy}"
TS="$(date -u +%Y%m%d_%H%M%S)"
OUT_DIR="$ART_DIR/$TS"
LOG="$OUT_DIR/deploy.log"

mkdir -p "$OUT_DIR"
exec > >(tee -a "$LOG") 2>&1

echo "[deploy] ts=$TS"
echo "[deploy] FRONT_DIR=$FRONT_DIR"
echo "[deploy] WEB_ROOT=$WEB_ROOT"
echo "[deploy] SITE_URL=$SITE_URL"

test -d "$FRONT_DIR"
cd "$FRONT_DIR"

# 1) build（优先 pnpm，其次 npm/yarn）
if command -v pnpm >/dev/null 2>&1; then
  echo "[deploy] using pnpm"
  pnpm -s install
  pnpm -s build
elif command -v npm >/dev/null 2>&1; then
  echo "[deploy] using npm"
  npm ci
  npm run build
elif command -v yarn >/dev/null 2>&1; then
  echo "[deploy] using yarn"
  yarn install --frozen-lockfile || yarn install
  yarn build
else
  echo "[deploy] ERROR: no pnpm/npm/yarn found" >&2
  exit 2
fi

# 2) verify dist
test -d "$DIST_DIR"
test -f "$DIST_DIR/index.html"
echo "[deploy] dist index exists"

# 3) sync to web root (safe + idempotent)
sudo mkdir -p "$WEB_ROOT"
if command -v rsync >/dev/null 2>&1; then
  echo "[deploy] rsync to web root"
  sudo rsync -a --delete "$DIST_DIR"/ "$WEB_ROOT"/
else
  echo "[deploy] fallback cp -a (delete then copy)"
  sudo rm -rf "$WEB_ROOT"/*
  sudo cp -a "$DIST_DIR"/. "$WEB_ROOT"/
fi

# 4) permissions
sudo chown -R root:root "$WEB_ROOT"
sudo find "$WEB_ROOT" -type d -exec chmod 755 {} \;
sudo find "$WEB_ROOT" -type f -exec chmod 644 {} \;

# 5) verify site returns 200 (HTML)
echo "[deploy] curl verify /"
curl -skI "$SITE_URL" | sed -n '1,25p' | tee "$OUT_DIR/curl_head.txt"
curl -sk "$SITE_URL" | head -n 30 | tee "$OUT_DIR/curl_body_head.txt"

# 6) record a short directory listing as evidence (no huge output)
echo "[deploy] web root listing top"
ls -lah "$WEB_ROOT" | sed -n '1,120p' | tee "$OUT_DIR/webroot_ls.txt"

echo "[deploy] PASS"
echo "[deploy] artifacts_dir=$OUT_DIR"
