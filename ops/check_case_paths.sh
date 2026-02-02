#!/bin/bash
# ops/check_case_paths.sh
# Lightweight guard to prevent regression of /bpm/my and case-sensitivity issues.

EXIT_CODE=0

echo "[check-case-paths] Scanning for forbidden old paths (/views/bpm/my)..."
# Check for /views/bpm/my in any file (excluding .git, node_modules, dist)
FORBIDDEN_PATH="/views/bpm/my"
# Use grep -r with exclusions
HITS=$(grep -r "$FORBIDDEN_PATH" . --exclude-dir={.git,node_modules,dist,.artifacts} --include=*.{js,ts,vue,jsx,tsx,html,json})

if [ ! -z "$HITS" ]; then
    echo "❌ FAILURE: Found reference to old path '$FORBIDDEN_PATH':"
    echo "$HITS" | head -n 50
    EXIT_CODE=1
else
    echo "✅ OK: No references to /views/bpm/my found."
fi

echo "[check-case-paths] Scanning for bpm path case drift..."
# Scan for /views/bpm/ variants but ignore the canonical /views/bpm/
# We use -i for case-insensitive search but then filter out the exact /views/bpm/
DRIFT=$(grep -ri "/views/bpm/" frontend/src --exclude-dir={node_modules,dist} --include=*.{js,ts,vue,jsx,tsx,html,json} | grep -v "/views/bpm/" | head -n 80 || true)

if [ -n "$DRIFT" ]; then
    echo "❌ ERROR: Found bpm path case drift variants (expected /views/bpm/ only):"
    echo "$DRIFT"
    EXIT_CODE=1
else
    echo "✅ OK: No bpm path case drift variants."
fi

exit $EXIT_CODE
