# PLE Science 2024 Reconciliation Pass

## Files inspected

- `docs/PLE-Science-2024.pdf`
- `docs/imports/ple-science-2024.final.import.json`
- `docs/imports/ple-science-2024.aligned.insert-ready.json`
- `docs/imports/ple-science-2024.insert-ready.json`
- `docs/imports/ple-science-2024.guide.full.import.json`
- `docs/imports/ple_science_2024_guide.md`
- `docs/handover/2026-04-06-ple-science-2024-full-replacement.md`
- `docs/handover/ple-science-2024-section-b-check.json`
- `docs/handover/ple-science-2024-spotcheck.json`
- `docs/handover/ple-science-2024.pre-replacement-backup.json`
- `docs/handover/ple-science-2024-live-check.json`
- `public/exam-assets/ple-science-2024/`
- `functions/scripts/setScience2024ImageUrls.js`

## Source of truth

Chosen source:

- `docs/imports/ple-science-2024.final.import.json`

Reason:

- It is the only complete JSON source with all 55 questions present and no empty question text, part text, answers, or explanations.
- The guide-derived fork is explicitly incomplete for some Section B questions.
- The older insert-ready forks conflict on part counts and marks, and have many empty part prompts.

## Conflicts found

| File | Finding | Decision |
| --- | --- | --- |
| `docs/imports/ple-science-2024.final.import.json` | Complete content, but raw part marks sum to 102 because Q44 is over-expanded. | Use as source, reconcile Q44 to the four-mark paper structure. |
| `docs/imports/ple-science-2024.aligned.insert-ready.json` | 55 questions and 100 marks, but many Section A part texts are empty. | Superseded. Do not use as final content source. |
| `docs/imports/ple-science-2024.insert-ready.json` | 55 questions, conflicting part count, and 120 marks. | Superseded. Do not use. |
| `docs/imports/ple-science-2024.guide.full.import.json` | Incomplete parser output for later Section B content. | Superseded. Useful only as a guide artifact. |
| `docs/handover/ple-science-2024-section-b-check.json` | Section B check file only, with inflated mark totals. | Use only to cross-check Section B wording/answers. |
| `docs/handover/ple-science-2024.pre-replacement-backup.json` | Not valid JSON; contains command/error text. | Do not use. |
| `docs/handover/ple-science-2024-live-check.json` | Truncated/empty live-check artifact. | Do not use as source. |

## Resolutions

- Paper structure confirmed from the PDF:
  - Duration: 2 hours 15 minutes, mapped to `durationMinutes: 135`.
  - Section A: 40 one-mark questions.
  - Section B: 15 four-mark questions.
  - Total marks: 100.
- Q44 was reconciled from six one-mark raw parts into two two-mark interactions:
  - Q44(a): identify the labelled digestive system parts.
  - Q44(b): state functions of the requested parts.
- Existing image assets were mapped into `mediaRefs`; the source JSON did not carry final image paths.
- Q45 was represented as a Markdown table so the existing V2 renderer can render it as a table.
- The crop-planting image file is named `q31-crop-planting-method.jpeg`, but it matches the Q32/Q33 diagram context and was used for that item.

## Readiness verdict

READY after reconciliation.

The final source was complete enough to package once Q44 marks were corrected to the paper's four-mark Section B pattern and media/table references were mapped into the working V2 package shape.
