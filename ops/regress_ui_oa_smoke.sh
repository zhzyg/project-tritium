#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://oa.donaldzhu.com}"
API_BASE="${API_BASE:-/jeecgboot}"

fail=0

check_code() {
  local label="$1"
  local method="$2"
  local url="$3"

  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X "${method}" "${url}" || true)"
  echo "${label} => ${code}"

  if [[ "${code}" == "404" || "${code}" == "405" || "${code}" == "000" ]]; then
    fail=1
  fi
}

check_login_page() {
  local url="$1"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' "${url}" || true)"
  echo "login page => ${code}"
  if [[ "${code}" == "404" || "${code}" == "405" || "${code}" == "000" ]]; then
    fail=1
  fi
}

check_login_page "${BASE_URL}/login"
check_code "captcha" "GET" "${BASE_URL}${API_BASE}/sys/randomImage/123456"
check_code "login OPTIONS" "OPTIONS" "${BASE_URL}${API_BASE}/sys/login"
check_code "login POST" "POST" "${BASE_URL}${API_BASE}/sys/login"

if [[ "${fail}" -ne 0 ]]; then
  echo "[FAIL] ui oa smoke regression"
  exit 1
fi

echo "[OK] ui oa smoke regression"
