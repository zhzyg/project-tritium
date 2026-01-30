#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:8080/jeecg-boot}
LOG_FILE=${LOG_FILE:-backend/jeecg-system-start.out}
USERNAME=${USERNAME:-admin}
PASSWORD=${PASSWORD:-}
ASSIGNEE=${ASSIGNEE:-admin}
PROCESS_KEY=${PROCESS_KEY:-TRITIUM_DEMO_V0}
CHECK_KEY="flowable_${RANDOM}"

if [ -z "$PASSWORD" ]; then
  echo "PASSWORD is required (export PASSWORD=...)" >&2
  exit 1
fi

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

START_RES=$(curl -s -X POST "${BASE_URL}/bpm/process/start" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"processKey\":\"${PROCESS_KEY}\",\"assignee\":\"${ASSIGNEE}\"}")
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

COMPLETE_RES=$(curl -s -X POST "${BASE_URL}/bpm/task/complete" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"taskId\":\"${TASK_ID}\",\"assignee\":\"${ASSIGNEE}\"}")
COMPLETE_OK=$(echo "$COMPLETE_RES" | jq -r '.success')
if [ "$COMPLETE_OK" != "true" ]; then
  echo "Task complete failed: $COMPLETE_RES" >&2
  exit 1
fi

TASKS_AFTER_RES=$(curl -s -X POST "${BASE_URL}/bpm/task/my" \
  -H "Content-Type: application/json" \
  -H "X-Access-Token: ${TOKEN}" \
  -d "{\"assignee\":\"${ASSIGNEE}\"}")
TASKS_AFTER=$(echo "$TASKS_AFTER_RES" | jq -r '.result | length')

if [ "$TASKS_AFTER" -ge "$TASKS_BEFORE" ]; then
  echo "Task count did not drop: before=$TASKS_BEFORE after=$TASKS_AFTER" >&2
  exit 1
fi

echo "process_instance_id=${PROCESS_INSTANCE_ID}"
echo "task_id=${TASK_ID}"
echo "tasks_before=${TASKS_BEFORE}"
echo "tasks_after=${TASKS_AFTER}"
