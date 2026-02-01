#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:8080/jeecg-boot}
LOG_FILE=${LOG_FILE:-backend/jeecg-system-start.out}
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASS=${ADMIN_PASS:-Admin#2026!Reset}
CHECK_KEY_PREFIX="flowable_mvp3"

MYSQL_CONTAINER=${MYSQL_CONTAINER:-tritium-mysql}
MYSQL_USER=${MYSQL_USER:-root}
MYSQL_PASS=${MYSQL_PASS:-Tritium_Dev_Root_Pass_ChangeMe!}
MYSQL_DB=${MYSQL_DB:-tritium}

use_docker_mysql() {
  command -v docker >/dev/null 2>&1 && docker ps --format "{{.Names}}" | grep -q "^${MYSQL_CONTAINER}$"
}

mysql_exec() {
  local sql="$1"
  if use_docker_mysql; then
    docker exec -i "$MYSQL_CONTAINER" mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -Nse "$sql" "$MYSQL_DB"
  else
    mysql -h127.0.0.1 -P13306 -u"$MYSQL_USER" -p"$MYSQL_PASS" -Nse "$sql" "$MYSQL_DB"
  fi
}

get_token() {
  local username="$1"
  local password="$2"
  local check_key="${CHECK_KEY_PREFIX}_${RANDOM}"
  curl -s "${BASE_URL}/sys/randomImage/${check_key}" > /dev/null
  sleep 3
  local captcha_line
  captcha_line=$(journalctl -u tritium-backend.service -n 50 --no-pager | grep --text "checkCode =" | tail -n 1 || true)
  local captcha
  captcha=$(echo "$captcha_line" | sed -E 's/.*checkCode = ([A-Za-z0-9]+).*/\1/')
  
  if [ -z "$captcha" ]; then
    echo "Failed to extract captcha from journal" >&2
    return
  fi
  
  local login_res
  login_res=$(curl -s -X POST "${BASE_URL}/sys/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${username}\",\"password\":\"${password}\",\"captcha\":\"${captcha}\",\"checkKey\":\"${check_key}\"}")
  echo "$login_res" | jq -r '.result.token'
}

echo "1. Logging in..."
ADMIN_TOKEN=$(get_token "$ADMIN_USER" "$ADMIN_PASS")
if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  echo "Login failed" >&2
  exit 1
fi
echo "Token acquired."

FORM_KEY=$(mysql_exec "select form_key from form_table_meta where status=1 order by created_time desc limit 1" | tr -d '\r')
if [ -z "$FORM_KEY" ]; then
  echo "No published form found." >&2
  exit 1
fi
PUBLISHED=$(curl -s -X GET "${BASE_URL}/form/schema/latestPublished?formKey=${FORM_KEY}" \
  -H "X-Access-Token: ${ADMIN_TOKEN}")
NUM_FIELD=$(echo "$PUBLISHED" | jq -r '.result.fieldMetas[] | select(.widgetType=="number" or .widgetType=="decimal") | .fieldKey' | head -n 1)

DATA=$(jq -nc --arg k1 "$NUM_FIELD" --argjson v1 1234 '{($k1): $v1}')

INSERT_RES=$(curl -s -X POST "${BASE_URL}/form/data/insert" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${ADMIN_TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"data\":${DATA}}")
RECORD_ID=$(echo "$INSERT_RES" | jq -r '.result.recordId')

if [ -z "$RECORD_ID" ] || [ "$RECORD_ID" = "null" ]; then
  echo "Insert failed" >&2
  exit 1
fi

START_RES=$(curl -s -X POST "${BASE_URL}/bpm/process/startByForm" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${ADMIN_TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"recordId\":\"${RECORD_ID}\"}")
PROCESS_INSTANCE_ID=$(echo "$START_RES" | jq -r '.result.processInstanceId')

if [ -z "$PROCESS_INSTANCE_ID" ] || [ "$PROCESS_INSTANCE_ID" = "null" ]; then
  echo "Start failed" >&2
  exit 1
fi

sleep 1
STATUS_RES=$(curl -s "${BASE_URL}/bpm/process/status?processInstanceId=${PROCESS_INSTANCE_ID}" \
  -H "X-Access-Token: ${ADMIN_TOKEN}")
TASK_ID=$(echo "$STATUS_RES" | jq -r '.result.currentTasks[0].taskId')

if [ -z "$TASK_ID" ] || [ "$TASK_ID" = "null" ]; then
  echo "Task not found" >&2
  exit 1
fi

echo "Completing Task (Approve)..."
VARS="{\"status\":\"APPROVED\", \"reason\":\"mvp3_trace\"}"
COMPLETE_RES=$(curl -s -X POST "${BASE_URL}/bpm/task/complete" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${ADMIN_TOKEN}" \
  -d "{\"taskId\":\"${TASK_ID}\", \"variables\": $VARS}")
SUCCESS=$(echo "$COMPLETE_RES" | jq -r '.success')

if [ "$SUCCESS" != "true" ]; then
  echo "Complete failed: $COMPLETE_RES" >&2
  exit 1
fi

echo "Checking Trace..."
TRACE_RES=$(curl -s "${BASE_URL}/bpm/process/trace?procInstId=${PROCESS_INSTANCE_ID}" \
  -H "X-Access-Token: ${ADMIN_TOKEN}")
TRACE_JSON=$(echo "$TRACE_RES" | jq '.result')
echo "Trace: $TRACE_JSON"

if echo "$TRACE_JSON" | grep -q "STARTEVENT"; then
  echo "PASS: Found START_EVENT"
else
  echo "FAIL: START_EVENT not found"
  exit 1
fi

if echo "$TRACE_JSON" | grep -q "USERTASK"; then
  echo "PASS: Found USERTASK"
else
  echo "FAIL: USERTASK not found"
  exit 1
fi

if echo "$TRACE_JSON" | grep -q "ENDEVENT"; then
  echo "PASS: Found ENDEVENT"
else
  echo "INFO: ENDEVENT not found (Process likely still active, which is expected)"
fi

echo "SUCCESS: MVP-3 Trace verified."
exit 0
