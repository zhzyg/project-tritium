
## [MVP-10A-FIX] 2026-02-09
- **Fix**: Sidebar drag & drop persistence failed because frontend sent paths instead of UUIDs.
- **Root Cause**: `transformRouteToMenu` in `menuHelper.ts` stripped `id` field. Backend `applyLayoutToPermissionList` requires UUIDs.
- **Changes**:
  - Frontend: `menuHelper.ts` now preserves `id`.
  - Frontend: `MenuEditor.vue` prioritizes `item.id` for layout keys.
- **Evidence**: `.artifacts/menu-drag-fix/1770621193792/save_payload.json` (Shows UUID keys).
