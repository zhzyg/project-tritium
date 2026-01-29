#!/usr/bin/env bash
set -euo pipefail

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

echo "[ai-guard] OK"
