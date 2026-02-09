# Runbook State

## MVP-10A: Sidebar Drag & Drop
- [x] Step-1: Top-level edit mode & local sort (frontend only).
- [x] Step-2: Backend persistence API & logic.
- [x] Step-3: Sub-menu same-parent sorting.
- [x] **MVP-10A-FIX**: Persistence logic corrected.
  - Root Cause: Frontend/Backend ID mismatch (Path vs UUID).
  - Fix: Frontend now sends UUIDs.
  - Status: Verified via data payload inspection.

## Next Steps
- [ ] MVP-10B: Cross-parent dragging (Future Scope).