#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:8080/jeecg-boot}
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASS=${ADMIN_PASS:-Admin#2026!Reset}
CHECK_KEY_PREFIX="menu_my_started"

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

echo "2. Verifying menu..."
MENU_RES=$(curl -s -H "X-Access-Token: ${ADMIN_TOKEN}" "${BASE_URL}/sys/permission/getUserPermissionByToken")

if echo "$MENU_RES" | jq -e '.result.menu[] | select(.name == "审批中心") | .children[] | select(.name == "我发起的")' > /dev/null; then
    echo "PASS: '我发起的' menu item found."
else
    echo "INFO: '我发起的' menu item not found. Applying DB patch and clearing cache..."
    mysql -u root -pTritium_Dev_Root_Pass_ChangeMe! -h 127.0.0.1 -P 13306 tritium < backend/db/patches/20260202_add_menu_my_started.sql
    curl -s -H "X-Access-Token: ${ADMIN_TOKEN}" "${BASE_URL}/test/jeecgDemo/clear-permission-cache"
    sleep 30
    ADMIN_TOKEN=$(get_token "$ADMIN_USER" "$ADMIN_PASS")
    MENU_RES=$(curl -s -H "X-Access-Token: ${ADMIN_TOKEN}" "${BASE_URL}/sys/permission/getUserPermissionByToken")
    if echo "$MENU_RES" | jq -e '.result.menu[] | select(.name == "审批中心") | .children[] | select(.name == "我发起的")' > /dev/null; then
        echo "PASS: '我发起的' menu item found after patch and restart."
    else
        echo "FAIL: '我发起的' menu item not found after patch and restart."
        echo "$MENU_RES"
        exit 1
    fi
fi

if echo "$MENU_RES" | jq -e '.result.menu[] | select(.name == "审批中心") | .children[] | select(.path == "/bpm/my")' > /dev/null; then
    echo "PASS: '/bpm/my' path found."
else
    echo "FAIL: '/bpm/my' path not found."
    echo "$MENU_RES"
    exit 1
fi

echo "SUCCESS: Menu verification passed."
exit 0
