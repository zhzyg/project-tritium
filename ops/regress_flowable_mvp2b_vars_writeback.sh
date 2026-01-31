#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:8080/jeecg-boot}
LOG_FILE=${LOG_FILE:-backend/jeecg-system-start.out}
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASS=${ADMIN_PASS:-Admin#2026!Reset}
CHECK_KEY_PREFIX="flowable_mvp2b"

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
  # Wait briefly for log
  sleep 1
  local captcha_line
  captcha_line=$(grep --text "checkCode =" "$LOG_FILE" | tail -n 1 || true)
  local captcha
  captcha=$(echo "$captcha_line" | sed -E 's/.*checkCode = ([A-Za-z0-9]+).*/\1/')
  
  if [ -z "$captcha" ]; then
    echo "Failed to extract captcha" >&2
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

echo "2. Preparing Form Data..."
FORM_KEY=$(mysql_exec "select form_key from form_table_meta where status=1 order by created_time desc limit 1" | tr -d '\r')
if [ -z "$FORM_KEY" ]; then
  echo "No published form found." >&2
  exit 1
fi

PUBLISHED=$(curl -s -X GET "${BASE_URL}/form/schema/latestPublished?formKey=${FORM_KEY}" \
  -H "X-Access-Token: ${ADMIN_TOKEN}")
NUM_FIELD=$(echo "$PUBLISHED" | jq -r '.result.fieldMetas[] | select(.widgetType=="number" or .widgetType=="decimal") | .fieldKey' | head -n 1)

if [ -z "$NUM_FIELD" ] || [ "$NUM_FIELD" = "null" ]; then
  echo "No numeric field found, using fallback data"
  DATA="{}"
else
  # Use a distinct amount to verify writeback
  DATA=$(jq -nc --arg k1 "$NUM_FIELD" --argjson v1 8888 '{($k1): $v1}')
fi

INSERT_RES=$(curl -s -X POST "${BASE_URL}/form/data/insert" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${ADMIN_TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"data\":${DATA}}")
RECORD_ID=$(echo "$INSERT_RES" | jq -r '.result.recordId')

if [ -z "$RECORD_ID" ] || [ "$RECORD_ID" = "null" ]; then
  echo "Insert failed: $INSERT_RES" >&2
  exit 1
fi
echo "Created Record: $RECORD_ID"

echo "3. Starting Process..."
START_RES=$(curl -s -X POST "${BASE_URL}/bpm/process/startByForm" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${ADMIN_TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"recordId\":\"${RECORD_ID}\"}")
PROCESS_INSTANCE_ID=$(echo "$START_RES" | jq -r '.result.processInstanceId')

if [ -z "$PROCESS_INSTANCE_ID" ] || [ "$PROCESS_INSTANCE_ID" = "null" ]; then
  echo "Start failed: $START_RES" >&2
  exit 1
fi
echo "Started Process: $PROCESS_INSTANCE_ID"

echo "4. Finding Task..."
# Wait for async logic if any
sleep 1
STATUS_RES=$(curl -s "${BASE_URL}/bpm/process/status?processInstanceId=${PROCESS_INSTANCE_ID}" \
  -H "X-Access-Token: ${ADMIN_TOKEN}")
TASK_ID=$(echo "$STATUS_RES" | jq -r '.result.currentTasks[0].taskId')

if [ -z "$TASK_ID" ] || [ "$TASK_ID" = "null" ]; then
  echo "Task not found: $STATUS_RES" >&2
  exit 1
fi
echo "Found Task: $TASK_ID"

echo "5. Completing Task (No Variables)..."
# We do NOT send variables. Backend should auto-fetch 'amount' and 'reason'.
COMPLETE_RES=$(curl -s -X POST "${BASE_URL}/bpm/task/complete" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${ADMIN_TOKEN}" \
  -d "{\"taskId\":\"${TASK_ID}\"}")
SUCCESS=$(echo "$COMPLETE_RES" | jq -r '.success')

if [ "$SUCCESS" != "true" ]; then
  echo "Complete failed: $COMPLETE_RES" >&2
  exit 1
fi
echo "Task Completed."

echo "6. Verifying Writeback..."
VARS_RES=$(curl -s -X POST "${BASE_URL}/bpm/process/vars" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${ADMIN_TOKEN}" \
  -d "{\"processInstanceId\":\"${PROCESS_INSTANCE_ID}\"}")

# We check if our numeric field (amount) is in the variables
# Or if we hardcoded 'reason' in data
VARS_JSON=$(echo "$VARS_RES" | jq '.result')
echo "Variables: $VARS_JSON"

# Check if 'amount' is present and matches (we only sent amount)
if echo "$VARS_JSON" | grep -q "8888"; then
  echo "PASS: Found value 8888 in variables."
else
  echo "FAIL: Variables do not contain expected data (8888)."
  exit 1
fi

exit 0
