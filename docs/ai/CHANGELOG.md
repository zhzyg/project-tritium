# Project Tritium AI Changelog (Operational)

> Purpose: durable operational memory across interrupted chats / agent switches.
> Rule: each entry must be actionable (what/why/scope/files/verify/rollback/next).
> Avoid: pasting large code; link to paths + artifacts evidence instead.

## Entry Template (copy/paste)
- Date:
- Goal / Why:
- Scope: (frontend/backend/db/nginx/ops)
- Key changes:
  - Files:
  - Config/Runtime:
  - DB patches:
- Verification (evidence paths):
  - ai_guard: artifacts/.../ai_guard_pre.log, ai_guard_post.log
  - regress: ops/... + artifacts/... logs
  - curl/status: artifacts/... text files
- Rollback:
- Known issues / Next:

---

# CHANGELOG

- 2026-01-30: MVP-3C runtime mutation engine (insert/update runtime to physical table + data_json audit) + regression script ops/regress_form_mutation_mvp3c.sh
- 2026-01-30: MVP-3C regression PASS (ops/regress_form_mutation_mvp3c.sh) evidence: artifacts/form-mutation-mvp3c/regress_output_after_restart_20260130_020537.txt
- 2026-01-30: Stage3 MVP-0 Flowable minimal integration (BPMN + /bpm APIs + ops/regress_flowable_mvp0.sh) PASS evidence: artifacts/flowable-mvp0/regress_output_20260130_021635.txt
- 2026-01-30: Stage3 MVP-1 form data -> flowable variables auto mapping (start/complete + /bpm/process/vars + ops/regress_flowable_mvp1.sh) PASS evidence: artifacts/flowable-mvp1/regress_output_20260130_023141.txt
- 2026-01-30: Stage3 MVP-2 approval gateway + claim + link table (TRITIUM_APPROVAL_V1 + /bpm/task/claim + /bpm/process/status + ops/regress_flowable_mvp2.sh) PASS evidence: artifacts/flowable-mvp2/regress_output_20260130_024637.txt
- 2026-01-30: Stage3 MVP-3 RBAC candidate groups + task visibility/claim restrictions + ops/regress_flowable_mvp3.sh PASS evidence: artifacts/flowable-mvp3/regress_output_20260130_030142.txt
- 2026-01-30: Stage3 MVP-4 registry + form bind + start-by-form (registry/bind APIs + ops/regress_flowable_mvp4.sh) PASS evidence: artifacts/flowable-mvp4/regress_output_20260130_031526.txt
- 2026-01-30: Stage4 MVP-0 BPM center UI (defs/bind/start-by-form pages + ops/regress_ui_flowable_mvp0.sh) PASS evidence: artifacts/ui-flowable-mvp0/regress_output_20260130_032746.txt
- 2026-01-29: Nginx + HTTPS for oa.donaldzhu.com, reverse proxy to 127.0.0.1:8080 and redirect / -> /jeecg-boot/
- 2026-01-29: Add docs/ai/ROADMAP.md (governance doc; no runtime change)
- 2026-01-29: Expand docs/ai/ROADMAP.md content (phases/scope/ADR/governance; no runtime change)
- 2026-01-29: Regenerated ctxpack via ops/ctxpack.sh; updated docs/ai/CTXPACK.latest.md (no runtime change)
- 2026-01-29: Flowable MVP-0 starter + /flowable/ping + schema auto-update (new tables only)
- 2026-01-29: Align dev MySQL/Redis settings with tritium containers for Flowable MVP-0
- 2026-01-29: VForm MVP-0 designer route + localStorage schema (no persistence/DDL)
- 2026-01-29: Register /form/designer menu permission for BACK mode; Save/Load/Reset regression verified; no breaking runtime change
# hook test 2026-01-29T08:13:37+00:00
- 2026-01-29: Form schema MVP-1 (backend persistence + API + frontend swap to backend + regression verified)
- 2026-01-29: Form Runtime Data Engine MVP-2 (form_record + submit/page/get + /form/runtime UI + regressions verified)
- 2026-01-29: MVP-3A JSON->DDL publish (form_table_meta/form_field_meta + publish API + dual-write to tr_form_* + regressions verified)
- 2026-01-29: MVP-3B runtime query engine (physical table query + latestPublished + filter whitelist + regression verified)

