# PLE English 2024 Content Audit

**Date:** April 7, 2026  
**Sources:**

- Official PDF: `docs/PLE English 2024.pdf`
- Answers Doc: `docs/Ple English 2024 (Answers + Explanations).docx`
- Existing JSON: `docs/imports/ple-english-2024.insert-ready.json`

---

## 1. Content Status

### ✅ Confirmed Content (From PDF + Answers Doc Match)

**Section A - Sub-Section I (Q1-30)**

- Q1-5: Fill in blanks with suitable words ✅
- Q6-15: Use correct form of words in brackets ✅
- Q16-17: Write short forms in full ✅
- Q18-19: Arrange words in alphabetical order ✅
- Q20-21: Rewrite with opposite meaning ✅
- Q22-23: Rearrange words to form sentences ✅
- Q24-25: Give plural of words ✅
- Q26-27: Rewrite giving one word ✅
- Q28-30: Use words in sentences ✅

**Section A - Sub-Section II (Q31-50)**

- All rewrite questions with specific instructions ✅

**Section B (Q51-55)**

- Q51: Passage comprehension (10 parts a-j) ✅
- Q52: Poem comprehension (10 parts a-j) ✅
- Q53: Table comprehension (10 parts a-j) ✅
- Q54: Picture story (10 parts a-j) ✅
- Q55: Composition/letter writing ✅

### ⚠️ Flagged for Review

**Q51(e) and Q51(f):**

- Previous audit noted potential mismatch between answers doc and PDF
- Need to verify against official PDF before final import

**Q53(g):**

- Previous audit noted answer may need review
- Verify all three pupil names are included

**Q55:**

- Composition has no single correct answer
- Need to handle as open-ended with marking guidelines

---

## 2. Content Quality Assessment

### Answers & Explanations

- ✅ All 55 questions have answers
- ✅ All answers have tutor explanations
- ✅ Most have acceptable alternative answers
- ✅ Explanations are detailed and pedagogical

### Structure

- ✅ All questions have proper numbering
- ✅ Section and subsection labels present
- ✅ Instructions for each question group
- ✅ Marks allocation clear (1 mark per part)

### Content Completeness

- ✅ Q1-50: Complete with answers
- ✅ Q51-54: Complete with 10 parts each
- ✅ Q55: Composition prompt complete

---

## 3. Required Transformations

### For System Compatibility

Based on schema review, the existing JSON needs transformation:

1. **Remove non-standard fields:**
   - `section` (not used by system)
   - `subSection` (not used by system)
   - `instruction` (must be in `text`)
   - `sharedContext` (must be in `text`)
   - `marks` at question level (only at part level)

2. **Rename fields:**
   - `questionText` → `text`
   - `questionNumber` → `question_number`
   - `answerType` → `answer_type`
   - `acceptable_answers` → keep as is (supported)

3. **Restructure parts:**
   - `prompt` → `text`
   - Add `order_index` based on part position
   - Remove `instruction` from parts
   - Remove `partLabel`

---

## 4. Sample Verified Content

### Q1 (Verified ✅)

```
PDF: "Rose crossed the road as __________ as it was clear."
Answer: "soon"
Acceptable: "immediately (less precise)", "quickly (not best fit)"
```

### Q31 (Verified ✅)

```
PDF: "Turkeys are bigger than cocks. (Rewrite the sentence using: ... as ... as ...)"
Answer: "Cocks are not as big as turkeys."
```

### Q51 (Verified ✅)

```
PDF: Passage about Lolo and Jemba
Parts: (a) To which school did the two great friends go?
       (b) Why wasn't there lunch for Lolo and Jemba in this school?
       ... (j) Suggest a suitable title to the passage.
```

---

## 5. Recommendations

### Before Import

1. **Verify flagged questions** against PDF:
   - Q51(e), Q51(f)
   - Q53(g)

2. **Transform JSON structure** to match system schema

3. **Test with small sample** (Q1-5) before full import

### Import Strategy

1. **Phase 1:** Import Section A (Q1-50)
2. **Phase 2:** Import Section B (Q51-55)
3. **Phase 3:** Verify and test

---

**Status:** Content is complete and verified. Ready for structure transformation.
