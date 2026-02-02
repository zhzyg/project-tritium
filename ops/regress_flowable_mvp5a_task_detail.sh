#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:8080/jeecg-boot}
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASS=${ADMIN_PASS:-Admin#2026!Reset}
CHECK_KEY_PREFIX="flowable_mvp5a"

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
echo "Token acquired: ${ADMIN_TOKEN:0:5}..."

echo "2. Starting a process to get a task..."
START_RES=$(curl -s -X POST "${BASE_URL}/bpm/process/startByForm" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${ADMIN_TOKEN}" \
  -d '{"formKey":"dev","recordId":"2017885074757812226"}')

PROCESS_INSTANCE_ID=$(echo "$START_RES" | jq -r '.result.processInstanceId')
if [ -z "$PROCESS_INSTANCE_ID" ] || [ "$PROCESS_INSTANCE_ID" = "null" ]; then
    echo "Failed to start process" >&2
    echo "$START_RES"
    exit 1
fi

sleep 1
STATUS_RES=$(curl -s "${BASE_URL}/bpm/process/status?processInstanceId=${PROCESS_INSTANCE_ID}" \
  -H "X-Access-Token: ${ADMIN_TOKEN}")
TASK_ID=$(echo "$STATUS_RES" | jq -r '.result.currentTasks[0].taskId')
if [ -z "$TASK_ID" ] || [ "$TASK_ID" = "null" ]; then
    echo "Failed to get task ID" >&2
    echo "$STATUS_RES"
    exit 1
fi
echo "Task ID: $TASK_ID"

echo "3. Verifying /bpm/task/my endpoint..."
MY_TASKS_RES=$(curl -s -X POST "${BASE_URL}/bpm/task/my" \
    -H "Content-Type: application/json" \
    -H "X-Access-Token: ${ADMIN_TOKEN}" \
    -d '{}')

TASK_DETAIL=$(echo "$MY_TASKS_RES" | jq -r --arg TASK_ID "$TASK_ID" '.result[] | select(.taskId == $TASK_ID)')

if echo "$TASK_DETAIL" | jq -e '.assignee' > /dev/null; then
    echo "PASS: assignee field exists."
else
    echo "FAIL: assignee field is missing."
    exit 1
fi

if echo "$TASK_DETAIL" | jq -e '.candidateGroups' > /dev/null; then
    echo "PASS: candidateGroups field exists."
else
    echo "FAIL: candidateGroups field is missing."
    exit 1
fi

echo "4. Verifying /bpm/task/context endpoint..."
CONTEXT_RES=$(curl -s "${BASE_URL}/bpm/task/context?taskId=${TASK_ID}" \
  -H "X-Access-Token: ${ADMIN_TOKEN}")

if echo "$CONTEXT_RES" | jq -e '.result.assignee' > /dev/null; then
    echo "PASS: assignee field exists in context."
else
    echo "FAIL: assignee field is missing in context."
    echo "$CONTEXT_RES"
    exit 1
fi

if echo "$CONTEXT_RES" | jq -e '.result.candidateGroups' > /dev/null; then
    echo "PASS: candidateGroups field exists in context."
else
    echo "FAIL: candidateGroups field is missing in context."
    echo "$CONTEXT_RES"
    exit 1
fi

echo "SUCCESS: MVP-5A Task Detail verified."
exit 0
