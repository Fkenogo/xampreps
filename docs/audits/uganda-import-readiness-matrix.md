# Uganda Import Readiness Matrix

## Date

2026-04-17

## V2 Readiness Standard

The successful Kenya reference file is `docs/data/kcpe-mathematics-2023-kenya-v2-import.json`.

To go straight into the current V2 import path, an exam package should provide:

- `exam` metadata with `country`, `level`, `curriculumVersion`, `durationMinutes`, `totalMarks`, `status`, `version`, `createdBy`, and `engineVersion: "v2"`.
- `sections`.
- `instructionGroups`.
- `items`.
- `interactions`.
- `markingRules`.
- `modelAnswerVersions`.

The Uganda files audited here do not yet meet that package shape as-is. They should be treated as source-of-content files for a controlled V2 packaging pass, not direct V2 imports.

## Matrix

| exam | source PDF | final aligned JSON | final insert-ready JSON | readiness | risk level | notes | recommended order |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PLE Mathematics 2015 | Not found in repo. Final guide references `PLE MATHS 2015-CLEAN2.pdf`. | None in V2 shape. Legacy final source: `docs/imports/ple-maths-2015.final.import.json`. | `docs/imports/ple-maths-2015.final.import.json` | Needs minor correction / mechanical V2 packaging | Low | Best Uganda candidate. 32 questions, 44 parts, 100 marks, complete answers/explanations, 8 image references, 37 numeric parts, 4 text parts, 3 open-ended parts. Needs V2 `exam` wrapper, sections, instruction groups, items/interactions/marking rules/model answers, `engineVersion: "v2"`, and image URL verification. | 1 |
| PLE Science 2024 | Not found in repo. Primary source found is `docs/imports/ple_science_2024_guide.md`. | Candidate only: `docs/imports/ple-science-2024.aligned.insert-ready.json`. Conflicts with `docs/imports/ple-science-2024.final.import.json`. | No safe final selected. `docs/imports/ple-science-2024.aligned.insert-ready.json` is the preferred reconciliation base, not direct import. | Needs structural completion | Medium | Multiple conflicting JSONs. `aligned.insert-ready` has 55 questions, 84 parts, 100 marks, acceptable answers, but all parts are open-ended and image URLs are null. `final.import` has 90 parts and mixed answer types but totals 102 marks and lacks acceptable answers. Must reconcile before V2 packaging. | 2 |
| PLE English 2024 | `docs/PLE English 2024.pdf` | None in V2 shape. Legacy content source: `docs/imports/ple-english-2024.insert-ready.json`. | `docs/imports/ple-english-2024.insert-ready.json` | Needs structural completion | High | Complete content source with 55 questions, 91 parts, 100 marks, PDF and answer doc present. Still uses legacy/object fields such as `questionText`, `sharedContext`, `answerType`, and composition-style open-ended content. Prior audit flags Q51(e), Q51(f), Q53(g), and Q55 for review. Needs V2 packaging and careful manual-review/rubric mapping. | 3 |

## Per-Exam Assessment

### PLE Mathematics 2015

Readiness: needs minor correction / mechanical V2 packaging.

Why:

- The content file is final among the Maths variants.
- It is complete by legacy-import standards.
- It has low ambiguity and mostly auto-checkable numeric/text answers.
- It is not V2-shaped. It has no V2 `exam` object, no `engineVersion`, no `sections`, no `instructionGroups`, no V2 `items`, no `interactions`, no `markingRules`, and no `modelAnswerVersions`.
- Image paths need verification because local public assets use `.jpeg`/`.jpg` filenames while the JSON points to Firebase Storage-style `.png` paths.

Recommended action:

Use `docs/imports/ple-maths-2015.final.import.json` to create the next Kenya-style V2 package. Do not import the legacy array directly.

### PLE Science 2024

Readiness: needs structural completion.

Why:

- There are multiple conflicting "final" candidates.
- `docs/imports/ple-science-2024.guide.full.import.json` has known parser issues: empty question text and empty answers.
- `docs/imports/ple-science-2024.aligned.insert-ready.json` is strongest for total marks and acceptable answers, but it has fewer parts than `final.import`, all parts are open-ended, and image URLs are null.
- `docs/imports/ple-science-2024.final.import.json` has the expected 90 parts from historical reports, but totals 102 marks and lacks acceptable answers.
- Existing Science image assets are not referenced by the JSON candidates.

Recommended action:

Reconcile `docs/imports/ple-science-2024.aligned.insert-ready.json` against `docs/imports/ple-science-2024.final.import.json` before V2 packaging. Do not import Science next.

### PLE English 2024

Readiness: needs structural completion.

Why:

- It has the best source evidence: official PDF and answer/explanation doc are in the repo.
- The JSON is complete by legacy-content standards, but not V2-shaped.
- It contains many open-ended structures: passage comprehension, poem, table, picture story, and composition.
- Existing audits flag Q51(e), Q51(f), Q53(g), and Q55 for review.
- Q55 has no single answer and needs a manual-review/rubric approach in V2.

Recommended action:

Do not import English before Maths/Science. Use `docs/imports/ple-english-2024.insert-ready.json` as the source-of-content file after flagged items are reviewed and V2 manual-review structures are planned.

## Recommended Import Order

1. PLE Mathematics 2015.
   - Lowest risk.
   - Complete final legacy source.
   - Mostly auto-checkable.
   - Smallest content set: 32 questions.
2. PLE Science 2024.
   - Medium risk after reconciliation.
   - Needs conflict resolution and image linking before V2 packaging.
3. PLE English 2024.
   - Highest structural risk.
   - Most complex open-ended paper.
   - Needs manual-review/rubric mapping, especially composition.

## Exact Next Step

Import next: PLE Mathematics 2015.

Use this source file for the V2 packaging pass:

`docs/imports/ple-maths-2015.final.import.json`

It should not go straight to import yet. It needs one controlled mechanical preparation step first: convert the final legacy array into a Kenya-style V2 package with `engineVersion: "v2"`, V2 metadata, sections/instruction groups, item/interactions, marking rules, model answer versions, and verified image URLs.
