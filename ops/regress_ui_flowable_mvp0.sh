#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-${AI_GUARD_BASE_URL:-http://127.0.0.1:8080/jeecg-boot}}"
LOG_FILE="${LOG_FILE:-backend/jeecg-system-start.out}"
ADMIN_USER="${ADMIN_USER:-${AI_GUARD_ADMIN_USER:-admin}}"
ADMIN_PASS="${ADMIN_PASS:-${AI_GUARD_ADMIN_PASS:-}}"
PROCESS_KEY="${PROCESS_KEY:-TRITIUM_APPROVAL_V1}"
CHECK_KEY_PREFIX="ui_flowable_mvp0"

MYSQL_CONTAINER="${MYSQL_CONTAINER:-tritium-mysql}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASS="${MYSQL_PASS:-Tritium_Dev_Root_Pass_ChangeMe!}"
MYSQL_DB="${MYSQL_DB:-tritium}"
PATCH_VAR_MAP="${PATCH_VAR_MAP:-backend/db/patches/20260130_tr_proc_var_map_mvp1.sql}"
PATCH_LINK="${PATCH_LINK:-backend/db/patches/20260130_tr_proc_instance_link_mvp2.sql}"
PATCH_REGISTRY="${PATCH_REGISTRY:-backend/db/patches/20260130_tr_proc_registry_bind_mvp4.sql}"

if [ -z "${ADMIN_PASS}" ]; then
  echo "ADMIN_PASS not set. Export ADMIN_PASS (or AI_GUARD_ADMIN_PASS) before running." >&2
  exit 1
fi

if [ ! -f "$LOG_FILE" ]; then
  echo "Log file not found: $LOG_FILE" >&2
  exit 1
fi

if [ ! -f "$PATCH_VAR_MAP" ] || [ ! -f "$PATCH_LINK" ] || [ ! -f "$PATCH_REGISTRY" ]; then
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

get_token() {
  local username="$1"
  local password="$2"
  local check_key="${CHECK_KEY_PREFIX}_${RANDOM}"
  curl -s "${BASE_URL}/sys/randomImage/${check_key}" > /dev/null
  local captcha_line
  captcha_line=$(rg --text "checkCode =" "$LOG_FILE" | tail -n 1 || true)
  local captcha
  captcha=$(echo "$captcha_line" | sed -E 's/.*checkCode = ([A-Za-z0-9]+).*/\1/')
  if [ -z "$captcha" ] || [ "$captcha" = "$captcha_line" ]; then
    echo "Failed to extract captcha from logs" >&2
    exit 1
  fi
  local login_res
  login_res=$(curl -s -X POST "${BASE_URL}/sys/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${username}\",\"password\":\"${password}\",\"captcha\":\"${captcha}\",\"checkKey\":\"${check_key}\"}")
  echo "$login_res" | jq -r '.result.token'
}

ADMIN_TOKEN=$(get_token "$ADMIN_USER" "$ADMIN_PASS")
if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  echo "Admin login failed" >&2
  exit 1
fi

mysql_exec_file "$PATCH_VAR_MAP"
mysql_exec_file "$PATCH_LINK"
mysql_exec_file "$PATCH_REGISTRY"

FORM_KEY=$(mysql_exec "select form_key from form_table_meta where status=1 order by created_time desc limit 1" | tr -d '\r')
if [ -z "$FORM_KEY" ]; then
  echo "No published formKey found" >&2
  exit 1
fi

PUBLISHED=$(curl -s -X GET "${BASE_URL}/form/schema/latestPublished?formKey=${FORM_KEY}" \
  -H "X-Access-Token: ${ADMIN_TOKEN}")
NUM_FIELD=$(echo "$PUBLISHED" | jq -r '.result.fieldMetas[] | select(.widgetType=="number" or .widgetType=="decimal") | .fieldKey' | head -n 1)
if [ -z "$NUM_FIELD" ] || [ "$NUM_FIELD" = "null" ]; then
  echo "No numeric field found in published schema for ${FORM_KEY}" >&2
  exit 1
fi

mysql_exec "set @id = replace(uuid(),'-',''); insert into tr_proc_var_map (id, form_key, field_key, var_name, value_type, enabled, created_time, created_by)
values (@id, '${FORM_KEY}', '${NUM_FIELD}', 'amount', 'number', 1, now(), '${ADMIN_USER}')
ON DUPLICATE KEY UPDATE var_name=values(var_name), value_type=values(value_type), enabled=1;" >/dev/null

REG_RES=$(curl -s -X POST "${BASE_URL}/bpm/defs/register" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${ADMIN_TOKEN}" \
  -d "{\"processKey\":\"${PROCESS_KEY}\",\"name\":\"Approval V1\",\"enabled\":1}")
REG_OK=$(echo "$REG_RES" | jq -r '.success')
if [ "$REG_OK" != "true" ]; then
  echo "Process register failed: $REG_RES" >&2
  exit 1
fi

BIND_RES=$(curl -s -X POST "${BASE_URL}/bpm/bind/setDefault" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${ADMIN_TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"processKey\":\"${PROCESS_KEY}\"}")
BIND_OK=$(echo "$BIND_RES" | jq -r '.success')
if [ "$BIND_OK" != "true" ]; then
  echo "Bind default failed: $BIND_RES" >&2
  exit 1
fi

DATA=$(jq -nc --arg k1 "$NUM_FIELD" --argjson v1 20001 '{($k1): $v1}')
INSERT_RES=$(curl -s -X POST "${BASE_URL}/form/data/insert" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${ADMIN_TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"data\":${DATA}}")
RECORD_ID=$(echo "$INSERT_RES" | jq -r '.result.recordId')
if [ -z "$RECORD_ID" ] || [ "$RECORD_ID" = "null" ]; then
  echo "Insert failed: $INSERT_RES" >&2
  exit 1
fi

START_RES=$(curl -s -X POST "${BASE_URL}/bpm/process/startByForm" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${ADMIN_TOKEN}" \
  -d "{\"formKey\":\"${FORM_KEY}\",\"recordId\":\"${RECORD_ID}\"}")
PROCESS_INSTANCE_ID=$(echo "$START_RES" | jq -r '.result.processInstanceId')
USED_PROCESS_KEY=$(echo "$START_RES" | jq -r '.result.processKey')
if [ -z "$PROCESS_INSTANCE_ID" ] || [ "$PROCESS_INSTANCE_ID" = "null" ]; then
  echo "Process startByForm failed: $START_RES" >&2
  exit 1
fi

STATUS_RES=$(curl -s "${BASE_URL}/bpm/process/status?processInstanceId=${PROCESS_INSTANCE_ID}" \
  -H "X-Access-Token: ${ADMIN_TOKEN}")
ENDED=$(echo "$STATUS_RES" | jq -r '.result.ended')

echo "form_key=${FORM_KEY}"
echo "bound_process_key=${USED_PROCESS_KEY}"
echo "record_id=${RECORD_ID}"
echo "process_instance_id=${PROCESS_INSTANCE_ID}"
echo "ended=${ENDED}"
