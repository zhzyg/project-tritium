#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:8080/jeecg-boot}
LOG_FILE=${LOG_FILE:-backend/jeecg-system-start.out}
FORM_KEY=${FORM_KEY:-dev}
USERNAME=${USERNAME:-admin}
PASSWORD=${PASSWORD:-123456}
CHECK_KEY="form_query_${RANDOM}"

if [ ! -f "$LOG_FILE" ]; then
  echo "Log file not found: $LOG_FILE" >&2
  exit 1
fi

curl -s "${BASE_URL}/sys/randomImage/${CHECK_KEY}" > /dev/null

CAPTCHA_LINE=$(rg --text "checkCode =" "$LOG_FILE" | tail -n 1 || true)
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

SCHEMA='{"widgetList":[{"type":"input","formItemFlag":true,"options":{"name":"name","label":"Name","type":"text","required":false}},{"type":"number","formItemFlag":true,"options":{"name":"amount","label":"Amount","required":false}}],"formConfig":{}}'
SCHEMA_ESCAPED=$(printf '%s' "$SCHEMA" | jq -Rs .)
SAVE=$(curl -s -X POST "${BASE_URL}/form/schema/save" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"schemaJson\":${SCHEMA_ESCAPED}}")
VERSION=$(echo "$SAVE" | jq -r '.result.version')
if [ -z "$VERSION" ] || [ "$VERSION" = "null" ]; then
  echo "Schema save failed: $SAVE" >&2
  exit 1
fi

PUBLISH=$(curl -s -X POST "${BASE_URL}/form/schema/publish" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\"}")
PUBLISHED_VERSION=$(echo "$PUBLISH" | jq -r '.result.version')
TABLE_NAME=$(echo "$PUBLISH" | jq -r '.result.tableName')
if [ -z "$PUBLISHED_VERSION" ] || [ "$PUBLISHED_VERSION" = "null" ] || [ -z "$TABLE_NAME" ] || [ "$TABLE_NAME" = "null" ]; then
  echo "Publish failed: $PUBLISH" >&2
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

if [ -z "$RECORD1" ] || [ "$RECORD1" = "null" ] || [ -z "$RECORD2" ] || [ "$RECORD2" = "null" ]; then
  echo "Submit failed: $SUBMIT1 | $SUBMIT2" >&2
  exit 1
fi

PAGE=$(curl -s -X GET "${BASE_URL}/form/data/page?formKey=${FORM_KEY}&pageNo=1&pageSize=10" \
  -H "X-Access-Token: ${TOKEN}")
PAGE_TOTAL=$(echo "$PAGE" | jq -r '.result.total')
if [ "$PAGE_TOTAL" -lt 2 ]; then
  echo "Page total too small: ${PAGE_TOTAL}" >&2
  exit 1
fi

FILTER=$(curl -s -X GET "${BASE_URL}/form/data/page?formKey=${FORM_KEY}&pageNo=1&pageSize=10&q_name=alpha" \
  -H "X-Access-Token: ${TOKEN}")
FILTER_TOTAL=$(echo "$FILTER" | jq -r '.result.total')
FILTER_NAME=$(echo "$FILTER" | jq -r '.result.records[0].data.name')
if [ "$FILTER_TOTAL" -lt 1 ] || [ "$FILTER_NAME" != "alpha" ]; then
  echo "Filter failed: $FILTER" >&2
  exit 1
fi

GET_RES=$(curl -s -X GET "${BASE_URL}/form/data/get?id=${RECORD1}" \
  -H "X-Access-Token: ${TOKEN}")
GET_ID=$(echo "$GET_RES" | jq -r '.result.recordId')
GET_NAME=$(echo "$GET_RES" | jq -r '.result.data.name')
if [ "$GET_ID" != "$RECORD1" ] || [ "$GET_NAME" != "alpha" ]; then
  echo "Get failed: $GET_RES" >&2
  exit 1
fi

echo "published_version=${PUBLISHED_VERSION}"
echo "table_name=${TABLE_NAME}"
echo "inserted_record_ids=${RECORD1},${RECORD2}"
echo "page_total=${PAGE_TOTAL}"
echo "filter_total=${FILTER_TOTAL}"
