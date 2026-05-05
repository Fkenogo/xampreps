# Browse and Exam Access Alignment Pass

**Date:** 2026-04-15  
**Branch:** fix/firestore-rules-compile  

---

## Summary

This pass fixes browse/access alignment issues across the public navigation, exam library browsing, and signed-in exam opening.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/layout/PublicLayout.tsx` | Added "Home" nav item; made auth buttons aware of signed-in state |
| `src/integrations/firebase/content.ts` | Wrapped `marking_rules` and `rubrics` fetches in per-document try/catch |
| `src/pages/ExamTakingPage.tsx` | Improved error state — differentiates permission, missing content, and load failures |

---

## A: Top Nav — Home Added

**Before:** Public nav had: Past Papers · Practice Papers · Pricing  
**After:** Public nav has: Home · Past Papers · Practice Papers · Pricing

**Auth-awareness added:** Signed-in users browsing public pages (`/past-papers`, `/practice-papers`, `/pricing`) now see a single "Dashboard" button in the top-right instead of "Sign In / Start Practicing". Clicking it navigates to their role-appropriate dashboard via `getDashboardPathForRole`.

---

## B: Stale Browse Entry Points Audit

**All `/exams` navigate/Link references are inside protected authenticated contexts.** No stale public-facing protected browse links were found.

Verified locations of `/exams` references:
- `src/components/dashboard/QuickExamFinder.tsx` — dashboard widget, protected context ✓
- `src/components/dashboard/RecentActivity.tsx` — empty-state, protected context ✓
- `src/pages/ExamTakingPage.tsx` — back button, protected context ✓
- `src/pages/PaymentSuccessPage.tsx` — post-payment CTA, protected context ✓
- `src/pages/HistoryPage.tsx` — empty-state, protected context ✓
- `src/pages/dashboards/StudentDashboard.tsx` — quick action cards, protected context ✓
- `src/pages/dashboards/BusinessConsole.tsx` — super_admin console, protected context ✓

**Landing page CTAs** all correctly point to `/past-papers`, `/practice-papers`, or `/auth`. No changes required.

---

## C+E: Signed-In Exam Open — Permission Fix

### Root Cause Identified

When a student navigates to `/exams/:examId`, `ExamTakingPage` calls `useV2ExamData(examId)` which calls `loadV2ExamDataFirebase(examId)` in `content.ts`.

The function unconditionally fetches `marking_rules` and `rubrics` documents referenced in the exam's interaction data. However, the Firestore rules restrict these collections to `isContentEditor()` and `isTeacher()` only — students cannot read them:

```
match /marking_rules/{ruleId} {
  allow read: if isContentEditor(); // Not visible to students
}
match /rubrics/{rubricId} {
  allow read: if isContentEditor() || isTeacher();
}
```

The fetch ran inside a `Promise.all`, so a `PERMISSION_DENIED` error on any one `marking_rules` or `rubrics` document would reject the entire load, triggering the "Exam unavailable — Missing or insufficient permissions" error state.

### Fix Applied

In `src/integrations/firebase/content.ts`, separated `marking_rules` and `rubrics` fetches from the main `Promise.all` and added a per-document `.catch()` that:
- Logs a `console.debug` message (not an error, not a warning) with the doc ID and error code
- Returns `null` for that document
- Allows all other reads to continue

The map-building loop was updated to skip `null` snapshots.

**Firestore rules were NOT changed.** The rules correctly restrict marking data from students. The code now handles their absence gracefully rather than treating it as a fatal error.

### Exact Failing Reads (Before Fix)

| Collection | Path pattern | Failure reason |
|-----------|-------------|---------------|
| `marking_rules` | `marking_rules/{markingRuleId}` | `PERMISSION_DENIED` — `isContentEditor()` only |
| `rubrics` | `rubrics/{rubricId}` | `PERMISSION_DENIED` — `isContentEditor()` or `isTeacher()` only |

---

## D: Subscription Fetch — Already Non-Blocking

**Confirmed non-blocking. No changes needed.**

The subscription fetch lives in `src/components/layout/DashboardLayout.tsx` (lines 127–167). It is already wrapped in a try/catch that:
- Logs `console.warn('Failed to fetch subscription data (this is optional):', error)`
- Calls `setSubscription(null)` as fallback
- Does not throw or propagate

This fetch is separate from the exam access path. It runs in the dashboard sidebar only. The "optional" console warning is expected and harmless.

---

## F: Improved Exam Error Messaging

**Before:** All failures showed a generic "Exam unavailable — {raw error message}" with only a back button.

**After:** Error state differentiates three cases:

| Condition | Heading | Message | Actions |
|-----------|---------|---------|---------|
| Permission error (contains "permission" / "insufficient") | "Access restricted" | "You don't have permission to access this exam. Sign in or upgrade your plan to unlock it." | View plans + Back |
| No error but `exam` is null | "Exam not found" | "This exam does not exist or has been removed." | Retry + Back |
| Other load failure | "Could not load exam" | raw error string | Retry + Back |

An `AlertTriangle` icon is shown in all cases.

---

## Manual Test Plan

### Test 1 — Logged out, top nav

1. Open `http://localhost:5173/` → landing page shown
2. Click Home in nav → landing page (same page)
3. Click Past Papers → `/past-papers` loads without sign-in ✓
4. Click Practice Papers → `/practice-papers` loads without sign-in ✓
5. Click Pricing → `/pricing` loads without sign-in ✓
6. "Sign In" and "Start Practicing" buttons visible ✓

### Test 2 — Logged out, browse CTA

1. On landing page, click "Browse Exams" → navigates to `/past-papers`, no auth redirect ✓

### Test 3 — Signed in, top nav

1. Sign in as student
2. Navigate to `/past-papers` directly
3. Top nav shows "Dashboard" button instead of "Sign In / Start Practicing" ✓
4. Click "Home" in nav → `/` → redirects to student dashboard ✓
5. Click "Dashboard" button → navigates to student dashboard ✓

### Test 4 — Signed in, open exam

1. Sign in as student
2. Navigate to `/exams`
3. Click an exam card → ExamModeSelectionModal opens ✓
4. Click Start → navigates to `/exams/:examId`
5. Exam loads successfully (no permission error) ✓
6. `console.debug` may show skipped `marking_rules`/`rubrics` — this is expected

### Test 5 — Subscription fetch

1. Sign in as student (no subscription in Firestore)
2. Dashboard sidebar loads normally ✓
3. Console shows `console.warn 'Failed to fetch subscription data (this is optional)'` — expected, non-blocking ✓
4. Exam can still be opened ✓

---

## Remaining Known Blockers

None identified from this pass.

If an exam still fails to load after this fix:
- The failure is in a different collection than `marking_rules`/`rubrics`
- Check browser console for `[V2 exam load]` debug messages
- Check which Firestore read returns `PERMISSION_DENIED`
- Likely candidates if blocking: `sections`, `items`, `interactions`, `model_answer_versions` — all have `isAuthenticated()` read rules, which should pass for any signed-in user

---

## Build Status

```
npx tsc --noEmit  → EXIT:0  (no type errors)
npm run build     → EXIT:0  (2145 modules, 1198 kB bundle)
```

Pre-existing warnings not introduced by this pass:
- Bundle size >500 kB (pre-existing)
- `admin.ts` dynamic/static import mismatch (pre-existing)
