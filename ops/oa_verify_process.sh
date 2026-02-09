#!/bin/bash
# Scoped verification for Process Designer MVP-10B
# Only runs the specific reproduction/verification script for this feature.

echo "Running Process Designer verification..."
export BASE_URL=${BASE_URL:-"https://oa.donaldzhu.com"}

# Ensure login state exists
if [ ! -f .artifacts/oa/oa-storage-state.json ]; then
    echo "Login state not found. Please run ops/oa_login_capture.mjs first."
    exit 1
fi

node ops/repro_form_process_approver.mjs
