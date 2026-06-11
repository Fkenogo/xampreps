# Regional Library Structure and Preview Pass

**Date:** 2026-04-16
**Branch:** fix/firestore-rules-compile

---

## Summary

This pass prepares XamPreps's exam browse experience for East Africa multi-country support, wires up the source-driven Practice Papers filter structure, and adds a browse-to-preview UX so any user can inspect exam metadata before starting (or signing in).

---

## Files Changed

| File | Change |
|---|---|
| `src/integrations/firebase/content.ts` | Extended `FirebaseExam` interface; updated `RawExamFields` + `toExamSummary` + `listExamsFirebase` |
| `src/components/exam-library/ExamPreviewModal.tsx` | **New** — exam preview modal with auth-aware CTA |
| `src/components/exam-library/ExamCard.tsx` | Added `examAuthority` field; hid zero-value stats |
| `src/components/exam-library/ExamListItem.tsx` | Added `examAuthority` field; hid zero-value stats; guarded separator dots |
| `src/components/exam-library/ExamFilters.tsx` | No change — already had country + source filter support |
| `src/pages/PublicBrowsePage.tsx` | Added country + source filter state; wired `onPreview` + `ExamPreviewModal`; `ExamModeSelectionModal` for post-auth flow |
| `src/pages/ExamsPage.tsx` | Added breadcrumb; added country + source filter state; wired `onPreview` + `ExamPreviewModal`; paper-type-aware title/description |

---

## Metadata Fields Added / Prepared

### Added to `FirebaseExam` (browse summary type)

| Field | Type | Notes |
|---|---|---|
| `examAuthority` | `string \| null` (optional) | Issuing authority for Past Papers — e.g. `UNEB`, `KNEC`, `NECTA`. Read from Firestore raw `examAuthority` field if present. |
| `sourceType` | `string \| null` (optional) | Type of source for Practice Papers — e.g. `school`, `publisher`, `institution`. Read from Firestore `sourceType` field if present. |

### Previously hardcoded, now read from Firestore when present

| Field | Previous behaviour | New behaviour |
|---|---|---|
| `difficulty` | Always `'Medium'` | Uses `data.difficulty` if stored; falls back to `'Medium'` |
| `is_free` | Always `true` | Uses `data.is_free` boolean if stored; falls back to `true` |

### Already present (no change needed)

`country`, `level` (examLevel), `stage`, `subject`, `year`, `type` (paperType), `source`, `time_limit` (durationMinutes), `question_count`, `description`, `curriculumVersion`, `status`

---

## Filters — Past Papers

| Filter | Before | After |
|---|---|---|
| Country | Not wired (state not in PublicBrowsePage) | Wired — pills shown when ≥2 countries in data; resets level/subject/year on change |
| Exam Level | Wired | Wired (unchanged) |
| Subject | Wired | Wired (unchanged) |
| Year | Wired | Wired (unchanged) |
| Difficulty | Wired (but hardcoded Medium for all) | Wired; now reflects real stored difficulty when Firestore doc has it |
| Source | N/A for Past Papers | N/A (still hidden) |

Country filter narrows the level options dynamically (shows only levels present in data for that country).

---

## Filters — Practice Papers

| Filter | Before | After |
|---|---|---|
| Country | Not wired | Wired — same as Past Papers |
| Exam Level | Wired | Wired (unchanged) |
| Subject | Wired | Wired (unchanged) |
| Source / Publisher | Not wired from page (state missing) | Wired — dropdown shown when sources are present in data |
| Year | Optional pill row (already in ExamFilters) | Wired; shown as secondary pill row when year data is present |
| Difficulty | Wired | Wired |

Practice Papers do not require year as a primary organising dimension. Source/publisher is the primary secondary filter.

---

## Preview Modal Behaviour

New component: `src/components/exam-library/ExamPreviewModal.tsx`

- Opens when a user clicks any `ExamCard` body or `ExamListItem` row (not the Start button)
- Does **not** require sign-in to open — preview is part of browse
- Uses `useAuth()` to determine which CTA to show:
  - **Logged out:** "Sign in to practice" → calls `onSignIn` callback (redirects to `/auth`)
  - **Logged in:** "Start Exam" → calls `onStartExam` callback (opens `ExamModeSelectionModal`)
- Shows the following fields if present; hides them cleanly if absent:
  - Exam title, paper type badge, difficulty badge, free/premium badge
  - Description (from `overallInstructions`)
  - Country, exam level, subject
  - Year (Past Papers) or source/publisher (Practice Papers); year also shown for Practice Papers when present
  - Exam authority (Past Papers only, when `examAuthority` is set)
  - Source type (Practice Papers only, when `sourceType` is set)
  - Duration (hidden if 0)
  - Question count (hidden if 0)

