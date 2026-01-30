#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-${AI_GUARD_BASE_URL:-http://127.0.0.1:8080/jeecg-boot}}"
UI_BASE_URL="${UI_BASE_URL:-${AI_GUARD_UI_BASE_URL:-http://127.0.0.1}}"
LOG_FILE="${LOG_FILE:-backend/jeecg-system-start.out}"
ADMIN_USER="${ADMIN_USER:-${AI_GUARD_ADMIN_USER:-admin}}"
ADMIN_PASS="${ADMIN_PASS:-${AI_GUARD_ADMIN_PASS:-}}"
ADMIN_TOKEN="${ADMIN_TOKEN:-${AI_GUARD_ADMIN_TOKEN:-}}"
CHECK_KEY_PREFIX="ui_flowable_mvp1_semantic"

if [ -z "${ADMIN_PASS}" ] && [ -z "${ADMIN_TOKEN}" ]; then
  echo "ADMIN_PASS not set. Export ADMIN_PASS (or AI_GUARD_ADMIN_PASS) before running." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq not found; required for token parsing." >&2
  exit 1
fi

mask_token() {
  local token="$1"
  local len=${#token}
  if [ "$len" -le 8 ]; then
    echo "****"
  else
    local head=${token:0:4}
    local tail=${token: -4}
    echo "${head}****${tail}"
  fi
}

http_code() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local token="${4:-}"
  local args=( -s -o /dev/null -w "%{http_code}" -X "$method" )
  if [ -n "$token" ]; then
    args+=( -H "X-Access-Token: ${token}" )
  fi
  if [ -n "$data" ]; then
    args+=( -H "Content-Type: application/json" -d "$data" )
  fi
  curl "${args[@]}" "$url"
}

extract_captcha() {
  local file="$1"
  if [ -z "$file" ] || [ ! -f "$file" ]; then
    echo ""
    return 0
  fi
  local captcha_line
  captcha_line=$(rg --text "checkCode =" "$file" | tail -n 1 || true)
  local captcha
  captcha=$(echo "$captcha_line" | sed -E 's/.*checkCode = ([A-Za-z0-9]+).*/\1/')
  if [ -z "$captcha" ] || [ "$captcha" = "$captcha_line" ]; then
    echo ""
    return 0
  fi
  echo "$captcha"
}

latest_log_file() {
  ls -t backend/jeecg-module-system/logs/jeecgboot-*.log 2>/dev/null | head -n 1 || true
}

try_login() {
  local username="$1"
  local password="$2"
  local captcha="$3"
  local check_key="$4"
  local login_res
  login_res=$(curl -s -X POST "${BASE_URL}/sys/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${username}\",\"password\":\"${password}\",\"captcha\":\"${captcha}\",\"checkKey\":\"${check_key}\"}")
  echo "$login_res" | jq -r '.result.token'
}

get_token() {
  local username="$1"
  local password="$2"
  local token
  token=$(try_login "$username" "$password" "" "")
  if [ -n "$token" ] && [ "$token" != "null" ]; then
    echo "$token"
    return 0
  fi
  local check_key="${CHECK_KEY_PREFIX}_${RANDOM}"
  curl -s "${BASE_URL}/sys/randomImage/${check_key}" > /dev/null
  local captcha
  captcha=$(extract_captcha "$LOG_FILE")
  if [ -z "$captcha" ]; then
    local latest_log
    latest_log=$(latest_log_file)
    captcha=$(extract_captcha "$latest_log")
  fi
  if [ -z "$captcha" ]; then
    captcha=$(extract_captcha "jeecg-system-start.out")
  fi
  if [ -z "$captcha" ]; then
    echo "Failed to extract captcha from logs (${LOG_FILE}, $(latest_log_file), jeecg-system-start.out)" >&2
    exit 1
  fi
  token=$(try_login "$username" "$password" "$captcha" "$check_key")
  echo "$token"
}

require_unauth() {
  local label="$1"
  local method="$2"
  local url="$3"
  local data="${4:-}"
  local code
  code=$(http_code "$method" "$url" "$data")
  echo "${label} (unauth) -> HTTP ${code}"
  if [ "$code" != "401" ] && [ "$code" != "403" ]; then
    echo "Expected 401/403 for ${label} without login" >&2
    exit 1
  fi
}

