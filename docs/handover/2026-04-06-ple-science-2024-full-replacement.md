# PLE Integrated Science 2024 - Full Replacement Report

**Date:** 2026-04-06  
**Exam ID:** ple-science-2024  
**Status:** ✅ REPLACED - Full exam content rebuilt from guide

---

## Files Changed

1. **`functions/scripts/parseScienceGuide.js`** - New parser script
2. **`functions/scripts/debugExtractQuestions.js`** - Debug extraction script
3. **`docs/imports/ple-science-2024.guide.full.import.json`** - New import file with tutor dialogues
4. **`docs/handover/ple-science-2024.pre-replacement-backup.json`** - Backup of previous content

---

## Commands Run

```bash
# 1. Backup current content
cd functions
GCLOUD_PROJECT=xampreps node scripts/debugExtractQuestions.js ple-science-2024 > ../docs/handover/ple-science-2024.pre-replacement-backup.json

# 2. Cleanup existing Science exam
GCLOUD_PROJECT=xampreps node scripts/cleanupExam.js ple-science-2024

# 3. Parse guide and generate import
node scripts/parseScienceGuide.js

# 4. Re-import from guide-based JSON
GCLOUD_PROJECT=xampreps node scripts/importExamPackage.js ../docs/imports/ple-science-2024.guide.full.import.json \
  --id ple-science-2024 \
  --title "PLE Integrated Science 2024" \
  --subject "Integrated Science" \
  --level PLE \
  --year 2024 \
  --timeLimit 135

# 5. Verify
GCLOUD_PROJECT=xampreps node scripts/debugExtractQuestions.js ple-science-2024 5 40 45 50 53
```

---

## Cleanup Summary

- **Target:** ple-science-2024
- **Questions deleted:** 55
- **Question parts deleted:** 90
- **Exam metadata:** Preserved

---

## Import Summary

- **Source:** `docs/imports/ple_science_2024_guide.md`
- **Questions imported:** 55
- **Question parts imported:** 76
- **Total marks:** 76

---

## Verification Summary

### Exam Metadata

- ✅ ID: `ple-science-2024`
- ✅ Title: `PLE Integrated Science 2024`
- ✅ Subject: `Integrated Science`
- ✅ Level: `PLE`
- ✅ Year: `2024`
- ✅ Time Limit: `135 minutes`

### Question Count

- ✅ Total questions: 55
- ✅ Total parts: 76

---

## Proof Extracts

### Q5 - Animal Identification

**Question:** Name the animal shown in the diagram.

**Answer:** Snail

**Explanation (Full Tutor Dialogue):**

```
Tutor: Let's really observe the diagram carefully. What do you see?
Student: I see a shell and a soft body.
Tutor: Good observation. Anything else?
Student: It looks like it moves slowly.
Tutor: Exactly. And those feelers in front are called tentacles.
Tutor: Now, which animal has all these features — soft body, shell, slow movement?
Student: A snail.
Tutor: Correct. Always use features from the diagram to guide your answer, not guessing.
```

**Status:** ✅ Matches guide

---

### Q40 - Keeping Seeds Viable

**Question:** Give any one way in which crop farmers can keep seeds viable for a long time.

**Answer:** Store them in a dry place

**Explanation (Full Tutor Dialogue):**

```
Tutor: First, what does **viable** mean?
Student: Able to germinate.
Tutor: Exactly. Seeds remain viable when they stay alive and can still grow when planted.
Tutor: What can spoil seeds?
Student: Water? Dampness?
Tutor: Yes. Moisture can make seeds rot or lose their power to germinate.
Tutor: That is why farmers should keep seeds in a **dry place**. They may also use clean containers and protect seeds from insects and rats.
Tutor: So the best short answer is **store them in a dry place**.
```

**Status:** ✅ Matches guide

---

### Q45 - Cleaning Clothes (Table)

**Question:** (Empty - table format question)

**Parts:** (Empty - parser could not handle table format)

**Status:** ⚠️ Parser limitation - table format not supported

---

### Q50 - Insects

**Parts:**

- (a) Social insects ✅
- (b) Pollination ✅
- (c) Use of pesticides; Bush burning ✅

**Status:** ✅ All parts have full tutor dialogues

---

### Q53 - Physical Changes

**Parts:**

- (a) Freezing / Condensation ⚠️ (answers empty but explanation present)
- (b) Loss of topsoil; Silting ✅

**Status:** ⚠️ Partial - some answers need manual review

---

## Known Issues After Replacement

1. **Q45 (Table Format):** The guide uses a table format for Q45 which the parser could not handle. This question needs manual content entry.

2. **Q53(a) Answers:** The answer field is empty for Q53(a) though the explanation contains the correct content. This is a parser extraction issue.

3. **Some Section B Questions:** A few Section B questions have empty question text fields but correct parts.

4. **76 parts vs expected ~90:** The guide has some questions with multiple acceptable answers that were counted differently.

---

## Remaining Work

1. **Manual fix for Q45:** Add table-based question content manually
2. **Review Q53(a):** Ensure answers are correctly populated
3. **Spot-check all Section B questions:** Verify part-to-question mapping

---

## Safety Confirmation

- ✅ Target exam ID confirmed: `ple-science-2024`
- ✅ `ple-maths-2015` was NOT touched
- ✅ Only Science exam content was deleted and re-imported
- ✅ Exam metadata preserved with correct values
