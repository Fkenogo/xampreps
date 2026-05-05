# PLE English 2024 Recovery Pass

Date: 2026-04-21  
Live V2 exam ID: `weBoSWQcIi7ZjyDPVx3I`

## Scope

Recovered PLE English 2024 into the current V2 exam system without touching Kenya content, PLE Science 2024 content, PLE Mathematics 2015 content, or the marking engine.

## Inventory Of Old English Files Found

- `docs/imports/ple-english-2024.insert-ready.json`
  - Best source of truth for recoverable question content.
  - Contains 55 questions, 91 parts/interactions, 100 marks, shared Section B contexts, answers, acceptable alternatives, and explanations.
- `docs/Ple-English-2024-Answers+Explanations.md`
  - Supporting answer/explanation source.
  - Content aligns with the answers embedded in the insert-ready JSON.
- `docs/Ple-English-2024-Answers+Explanations.docx`
  - Original answer/explanation document source.
- `docs/PLE-English-2024.pdf`
  - Official paper source.
- `docs/PLE ENGLISH 2024-UGANDA copy.md`
  - Legacy extracted/source note; not used as the package source.
- `dist/exam-assets/ple-english-2024/q54-story.png`
  - Recovered image asset for Q54 picture story.
  - Copied to `public/exam-assets/ple-english-2024/q54-story.png` for V2 serving/validation.
- `functions/scripts/fixEnglish2024Structure.js`
  - Old legacy-shape fixer for duplicated prompts/missing instructions.
  - Obsolete for V2 packaging, but useful audit evidence.
- `functions/scripts/checkPleEnglish2024LiveStructure.js`
  - Old live legacy-collection checker.
  - Obsolete for V2 packaging.
- `functions/scripts/patchPleEnglish2024Structure.js`
  - Old legacy Firestore patcher.
  - Obsolete for V2 packaging.
- `functions/scripts/deletePleEnglish2024.js`
  - Old cleanup script for legacy `exams/questions/question_parts`.
  - Useful audit evidence; not used for the V2 import.
- `docs/audits/ple-english-2024-content-audit.md`
  - Confirms content completeness and flags Q51(e), Q51(f), Q53(g), and Q55 for careful handling.
- `docs/audits/ple-english-2024-deletion-report.md`
  - Records prior deletion of old Firestore legacy English content.
- `docs/audits/ple-english-2024-live-patch-report.md`
  - Records prior legacy patch before the later deletion.
- `docs/audits/ple-english-2024-pdf-audit.md`
- `docs/audits/ple-english-2024-schema-review.md`
- `docs/audits/ple-english-2024-structure-fix-report.md`
- `docs/audits/ple-english-2024-target-json-structure.md`
- `docs/audits/uganda-import-file-inventory.md`
- `docs/audits/uganda-import-readiness-matrix.md`
  - Supporting audit/history files; not used as primary package data.

## Firestore Audit Result

Read-only audit before import found:

- `exams/ple-english-2024`: not present.
- Legacy `questions` linked to `ple-english-2024`: none sampled/found.
- Duplicate V2 guard matches for title/year/country/subject/engineVersion: none.

Decision: patching was not possible or safer because no live English exam existed. A clean V2 import was safer than trying to revive legacy collection shapes.

## Recovery Decision

Selected path: **B. recover content from old files and create a clean V2 package**.

Reason:

- The legacy insert-ready JSON was complete enough to salvage.
- The old live Firestore record had already been deleted.
- The old JSON used pre-V2 fields and legacy `questions/question_parts` assumptions.
- English needed true V2 context blocks for passage, poem, table, picture story, and composition prompt.
- Manual review could safely cover English phrasing gaps without marking-engine changes.

## Files Created Or Updated

- Created `scripts/build-ple-english-2024-v2-package.mjs`
- Created `docs/data/ple-english-2024-uganda-v2-import.json`
- Created `docs/changes/ple-english-2024-recovery-pass.md`
- Copied `public/exam-assets/ple-english-2024/q54-story.png`
- Updated `scripts/dry-run-v2-import-package.mjs`
  - Added optional `contextBlocks` validation and media checks.
- Updated `scripts/import-v2-package.mjs`
  - Added optional `contextBlocks` creation and `contextBlockRefs` resolution to live `contextBlockIds`.

## V2 Package Summary

- Exam: 1
- Sections: 2
- Instruction groups: 15
- Context blocks: 7
- Items: 55
- Interactions: 91
- Marking rules: 91
- Model answer versions: 91
- Total marks: 100
- Media refs: 1

