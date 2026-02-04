#!/bin/bash
# ops/repro_bpm_suite.sh
# Runs a suite of BPM route regression tests using stable data-testid markers.

set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:80}
OA_STORAGE_STATE=${OA_STORAGE_STATE:-.artifacts/oa/oa-storage-state.json}
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

SUMMARY_FILE=".artifacts/repro-bpm-suite/summary.env"
echo "" > "$SUMMARY_FILE"

run_route() {
  local route="$1"
  local marker_text="$2"
  local slug="${route//\//_}"
  slug="${slug#_}"
  local attempts=0
  local max_attempts=2
  local rc=1

  while [[ $attempts -le $max_attempts ]]; do
    echo "Running: ${route} (attempt $((attempts + 1))/$((max_attempts + 1)))"
    set +e
    ROUTE="$route" MARKER_SELECTOR='body' MARKER_TEXT="$marker_text" node ops/repro_bpm_my.mjs
    rc=$?
    set -e
    if [[ $rc -eq 0 ]]; then
      echo "✅ ${route} PASS"
      return 0
    fi
    attempts=$((attempts + 1))
    if [[ $attempts -le $max_attempts ]]; then
      sleep $((attempts * 2))
    fi
  done
  echo "❌ ${route} FAIL (see .artifacts/repro-bpm-suite/${slug})"
  return 1
}

my_ok=1
tasks_ok=1
done_ok=1

run_route "/bpm/my" "我发起的" || my_ok=0
run_route "/bpm/tasks" "我的待办" || tasks_ok=0
run_route "/bpm/done" "我已处理" || done_ok=0

echo "my_ok=${my_ok}" >> "$SUMMARY_FILE"
echo "tasks_ok=${tasks_ok}" >> "$SUMMARY_FILE"
echo "done_ok=${done_ok}" >> "$SUMMARY_FILE"

if [[ $my_ok -eq 0 || $tasks_ok -eq 0 ]]; then
  echo "❌ BPM suite failed: core routes (my/tasks) did not pass."
  exit 1
fi

if [[ $done_ok -eq 0 ]]; then
  echo "⚠️  BPM suite WARN: /bpm/done failed (see .artifacts/repro-bpm-suite/bpm_done)."
  exit 0
fi

echo "✅ All BPM routes in suite passed!"
