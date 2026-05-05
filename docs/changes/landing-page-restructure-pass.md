# Landing Page Restructure Pass

**Date:** 2026-04-14  
**Branch:** fix/firestore-rules-compile  
**Pass type:** Structure + copy direction + route alignment  
**Validation:** `npx tsc --noEmit` ✅ | `npm run build` ✅

---

## Files Changed

| File | Change type | Summary |
|---|---|---|
| `src/pages/LandingPage.tsx` | Rewrite | Full 9-section restructure with new regional copy |
| `src/pages/PublicBrowsePage.tsx` | New file | Public exam browse page for `/past-papers` and `/practice-papers` |
| `src/components/layout/PublicLayout.tsx` | Rewrite | Updated nav CTA, fixed footer tagline, removed dead footer links |
| `src/App.tsx` | Edit | Replaced Navigate redirects with real PublicBrowsePage routes |
| `index.html` | Edit | Updated title, meta description, OG/Twitter tags for East Africa positioning; removed Lovable placeholder OG image |

---

## Sections Added / Removed / Reordered

### Previous landing page section order
1. Hero
2. How It Works (3 steps)
3. Features (4 cards)
4. Who We Serve (Students, Parents, Schools)
5. Final CTA

### New landing page section order
1. Hero — with dual CTA (Start Practicing / Browse Exams)
2. Practice Modes — 3 modes as lead value proposition (Practice, Quiz, Simulation)
3. Content System — Past Papers vs Practice Papers, with publisher attribution framing for Practice Papers
4. Try Before You Pay — browse free, 2 sessions, upgrade path
5. Learning Layer — instant feedback, AI explanations, review loop (positioned as support)
6. Who It's For — Students, Parents, Teachers, Schools (4 audience cards)
7. Regional Coverage — East Africa, 5 countries with live/expanding status
8. Pricing Logic / Access Paths — conceptual (Browse → Free → Pay-per-paper → Subscribe)
9. Final CTA — simple, dual CTA, no social proof claims

### Sections removed
- "Get Started in 3 Simple Steps" — replaced by more specific content
- Generic 4-feature grid — replaced by named Practice Modes section
- Old "Who We Serve" 3-card layout — replaced by 4-audience layout including Teachers

### Sections added
- Practice Modes (new — this is now the primary value proposition lead)
- Content System (new — distinguishes Past Papers from Practice Papers with attribution context)
- Try Before You Pay (new — explicit access model section)
- Regional Coverage (new — East Africa framing with country-level detail)
- Pricing Logic / Access Paths (new — conceptual pricing paths, no live payment promises)

---

## Copy Direction Changes

### Positioning shift
- **Before:** Uganda-only, PLE/UCE/UACE as sole frame
- **After:** East Africa regional, PLE/UCE/UACE as Uganda examples within broader national exam framing

### Hero copy
- **Before:** "Ace Your Ugandan National Exams with XamPreps" + "Your Ultimate Exam Prep Partner for PLE, UCE & UACE. Access thousands of past papers..."
- **After:** "Practice Real Exams. Before Exam Day." + "Past papers and practice papers for national exams across East Africa. Browse free. Try two practice sessions. Upgrade when you're ready."
- Removed: "thousands of past papers" (unverified quantity claim)
- Removed: hero CTA pushing sign-up as first action before browsing

### Social proof
- **Before:** "Join thousands of students who have improved their exam scores with XamPreps."
- **After:** Removed. No unverifiable social proof claims.

### CTAs
- **Before:** Single "Get Started" CTA in hero
- **After:** Dual CTA — "Start Practicing" (primary) + "Browse Exams" (secondary). Nav CTA changed from "Get Started" to "Start Practicing".

### Footer tagline
- **Before:** "Transforming the way we learn." (generic)
- **After:** "Practice with purpose. Built for national exams across East Africa."

### Footer links
- **Before:** Dead links — About Us, Contact, FAQ, Terms of Service, Privacy Policy (all non-functional)
- **After:** Replaced with three functional columns — Exam Library (links to browse routes), Exam Levels (informational), Get Started (auth + schools email)

### Pricing copy
- No hard prices are stated on the landing page in this pass
- Pricing section uses conceptual access path framing only
- "Cancel anytime" and Mobile Money claims are not on the landing page
- Pricing page (separate) is not changed in this pass

### Auth page copy
- Not changed in this pass. Developer notes in `src/pages/Auth.tsx` (subtitle text, form notes) remain and are a separate rewrite task.

---

## Nav / Route Changes

### Before
```
/past-papers    →  <Navigate to="/exams" replace />  →  protected /exams  →  redirects to /auth (silently)
/practice-papers →  <Navigate to="/exams" replace />  →  protected /exams  →  redirects to /auth (silently)
```

