# Deployment Checklist (for Roo Code audit)

## Preflight
- [ ] nginx -t passes
- [ ] port 80/443 listening by nginx
- [ ] backend health endpoint returns 200 via Nginx: /jeecg-boot/sys/randomImage/123

## Database
- [ ] MySQL reachable
- [ ] Quartz tables exist with QRTZ_ prefix
- [ ] lower_case_table_names=0 confirmed

## Post-Change Verify
- [ ] ops/verify.sh passes
- [ ] No Quartz table missing errors in startup logs

---

# AI Change Guardrails (for Cline / Roo Code)

## Before any change (mandatory)
- [ ] Read `docs/ai/CONTEXT.md` and use it as source of truth (do not guess).
- [ ] Generate context pack: `./ops/ctxpack.sh` (ensure `docs/ai/CTXPACK.latest.md` updated).
- [ ] Run gate: `./ops/ai_guard.sh` must be **OK** before commit.

## Commit rules
- [ ] Never commit secrets/certs: `*.key *.crt *.pem *.p12 *.pfx .env* application-prod*`.
- [ ] Keep changes minimal; if touching infra/nginx/db configs, explain why in `docs/ai/CHANGELOG.md`.

## After change (mandatory)
- [ ] Run gate: `bash ops/run_gate.sh <name> <regress>`
  - Example: `bash ops/run_gate.sh ui-fix ops/regress_ui_oa_smoke.sh`
  - Checks: AI Guard (pre/post), Regression, Git Safety (secrets/configs).
- [ ] If verify fails: revert immediately, restore last known-good, record in CHANGELOG.
