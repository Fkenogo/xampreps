# PLE English 2024 Flexible Marking Pass

**Date:** 2026-05-04  
**Live Exam ID:** `weBoSWQcIi7ZjyDPVx3I`  
**Status:** Patch script ready — requires Firebase Admin credentials to execute

---

## Context

This is a follow-up to the previous Q31-Q50 marking pass (`docs/changes/ple-english-2024-q31-q50-marking-pass.md`). While Q31-Q50 were converted from manual-review to `alternativeAnswers` mode, further flexibility issues remain in two areas:

1. **Q26-Q28** — "one word for underlined words" questions that only accept the isolated word but reject correctly rewritten full sentences.
2. **Q46-Q47** — Sentence rewrite questions where valid contraction and sentence-order variants are not accepted.

---

## Root Cause

### Q26-Q28: One-word replacement questions

These questions ask students to replace an underlined phrase with one word. The current marking rules only accept the single replacement word (e.g., `"cause"`, `"twice"`, `"menu"`). Students who write the full correctly-rewritten sentence (e.g., `"Eating too much sugar can cause health problems."`) are marked wrong.

**Expected behavior:** Both the one-word answer AND the full rewritten sentence should be accepted.

### Q46: Sentence order variants

The question asks to rewrite using "In order to...". The current rule (from the prior pass) only accepts the canonical order `"In order to save his life, she hooted at the cyclist."`. The alternative valid order `"She hooted at the cyclist in order to save his life."` is rejected.

### Q47: Contraction variants

The question asks to rewrite using "If...". The current rule only accepts the formal form `"If you do not tuck in your shirt, you will not look smart."`. Valid contraction variants like `"If you don't tuck in your shirt, you won't look smart."` are rejected.

---

## Fix Plan

### Approach

- **Firestore-only targeted patch** (same strategy as prior Q31-Q50 pass)
- No code changes to marking engine
- No exam re-import
- Preserve all existing document IDs

### Q26 — "lead to" → "cause"

| Format                    | Accepted Answer                                    |
| ------------------------- | -------------------------------------------------- |
| One word                  | `cause`                                            |
| Full sentence             | `Eating too much sugar can cause health problems.` |
| Full sentence (no period) | `Eating too much sugar can cause health problems`  |

### Q27 — "two times" → "twice"

| Format                    | Accepted Answer                              |
| ------------------------- | -------------------------------------------- |
| One word                  | `twice`                                      |
| Full sentence             | `My mother visits the dentist twice a year.` |
| Full sentence (no period) | `My mother visits the dentist twice a year`  |

### Q28 — "list of dishes" → "menu"

| Format                    | Accepted Answer                                                             |
| ------------------------- | --------------------------------------------------------------------------- |
| One word                  | `menu`                                                                      |
| Full sentence             | `When Mr. Byaruhanga entered the restaurant, the waitress gave him a menu.` |
| Full sentence (no period) | `When Mr. Byaruhanga entered the restaurant, the waitress gave him a menu`  |

### Q46 — "so as to" → "In order to"

| Variant                       | Accepted Answer                                           |
| ----------------------------- | --------------------------------------------------------- |
| Canonical (with comma)        | `In order to save his life, she hooted at the cyclist.`   |
| Canonical (no comma)          | `In order to save his life she hooted at the cyclist`     |
| Alternate order (with period) | `She hooted at the cyclist in order to save his life.`    |
| Alternate order (no period)   | `She hooted at the cyclist in order to save his life`     |
| Possessive variant            | `In order to save the cyclist's life, she hooted at him.` |
| Possessive (no apostrophe)    | `In order to save the cyclists life, she hooted at him.`  |

### Q47 — "or else" → "If"

