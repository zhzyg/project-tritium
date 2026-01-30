#!/usr/bin/env bash
set -euo pipefail

# Usage: bash ops/run_gate.sh <gate-name> [regress-script]

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <gate-name> [regress-script]"
    echo "Example: $0 ui-flowable-mvp1 ops/regress_ui_flowable_mvp1.sh"
    exit 1
fi

GATE_NAME="$1"
REGRESS_SCRIPT="${2:-}"

# Ensure we are at repo root
cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

# Load Environment Variables (Secrets)
ENV_FILE="${AI_GUARD_ENV_FILE:-/root/.config/tritium/admin.env}"
if [ -f "$ENV_FILE" ]; then
    echo "--- Loading env from $ENV_FILE ---"
    set -a
    # shellcheck source=/dev/null
    . "$ENV_FILE"
    set +a
else
    echo "--- No env file found at $ENV_FILE (skipping load) ---"
fi

# Sync ADMIN_PASS and AI_GUARD_ADMIN_PASS
if [ -z "${ADMIN_PASS:-}" ] && [ -n "${AI_GUARD_ADMIN_PASS:-}" ]; then
    export ADMIN_PASS="$AI_GUARD_ADMIN_PASS"
elif [ -n "${ADMIN_PASS:-}" ] && [ -z "${AI_GUARD_ADMIN_PASS:-}" ]; then
    export AI_GUARD_ADMIN_PASS="$ADMIN_PASS"
fi

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
ART_DIR="artifacts/${GATE_NAME}_${TIMESTAMP}"
mkdir -p "$ART_DIR"

echo "=== Gate Runner: ${GATE_NAME} ==="
echo "Artifacts: ${ART_DIR}"

# 1. Pre-check AI Guard
echo "--- Running AI Guard (Pre) ---"
set +e
./ops/ai_guard.sh 2>&1 | tee "${ART_DIR}/ai_guard_pre.log"
GUARD_PRE_EXIT=${PIPESTATUS[0]}
set -e

if [ $GUARD_PRE_EXIT -ne 0 ]; then
    echo "[FAIL] AI Guard Pre failed. Aborting."
    exit 1
fi
echo "[OK] AI Guard Pre passed."

# 2. Regression Script
REGRESS_EXIT=0
if [ -n "$REGRESS_SCRIPT" ]; then
    if [ -f "$REGRESS_SCRIPT" ]; then
        echo "--- Running Regression: ${REGRESS_SCRIPT} ---"
        set +e
        bash "$REGRESS_SCRIPT" 2>&1 | tee "${ART_DIR}/regress.log"
        REGRESS_EXIT=${PIPESTATUS[0]}
        set -e
        
        if [ $REGRESS_EXIT -eq 0 ]; then
            echo "[OK] Regression passed"
        else
            echo "[FAIL] Regression failed (Exit: $REGRESS_EXIT)"
        fi
    else
        echo "[WARN] Regression script not found: ${REGRESS_SCRIPT}"
        echo "Skipped - Script not found" > "${ART_DIR}/regress.log"
    fi
else
    echo "--- No regression script provided ---"
fi

# 3. Post-check AI Guard
echo "--- Running AI Guard (Post) ---"
set +e
./ops/ai_guard.sh 2>&1 | tee "${ART_DIR}/ai_guard_post.log"
GUARD_POST_EXIT=${PIPESTATUS[0]}
set -e

if [ $GUARD_POST_EXIT -ne 0 ]; then
    echo "[FAIL] AI Guard Post failed."
else
    echo "[OK] AI Guard Post passed."
fi

# 4. Git Evidence
echo "--- Capturing Git Evidence ---"
git status -sb > "${ART_DIR}/git_status.txt"
git diff --stat > "${ART_DIR}/git_diff_stat.txt"
git diff | head -n 200 > "${ART_DIR}/git_diff_head_200.txt"

# 5. Safety Checks
echo "--- Safety Checks ---"
# Check for forbidden files in status (staged or unstaged)
SUSPECTS=$(git status --porcelain | grep -E "backend/jeecg-module-system/jeecg-system-start/config|\.config/tritium|artifacts/|\.key$|\.crt$|\.pem$|\.p12$|\.pfx$|\.env|application-prod" || true)

if [ -n "$SUSPECTS" ]; then
    echo "[FAIL] Forbidden files detected in git status:"
    echo "$SUSPECTS"
    echo "$SUSPECTS" > "${ART_DIR}/suspect_detected.txt"
    exit 1
fi
echo "[OK] No forbidden files detected."

echo "=== Summary ==="
echo "Artifacts: ${ART_DIR}"

if [ $REGRESS_EXIT -ne 0 ]; then
    echo "Result: REGRESSION FAILED"
    exit 1
fi

if [ $GUARD_POST_EXIT -ne 0 ]; then
    echo "Result: POST-GUARD FAILED"
    exit 1
fi

echo "Result: SUCCESS"
