#!/bin/bash
set -euo pipefail

# Project Tritium OA Verification Entrypoint
# Standardized verification for any model/session.

# Default environment variables (can be overridden)
export BASE_URL="${BASE_URL:-https://oa.donaldzhu.com}"
export OA_USER="${OA_USER:-admin}"
export OA_PASS="${OA_PASS:-Admin#2026!Reset}"
export OA_STORAGE_STATE="${OA_STORAGE_STATE:-.artifacts/oa/oa-storage-state.json}"
export HEADLESS="${HEADLESS:-true}"

echo "[oa-verify] BASE_URL: $BASE_URL"
echo "[oa-verify] OA_USER:  $OA_USER"
echo "[oa-verify] STORAGE:  $OA_STORAGE_STATE"

# 1. Wait for backend if BASE_URL is likely the local one or if wait script is present
if [[ -f "./ops/wait_backend_ready.sh" ]]; then
    echo "[oa-verify] Waiting for backend readiness..."
    ./ops/wait_backend_ready.sh || echo "[oa-verify] Warning: wait_backend_ready failed, proceeding anyway."
fi

# 2. Check if storage state exists
if [[ -f "$OA_STORAGE_STATE" ]]; then
    echo "[oa-verify] Reusing existing storageState from $OA_STORAGE_STATE"
else
    echo "[oa-verify] No storageState found. Using AUTO login path."
fi

# 3. Run the main verification suite
echo "[oa-verify] Running repro_bpm_suite.sh..."
if ! ./ops/repro_bpm_suite.sh; then
    echo ""
    echo "❌ [oa-verify] VERIFICATION FAILED."
    echo "----------------------------------------------------------------"
    echo "Possible causes:"
    echo "  1. CAPTCHA is required (automated bypass failed)."
    echo "  2. Backend is down or returning 502/504."
    echo "  3. Selectors/Markers on the page changed."
    echo ""
    echo "ACTION REQUIRED:"
    echo "  If CAPTCHA is suspected, run the CAPTURE mode once to save session:"
    echo "  1. (On a machine with display) export OA_PASS='...' && export HEADLESS=false"
    echo "  2. node ops/oa_login_capture.mjs"
    echo "  3. Then re-run this verify script."
    echo "----------------------------------------------------------------"
    exit 1
fi

echo "✅ [oa-verify] ALL ROUTES PASSED."
