#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:8080/jeecg-boot}
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASS=${ADMIN_PASS:-Admin#2026!Reset}
CHECK_KEY_PREFIX="flowable_mvp5b_comment"

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

echo "3. Claiming the task..."
curl -s -X POST "${BASE_URL}/bpm/task/claim" \
    -H "Content-Type: application/json" \
    -H "X-Access-Token: ${ADMIN_TOKEN}" \
    -d "{\"taskId\":\"${TASK_ID}\"}"

echo "4. Completing the task with a comment..."
COMMENT="test_comment_abc"
COMPLETE_RES=$(curl -s -X POST "${BASE_URL}/bpm/task/complete" \
    -H "Content-Type: application/json" \
    -H "X-Access-Token: ${ADMIN_TOKEN}" \
    -d "{\"taskId\":\"${TASK_ID}\", \"comment\":\"${COMMENT}\"}")

echo "5. Verifying comments..."
COMMENTS_RES=$(curl -s "${BASE_URL}/bpm/task/comments?taskId=${TASK_ID}" \
    -H "X-Access-Token: ${ADMIN_TOKEN}")

if echo "$COMMENTS_RES" | jq -e --arg COMMENT "$COMMENT" '.result[] | select(.message == $COMMENT)' > /dev/null; then
    echo "PASS: Comment found in task comments."
else
    echo "FAIL: Comment not found in task comments."
    echo "$COMMENTS_RES"
    exit 1
fi

echo "SUCCESS: MVP-5B Comment verified."
exit 0
