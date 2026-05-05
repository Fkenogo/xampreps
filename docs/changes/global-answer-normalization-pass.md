# Global Answer Normalization Pass

Date: 2026-04-19

## Scope

This pass adds a lightweight deterministic normalization and opt-in flexible keyword fallback to the V2 auto-check layer.

No UI changes were made. PLE English 2024 and Kenya exam content were not touched.

## Files Changed

- `functions/v2/markingEngine.js`
- `src/types/v2/index.ts`
- `src/integrations/firebase/v2-validation.ts`
- `docs/data/ple-science-2024-uganda-v2-import.json`
- `docs/changes/global-answer-normalization-pass.md`

Live Firestore was also patched for seven PLE Science 2024 marking rules only:

- `int_q17`
- `int_q31`
- `int_q44_b_y_function`
- `int_q44_b_z_function`
- `int_q47_b`
- `int_q51_b`
- `int_q52_c`

The deployed callable was updated:

- `v2AutoMarkSubmission`
- Revision observed after deploy: `v2automarksubmission-00013-fep`

## Normalization Rules Added

Added `normalizeAnswer(input: string)` in the V2 marking engine.

It:

- lowercases text;
- trims whitespace;
- removes punctuation;
- normalizes repeated spaces;
- applies basic plural normalization by removing a trailing `s` only where safer;
- normalizes common concept verb forms:
  - `absorbs`, `absorbed`, `absorbing`, `absorption` -> `absorb`
  - `evaporates`, `evaporated`, `evaporating`, `evaporation` -> `evaporate`

This is rule-based only. No NLP or AI dependency was added.

## Flexible Keyword Matching

Added an opt-in keyword fallback after exact/alias matching fails.

The fallback activates only when:

- `markingRule.type === "flexible"`, or
- `markingRule.acceptedKeywords` exists.

If `acceptedKeywords` exists, every normalized keyword must appear in the normalized student answer.

Example:

```json
{
  "type": "flexible",
  "acceptedKeywords": ["absorb", "water"]
}
```

Expected answer:

```text
Absorbs water
```

Student answer:

```text
absorption of water
```

Result:

- exact/alias match fails;
- normalized keywords become `absorb`, `water`;
- both keywords are present;
- auto-check marks the answer correct.

## Strict Mode Preserved

The fallback does not run for ordinary exact/alias rules unless they explicitly opt in with `type: "flexible"` or `acceptedKeywords`.

This keeps precision-sensitive naming and definition questions on their existing exact/alias path.

## Logging Added

The marking engine now logs:

- when exact/alias matching fails for a flexible rule;
- when keyword fallback succeeds.

Log labels:

- `[v2AutoMarkSubmission] exact/alias match failed for flexible rule`
- `[v2AutoMarkSubmission] keyword fallback match succeeded`

The local matcher validation showed these logs firing for keyword fallback cases. A direct Firebase log retrieval check was attempted, but Google Cloud Logging returned an internal 500 for that read request.

## Science Rules Updated

PLE Science 2024 received targeted `type: "flexible"` and `acceptedKeywords` updates for concept answers that had known phrasing gaps:

| interaction | acceptedKeywords | example now accepted |
|---|---|---|
| Q17 | `urine`, `bladder` | `urine goes to the bladder` |
| Q31 | `particle` | `there are no particles` |
| Q44(b)(i) | `absorb`, `nutrient` | `absorption of nutrients` |
| Q44(b)(ii) | `absorb`, `water` | `absorption of water` |
| Q47(b) | `gas`, `escape` | `so that gas does not escape` |
| Q51(b) | `evaporate` | `water evaporation` |
| Q52(c) | `heat` | `heat spoils vaccines` |

## Before / After Examples

| case | before | after |
|---|---|---|
| Q44(b)(ii): `absorption of water` | rejected unless listed exactly | accepted by `absorb` + `water` keywords |
| Q51(b): `water evaporation` | not guaranteed unless alias matched exactly | accepted by `evaporate` keyword |
| Q47(b): `so that gas does not escape` | could fail on phrasing | accepted by `gas` + `escape` keywords |
| Q44(b)(ii): `sugar` | rejected | still rejected |
| Q51(b): `cloudy` | rejected | still rejected |

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
  "manualReviewInteractions": 26,
  "mediaRefs": 8,
  "warnings": [],
  "errors": []
}
```

Local matcher tests passed:

- `normalizeAnswer("Absorption of water!")` -> `absorb of water`
- Q44(b)(ii) `absorption of water` -> correct
- Q44(b)(ii) `sugar` -> incorrect
- Q51(b) `water evaporation` -> correct
- Q51(b) `cloudy` -> incorrect
- Q44(b)(i) `absorption of nutrients` -> correct
- Q47(b) `so that gas does not escape` -> correct
- Q52(c) `heat spoils vaccines` -> correct

Deployed callable validation passed using authenticated temporary submissions:

```json
{
  "failed": 0
}
```

Cases validated against live `v2AutoMarkSubmission`:

- Q44(b)(ii): `absorption of water` -> correct
- Q44(b)(ii): `sugar` -> incorrect
- Q51(b): `water evaporation` -> correct
- Q51(b): `cloudy` -> incorrect
- Q44(b)(i): `absorption of nutrients` -> correct
- Q47(b): `so that gas does not escape` -> correct
- Q52(c): `heat spoils vaccines` -> correct

Other checks:

- `npx tsc --noEmit`: passed
- `node -c functions/v2/markingEngine.js`: passed
- `npm run build`: passed
- `firebase deploy --only functions:v2AutoMarkSubmission`: passed after retrying around transient network timeouts

## Risks And Limitations

- This is not semantic grading. It only normalizes obvious word forms and checks configured keywords.
- `acceptedKeywords` should be used sparingly. A keyword like `heat` can be broad, so it should only be added where the question context makes that keyword sufficient.
- The fallback does not understand negation deeply. For example, it can match required terms inside a sentence; rule authors should avoid broad keywords where negation would change meaning.
- Plural normalization is intentionally conservative and will not handle every English plural.

## Result

The V2 auto-check layer now has reusable, deterministic answer normalization and opt-in flexible keyword matching without changing UI or rebuilding the scoring engine.
