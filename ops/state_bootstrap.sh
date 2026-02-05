#!/bin/bash
set -euo pipefail

ART_DIR=".artifacts"
STATE_FILE="$ART_DIR/last_run.json"
RUNBOOK="docs/ai/RUNBOOK_STATE.md"

mkdir -p "$ART_DIR"

if [[ ! -f "$STATE_FILE" ]]; then
  ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  cat <<JSON > "$STATE_FILE"
{"mvp":"MVP-9A-fix","stage":"bootstrap","status":"done","updated_at":"$ts","note":"state_bootstrap initialized"}
JSON
fi

if [[ ! -f "$RUNBOOK" ]]; then
  cat <<'MD' > "$RUNBOOK"
# RUNBOOK_STATE

## A. 四站必查结果摘要

## B. Plan

## C. 实施改动（含 git diff --stat）

## D. 线上验证（oa_verify 证据）

## E. 文档更新

## F. Git

## G. 结果概括
MD
fi

printf "[state_bootstrap] OK\n"
