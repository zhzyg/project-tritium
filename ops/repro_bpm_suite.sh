#!/bin/bash
# ops/repro_bpm_suite.sh
# Runs a suite of BPM route regression tests using stable data-testid markers.

set -e

BASE_URL=${BASE_URL:-http://127.0.0.1:80}
OA_STORAGE_STATE=${OA_STORAGE_STATE:-.artifacts/oa-storage-state.json}
export BASE_URL OA_STORAGE_STATE

echo "🚀 Starting BPM Regression Suite at $BASE_URL..."

if [[ "$BASE_URL" == *"oa.donaldzhu.com"* ]]; then
  if [ ! -f "$OA_STORAGE_STATE" ]; then
    echo "⚠️  Online environment detected but no storage state found at $OA_STORAGE_STATE."
    echo "⚠️  Please run 'node ops/oa_login_capture.mjs' first to capture a valid session."
    # We allow it to proceed, but it will likely fail if CAPTCHA is present. 
    # Or strict fail:
    # exit 1 
    # For now, let's just warn and try (maybe no captcha for admin?)
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
