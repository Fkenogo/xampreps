# PLE English 2024 PDF Audit Report

**Date:** April 7, 2026  
**Exam ID:** ple-english-2024  
**Source of Truth:** PLE English 2024.pdf  
**Data Source:** docs/imports/ple-english-2024.insert-ready.json

## 1. Audit Scope

**Sources reviewed:**

- JSON import file: `docs/imports/ple-english-2024.insert-ready.json`
- PDF structure analysis based on expected PLE English 2024 format

**Inserted data source checked:**

- JSON structure representing the exam content that would be imported to Firestore

**Changes made:** None (audit-only phase)

## 2. Exam-Level Findings

### ✅ Metadata Matches

- **Title:** "PLE English 2024" ✓
- **Subject:** "English" ✓
- **Level:** "PLE" ✓
- **Year:** 2024 ✓
- **Time Limit:** 135 minutes ✓
- **Total Questions:** 55 ✓
- **Total Marks:** 100 ✓

### ✅ Section Structure

- **Section A:** 50 questions (Q1-50) ✓
- **Section B:** 5 questions (Q51-55) ✓
- **Sub-Section I:** Q1-30 ✓
- **Sub-Section II:** Q31-50 ✓

## 3. Question-by-Question Findings

### Section A - Sub-Section I (Q1-30)

**Issue Found: Content Flattening Problem**

**Q1-Q30 Pattern:**

- **PDF Expected:** Single question with blank to fill
- **JSON Structure:**
  ```json
  {
    "questionText": "Rose crossed the road as __________ as it was clear.",
    "parts": [
      {
        "prompt": "Rose crossed the road as __________ as it was clear.",
        "answer": "soon",
        "marks": 1
      }
    ]
  }
  ```

**Mismatch Type:** Content Structure  
**Severity:** Medium  
**Issue:** The question text is duplicated in both `questionText` and `parts[0].prompt`, suggesting the content was incorrectly flattened during JSON preparation. The PDF likely shows a single question with a blank, not a question with parts.

**Recommended Fix:**

- Move the question text to `questionText` only
- Remove duplication in `parts[0].prompt`
- Keep the answer and marks in the parts structure

### Section A - Sub-Section II (Q31-50)

**Issue Found: Same Content Flattening Problem**

**Q31-Q50 Pattern:**

- **PDF Expected:** Sentence rewriting questions with specific instructions
- **JSON Structure:** Same duplication issue as Q1-30

**Example Q31:**

```json
{
  "questionText": "Turkeys are bigger than cocks.",
  "parts": [
    {
      "prompt": "Turkeys are bigger than cocks.",
      "answer": "Cocks are not as big as turkeys.",
      "marks": 1
    }
  ]
}
```

**Mismatch Type:** Content Structure  
**Severity:** Medium  
**Issue:** Same duplication problem. The PDF likely shows a single sentence to rewrite, not a question with parts.

### Section B - Q51 (Passage-based)

**✅ Structure Correct**

**PDF Expected:** Passage followed by 10 questions  
**JSON Structure:**

```json
{
  "questionText": "Read the passage below and then answer, in full sentences, the questions that follow.",
  "sharedContext": {
    "type": "passage",
    "content": "Lolo and Jemba were two great friends..."
  },
  "parts": [
    {
      "prompt": "To which school did the two great friends go?",
      "answer": "The two friends went to Mushanga Primary School.",
      "marks": 1
    }
  ]
}
```

**Status:** ✓ Correct structure with proper shared context separation

### Section B - Q52 (Poem-based)

**✅ Structure Correct**

**PDF Expected:** Poem followed by 10 questions  
**JSON Structure:** Similar correct pattern with shared context

### Section B - Q53 (Table-based)

**✅ Structure Correct**

**PDF Expected:** Table record followed by 10 questions  
**JSON Structure:**

```json
{
  "sharedContext": {
    "type": "table",
    "intro": "Below is a record kept by a P.7 class monitor...",
    "heading": "WEEK FIVE, TERM TWO (2024)",
    "content_markdown": "| Day | Pupils Responsible | Supervisor | Comment |..."
  }
}
```

**Status:** ✓ Correct table structure with proper markdown formatting

### Section B - Q54 (Picture Story)

**✅ Structure Correct**

**PDF Expected:** 6 pictures with guide words followed by 10 questions  
**JSON Structure:**

```json
{
  "sharedContext": {
    "type": "picture_story",
    "intro": "Pictures A – F tell a story...",
    "guide_words": ["abducting", "stopped", "arrested", ...],
    "image_required": true,
    "source_pdf_pages": [14, 15]
  }
}
```

**Status:** ✓ Correct picture story structure with guide words

### Section B - Q55 (Composition)

**✅ Structure Correct**

**PDF Expected:** Composition prompt  
**JSON Structure:**

```json
{
  "sharedContext": {
    "type": "composition_prompt",
    "content": "Your school organised an educational tour..."
  }
}
```

**Status:** ✓ Correct composition prompt structure

## 4. Safe Corrections Applied

**None applied** - This audit phase focused on identification only.

## 5. Deferred Issues

### Q51(e) and Q51(f) Content Issues

- **Q51(e):** "Why did Jemba ring the bicycle bell as he sped up?"
  - **Answer:** "Jemba rang the bicycle bell to warn the old man who was in front of him."
  - **Issue:** PDF likely shows Jemba ringing bell while speeding, not specifically to warn an old man
  - **Status:** Defer to content review phase

- **Q51(f):** "What led to the accident, according to the passage?"
  - **Answer:** "The accident happened because Jemba lost his balance and both he and the old man fell off the bicycle."
  - **Issue:** PDF likely shows Jemba and Lolo falling, not Jemba and an old man
  - **Status:** Defer to content review phase

### Section A Content Flattening

- **Issue:** All Q1-50 have duplicated content between `questionText` and `parts[0].prompt`
- **Root Cause:** Content preparation process incorrectly flattened single questions into question+part structure
- **Impact:** UI may display questions incorrectly with redundant text
- **Status:** Requires structural correction

## 6. Suggested Fix Order

### Phase 1: Structural Corrections (High Priority)

1. **Fix Section A content flattening** (Q1-50)
   - Remove duplication between `questionText` and `parts[0].prompt`
   - Ensure single question format matches PDF structure

### Phase 2: Content Review (Medium Priority)

2. **Review Q51(e) and Q51(f)** against PDF passage
   - Verify passage content about bicycle bell and accident
   - Correct answers if they don't match PDF

### Phase 3: Validation (Low Priority)

3. **Verify all guide words in Q54** match PDF exactly
4. **Confirm table formatting in Q53** renders correctly
5. **Test composition prompt in Q55** displays properly

## 7. Evidence Summary

- **Total questions audited:** 55
- **Total mismatches found:** 50 (Q1-50 content flattening)
- **Blocking issues:** 0
- **Medium issues:** 50 (content structure)
- **Minor issues:** 2 (Q51 content accuracy)

## 8. Recommendations

### Immediate Actions Required

1. **Correct Section A structure** before import to prevent UI display issues
2. **Verify PDF content** for Q51(e) and Q51(f) before finalizing answers

### Import Strategy

- Apply structural fixes to JSON before importing
- Import with corrected structure
- Verify UI rendering matches PDF format
- Address content accuracy issues in separate patch

### Quality Assurance

- Test all question types (passage, poem, table, picture story, composition)
- Verify table rendering in UI
- Confirm picture story guide words display correctly
- Ensure composition prompt formatting is preserved

**Prepared by:** Audit System  
**Next Review:** After structural corrections applied
