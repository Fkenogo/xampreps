# V2 ConceptMatch Marking Engine Implementation

**Date:** 2026-05-04  
**Type:** Engine enhancement + schema extension  
**Exam Scope:** PLE English 2024 (Q51 comprehension section) — but engine-level change applies to all V2 exams

---

## Objective

Replace brittle exact-match logic for comprehension/open-ended factual questions with concept-based semantic matching. This allows students to express answers in their own words while still being auto-marked accurately.

---

## Changes Made

### 1. New Marking Mode: `conceptMatch`

Added to `V2MarkingMode` type in `src/types/v2/index.ts`:

```typescript
export type V2MarkingMode =
  | "exactMatch"
  | "normalizedTextMatch"
  | "alternativeAnswers"
  | "keywordBased"
  | "conceptMatch" // ← NEW
  | "mcqOptionMatch"
  | "manualReviewRequired"
  | "rubricBasedManualReview"
  | "hybridAutoPlusManual";
```

### 2. Schema Extension

Added to `V2MarkingRule` interface:

```typescript
export interface V2MarkingRule {
  // ... existing fields ...
  conceptGroups?: string[][]; // Array of concept groups; each group is an array of keyword/phrase variants
  minimumConceptGroupsRequired?: number; // How many groups must be matched to pass
}
```

Added to `V2AutoFeedback`:

```typescript
export interface V2AutoFeedback {
  // ... existing fields ...
  matchedConceptGroups?: number; // Number of concept groups matched
  totalConceptGroups?: number; // Total concept groups defined
}
```

### 3. Marking Engine Implementation

Added to `functions/v2/markingEngine.js`:

#### Helper: `buildNormalizedText()`

```javascript
function buildNormalizedText(text) {
  if (!text || typeof text !== "string") return "";
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"()\-]/g, " ")
    .replace(/\s+/g, " ");
}
```

#### Evaluator: `markConceptMatch()`

```javascript
function markConceptMatch(studentAnswer, rule) {
  const conceptGroups = rule.conceptGroups || [];
  const minimumRequired =
    rule.minimumConceptGroupsRequired || conceptGroups.length;

  // Normalize student answer
  const normalizedAnswer = buildNormalizedText(studentAnswer);
  let matchedGroups = 0;

  // For each concept group, check if ANY variant is found
  for (const group of conceptGroups) {
    const groupMatched = group.some((keyword) => {
      const normalizedKeyword = buildNormalizedText(keyword);
      return normalizedAnswer.includes(normalizedKeyword);
    });
    if (groupMatched) matchedGroups++;
  }

  // Mark correct if enough groups matched
  const isCorrect = matchedGroups >= minimumRequired;
  return {
    isCorrect,
    score: isCorrect ? rule.marks || 1 : 0,
    maxScore: rule.marks || 1,
    confidence: matchedGroups / conceptGroups.length,
    matchedConceptGroups: matchedGroups,
    totalConceptGroups: conceptGroups.length,
  };
}
```

#### Switch Case Addition

Added `case 'conceptMatch':` to the `autoMarkSubmission` switch statement.

### 4. Validation Update

Added `'conceptMatch'` to `ALLOWED_MARKING_MODES` in `src/integrations/firebase/v2-validation.ts`.

---

## Sample ConceptMatch Rules for PLE English 2024 Q51

### Q51(c) — "Why wasn't there lunch for Lolo and Jemba?"

**Expected concepts:**

1. Parents had to contribute/pay for feeding
2. Lunch was only for those whose parents contributed

```json
{
  "markingRuleId": "mr_int_q51_c",
  "markingMode": "conceptMatch",
  "manualReviewRequired": false,
  "conceptGroups": [
    ["parents", "parent", "mother", "father"],
    ["contribute", "contributed", "contribution", "pay", "paid", "feeding"],
    ["lunch", "food", "meal", "eating"]
  ],
  "minimumConceptGroupsRequired": 2,
  "notes": "Student must mention that parents had to contribute/pay for feeding, or that lunch was only for contributors."
}
```