require_not_404_405() {
  local label="$1"
  local method="$2"
  local url="$3"
  local data="$4"
  local token="$5"
  local code
  code=$(http_code "$method" "$url" "$data" "$token")
  echo "${label} (auth) -> HTTP ${code}"
  if [ "$code" = "404" ] || [ "$code" = "405" ]; then
    echo "Unexpected ${code} for ${label} with auth" >&2
    exit 1
  fi
}

check_ui_route() {
  local url="$1"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" -L "$url")
  echo "UI GET ${url} -> HTTP ${code}"
  if [ "$code" != "200" ]; then
    echo "UI route not returning 200: ${url}" >&2
    exit 1
  fi
}

echo "--- Stage 4 MVP-1 Semantic Regression ---"

check_ui_route "${UI_BASE_URL}/"
check_ui_route "${UI_BASE_URL}/bpm/tasks"
check_ui_route "${UI_BASE_URL}/_app.config.js"

echo "--- Manual Browser Gate Checklist ---"
echo "1) Open ${UI_BASE_URL}/bpm/tasks in browser"
echo "2) DevTools -> Network: confirm index.html and _app.config.js return 200"
echo "3) DevTools -> Network: verify /jeecg-boot/bpm/task/my returns 401 when logged out"
echo "4) After login, verify /jeecg-boot/bpm/task/my returns 200"

echo "--- API Semantic Checks (unauth) ---"
require_unauth "GET /bpm/task/my" "GET" "${BASE_URL}/bpm/task/my"
require_unauth "POST /bpm/task/claim" "POST" "${BASE_URL}/bpm/task/claim" '{"taskId":"__dummy__"}'
require_unauth "POST /bpm/task/complete" "POST" "${BASE_URL}/bpm/task/complete" '{"taskId":"__dummy__"}'

if [ -z "${ADMIN_TOKEN}" ]; then
  ADMIN_TOKEN=$(get_token "$ADMIN_USER" "$ADMIN_PASS")
fi
if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  echo "Admin login failed" >&2
  exit 1
fi

echo "admin_token=$(mask_token "$ADMIN_TOKEN")"

echo "--- API Semantic Checks (auth) ---"
TASKS_CODE=$(http_code "GET" "${BASE_URL}/bpm/task/my" "" "$ADMIN_TOKEN")
echo "GET /bpm/task/my (auth) -> HTTP ${TASKS_CODE}"
if [ "$TASKS_CODE" != "200" ]; then
  echo "Expected 200 for /bpm/task/my with auth" >&2
  exit 1
fi

TASKS_RES=$(curl -s -H "X-Access-Token: ${ADMIN_TOKEN}" "${BASE_URL}/bpm/task/my")
TASK_COUNT=$(echo "$TASKS_RES" | jq -r '.result | length')
FIRST_TASK_ID=$(echo "$TASKS_RES" | jq -r '.result[0].taskId // empty')

echo "tasks_count=${TASK_COUNT}"
if [ -z "$FIRST_TASK_ID" ]; then
  echo "claim/complete: SKIP(no tasks)"
else
  echo "claim/complete: taskId_present (no-op check only)"
fi

require_not_404_405 "POST /bpm/task/claim" "POST" "${BASE_URL}/bpm/task/claim" '{"taskId":"__dummy__"}' "$ADMIN_TOKEN"
require_not_404_405 "POST /bpm/task/complete" "POST" "${BASE_URL}/bpm/task/complete" '{"taskId":"__dummy__"}' "$ADMIN_TOKEN"

VARS_CODE=$(http_code "POST" "${BASE_URL}/bpm/process/vars" '{"processInstanceId":"__dummy__"}' "$ADMIN_TOKEN")
echo "POST /bpm/process/vars (auth) -> HTTP ${VARS_CODE}"
if [ "$VARS_CODE" = "404" ] || [ "$VARS_CODE" = "405" ]; then
  echo "Unexpected ${VARS_CODE} for /bpm/process/vars with auth" >&2
  exit 1
fi

echo "--- Semantic Regression Complete ---"
