#!/usr/bin/env bash
set -euo pipefail

# ---- ai_guard runtime config (do NOT commit secrets) ----
# Optional local env file (kept outside repo).
AI_GUARD_ENV_FILE="${AI_GUARD_ENV_FILE:-/root/.config/tritium/admin.env}"
if [ -f "$AI_GUARD_ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$AI_GUARD_ENV_FILE"
fi

# Prefer local backend to avoid nginx/https redirects.
AI_GUARD_BASE_URL="${AI_GUARD_BASE_URL:-http://127.0.0.1:8080/jeecg-boot}"
AI_GUARD_ADMIN_USER="${AI_GUARD_ADMIN_USER:-admin}"
# Password must be provided via env; never hardcode in repo.
AI_GUARD_ADMIN_PASS="${AI_GUARD_ADMIN_PASS:-}"
# Set AI_GUARD_SKIP_LOGIN=1 to bypass login check (NOT recommended for mainline gates).
AI_GUARD_SKIP_LOGIN="${AI_GUARD_SKIP_LOGIN:-0}"

export AI_GUARD_BASE_URL
export AI_GUARD_ADMIN_USER
export AI_GUARD_ADMIN_PASS
export AI_GUARD_SKIP_LOGIN

if [ "$AI_GUARD_SKIP_LOGIN" != "1" ] && [ -z "$AI_GUARD_ADMIN_PASS" ]; then
  echo "[ai-guard] FAIL: AI_GUARD_ADMIN_PASS is empty. Export it or set it in ${AI_GUARD_ENV_FILE}." >&2
  exit 10
fi
# ---------------------------------------------------------


echo "[ai-guard] baseline: $(git rev-parse --short HEAD) ($(git rev-parse --abbrev-ref HEAD))"

# 1) 禁止把敏感文件/明显秘密带进提交范围
echo "[ai-guard] secret scan (lightweight)"
if git diff --cached --name-only | grep -E '(\.env$|\.env\.|application-prod|\.key$|\.pem$|\.pfx$|\.p12$|\.crt$)' >/dev/null; then
  echo "[ai-guard] FAIL: staged changes include forbidden secret-like files" >&2
  git diff --cached --name-only >&2
  exit 11
fi

# 2) 强制生成 ctxpack（保证每次 AI 改动都有可投喂上下文）
if [ -x ops/ctxpack.sh ]; then
  echo "[ai-guard] ctxpack"
  ./ops/ctxpack.sh >/dev/null
else
  echo "[ai-guard] FAIL: ops/ctxpack.sh missing or not executable" >&2
  exit 12
fi

# 3) 必须通过 preflight + verify（已有你的规则）
if [ -x ops/preflight.sh ]; then
  echo "[ai-guard] preflight"
  ./ops/preflight.sh
else
  echo "[ai-guard] WARN: ops/preflight.sh missing, skip"
fi

if [ -x ops/verify.sh ]; then
  echo "[ai-guard] verify"
  ./ops/verify.sh
else
  echo "[ai-guard] FAIL: ops/verify.sh missing or not executable" >&2
  exit 13
fi

# 4) 前端变更需通过最小构建检查
if [ -x ops/frontend_check.sh ]; then
  if git diff --name-only --cached | grep -qE '^frontend/'; then
    echo "[ai-guard] frontend check (staged)"
    ./ops/frontend_check.sh
  elif git diff --name-only | grep -qE '^frontend/'; then
    echo "[ai-guard] frontend check (unstaged)"
    ./ops/frontend_check.sh
  else
    echo "[ai-guard] frontend check: skip (no frontend changes)"
  fi
else
  echo "[ai-guard] WARN: ops/frontend_check.sh missing, skip"
fi

echo "[ai-guard] OK"
