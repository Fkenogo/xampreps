# PLE English 2024 Q31-Q50 Marking Pass

Date: 2026-04-21  
Live exam ID: `weBoSWQcIi7ZjyDPVx3I`

## Scope

Narrow live marking audit and correction pass for PLE English 2024 Q31-Q50 only.

Not touched:

- Q1-Q30
- Section B comprehension/composition
- Kenya content
- PLE Mathematics 2015
- PLE Science 2024
- Renderer code
- Marking engine code
- Exam/package re-import

## Fix Type

**Firestore-only targeted patch.**

No duplicate exam was created. Existing item, interaction, marking-rule, and model-answer IDs were preserved.

## Root Cause

Live audit showed every Q31-Q50 interaction was still configured as:

- `interaction.manualReviewDefault: true`
- `marking_rules.markingMode: manualReviewRequired`
- `marking_rules.manualReviewRequired: true`

So the failures were not caused by a renderer issue or a new engine-level bug. The root cause was content/rule configuration: bounded sentence-transformation questions were routed through manual-review behavior instead of normalized auto-checking. In addition, several model-answer alternatives were too sparse or carried legacy explanatory fragments.

The patch converts Q31-Q50 to strict `alternativeAnswers` rules using the existing V2 normalization path:

- case-insensitive
- whitespace-normalized
- punctuation-insensitive
- final full stop not required
- no keyword fallback
- no broad semantic looseness

## Audit Matrix

| Q | Interaction | Bucket | Root cause before patch | Fix |
|---|---|---|---|---|
| 31 | `QTqw1GsDiI4PkNAAcKhj` | c + b | Bounded rewrite was manual-review only; no auto alternatives. | Normalized `alternativeAnswers`, 4 accepted variants. |
| 32 | `yczywtXaV93SJfashggh` | c | Bounded relative-clause rewrite was manual-review only. | Normalized auto-check, canonical answer. |
| 33 | `F6eHWaJAbsruqWVQqtGN` | c + b | Sequence rewrite was manual-review only; valid order variant not auto-accepted. | Normalized `alternativeAnswers`, 4 accepted variants. |
| 34 | `W5lSSkBEHaiTvkthXKMS` | c + b | “after” rewrite was manual-review only; tense/order variants not auto-accepted. | Normalized `alternativeAnswers`, 4 accepted variants. |
| 35 | `YzUj2qhp6Tq6K1HaJCl7` | c + b | Comparative rewrite was manual-review only. | Normalized `alternativeAnswers`, 3 accepted variants. |
| 36 | `rwOBjlHNdhF1lJLbclN0` | c + b | “responsible” rewrite was manual-review only. | Normalized `alternativeAnswers`, 4 accepted variants. |
| 37 | `G8wrL9TmCoG67gNlw6M8` | c | “While” rewrite was manual-review only; answer space is tight. | Normalized auto-check, canonical answer. |
| 38 | `DIUpQd4nm3RbR29RS9Sy` | c + b | “neither/nor” rewrite was manual-review only; placement variants not auto-accepted. | Normalized `alternativeAnswers`, 4 accepted variants. |
| 39 | `g1R5vhV6d19kWEj0kfOO` | c + b | Direct-speech rewrite was manual-review only; quotation/punctuation variants could fail. | Normalized `alternativeAnswers`, 3 accepted variants. |
| 40 | `sfKR9XObZ1xaTS1zV28m` | c + b | Tool-phrase rewrite was manual-review only; “with/using” variant not auto-accepted. | Normalized `alternativeAnswers`, 2 accepted variants. |
| 41 | `5FB7iUv7HK2p4Z2lpSRD` | c + b | Passive rewrite was manual-review only; apostrophe/plain variants not auto-accepted. | Normalized `alternativeAnswers`, 4 accepted variants. |
| 42 | `jPdfiVnXRk8Q8zQvuAfZ` | c + b | “ago” rewrite was manual-review only; valid structure variants not auto-accepted. | Normalized `alternativeAnswers`, 4 accepted variants. |
| 43 | `ZVWe2m7myxYrADIg3b9V` | c | “too...to” rewrite was manual-review only; answer space is tight. | Normalized auto-check, canonical answer. |
| 44 | `odboGyJ5q2U549YzDTxR` | c + b | “Although” rewrite was manual-review only; compact wording variant not auto-accepted. | Normalized `alternativeAnswers`, 3 accepted variants. |
| 45 | `V1m41fpo4fldo5Jp6cSS` | c + b | “spent” rewrite was manual-review only; non-breaking-space/title punctuation variants could fail. | Normalized `alternativeAnswers`, 4 accepted variants. |
| 46 | `MzXvUWRy81gqigPiScwT` | c + b | “In order to” rewrite was manual-review only; pronoun/apostrophe variants not auto-accepted. | Normalized `alternativeAnswers`, 4 accepted variants. |
| 47 | `VOFdsmgYXtZp1cpcBMzm` | c + b | “If” rewrite was manual-review only; contraction/plain variants not auto-accepted. | Normalized `alternativeAnswers`, 6 accepted variants. |
| 48 | `GQtYCas25YU4TaBpTRTp` | c + b | Tag-question rewrite was manual-review only; `didn’t/didn't/didnt` variants not auto-accepted. | Normalized `alternativeAnswers`, 5 accepted variants. |
| 49 | `oP2iRYfMvvuZD7r3JM9V` | c + b | “Both” rewrite was manual-review only; article/plural variants not auto-accepted. | Normalized `alternativeAnswers`, 4 accepted variants. |
| 50 | `Qo7iYWRwQjkHZfk5v41A` | c + b | “related to us” rewrite was manual-review only; `who/that` variant not auto-accepted. | Normalized `alternativeAnswers`, 2 accepted variants. |

