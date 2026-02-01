#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${AI_GUARD_BASE_URL:-http://127.0.0.1:8080/jeecg-boot}"
SITE_URL="https://oa.donaldzhu.com"

echo "=== MVP-2D Route Regression Test ==="

check_endpoint() {
  local url="$1"
  local method="$2"
  local expected_re="$3"
  
  echo "Checking $method $url ..."
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url")
  echo "Code: $CODE"
  
  if [[ "$CODE" =~ $expected_re ]]; then
    echo "PASS"
  else
    echo "FAIL: Expected $expected_re, got $CODE"
    exit 1
  fi
}

# 1. API Context
check_endpoint "${BASE_URL}/bpm/task/context?taskId=dummy" "GET" "^(200|401|403)$"

# 2. API Vars (POST)
check_endpoint "${BASE_URL}/bpm/process/vars" "POST" "^(200|401|403)$"

# 3. Frontend Route
check_endpoint "${SITE_URL}/bpm/approve" "GET" "^(200)$"

echo "SUCCESS: MVP-2D Routes verified."
exit 0
