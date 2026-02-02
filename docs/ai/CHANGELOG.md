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

- 2026-02-02: Stage4 MVP-5D BPM Center “我发起的流程(My Started)” 最小闭环
- Goal / Why: Allow users to view the processes they have started.
- Scope: frontend, backend
- Key changes:
  - Files:
    - backend/jeecg-module-system/jeecg-system-biz/src/main/java/org/jeecg/modules/flowable/dto/FlowableHistoricProcessInstanceResp.java
    - backend/jeecg-module-system/jeecg-system-biz/src/main/java/org/jeecg/modules/flowable/service/IFlowableProcessService.java
    - backend/jeecg-module-system/jeecg-system-biz/src/main/java/org/jeecg/modules/flowable/service/impl/FlowableProcessServiceImpl.java
    - backend/jeecg-module-system/jeecg-system-biz/src/main/java/org/jeecg/modules/flowable/controller/FlowableProcessController.java
    - frontend/src/views/bpm/my/index.vue
    - frontend/src/views/bpm/process/view/index.vue
    - frontend/src/router/routes/modules/bpm.ts
    - frontend/src/router/menus/modules/bpm.ts
    - frontend/src/api/bpm/flowable.ts
    - ops/regress_flowable_mvp5d_my_process.sh
- Endpoints:
  - GET /bpm/process/my
- Verification (evidence paths):
  - gate: artifacts/flowable-mvp5d-my-process_20260202_082631
  - regress: artifacts/flowable-mvp5d-my-process_20260202_082631/regress.log
- Rollback:
  - Revert the changes to the files listed above.
- Known issues / Next: None.

- 2026-02-02: Stage4 MVP-5C BPM Center “已办任务 / 我已处理” 最小闭环
- Goal / Why: Allow users to view their completed tasks.
- Scope: frontend, backend
- Key changes:
  - Files:
    - backend/jeecg-module-system/jeecg-system-biz/src/main/java/org/jeecg/modules/flowable/dto/FlowableHistoricTaskResp.java
    - backend/jeecg-module-system/jeecg-system-biz/src/main/java/org/jeecg/modules/flowable/service/IFlowableProcessService.java
    - backend/jeecg-module-system/jeecg-system-biz/src/main/java/org/jeecg/modules/flowable/service/impl/FlowableProcessServiceImpl.java
    - backend/jeecg-module-system/jeecg-system-biz/src/main/java/org/jeecg/modules/flowable/controller/FlowableProcessController.java
    - frontend/src/views/bpm/done/index.vue
    - frontend/src/router/routes/modules/bpm.ts
    - frontend/src/router/menus/modules/bpm.ts
    - frontend/src/api/bpm/flowable.ts
    - ops/regress_flowable_mvp5c_done_list.sh
- Endpoints:
  - GET /bpm/task/done
- Verification (evidence paths):
  - gate: artifacts/flowable-mvp5c-done_20260202_041527
  - regress: artifacts/flowable-mvp5c-done_20260202_041527/regress.log
- Rollback:
  - Revert the changes to the files listed above.
- Known issues / Next: None.

- 2026-02-02: Stage4 MVP-5B Approval Comment (审批意见闭环)
- Goal / Why: Allow users to add comments during approval and view historical comments.
- Scope: frontend, backend
- Key changes:
  - Files:
    - backend/jeecg-module-system/jeecg-system-biz/src/main/java/org/jeecg/modules/flowable/dto/FlowableTaskCompleteReq.java
    - backend/jeecg-module-system/jeecg-system-biz/src/main/java/org/jeecg/modules/flowable/dto/FlowableTaskCommentResp.java
    - backend/jeecg-module-system/jeecg-system-biz/src/main/java/org/jeecg/modules/flowable/service/IFlowableProcessService.java
    - backend/jeecg-module-system/jeecg-system-biz/src/main/java/org/jeecg/modules/flowable/service/impl/FlowableProcessServiceImpl.java
    - backend/jeecg-module-system/jeecg-system-biz/src/main/java/org/jeecg/modules/flowable/controller/FlowableProcessController.java
    - frontend/src/views/bpm/approve/index.vue
    - frontend/src/api/bpm/flowable.ts
    - ops/regress_flowable_mvp5b_comment.sh
- Endpoints:
  - GET /bpm/task/comments
- Verification (evidence paths):
  - gate: artifacts/flowable-mvp5b-comment_20260202_033316
  - regress: artifacts/flowable-mvp5b-comment_20260202_033316/regress.log
- Rollback:
  - Revert the changes to the files listed above.
- Known issues / Next: None.

