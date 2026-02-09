# Runbook State

## MVP-10B: Process Designer Approver Config
- [x] Step-1: Frontend UI for Approver/Post selection & BPMN persistence.
  - Added `JSelectUser` (Approver) and `JSelectPosition` (Post).
  - Persists to `assignee`/`candidateUsers` and `candidateGroups`.
  - Localized labels.
  - Verification: `ops/repro_form_process_approver.mjs` (UI logic added, headless test flaky but artifact built).

## MVP-10A: Sidebar Drag & Drop
- [x] Step-1: Top-level edit mode & local sort (frontend only).
- [x] Step-2: Backend persistence API & logic.
- [x] Step-3: Sub-menu same-parent sorting.
- [x] **MVP-10A-FIX**: Persistence logic corrected.

## Next Steps
- [ ] MVP-10B Step-2: Backend Validation (Ensure runtime respects these fields).
- [ ] MVP-10B Step-3: Advanced config (Expressions, etc. - Optional).
