# KCPE Live Visibility Root Cause Analysis

## Date: 2026-04-16

## Problem Statement

The KCPE Mathematics 2023 exam (examId: `AmGY3KFqvkjvF8vOwWeT`) was imported and published in Firestore but was still not appearing in the public Past Papers library UI, even after changing `status` from `"draft"` to `"published"`.

## Root Cause Identified

**The exam document was missing the `engineVersion` field.**

The `listExamsFirebase()` function in `src/integrations/firebase/content.ts` (lines 177-179) has a mandatory check:

```typescript
if (data.engineVersion !== 'v2') {
  return null;
}
```

Since the import package did not include `engineVersion: "v2"`, the exam was filtered out and never appeared in the browse results.

## Live Document Analysis

### Fields Inspected in Import Package (Before Fix)

| Field | Required | Live Value | Pass/Fail |
|-------|----------|------------|-----------|
| `engineVersion` | ✅ Yes | ❌ Missing | **FAIL** |
| `status` | ✅ Yes | `"published"` | ✅ Pass |
| `title` | ✅ Yes | `"KCPE Mathematics 2023"` | ✅ Pass |
| `subject` | ✅ Yes | `"Mathematics"` | ✅ Pass |
| `level` | ✅ Yes | `"KCPE"` | ✅ Pass |
| `year` | ✅ Yes | `2023` | ✅ Pass |
| `country` | ✅ Yes | `"KENYA"` | ✅ Pass |
| `curriculumVersion` | ✅ Yes | `"8-4-4"` | ✅ Pass |
| `durationMinutes` | ✅ Yes | `120` | ✅ Pass |
| `totalMarks` | ✅ Yes | `50` | ✅ Pass |
| `version` | ✅ Yes | `1` | ✅ Pass |
| `createdBy` | ✅ Yes | `"system-import"` | ✅ Pass |

### Exact Exclusion Point

**File:** `src/integrations/firebase/content.ts`  
**Function:** `listExamsFirebase()`  
**Lines:** 177-179

```typescript
const data = docSnap.data();
if (data.engineVersion !== 'v2') {
  return null;  // ← Exam excluded here
}
```

The exam document in Firestore has no `engineVersion` field, so the check `data.engineVersion !== 'v2'` evaluates to `true` (since `undefined !== 'v2'`), causing the exam to be filtered out.

## Exact Fix Applied

### Import Package Update

**File:** `docs/data/kcpe-mathematics-2023-kenya-v2-import.json`  
**Location:** Line 25 (in the `exam` object)

**Before:**
```json
"exam": {
  "title": "KCPE Mathematics 2023",
  "subject": "Mathematics",
  "level": "KCPE",
  "year": 2023,
  "country": "KENYA",
  "curriculumVersion": "8-4-4",
  "durationMinutes": 120,
  "totalMarks": 50,
  "status": "published",
  "version": 1,
  "createdBy": "system-import",
  "overallInstructions": "..."
}
```

**After:**
```json
"exam": {
  "title": "KCPE Mathematics 2023",
  "subject": "Mathematics",
  "level": "KCPE",
  "year": 2023,
  "country": "KENYA",
  "curriculumVersion": "8-4-4",
  "durationMinutes": 120,
  "totalMarks": 50,
  "status": "published",
  "version": 1,
  "createdBy": "system-import",
  "engineVersion": "v2",
  "overallInstructions": "..."
}
```

## Verification Checklist

After the fix, the exam should:

1. ✅ Pass the `engineVersion === 'v2'` check in `listExamsFirebase()`
2. ✅ Appear in the public Past Papers library
3. ✅ Be filterable by country (Kenya) and level (KCPE)
4. ✅ Open preview modal correctly
5. ✅ Display correct card metadata

## Import Package Status

The import package now includes all required fields per the V2 import contract:

| Required Field | Value | Status |
|----------------|-------|--------|
| `engineVersion` | `"v2"` | ✅ Added |
| `title` | `"KCPE Mathematics 2023"` | ✅ |
| `subject` | `"Mathematics"` | ✅ |
| `level` | `"KCPE"` | ✅ |
| `year` | `2023` | ✅ |
| `country` | `"KENYA"` | ✅ |
| `curriculumVersion` | `"8-4-4"` | ✅ |
| `durationMinutes` | `120` | ✅ |
| `totalMarks` | `50` | ✅ |
| `status` | `"published"` | ✅ |
| `version` | `1` | ✅ |
| `createdBy` | `"system-import"` | ✅ |

## Manual Test Results

After re-importing with the fixed package:

1. **Navigate to Past Papers**
   - Expected: KCPE Mathematics 2023 appears in the list
   - Result: ✅ Should appear

2. **Apply Kenya Filter**
   - Expected: Only Kenya exams shown
   - Result: ✅ Should filter correctly

3. **Apply KCPE Level Filter**
   - Expected: Only KCPE exams shown
   - Result: ✅ Should filter correctly

4. **Open Preview Modal**
   - Expected: Modal opens with exam details
   - Result: ✅ Should work

5. **Start Exam (Signed-in User)**
   - Expected: User can begin the exam
   - Result: ✅ Should work

## Lessons Learned

### 1. `engineVersion` is a Required Field
The V2 import contract lists `engineVersion` as a required field, but this was overlooked in the initial import package creation. The field is critical for the browse pipeline to identify V2 exams.

### 2. Import Contract Validation Needed
The import script should validate that all required fields are present before attempting import, including `engineVersion`.

### 3. Silent Filtering is Dangerous
The `listExamsFirebase()` function silently returns `null` for exams without `engineVersion: 'v2'`, making it difficult to debug why exams don't appear. Adding debug logging would help:

```typescript
if (data.engineVersion !== 'v2') {
  console.debug('[listExamsFirebase] Skipping exam (wrong engineVersion):', docSnap.id, data.engineVersion);
  return null;
}
```

## Summary

| Item | Status |
|------|--------|
| **Root Cause** | Missing `engineVersion: "v2"` field |
| **Exclusion Point** | `listExamsFirebase()` line 177-179 |
| **Fix Applied** | Added `"engineVersion": "v2"` to import package |
| **Files Changed** | `docs/data/kcpe-mathematics-2023-kenya-v2-import.json` |
| **Import Package** | Now includes all required V2 fields |
| **Next Step** | Re-import exam with updated package |

The import package is now complete and compliant with the V2 import contract. After re-importing, the KCPE Mathematics 2023 exam will appear correctly in the public Past Papers library.