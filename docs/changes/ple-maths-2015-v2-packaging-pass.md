# PLE Mathematics 2015 V2 Packaging Pass

## Date

2026-04-17

## Scope

Prepared PLE Mathematics 2015 as a Kenya-style V2 import package.

No Firestore writes were performed. No import was executed.

## Files Used

- Source file: `docs/imports/ple-maths-2015.final.import.json`
- Benchmark file: `docs/data/kcpe-mathematics-2023-kenya-v2-import.json`
- Source PDF: `docs/PLE-Maths-2015.pdf`
- Image assets: `public/exam-assets/ple-maths-2015/`

## Output

- V2 package: `docs/data/ple-maths-2015-uganda-v2-import.json`

## Package Shape

The output mirrors the working Kenya package top-level structure:

- `_meta`
- `exam`
- `sections`
- `instructionGroups`
- `items`
- `interactions`
- `markingRules`
- `modelAnswerVersions`

## Exam Metadata

The exam object was populated for browse/render/import compatibility:

- `title`: `PLE Mathematics 2015`
- `subject`: `Mathematics`
- `level`: `PLE`
- `year`: `2015`
- `country`: `UGANDA`
- `curriculumVersion`: `PLE`
- `durationMinutes`: `150`
- `totalMarks`: `100`
- `status`: `published`
- `version`: `1`
- `createdBy`: `system-import`
- `engineVersion`: `v2`
- `sourceFiles`: includes `PLE-Maths-2015.pdf`

## Mapping Decisions

### Section Structure

Used the paper structure from the final Maths handover:

| section | questions | marks |
| --- | --- | --- |
| Section A | Q1-Q20 | 40 |
| Section B | Q21-Q32 | 60 |

### Instruction Groups

Used two minimal instruction groups:

- `ig_q1_20` for Section A.
- `ig_q21_32` for Section B.

This follows the Kenya package style of broad, simple instruction groups rather than over-fragmenting the paper.

### Items

Created one V2 item per source question:

- Source questions: 32.
- V2 items: 32.
- Question order preserved by `orderIndex`.
- Question number preserved in stable refs like `item_q21`.
- Source text preserved in `stemMarkdown`.
- Multipart questions use `layoutMode: "multiPart"`.
- Image-backed questions include `mediaRefs`.

### Interactions

Created one interaction per source answer part:

- Source parts: 44.
- V2 interactions: 44.
- Numeric and short text answers use `responseMode: "textShort"`.
- Drawing / diagram-completion answers use `responseMode: "textarea"` and manual review.

Manual-review interactions:

- Q21(a): complete Venn diagram.
- Q32(a): sketch journey.
- Q32(b): accurate scale diagram.

All other interactions are auto-checkable.

### Marking Rules

Created one marking rule per interaction:

- Marking rules: 44.
- Auto-checkable numeric/text answers use `markingMode: "normalizedTextMatch"`.
- Numeric answers set `normalizationProfile.normalizeNumeric: true` and `allowUnitOmission: true`.
- Manual-review answers use `markingMode: "manualReviewRequired"`.

### Model Answer Versions

Created one model answer version per interaction:

- Model answer versions: 44.
- `approvedAnswer` comes from the source `answer`.
- `explanation` comes from the source `explanation`.
- Status is `approved`.
- `updatedBy` is `system-import`.

## Counts

| entity | count |
| --- | ---: |
| sections | 2 |
| instruction groups | 2 |
| items | 32 |
| interactions | 44 |
| marking rules | 44 |
| model answer versions | 44 |
| total marks | 100 |
| image-backed items | 8 |
| manual-review interactions | 3 |

## Image Verification

The legacy source JSON used Firebase Storage-style PNG paths. The V2 package corrects those to local public assets where a clear matching file exists.

| question | source reference | V2 package URL | local asset | status |
| --- | --- | --- | --- | --- |
| Q5 | `ple/maths/2015/q05-numberline.png` | `/exam-assets/ple-maths-2015/q5-numberline.jpeg` | `public/exam-assets/ple-maths-2015/q5-numberline.jpeg` | valid |
| Q9 | `ple/maths/2015/q09-symmetry.png` | `/exam-assets/ple-maths-2015/Q9-symmetry%20.jpeg` | `public/exam-assets/ple-maths-2015/Q9-symmetry .jpeg` | valid |
| Q15 | `ple/maths/2015/q15-angle.png` | `/exam-assets/ple-maths-2015/q15-angles.jpeg` | `public/exam-assets/ple-maths-2015/q15-angles.jpeg` | valid |
| Q16 | `ple/maths/2015/q16-venn.png` | `/exam-assets/ple-maths-2015/q16-venn-diagram.jpeg` | `public/exam-assets/ple-maths-2015/q16-venn-diagram.jpeg` | valid |
| Q21 | `ple/maths/2015/q21-venn.png` | `/exam-assets/ple-maths-2015/q21a-q21b-venn-diagram.jpeg` | `public/exam-assets/ple-maths-2015/q21a-q21b-venn-diagram.jpeg` | valid |
| Q24 | `ple/maths/2015/q24-cylinders.png` | `/exam-assets/ple-maths-2015/q24-container.jpeg` | `public/exam-assets/ple-maths-2015/q24-container.jpeg` | valid |
| Q26 | `ple/maths/2015/q26-parallel-lines.png` | `/exam-assets/ple-maths-2015/q26a-q26b-parrellels.jpeg` | `public/exam-assets/ple-maths-2015/q26a-q26b-parrellels.jpeg` | valid |
| Q29 | `ple/maths/2015/q29-composite-shape.png` | `/exam-assets/ple-maths-2015/q29a-q29b-perimeter.jpeg` | `public/exam-assets/ple-maths-2015/q29a-q29b-perimeter.jpeg` | valid |

Missing assets: none.

Path corrections needed: all 8 legacy PNG references were corrected in the V2 package.

## Validation

Local package validation passed:

- Required top-level keys present.
- All instruction groups reference existing sections.
- All items reference existing sections and instruction groups.
- All interactions reference existing items and marking rules.
- All model answer versions reference existing items and interactions.
- Summed item marks equal `exam.totalMarks` (`100`).
- All corrected image assets exist locally.

## Assumptions

- `curriculumVersion` is set to `PLE` because the Kenya benchmark requires the field and no more specific Uganda curriculum version is present in the source file.
- `durationMinutes` is set to `150`, matching the final Maths handover.
- `status` is set to `published` so the package will be visible in the public browse pipeline after a successful import, matching the request.
- `textShort` is used as the numeric-capable response mode because the current V2 response enum has no dedicated numeric input mode.
- The package preserves images in `item.mediaRefs`; rendering should be verified during dry-run/preview because current UI behavior depends on V2 media rendering support.

## Dry-Run Readiness

Ready for dry-run import validation.

Remaining caveat before live import:

- Use a dry-run importer that can target `docs/data/ple-maths-2015-uganda-v2-import.json` rather than the Kenya hardcoded package path.
- Confirm V2 preview rendering displays `item.mediaRefs` for the 8 diagram/image questions.
