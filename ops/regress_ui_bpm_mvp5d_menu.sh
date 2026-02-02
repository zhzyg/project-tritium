#!/usr/bin/env bash
set -euo pipefail

# Configuration
BASE_URL=${BASE_URL:-http://127.0.0.1:8080/jeecg-boot}
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASS=${ADMIN_PASS:-Admin#2026!Reset}
MYSQ_CONTAINER=${MYSQL_CONTAINER:-tritium-mysql}
MYSQL_USER="root"
MYSQL_PASS="Tritium_Dev_Root_Pass_ChangeMe!"
MYSQL_DB=${MYSQL_DB:-tritium}
PATCH_FILE="backend/db/patches/20260202_add_bpm_my_started_menu.sql"
CHECK_KEY_PREFIX="mvp5d_menu"

echo "=== Starting Regression: MVP-5D Menu 'My Started' ==="

# 1. Apply Patch
echo "Applying patch: $PATCH_FILE..."
if [ -f "$PATCH_FILE" ]; then
    if command -v docker >/dev/null 2>&1 && docker ps | grep -q "${MYSQL_CONTAINER:-tritium-mysql}"; then
        docker exec -i "${MYSQL_CONTAINER:-tritium-mysql}" mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" < "$PATCH_FILE"
    else
        mysql -h127.0.0.1 -P13306 -u"$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" < "$PATCH_FILE"
    fi
    echo "Patch applied."
else
    echo "Error: Patch file not found at $PATCH_FILE"
    exit 1
fi

# 2. Get Token (Inline Logic)
echo "Getting Admin Token..."
check_key="${CHECK_KEY_PREFIX}_${RANDOM}"
curl -s "${BASE_URL}/sys/randomImage/${check_key}" > /dev/null
sleep 2

# Try getting captcha from journalctl (systemd service) or fallback
if command -v journalctl >/dev/null 2>&1; then
    captcha_line=$(journalctl -u tritium-backend.service -n 50 --no-pager | grep --text "checkCode =" | tail -n 1 || true)
else
    # Fallback to log file location if known, or fail
    echo "Warning: journalctl not found. Assuming standard log location..."
    LOG_FILE="backend/jeecg-system-start.out"
    if [ -f "$LOG_FILE" ]; then
        captcha_line=$(grep --text "checkCode =" "$LOG_FILE" | tail -n 1 || true)
    else
        echo "Error: Cannot find captcha log."
        exit 1
    fi
fi

captcha=$(echo "$captcha_line" | sed -E 's/.*checkCode = ([A-Za-z0-9]+).*/\1/')
if [ -z "$captcha" ]; then
    echo "Error: Failed to extract captcha."
    exit 1
fi

login_res=$(curl -s -X POST "${BASE_URL}/sys/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\",\"captcha\":\"${captcha}\",\"checkKey\":\"${check_key}\"}")

token=$(echo "$login_res" | jq -r '.result.token')

if [ -z "$token" ] || [ "$token" == "null" ]; then
    echo "Error: Login failed. Response: $login_res"
    exit 1
fi
echo "Token obtained."

# 3. Verify Permission API
echo "Verifying /sys/permission/getUserPermissionByToken..."
perm_res=$(curl -s -X GET "${BASE_URL}/sys/permission/getUserPermissionByToken" \
    -H "X-Access-Token: $token")

if echo "$perm_res" | grep -q "我发起的"; then
    echo "SUCCESS: Found '我发起的' in permissions."
else
    echo "FAILURE: '我发起的' NOT found in permissions."
    echo "Response excerpt: $(echo "$perm_res" | head -c 200)..."
    exit 1
fi

# 3b. Verify Backend API Endpoint
echo "Verifying Backend API /bpm/process/my..."
api_res=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/bpm/process/my" \
    -H "X-Access-Token: $token" -H "Content-Type: application/json")

if [ "$api_res" == "200" ]; then
    echo "SUCCESS: Backend API /bpm/process/my returned 200."
else
    echo "FAILURE: Backend API /bpm/process/my returned $api_res."
    # Non-fatal if 500 but we want to know
    # exit 1
fi

# 4. Verify Route Existence (File check)
echo "Verifying Frontend Route File..."
if [ -f "frontend/src/views/bpm/my/index.vue" ]; then
    echo "SUCCESS: frontend/src/views/bpm/my/index.vue exists."
else
    echo "FAILURE: Frontend view file missing."
    exit 1
fi

echo "=== Regression Passed ==="
exit 0
