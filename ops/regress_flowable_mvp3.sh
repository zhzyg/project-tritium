#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:8080/jeecg-boot}
LOG_FILE=${LOG_FILE:-backend/jeecg-system-start.out}
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASS=${ADMIN_PASS:-Admin#2026!Reset}
TEST_PASS=${TEST_PASS:-Admin#2026!Reset}
PROCESS_KEY=${PROCESS_KEY:-TRITIUM_APPROVAL_V1}
CHECK_KEY_PREFIX="flowable_mvp3"

MANAGER_USER=${MANAGER_USER:-u_manager}
FINANCE_USER=${FINANCE_USER:-u_finance}

MYSQL_CONTAINER=${MYSQL_CONTAINER:-tritium-mysql}
MYSQL_USER=${MYSQL_USER:-root}
MYSQL_PASS=${MYSQL_PASS:-Tritium_Dev_Root_Pass_ChangeMe!}
MYSQL_DB=${MYSQL_DB:-tritium}
PATCH_VAR_MAP=${PATCH_VAR_MAP:-backend/db/patches/20260130_tr_proc_var_map_mvp1.sql}
PATCH_LINK=${PATCH_LINK:-backend/db/patches/20260130_tr_proc_instance_link_mvp2.sql}

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

# apply patches
mysql_exec_file "$PATCH_VAR_MAP"
mysql_exec_file "$PATCH_LINK"

# ensure roles
mysql_exec "insert into sys_role (id, role_name, role_code, description, create_time, create_by)
select replace(uuid(),'-',''), 'Manager', 'MANAGER', 'flowable-mvp3', now(), '${ADMIN_USER}'
from dual where not exists (select 1 from sys_role where role_code='MANAGER');" >/dev/null
mysql_exec "insert into sys_role (id, role_name, role_code, description, create_time, create_by)
select replace(uuid(),'-',''), 'Finance', 'FINANCE', 'flowable-mvp3', now(), '${ADMIN_USER}'
from dual where not exists (select 1 from sys_role where role_code='FINANCE');" >/dev/null

ROLE_MANAGER_ID=$(mysql_exec "select id from sys_role where role_code='MANAGER' limit 1" | tr -d '\r')
ROLE_FINANCE_ID=$(mysql_exec "select id from sys_role where role_code='FINANCE' limit 1" | tr -d '\r')
if [ -z "$ROLE_MANAGER_ID" ] || [ -z "$ROLE_FINANCE_ID" ]; then
  echo "Role ids not found" >&2
  exit 1
fi

ensure_user() {
  local username="$1"
  local role_id="$2"
  local user_id
  user_id=$(mysql_exec "select id from sys_user where username='${username}' limit 1" | tr -d '\r')
  if [ -z "$user_id" ]; then
    local add_res
    add_res=$(curl -s -X POST "${BASE_URL}/sys/user/add" \
      -H "Content-Type: application/json" \
      -H "X-Access-Token: ${ADMIN_TOKEN}" \
      -d "{\"username\":\"${username}\",\"realname\":\"${username}\",\"password\":\"${TEST_PASS}\",\"selectedroles\":\"${role_id}\"}")
    local add_ok
    add_ok=$(echo "$add_res" | jq -r '.success')
    if [ "$add_ok" != "true" ]; then
      echo "Add user failed: ${add_res}" >&2
      exit 1
    fi
    user_id=$(mysql_exec "select id from sys_user where username='${username}' limit 1" | tr -d '\r')
  else
    local change_res
    change_res=$(curl -s -X PUT "${BASE_URL}/sys/user/changePassword" \
      -H "Content-Type: application/json" \
      -H "X-Access-Token: ${ADMIN_TOKEN}" \
      -d "{\"username\":\"${username}\",\"password\":\"${TEST_PASS}\"}")
    local change_ok
    change_ok=$(echo "$change_res" | jq -r '.success')
    if [ "$change_ok" != "true" ]; then
      echo "Change password failed: ${change_res}" >&2
      exit 1
    fi
  fi

  mysql_exec "update sys_user set status=1, del_flag=0 where username='${username}'" >/dev/null
  mysql_exec "insert into sys_user_role (id, user_id, role_id)
select replace(uuid(),'-',''), '${user_id}', '${role_id}'
from dual where not exists (select 1 from sys_user_role where user_id='${user_id}' and role_id='${role_id}')" >/dev/null
}

ensure_user "$MANAGER_USER" "$ROLE_MANAGER_ID"
ensure_user "$FINANCE_USER" "$ROLE_FINANCE_ID"

MANAGER_TOKEN=$(get_token "$MANAGER_USER" "$TEST_PASS")
FINANCE_TOKEN=$(get_token "$FINANCE_USER" "$TEST_PASS")
if [ -z "$MANAGER_TOKEN" ] || [ "$MANAGER_TOKEN" = "null" ]; then
  echo "Manager login failed" >&2
  exit 1
fi
if [ -z "$FINANCE_TOKEN" ] || [ "$FINANCE_TOKEN" = "null" ]; then
  echo "Finance login failed" >&2
  exit 1
fi

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

visible_in_tasks() {
  local token="$1"
  local task_id="$2"
  local res
  res=$(curl -s -X POST "${BASE_URL}/bpm/task/my" \
    -H "Content-Type: application/json" \
    -H "X-Access-Token: ${token}" \
    -d "{}")
  if echo "$res" | jq -e --arg tid "$task_id" '.result[]? | select(.taskId==$tid) | .taskId' >/dev/null; then
    echo "true"
  else
    echo "false"
  fi
}

run_branch() {
  local label="$1"
  local amount_value="$2"
  local correct_token="$3"
  local wrong_token="$4"
  local expect_manager="$5"
  local expect_finance="$6"

  DATA=$(jq -nc --arg k1 "$NUM_FIELD" --argjson v1 "$amount_value" '{($k1): $v1}')
  INSERT_RES=$(curl -s -X POST "${BASE_URL}/form/data/insert" \
    -H "Content-Type: application/json" \
    -H "X-Access-Token: ${ADMIN_TOKEN}" \
    -d "{\"formKey\":\"${FORM_KEY}\",\"data\":${DATA}}")
  RECORD_ID=$(echo "$INSERT_RES" | jq -r '.result.recordId')
  if [ -z "$RECORD_ID" ] || [ "$RECORD_ID" = "null" ]; then
    echo "Insert failed: $INSERT_RES" >&2
    exit 1
  fi

  START_RES=$(curl -s -X POST "${BASE_URL}/bpm/process/start" \
    -H "Content-Type: application/json" \
    -H "X-Access-Token: ${ADMIN_TOKEN}" \
    -d "{\"processKey\":\"${PROCESS_KEY}\",\"formKey\":\"${FORM_KEY}\",\"recordId\":\"${RECORD_ID}\"}")
  PROCESS_INSTANCE_ID=$(echo "$START_RES" | jq -r '.result.processInstanceId')
  if [ -z "$PROCESS_INSTANCE_ID" ] || [ "$PROCESS_INSTANCE_ID" = "null" ]; then
    echo "Process start failed: $START_RES" >&2
    exit 1
  fi

  STATUS_APPLY=$(curl -s "${BASE_URL}/bpm/process/status?processInstanceId=${PROCESS_INSTANCE_ID}" \
    -H "X-Access-Token: ${ADMIN_TOKEN}")
  APPLY_TASK_ID=$(echo "$STATUS_APPLY" | jq -r '.result.currentTasks[0].taskId')
  if [ -z "$APPLY_TASK_ID" ] || [ "$APPLY_TASK_ID" = "null" ]; then
    echo "Apply task not found: $STATUS_APPLY" >&2
    exit 1
  fi

  COMPLETE_APPLY=$(curl -s -X POST "${BASE_URL}/bpm/task/complete" \
    -H "Content-Type: application/json" \
    -H "X-Access-Token: ${ADMIN_TOKEN}" \
    -d "{\"taskId\":\"${APPLY_TASK_ID}\"}")
  APPLY_OK=$(echo "$COMPLETE_APPLY" | jq -r '.success')
  if [ "$APPLY_OK" != "true" ]; then
    echo "Apply task complete failed: $COMPLETE_APPLY" >&2
    exit 1
  fi

  STATUS_NEXT=$(curl -s "${BASE_URL}/bpm/process/status?processInstanceId=${PROCESS_INSTANCE_ID}" \
    -H "X-Access-Token: ${ADMIN_TOKEN}")
  NEXT_TASK_ID=$(echo "$STATUS_NEXT" | jq -r '.result.currentTasks[0].taskId')
  if [ -z "$NEXT_TASK_ID" ] || [ "$NEXT_TASK_ID" = "null" ]; then
    echo "Next task not found: $STATUS_NEXT" >&2
    exit 1
  fi

  MANAGER_VISIBLE=$(visible_in_tasks "$MANAGER_TOKEN" "$NEXT_TASK_ID")
  FINANCE_VISIBLE=$(visible_in_tasks "$FINANCE_TOKEN" "$NEXT_TASK_ID")
  if [ "$MANAGER_VISIBLE" != "$expect_manager" ] || [ "$FINANCE_VISIBLE" != "$expect_finance" ]; then
    echo "Visibility check failed: manager=${MANAGER_VISIBLE} finance=${FINANCE_VISIBLE}" >&2
    exit 1
  fi

  WRONG_CLAIM=$(curl -s -X POST "${BASE_URL}/bpm/task/claim" \
    -H "Content-Type: application/json" \
    -H "X-Access-Token: ${wrong_token}" \
    -d "{\"taskId\":\"${NEXT_TASK_ID}\"}")
  WRONG_CODE=$(echo "$WRONG_CLAIM" | jq -r '.code')
  if [ "$WRONG_CODE" != "403" ]; then
    echo "Wrong user claim should be 403: $WRONG_CLAIM" >&2
    exit 1
  fi

  RIGHT_CLAIM=$(curl -s -X POST "${BASE_URL}/bpm/task/claim" \
    -H "Content-Type: application/json" \
    -H "X-Access-Token: ${correct_token}" \
    -d "{\"taskId\":\"${NEXT_TASK_ID}\"}")
  RIGHT_OK=$(echo "$RIGHT_CLAIM" | jq -r '.success')
  if [ "$RIGHT_OK" != "true" ]; then
    echo "Correct user claim failed: $RIGHT_CLAIM" >&2
    exit 1
  fi

  COMPLETE_NEXT=$(curl -s -X POST "${BASE_URL}/bpm/task/complete" \
    -H "Content-Type: application/json" \
    -H "X-Access-Token: ${correct_token}" \
    -d "{\"taskId\":\"${NEXT_TASK_ID}\"}")
  NEXT_OK=$(echo "$COMPLETE_NEXT" | jq -r '.success')
  if [ "$NEXT_OK" != "true" ]; then
    echo "Task complete failed: $COMPLETE_NEXT" >&2
    exit 1
  fi

  STATUS_END=$(curl -s "${BASE_URL}/bpm/process/status?processInstanceId=${PROCESS_INSTANCE_ID}" \
    -H "X-Access-Token: ${ADMIN_TOKEN}")
  ENDED=$(echo "$STATUS_END" | jq -r '.result.ended')
  if [ "$ENDED" != "true" ]; then
    echo "Process not ended: $STATUS_END" >&2
    exit 1
  fi

  echo "branch=${label}"
  echo "manager_tasks_visible=${MANAGER_VISIBLE}"
  echo "finance_tasks_visible=${FINANCE_VISIBLE}"
  echo "claim_by_correct_user=OK"
  echo "claim_by_wrong_user=403"
  echo "ended=${ENDED}"
}

run_branch "A_amount_20001" 20001 "$MANAGER_TOKEN" "$FINANCE_TOKEN" "true" "false"
run_branch "B_amount_99" 99 "$FINANCE_TOKEN" "$MANAGER_TOKEN" "false" "true"