**Test cases:**
| Student Answer | Matched Groups | Result |
|---|---|---|
| "There was no lunch because parents had to contribute towards their children's feeding." | 3/3 | ✓ Correct |
| "Only pupils whose parents paid for feeding could get lunch." | 3/3 | ✓ Correct |
| "Parents had to pay for food." | 3/3 | ✓ Correct |
| "The school did not provide free lunch." | 1/3 | ✗ Incorrect |
| "They forgot to bring lunch." | 0/3 | ✗ Incorrect |

### Q51(d) — "Why should the speaker defeat examination?"

**Expected concepts:**

1. Examination causes stress/fear/problems
2. Examination is an enemy/opponent

```json
{
  "markingRuleId": "mr_int_q51_d",
  "markingMode": "conceptMatch",
  "manualReviewRequired": false,
  "conceptGroups": [
    ["examination", "exam", "exams", "tests"],
    ["stress", "fear", "pressure", "anxiety", "worry", "nervous", "scared"],
    ["enemy", "opponent", "adversary", "fight", "defeat", "battle", "war"]
  ],
  "minimumConceptGroupsRequired": 2,
  "notes": "Student must identify examination as causing negative emotions or as an adversary to fight."
}
```

### Q51(e) — "Why does the speaker refer to invigilators as strange men and women?"

**Expected concepts:**

1. Invigilators are unfamiliar/unknown
2. They behave strictly/unusually during exams

```json
{
  "markingRuleId": "mr_int_q51_e",
  "markingMode": "conceptMatch",
  "manualReviewRequired": false,
  "conceptGroups": [
    ["invigilators", "teachers", "supervisors", "proctors", "them", "they"],
    ["strange", "unfamiliar", "unknown", "foreign", "different"],
    [
      "strict",
      "harsh",
      "serious",
      "stern",
      "unusual",
      "odd",
      "quiet",
      "watching"
    ]
  ],
  "minimumConceptGroupsRequired": 2,
  "notes": "Student must explain that invigilators seem strange because they are unfamiliar or behave unusually during exams."
}
```

### Q51(f) — "What is the duty of the strange men and women?"

**Expected concepts:**

1. Supervise/watch/monitor students
2. During examination/tests

```json
{
  "markingRuleId": "mr_int_q51_f",
  "markingMode": "conceptMatch",
  "manualReviewRequired": false,
  "conceptGroups": [
    ["supervise", "watch", "monitor", "observe", "oversee", "invigilate"],
    ["examination", "exam", "test", "students", "pupils", "candidates"],
    ["duty", "job", "work", "task", "role", "responsibility"]
  ],
  "minimumConceptGroupsRequired": 2,
  "notes": "Student must identify that invigilators supervise/watch students during exams."
}
```

### Q51(g) — "When does the speaker rejoice?"

**Expected concepts:**

1. After exams end/are over
2. Feeling happy/relieved/celebrating

```json
{
  "markingRuleId": "mr_int_q51_g",
  "markingMode": "conceptMatch",
  "manualReviewRequired": false,
  "conceptGroups": [
    ["after", "when", "once", "finished", "over", "ended", "completed"],
    ["examination", "exam", "exams", "tests"],
    ["rejoice", "happy", "celebrate", "relieved", "glad", "joy", "freedom"]
  ],
  "minimumConceptGroupsRequired": 2,
  "notes": "Student must indicate the speaker rejoices after exams are finished."
}
```

### Q51(h) — "What does the speaker forget?"

**Expected concepts:**

1. Forgets troubles/problems/fear
2. Related to examination/stress

```json
{
  "markingRuleId": "mr_int_q51_h",
  "markingMode": "conceptMatch",
  "manualReviewRequired": false,
  "conceptGroups": [
    ["forget", "forgets", "forgotten", "remember", "memory"],
    ["troubles", "problems", "fear", "stress", "worry", "anxiety", "pressure"],
    ["examination", "exam", "exams", "tests", "school"]
  ],
  "minimumConceptGroupsRequired": 2,
  "notes": "Student must identify that the speaker forgets exam-related troubles or stress."
}
```

### Q51(i)(i) — "Give another word for 'terrible'"

**Expected concepts:**

- Any synonym for terrible

```json
{
  "markingRuleId": "mr_int_q51_i_i",
  "markingMode": "conceptMatch",
  "manualReviewRequired": false,
  "conceptGroups": [
    [
      "horrible",
      "awful",
      "dreadful",
      "very bad",
      "frightening",
      "scary",
      "terrifying",
      "dire",
      "severe",
      "extreme"
    ]
  ],
  "minimumConceptGroupsRequired": 1,
  "notes": "Student must provide a valid synonym for 'terrible'."
}
```