## Marking Strategy

- Auto exact/alias interactions: 28
  - Q1-Q28 are auto-checkable fixed grammar/objective answers.
  - Marking modes:
    - `exactMatch`: 21
    - `alternativeAnswers`: 7
- Manual-review interactions: 63
  - Q29-Q30 word-in-sentence tasks.
  - Q31-Q50 sentence rewriting tasks.
  - Q51-Q54 comprehension/picture-story tasks.
  - Q55 composition.
- Flexible marking:
  - No broad flexible/keyword marking was added.
  - Only safe recovered aliases use `alternativeAnswers` for:
    - `mr_int_q5`
    - `mr_int_q9`
    - `mr_int_q13`
    - `mr_int_q16`
    - `mr_int_q21`
    - `mr_int_q23`
    - `mr_int_q26`
- Q55 uses `rubricBasedManualReview`.

## Gap Handling

- Q51(e) and Q51(f): kept manual-review only because prior audit flagged potential source mismatch.
- Q53(g): kept manual-review and added teacher note requiring all three Thursday pupil names.
- Q55: kept manual-review with teacher guidance for letter format, thanks, game-park details, lessons learnt, language control, and relevance.
- No risky auto-check rules were invented for comprehension, picture story, rewrite, sentence writing, or composition.

## Validation And Spot Inspection

Commands run:

```bash
node scripts/build-ple-english-2024-v2-package.mjs
node scripts/dry-run-v2-import-package.mjs docs/data/ple-english-2024-uganda-v2-import.json
node scripts/import-v2-package.mjs --dry-run --package docs/data/ple-english-2024-uganda-v2-import.json
npx tsc --noEmit
npm run build
```

Validation result:

- Package dry-run: passed.
- Generalized importer dry-run: passed.
- TypeScript: passed.
- Build: passed with existing Vite/chunk-size warnings only.

Representative item inspection:

- Q1 fixed short answer: `exactMatch`, auto-check.
- Q31 rewrite: manual review with recovered model answer/alternative.
- Q51 passage comprehension: shared `passage` context block, manual review.
- Q52 poem comprehension: shared `poem` context block, manual review.
- Q54 picture story: shared guide text plus recovered image context block, manual review.
- Q55 composition/letter: shared `compositionPrompt`, `rubricBasedManualReview`.

No MCQ item was present in the recovered English source package.

## Live Import

Live action selected: clean V2 import.

Reason:

- No existing English exam was present to patch.
- Duplicate guard had no pre-import match.
- Clean V2 import avoids legacy `questions/question_parts` shape and inserts into current V2 collections.

Live import command:

```bash
GCLOUD_PROJECT=xampreps node scripts/import-v2-package.mjs --use-adc --project-id xampreps --package docs/data/ple-english-2024-uganda-v2-import.json
```

First live import attempt stopped at context-block creation because Firestore rejected nested array table rows in Q53:

```text
INVALID_ARGUMENT: Property tableData contains an invalid nested entity.
```

Fix:

- Updated the package builder to convert Q53 table rows from nested arrays to object rows keyed by `col_1`, `col_2`, etc.
- Cleaned up the partial failed import `R8L986Te5WHKaQpbmmPi`:
  - context blocks: 3
  - instruction groups: 15
  - sections: 2
  - exam: 1
  - no items/interactions/marking rules/model answers had been created.

Second live import completed successfully:

```text
Created examId: weBoSWQcIi7ZjyDPVx3I
Sections: 2
Instruction Groups: 15
Context Blocks: 7
Items: 55
Marking Rules: 91
Interactions: 91
Model Answer Versions: 91
```

Final live readback:

```text
examExists: true
title: PLE English 2024
sections: 2
instruction_groups: 15
context_blocks: 7
items: 55
interactions: 91
referencedMarkingRules: 91
existingReferencedMarkingRules: 91
modelAnswerVersionsByItem: 91
```

Note: `marking_rules` and `model_answer_versions` do not carry `examId` in the current importer pattern, so final verification counted them through interaction/item references.

## Unresolved Risks

- Q51(e), Q51(f), and Q53(g) remain intentionally manual-review due to prior audit flags.
- Q55 is intentionally manual-review; no automated scoring was attempted.
- The V2 importer now supports context blocks, but existing older packages without `contextBlocks` remain compatible because the field is optional.
