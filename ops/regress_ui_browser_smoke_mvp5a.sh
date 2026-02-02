#!/usr/bin/env bash
set -euo pipefail

BASE_URL="https://oa.donaldzhu.com"

echo "=== UI Browser Smoke Test (MVP-5A) ==="

echo "1. Checking key routes..."
curl -s -o /dev/null -w "%{http_code}" ${BASE_URL}/login | grep -E "200|302" || (echo "FAIL: /login did not return 200 or 302" && exit 1)
echo "PASS: /login is reachable."
curl -s -o /dev/null -w "%{http_code}" ${BASE_URL}/bpm/tasks | grep -E "200|302|401|403" || (echo "FAIL: /bpm/tasks did not return 200, 302, 401, or 403" && exit 1)
echo "PASS: /bpm/tasks is reachable."

echo "2. Running browser verification..."
ART_DIR=${ART_DIR:-.}
mkdir -p "${ART_DIR}/browser"
export ART_DIR
if ! bash "$(dirname "$0")/browser/verify_ui_login_and_bpm.sh"; then
    echo "Browser verification failed. Diagnostic files are in ${ART_DIR}/browser"
    exit 1
fi


echo "SUCCESS: UI Browser Smoke Test completed."
exit 0