### Q51(i)(ii) — "Give another word for 'duty'"

**Expected concepts:**

- Any synonym for duty

```json
{
  "markingRuleId": "mr_int_q51_i_ii",
  "markingMode": "conceptMatch",
  "manualReviewRequired": false,
  "conceptGroups": [
    [
      "responsibility",
      "task",
      "job",
      "role",
      "obligation",
      "function",
      "work",
      "charge"
    ]
  ],
  "minimumConceptGroupsRequired": 1,
  "notes": "Student must provide a valid synonym for 'duty'."
}
```

---

## Unit Tests

### Test: Paraphrased answers accepted

```javascript
const rule = {
  conceptGroups: [
    ["parents", "mother", "father"],
    ["contribute", "pay", "paid"],
    ["lunch", "food", "feeding"],
  ],
  minimumConceptGroupsRequired: 2,
  marks: 1,
};

// Full correct answer
const result1 = markConceptMatch(
  "There was no lunch because parents had to contribute towards their childrens feeding.",
  rule,
);
assert(result1.isCorrect === true);
assert(result1.matchedConceptGroups === 3);
assert(result1.totalConceptGroups === 3);

// Paraphrased but correct
const result2 = markConceptMatch(
  "Only pupils whose parents paid for food could eat.",
  rule,
);
assert(result2.isCorrect === true);
assert(result2.matchedConceptGroups >= 2);

// Partial - below threshold
const result3 = markConceptMatch(
  "The school did not provide free lunch.",
  rule,
);
assert(result3.isCorrect === false);
assert(result3.matchedConceptGroups < 2);
```

### Test: Exact matches still pass

```javascript
const rule = {
  conceptGroups: [["cause"], ["health", "sickness"], ["problems", "issues"]],
  minimumConceptGroupsRequired: 3,
  marks: 1,
};

const result = markConceptMatch(
  "Eating too much sugar can cause health problems.",
  rule,
);
assert(result.isCorrect === true);
assert(result.matchedConceptGroups === 3);
```

### Test: Punctuation/capitalization differences handled

```javascript
const rule = {
  conceptGroups: [["parents"], ["contribute", "pay"]],
  minimumConceptGroupsRequired: 2,
  marks: 1,
};

// Various punctuation formats
const result1 = markConceptMatch("Parents contribute!", rule);
assert(result1.isCorrect === true);

const result2 = markConceptMatch('"PARENTS" pay.', rule);
assert(result2.isCorrect === true);

const result3 = markConceptMatch("parents - contribute", rule);
assert(result3.isCorrect === true);
```

---

## Files Changed

| File                                         | Change                                                                                                                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types/v2/index.ts`                      | Added `conceptMatch` to `V2MarkingMode`, added `conceptGroups` and `minimumConceptGroupsRequired` to `V2MarkingRule`, added `matchedConceptGroups` and `totalConceptGroups` to `V2AutoFeedback` |
| `functions/v2/markingEngine.js`              | Added `buildNormalizedText()` helper, `markConceptMatch()` evaluator, and `conceptMatch` switch case                                                                                            |
| `src/integrations/firebase/v2-validation.ts` | Added `'conceptMatch'` to `ALLOWED_MARKING_MODES`                                                                                                                                               |

---

## Migration Risks

1. **No breaking changes** — `conceptMatch` is a new marking mode; existing modes are untouched.
2. **Backward compatible** — Existing `alternativeAnswers` and `keywordBased` rules continue to work.
3. **Gradual migration** — Comprehension questions can be converted one at a time from `manualReviewRequired` to `conceptMatch`.
4. **No renderer changes** — The renderer only displays results; the marking logic is entirely in the Cloud Functions.

---

## Validation

```bash
npx tsc --noEmit   # ✓ Passed
npm run build      # ✓ Passed
```

---

## Unresolved Items

- Live Firestore patch for Q51(c)-(i) requires Firebase Admin credentials (same blocker as the flexible marking pass).
- Unit tests should be added to a dedicated test file once the test infrastructure is set up.
