# V2 Progress Label Alignment Pass

## Date

2026-04-17

## Goal

Clarify live V2 exam-taking progress copy without changing the underlying V2 engine logic.

## Root Cause

Browse cards and preview modals display item count as question count:

- KCPE Mathematics 2023: 50 questions
- PLE Mathematics 2015: 32 questions

The live exam-taking page tracks progress by interactions, because each interaction is an answerable response unit. For PLE Mathematics 2015, there are 44 interactions/answerable parts across 32 displayed questions.

The previous header copy displayed:

- `0/44 answered`

That was technically based on the correct runtime denominator, but the label did not explain that the denominator represented answerable parts rather than displayed questions.

## Files Changed

- `src/pages/ExamTakingPage.tsx`
- `docs/changes/v2-progress-label-alignment-pass.md`

## Final Wording

The live exam header now displays:

- `0/44 parts answered`

The progress calculation remains interaction-based.

## Validation Notes

Local package count validation:

```text
KCPE Mathematics 2023: browse=50 questions; runtime=50 parts answered label; marks=50
PLE Mathematics 2015: browse=32 questions; runtime=44 parts answered label; marks=100
```

This keeps browse/preview aligned to displayed V2 items/questions while making the runtime progress label explicit about answerable parts.

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

## Scope Notes

No imports, Firestore writes, package changes, or Kenya/Uganda content changes were made.
