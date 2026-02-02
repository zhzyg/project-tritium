#!/usr/bin/env bash
set -euo pipefail

# This script runs the Playwright browser verification for MVP-5A.
# It assumes that the backend and frontend are already running.

# Install dependencies if they are not already installed.
# Run the verification script.
xvfb-run node "$(dirname "$0")/verify_mvp5a_ui.js"
