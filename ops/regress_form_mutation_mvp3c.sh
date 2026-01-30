#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:8080/jeecg-boot}
LOG_FILE=${LOG_FILE:-backend/jeecg-system-start.out}
FORM_KEY=${FORM_KEY:-}
USERNAME=${USERNAME:-admin}
PASSWORD=${PASSWORD:-123456}
MYSQL_CONTAINER=${MYSQL_CONTAINER:-tritium-mysql}
MYSQL_USER=${MYSQL_USER:-root}
MYSQL_PASS=${MYSQL_PASS:-Tritium_Dev_Root_Pass_ChangeMe!}
MYSQL_DB=${MYSQL_DB:-tritium}
CHECK_KEY="form_mutation_${RANDOM}"

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

if [ -z "$FORM_KEY" ]; then
  FORM_KEY=$(docker exec -i "$MYSQL_CONTAINER" mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -Nse "select form_key from form_table_meta where status=1 order by created_time desc limit 1" "$MYSQL_DB" 2>/dev/null || true)
fi

if [ -z "$FORM_KEY" ]; then
  echo "No published formKey found; set FORM_KEY env or ensure form_table_meta has published rows" >&2
  exit 1
fi

PUBLISHED=$(curl -s -X GET "${BASE_URL}/form/schema/latestPublished?formKey=${FORM_KEY}" \
  -H "X-Access-Token: ${TOKEN}")
PUBLISHED_VERSION=$(echo "$PUBLISHED" | jq -r '.result.version')
TABLE_NAME=$(echo "$PUBLISHED" | jq -r '.result.tableName')
if [ -z "$PUBLISHED_VERSION" ] || [ "$PUBLISHED_VERSION" = "null" ] || [ -z "$TABLE_NAME" ] || [ "$TABLE_NAME" = "null" ]; then
  echo "Latest published not found for ${FORM_KEY}: $PUBLISHED" >&2
  exit 1
fi

STRING_FIELD=$(echo "$PUBLISHED" | jq -r '.result.fieldMetas[] | select(.widgetType=="input" or .widgetType=="textarea" or .widgetType=="select" or .widgetType=="radio") | .fieldKey' | head -n 1)
if [ -z "$STRING_FIELD" ] || [ "$STRING_FIELD" = "null" ]; then
  STRING_FIELD=$(echo "$PUBLISHED" | jq -r '.result.fieldMetas[0].fieldKey')
fi
if [ -z "$STRING_FIELD" ] || [ "$STRING_FIELD" = "null" ]; then
  echo "No field metas available for ${FORM_KEY}: $PUBLISHED" >&2
  exit 1
fi

EXTRA_FIELD=$(echo "$PUBLISHED" | jq -r '.result.fieldMetas[] | select(.widgetType=="number" or .widgetType=="date" or .widgetType=="datetime") | .fieldKey' | head -n 1)
EXTRA_TYPE=""
if [ -n "$EXTRA_FIELD" ] && [ "$EXTRA_FIELD" != "null" ]; then
  EXTRA_TYPE=$(echo "$PUBLISHED" | jq -r --arg key "$EXTRA_FIELD" '.result.fieldMetas[] | select(.fieldKey==$key) | .widgetType' | head -n 1)
fi

INSERT_VALUE="mvp3c-alpha-${RANDOM}"
UPDATE_VALUE="mvp3c-beta-${RANDOM}"

if [ -n "$EXTRA_FIELD" ] && [ "$EXTRA_FIELD" != "null" ]; then
  if [ "$EXTRA_TYPE" = "number" ]; then
    DATA=$(jq -nc --arg k1 "$STRING_FIELD" --arg v1 "$INSERT_VALUE" --arg k2 "$EXTRA_FIELD" --argjson v2 123 '{($k1): $v1, ($k2): $v2}')
  elif [ "$EXTRA_TYPE" = "datetime" ]; then
    DATA=$(jq -nc --arg k1 "$STRING_FIELD" --arg v1 "$INSERT_VALUE" --arg k2 "$EXTRA_FIELD" --arg v2 "2026-01-30T12:00:00" '{($k1): $v1, ($k2): $v2}')
  else
    DATA=$(jq -nc --arg k1 "$STRING_FIELD" --arg v1 "$INSERT_VALUE" --arg k2 "$EXTRA_FIELD" --arg v2 "2026-01-30" '{($k1): $v1, ($k2): $v2}')
  fi
else
  DATA=$(jq -nc --arg k1 "$STRING_FIELD" --arg v1 "$INSERT_VALUE" '{($k1): $v1}')
fi

INSERT_RES=$(curl -s -X POST "${BASE_URL}/form/data/insert" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"data\":${DATA}}")
RECORD_ID=$(echo "$INSERT_RES" | jq -r '.result.recordId')
if [ -z "$RECORD_ID" ] || [ "$RECORD_ID" = "null" ]; then
  echo "Insert failed: $INSERT_RES" >&2
  exit 1
fi

UPDATE_DATA=$(jq -nc --arg k1 "$STRING_FIELD" --arg v1 "$UPDATE_VALUE" '{($k1): $v1}')
UPDATE_RES=$(curl -s -X POST "${BASE_URL}/form/data/update" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"recordId\":\"${RECORD_ID}\",\"data\":${UPDATE_DATA}}")
UPDATE_OK=$(echo "$UPDATE_RES" | jq -r '.success')
if [ "$UPDATE_OK" != "true" ]; then
  echo "Update failed: $UPDATE_RES" >&2
  exit 1
fi

GET_RES=$(curl -s -X GET "${BASE_URL}/form/data/get?id=${RECORD_ID}" \
  -H "X-Access-Token: ${TOKEN}")
UPDATED_FIELD_VALUE=$(echo "$GET_RES" | jq -r --arg key "$STRING_FIELD" '.result.data[$key]')
if [ "$UPDATED_FIELD_VALUE" != "$UPDATE_VALUE" ]; then
  echo "Get verification failed: $GET_RES" >&2
  exit 1
fi

PAGE=$(curl -s -X GET "${BASE_URL}/form/data/page?formKey=${FORM_KEY}&pageNo=1&pageSize=10" \
  -H "X-Access-Token: ${TOKEN}")
PAGE_TOTAL=$(echo "$PAGE" | jq -r '.result.total')

FILTER=$(curl -s -X GET "${BASE_URL}/form/data/page?formKey=${FORM_KEY}&pageNo=1&pageSize=10&q_${STRING_FIELD}=${UPDATE_VALUE}" \
  -H "X-Access-Token: ${TOKEN}")
FILTER_TOTAL=$(echo "$FILTER" | jq -r '.result.total')

echo "published_version=${PUBLISHED_VERSION}"
echo "table_name=${TABLE_NAME}"
echo "inserted_record_id=${RECORD_ID}"
echo "updated_field_value=${UPDATED_FIELD_VALUE}"
echo "page_total=${PAGE_TOTAL}"
echo "filter_total=${FILTER_TOTAL}"
