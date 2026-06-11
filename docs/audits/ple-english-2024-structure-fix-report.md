# PLE English 2024 Structure Fix Report

**Date:** April 7, 2026  
**Exam ID:** ple-english-2024  
**Fix Type:** Structural (NO content changes)  
**Script Used:** `functions/scripts/fixEnglish2024Structure.js`

---

## 1. What Was Wrong Structurally

### Problem: Content Duplication Between questionText and parts[].prompt

**Before Fix:**

- Both `questionText` and `parts[0].prompt` contained identical content
- UI renders both separately, causing duplication
- Missing instructions for question groups
- Q31-50 missing rewrite instructions in brackets

**Example - Q1 Before:**

```json
{
  "questionText": "Rose crossed the road as __________ as it was clear.",
  "parts": [
    {
      "prompt": "Rose crossed the road as __________ as it was clear.",
      "answer": "soon"
    }
  ]
}
```

**UI Rendering Issue:**

- Line 840 in ExamTakingPage.tsx: `<MarkdownRenderer content={currentQuestion?.text || ''} />`
- Line 864 in ExamTakingPage.tsx: `<p className="font-medium mb-2">{part.text}</p>`
- Result: Same text displayed twice

---

## 2. What Was Changed

### Section A - Sub-Section I (Q1-30)

**Changes Applied:**

1. ✅ Removed duplication: `parts[0].prompt` set to empty string `""`
2. ✅ Kept `questionText` as the full question with blank (****\_\_****)
3. ✅ Added group instructions based on question ranges

**Instruction Groups Added:**

- Q1-5: "In each of the questions 1 to 5, fill in the blank space with a suitable word."
- Q6-15: "In each of the questions 6 to 15, use the correct form of the word given in brackets."
- Q16-17: "In each of the questions 16 to 17, write the given short forms in full."
- Q18-19: "In each of the questions 18 to 19, arrange the following words in alphabetical order."
- Q20-21: "In each of the questions 20 to 21, rewrite the sentence giving the opposite of the underlined word."
- Q22-23: "In each of the questions 22 to 23, rearrange the words to form a correct sentence."
- Q24-25: "In each of the questions 24 to 25, give the plural of the given word."
- Q26-27: "In each of the questions 26 to 27, rewrite the sentence giving one word for the underlined group of words."
- Q28-30: "In each of the questions 28 to 30, use the word in a sentence to show that you know the difference in its meaning."

### Section A - Sub-Section II (Q31-50)

**Changes Applied:**

1. ✅ Removed duplication: `parts[0].prompt` set to empty string `""`
2. ✅ Appended rewrite instructions to `questionText` in brackets
3. ✅ Preserved original sentence structure

**Instructions Added (in brackets):**

- Q31: `(Rewrite the sentence using: ... as ... as ...)`
- Q32: `(Rewrite as one sentence using: whose)`
- Q33: `(Rewrite the sentence using: immediately)`
- Q34: `(Rewrite the sentence using: ... after ...)`
- Q35: `(Rewrite the sentence using: ... than ...)`
- Q36: `(Rewrite the sentence using: ... responsible ...)`
- Q37: `(Rewrite as one sentence beginning: While ...)`
- Q38: `(Rewrite as one sentence using: ... neither ... nor ...)`
- Q39: `(Rewrite the sentence ending: ... ?" the teacher asked Nambuya.)`
- Q40: `(Rewrite the sentence beginning: The tailor cut ...)`
- Q41: `(Rewrite the sentence ending: ... by Shakirah.)`
- Q42: `(Rewrite the sentence ending: ... ago.)`
- Q43: `(Rewrite as one sentence using: ... too ... to ...)`
- Q44: `(Rewrite as one sentence beginning: Although ...)`
- Q45: `(Rewrite the sentence using: ... spent ...)`
- Q46: `(Rewrite the sentence beginning: In order to ...)`
- Q47: `(Rewrite the sentence beginning: If ...)`
- Q48: `(Rewrite the sentence ending: ... didn't she?)`
- Q49: `(Rewrite the sentence beginning: Both ...)`
- Q50: `(Rewrite the sentence ending: ... to us.)`

### Section B (Q51-55)

**Status:** ✅ **UNTouched** - No changes made

- Q51: Passage with sharedContext (10 parts)
- Q52: Poem with sharedContext (10 parts)
- Q53: Table with sharedContext (10 parts)
- Q54: Picture story with sharedContext (10 parts)
- Q55: Composition prompt with sharedContext

---

## 3. Which Questions Were Updated

**Total Questions Updated:** 50 (Q1-50)

**Breakdown:**

