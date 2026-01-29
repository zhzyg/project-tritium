#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:8080/jeecg-boot}
LOG_FILE=${LOG_FILE:-backend/jeecg-system-start.out}
FORM_KEY=${FORM_KEY:-dev}
USERNAME=${USERNAME:-admin}
PASSWORD=${PASSWORD:-123456}
MYSQL_CONTAINER=${MYSQL_CONTAINER:-tritium-mysql}
MYSQL_USER=${MYSQL_USER:-root}
MYSQL_PASS=${MYSQL_PASS:-Tritium_Dev_Root_Pass_ChangeMe!}
MYSQL_DB=${MYSQL_DB:-tritium}
CHECK_KEY="form_ddl_${RANDOM}"

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

SCHEMA1='{"widgetList":[{"type":"input","formItemFlag":true,"options":{"name":"field1","label":"Field 1","type":"text","required":false}},{"type":"number","formItemFlag":true,"options":{"name":"amount","label":"Amount","required":false}}],"formConfig":{}}'
SCHEMA1_ESCAPED=$(printf '%s' "$SCHEMA1" | jq -Rs .)
SAVE1=$(curl -s -X POST "${BASE_URL}/form/schema/save" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"schemaJson\":${SCHEMA1_ESCAPED}}")
VERSION1=$(echo "$SAVE1" | jq -r '.result.version')
if [ -z "$VERSION1" ] || [ "$VERSION1" = "null" ]; then
  echo "Schema save failed: $SAVE1" >&2
  exit 1
fi

PUBLISH1=$(curl -s -X POST "${BASE_URL}/form/schema/publish" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\"}")
TABLE_NAME=$(echo "$PUBLISH1" | jq -r '.result.tableName')
DDL_COUNT1=$(echo "$PUBLISH1" | jq -r '.result.ddlApplied | length')
if [ -z "$TABLE_NAME" ] || [ "$TABLE_NAME" = "null" ]; then
  echo "Publish failed: $PUBLISH1" >&2
  exit 1
fi
if [ "$DDL_COUNT1" -lt 1 ]; then
  echo "Publish ddlApplied empty: $PUBLISH1" >&2
  exit 1
fi

TABLE_EXISTS=$(docker exec -i "$MYSQL_CONTAINER" mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -Nse "select count(*) from information_schema.tables where table_schema='${MYSQL_DB}' and table_name='${TABLE_NAME}'")
if [ "$TABLE_EXISTS" -lt 1 ]; then
  echo "Table not found: ${TABLE_NAME}" >&2
  exit 1
fi

DATA1=$(jq -nc '{field1:"alpha", amount:1}')
DATA1_ESCAPED=$(printf '%s' "$DATA1" | jq -Rs .)
SUBMIT1=$(curl -s -X POST "${BASE_URL}/form/data/submit" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"dataJson\":${DATA1_ESCAPED}}")
RECORD1=$(echo "$SUBMIT1" | jq -r '.result.recordId')
if [ -z "$RECORD1" ] || [ "$RECORD1" = "null" ]; then
  echo "Submit failed: $SUBMIT1" >&2
  exit 1
fi

RECORD_COUNT1=$(docker exec -i "$MYSQL_CONTAINER" mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -Nse "select count(*) from ${MYSQL_DB}.${TABLE_NAME} where record_id='${RECORD1}'")
if [ "$RECORD_COUNT1" -lt 1 ]; then
  echo "Physical record insert failed for ${RECORD1}" >&2
  exit 1
fi

SCHEMA2='{"widgetList":[{"type":"input","formItemFlag":true,"options":{"name":"field1","label":"Field 1","type":"text","required":false}},{"type":"number","formItemFlag":true,"options":{"name":"amount","label":"Amount","required":false}},{"type":"textarea","formItemFlag":true,"options":{"name":"notes","label":"Notes","required":false}}],"formConfig":{}}'
SCHEMA2_ESCAPED=$(printf '%s' "$SCHEMA2" | jq -Rs .)
SAVE2=$(curl -s -X POST "${BASE_URL}/form/schema/save" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"schemaJson\":${SCHEMA2_ESCAPED}}")
VERSION2=$(echo "$SAVE2" | jq -r '.result.version')
if [ -z "$VERSION2" ] || [ "$VERSION2" = "null" ]; then
  echo "Schema save (v2) failed: $SAVE2" >&2
  exit 1
fi

PUBLISH2=$(curl -s -X POST "${BASE_URL}/form/schema/publish" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\"}")
DDL_COUNT2=$(echo "$PUBLISH2" | jq -r '.result.ddlApplied | length')
if [ "$DDL_COUNT2" -lt 1 ]; then
  echo "Publish ddlApplied empty (v2): $PUBLISH2" >&2
  exit 1
fi

COL_EXISTS=$(docker exec -i "$MYSQL_CONTAINER" mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -Nse "select count(*) from information_schema.columns where table_schema='${MYSQL_DB}' and table_name='${TABLE_NAME}' and column_name='notes'")
if [ "$COL_EXISTS" -lt 1 ]; then
  echo "Expected column notes not found in ${TABLE_NAME}" >&2
  exit 1
fi

DATA2=$(jq -nc '{field1:"beta", amount:2, notes:"hello"}')
DATA2_ESCAPED=$(printf '%s' "$DATA2" | jq -Rs .)
SUBMIT2=$(curl -s -X POST "${BASE_URL}/form/data/submit" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"dataJson\":${DATA2_ESCAPED}}")
RECORD2=$(echo "$SUBMIT2" | jq -r '.result.recordId')
if [ -z "$RECORD2" ] || [ "$RECORD2" = "null" ]; then
  echo "Submit failed (v2): $SUBMIT2" >&2
  exit 1
fi

NOTES_VAL=$(docker exec -i "$MYSQL_CONTAINER" mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -Nse "select notes from ${MYSQL_DB}.${TABLE_NAME} where record_id='${RECORD2}' limit 1")
if [ -z "$NOTES_VAL" ]; then
  echo "Notes column missing or empty for record ${RECORD2}" >&2
  exit 1
fi

echo "latest_version=${VERSION2}"
echo "table_name=${TABLE_NAME}"
echo "record_id=${RECORD2}"
echo "ddl_applied=${DDL_COUNT2}"
