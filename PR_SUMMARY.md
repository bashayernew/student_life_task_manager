# PR: Fix RLS Recursion, Remove Nested Buttons, Auto-Port Selection

## Summary
This PR fixes critical Supabase 500 errors caused by RLS recursion, removes nested button warnings, and enables automatic port selection for the dev server.

## Changes Made

### 1. ✅ SQL: Non-Recursive RLS Policies
**File:** `sql/rls_reset_non_recursive.sql`
- Created comprehensive RLS policies that avoid recursion
- Policies only reference tables, never views
- Safe for both `tasks` and `task_assignees` tables
- Includes proper SELECT, INSERT, UPDATE, DELETE policies

### 2. ✅ Task Service: Simplified Create Flow
**File:** `src/utils/taskService.js`
- `createTask()` now:
  - Inserts task with minimal payload (only returns `id`)
  - Inserts assignees separately (no joins on insert)
  - Fetches expanded data from view (if exists) for display
  - Uses `due_at` consistently (ISO string conversion)
  - Normalizes priority ('normal' → 'medium', lowercase)
- `getMyTasks()` prefers view with safe fallback

### 3. ✅ Select Component: Remove Nested Buttons
**File:** `src/components/ui/Select.jsx`
- Changed trigger from `<button>` to `<div role="button">`
- Added keyboard support (Enter/Space)
- Maintains all accessibility attributes
- Prevents nested button warnings in console

### 4. ✅ Vite Config: Auto-Port Selection
**File:** `vite.config.mjs`
- Changed `strictPort: false` for both server and preview
- Default port set to 5173 (Vite standard)
- Auto-selects free port if 5173 is busy
- Keeps existing allowedHosts configuration

## Next Steps

### A. Run SQL Script in Supabase
1. Open Supabase Dashboard → SQL Editor
2. Open `sql/rls_reset_non_recursive.sql`
3. Copy all contents
4. Paste and Run
5. Should see "Success. No rows returned"

### B. Restart Dev Server
```bash
npm install  # if needed
npm run dev
```
- Server will start on port 5173 (or next available)
- Open the printed URL in browser

### C. Test
1. Create a task with due date, department, and assignees
2. Verify no 500 errors in console
3. Verify no "infinite recursion" errors
4. Verify no nested `<button>` warnings
5. Task should be created successfully

## Files Changed

- ✨ `sql/rls_reset_non_recursive.sql` (NEW)
- 🔧 `src/utils/taskService.js` (UPDATED)
- 🔧 `src/components/ui/Select.jsx` (UPDATED)
- 🔧 `vite.config.mjs` (UPDATED)

## Expected Behavior After This PR

✅ No more 500 errors when creating tasks  
✅ No more "infinite recursion detected in policy" errors  
✅ No nested button warnings in console  
✅ Dev server auto-picks free port  
✅ Task creation works with `due_at` field  
✅ All RLS policies work without recursion  

## Notes

- The RLS policies avoid recursion by never referencing views in USING/WITH CHECK clauses
- Task creation uses a minimal insert approach to avoid RLS complexity
- Select component now uses semantic HTML with proper ARIA attributes
- Port selection is now flexible for multiple developers working simultaneously