- ops: add deploy_frontend_static.sh + regress_frontend_static_deploy.sh (build→sync /var/www/oa→curl verify); artifacts under artifacts/frontend-deploy/ and artifacts/frontend-regress/
- 2026-01-30: Fix OA auth proxy by mapping /jeecgboot/* to backend /jeecg-boot/* and add OPTIONS preflight handling in nginx; add ops/regress_ui_oa_smoke.sh; evidence: artifacts/auth_404_405_fix_20260130_101427/
## 2026-01-30
- Goal / Why: make changelog handoff-ready and record key deployment facts for OA ops continuity.
- Scope: docs, nginx, ops
- Key changes:
  - Files:
    - docs/ai/CHANGELOG.md
  - Config/Runtime:
    - Nginx serves static frontend from /var/www/oa (root in /etc/nginx/sites-available/oa.donaldzhu.com).
    - /var/www/oa permissions: root:root 755.
    - ai_guard admin env file exists at /root/.config/tritium/admin.env (600 perms; not committed).
- Verification (evidence paths):
  - ai_guard pre: artifacts/changelog_detail_20260130_103224/ai_guard_pre.log
  - filesystem/nginx: artifacts/changelog_detail_20260130_103224/var_www_oa_ls.txt, artifacts/changelog_detail_20260130_103224/var_www_oa_perm.txt, artifacts/changelog_detail_20260130_103224/nginx_root_oa.txt, artifacts/changelog_detail_20260130_103224/admin_env_ls.txt, artifacts/changelog_detail_20260130_103224/admin_env_perm.txt
- Rollback:
  - Revert this changelog entry via git revert if needed.
  - For runtime changes, restore prior nginx root and re-deploy static frontend as applicable.
- Known issues / Next:
  - Keep monitoring auth routes via ops/regress_ui_oa_smoke.sh and capture evidence in artifacts.

## 2026-01-30 (TechDebt-1)
- Goal / Why: Unify frontend API base to "/jeecg-boot" to eliminate 405 Method Not Allowed errors caused by "/jeecgboot" path mismatch and align with backend context.
- Scope: frontend, ops
- Key changes:
  - Files:
    - frontend/.env.production
    - ops/regress_ui_oa_smoke.sh
  - Config/Runtime:
    - VITE_GLOB_API_URL set to "/jeecg-boot" (was "/jeecgboot").
    - Regression script now enforces "/jeecg-boot" and checks for forbidden "/jeecgboot" in config.
- Verification (evidence paths):
  - ai_guard: artifacts/techdebt1/ai_guard_pre.log
  - regress: ops/regress_ui_oa_smoke.sh (PASS expected)
  - curl/status: _app.config.js check (PASS expected)
- Rollback:
  - Revert frontend/.env.production and ops/regress_ui_oa_smoke.sh.
  - Re-run frontend build and deploy.
- Known issues / Next:
  - Monitor for any hardcoded /jeecgboot calls in legacy code (none found in config).

## 2026-01-30 (Ops-Gate)
- Goal / Why: reduce interruptions/agent switching; standardize evidence chain.
- Scope: ops, docs
- Key changes:
  - Files:
    - ops/run_gate.sh (new)
    - docs/ai/CHECKLIST.md
  - Config/Runtime: None.
- Verification (evidence paths):
  - Self-verification: `bash ops/run_gate.sh self-test` (skips regress, runs guards).
- Rollback:
  - Delete ops/run_gate.sh, revert docs.
- Known issues / Next: None.

- 2026-01-30: Housekeeping commit: stage4 MVP-0 BPM center UI assets (bpm pages/api + regress scripts + db menu patch + .gitignore). Evidence: (see artifacts/stage4-mvp0-assets_*)
- 2026-01-30: Fix ops/run_gate.sh to load secrets from /root/.config/tritium/admin.env (or AI_GUARD_ENV_FILE) and export ADMIN_PASS/AI_GUARD_ADMIN_PASS for regression scripts; updated ops/regress_ui_flowable_mvp0.sh to accept either var. Evidence: artifacts/ (next run).
