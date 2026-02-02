#!/bin/bash
# ops/repro_bpm_suite.sh
# Runs a suite of BPM route regression tests using stable data-testid markers.

set -e

BASE_URL=${BASE_URL:-http://127.0.0.1:80}
export BASE_URL

echo "🚀 Starting BPM Regression Suite at $BASE_URL..."

mkdir -p .artifacts/repro-bpm-suite

# 1) My Initiated
echo "Running: /bpm/my"
ROUTE=/bpm/my MARKER_SELECTOR='[data-testid="bpm-my-page"]' MARKER_TEXT="我发起的" node ops/repro_bpm_my.mjs

# 2) My Tasks (Todo)
echo "Running: /bpm/tasks"
ROUTE=/bpm/tasks MARKER_SELECTOR='[data-testid="bpm-tasks-page"]' MARKER_TEXT="我的待办" node ops/repro_bpm_my.mjs

# 3) Done Tasks
echo "Running: /bpm/done"
ROUTE=/bpm/done MARKER_SELECTOR='[data-testid="bpm-done-page"]' MARKER_TEXT="我已处理" node ops/repro_bpm_my.mjs

echo "✅ All BPM routes in suite passed!"
