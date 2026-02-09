#!/usr/bin/env bash
set -euo pipefail

MYSQL_CONTAINER=${MYSQL_CONTAINER:-tritium-mysql}
MYSQL_USER=${MYSQL_USER:-root}
MYSQL_PASS=${MYSQL_PASS:-Tritium_Dev_Root_Pass_ChangeMe!}
MYSQL_DB=${MYSQL_DB:-tritium}
MENU_CN_WHITELIST_REGEX=${MENU_CN_WHITELIST_REGEX:-MenuTest}

run_sql() {
  local sql="$1"
  if command -v docker >/dev/null 2>&1 && docker ps --format "{{.Names}}" | rg -n "^${MYSQL_CONTAINER}$" >/dev/null 2>&1; then
    docker exec -e MYSQL_PWD="$MYSQL_PASS" -i "$MYSQL_CONTAINER" mysql -u"$MYSQL_USER" -Nse "$sql" "$MYSQL_DB"
  else
    local host="${MYSQL_HOST:-127.0.0.1}"
    local port="${MYSQL_PORT:-13306}"
    MYSQL_PWD="$MYSQL_PASS" mysql -h"$host" -P"$port" -u"$MYSQL_USER" -Nse "$sql" "$MYSQL_DB"
  fi
}

RESULT="$(run_sql "select id,name,url,perms,parent_id from sys_permission where name regexp '[A-Za-z]' order by name")" || true

if [[ -n "$MENU_CN_WHITELIST_REGEX" && -n "$RESULT" ]]; then
  RESULT="$(echo "$RESULT" | rg -v "$MENU_CN_WHITELIST_REGEX" || true)"
fi

if [[ -n "$RESULT" ]]; then
  echo "[menu-cn] FAIL: sys_permission.name still contains English characters."
  echo "$RESULT"
  exit 1
fi

echo "[menu-cn] OK"
