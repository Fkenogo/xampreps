# PLE Mathematics 2015 - Final Insert Guide

**Date:** 2026-04-06  
**Status:** Ready for import  
**Exam:** UNEB PLE Mathematics 2015

---

## Quick Summary

| Metric        | Value                            |
| ------------- | -------------------------------- |
| Questions     | 32                               |
| Parts         | 44                               |
| Total marks   | 100                              |
| Images needed | 8                                |
| Answer types  | 38 numeric, 3 text, 3 open-ended |

---

## Exam Metadata (Create First)

Create this document in Firestore before importing questions:

```
Collection: exams
Document ID: ple-maths-2015

Fields:
  title: "PLE Mathematics 2015"
  subject: "Mathematics"
  level: "PLE"
  year: 2015
  type: "Past Paper"
  difficulty: "Medium"
  timeLimit: 150
  time_limit: 150
  isFree: true
  is_free: true
  description: "Uganda National Examinations Board (UNEB) PLE Mathematics 2015"
  questionCount: 32
  question_count: 32
```

---

## Step-by-Step Import Instructions

### Step 1: Create Exam Metadata

1. Go to `/dashboard/admin`
2. Click "Create Exam" or use the exam editor
3. Fill in all fields as shown above
4. Save to create the exam document `ple-maths-2015`

### Step 2: Upload Images (8 total)

1. Extract diagrams from `PLE MATHS 2015-CLEAN2.pdf`
2. Upload each to Firebase Storage:

| Q#  | Filename                  | Storage Path                             |
| --- | ------------------------- | ---------------------------------------- |
| 5   | `q05-numberline.png`      | `ple/maths/2015/q05-numberline.png`      |
| 9   | `q09-symmetry.png`        | `ple/maths/2015/q09-symmetry.png`        |
| 15  | `q15-angle.png`           | `ple/maths/2015/q15-angle.png`           |
| 16  | `q16-venn.png`            | `ple/maths/2015/q16-venn.png`            |
| 21  | `q21-venn.png`            | `ple/maths/2015/q21-venn.png`            |
| 24  | `q24-cylinders.png`       | `ple/maths/2015/q24-cylinders.png`       |
| 26  | `q26-parallel-lines.png`  | `ple/maths/2015/q26-parallel-lines.png`  |
| 29  | `q29-composite-shape.png` | `ple/maths/2015/q29-composite-shape.png` |

3. Verify each image is accessible
4. If using different URLs, update the JSON import file

### Step 3: Import Questions via Admin UI

1. Go to `/dashboard/admin`
2. Find "PLE Mathematics 2015" in the exam list
3. Click "Edit" or "Manage Questions"
4. Click "Bulk Import"
5. Copy the contents of `docs/imports/ple-maths-2015.final.import.json`
6. Paste into the JSON tab
7. Click "Preview Import" to verify
8. Click "Import" to complete

### Step 4: Verify in Student Mode

1. Go to `/exam/ple-maths-2015?mode=practice`
2. Check that all 32 questions render correctly
3. Verify images display for questions 5, 9, 15, 16, 21, 24, 26, 29
4. Test answer checking with a few sample answers

---

## Content QA Summary

### Changes Made from Original

1. **Q21(a):** Changed to `open-ended` (Venn diagram completion cannot be auto-graded)
2. **Q27(b):** Changed answer to `4.5` (numeric) for auto-grading compatibility
3. **Q23:** Currency table reformatted as bullet points (no image needed)

### Questions That Cannot Be Auto-Graded

| Question | Part | Type       | Reason                  |
| -------- | ---- | ---------- | ----------------------- |
| 21       | (a)  | open-ended | Venn diagram completion |
| 32       | (a)  | open-ended | Sketch task             |
| 32       | (b)  | open-ended | Scale drawing task      |

### Answer Format Notes

- **Q7:** Answer `7/3` — system handles fraction equivalence with `2⅓`
- **Q8:** Answer `7:15pm` — system handles time format variations
- **Q14:** Answer `10100` — binary, system handles the notation

---

## Files Delivered

1. **`docs/imports/ple-maths-2015.final.import.json`** — Final JSON import file (32 questions, 44 parts)
2. **`docs/imports/ple-maths-2015.final-image-manifest.md`** — Image upload guide (8 images)
3. **`docs/handover/2026-04-06-ple-maths-2015-final-insert-guide.md`** — This guide

---

## Troubleshooting

### If questions don't appear after import

- Check that the exam metadata document was created first
- Verify the JSON is valid (no syntax errors)
- Check browser console for errors

### If images don't display

- Verify images were uploaded to the correct Firebase Storage paths
- Check that the `image_url` paths in the JSON match the actual storage paths
- Ensure the images are publicly readable or the user has access

### If answer checking fails

- Some answers may have format issues (see Answer Format Notes above)
- Open-ended questions (21a, 32a, 32b) cannot be auto-graded