---

## Breadcrumb Changes

| Page | Before | After |
|---|---|---|
| `/past-papers` (PublicBrowsePage) | Already present: Home / Past Papers | Unchanged — already correct |
| `/practice-papers` (PublicBrowsePage) | Already present: Home / Practice Papers | Unchanged — already correct |
| `/pricing` (PricingPage) | Already present: Home / Pricing | Unchanged — already correct |
| `/exams` (ExamsPage, authenticated) | No breadcrumb | Added: Home / Exam Library (or Home / Past Papers / Home / Practice Papers when `type` prop is set) |

---

## Sidebar Navigation

The student sidebar "Upgrade" link (`/pricing`) was already correctly wired. No change required. The `DashboardLayout` logo also provides "Home" (`/`) access for all signed-in roles.

---

## Fallback Behaviour for Missing Metadata

- `examAuthority`, `sourceType`, `source`, `country`, `description`: hidden if absent — no placeholder rendered
- `time_limit = 0`: duration stat hidden in both `ExamCard` and `ExamListItem`
- `question_count = 0`: question count stat hidden in both card components
- `avg_score = 0 / undefined`: average score stat hidden in `ExamCard`
- `year = 0`: year hidden in card subtitle and list meta row
- `difficulty` not in Firestore: falls back to `'Medium'` silently
- `is_free` not in Firestore: falls back to `true` silently
- Country filter: only shown when ≥2 distinct countries are present in data
- Source filter: only shown when at least one exam has a non-null `source` field

No exam is blocked from appearing because of missing optional fields.

---

## Manual Test Results

### Logged-out user (public browse)

1. **Open Past Papers (`/past-papers`)**: Page loads with "Home / Past Papers" breadcrumb and sign-in CTA banner. ✓
2. **Filter by available metadata**: Country pills shown if >1 country in data. Level pills filter correctly. Subject/Year dropdowns narrow. Difficulty filter present. ✓
3. **Click exam card**: Preview modal opens without sign-in required. Shows all available metadata. ✓
4. **CTA inside preview**: "Sign in to practice" button redirects to `/auth`. ✓
5. **Practice Papers (`/practice-papers`)**: Same flow; Source/Publisher dropdown appears when practice paper sources exist. Year shown as optional secondary pills. ✓

### Signed-in user

1. **Upgrade from dashboard sidebar**: Sidebar "Upgrade" link (`/pricing`) works correctly (was already correct). ✓
2. **Pricing page breadcrumb**: "Home / Pricing" visible (pre-existing, confirmed present). ✓
3. **Past Papers / Practice Papers breadcrumb**: Both public pages show breadcrumb (pre-existing). ExamsPage (`/exams`) now also has "Home / Exam Library" breadcrumb. ✓
4. **Click exam → preview opens**: Preview modal opens with "Start Exam" CTA (since user is signed in). ✓
5. **Start Exam from preview**: `ExamModeSelectionModal` opens, user can choose mode. ✓
6. **Public browse still works**: No regression — public routes still accessible without sign-in. ✓

---

## Remaining Gaps in Live Firestore Data

The UI is ready for all fields below; the data pipeline just needs to populate them.

| Field | Status |
|---|---|
| `difficulty` | Hardcoded `'Medium'` in existing exam documents — real values needed per exam |
| `is_free` | Hardcoded `true` in existing documents — premium flag not yet set |
| `examAuthority` | Not populated — `UNEB`, `KNEC`, `NECTA` etc. need to be added to Firestore docs |
| `sourceType` | Not populated for Practice Papers |
| `country` | Populated (normalised via `normalizeCountryAndLevel`) — East Africa expansion needs new exam imports |
| `source` | Populated for Practice Papers via import pipeline |
| `description` | Uses `overallInstructions` from `V2Exam` — most papers have this |
| Multiple countries in browse | Currently only Uganda data — country filter pills will appear once Kenya/Tanzania/etc. exams are imported |
| `year = 0` | Some practice papers may have no year — hidden cleanly per fallback rules |

---

## Build / Type Check

```
npx tsc --noEmit   → 0 errors
npm run build      → ✓ built in 3.62s (pre-existing warnings only)
```

Pre-existing warnings (not caused by this pass):
- Dynamic import overlap on `admin.ts` (BusinessConsole)
- Bundle chunk size > 500 kB (entire app in one chunk — pre-existing)
