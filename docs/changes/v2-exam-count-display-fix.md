# V2 Exam Count Display Fix

## Date

2026-04-17

## Goal

Fix shared V2 browse and preview metadata so exam marks are not displayed as question counts.

## Root Cause

`listExamsFirebase()` builds the shared `FirebaseExam` summary used by public browse cards, list rows, preview modals, and related exam list surfaces.

The question-count fallback chain included:

- `data.totalMarks`

PLE Mathematics 2015 has:

- item count: 32
- interaction count: 44
- total marks: 100

Because `totalMarks` was in the fallback chain, `getQuestionCount()` received `100` as a fallback and returned it immediately instead of counting `items`. The UI then rendered `100 Q's`.

## Files Changed

- `src/integrations/firebase/content.ts`
- `src/components/exam-library/ExamCard.tsx`
- `src/components/exam-library/ExamListItem.tsx`
- `src/components/exam-library/ExamPreviewModal.tsx`
- `src/components/dashboard/QuickExamFinder.tsx`
- `docs/changes/v2-exam-count-display-fix.md`

## Fix

`totalMarks` was removed from the question-count fallback chain.

The mapper now uses only explicit count metadata when present:

- `questionCount`
- `question_count`
- `totalQuestions`
- `total_questions`
- `itemCount`
- `item_count`
- `totalItems`
- `total_items`

If no explicit count metadata exists, it queries the V2 `items` collection for the exam and uses the item count.

The display copy was also changed from `Q's` to a clearer label:

- `32 questions`
- `50 questions`

## Before / After

PLE Mathematics 2015:

- Before: `100 Q's`
- After: `32 questions`

KCPE Mathematics 2023:

- Before: `50 Q's`
- After: `50 questions`

## Final Display Decision

Display item count as questions.

Reason:

- V2 `items` are the displayed exam questions.
- V2 `interactions` are answer parts.
- The current shared `FirebaseExam` summary only carries one count field, `question_count`.
- Showing both `32 questions` and `44 parts` would require expanding the summary contract and adding interaction-count metadata/querying, which is beyond this narrow cleanup pass.

## Validation

Local package validation:

```text
KCPE Mathematics 2023: before=50 displayed questions; after=50 questions; interactions=50; marks=50
PLE Mathematics 2015: before=100 displayed questions; after=32 questions; interactions=44; marks=100
```

Build validation:

```text
npx tsc --noEmit
```

Passed with no output.

```text
npm run build
```

Passed. Vite reported existing non-blocking warnings:

- Browserslist/caniuse-lite data is old.
- `src/integrations/firebase/admin.ts` is both dynamically and statically imported.
- Some chunks are larger than 500 kB after minification.
