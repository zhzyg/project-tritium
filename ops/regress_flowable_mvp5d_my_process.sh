#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:8080/jeecg-boot}
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASS=${ADMIN_PASS:-Admin#2026!Reset}
CHECK_KEY_PREFIX="flowable_mvp5d_my_process"

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

echo "2. Starting a process..."
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
echo "Process Instance ID: $PROCESS_INSTANCE_ID"

echo "3. Verifying my processes..."
sleep 1 # Allow time for the process to be indexed
MY_PROCESSES_RES=$(curl -s "${BASE_URL}/bpm/process/my" \
    -H "X-Access-Token: ${ADMIN_TOKEN}")

if echo "$MY_PROCESSES_RES" | jq -e --arg PROC_INST_ID "$PROCESS_INSTANCE_ID" '.result[] | select(.processInstanceId == $PROC_INST_ID)' > /dev/null; then
    echo "PASS: Started process found in my processes list."
else
    echo "FAIL: Started process not found in my processes list."
    echo "$MY_PROCESSES_RES"
    exit 1
fi

echo "4. Verifying process trace..."
TRACE_RES=$(curl -s "${BASE_URL}/bpm/process/trace?procInstId=${PROCESS_INSTANCE_ID}" \
    -H "X-Access-Token: ${ADMIN_TOKEN}")

if echo "$TRACE_RES" | jq -e '.result[] | select(.type == "STARTEVENT")' > /dev/null; then
    echo "PASS: Start event found in process trace."
else
    echo "FAIL: Start event not found in process trace."
    echo "$TRACE_RES"
    exit 1
fi

echo "SUCCESS: MVP-5D My Started Processes verified."
exit 0
