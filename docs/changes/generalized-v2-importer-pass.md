# Generalized V2 Importer Pass

## Date

2026-04-17

## Goal

Generalize the working KCPE Mathematics 2023 standalone Firestore importer so the same import path can validate and import any XamPreps V2 package file, starting with:

- `docs/data/ple-maths-2015-uganda-v2-import.json`

No Firestore import was executed in this pass.

## Files Changed

- `scripts/import-v2-package.mjs`
- `docs/changes/generalized-v2-importer-pass.md`

## Root Difference From The KCPE-Only Importer

The previous proven importer was package-specific and hardcoded to the KCPE Mathematics 2023 Kenya package. The new importer accepts package and credential paths from the CLI:

- `--package <path>`
- `--service-account <path>`
- `--dry-run`

The core Firestore import contract remains aligned with the KCPE importer:

1. exam
2. sections
3. instructionGroups
4. items
5. markingRules
6. interactions
7. modelAnswerVersions

The local reference mapping is preserved:

- section refs are mapped before instruction groups and items
- item refs are mapped before interactions and model answer versions
- marking rule refs are mapped before interactions
- interaction refs are mapped before model answer versions

## Validation Behavior

The generalized importer validates required V2 top-level sections before any write path:

- `exam`
- `sections`
- `instructionGroups`
- `items`
- `interactions`
- `markingRules`
- `modelAnswerVersions`

It also validates:

- instruction group to section refs
- item to section refs
- item to instruction group refs
- interaction to item refs
- interaction to marking rule refs
- model answer to item refs
- model answer to interaction refs
- orphan marking rules
- item media file existence under `public/`
- manual review consistency between interactions and marking rules
- multipart items having multiple interactions
- summed item marks matching `exam.totalMarks`

## Duplicate Protection

Before a real import, the script checks `exams` for an existing document with the same:

- `title`
- `year`
- `country`
- `subject`
- `engineVersion`

If a match is found, the importer stops with a duplicate warning and does not write the package. No override flag was added in this pass.

Duplicate checking is skipped in dry-run mode because dry-run performs no Firestore writes and may run without credentials.

## Uganda Dry-Run Command

Command run in this pass:

```bash
node scripts/import-v2-package.mjs --dry-run --package docs/data/ple-maths-2015-uganda-v2-import.json
```

Credentialed dry-run command supported by the importer:

```bash
node scripts/import-v2-package.mjs --dry-run --service-account /absolute/path/service-account.json --package docs/data/ple-maths-2015-uganda-v2-import.json
```

## Uganda Real Import Command

```bash
node scripts/import-v2-package.mjs --service-account /absolute/path/service-account.json --package docs/data/ple-maths-2015-uganda-v2-import.json
```

## Dry-Run Output

```text
🚀 XamPreps V2 Package Importer
   Mode: DRY RUN - no Firestore writes
   Package: /Users/theo/xampreps/docs/data/ple-maths-2015-uganda-v2-import.json
   Exam: PLE Mathematics 2015
   Credential source: not loaded (dry-run without service account)

0. Validating package...
   ✅ Package shape validated
   ✅ 32 item(s) validated
   ✅ 44 interaction(s) validated
   ✅ 44 marking rule(s) validated
   ✅ 44 model answer version(s) validated

📊 Dry Run Summary:
   Would create 1 exam
   Would create 2 section(s)
   Would create 2 instruction group(s)
   Would create 32 item(s)
   Would create 44 marking rule(s)
   Would create 44 interaction(s) after marking rules
   Would create 44 model answer version(s)
   Duplicate exam guard would run before real import

✅ Dry run completed successfully. No data was written to Firestore.
```

## Final Verdict

READY for real import after this pass, subject to supplying the correct service-account JSON path and passing the duplicate exam guard.

No Firestore writes were performed.