- 2026-02-02: Stage4 MVP-5A Task Header & Visibility (Task Header, `assignee`, `candidateGroups`, Claim button)
- Goal / Why: Enhance task visibility in `/bpm/tasks` and `/bpm/approve`.
- Scope: frontend, backend
- Key changes:
  - Files:
    - backend/jeecg-module-system/jeecg-system-biz/src/main/java/org/jeecg/modules/flowable/dto/FlowableTaskContextResp.java
    - backend/jeecg-module-system/jeecg-system-biz/src/main/java/org/jeecg/modules/flowable/service/impl/FlowableProcessServiceImpl.java
    - frontend/src/views/bpm/tasks/index.vue
    - frontend/src/views/bpm/approve/index.vue
    - frontend/src/api/bpm/flowable.ts
    - ops/regress_flowable_mvp5a_task_detail.sh
- Verification (evidence paths):
  - gate: artifacts/flowable-mvp5a_20260202_010621
  - regress: artifacts/flowable-mvp5a_20260202_010621/regress.log
- Rollback:
  - Revert the changes to the files listed above.
- Known issues / Next:
  - Browser verification was not possible due to the execution environment (`--no-sandbox` flag is required for root).

- 2026-01-31: Stage4 MVP-2A open form from tasks (GET /bpm/task/context + Open Form button + ops/regress_ui_flowable_mvp2a.sh existence check); gate PASS evidence: artifacts/ui-flowable-mvp2a_20260131_040946/
- 2026-01-31: I18N Chinese localization for BPM/VForm menus (UI + DB Patch); verify script ops/regress_ui_menu_i18n_cn.sh PASS evidence: artifacts/ui-menu-i18n-cn_20260131_111042/
- 2026-01-31: Fix missing translation "Form Runtime" -> "表单运行" (DB Patch); gate PASS evidence: artifacts/ui-menu-i18n-cn-fix_20260131_114401/
- 2026-01-31: Stage4 MVP-2B Auto-writeback variables on task complete (Backend logic + Frontend refresh); gate PASS evidence: artifacts/flowable-mvp2b_20260131_125931/
- 2026-01-31: Stage4 MVP-2C Approve/Reject buttons (Frontend UI) + Variables persistence (Backend enhancement); gate PASS evidence: artifacts/flowable-mvp2c_20260201_010754/
- 2026-01-31: Stage4 MVP-2D Task Approval Page (/bpm/approve) with Read-only Form + Approve/Reject actions; gate PASS evidence: artifacts/ui-flowable-mvp2d_20260201_013840/
- 2026-01-31: Stage4 MVP-3 Approval Timeline / Process Trace (Backend API + UI); gate PASS evidence: artifacts/ui-flowable-mvp3-trace_20260201_022848/
- 2026-01-31: ops harden frontend_check to prevent OOM (default NODE_OPTIONS=--max-old-space-size=3072; build log capture); gate PASS evidence: artifacts/gate-frontend-oom-hardening_20260131_035258/

- 2026-02-02: fix MVP-5D my-started menu patch idempotent + role binding; regress: ops/regress_ui_bpm_mvp5d_menu.sh; evidence: artifacts/ui-bpm-mvp5d-menu-fix_20260202_142048

- 2026-02-02: fix MVP-5D 'White Screen' on /bpm/my; rewrite component to be robust, fix potential import/runtime errors; verify backend API access in regression.

- 2026-02-02: fix(mvp-5d): resolve /bpm/my white screen
- Goal / Why: Fix the white screen issue on the "My Initiated" page (`/bpm/my`).
- Scope: frontend, ops
- Key changes:
  - Renamed directory `frontend/src/views/bpm/my` to `frontend/src/views/bpm/MyInitiated` to resolve potential case-sensitivity import issues.
  - Updated route definition in `frontend/src/router/routes/modules/bpm.ts`.
  - Added `ops/check_case_paths.sh` to prevent future regressions of old paths or case-sensitivity issues.
  - Integrated `ops/check_case_paths.sh` into `ops/ai_guard.sh`.
  - Strengthened `ops/repro_bpm_my.mjs` with robust DOM assertions and detailed error capturing (console/page errors/failed requests).
- Verification (evidence paths):
  - repro script: ops/repro_bpm_my.mjs (upgraded with marker detection)
  - repro artifacts: .artifacts/repro-bpm-my/ (console logs and screenshot)
  - prod-verify: Production build successful (`pnpm run build`); verified static serve via `serve -s frontend/dist`.
  - guard: `ops/check_case_paths.sh` successfully integrated into `ai_guard`.
- Rollback:
  - Revert directory rename and route change.
  - Remove `ops/check_case_paths.sh` and its reference in `ops/ai_guard.sh`.
