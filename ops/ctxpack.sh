#!/usr/bin/env bash
set -euo pipefail

# ===== config =====
MAX_BYTES="${MAX_BYTES:-220000}"     # ~55k tokens (roughly bytes/4). Tune later.
OUT_DIR="${OUT_DIR:-.artifacts/ai}"
TS="$(date +%Y%m%d_%H%M%S)"
OUT="${OUT_DIR}/ctxpack_${TS}.md"
LATEST="docs/ai/CTXPACK.latest.md"

# ===== helpers =====
bytes_of() { wc -c < "$1" | tr -d ' '; }
est_tokens() {
  # very rough: 1 token ≈ 4 chars/bytes in English-ish text
  python3 - "$1" <<PY
import os,sys
b=int(sys.argv[1])
print(int(round(b/4)))
PY
}
need_file() {
  if [ ! -f "$1" ]; then
    echo "[ctxpack] missing required file: $1" >&2
    exit 2
  fi
}

# ===== required ai docs =====
need_file "docs/ai/CONTEXT.md"
need_file "docs/ai/CHECKLIST.md"
need_file "docs/ai/CHANGELOG.md"

mkdir -p "$OUT_DIR" "docs/ai"

# ===== build pack =====
{
  echo "# Project Tritium – AI Context Pack"
  echo
  echo "Generated: $(date -Is)"
  echo "Repo: $(git remote -v | head -n 1 || true)"
  echo "HEAD: $(git rev-parse --short HEAD 2>/dev/null || true)  ($(git rev-parse --abbrev-ref HEAD 2>/dev/null || true))"
  echo

  echo "## 1) Operating Rules (must follow)"
  echo "- Use docs/ai/CONTEXT.md as source of truth"
  echo "- Follow docs/ai/CHECKLIST.md before making changes"
  echo "- Record decisions in docs/ai/CHANGELOG.md"
  echo

  echo "## 2) Canonical Context"
  echo
  sed -n '1,2200p' docs/ai/CONTEXT.md
  echo

  echo "## 3) Checklist"
  echo
  sed -n '1,2200p' docs/ai/CHECKLIST.md
  echo

  echo "## 4) Recent Decision Log (tail)"
  echo
  tail -n 200 docs/ai/CHANGELOG.md || true
  echo

  echo "## 5) Working Tree Summary"
  echo
  echo '```'
  git status --porcelain=v1 || true
  echo '```'
  echo

  echo "## 6) Staged Diff (if any)"
  echo
  echo '```diff'
  git diff --cached --minimal || true
  echo '```'
  echo

  echo "## 7) Unstaged Diff (if any, truncated)"
  echo
  echo '```diff'
  # limit to avoid explosions
  git diff --minimal | head -n 1200 || true
  echo '```'
  echo
} > "$OUT"

# ===== size guard =====
B="$(bytes_of "$OUT")"
TOK="$(est_tokens "$B")"
echo "[ctxpack] wrote $OUT"
echo "[ctxpack] size: ${B} bytes (~${TOK} tokens est.)"

if [ "$B" -gt "$MAX_BYTES" ]; then
  echo "[ctxpack] ERROR: ctxpack too large (> ${MAX_BYTES} bytes)." >&2
  echo "[ctxpack] Fix: trim docs/ai/CONTEXT.md, reduce diff output, or raise MAX_BYTES cautiously." >&2
  exit 3
fi

# ===== update latest pointer (human-friendly) =====
cp -f "$OUT" "$LATEST"
echo "[ctxpack] updated $LATEST"
