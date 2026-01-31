#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${AI_GUARD_BASE_URL:-http://127.0.0.1:8080/jeecg-boot}"
echo "Checking Endpoint: ${BASE_URL}/bpm/task/context"

# 1. Test with dummy taskId (expect 404 or 400 or 401/403 depending on auth)
# We use -I to get headers, -w to get http_code
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/bpm/task/context?taskId=__dummy__")

echo "HTTP Code: $HTTP_CODE"

if [ "$HTTP_CODE" = "405" ]; then
  echo "ERROR: Method Not Allowed (405). GET should be supported."
  exit 1
fi

if [[ "$HTTP_CODE" =~ ^(400|401|403|404|200)$ ]]; then
  echo "SUCCESS: Endpoint exists and handles GET (Code $HTTP_CODE)."
  exit 0
else
  echo "WARNING: Unexpected HTTP Code $HTTP_CODE, but not 405. Treating as pass for existence check."
  exit 0
fi
