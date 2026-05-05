# PLE English 2024 Target Formatting Pass

Date: 2026-04-21  
Live exam ID: `weBoSWQcIi7ZjyDPVx3I`

## Scope

Narrow live Firestore content-alignment pass for PLE English 2024 Q16-Q30 only.

Not touched:

- Kenya content
- PLE Mathematics 2015
- PLE Science 2024
- Marking rules
- Interactions
- Renderer code
- Later English questions
- Whole-exam import/package rebuild

## Audit Result

Live audit confirmed:

- `exams/weBoSWQcIi7ZjyDPVx3I` exists and is `PLE English 2024`.
- Q16-Q30 are V2 `items` under live `instruction_groups`.
- Target words/phrases were plain text in `items.stemMarkdown`.
- Existing `MarkdownRenderer` supports bold markdown in `stemMarkdown`.
- True underline is not currently supported by the safe Markdown path because raw HTML is escaped and `_..._` renders italic, not underline.
- Q28 was assigned to the Q28-Q30 instruction group, even though its stem belongs to the “one word for the underlined group of words” family.

Decision: **content-only targeted Firestore patch**. No renderer support was required.

## Root Cause Per Issue

- Q16/Q17: target short forms were present but not visually isolated in `stemMarkdown`.
- Q20/Q21: the stems referenced an “underlined word”, but the target words were plain text.
- Q26-Q28 grouping: import-time grouping placed Q28 under the Q28-Q30 word-in-sentence instruction group.
- Q26-Q28 phrase marking: stems referenced “underlined group of words”, but the target phrases were plain text.
- Q29/Q30: homophone target words were present but visually blended into the prompt.

## Firestore Docs Patched

### Items

- `items/y2yhM5a9uQZrqYsczIx0`
  - Q16 `stemMarkdown`
- `items/rXX5YfkglSWaqEaQy8Ys`
  - Q17 `stemMarkdown`
- `items/09PcgSqSOvoEt24pp14u`
  - Q20 `stemMarkdown`
- `items/DV4h7IYmcYxRIpqRnwDg`
  - Q21 `stemMarkdown`
- `items/kJ6YBcyaLNAPzY6D5LFQ`
  - Q26 `stemMarkdown`
- `items/cGFb4EivlLvrDYsYDDzZ`
  - Q27 `stemMarkdown`
- `items/gbSktyHIgTyJbkKQg2DH`
  - Q28 `stemMarkdown`
  - Q28 `instructionGroupId` moved to `dJJZEZomEcieFx7GCz2G`
- `items/p85WR91Lq7uuHBSiBKnk`
  - Q29 `stemMarkdown`
- `items/Wgq02qCAF0wVO6jZUcKV`
  - Q30 `stemMarkdown`

### Instruction Groups

- `instruction_groups/dJJZEZomEcieFx7GCz2G`
  - `questionRangeLabel`: `Questions 26-28`
  - `instructionsMarkdown`: `In each of the questions 26 to 28, rewrite the sentence giving one word for the underlined group of words.`
- `instruction_groups/WvsZstNzCLwApodj4pGV`
  - `questionRangeLabel`: `Questions 29-30`
  - `instructionsMarkdown`: `In each of the questions 29 to 30, use the word in a sentence to show that you know the difference in its meaning.`

No interaction IDs, marking-rule IDs, model answers, sections, or context blocks were changed.

## Before / After

| Question | Before | After |
|---|---|---|
| Q16 | `kg` was plain text. | `kg` is bold in the stem. |
| Q17 | `they’ve` was plain text. | `they’ve` is bold in the stem. |
| Q20 | `forgot` was plain text despite “underlined word” instruction. | `forgot` is bold in the stem. |
| Q21 | `light` was plain text despite “underlined word” instruction. | `light` is bold in the stem. |
| Q26 | target phrase `lead to` was plain text. | `lead to` is bold in the stem. |
| Q27 | target phrase `two times` was plain text. | `two times` is bold in the stem. |
| Q28 | target phrase was plain text and item was under Q28-Q30 group. | target phrase `a list of food available` is bold and Q28 now sits under Q26-Q28 group. |
| Q29 | `air` was plain text and shared a broken Q28-Q30 group. | `air` is bold and group is now Q29-Q30. |
| Q30 | `heir` was plain text and shared a broken Q28-Q30 group. | `heir` is bold and group is now Q29-Q30. |

## Validation

Commands run:

```bash
npx tsc --noEmit
npm run build
```

Results:

- TypeScript passed.
- Production build passed.
- Build emitted existing Vite warnings about browserslist age, a dynamic/static import chunking note, and large bundle size.

Live authenticated flow validation:

- Used a temporary validation student account to enter protected route `/exams/weBoSWQcIi7ZjyDPVx3I?mode=practice`.
- Captured the live rendered V2 exam from Firestore via local Vite and headless Chrome.
- Removed the temporary auth handoff page and deleted the temporary validation user after screenshots.

Screenshots captured:

- `docs/changes/ple-english-2024-q16-q17-auth-flow.png`
- `docs/changes/ple-english-2024-q20-q21-auth-flow.png`
- `docs/changes/ple-english-2024-q26-q28-auth-flow.png`
- `docs/changes/ple-english-2024-q29-q30-auth-flow.png`
- `docs/changes/ple-english-2024-q16-q30-full-auth-flow.png`

Screenshot observations:

- Q16/Q17 show bold target short forms.
- Q20/Q21 show bold target words.
- Q26-Q28 appear under one corrected `Questions 26-28` instruction group.
- Q29-Q30 appear under a separate corrected `Questions 29-30` instruction group.
- No duplicate item stems or duplicated instructions were visible in the checked range.
- Section flow continues from Q29-Q30 into Sub-Section II Q31-Q50.

## Unresolved Issues For Next Pass

- True underline is still not available through the current safe Markdown renderer path. This pass used bold as the safe fallback requested.
- Earlier/later English questions outside Q16-Q30 were not reviewed in this pass.
- Some Q31-Q50 rewrite prompts may need similar target-formatting review in a future narrow pass.
