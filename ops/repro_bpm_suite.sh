#!/bin/bash
# ops/repro_bpm_suite.sh
# Runs a suite of BPM route regression tests using stable data-testid markers.

set -e

BASE_URL=${BASE_URL:-http://127.0.0.1:80}
OA_STORAGE_STATE=${OA_STORAGE_STATE:-.artifacts/oa-storage-state.json}
export BASE_URL OA_STORAGE_STATE

echo "🚀 Starting BPM Regression Suite at $BASE_URL..."

if [[ "$BASE_URL" == *"oa.donaldzhu.com"* ]]; then
  ./ops/wait_backend_ready.sh "$BASE_URL"
  if [ ! -f "$OA_STORAGE_STATE" ]; then
    echo "ℹ️  Online environment detected. No storage state found, will attempt automated login (admin bypass)."
  else
    echo "✅ Using existing session from $OA_STORAGE_STATE"
  fi
fi

mkdir -p .artifacts/repro-bpm-suite

# 1) My Initiated
echo "Running: /bpm/my"
ROUTE=/bpm/my MARKER_SELECTOR='body' MARKER_TEXT="我发起的" node ops/repro_bpm_my.mjs

# 2) My Tasks (Todo)
echo "Running: /bpm/tasks"
ROUTE=/bpm/tasks MARKER_SELECTOR='body' MARKER_TEXT="我的待办" node ops/repro_bpm_my.mjs

# 3) Done Tasks
echo "Running: /bpm/done"
ROUTE=/bpm/done MARKER_SELECTOR='body' MARKER_TEXT="我已处理" node ops/repro_bpm_my.mjs

echo "✅ All BPM routes in suite passed!"
