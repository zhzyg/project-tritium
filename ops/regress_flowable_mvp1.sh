#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:8080/jeecg-boot}
LOG_FILE=${LOG_FILE:-backend/jeecg-system-start.out}
USERNAME=${USERNAME:-admin}
PASSWORD=${PASSWORD:-}
ASSIGNEE=${ASSIGNEE:-admin}
PROCESS_KEY=${PROCESS_KEY:-TRITIUM_DEMO_V0}
CHECK_KEY="flowable_mvp1_${RANDOM}"

MYSQL_CONTAINER=${MYSQL_CONTAINER:-tritium-mysql}
MYSQL_USER=${MYSQL_USER:-root}
MYSQL_PASS=${MYSQL_PASS:-Tritium_Dev_Root_Pass_ChangeMe!}
MYSQL_DB=${MYSQL_DB:-tritium}
PATCH_FILE=${PATCH_FILE:-backend/db/patches/20260130_tr_proc_var_map_mvp1.sql}

if [ -z "$PASSWORD" ]; then
  echo "PASSWORD is required (export PASSWORD=...)" >&2
  exit 1
fi

if [ ! -f "$LOG_FILE" ]; then
  echo "Log file not found: $LOG_FILE" >&2
  exit 1
fi

if [ ! -f "$PATCH_FILE" ]; then
  echo "Patch file not found: $PATCH_FILE" >&2
  exit 1
fi

# apply patch (prefer docker)
if command -v docker >/dev/null 2>&1 && docker ps --format "{{.Names}}" | rg -n "^${MYSQL_CONTAINER}$" >/dev/null 2>&1; then
  docker exec -i "$MYSQL_CONTAINER" mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" < "$PATCH_FILE" >/dev/null
else
  if ! command -v mysql >/dev/null 2>&1; then
    echo "mysql client not found" >&2
    exit 1
  fi
  MYSQL_HOST=${MYSQL_HOST:-127.0.0.1}
  MYSQL_PORT=${MYSQL_PORT:-13306}
  MYSQL_PWD="$MYSQL_PASS" mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" "$MYSQL_DB" < "$PATCH_FILE" >/dev/null
fi

# pick a published formKey
FORM_KEY=$(docker exec -i "$MYSQL_CONTAINER" mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -Nse "select form_key from form_table_meta where status=1 order by created_time desc limit 1" "$MYSQL_DB" 2>/dev/null || true)
if [ -z "$FORM_KEY" ]; then
  echo "No published formKey found" >&2
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

PUBLISHED=$(curl -s -X GET "${BASE_URL}/form/schema/latestPublished?formKey=${FORM_KEY}" \
  -H "X-Access-Token: ${TOKEN}")
PUBLISHED_VERSION=$(echo "$PUBLISHED" | jq -r '.result.version')
if [ -z "$PUBLISHED_VERSION" ] || [ "$PUBLISHED_VERSION" = "null" ]; then
  echo "Latest published not found: $PUBLISHED" >&2
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

VAL1="mvp1-alpha-${RANDOM}"
VAL2="mvp1-beta-${RANDOM}"
VAL3="mvp1-gamma-${RANDOM}"

DATA1=$(jq -nc --arg k1 "$STRING_FIELD" --arg v1 "$VAL1" '{($k1): $v1}')
INSERT_RES=$(curl -s -X POST "${BASE_URL}/form/data/insert" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"data\":${DATA1}}")
RECORD_ID=$(echo "$INSERT_RES" | jq -r '.result.recordId')
if [ -z "$RECORD_ID" ] || [ "$RECORD_ID" = "null" ]; then
  echo "Insert failed: $INSERT_RES" >&2
  exit 1
fi

START_RES=$(curl -s -X POST "${BASE_URL}/bpm/process/start" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"processKey\":\"${PROCESS_KEY}\",\"formKey\":\"${FORM_KEY}\",\"recordId\":\"${RECORD_ID}\",\"assignee\":\"${ASSIGNEE}\"}")
PROCESS_INSTANCE_ID=$(echo "$START_RES" | jq -r '.result.processInstanceId')
if [ -z "$PROCESS_INSTANCE_ID" ] || [ "$PROCESS_INSTANCE_ID" = "null" ]; then
  echo "Process start failed: $START_RES" >&2
  exit 1
fi

TASKS_BEFORE_RES=$(curl -s -X POST "${BASE_URL}/bpm/task/my" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"assignee\":\"${ASSIGNEE}\"}")
TASKS_BEFORE=$(echo "$TASKS_BEFORE_RES" | jq -r '.result | length')
TASK_ID=$(echo "$TASKS_BEFORE_RES" | jq -r '.result[0].taskId')
if [ -z "$TASK_ID" ] || [ "$TASK_ID" = "null" ]; then
  echo "Task query failed: $TASKS_BEFORE_RES" >&2
  exit 1
fi

VARS_BEFORE_RES=$(curl -s -X POST "${BASE_URL}/bpm/process/vars" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"processInstanceId\":\"${PROCESS_INSTANCE_ID}\"}")
VAR_BEFORE=$(echo "$VARS_BEFORE_RES" | jq -r --arg key "$STRING_FIELD" '.result[$key]')

PATCH2=$(jq -nc --arg k1 "$STRING_FIELD" --arg v1 "$VAL2" '{($k1): $v1}')
UPDATE_RES=$(curl -s -X POST "${BASE_URL}/form/data/update" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"recordId\":\"${RECORD_ID}\",\"data\":${PATCH2}}")
UPDATE_OK=$(echo "$UPDATE_RES" | jq -r '.success')
if [ "$UPDATE_OK" != "true" ]; then
  echo "Record update failed: $UPDATE_RES" >&2
  exit 1
fi

PATCH3=$(jq -nc --arg k1 "$STRING_FIELD" --arg v1 "$VAL3" '{($k1): $v1}')
COMPLETE_RES=$(curl -s -X POST "${BASE_URL}/bpm/task/complete" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"taskId\":\"${TASK_ID}\",\"assignee\":\"${ASSIGNEE}\",\"formKey\":\"${FORM_KEY}\",\"recordId\":\"${RECORD_ID}\",\"patchData\":${PATCH3}}")
COMPLETE_OK=$(echo "$COMPLETE_RES" | jq -r '.success')
if [ "$COMPLETE_OK" != "true" ]; then
  echo "Task complete failed: $COMPLETE_RES" >&2
  exit 1
fi

VARS_AFTER_RES=$(curl -s -X POST "${BASE_URL}/bpm/process/vars" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"processInstanceId\":\"${PROCESS_INSTANCE_ID}\"}")
VAR_AFTER=$(echo "$VARS_AFTER_RES" | jq -r --arg key "$STRING_FIELD" '.result[$key]')

TASKS_AFTER_RES=$(curl -s -X POST "${BASE_URL}/bpm/task/my" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"assignee\":\"${ASSIGNEE}\"}")
TASKS_AFTER=$(echo "$TASKS_AFTER_RES" | jq -r '.result | length')

if [ "$TASKS_AFTER" -ne 0 ]; then
  echo "Task not completed: after=$TASKS_AFTER" >&2
  exit 1
fi

echo "published_version=${PUBLISHED_VERSION}"
echo "record_id=${RECORD_ID}"
echo "process_instance_id=${PROCESS_INSTANCE_ID}"
echo "task_id=${TASK_ID}"
echo "var_before_${STRING_FIELD}=${VAR_BEFORE}"
echo "var_after_${STRING_FIELD}=${VAR_AFTER}"
echo "tasks_after=${TASKS_AFTER}"
