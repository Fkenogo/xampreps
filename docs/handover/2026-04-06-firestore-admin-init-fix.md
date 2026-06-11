# XamPreps Firestore Admin Init Fix

**Date:** 2026-04-06  
**Status:** ✅ RESOLVED - Exam data imported successfully

## Root Cause

The Firebase Admin SDK was not picking up the `GCLOUD_PROJECT` environment variable when initializing, causing `projectId` to be `undefined`. This resulted in scripts failing to connect to the correct Firestore project.

**Why:** The Admin SDK's default initialization (`admin.initializeApp()`) relies on ADC (Application Default Credentials) which may not always resolve the project ID from environment variables in all contexts.

## Files Changed

### New Shared Init Helper

- `functions/scripts/lib/initAdmin.js` - Deterministic Firebase Admin initialization with explicit project ID resolution

### Updated Scripts

- `functions/scripts/probeFirestoreTarget.js` - Now uses shared init helper
- `functions/scripts/verifyExamInLiveFirestore.js` - Now uses shared init helper
- `functions/scripts/importExamPackage.js` - Now uses shared init helper

## Init Strategy

The shared helper (`initAdmin.js`) resolves project ID with strict precedence:

1. **Service Account JSON** `project_id` (if `GOOGLE_APPLICATION_CREDENTIALS` file exists)
2. **`GOOGLE_CLOUD_PROJECT`** environment variable
3. **`GCLOUD_PROJECT`** environment variable
4. **Fail hard** with clear error message

When using ADC, the helper explicitly passes `projectId` to `initializeApp()`:

```javascript
admin.initializeApp({
  projectId,
  credential: admin.credential.applicationDefault(),
});
```

## Terminal Output - Proof

### 1. Probe Script (Firestore Access)

```
$ GCLOUD_PROJECT=xampreps node scripts/probeFirestoreTarget.js

🔍 XamPreps Firestore Target Probe

📋 Environment:
   GOOGLE_APPLICATION_CREDENTIALS: (not set)
   GOOGLE_CLOUD_PROJECT: (not set)
   GCLOUD_PROJECT: xampreps
   FIRESTORE_EMULATOR_HOST: (not set)

🔐 Firebase Admin Init:
   Credential Mode: Application Default Credentials (ADC)
   Resolved Project ID: xampreps
   ✅ Firebase Admin initialized successfully

📊 Target Project Verification:
   Expected: xampreps
   Actual: xampreps
   ✅ Match confirmed!

✍️  Writing probe document...
   Collection: debug_import_probe
   Document: probe-xampreps
   ✅ Write successful!

📖 Reading probe document back...
   ✅ Read successful!

📊 Current Firestore collections:
   - debug_import_probe
   - profiles
   - user_progress
   - user_roles

🎉 PROBE COMPLETE - Firestore access verified for project "xampreps"
```

### 2. Verify Before Import

```
$ GCLOUD_PROJECT=xampreps node scripts/verifyExamInLiveFirestore.js

📄 Checking exam document...
❌ Exam document "ple-maths-2015" NOT FOUND in Firestore!

📝 Checking questions...
   Found 0 questions (expected: 32)
   ❌ No questions found!

📋 Checking question parts...
   Found 0 question parts total (expected: ~44)
   ❌ No question parts found!

⚠️  VERIFICATION INCOMPLETE
```

### 3. Import Exam Data

```
$ GCLOUD_PROJECT=xampreps node scripts/importExamPackage.js ../docs/imports/ple-maths-2015.final.import.json

📦 XamPreps Exam Package Importer (Idempotent)

📄 Loaded 32 questions from /Users/theo/xampreps/docs/imports/ple-maths-2015.final.import.json

🔐 Firebase Admin Init:
   Credential Mode: Application Default Credentials (ADC)
   Resolved Project ID: xampreps
   ✅ Firebase Admin initialized successfully

📋 Target Project: xampreps

📝 Creating/updating exam metadata...
   ID: ple-maths-2015
   Title: PLE Mathematics 2015
   Subject: Mathematics
   Level: PLE
   Year: 2015
   Questions: 32

💾 Writing 32 questions and 44 parts to Firestore...

✅ Import complete!
   Exam ID: ple-maths-2015
   Questions created: 32
   Question parts created: 44
   Total marks: 100

🔍 Verifying import...
   ✅ Exam document exists
   ✅ Questions count: 32 (expected: 32)

🎉 Exam is now available in the library!
```

### 4. Verify After Import

```
$ GCLOUD_PROJECT=xampreps node scripts/verifyExamInLiveFirestore.js

📄 Checking exam document...
   ✅ Exam document found!
   Title: PLE Mathematics 2015
   Subject: Mathematics
   Level: PLE
   Year: 2015
   Question Count: 32

📝 Checking questions...
   Found 32 questions (expected: 32)
   ✅ Question count matches!

📋 Checking question parts...
   Found 44 question parts total (expected: ~44)
   ✅ Part count looks correct!

🎉 VERIFICATION PASSED - Exam data looks correct!
```

## Evidence Standard - All Met ✅

1. ✅ `probeFirestoreTarget.js` writes and reads `debug_import_probe/probe-xampreps`
2. ✅ Firestore console shows `exams/ple-maths-2015` document
3. ✅ `verifyExamInLiveFirestore.js` shows 32 questions and 44 parts
4. ✅ Import script successfully wrote data to project `xampreps`

## Commands for Kenogo

### Set environment and run scripts:

```bash
export GCLOUD_PROJECT=xampreps

# Verify Firestore access
cd functions && node scripts/probeFirestoreTarget.js

# Verify exam data
node scripts/verifyExamInLiveFirestore.js

# Re-import if needed (idempotent)
node scripts/importExamPackage.js ../docs/imports/ple-maths-2015.final.import.json
```

## Firestore Collections Now Present

- `exams` - Contains `ple-maths-2015` document
- `questions` - Contains 32 question documents
- `question_parts` - Contains 44 part documents
- `debug_import_probe` - Probe verification document (can be deleted)

## Next Steps

1. **Test UI:** Run `npm run dev` and verify:
   - `/exams` shows "PLE Mathematics 2015"
   - `/dashboard/admin` shows Total Exams: 1
   - Clicking exam opens `/exams/ple-maths-2015?mode=practice`

2. **Optional cleanup:** Delete `debug_import_probe` collection from Firestore console

3. **Deploy functions:** Already deployed - `firebase deploy --only functions` was run
