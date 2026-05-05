# Uganda Import File Inventory

## Date

2026-04-17

## Benchmark

The working Kenya import is `docs/data/kcpe-mathematics-2023-kenya-v2-import.json`. It is a V2 package with:

- `_meta`
- `exam`
- `sections`
- `instructionGroups`
- `items`
- `interactions`
- `markingRules`
- `modelAnswerVersions`

The Uganda files found in this audit are mostly legacy/import-admin formats. They contain usable content, but none are already shaped like the Kenya V2 package.

## PLE English 2024

### Source Files

- `docs/PLE English 2024.pdf` - official source PDF.
- `docs/Ple English 2024 (Answers + Explanations).docx` - answers/explanations source document.

### Candidate Import Files

- `docs/imports/ple-english-2024.insert-ready.json` - most complete local content file found.
  - Root shape: object.
  - Questions: 55.
  - Parts: 91.
  - Marks: 100.
  - Answer types: 50 `text`, 41 `open-ended`.
  - Contains `sections`, `sourceOfTruth`, `questionText`, `sharedContext`, `answerType`, and `partLabel` style fields.
  - Does not contain V2 `exam`, `items`, `interactions`, `markingRules`, or `modelAnswerVersions`.

### Audit / Lineage Reports

- `docs/audits/ple-english-2024-content-audit.md` - confirms source PDF, answer doc, and existing JSON; flags Q51(e), Q51(f), Q53(g), and Q55 for review.
- `docs/audits/ple-english-2024-pdf-audit.md` - PDF-level source audit.
- `docs/audits/ple-english-2024-schema-review.md` - documents the legacy `exams` / `questions` / `question_parts` import schema.
- `docs/audits/ple-english-2024-target-json-structure.md` - target structure notes for the legacy importer.
- `docs/audits/ple-english-2024-structure-fix-report.md` - says Section A structure was fixed locally to avoid duplicated prompts.
- `docs/audits/ple-english-2024-live-patch-report.md` - live Firestore patch report using the local fixed JSON as reference.
- `docs/audits/ple-english-2024-deletion-report.md` - live deletion/reset history.

### Scripts

- `functions/scripts/checkPleEnglish2024LiveStructure.js` - live diagnostic script.
- `functions/scripts/fixEnglish2024Structure.js` - local structural patch script.
- `functions/scripts/patchPleEnglish2024Structure.js` - live patch script.
- `functions/scripts/deletePleEnglish2024.js` - live deletion script.

### Recommended File

Use `docs/imports/ple-english-2024.insert-ready.json` as the source-of-content file only.

Do not import it directly into V2. It must first be converted into the Kenya-style V2 package shape and reviewed for the flagged comprehension/composition items.

### Obsolete / Conflicting Files

No competing English JSON variant was found. The conflict is not duplicate files; it is schema mismatch: this file is "insert-ready" for the legacy importer, not for the V2 importer.

## PLE Mathematics 2015

### Source Files

- No Maths source PDF was found in the repo.
- `docs/handover/2026-04-06-ple-maths-2015-final-insert-guide.md` references `PLE MATHS 2015-CLEAN2.pdf`, but that PDF is not present in the workspace.

### Image Assets

- `public/exam-assets/ple-maths-2015/Q9-symmetry .jpeg`
- `public/exam-assets/ple-maths-2015/q15-angles.jpeg`
- `public/exam-assets/ple-maths-2015/q16-venn-diagram.jpeg`
- `public/exam-assets/ple-maths-2015/q21a-q21b-venn-diagram.jpeg`
- `public/exam-assets/ple-maths-2015/q24-container.jpeg`
- `public/exam-assets/ple-maths-2015/q26a-q26b-parrellels.jpeg`
- `public/exam-assets/ple-maths-2015/q29a-q29b-perimeter.jpeg`
- `public/exam-assets/ple-maths-2015/q5-numberline.jpeg`
- `public/question-images/ple-maths-2015-q24-cylinders.jpg`
- `public/question-images/ple-maths-2015-q26-parallel-lines.jpg`
- `public/question-images/ple-maths-2015-q29-l-shape.jpg`

### Candidate Import Files

- `docs/imports/ple-maths-2015.import.json` - older legacy array import.
  - Questions: 32.
  - Parts: 44.
  - Marks: 100.
  - Images referenced: 8.
  - Answer types: 36 `numeric`, 6 `text`, 2 `open-ended`.
- `docs/imports/ple-maths-2015.final.import.json` - final legacy array import.
  - Questions: 32.
  - Parts: 44.
  - Marks: 100.
  - Images referenced: 8.
  - Answer types: 37 `numeric`, 4 `text`, 3 `open-ended`.
  - Changes from the older file include Q21(a) as open-ended, Q23 currency table reformatting, and Q27(b) as numeric `4.5`.

### Manifests / Reports

- `docs/imports/ple-maths-2015-image-manifest.md` - older image manifest; says 10 in summary but lists 8 images.
- `docs/imports/ple-maths-2015.final-image-manifest.md` - final image manifest; lists 8 images and matches the final insert guide.
- `docs/handover/2026-04-06-ple-maths-2015-import-package.md` - earlier handover report; points to `ple-maths-2015.import.json`.
- `docs/handover/2026-04-06-ple-maths-2015-final-insert-guide.md` - final insert guide; points to `ple-maths-2015.final.import.json`.

