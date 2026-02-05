#!/bin/bash
set -euo pipefail

STAGE="${1:-}"
STATUS="${2:-}"
NOTE="${3:-}"

if [[ -z "$STAGE" || -z "$STATUS" ]]; then
  echo "usage: ./ops/state_mark.sh <stage> <status> [note]" >&2
  exit 1
fi

ART_DIR=".artifacts"
STATE_FILE="$ART_DIR/last_run.json"
mkdir -p "$ART_DIR"

STAGE="$STAGE" STATUS="$STATUS" NOTE="$NOTE" node - <<'NODE'
const fs = require('fs');
const path = require('path');

const stateFile = path.join('.artifacts', 'last_run.json');
let state = {};
if (fs.existsSync(stateFile)) {
  try {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (err) {
    state = {};
  }
}
state.stage = process.env.STAGE;
state.status = process.env.STATUS;
state.note = process.env.NOTE;
state.updated_at = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
NODE

echo "[state_mark] ${STAGE}=${STATUS}"
