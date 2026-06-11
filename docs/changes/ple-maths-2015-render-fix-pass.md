# PLE Mathematics 2015 Render Fix Pass

## Date

2026-04-17

## Goal

Fix the live V2 question renderer so PLE Mathematics 2015 image-backed questions display their diagrams and table-backed questions render as tables.

No re-import was performed. No Firestore rules, pricing, Kenya package, Science, or English changes were made.

## Root Cause: Images

The imported PLE Mathematics 2015 content stores diagrams on the item as `item.mediaRefs`.

Affected items:

- Q5: `/exam-assets/ple-maths-2015/q5-numberline.jpeg`
- Q9: `/exam-assets/ple-maths-2015/Q9-symmetry.jpeg`
- Q15: `/exam-assets/ple-maths-2015/q15-angles.jpeg`
- Q16: `/exam-assets/ple-maths-2015/q16-venn-diagram.jpeg`
- Q21: `/exam-assets/ple-maths-2015/q21a-q21b-venn-diagram.jpeg`
- Q24: `/exam-assets/ple-maths-2015/q24-container.jpeg`
- Q26: `/exam-assets/ple-maths-2015/q26a-q26b-parrellels.jpeg`
- Q29: `/exam-assets/ple-maths-2015/q29a-q29b-perimeter.jpeg`

The V2 item renderer rendered only `stemMarkdown` / `stemText` and interactions. It never rendered `item.mediaRefs`, so the diagrams were present in content and in `public/`, but ignored by the UI.

## Root Cause: Tables

Q27 stores a normal Markdown table in `item.stemMarkdown`. Q23 stores a bullet-style table-like block in `item.stemMarkdown`:

- `Currency Exchange Rates:`
- bullet rows with pipe-separated selling/buying values

The V2 item renderer was printing stems with `whitespace-pre-wrap`, so Markdown tables were flattened as text. The existing shared `MarkdownRenderer` already had table support, but the V2 item renderer did not use it. The table parser also needed a small tightening so only lines that start with `|` are treated as standard Markdown tables, leaving Q23 bullet-table rows for the bullet-table parser.

## Files Changed

- `src/components/exam/v2/V2ItemRenderer.tsx`
- `src/components/common/MarkdownRenderer.tsx`
- `docs/changes/ple-maths-2015-render-fix-pass.md`
- `docs/changes/ple-maths-2015-q5-image-render.png`
- `docs/changes/ple-maths-2015-q23-table-render.png`
- `docs/changes/ple-maths-2015-q27-table-render.png`

## Fix Type

Renderer-only.

The imported PLE Mathematics 2015 package content was not changed. The fix now renders the existing content shape:

- `item.mediaRefs` for diagrams
- `item.stemMarkdown` through the shared Markdown renderer
- standard Markdown tables
- bullet-style pipe tables used by Q23

## Validation

Validated affected image references against files in `public/`:

- Q5 image: OK
- Q9 image: OK
- Q15 image: OK
- Q16 image: OK
- Q21 image: OK
- Q24 image: OK
- Q26 image: OK
- Q29 image: OK

Validated renderer output with local Chrome screenshots:

- Q5 image-backed question: `docs/changes/ple-maths-2015-q5-image-render.png`
- Q23 currency exchange table: `docs/changes/ple-maths-2015-q23-table-render.png`
- Q27 journey time table: `docs/changes/ple-maths-2015-q27-table-render.png`

Because the image fix is shared through `item.mediaRefs`, the same renderer path covers Q5, Q9, Q15, Q16, Q21, Q24, Q26, and Q29.

## Build Results

`npx tsc --noEmit`

- Passed with no output.

`npm run build`

- Passed.
- Vite reported existing non-blocking warnings:
  - Browserslist/caniuse-lite data is old.
  - `src/integrations/firebase/admin.ts` is both dynamically and statically imported.
  - Some chunks are larger than 500 kB after minification.

## Remaining Limitations

- Q23 is supported through the current bullet-style table shape. A future content cleanup could convert it to a standard Markdown table or structured `tableData`, but that was intentionally out of scope for this renderer-only pass.
- The screenshot validation used a temporary local Vite validation page mounted against the real `V2ExamRenderer`; that temporary page was removed after capture.
