#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:8080/jeecg-boot}
LOG_FILE=${LOG_FILE:-backend/jeecg-system-start.out}
USERNAME=${USERNAME:-admin}
PASSWORD=${PASSWORD:-}
USER_ID=${USER_ID:-admin}
PROCESS_KEY=${PROCESS_KEY:-TRITIUM_APPROVAL_V1}
CHECK_KEY="flowable_mvp2_${RANDOM}"

MYSQL_CONTAINER=${MYSQL_CONTAINER:-tritium-mysql}
MYSQL_USER=${MYSQL_USER:-root}
MYSQL_PASS=${MYSQL_PASS:-Tritium_Dev_Root_Pass_ChangeMe!}
MYSQL_DB=${MYSQL_DB:-tritium}
PATCH_VAR_MAP=${PATCH_VAR_MAP:-backend/db/patches/20260130_tr_proc_var_map_mvp1.sql}
PATCH_LINK=${PATCH_LINK:-backend/db/patches/20260130_tr_proc_instance_link_mvp2.sql}

if [ -z "$PASSWORD" ]; then
  echo "PASSWORD is required (export PASSWORD=...)" >&2
  exit 1
fi

if [ ! -f "$LOG_FILE" ]; then
  echo "Log file not found: $LOG_FILE" >&2
  exit 1
fi

if [ ! -f "$PATCH_VAR_MAP" ] || [ ! -f "$PATCH_LINK" ]; then
  echo "Patch file missing" >&2
  exit 1
fi

use_docker_mysql() {
  command -v docker >/dev/null 2>&1 && docker ps --format "{{.Names}}" | rg -n "^${MYSQL_CONTAINER}$" >/dev/null 2>&1
}

mysql_exec() {
  local sql="$1"
  if use_docker_mysql; then
    docker exec -i "$MYSQL_CONTAINER" mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -Nse "$sql" "$MYSQL_DB"
  else
    if ! command -v mysql >/dev/null 2>&1; then
      echo "mysql client not found" >&2
      exit 1
    fi
    MYSQL_HOST=${MYSQL_HOST:-127.0.0.1}
    MYSQL_PORT=${MYSQL_PORT:-13306}
    MYSQL_PWD="$MYSQL_PASS" mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" -Nse "$sql" "$MYSQL_DB"
  fi
}

mysql_exec_file() {
  local file="$1"
  if use_docker_mysql; then
    docker exec -i "$MYSQL_CONTAINER" mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" < "$file" >/dev/null
  else
    MYSQL_HOST=${MYSQL_HOST:-127.0.0.1}
    MYSQL_PORT=${MYSQL_PORT:-13306}
    MYSQL_PWD="$MYSQL_PASS" mysql -h"$MYSQL_HOST" -P"$MYSQL_PORT" -u"$MYSQL_USER" "$MYSQL_DB" < "$file" >/dev/null
  fi
}

# apply patches
mysql_exec_file "$PATCH_VAR_MAP"
mysql_exec_file "$PATCH_LINK"

# pick a published formKey
FORM_KEY=$(mysql_exec "select form_key from form_table_meta where status=1 order by created_time desc limit 1" | tail -n 1 | tr -d '\r')
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

NUM_FIELD=$(echo "$PUBLISHED" | jq -r '.result.fieldMetas[] | select(.widgetType=="number" or .widgetType=="decimal") | .fieldKey' | head -n 1)
if [ -z "$NUM_FIELD" ] || [ "$NUM_FIELD" = "null" ]; then
  echo "No numeric field found in published schema for ${FORM_KEY}" >&2
  exit 1
fi

# ensure mapping to amount
mysql_exec "set @id = replace(uuid(),'-',''); insert into tr_proc_var_map (id, form_key, field_key, var_name, value_type, enabled, created_time, created_by) values (@id, '${FORM_KEY}', '${NUM_FIELD}', 'amount', 'number', 1, now(), '${USERNAME}') on duplicate key update var_name=values(var_name), value_type=values(value_type), enabled=1;" >/dev/null

