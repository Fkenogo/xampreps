# Landing Page Truth Alignment Pass

**Date:** 2026-04-14  
**Branch:** fix/firestore-rules-compile  
**Goal:** Make landing page claims operationally true — eliminate gaps between what is claimed and what is implemented.

---

## Summary

Five areas were audited and corrected. All changes are live and the build passes.

---

## A — Public Browse (Firestore Rules)

**Problem:** The `/past-papers` and `/practice-papers` routes loaded `PublicBrowsePage`, which fetched exams via `listExamsFirebase()` — but the `exams` collection required authentication to read. Unauthenticated users would hit a permission denial, and the page would fall into its error state (show "Sign in to Browse").

**Fix:** `firestore.rules` — changed the exams collection from `isAuthenticated()` to `if true`:

```
// Before
match /exams/{examId} {
  allow read: if isAuthenticated();
}

// After
match /exams/{examId} {
  allow read: if true;
}
```

All other collections (items, interactions, sections, user data) remain gated behind `isAuthenticated()`.

**Result:** Unauthenticated users can now browse the exam library. The public browse pages work as claimed.

---

## B — Practice Paper Type Handling

**Problem:** `toExamSummary()` in `content.ts` hardcoded `type: 'Past Paper'` regardless of what was stored in Firestore. All exams would appear as Past Papers on the public browse page.

**Fix:** Added `RawExamFields` interface to carry raw Firestore fields separately from the typed `V2Exam` model. `toExamSummary()` now accepts a third `raw` parameter and resolves the type from the Firestore document:

```typescript
const resolvedType = raw.type === 'Practice Paper' ? 'Practice Paper' : 'Past Paper';
```

`listExamsFirebase()` extracts `type` and `source` from the raw Firestore doc and passes them through.

**Result:** Practice Papers with `type: "Practice Paper"` in Firestore now correctly appear on `/practice-papers` and not on `/past-papers`.

---

## C — Source/Publisher Metadata

**Problem:** Practice Papers often have an institutional source (e.g. "Kampala Parents School Mock 2023"). There was no field to carry this, and no UI to display it.

**Fix:**
- Added `source?: string | null` to `FirebaseExam` interface
- Added `source` to `RawExamFields` interface
- `toExamSummary()` now maps `source` through
- `ExamCard` renders `{exam.source}` as an italic line below subject/year when present
- `ExamListItem` renders `{exam.source}` inline in the meta row when present
- `ExamsPage` local `Exam` interface updated to include `source`
- `PublicBrowsePage` `toCardProps()` maps `source: exam.source ?? null`

**Result:** Exams with a `source` field in Firestore display their source attribution on both card and list views.

---

## D — Auth Page Copy

**Problem:** The auth page contained developer-facing internal language that should never be shown to users.

| Location | Before | After |
|---|---|---|
| Page subtitle | "Identity access aligned to the new account model." | "Practice real national exams across East Africa." |
| Email login card description | "Parent, teacher, school admin, admin, super admin" | "For parents, teachers, school admins, and staff" |
| Student access card description | (already fine) | "Students can sign in using a school-issued access code and PIN." |
| Amber info box (signup) | "Schools are created as organization records and then managed by school admin accounts. There is no public 'school' auth signup path." | "School admin accounts manage an existing school on XamPreps. If your school is not registered yet, contact us to get it set up." |
| Signup form note | "Self-signup now provisions your canonical identity before continuing to the dashboard." | "Your account will be ready immediately. You'll be taken to your dashboard after signing up." |
| Student access form note | "Managed students sign in with the issued access code and temporary secret or active PIN." | "Students can sign in using a school-issued access code and PIN." |
| Student setup heading note | "Complete your first student login setup to continue. Your account remains a real student identity in Firebase Auth." | "Set a password or PIN to secure your student account and continue to your dashboard." |
| Student setup follow-on | "After setup, continue signing in with your access code and the new password or PIN you choose here." | "After setup, sign in with your access code and the new password or PIN you chose." |
| School admin signup toast | "Your school admin account is ready. School organizations are created separately inside the admin flow." | "Your school admin account is ready. You can set up your school from the dashboard." |
| General signup toast | "Your account has been created. Extended profile capture will continue in the next identity phases." | "Your account has been created. Welcome to XamPreps!" |

**Result:** All auth page copy reads as normal user-facing language with no Firebase/Auth implementation terms.

---

## E — Pricing Page Claims

**Problem:** The pricing page made claims that overstated subscription management capabilities and referenced Mobile Money as a payment method (not yet integrated).

| File | Before | After |
|---|---|---|
| `StandardPlanCard.tsx` | "Cancel anytime" | "Contact us to manage your subscription" |
| `PricingFAQ.tsx` Q1 | "Yes. Upgrade or cancel whenever you want." | "Yes. You can upgrade at any time. Contact us if you need help managing your subscription." |
| `PricingFAQ.tsx` Q2 | "Do I need a credit card? No. Pay using Mobile Money." | "How do I pay? Payment options are shared when you select a plan. Contact us if you have questions about billing." |

**Result:** No false promises about self-service subscription management or specific payment methods.

---

## Build Status

```
✓ 2147 modules transformed.
✓ built in 3.47s
```

TypeScript: no errors (`npx tsc --noEmit` clean).

---

## Files Modified

- `firestore.rules`
- `src/integrations/firebase/content.ts`
- `src/components/exam-library/ExamCard.tsx`
- `src/components/exam-library/ExamListItem.tsx`
- `src/pages/ExamsPage.tsx`
- `src/pages/PublicBrowsePage.tsx`
- `src/pages/Auth.tsx`
- `src/components/pricing/StandardPlanCard.tsx`
- `src/components/pricing/PricingFAQ.tsx`
