# Project Tritium E2E Online Verification Runbook

## 1. Goal
Provide a standardized, repeatable process for verifying the system on the live environment (`https://oa.donaldzhu.com`) across different AI agent sessions or environments.

## 2. Environment Variables
Copy and run these in your terminal before starting verification:

```bash
export BASE_URL='https://oa.donaldzhu.com'
export OA_USER='admin'
export OA_PASS='Admin#2026!Reset'
export OA_STORAGE_STATE='.artifacts/oa/oa-storage-state.json'
```

## 3. Path A: Fully Automated (Default)
This mode attempts to login using the `admin` bypass strategy (auto-filling dummy captcha).

```bash
./ops/oa_verify.sh
```

## 4. Path B: Manual Session Capture (Fallback)
Use this if the automated login is stuck on CAPTCHA or if credentials require manual intervention.

1. On a machine with a display (e.g., local VSCode or laptop):
   ```bash
   export HEADLESS=false
   node ops/oa_login_capture.mjs
   ```
2. Complete the CAPTCHA and login manually in the browser window that appears.
3. The script will save the session to `$OA_STORAGE_STATE`.
4. Transfer/Ensure this file is present in the project directory.
5. Re-run the verification:
   ```bash
   ./ops/oa_verify.sh
   ```

## 5. Failure Diagnosis
- **502 Bad Gateway / Connection Refused**: Backend is likely down or restarting. Check `logs/backend.log`.
- **Timeout / Marker Not Found**:
  - Check the screenshot in `.artifacts/repro-bpm-suite/*/screenshot.png`.
  - If it shows a login page, the session has expired or `AUTO` login failed. Use **Path B**.
  - If it shows a blank page, check for frontend build errors or network issues.
- **Marker Mismatch**: If the page changed (e.g., "我发起的" text changed), update `ops/repro_bpm_suite.sh`.

## 6. Security & Best Practices
- **DO NOT** commit `.artifacts/` or `.env` files.
- **DO NOT** print `OA_PASS` in any logs.
- Always run `./ops/ai_guard.sh` before committing changes to ensure no secrets are leaked.