| Variant                    | Accepted Answer                                               |
| -------------------------- | ------------------------------------------------------------- |
| Formal (full)              | `If you do not tuck in your shirt, you will not look smart.`  |
| Formal (no period)         | `If you do not tuck in your shirt, you will not look smart`   |
| All contracted             | `If you don't tuck in your shirt, you won't look smart.`      |
| All contracted (no period) | `If you don't tuck in your shirt, you won't look smart`       |
| Mixed (don't + will not)   | `If you don't tuck in your shirt, you will not look smart.`   |
| Mixed (do not + won't)     | `If you do not tuck in your shirt, you won't look smart.`     |
| "fail to" variant          | `If you fail to tuck in your shirt, you will not look smart.` |
| "fail to" contracted       | `If you fail to tuck in your shirt, you won't look smart.`    |

---

## Firestore Docs to Change

### Marking Rules (5 documents)

| Document ID  | Changes                                                                           |
| ------------ | --------------------------------------------------------------------------------- |
| `mr_int_q26` | `markingMode: alternativeAnswers`, add `alternativeAnswers` array with 3 entries  |
| `mr_int_q27` | `markingMode: alternativeAnswers`, add `alternativeAnswers` array with 3 entries  |
| `mr_int_q28` | `markingMode: alternativeAnswers`, add `alternativeAnswers` array with 3 entries  |
| `mr_int_q46` | `markingMode: alternativeAnswers`, add `alternativeAnswers` array with 6 entries  |
| `mr_int_q47` | `markingMode: alternativeAnswers`, add `alternativeAnswers` array with 10 entries |

### Interactions (5 documents)

| Document ID | Changes                      |
| ----------- | ---------------------------- |
| `int_q26`   | `manualReviewDefault: false` |
| `int_q27`   | `manualReviewDefault: false` |
| `int_q28`   | `manualReviewDefault: false` |
| `int_q46`   | `manualReviewDefault: false` |
| `int_q47`   | `manualReviewDefault: false` |

---

## Patch Script

**File:** `scripts/patch-ple-english-2024-flexible-marking.cjs`

```bash
# Usage:
GOOGLE_APPLICATION_CREDENTIALS=/path/to/xampreps-firebase-adminsdk.json \
  node scripts/patch-ple-english-2024-flexible-marking.cjs
```

The script:

- Updates 5 marking rule documents with `alternativeAnswers` mode and curated answer arrays
- Updates 5 interaction documents to set `manualReviewDefault: false`
- Preserves all existing document IDs
- Does NOT modify Q1-Q25, Q29-Q30, Q48-Q50, or any other exam

---

## Validation Plan

### Build Validation

```bash
npx tsc --noEmit
npm run build
```

### Live Authenticated Validation

Test in practice mode at `/exams/weBoSWQcIi7ZjyDPVx3I?mode=practice`:

| Question | Test Case                                                                   | Expected Result             |
| -------- | --------------------------------------------------------------------------- | --------------------------- |
| Q26      | `cause`                                                                     | ✓ Correct                   |
| Q26      | `Eating too much sugar can cause health problems.`                          | ✓ Correct                   |
| Q27      | `twice`                                                                     | ✓ Correct                   |
| Q27      | `My mother visits the dentist twice a year.`                                | ✓ Correct                   |
| Q28      | `menu`                                                                      | ✓ Correct                   |
| Q28      | `When Mr. Byaruhanga entered the restaurant, the waitress gave him a menu.` | ✓ Correct                   |
| Q46      | `In order to save his life, she hooted at the cyclist.`                     | ✓ Correct                   |
| Q46      | `She hooted at the cyclist in order to save his life.`                      | ✓ Correct                   |
| Q47      | `If you do not tuck in your shirt, you will not look smart.`                | ✓ Correct                   |
| Q47      | `If you don't tuck in your shirt, you won't look smart.`                    | ✓ Correct                   |
| Q48      | `Aida received no money from her guardian, didn't she`                      | ✓ Correct (from prior pass) |
| Q26      | `sugar` (wrong word)                                                        | ✗ Incorrect                 |
| Q47      | `If you tuck in your shirt, you will look smart.` (meaning changed)         | ✗ Incorrect                 |

### Screenshots Required

- Q26 full sentence accepted
- Q27 full sentence accepted
- Q28 full sentence accepted
- Q46 alternate valid sentence accepted
- Q47 contraction version accepted
- One intentionally wrong answer still rejected

---

## Files Changed

| File                                                     | Description                                    |
| -------------------------------------------------------- | ---------------------------------------------- |
| `scripts/patch-ple-english-2024-flexible-marking.cjs`    | New — Firestore patch script                   |
| `scripts/patch-ple-english-2024-flexible-marking.mjs`    | New — ESM version (unused, kept for reference) |
| `docs/changes/ple-english-2024-flexible-marking-pass.md` | New — This report                              |

---

## Unresolved Items

- **Firebase Admin credentials required** to execute the patch. The service account file was found in Trash and needs to be restored or a new service account key generated.
- After patch execution, live authenticated validation and screenshot capture are required to complete the task.

---

## Constraints Honored

- ✅ PLE English 2024 only
- ✅ No Kenya content touched
- ✅ No PLE Maths 2015 touched
- ✅ No PLE Science 2024 touched
- ✅ No exam duplication
- ✅ Existing document IDs preserved
- ✅ No marking engine refactor
- ✅ No renderer changes
- ✅ Smallest safe fix using `alternativeAnswers` mode
