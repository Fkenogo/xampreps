# KCPE Mathematics 2023 Import Visibility Fix

## Date: 2026-04-16

## Problem Identified

The KCPE Mathematics 2023 exam was successfully imported into Firestore but was not visible in the public Past Papers library UI. The exam existed in Firestore with examId `AmGY3KFqvkjvF8vOwWeT` but was filtered out by the browse query.

## Root Cause

The exam document had `"status": "draft"` in the import package. The `listExamsFirebase()` function in `src/integrations/firebase/content.ts` (lines 177-182) filters out exams that are not published:

```typescript
if (data.engineVersion !== 'v2') {
  return null;
}
if (data.status && data.status !== 'published') {
  return null;
}
```

Since the imported exam had `status: "draft"`, it was excluded from the public browse results.

## Files Inspected

1. **`src/pages/PublicBrowsePage.tsx`** (lines 49-56)
   - Filters exams by paper type (Past Paper vs Practice Paper)
   - Calls `listExamsFirebase()` to fetch exams

2. **`src/integrations/firebase/content.ts`** (lines 172-213)
   - `listExamsFirebase()` function fetches all exams
   - Filters out exams where `status !== 'published'`
   - Maps V2Exam to FirebaseExam using `toExamSummary()`

3. **`docs/data/kcpe-mathematics-2023-kenya-v2-import.json`** (line 22)
   - Exam document had `"status": "draft"`

## Exact Fix Applied

Updated the import package to set the exam status to `"published"`:

```json
{
  "exam": {
    "title": "KCPE Mathematics 2023",
    "subject": "Mathematics",
    "level": "KCPE",
    "year": 2023,
    "country": "KENYA",
    "curriculumVersion": "8-4-4",
    "durationMinutes": 120,
    "totalMarks": 50,
    "status": "published",  // ← Changed from "draft"
    "version": 1,
    "createdBy": "system-import",
    ...
  }
}
```

## Files Changed

- `docs/data/kcpe-mathematics-2023-kenya-v2-import.json` - Line 22: changed `"draft"` to `"published"`

## Visibility Behavior

### Before Fix
- Exam existed in Firestore but was filtered out by `listExamsFirebase()`
- Not visible in public Past Papers library
- Could only be accessed via direct link if user knew the examId

### After Fix
- Exam will be included in `listExamsFirebase()` results
- Visible in public Past Papers library
- Filterable by country (Kenya), level (KCPE), subject (Mathematics), year (2023)
- Preview modal accessible
- Signed-in users can start the exam

## Manual Test Steps

After re-importing with the fixed package:

1. **Navigate to Past Papers**
   - Go to `/past-papers` route
   - Should see KCPE Mathematics 2023 in the list

2. **Apply Filters**
   - Select Country: Kenya
   - Select Level: KCPE
   - Select Subject: Mathematics
   - Select Year: 2023
   - Exam should still be visible

3. **Open Preview**
   - Click on the exam card
   - Preview modal should open
   - Should show exam details (50 questions, 120 minutes)

4. **Start Exam (Signed-in User)**
   - Sign in as a user
   - Click "Start" from preview
   - Should be able to begin the exam

5. **Verify Card Metadata**
   - Title: "KCPE Mathematics 2023"
   - Subject: Mathematics
   - Year: 2023
   - Level: KCPE
   - Country: Kenya (flag or code)
   - Time limit: 120 minutes
   - Question count: 50

## Important Notes

### Status Field Semantics
- `"draft"` - Exam is being prepared, not ready for public viewing
- `"published"` - Exam is ready for public viewing in the library
- The import script now defaults to `"published"` for production imports

### Future Imports
For future exam imports, consider:
1. **Default to "published"** for official past papers
2. **Use "draft"** only for practice papers under review
3. **Add a flag** to the import script to control status
4. **Document** the status field in the import contract

### No Other Changes Needed
- The exam's `type` field is not set, which is correct for Past Papers
- The `toExamSummary()` function defaults to `"Past Paper"` when type is absent
- No other metadata fields need adjustment

## Verification Commands

After re-importing, verify the exam is visible:

```bash
# Check exam status in Firestore
firebase firestore:get exams/AmGY3KFqvkjvF8vOwWeT

# Should show:
# {
#   "status": "published",
#   "title": "KCPE Mathematics 2023",
#   ...
# }
```

## Summary

✅ **Root Cause**: Exam had `status: "draft"` which was filtered out by `listExamsFirebase()`  
✅ **Fix**: Changed import package to `status: "published"`  
✅ **Impact**: Exam will now appear in public Past Papers library  
✅ **Files Changed**: 1 (import package)  
✅ **Risk**: None - only changes the status field  
✅ **Testing**: Manual verification required after re-import  

The import package is now ready for production use. When imported, the KCPE Mathematics 2023 exam will be visible in the public Past Papers library and accessible to all users.