#!/bin/bash
set -euo pipefail

STATE_FILE=".artifacts/last_run.json"
if [[ ! -f "$STATE_FILE" ]]; then
  echo "No state file. Run: ./ops/state_bootstrap.sh"
  exit 0
fi

stage=$(python - <<'PY'
import json
print(json.load(open('.artifacts/last_run.json')).get('stage',''))
PY
)

case "$stage" in
  A) echo "Next: B) 规划完成后 ./ops/state_mark.sh B done";;
  B) echo "Next: C) 实施完成后 ./ops/state_mark.sh C done";;
  C) echo "Next: D) 线上验证 ./ops/oa_verify.sh 后 ./ops/state_mark.sh D done";;
  D) echo "Next: E) 更新文档后 ./ops/state_mark.sh E done";;
  E) echo "Next: F) git commit & push 后 ./ops/state_mark.sh F done";;
  F) echo "Next: G) 结果概括后 ./ops/state_mark.sh G done";;
  *) echo "Next: 开始 A) 四站必查与规划";;
esac
