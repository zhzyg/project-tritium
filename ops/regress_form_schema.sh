#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:8080/jeecg-boot}
LOG_FILE=${LOG_FILE:-backend/jeecg-system-start.out}
FORM_KEY=${FORM_KEY:-dev}
USERNAME=${USERNAME:-admin}
PASSWORD=${PASSWORD:-123456}
CHECK_KEY="form_schema_${RANDOM}"

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

SCHEMA1=$(jq -nc '{widgetList:[], formConfig:{labelWidth:120}}')
SCHEMA1_ESCAPED=$(printf '%s' "$SCHEMA1" | jq -Rs .)
SAVE1=$(curl -s -X POST "${BASE_URL}/form/schema/save" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"schemaJson\":${SCHEMA1_ESCAPED}}")
VERSION1=$(echo "$SAVE1" | jq -r '.result.version')

SCHEMA2=$(jq -nc '{widgetList:[{type:"input", options:{name:"field1"}}], formConfig:{labelWidth:120}}')
SCHEMA2_ESCAPED=$(printf '%s' "$SCHEMA2" | jq -Rs .)
SAVE2=$(curl -s -X POST "${BASE_URL}/form/schema/save" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"schemaJson\":${SCHEMA2_ESCAPED}}")
VERSION2=$(echo "$SAVE2" | jq -r '.result.version')

LATEST=$(curl -s -X GET "${BASE_URL}/form/schema/latest?formKey=${FORM_KEY}" \
  -H "X-Access-Token: ${TOKEN}")
LATEST_VERSION=$(echo "$LATEST" | jq -r '.result.version')
LATEST_LEN=$(echo "$LATEST" | jq -r '.result.schemaJson | length')

if [ -z "$VERSION1" ] || [ -z "$VERSION2" ] || [ "$VERSION1" = "null" ] || [ "$VERSION2" = "null" ]; then
  echo "Save failed: $SAVE1 | $SAVE2" >&2
  exit 1
fi

if [ "$VERSION2" -le "$VERSION1" ]; then
  echo "Version did not increment: v1=${VERSION1} v2=${VERSION2}" >&2
  exit 1
fi

if [ -z "$LATEST_VERSION" ] || [ "$LATEST_VERSION" = "null" ] || [ -z "$LATEST_LEN" ]; then
  echo "Latest fetch failed: $LATEST" >&2
  exit 1
fi

echo "save1_version=${VERSION1}"
echo "save2_version=${VERSION2}"
echo "latest_version=${LATEST_VERSION}"
echo "schema_length=${LATEST_LEN}"
