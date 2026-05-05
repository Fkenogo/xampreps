# PLE Mathematics 2015 Pre-Dry-Run Cleanup Pass

## Date

2026-04-17

## Scope

Pre-dry-run cleanup for:

`docs/data/ple-maths-2015-uganda-v2-import.json`

No Firestore writes were performed. No import was executed. No files in `public/exam-assets` were renamed or moved.

## Files Changed

- `docs/data/ple-maths-2015-uganda-v2-import.json`
- `scripts/dry-run-v2-import-package.mjs`

## Item Status Decision

Decision: keep `status: "draft"` on all `items[]`.

Reason: the working KCPE benchmark package, `docs/data/kcpe-mathematics-2023-kenya-v2-import.json`, uses `status: "draft"` for every item. The Uganda package already matched that behavior, so no status value was changed and no new enum value was introduced.

Status check:

- Kenya item statuses: `draft`
- Uganda item statuses: `draft`

## Image Path Cleanup

The image files had already been fixed manually on disk. This pass only updated JSON references where needed.

Updated:

- Q9 changed from `/exam-assets/ple-maths-2015/Q9-symmetry%20.jpeg` to `/exam-assets/ple-maths-2015/Q9-symmetry.jpeg`

No file rename was performed.

## Image Verification Results

All `mediaRefs` now point to existing files:

| item | URL | local file | result |
| --- | --- | --- | --- |
| `item_q5` | `/exam-assets/ple-maths-2015/q5-numberline.jpeg` | `public/exam-assets/ple-maths-2015/q5-numberline.jpeg` | valid |
| `item_q9` | `/exam-assets/ple-maths-2015/Q9-symmetry.jpeg` | `public/exam-assets/ple-maths-2015/Q9-symmetry.jpeg` | valid |
| `item_q15` | `/exam-assets/ple-maths-2015/q15-angles.jpeg` | `public/exam-assets/ple-maths-2015/q15-angles.jpeg` | valid |
| `item_q16` | `/exam-assets/ple-maths-2015/q16-venn-diagram.jpeg` | `public/exam-assets/ple-maths-2015/q16-venn-diagram.jpeg` | valid |
| `item_q21` | `/exam-assets/ple-maths-2015/q21a-q21b-venn-diagram.jpeg` | `public/exam-assets/ple-maths-2015/q21a-q21b-venn-diagram.jpeg` | valid |
| `item_q24` | `/exam-assets/ple-maths-2015/q24-container.jpeg` | `public/exam-assets/ple-maths-2015/q24-container.jpeg` | valid |
| `item_q26` | `/exam-assets/ple-maths-2015/q26a-q26b-parrellels.jpeg` | `public/exam-assets/ple-maths-2015/q26a-q26b-parrellels.jpeg` | valid |
| `item_q29` | `/exam-assets/ple-maths-2015/q29a-q29b-perimeter.jpeg` | `public/exam-assets/ple-maths-2015/q29a-q29b-perimeter.jpeg` | valid |

## Validation Results

Validation passed:

- All required top-level V2 package keys are present.
- All instruction groups reference existing sections.
- All items reference existing sections and instruction groups.
- All items have at least one interaction.
- All interactions reference existing items.
- All interactions reference existing marking rules.
- All model answer versions reference existing items and interactions.
- No orphan marking rules found.
- `totalMarks = 100`.
- `interaction count = 44`.
- `marking rule count = 44`.
- `model answer version count = 44`.
- `manual review interactions = 3`.
- `manualReviewDefault` matches `markingRule.manualReviewRequired`.
- All media references point to existing files.

## Consistency Check

Clean consistency check passed:

- Multipart items have multiple interactions.
- Single-interaction items are not marked as multipart.
- Auto-checkable interactions use non-manual marking rules.
- Manual-review interactions use `manualReviewRequired`.
- Only the expected three interactions require manual review:
  - `int_q21_a`
  - `int_q32_a`
  - `int_q32_b`

## Dry-Run Command

Use this local dry-run validation command:

```bash
node scripts/dry-run-v2-import-package.mjs docs/data/ple-maths-2015-uganda-v2-import.json
```

This command only reads and validates the package. It does not write to Firestore.

## Final Verdict

READY for dry-run validation.
