#!/usr/bin/env bash
set -euo pipefail
SITE_URL="${SITE_URL:-https://oa.donaldzhu.com/}"
ART_DIR="${ART_DIR:-/root/project-tritium/artifacts/frontend-regress}"
TS="$(date -u +%Y%m%d_%H%M%S)"
OUT_DIR="$ART_DIR/$TS"
mkdir -p "$OUT_DIR"

echo "[regress] ts=$TS"
echo "[regress] curl -I $SITE_URL"
CODE="$(curl -sk -o /dev/null -w "%{http_code}" -I "$SITE_URL")"
echo "http_code=$CODE" | tee "$OUT_DIR/result.txt"

if [ "$CODE" != "200" ]; then
  echo "FAIL: expected 200, got $CODE" | tee -a "$OUT_DIR/result.txt"
  exit 2
fi

echo "PASS" | tee -a "$OUT_DIR/result.txt"
echo "[regress] artifacts_dir=$OUT_DIR"
