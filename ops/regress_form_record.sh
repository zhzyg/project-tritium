#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:8080/jeecg-boot}
LOG_FILE=${LOG_FILE:-backend/jeecg-system-start.out}
FORM_KEY=${FORM_KEY:-dev}
USERNAME=${USERNAME:-admin}
PASSWORD=${PASSWORD:-123456}
CHECK_KEY="form_record_${RANDOM}"

if [ ! -f "$LOG_FILE" ]; then
  echo "Log file not found: $LOG_FILE" >&2
  exit 1
fi

curl -s "${BASE_URL}/sys/randomImage/${CHECK_KEY}" > /dev/null

CAPTCHA_LINE=$(rg "checkCode =" "$LOG_FILE" | tail -n 1 || true)
CAPTCHA=$(echo "$CAPTCHA_LINE" | sed -E 's/.*checkCode = ([A-Za-z0-9]+).*/\1/')

if [ -z "$CAPTCHA" ] || [ "$CAPTCHA" = "$CAPTCHA_LINE" ]; then
  echo "Failed to extract captcha from logs" >&2
  exit 1
fi

LOGIN_RES=$(curl -s -X POST "${BASE_URL}/sys/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\",\"captcha\":\"${CAPTCHA}\",\"checkKey\":\"${CHECK_KEY}\"}")

TOKEN=$(echo "$LOGIN_RES" | jq -r '.result.token')
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Login failed: $LOGIN_RES" >&2
  exit 1
fi

LATEST=$(curl -s -X GET "${BASE_URL}/form/schema/latest?formKey=${FORM_KEY}" \
  -H "X-Access-Token: ${TOKEN}")
LATEST_VERSION=$(echo "$LATEST" | jq -r '.result.version')
if [ -z "$LATEST_VERSION" ] || [ "$LATEST_VERSION" = "null" ]; then
  echo "Latest schema fetch failed: $LATEST" >&2
  exit 1
fi

DATA1=$(jq -nc '{name:"alpha", amount:1}')
DATA1_ESCAPED=$(printf '%s' "$DATA1" | jq -Rs .)
SUBMIT1=$(curl -s -X POST "${BASE_URL}/form/data/submit" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"dataJson\":${DATA1_ESCAPED}}")
RECORD1=$(echo "$SUBMIT1" | jq -r '.result.recordId')

DATA2=$(jq -nc '{name:"beta", amount:2}')
DATA2_ESCAPED=$(printf '%s' "$DATA2" | jq -Rs .)
SUBMIT2=$(curl -s -X POST "${BASE_URL}/form/data/submit" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"dataJson\":${DATA2_ESCAPED}}")
RECORD2=$(echo "$SUBMIT2" | jq -r '.result.recordId')

PAGE=$(curl -s -X GET "${BASE_URL}/form/data/page?formKey=${FORM_KEY}&pageNo=1&pageSize=10" \
  -H "X-Access-Token: ${TOKEN}")
PAGE_TOTAL=$(echo "$PAGE" | jq -r '.result.total')
PAGE_LEN=$(echo "$PAGE" | jq -r '.result.records | length')
MATCH_COUNT=$(echo "$PAGE" | jq -r --argjson v "$LATEST_VERSION" '[.result.records[] | select(.schemaVersion == $v)] | length')

if [ -z "$RECORD1" ] || [ "$RECORD1" = "null" ] || [ -z "$RECORD2" ] || [ "$RECORD2" = "null" ]; then
  echo "Submit failed: $SUBMIT1 | $SUBMIT2" >&2
  exit 1
fi

if [ "$PAGE_LEN" -lt 2 ]; then
  echo "Page count too small: ${PAGE_LEN}" >&2
  exit 1
fi

if [ "$MATCH_COUNT" -lt 2 ]; then
  echo "Schema version mismatch in page records" >&2
  exit 1
fi

echo "latest_version=${LATEST_VERSION}"
echo "record_id=${RECORD2}"
echo "page_count=${PAGE_TOTAL}"