### Scripts

- `functions/scripts/setMaths2015ImageUrls.js` - live image URL setter.

### Recommended File

Use `docs/imports/ple-maths-2015.final.import.json` as the source-of-content file for the next Uganda V2 package.

Do not use `docs/imports/ple-maths-2015.import.json` unless comparing historical changes.

### Obsolete / Conflicting Files

- `docs/imports/ple-maths-2015.import.json` is superseded by `docs/imports/ple-maths-2015.final.import.json`.
- `docs/imports/ple-maths-2015-image-manifest.md` is superseded by `docs/imports/ple-maths-2015.final-image-manifest.md`.
- Local public image filenames do not exactly match the Firebase Storage paths in the JSON (`ple/maths/2015/q05-numberline.png`, etc.). Verify image URLs before import.

## PLE Science 2024

### Source Files

- No Science source PDF was found in the repo.
- `docs/imports/ple_science_2024_guide.md` - detailed tutor-dialogue guide used by parser/import scripts.

### Image Assets

- `public/exam-assets/ple-science-2024/q16-q17-kidney.jpeg`
- `public/exam-assets/ple-science-2024/q31-crop-planting-method.jpeg`
- `public/exam-assets/ple-science-2024/q44-digestive-system.jpeg`
- `public/exam-assets/ple-science-2024/q48-face-mask.jpeg`
- `public/exam-assets/ple-science-2024/q5-q6-snail.jpeg`
- `public/exam-assets/ple-science-2024/q51-weather-types.jpeg`
- `public/exam-assets/ple-science-2024/q55a-plane-mirror-cup.jpeg`
- `public/exam-assets/ple-science-2024/q55b-plane-mirror-reflection.jpeg`

### Candidate Import Files

- `docs/imports/ple-science-2024.guide.full.import.json` - parser output from the guide.
  - Questions: 55.
  - Parts: 76.
  - Marks: 76.
  - Empty question text: 18.
  - Empty answers: 5.
  - Not safe to use directly.
- `docs/imports/ple-science-2024.insert-ready.json` - cleaned legacy array import.
  - Questions: 55.
  - Parts: 80.
  - Marks: 120.
  - Empty question text: 0.
  - Empty answers: 0.
  - All parts are `open-ended`.
- `docs/imports/ple-science-2024.final.import.json` - later legacy array import.
  - Questions: 55.
  - Parts: 90.
  - Marks: 102.
  - Empty question text: 0.
  - Empty answers: 0.
  - Answer types: 64 `text`, 26 `open-ended`.
- `docs/imports/ple-science-2024.aligned.insert-ready.json` - aligned legacy array import.
  - Questions: 55.
  - Parts: 84.
  - Marks: 100.
  - Empty question text: 0.
  - Empty answers: 0.
  - All parts are `open-ended`.
  - Has acceptable answers on 71 parts.

### Handover / Check Files

- `docs/handover/2026-04-06-science-import-fix.md` - explains a historical import bug where Science appended to Maths because the import script had a hardcoded exam id.
- `docs/handover/2026-04-06-ple-science-2024-full-replacement.md` - says `guide.full.import.json` was used for a full replacement but still had known issues.
- `docs/handover/ple-science-2024-live-check.json` - malformed / incomplete JSON output.
- `docs/handover/ple-science-2024-section-b-check.json` - live check output, not an import source.
- `docs/handover/ple-science-2024-spotcheck.json` - spot-check output, not an import source.
- `docs/handover/ple-science-2024.pre-replacement-backup.json` - not valid JSON; starts with error output.

### Scripts

- `functions/scripts/parseScienceGuide.js` - parser from guide to import JSON.
- `functions/scripts/generateScienceImportFromGuide.js` - guide import generator.
- `functions/scripts/debugExtractQuestions.js` - live extraction / debug script.
- `functions/scripts/patchQ45Table.js` - table repair script.
- `functions/scripts/setScience2024ImageUrls.js` - live image URL setter.

### Recommended File

Do not select a Science file for immediate V2 import yet.

For reconciliation, use `docs/imports/ple-science-2024.aligned.insert-ready.json` as the primary content-aligned candidate because it has 55 questions, 100 marks, no empty question text, no empty answers, and many acceptable answers.

Keep `docs/imports/ple-science-2024.final.import.json` beside it during reconciliation because it has the expected 90 parts from earlier handover notes but totals 102 marks and lacks acceptable-answer arrays.

### Obsolete / Conflicting Files

- `docs/imports/ple-science-2024.guide.full.import.json` is superseded and has known parser issues.
- `docs/imports/ple-science-2024.insert-ready.json` is superseded by later/aligned variants.
- `docs/imports/ple-science-2024.final.import.json` and `docs/imports/ple-science-2024.aligned.insert-ready.json` conflict on parts count, total marks, answer types, and acceptable answers. Do not import either until reconciled.
- Science image assets exist in `public/exam-assets/ple-science-2024`, but the candidate JSON files have `image_url: null`.

## Overall Safe Selection

The cleanest next Uganda source is:

`docs/imports/ple-maths-2015.final.import.json`

It has the least content ambiguity, a final guide, a final image manifest, complete answers/explanations, 100 total marks, and only three open-ended parts.
