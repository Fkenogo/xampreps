# PLE Science 2024 Structure Correction Pass

Date: 2026-04-17

## Scope

PLE Science 2024 only.

- Exam ID: `v5sxOCgZRzbge9RWM3K0`
- Package: `docs/data/ple-science-2024-uganda-v2-import.json`
- No PLE English 2024 work
- No Kenya exam work
- No broad renderer refactor

## Root Cause: Duplicated Question Text

The V2 item renderer displayed both:

- the item stem, and
- the interaction prompt.

For many single-answer Science items, those two strings were materially identical. For some image-backed or context-backed items, the item stem contained shared context plus the same final prompt repeated again in the interaction.

Fix:

- If a single interaction prompt is materially identical to the whole item stem, the renderer hides the duplicated interaction prompt.
- If the item stem contains shared context and ends with the same prompt used by the interaction, the renderer removes only that trailing repeated prompt from the stem.
- Multipart items continue to keep shared context, diagrams, and table introductions while rendering each distinct subpart prompt.

This is renderer-only for duplication suppression.

## Section B Interaction Shape Audit

The PDF was used as the source of truth for answer-line and subpart shape.

| question | subpart | current interaction shape before fix | expected interaction shape from PDF | fix required |
|---|---|---|---|---|
| Q41 | (b) | one manual textarea worth 2 marks | two distinct answer lines, `(i)` and `(ii)` | yes |
| Q42 | (a)-(d) | one field per subpart | one answer per subpart | no |
| Q43 | (c) | one manual textarea worth 2 marks | two distinct advantages, `(i)` and `(ii)` | yes |
| Q44 | (a) | one answer field for labels X, W, and Y | separate label answers for X, W, and Y | yes |
| Q44 | (b) | one answer field for functions of Y and Z | separate answers for function of Y and function of Z | yes |
| Q45 | table | one field per missing table cell | four table completions | no |
| Q46 | (a)-(d) | one field per subpart | one answer per subpart | no |
| Q47 | (a) | one manual textarea worth 2 marks | two materials, `(i)` and `(ii)` | yes |
| Q48 | (b) | one manual textarea worth 2 marks | two diseases, `(i)` and `(ii)` | yes |
| Q49 | (b) | one manual textarea worth 2 marks | two sound storage methods, `(i)` and `(ii)` | yes |
| Q50 | (c) | one manual textarea worth 2 marks | two human activities, `(i)` and `(ii)` | yes |
| Q51 | (a)-(c) | one field per subpart | one answer per subpart | no |
| Q52 | (a)-(d) | one field per subpart | one answer per subpart | no |
| Q53 | (b) | one manual textarea worth 2 marks | two effects, `(i)` and `(ii)` | yes |
| Q54 | (a) | one answer field for two muscles | two muscle answers, `(i)` and `(ii)` | yes |
| Q55 | (a)-(b) | one field per subpart, but labels needed cleanup | one answer per subpart | label cleanup only |

## Content Corrections

I corrected the V2 package and applied a targeted Firestore patch. A full re-import was not needed.

Changed combined interactions:

- Q41(b): split into `int_q41_b_i` and `int_q41_b_ii`
- Q43(c): split into `int_q43_c_i` and `int_q43_c_ii`
- Q44(a): split into `int_q44_a_x`, `int_q44_a_w`, and `int_q44_a_y`
- Q44(b): split into `int_q44_b_y_function` and `int_q44_b_z_function`
- Q47(a): split into `int_q47_a_i` and `int_q47_a_ii`
- Q48(b): split into `int_q48_b_i` and `int_q48_b_ii`
- Q49(b): split into `int_q49_c_i` and `int_q49_c_ii`
- Q50(c): split into `int_q50_c_i` and `int_q50_c_ii`
- Q53(b): split into `int_q53_c_i` and `int_q53_c_ii`
- Q54(a): split into `int_q54_a_i` and `int_q54_a_ii`

Q44(a) keeps the original 2-mark total by distributing the three label fields as `0.67`, `0.67`, and `0.66` marks.

Marking rules and model answer versions were updated to match the new interaction IDs. The resulting graph has no orphan references.

## Firestore Changes

Used a targeted Science-only Firestore patch, not a re-import.

Collections/documents changed:

- `exams/v5sxOCgZRzbge9RWM3K0`
  - `interactionCount` updated to `97`
  - `updatedAt` refreshed
- `interactions`
  - deleted 10 combined Section B interactions
  - created 21 split interactions
  - updated labels/prompts for existing Q49, Q53, and Q55 interactions
- `marking_rules`
  - deleted 10 combined marking rules
  - created 21 split marking rules
- `model_answer_versions`
  - deleted 10 combined model answer versions
  - created 21 split model answer versions

## Files Changed

- `src/components/exam/v2/V2ItemRenderer.tsx`
- `docs/data/ple-science-2024-uganda-v2-import.json`
- `docs/changes/ple-science-2024-structure-correction-pass.md`

Validation screenshots:

- `docs/changes/ple-science-2024-structure-q1-clean.png`
- `docs/changes/ple-science-2024-structure-q16-image.png`
- `docs/changes/ple-science-2024-structure-q41b-split.png`
- `docs/changes/ple-science-2024-structure-q43c-split.png`
- `docs/changes/ple-science-2024-structure-q44-labels.png`
- `docs/changes/ple-science-2024-structure-q47a-split.png`
- `docs/changes/ple-science-2024-structure-q48b-split.png`
- `docs/changes/ple-science-2024-structure-q45-table.png`

## Validation

Package dry-run:

```json
{
  "packagePath": "docs/data/ple-science-2024-uganda-v2-import.json",
  "examTitle": "PLE Science 2024",
  "sections": 2,
  "instructionGroups": 2,
  "items": 55,
  "interactions": 97,
  "markingRules": 97,
  "modelAnswerVersions": 97,
  "totalMarks": 100,
  "manualReviewInteractions": 40,
  "mediaRefs": 8,
  "warnings": [],
  "errors": []
}
```

Firestore graph validation:

```json
{
  "interactions": 97,
  "uniqueRules": 97,
  "missingRules": 0,
  "interactionsWithModelAnswers": 97
}
```

Live authenticated browser validation:

- Q1 duplication gone
- Q16 image-backed item keeps the diagram context and displays the image
- Q41(b) renders two separate answer fields
- Q43(c) renders two separate answer fields
- Q44(a) renders separate X, W, and Y fields
- Q44(b) renders separate Y and Z function fields
- Q47(a) renders two separate material fields
- Q48(b) renders two separate disease fields
- Q45 table still renders as a table
- Runtime header shows `0/97 parts answered`
- Q1 correct answer check returns correct feedback and explanation
- No runtime error was observed

Build checks:

- `npx tsc --noEmit`: passed
- `npm run build`: passed

Build warnings observed:

- Browserslist data is out of date
- Existing Vite dynamic/static import chunking warning for `src/integrations/firebase/admin.ts`
- Large bundle size warning

## Final Result

PLE Science 2024 is now CLEAN and READY to move to PLE English 2024
