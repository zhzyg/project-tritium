#!/usr/bin/env bash
set -euo pipefail

echo "[frontend-check] start"

if [ ! -f frontend/package.json ]; then
  echo "[frontend-check] skip: frontend/package.json not found"
  exit 0
fi

if [ ! -d frontend/node_modules ]; then
  echo "[frontend-check] install"
  (cd frontend && npm install)
fi

echo "[frontend-check] build"
(cd frontend && npm run build)

echo "[frontend-check] OK"
