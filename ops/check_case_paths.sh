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

echo "[check-case-paths] Scanning for case-sensitivity drift (Bpm vs bpm)..."
# Let's check for any /views/bpm/ (case insensitive) that isn't the new /bpm/my
echo "[check-case-paths] Checking for any /views/bpm/ (case-insensitive) references..."
OLD_BASE="/views/bpm/"
HITS_BASE=$(grep -ri "$OLD_BASE" . --exclude-dir={.git,node_modules,dist,.artifacts} --include=*.{js,ts,vue,jsx,tsx,html,json})

if [ ! -z "$HITS_BASE" ]; then
    echo "⚠️ WARNING: Found references to '$OLD_BASE' (case-insensitive). Please verify if these should be migrated to '/bpm/':"
    echo "$HITS_BASE" | head -n 20
fi

exit $EXIT_CODE