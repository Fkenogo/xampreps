# PLE Science 2024 Import Pass

## Source chosen

- Source of truth: `docs/imports/ple-science-2024.final.import.json`
- Source PDF: `docs/PLE-Science-2024.pdf`
- V2 package created: `docs/data/ple-science-2024-uganda-v2-import.json`
- Imported examId: `v5sxOCgZRzbge9RWM3K0`

## Files changed

- `docs/data/ple-science-2024-uganda-v2-import.json`
- `docs/changes/ple-science-2024-reconciliation-pass.md`
- `docs/changes/ple-science-2024-import-pass.md`
- `scripts/import-v2-package.mjs`

## Package summary

| Area | Count |
| --- | ---: |
| Sections | 2 |
| Instruction groups | 2 |
| Items | 55 |
| Interactions | 86 |
| Marking rules | 86 |
| Model answer versions | 86 |
| Manual-review interactions | 34 |
| Media references | 8 |
| Total marks | 100 |

Metadata:

- `country: "UGANDA"`
- `level: "PLE"`
- `subject: "Science"`
- `year: 2024`
- `engineVersion: "v2"`
- `status: "published"`
- `durationMinutes: 135`
- `totalMarks: 100`
- `questionCount: 55`
- `itemCount: 55`
- `interactionCount: 86`
- `createdBy: "system-import"`

## Media and table verification

Verified media references:

- `/exam-assets/ple-science-2024/q5-q6-snail.jpeg`
- `/exam-assets/ple-science-2024/q16-q17-kidney.jpeg`
- `/exam-assets/ple-science-2024/q31-crop-planting-method.jpeg`
- `/exam-assets/ple-science-2024/q44-digestive-system.jpeg`
- `/exam-assets/ple-science-2024/q48-face-mask.jpeg`
- `/exam-assets/ple-science-2024/q51-weather-types.jpeg`
- `/exam-assets/ple-science-2024/q55a-plane-mirror-cup.jpeg`
- `/exam-assets/ple-science-2024/q55b-plane-mirror-reflection.jpeg`

Table-backed content:

- Q45 is stored in renderer-compatible Markdown table format.

Note:

- The crop image filename says `q31`, but the asset content matches the crop-planting diagram used by the Q32/Q33 context.

## Dry-run result

Local package validator:

```text
Package: docs/data/ple-science-2024-uganda-v2-import.json
Exam: PLE Science 2024
Sections: 2
Instruction groups: 2
Items: 55
Interactions: 86
Marking rules: 86
Model answer versions: 86
Total marks: 100
Manual-review interactions: 34
Media refs: 8
Warnings: []
Errors: []
```

Generalized importer dry-run:

```text
Mode: DRY RUN - no Firestore writes
Package shape validated
55 item(s) validated
86 interaction(s) validated
86 marking rule(s) validated
86 model answer version(s) validated
Duplicate exam guard would run before real import
Dry run completed successfully. No data was written to Firestore.
```

## Real import result

Command:

```text
node scripts/import-v2-package.mjs --use-adc --project-id xampreps --package docs/data/ple-science-2024-uganda-v2-import.json
```

Result:

```text
No duplicate exam found
Created exam v5sxOCgZRzbge9RWM3K0
Created 2 section(s)
Created 2 instruction group(s)
Created 55 item(s)
Created 86 marking rule(s)
Created 86 interaction(s)
Created 86 model answer version(s)
Import completed successfully.
```

After import, the exam document was updated with supported browse metadata:

- `questionCount: 55`
- `itemCount: 55`
- `interactionCount: 86`

## Post-import validation

Firestore validation:

- Exam exists with `status: "published"` and `engineVersion: "v2"`.
- Exam metadata has `questionCount: 55`, `itemCount: 55`, and `interactionCount: 86`.
- Imported child counts are 2 sections, 2 instruction groups, 55 items, and 86 interactions.
- All 86 interactions reference existing marking rules.
- All 86 interactions have model answer versions.
- Media-backed items reference existing public assets.
- Q45 table content is present in the imported item stem.

Public UI validation:

- Public Past Papers page loads without the "Unable to load exams" error.
- PLE Science 2024 appears in the public library.
- The library row shows Uganda, PLE, Science, 135 minutes, and 55 questions.
- Preview modal opens and shows Uganda, PLE, Science, 2024, 135 minutes, and 55 questions.
- Direct exam route redirects to `/auth` while unauthenticated, which matches the protected exam-taking route.

Screenshots captured:

- `docs/changes/ple-science-2024-library.png`
- `docs/changes/ple-science-2024-preview.png`
- `docs/changes/ple-science-2024-exam-route.png`

## Remaining limitations

- I did not complete an authenticated browser start/answer-check pass because no reusable test credentials were available in the local browser session. The protected exam route redirects to auth as expected.
- Automated Firestore validation confirmed the imported item, interaction, marking-rule, media, table, and model-answer graph is complete.