run_branch() {
  local label="$1"
  local amount_value="$2"

  DATA=$(jq -nc --arg k1 "$NUM_FIELD" --argjson v1 "$amount_value" '{($k1): $v1}')
  INSERT_RES=$(curl -s -X POST "${BASE_URL}/form/data/insert" \
    -H "Content-Type: application/json" \
    -H "X-Access-Token: ${TOKEN}" \
    -d "{\"formKey\":\"${FORM_KEY}\",\"data\":${DATA}}")
  RECORD_ID=$(echo "$INSERT_RES" | jq -r '.result.recordId')
  if [ -z "$RECORD_ID" ] || [ "$RECORD_ID" = "null" ]; then
    echo "Insert failed: $INSERT_RES" >&2
    exit 1
  fi

  START_RES=$(curl -s -X POST "${BASE_URL}/bpm/process/start" \
    -H "Content-Type: application/json" \
    -H "X-Access-Token: ${TOKEN}" \
    -d "{\"processKey\":\"${PROCESS_KEY}\",\"formKey\":\"${FORM_KEY}\",\"recordId\":\"${RECORD_ID}\",\"assignee\":\"${USER_ID}\"}")
  PROCESS_INSTANCE_ID=$(echo "$START_RES" | jq -r '.result.processInstanceId')
  if [ -z "$PROCESS_INSTANCE_ID" ] || [ "$PROCESS_INSTANCE_ID" = "null" ]; then
    echo "Process start failed: $START_RES" >&2
    exit 1
  fi

  STATUS_APPLY=$(curl -s "${BASE_URL}/bpm/process/status?processInstanceId=${PROCESS_INSTANCE_ID}" \
    -H "X-Access-Token: ${TOKEN}")
  APPLY_TASK_ID=$(echo "$STATUS_APPLY" | jq -r '.result.currentTasks[0].taskId')
  if [ -z "$APPLY_TASK_ID" ] || [ "$APPLY_TASK_ID" = "null" ]; then
    echo "Apply task not found: $STATUS_APPLY" >&2
    exit 1
  fi

  COMPLETE_APPLY=$(curl -s -X POST "${BASE_URL}/bpm/task/complete" \
    -H "Content-Type: application/json" \
    -H "X-Access-Token: ${TOKEN}" \
    -d "{\"taskId\":\"${APPLY_TASK_ID}\"}")
  APPLY_OK=$(echo "$COMPLETE_APPLY" | jq -r '.success')
  if [ "$APPLY_OK" != "true" ]; then
    echo "Apply task complete failed: $COMPLETE_APPLY" >&2
    exit 1
  fi

  STATUS_NEXT=$(curl -s "${BASE_URL}/bpm/process/status?processInstanceId=${PROCESS_INSTANCE_ID}" \
    -H "X-Access-Token: ${TOKEN}")
  NEXT_TASK_ID=$(echo "$STATUS_NEXT" | jq -r '.result.currentTasks[0].taskId')
  NEXT_TASK_NAME=$(echo "$STATUS_NEXT" | jq -r '.result.currentTasks[0].name')
  NEXT_GROUP=$(echo "$STATUS_NEXT" | jq -r '.result.currentTasks[0].candidateGroups[0]')
  if [ -z "$NEXT_TASK_ID" ] || [ "$NEXT_TASK_ID" = "null" ]; then
    echo "Next task not found: $STATUS_NEXT" >&2
    exit 1
  fi
  if [ -z "$NEXT_GROUP" ] || [ "$NEXT_GROUP" = "null" ]; then
    echo "Next task candidate group missing: $STATUS_NEXT" >&2
    exit 1
  fi

  CLAIM_RES=$(curl -s -X POST "${BASE_URL}/bpm/task/claim" \
    -H "Content-Type: application/json" \
    -H "X-Access-Token: ${TOKEN}" \
    -d "{\"taskId\":\"${NEXT_TASK_ID}\",\"userId\":\"${USER_ID}\"}")
  CLAIM_OK=$(echo "$CLAIM_RES" | jq -r '.success')
  if [ "$CLAIM_OK" != "true" ]; then
    echo "Task claim failed: $CLAIM_RES" >&2
    exit 1
  fi

  COMPLETE_NEXT=$(curl -s -X POST "${BASE_URL}/bpm/task/complete" \
    -H "Content-Type: application/json" \
    -H "X-Access-Token: ${TOKEN}" \
    -d "{\"taskId\":\"${NEXT_TASK_ID}\"}")
  NEXT_OK=$(echo "$COMPLETE_NEXT" | jq -r '.success')
  if [ "$NEXT_OK" != "true" ]; then
    echo "Task complete failed: $COMPLETE_NEXT" >&2
    exit 1
  fi

  STATUS_END=$(curl -s "${BASE_URL}/bpm/process/status?processInstanceId=${PROCESS_INSTANCE_ID}" \
    -H "X-Access-Token: ${TOKEN}")
  ENDED=$(echo "$STATUS_END" | jq -r '.result.ended')
  if [ "$ENDED" != "true" ]; then
    echo "Process not ended: $STATUS_END" >&2
    exit 1
  fi

  LINK_ROW=$(mysql_exec "select record_id, process_instance_id from tr_proc_instance_link where record_id='${RECORD_ID}'" | tail -n 1 | tr -d '\r')
  LINK_RECORD=$(echo "$LINK_ROW" | awk '{print $1}')
  LINK_PROC=$(echo "$LINK_ROW" | awk '{print $2}')
  if [ -z "$LINK_RECORD" ] || [ -z "$LINK_PROC" ]; then
    echo "Link row missing for record ${RECORD_ID}" >&2
    exit 1
  fi

  echo "branch=${label}"
  echo "record_id=${RECORD_ID}"
  echo "process_instance_id=${PROCESS_INSTANCE_ID}"
  echo "next_task_name=${NEXT_TASK_NAME}"
  echo "next_task_candidate_group=${NEXT_GROUP}"
  echo "claimed_by=${USER_ID}"
  echo "ended=${ENDED}"
  echo "link_record_id=${LINK_RECORD}"
  echo "link_process_instance_id=${LINK_PROC}"
}

run_branch "A_amount_20001" 20001
run_branch "B_amount_99" 99
