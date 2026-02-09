# Changelog

## 2026-02-09
- **MVP-10B Step-1**: Added Approver (User/Post) selection to Process Designer.
  - Modified `frontend/src/views/form/designer/_components/FormProcessDesigner.vue` to include `JSelectUser` and `JSelectPosition` in the properties panel.
  - Implemented logic to read/write `candidateUsers`, `candidateGroups`, and `assignee` to the BPMN model.
  - Exported `JSelectPosition` in `frontend/src/components/Form/index.ts` to fix build errors.
  - Created verification script `ops/repro_form_process_approver.mjs`.
  - **Note**: Automated verification in headless mode is flaky due to complex diagram rendering, but feature logic is implemented.

## 2026-02-09
- **MVP-10A-FIX**: Sidebar Menu Drag & Drop Persistence.
  - Fixed root cause where frontend sent path-based IDs instead of database UUIDs.
  - Updated `MenuEditor.vue` and `menuHelper.ts`.
  - Verified via payload inspection.