- Sub-Section I: Q1-30 (30 questions)
- Sub-Section II: Q31-50 (20 questions)
- Section B: Q51-55 (0 questions - untouched)

---

## 4. Before vs After Examples

### Example 1: Q1 (Fill in the blank)

**BEFORE:**

```json
{
  "questionNumber": 1,
  "questionText": "Rose crossed the road as __________ as it was clear.",
  "parts": [
    {
      "prompt": "Rose crossed the road as __________ as it was clear.",
      "answer": "soon"
    }
  ]
}
```

**AFTER:**

```json
{
  "questionNumber": 1,
  "questionText": "Rose crossed the road as __________ as it was clear.",
  "instruction": "In each of the questions 1 to 5, fill in the blank space with a suitable word.",
  "parts": [
    {
      "prompt": "",
      "answer": "soon"
    }
  ]
}
```

**UI Impact:**

- Before: Question text displayed twice (duplication)
- After: Question text displayed once, instruction shown above

---

### Example 2: Q6 (Word form)

**BEFORE:**

```json
{
  "questionNumber": 6,
  "questionText": "Anne is the __________ of the two girls. (fast)",
  "parts": [
    {
      "prompt": "Anne is the __________ of the two girls. (fast)",
      "answer": "faster"
    }
  ]
}
```

**AFTER:**

```json
{
  "questionNumber": 6,
  "questionText": "Anne is the __________ of the two girls. (fast)",
  "instruction": "In each of the questions 6 to 15, use the correct form of the word given in brackets.",
  "parts": [
    {
      "prompt": "",
      "answer": "faster"
    }
  ]
}
```

**UI Impact:**

- Before: Duplication + missing group instruction
- After: Single display + clear instruction

---

### Example 3: Q31 (Rewrite sentence)

**BEFORE:**

```json
{
  "questionNumber": 31,
  "questionText": "Turkeys are bigger than cocks.",
  "parts": [
    {
      "prompt": "Turkeys are bigger than cocks.",
      "answer": "Cocks are not as big as turkeys."
    }
  ]
}
```

**AFTER:**

```json
{
  "questionNumber": 31,
  "questionText": "Turkeys are bigger than cocks. (Rewrite the sentence using: ... as ... as ...)",
  "parts": [
    {
      "prompt": "",
      "answer": "Cocks are not as big as turkeys."
    }
  ]
}
```

**UI Impact:**

- Before: Missing rewrite instruction, duplication
- After: Complete question with instruction, no duplication

---

## 5. Risks Introduced

### Low Risk Changes ✅

1. **No Content Changes:** All answers, explanations, and acceptable answers remain unchanged
2. **No Schema Changes:** JSON structure remains compatible with existing import system
3. **No UI Code Changes:** Only data structure was modified
4. **Reversible:** Original structure can be restored from git if needed

### Potential Issues to Monitor ⚠️

1. **UI Instruction Display:** The UI needs to render the new `instruction` field
   - Current UI may not have a dedicated instruction display area
   - May need minor UI adjustment to show instructions prominently

2. **Empty Part Prompts:** Some UI code might expect non-empty `part.text`
   - ExamTakingPage.tsx line 864 renders `part.text`
   - Empty string should render as blank space (safe)
   - May want to add conditional rendering to hide empty prompts

3. **Section B Compatibility:** Section B questions have different structure
   - Q51-55 use `sharedContext` which is unaffected
   - Their parts have actual prompts (not empty)
   - No risk to Section B

### Recommended Follow-up Actions

1. **Test UI Rendering:**
   - Verify instructions display correctly
   - Confirm no duplicate text appears
   - Check that empty part prompts don't cause layout issues

2. **Import to Firestore:**
   - Re-import the corrected JSON
   - Test exam taking in all modes (practice, quiz, simulation)

3. **UI Enhancement (Optional):**
   - Add dedicated instruction display area
   - Style instructions differently (e.g., italic, smaller font)
   - Add conditional rendering for empty part prompts

---

## Summary

✅ **Mission Accomplished:**

- Fixed structural duplication in 50 questions (Q1-50)
- Added missing instructions for all question groups
- Preserved Section B structure (Q51-55 untouched)
- No content changes (answers, explanations intact)
- Low risk, fully reversible changes

📊 **Statistics:**

- Questions fixed: 50
- Instructions added: 50
- Content changes: 0
- Section B changes: 0

🔧 **Files Modified:**

- `docs/imports/ple-english-2024.insert-ready.json`

📝 **Script Created:**

- `functions/scripts/fixEnglish2024Structure.js`

**Next Step:** Import corrected JSON to Firestore and test UI rendering.
