#!/usr/bin/env bash
set -euo pipefail

EVIDENCE_DIR=${EVIDENCE_DIR:-.}
ART_DIR="$EVIDENCE_DIR/browser"
export ART_DIR="$EVIDENCE_DIR/browser"
echo "ART_DIR in regress script: $ART_DIR"

mkdir -p "$ART_DIR"

echo "Running smoke screenshot test..."
bash "$(dirname "$0")/browser/smoke_screenshot.sh"

echo "Verifying screenshot..."
if [ -f "${ART_DIR}/001_example.png" ]; then
    echo "PASS: Screenshot found."
else
    echo "FAIL: Screenshot not found in ${ART_DIR}"
    exit 1
fi

echo "SUCCESS: Browser smoke test passed."
exit 0
