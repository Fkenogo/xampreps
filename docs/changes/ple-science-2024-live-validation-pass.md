# PLE Science 2024 Live Validation Pass

## Scope

- Exam: PLE Science 2024
- Exam ID: `v5sxOCgZRzbge9RWM3K0`
- Scope: authenticated student browser validation only
- No new exam import was run.
- No Science package re-import was run.

## Validation account

A dedicated student validation account was created for this pass:

- UID: `ha8v8S68C0ekQfD3cebpOn5tQlc2`
- Email: `science.validation.20260417@xampreps.local`
- Role: `student`

Firestore/Auth data changed for validation:

- Created or updated the validation Auth user.
- Created or updated matching `users`, `user_roles`, and `student_profiles` documents.
- Created live validation `exam_attempts` and `submissions` while testing answer save/check behavior.

No PLE Science exam content documents were re-imported.

## Scenarios tested

| Scenario | Result |
| --- | --- |
| Sign in as student | Passed |
| Public Past Papers card shows PLE Science 2024 | Passed |
| Authenticated library card action | Passed after fix: card now says `Start Exam` and opens mode selection |
| Preview modal opens | Passed |
| Preview metadata | Passed: Uganda, PLE, Science, 2024, 135 min, 55 questions |
| Start Exam flow | Passed: preview Start Exam opens mode selector, Practice Mode launches live exam |
| Runtime progress wording | Passed: `0/86 parts answered` |
| Runtime marks | Passed: exam header shows `100 marks` |
| Section A normal short answer | Passed |
| Image-backed Q5 | Passed: image loads from `/exam-assets/ple-science-2024/q5-q6-snail.jpeg` |
| Q45 table | Passed: rendered as a real table |
| Section B multi-part Q41 | Passed after renderer fix: no duplicated stem/prompt block |
| Correct auto-check | Passed: Q1 answer `Pit latrine` returns correct feedback and explanation |
| Incorrect auto-check | Passed after persistence fix: Q2 wrong answer returns incorrect feedback and correct answer |
| Manual-review messaging | Passed: Q41/Q45 manual interactions show manual-review guidance |

## Issues found and fixed

### 1. First answer check failed with permissions error

Observed:

- Clicking `Check answer` on Q1 produced `Missing or insufficient permissions`.
- Feedback did not return.

Root cause:

- `persistV2SubmissionFirebase()` called `getDoc(submissionRef)` before creating the first submission.
- Firestore rules allow reading an existing submission only when `resource.data.userId == request.auth.uid`.
- For a first-time submission, the document does not exist, so `resource.data.userId` cannot match and the read is denied before the create can happen.

Fix:

- Removed the pre-read from `persistV2SubmissionFirebase()`.
- Switched persistence to `setDoc(..., { merge: true })`.
- When preserving existing evaluation, the write no longer resets score/feedback fields.

File:

- `src/integrations/firebase/exams.ts`

### 2. Authenticated library card still said `Sign in to practice`

Observed:

- After student sign-in, PLE Science 2024 card still showed `Sign in to practice`.
- The card row could open preview, but the card action did not align with authenticated state.

Fix:

- `PublicBrowsePage` now uses auth state.
- Authenticated users see `Start Exam`.
- Authenticated card action opens the mode selection modal.

File:

- `src/pages/PublicBrowsePage.tsx`

### 3. List-card button click also triggered preview

Observed:

- Clicking the list card action could also bubble to the row preview handler.

Fix:

- Added `event.stopPropagation()` to the list item action button.

File:

- `src/components/exam-library/ExamListItem.tsx`

### 4. Section B multi-part items duplicated part text

Observed:

- Q41 rendered the full `(a)/(b)/(c)` question text as the item stem and again inside the interaction prompts.

Fix:

- For multi-part items with interaction prompts, `V2ItemRenderer` now trims repeated part text from the item stem.
- If the stem has a preamble before `(a)`, the preamble remains.
- Q45 keeps its table because it is not a repeated `(a)/(b)` stem block.

File:

- `src/components/exam/v2/V2ItemRenderer.tsx`

### 5. Duplicate part labels in prompts

Observed:

- Some prompts could render as `(a)(a) ...`.

Fix:

- `V2InteractionRenderer` strips a duplicate leading label from prompt text/markdown and renders the label once.

File:

- `src/components/exam/v2/V2InteractionRenderer.tsx`

### 6. Incorrect feedback used success styling

Observed:

- Incorrect feedback text was correct, but the panel background was green.

Fix:

- Feedback panel styling now switches by state:
  - green for correct
  - rose for incorrect
  - amber for manual review

File:

- `src/components/exam/v2/V2InteractionRenderer.tsx`

## Screenshots

- Preview modal: `docs/changes/ple-science-2024-live-preview.png`
- Live Section A question: `docs/changes/ple-science-2024-live-section-a-q1.png`
- Live image-backed question: `docs/changes/ple-science-2024-live-image-q5.png`
- Live Q45 table question: `docs/changes/ple-science-2024-live-q45-table.png`
- Live Section B multi-part question: `docs/changes/ple-science-2024-live-section-b-q41.png`
- Correct feedback state: `docs/changes/ple-science-2024-live-correct-feedback.png`
- Incorrect feedback state: `docs/changes/ple-science-2024-live-incorrect-feedback.png`

## Verification commands

```bash
npx tsc --noEmit
npm run build
```

Results:

- TypeScript: passed.
- Production build: passed.
- Build warnings only:
  - stale Browserslist data
  - existing large chunk warning
  - existing mixed dynamic/static import warning for `src/integrations/firebase/admin.ts`

## Final validation result

READY to move to PLE English 2024
