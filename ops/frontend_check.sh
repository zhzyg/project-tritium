#!/usr/bin/env bash
set -euo pipefail

# Prevent Vite/Rollup OOM on small VPS. Allow override from environment.
: "${NODE_OPTIONS:=--max-old-space-size=3072}"
export NODE_OPTIONS

echo "[frontend-check] start"

if [ ! -f frontend/package.json ]; then
  echo "[frontend-check] skip: frontend/package.json not found"
  exit 0
fi

if [ ! -d frontend/node_modules ]; then
  echo "[frontend-check] install"
  (cd frontend && pnpm install)
fi

echo "[frontend-check] build"
# Capture full build log for forensics; keep terminal output concise.
log_file="${ART_DIR:-/tmp}/frontend_build_full.log"
: > "$log_file"

(
  cd frontend
  pnpm -s run build 2>&1 | tee -a "$log_file"
)

echo "[frontend-check] OK"
