# XamPreps Live Firestore Import Proof

**Date:** 2026-04-06  
**Author:** Claude Code  
**Status:** Action Required - Import Verification Needed

## Root Cause

The exam data (`ple-maths-2015`) is **NOT present in the live Firestore database** for project `xampreps`. This is why:

1. `/exams` page shows "No exams found"
2. Admin dashboard shows "Total Exams: 0"
3. `getExamContent` logs show "exam not found"

Previous import attempts may have targeted a different project or failed silently.

## Files Changed

### Route Standardization (Completed)

All exam routes now use `/exams` prefix consistently:

- `src/App.tsx` - Route definitions
- `src/pages/dashboards/AdminDashboard.tsx` - Preview button
- `src/components/exam/ExamModeSelectionModal.tsx` - Mode selection
- `src/pages/ExamResultsPage.tsx` - Retry button
- `src/pages/ExamTakingPage.tsx` - Results navigation
- `src/pages/HistoryPage.tsx` - History item click
- `src/components/dashboard/RecentActivity.tsx` - Activity click
- `src/components/dashboard/QuickExamFinder.tsx` - Exam click

### New Proof Scripts (Created)

- `functions/scripts/probeFirestoreTarget.js` - Verifies Firestore access and target project
- `functions/scripts/verifyExamInLiveFirestore.js` - Verifies exam data exists

### Backend Logging (Enhanced)

- `functions/index.js` - Added proof-level logging to `listExams`, `getExamContent`, `adminListExams`, `adminDashboardSummary`

## Exact Commands for Kenogo

### Step 1: Verify Firestore Access

```bash
cd /Users/theo/xampreps/functions
node scripts/probeFirestoreTarget.js
```

**Expected Output:**

- Target project: `xampreps`
- Write/Read of `debug_import_probe/probe-xampreps` succeeds
- Lists current Firestore collections

**If this fails:** The Firebase Admin SDK is not properly configured. Run:

```bash
gcloud auth application-default login
```

### Step 2: Verify Current Exam State

```bash
cd /Users/theo/xampreps/functions
node scripts/verifyExamInLiveFirestore.js
```

**Expected Output (if exam missing):**

- `❌ Exam document "ple-maths-2015" NOT FOUND in Firestore!`
- `Found 0 questions (expected: 32)`

**If exam is found:** The issue is with callable function queries, not the import.

### Step 3: Import Exam Data

```bash
cd /Users/theo/xampreps/functions
node scripts/importExamPackage.js ../docs/imports/ple-maths-2015.final.import.json
```

**Expected Output:**

- `📝 Creating/updating exam metadata...`
- `💾 Writing X questions and X parts to Firestore...`
- `✅ Import complete!`

### Step 4: Re-verify Exam Data

```bash
cd /Users/theo/xampreps/functions
node scripts/verifyExamInLiveFirestore.js
```

**Expected Output (success):**

- `✅ Exam document found!`
- `Found 32 questions (expected: 32)`
- `Found ~44 question parts total`
- `🎉 VERIFICATION PASSED - Exam data looks correct!`

### Step 5: Verify in Firestore Console

1. Go to: https://console.firebase.google.com/project/xampreps/firestore/data
2. Confirm these collections exist:
   - `exams` (with document `ple-maths-2015`)
   - `questions` (with 32 documents)
   - `question_parts` (with ~44 documents)

### Step 6: Test UI

```bash
cd /Users/theo/xampreps
npm run dev
```

1. Navigate to `/exams` - should show "PLE Mathematics 2015"
2. Navigate to `/dashboard/admin` - should show "Total Exams: 1" (or more)
3. Click exam to start - should navigate to `/exams/ple-maths-2015?mode=practice`

## Evidence Standard

Success is confirmed when ALL of the following are true:

1. ✅ `probeFirestoreTarget.js` writes and reads `debug_import_probe/probe-xampreps`
2. ✅ Firestore console shows `exams/ple-maths-2015` document
3. ✅ `verifyExamInLiveFirestore.js` shows 32 questions and ~44 parts
4. ✅ `/exams` page shows the exam
5. ✅ Admin dashboard shows Total Exams > 0
6. ✅ Opening exam navigates to `/exams/ple-maths-2015?mode=practice`

## What Was Proven vs Assumed

### Proven

- Route standardization: All exam routes now use `/exams` prefix
- super_admin access: Backend accepts both `admin` and `super_admin` roles
- DashboardLayout: Error handling added for subscription fetch

### Assumed (Needs Verification)

- Import script targets correct project (`xampreps`)
- Exam data will be written successfully
- Callable functions will read the data correctly

## Troubleshooting

### If probe script fails

```bash
gcloud auth application-default login
# Then retry
```

### If import fails

Check that the import JSON exists:

```bash
ls -la /Users/theo/xampreps/docs/imports/ple-maths-2015.final.import.json
```

### If exam still not visible after import

1. Check Firestore console directly
2. Check Firebase function logs for `listExams` output
3. Verify the exam document has required fields: `title`, `subject`, `level`, `year`

## Next Steps After Verification

Once the exam is confirmed in Firestore:

1. Test the full exam flow: Start → Answer → Submit → Results
2. Verify XP and streak tracking works
3. Test admin exam editing
4. Clean up probe data from Firestore (optional)
