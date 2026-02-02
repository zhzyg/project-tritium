#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
cd "$SCRIPT_DIR"

if ! command -v xvfb-run &> /dev/null
then
    echo "xvfb-run could not be found, please install xvfb"
    exit 1
fi

export ART_DIR=${ART_DIR:-.}
xvfb-run -a --server-args="-screen 0 1280x800x24" node verify_ui_login_and_bpm.mjs
