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
