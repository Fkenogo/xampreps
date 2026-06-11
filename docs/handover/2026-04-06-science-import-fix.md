# Science Import Fix - Handover Report

**Date:** 2026-04-06  
**Status:** ✅ RESOLVED - Both exams now exist separately

## Root Cause

The import script (`functions/scripts/importExamPackage.js`) had the exam ID **hardcoded** as `ple-maths-2015` on line 51:

```javascript
const examId = "ple-maths-2015"; // HARDCODED!
```

This caused ALL imports to target the same exam document, regardless of the actual exam being imported. When importing Science 2024, the questions were appended to the Maths 2015 exam instead of creating a new `ple-science-2024` exam.

## Files Changed

### 1. `functions/scripts/importExamPackage.js`

- Removed hardcoded exam ID
- Added command-line argument parsing for exam metadata (`--id`, `--title`, `--subject`, `--level`, `--year`, `--timeLimit`, etc.)
- Added support for embedded metadata in JSON files (`{ exam: {...}, questions: [...] }`)
- Added metadata validation (fails hard if required fields missing)
- Added metadata preview before import
- Added filename vs metadata mismatch warning

### 2. `functions/scripts/verifyExamInLiveFirestore.js`

- Updated to accept exam ID as command-line argument
- Usage: `node scripts/verifyExamInLiveFirestore.js ple-maths-2015`

### 3. `functions/scripts/cleanupExam.js`

- Updated to use shared `initAdmin` helper for consistent project targeting

## Cleanup Performed

1. **Cleaned up corrupted Maths exam:**
   - Deleted 55 questions and 102 parts (mixed Maths + Science)
   - Preserved exam document metadata

2. **Re-imported Maths exam correctly:**
   - 32 questions, 44 parts restored
   - Exam ID: `ple-maths-2015`

3. **Imported Science exam as separate exam:**
   - 55 questions, 90 parts created
   - Exam ID: `ple-science-2024`

## Final Commands for Kenogo

### Verify both exams exist:

```bash
export GCLOUD_PROJECT=xampreps
cd functions

# Verify Maths
node scripts/verifyExamInLiveFirestore.js ple-maths-2015

# Verify Science
node scripts/verifyExamInLiveFirestore.js ple-science-2024
```

### Import a new exam:

```bash
cd functions
node scripts/importExamPackage.js ../docs/imports/new-exam.json \
  --id new-exam-id \
  --title "Exam Title" \
  --subject "Subject" \
  --level PLE \
  --year 2024 \
  --timeLimit 135
```

### Clean up an exam (delete all questions):

```bash
cd functions
node scripts/cleanupExam.js exam-id-to-clean
```

## Expected Results

### ple-maths-2015

- Title: PLE Mathematics 2015
- Subject: Mathematics
- Level: PLE
- Year: 2015
- Questions: 32
- Parts: 44

### ple-science-2024

- Title: PLE Integrated Science 2024
- Subject: Integrated Science
- Level: PLE
- Year: 2024
- Questions: 55
- Parts: 90

## Prevention

The import script now:

1. Requires explicit exam metadata via CLI arguments
2. Validates all required fields before import
3. Prints metadata preview before writing
4. Warns if filename suggests different exam than metadata
5. Fails hard if project ID is not `xampreps`
