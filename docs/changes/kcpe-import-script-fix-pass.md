# KCPE Mathematics 2023 Import Script Fix Pass

## Date: 2026-04-16

## Problem Identified

The original import scripts created interactions before marking rules, but did not patch interactions afterward with the real Firestore `markingRuleId`. This meant the imported exam would render but auto-marking would fail because interactions had a local `markingRuleRef` instead of the real Firestore `markingRuleId`.

## Exact Fix Made

### 1. Reordered Creation Steps
Changed the write order from:
- Old: Exam → Sections → InstructionGroups → Items → Interactions → MarkingRules → MAVs
- New: Exam → Sections → InstructionGroups → Items → **MarkingRules → Interactions** → MAVs

### 2. Marking Rule Linkage
The fixed script now:
1. Creates all marking rules first and maps local refs (`mr_q1`, `mr_q2`, etc.) to real Firestore IDs
2. When creating interactions, looks up the real `markingRuleId` from the reference map
3. Writes interactions with the real `markingRuleId` field (not the local ref)
4. Removes the local `markingRuleRef` field from interaction documents before writing

### 3. Cleaned Scaffolding Fields
The script now removes all temporary helper refs before writing to Firestore:
- `sectionRef` - removed from items
- `instructionGroupRef` - removed from items
- `itemRef` - removed from interactions
- `interactionRef` - removed from model answer versions
- `markingRuleRef` - removed from interactions (replaced with real `markingRuleId`)

### 4. Added Validation Mode
- `--dry-run` or `-d` flag to validate without writing
- Validates all references before attempting import
- Fails fast if any marking rule cannot be linked

## Script Chosen as Primary

**`scripts/import-kcpe-mathematics-2023-standalone.mjs`**

This script uses Firebase Admin SDK and requires environment variables:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## Interaction → MarkingRuleId Linkage Status

✅ **Complete** - All 50 interactions will be created with valid `markingRuleId` values.

The linkage flow:
```
importPackage.interactions[i].markingRuleRef → markingRules[j].ref
                                              ↓
                                        markingRuleId (real Firestore ID)
                                              ↓
                                        interactions collection document
```

## Command to Run

```bash
# Dry run (validation only)
node scripts/import-kcpe-mathematics-2023-standalone.mjs --dry-run

# Actual import (requires credentials)
export FIREBASE_PROJECT_ID="xampreps-427913"
export FIREBASE_CLIENT_EMAIL="service-account@xampreps-427913.iam.gserviceaccount.com"
export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
node scripts/import-kcpe-mathematics-2023-standalone.mjs

# Verbose mode (shows stack traces on errors)
node scripts/import-kcpe-mathematics-2023-standalone.mjs --verbose
```

## Expected Post-Import Counts

| Collection | Count | Notes |
|------------|-------|-------|
| exams | 1 | KCPE Mathematics 2023 |
| sections | 1 | Section A |
| instruction_groups | 1 | Questions 1-50 |
| items | 50 | All questions |
| marking_rules | 50 | Answer keys |
| interactions | 50 | All with valid markingRuleId |
| model_answer_versions | 50 | With explanations |

## RubricId Status

✅ **Not needed** - This is an MCQ exam. Rubrics are only needed for constructed response questions that require manual grading with detailed scoring criteria.

## Files Modified

- `scripts/import-kcpe-mathematics-2023-standalone.mjs` - Complete rewrite with fixes

## Verification Steps

After import, verify the linkage by checking a sample interaction:

```bash
# Get an interaction document
firebase firestore:get interactions/[interaction-id]

# Should show:
# {
#   "interactionId": "...",
#   "itemId": "...",
#   "examId": "...",
#   "markingRuleId": "...",  ← Real Firestore ID, not a local ref
#   "responseMode": "selectSingle",
#   ...
# }
```

## Summary

The import script is now production-ready with:
- ✅ Proper marking rule linkage (markingRuleId)
- ✅ Clean document structure (no scaffolding fields)
- ✅ Dry-run validation mode
- ✅ Comprehensive error handling
- ✅ Reference validation before write