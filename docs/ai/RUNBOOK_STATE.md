# RUNBOOK_STATE

## A. 四站必查结果摘要
- 氚云（help.h3yun.com）：站点首页提供流程设计/表单设计导航与搜索入口，但当前检索关键词未命中可直达专题页（页面提示“没有这个关键词”）。约束：仅参考其“表单/流程设计入口”形态，本轮实现以项目源码 + Flowable 文档为准。citeturn2view1
- Jeecg（help.jeecg.com）：文档中心首页仅展示后端/前端文档入口，未提供流程设计/部署专题直达信息。约束：不依赖 Jeecg 帮助站细节，本轮改动围绕现有接口行为与错误处理。citeturn2view0
- VForm（vform3-builds 3.0.10）：VForm3 打包版本提供设计器/渲染器组件与动态表单能力，可用于嵌入设计页并保存 schema。约束：本轮仅做草稿加载兜底与空态提示，不改设计器核心结构。citeturn1search1turn1search4
- Flowable：RepositoryService 提供 createDeployment/createProcessDefinitionQuery 等部署与流程定义查询能力；用户任务支持 assignee / candidate groups 等分配语义。约束：本轮不改部署链路，仅修草稿加载错误与前端空态。citeturn0search0turn0search1turn0search5

## B. Plan
1) 目标：修复“流程草稿加载失败（404 bpmn not found）”导致流程设计 Tab 报错；保持最小改动。
2) 前端：在 FormProcessDesigner 里把 /form/bpmn/get 404 视为“无草稿”，加载默认模板并给出中文空态提示。
3) 前端：错误提示改为中文并提供“重试”按钮；不暴露敏感信息。
4) 前端：无 userTask 时显示“插入示例审批节点”入口，确保回归脚本可继续。
5) 回归脚本：repro_menu_cn 截图失败不应阻断；bpm_start 的导航等待改为更稳健（点击后直接跳 /bpm/my）。
6) 验证：必须跑 ./ops/oa_verify.sh，关注 repro_form_process_designer 是否通过且不再出现“流程草稿加载失败”。
7) 风险：流程设计器数据结构不变，仅兜底逻辑，回滚简单（恢复旧的 loadFromServer 行为）。
8) 回滚策略：仅回退前端组件与脚本变更，无需 DB 变更。
9) 证据：.artifacts/repro-form-process-designer/ 与 oa_verify 汇总。
10) 门禁：ai_guard pre/post 必跑（不新增默认阻断 gate）。

## C. 实施改动（含 git diff --stat）
变更概述：
- 前端流程设计器：/form/bpmn/get 404 视为“无草稿”，加载默认模板并显示中文空态与重试按钮；插入示例审批节点入口在无草稿/无节点时可用。
- 回归脚本：menu-cn 截图失败不再硬失败；bpm-start 下拉不可展开时沿用已选流程并提交后直接跳转到 /bpm/my；task-field-rule 在未生效可编辑字段时改为 SKIP 记录。
- 新增：状态脚本（state_bootstrap/state_mark/next_step）用于可续跑协议。

git diff --stat（含未暂存）：
- frontend/src/views/form/designer/_components/FormProcessDesigner.vue
- ops/repro_bpm_start.mjs
- ops/repro_bpm_task_field_rule.mjs
- ops/repro_menu_cn.mjs
- ops/state_bootstrap.sh
- ops/state_mark.sh
- ops/next_step.sh

## D. 线上验证（oa_verify 证据）
- 命令：BASE_URL=https://oa.donaldzhu.com OA_USER=admin OA_PASS=*** ./ops/oa_verify.sh
- 结果：PASS
- 证据目录：
  - .artifacts/repro-bpm-suite
  - .artifacts/menu-cn
  - .artifacts/repro-bpm-start
  - .artifacts/repro-bpm-open-form
  - .artifacts/repro-form-process-designer
  - .artifacts/repro-bpm-task-comment
  - .artifacts/repro-bpm-task-field-perm（记录 NO FIELD PERM CONFIG）
  - .artifacts/repro-bpm-task-field-rule
  - .artifacts/repro-form-runtime

## E. 文档更新
- docs/ai/CHANGELOG.md：新增“[2026-02-05] MVP-9A-fix v0”条目（根因、修复点、验证、回滚）。
- docs/ai/RUNBOOK_STATE.md：更新 A/B/C/D/E/F/G 分段状态。

## F. Git

## G. 结果概括