Legend:

- b = exact answer but needs aliases/alternatives
- c = rewrite/transformation where punctuation/case/terminal punctuation should not fail

No Q31-Q50 item was classified as broad/open-ended/manual-only after audit. They are bounded sentence transformations.

## Firestore Docs Changed

For each Q31-Q50 interaction, the patch updated:

- the existing `interactions/{id}` document: `manualReviewDefault: false`
- the existing `marking_rules/{id}` document:
  - `markingMode: alternativeAnswers`
  - `manualReviewRequired: false`
  - `type: strict`
  - `exactAnswer`
  - `acceptedAnswers`
  - `alternativeAnswers`
  - `normalizedMatchConfig`
  - `normalizationProfile`
  - `notes`
- the existing `model_answer_versions/{id}` document:
  - cleaned `approvedAnswer`
  - cleaned `acceptableAlternatives`
  - added teacher note explaining curated auto-check behavior

| Q | Item | Interaction | Marking Rule | Model Answer | Accepted count |
|---|---|---|---|---|---|
| 31 | `1EG00MKVeV5RKDapFI9i` | `QTqw1GsDiI4PkNAAcKhj` | `3DoxGs0wzHYxvW8nzSv7` | `5ML0FDo51sQ7JLTvlHZL` | 4 |
| 32 | `O5XalLZUwJVJvgO9bWWK` | `yczywtXaV93SJfashggh` | `dTXanoSPWi5CzoTMjpVL` | `frbV9IYTPZVSyb2th8fr` | 1 |
| 33 | `QFvnICja3DPSBknHdCSG` | `F6eHWaJAbsruqWVQqtGN` | `bh8Fc1DJjYNAFP8Frthu` | `tZRMXjdMEuPfvI133W8Q` | 4 |
| 34 | `dabnmLoi3iy9cdhxbkWB` | `W5lSSkBEHaiTvkthXKMS` | `cH7gp4glH4jSX4gxtAkO` | `vdNeyUi6Omj8EPnUi0P7` | 4 |
| 35 | `UDOL9M4PA2GSIUoC0lKX` | `YzUj2qhp6Tq6K1HaJCl7` | `JCMbcvZ9X8MK8TBDxQXX` | `BTbY80QQEmD3tJy5JUrm` | 3 |
| 36 | `yk0pH9W770mFwZyyZSN7` | `rwOBjlHNdhF1lJLbclN0` | `KquaUMNrW6vsOqPtC1Rq` | `dRiT75zJCCRT7plrnypt` | 4 |
| 37 | `qjAQwJFhCxR2QMBhqeji` | `G8wrL9TmCoG67gNlw6M8` | `1IE332pxrNDEQYFLyWUW` | `fXh63WVx1GpBqskMgGCA` | 1 |
| 38 | `Ox6gf74XULx4hO547Sb3` | `DIUpQd4nm3RbR29RS9Sy` | `eel7w4nnRzUJ54gunEqm` | `67W0yY8Q18yE3Nw25jUW` | 4 |
| 39 | `yuhekfCnXDpnZSvDhB3V` | `g1R5vhV6d19kWEj0kfOO` | `pz0NfxKlDQo050ahZW7x` | `gYfZV3eMQXxtYStLMKAM` | 3 |
| 40 | `dZamWNUs7U6b9db1r3fe` | `sfKR9XObZ1xaTS1zV28m` | `B5LzHeAPX7smrkUANv2I` | `CtlZXkUuI19vLictcsY1` | 2 |
| 41 | `rxZiSdm0HbLPivJNdiHj` | `5FB7iUv7HK2p4Z2lpSRD` | `60lv2RPwhC9O2uuS8oJz` | `tcCJiUCryR2N5defusgE` | 4 |
| 42 | `DiOq9NTO5Y6hwNaI1gVf` | `jPdfiVnXRk8Q8zQvuAfZ` | `AKlSEdCNsWWDSQcAv2kK` | `wMKO8oAzyP2sCcTuQjEW` | 4 |
| 43 | `8BZ01jC7Qqgm5ajRpAHb` | `ZVWe2m7myxYrADIg3b9V` | `agVgDRvE7qPLHNno4vWs` | `9UFDoqI0tpBFkWUznEHb` | 1 |
| 44 | `gwQ8q9Ojgt5TWTsUbpgV` | `odboGyJ5q2U549YzDTxR` | `gE4S7L3bUf16wfFawHWF` | `lvagu7i9VVzGYF1Px5QE` | 3 |
| 45 | `ym6mI4064gF7xoeqMyx4` | `V1m41fpo4fldo5Jp6cSS` | `Uqg5zUdDun4MNZQcKg08` | `voDybc9nsvOja4QI9o2S` | 4 |
| 46 | `04Q46XuFBS5qkezfrmTP` | `MzXvUWRy81gqigPiScwT` | `1GlFZJjeJfahhUJjTbPF` | `XHadHkJ68NpJvImB0Qb6` | 4 |
| 47 | `gJcrpYWJWOjPS4op90do` | `VOFdsmgYXtZp1cpcBMzm` | `DaUqipecsHznCP31t32t` | `7vvWqyIT2RX1B7jKgJU8` | 6 |
| 48 | `uO1AT2pF37fFJLtpGZhO` | `GQtYCas25YU4TaBpTRTp` | `D1KRQfVwrrFcGN2hrvCq` | `S7AU4y0AheX5fm0xirf9` | 5 |
| 49 | `RFloRJKLRUuKJlmCFp5a` | `oP2iRYfMvvuZD7r3JM9V` | `5s1QwvwOickOpW7RzsCr` | `gdC3auyOaGJR2rT5oqhS` | 4 |
| 50 | `TEfEHIvhuShP8FcoV6ga` | `Qo7iYWRwQjkHZfk5v41A` | `ASZAev5V4ROkzElDI8e0` | `yC4vPbVyUrOQTlPqECvn` | 2 |