### After
```
/past-papers    →  <PublicBrowsePage paperType="Past Paper" />   (public, no auth required)
/practice-papers →  <PublicBrowsePage paperType="Practice Paper" /> (public, no auth required)
```

The public browse pages:
- Load exam data from Firestore via `listExamsFirebase()`
- Show exam cards with "Sign in to Practice" CTA (not "Start Exam")
- Display a clear sign-in banner explaining 2 free sessions
- Degrade gracefully if Firestore read fails (shows sign-in prompt, not a silent redirect)
- Show an "empty" state for Practice Papers if no Practice Paper type data exists

---

## Assumptions / Temporary Placeholders

### Practice Paper type filtering
The `listExamsFirebase()` → `toExamSummary()` function currently hardcodes `type: 'Past Paper'` for all exams regardless of the actual exam document data. This means `/practice-papers` will currently show an empty state until:
1. Firestore `exams` documents have a `type` field set to `'Practice Paper'` for applicable papers
2. OR `toExamSummary()` in `src/integrations/firebase/content.ts` is updated to pass through the actual `type` field from the exam document

The empty state messaging for Practice Papers is friendly and explains that papers are being added, so this is a safe interim state.

### Practice Papers publisher attribution
The landing page copy section references "publisher and institution attribution shown" for Practice Papers. The current `FirebaseExam` interface and `ExamCard`/`ExamListItem` components do not have a publisher/source field. This is a UI groundwork note only — the copy direction is set. Actual source metadata display requires:
1. A `publisher` or `source` field added to the Firestore exam schema
2. `FirebaseExam` interface updated with the field
3. `ExamCard`/`ExamListItem` updated to display it

This is out of scope for this pass but the landing page copy establishes the expectation.

### Firestore security rules for public browse
`PublicBrowsePage` calls `listExamsFirebase()` without authentication. Whether this succeeds depends on the Firestore security rules allowing unauthenticated reads of the `exams` collection. The branch is `fix/firestore-rules-compile` — if the rules require auth to read exams, `PublicBrowsePage` will land in the `error` state and show a graceful "sign in to browse" message instead of a silent redirect.

For full public browsing, the `exams` collection should allow unauthenticated reads with a `read` rule that doesn't require `request.auth != null`.

### OG/Twitter image
The Lovable placeholder image was removed from `index.html`. No replacement OG image is set. Social sharing previews will not have a branded image until one is created and hosted. This is better than the Lovable placeholder but is an open task.

### Pricing page
The `PricingPage.tsx` and its sub-components (`StandardPlanCard`, `PayPerPaperCard`, `FreeTrialCard`, `PricingFAQ`) were not changed in this pass. The "Cancel anytime" and "Pay using Mobile Money" issues remain on the pricing page and are a separate cleanup task.

### Auth page developer notes
`src/pages/Auth.tsx` still contains developer-facing copy as user-visible text (subtitle, form notes). This is listed as a separate high-priority fix task.

---

## Anything Still Blocked by Backend / Library Work

| Item | Status | Blocker |
|---|---|---|
| Practice Papers public browse data | Empty state shown | `type` field not written to Firestore by current import scripts |
| Publisher attribution on Practice Papers | Copy-level only | `publisher`/`source` field not in schema yet |
| Public Firestore reads | May fail gracefully | Depends on Firestore security rules allowing unauthenticated `exams` reads |
| OG social image | Removed placeholder, no replacement | Needs branded image asset |
| Pricing page copy cleanup | Not done | Separate pass — do not touch payment promises until payment is live |
| Auth page copy cleanup | Not done | Separate pass — replace developer notes with user-facing language |

---

## Validation Results

```
npx tsc --noEmit   →  TSC_OK (0 type errors)
npm run build      →  ✓ built in 3.17s (no new errors; pre-existing chunk size warning remains)
```

Pre-existing warnings not introduced by this pass:
- Dynamic import / static import conflict on `src/integrations/firebase/admin.ts`
- Large chunk size warning (1,173 kB unminified JS bundle)

---

## Recommended Next Steps

1. **Auth page copy** — strip developer notes from `src/pages/Auth.tsx` subtitle and form fields (high priority, low risk, 30 min)
2. **Firestore rules** — confirm `exams` collection allows public reads, or document that public browse degrades to sign-in prompt
3. **Practice Papers type field** — update `toExamSummary()` in `content.ts` to pass through the actual `type` field from Firestore so `/practice-papers` shows real data
4. **Publisher attribution** — add `publisher`/`source` to Firestore schema, `FirebaseExam` interface, and `ExamCard`/`ExamListItem` display
5. **OG image** — create and host a branded social sharing image, add to `index.html`
6. **Pricing page** — separate pass to remove "Cancel anytime", "Pay using Mobile Money", and live UGX prices until a payment gateway is wired up
7. **ExamListPage.tsx** — this legacy component is no longer used by any route. Consider removing or marking as deprecated.