## Auto / Alternatives / Manual

- Stayed or became auto-check: Q31-Q50.
- Gained alternatives: Q31, Q33-Q36, Q38-Q42, Q44-Q50.
- Canonical-only normalized auto-check: Q32, Q37, Q43.
- Switched to manual review: none.
- Marking strategy changed to keyword-based: none.

## Before / After Examples

| Case | Before | After |
|---|---|---|
| Q31 `Cocks are not as big as turkeys` | Routed to manual review / behaved as failed auto-check. | Live authenticated flow shows `✓ Correct!`. |
| Q41 `The letters were not posted by Shakirah` | Routed to manual review / observed as wrong. | Live authenticated flow shows `✓ Correct!`. |
| Q48 `Aida received no money from her guardian, didnt she` | Apostrophe/plain variant not accepted. | Live authenticated flow shows `✓ Correct!`. |
| Q50 `The boy that won the race is related to us` | Valid `that` variant not accepted. | Live authenticated flow shows `✓ Correct!`. |
| Wrong Q31 `Turkeys are as big as cocks` | N/A | Live authenticated flow shows `✗ Incorrect`. |
| Wrong Q48 `Aida received money from her guardian, didnt she` | N/A | Live authenticated flow shows `✗ Incorrect`. |

## Validation

Commands run:

```bash
npx tsc --noEmit
npm run build
```

Results:

- TypeScript passed.
- Production build passed.
- Build emitted existing Vite warnings about browserslist age, mixed dynamic/static import chunking, and large bundle size.

Live authenticated validation:

- Used the real protected exam route: `/exams/weBoSWQcIi7ZjyDPVx3I?mode=practice`
- Used a temporary student validation account.
- Tested required corrected questions: Q31, Q32, Q33, Q34, Q35, Q41, Q42, Q48, Q49, Q50.
- Tested two intentionally wrong answers: Q31 and Q48.
- Deleted the temporary validation account, attempts, and submissions after capture.

Live results:

- Q31 correct: passed.
- Q32 correct: passed.
- Q33 correct: passed.
- Q34 correct: passed.
- Q35 correct: passed.
- Q41 correct: passed.
- Q42 correct: passed.
- Q48 correct: passed.
- Q49 correct: passed.
- Q50 correct: passed.
- Wrong Q31: failed as incorrect.
- Wrong Q48: failed as incorrect.

Screenshots:

- `docs/changes/ple-english-2024-q31-marking-pass.png`
- `docs/changes/ple-english-2024-q32-marking-pass.png`
- `docs/changes/ple-english-2024-q33-marking-pass.png`
- `docs/changes/ple-english-2024-q41-marking-pass.png`
- `docs/changes/ple-english-2024-q48-marking-pass.png`
- `docs/changes/ple-english-2024-q50-marking-pass.png`

## Unresolved Items

- This is still curated exact/alternative matching, not semantic grading. A grammatically valid rewrite outside the curated variants may still require teacher review or another targeted alias.
- Direct-speech Q39 is bounded but punctuation-heavy; it now ignores ordinary punctuation/case, but unusual quotation wording should be reviewed if contested.
- No broader Q51+ English marking review was performed in this pass.
