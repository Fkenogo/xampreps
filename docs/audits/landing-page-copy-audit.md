# Landing Page Copy Audit — XamPreps

**Date:** 2026-04-14  
**Auditor:** Claude Code  
**Branch:** fix/firestore-rules-compile  
**Scope:** All public-facing copy — landing page, pricing page, auth page, nav, footer, SEO/meta  
**Purpose:** Diagnose copy misalignment before a full rewrite pass  

---

## Executive Summary

### Overall Verdict

The current landing page copy is **partially aligned but riddled with risk**. The core product identity is roughly correct (Ugandan exam prep, PLE/UCE/UACE, past papers, AI explanations). But several sections make claims the product cannot back up, one page has raw developer notes visible to users, pricing implies a payment system that doesn't exist, and the overall conversion hierarchy is weak.

The landing page is not broken enough to cause mass confusion, but it is misleading enough to erode trust the moment a user hits the pricing page or auth page. It needs a full rewrite pass, not spot edits.

---

### Top 5 Copy Problems

1. **Pricing page implies a live payment system that doesn't exist.** "Cancel anytime", "Pay using Mobile Money", real UGX prices, a "Pay per paper" flow — all visible, none functional. If a user reads pricing and tries to pay, there is no payment path. This is the highest risk issue.

2. **The auth page exposes developer implementation notes as user copy.** "Identity access aligned to the new account model", "Self-signup now provisions your canonical identity" — these are commit notes, not user-facing copy. Any user who reads this will be confused or lose trust.

3. **"Join thousands of students" is an unverified social proof claim.** No data source for this figure. If the platform is early-stage, this reads as false advertising.

4. **Footer links are dead or non-functional.** About Us, Contact, FAQ, Terms of Service, Privacy Policy — none of these resolve to real pages. This is a trust signal failure on first impression.

5. **The "Who We Serve" section omits Teachers** despite Teacher being a fully implemented, working account role with its own dashboard. This creates a misalignment between what the landing page promises and what the product actually supports.

---

### Top 5 Opportunities

1. **The core exam modes (Practice, Quiz, Simulation) are genuinely differentiated** and actually implemented — the copy barely describes them. This is a conversion opportunity that's being wasted with vague generic copy.

2. **Spaced repetition review is real and working** (SM-2 variant). This is a meaningful, specific differentiator that landing copy reduces to one vague sentence. It could be a headline feature.

3. **The parent-visibility story is real and working** — parents can actually monitor progress, see weak areas, track children. The landing page lists this correctly but undersells it. Parents are a paying decision-maker audience and deserve a proper section.

4. **Teacher and School Admin roles are live** — schools and institutions are a high-value audience segment that could justify a specific section on the landing page.

5. **The AI explanation feature is real** (Cloud Function: aiExplanations). The current copy says "step-by-step explanations" — this is accurate and could be made more compelling with a specific example or framing.

---

### Rewrite Priority Order

1. Auth page copy (developer notes are user-visible — fix immediately)
2. Pricing page disclaimer / payment status (misleads users about what they can buy)
3. Footer links (dead links hurt trust for everyone who scrolls down)
4. Hero section (good bones but needs tightening)
5. Feature blocks (currently generic; should be specific and honest)
6. Who We Serve (missing Teacher; School claims should be audited)
7. How It Works (accurate but uninspiring)
8. SEO/meta (OG image is a Lovable placeholder)
9. Final CTA (weak social proof claim)
10. Nav labels (minor but "Past Papers" / "Practice Papers" distinction needs product decision)

---

---

## Section-by-Section Audit

---

### 1. SEO / Meta

**Source:** `index.html`

| Field | Current Copy |
|---|---|
| Page title | `XamPreps - Uganda Exam Practice Platform` |
| Meta description | `Ace your Ugandan national exams with XamPreps. Access thousands of PLE, UCE, and UACE past papers with instant feedback and AI-powered explanations.` |
| OG title | `XamPreps - Uganda Exam Practice Platform` |
| OG description | `Your ultimate exam prep partner for PLE, UCE & UACE. Access past papers, get instant feedback, and learn from AI-powered explanations.` |
| OG image | `https://lovable.dev/opengraph-image-p98pqg.png` (Lovable default!) |
| Twitter card | Summary large image |
| Twitter title | `XamPreps - Uganda Exam Practice Platform` |
| Twitter description | `Ace your Ugandan national exams with XamPreps. Access thousands of past papers with AI-powered explanations.` |
| Twitter image | Same Lovable placeholder |

**Purpose:** Search engine and social sharing preview.  
**What it's trying to say:** This is an exam prep platform for Ugandan students covering PLE, UCE, UACE with AI features.

**Verdict:** KEEP WITH EDITS

**Issues:**
- OG/Twitter image is still the Lovable.dev default placeholder (`opengraph-image-p98pqg.png`). Anyone sharing this URL on social media will see a Lovable branding image, not XamPreps branding. This is a silent trust and brand failure.
- "Access thousands of past papers" — quantity claim that may not be accurate depending on what's in the exam library.
- Copy is accurate in general direction but passive and generic.

---

### 2. Nav / Header

**Source:** `src/components/layout/PublicLayout.tsx`

| Element | Current Copy |
|---|---|
| Logo text | `XamPreps` |
| Nav link 1 | `Home` |
| Nav link 2 | `Past Papers` |
| Nav link 3 | `Practice Papers` |
| Nav link 4 | `Pricing` |
| Auth button 1 | `Sign In` |
| Auth button 2 | `Get Started` |

**Purpose:** Primary navigation and CTA entry point.  
**What it's trying to say:** Here's the brand, here are your main destinations, here's how to get started.

**Verdict:** KEEP WITH EDITS

**Issues:**
- "Past Papers" and "Practice Papers" as separate nav items suggests they are distinct public-browsable sections. In reality, both `/past-papers` and `/practice-papers` routes redirect to `/exams` — which is a **protected route**. An unauthenticated user clicking either of these nav items gets silently redirected to `/auth` with no explanation of why. This is a conversion dead-end.
- The nav distinction between "Past Papers" and "Practice Papers" may not even be meaningful if the exam library merges them. Needs a product decision.
- No "For Schools" or "For Teachers" link — missing audience entry points for institutional buyers.

---

### 3. Hero Section

**Source:** `src/pages/LandingPage.tsx` — `<section className="gradient-dark">`

| Element | Current Copy |
|---|---|
| H1 | `Ace Your Ugandan National Exams with XamPreps` |
| Subheadline | `Your Ultimate Exam Prep Partner for PLE, UCE & UACE. Access thousands of past papers, receive instant feedback, and learn from detailed AI-powered explanations to boost your exam performance.` |
| Primary CTA | `Get Started` |
| Secondary note | `Start Learning for Free` |

**Purpose:** First impression. Communicate what XamPreps is, who it's for, and drive sign-up.  
**What it's trying to say:** This is a product specifically for Ugandan students taking national exams. It has a lot of content, instant feedback, and AI features. You can start free.

**Verdict:** KEEP WITH EDITS

**Issues:**
- "Access thousands of past papers" — exact quantity unknown. If the library is small right now, this overclaims. Should be replaced with something honest and specific (e.g. name the actual exam levels/subjects available).
- "Start Learning for Free" — the free trial path is technically present (FreeTrialCard on pricing page) but unclear whether a new user who clicks "Get Started" actually gets free access to anything, or lands on a pay wall. This promise needs to be honoured or removed.
- "boost your exam performance" — generic filler. Every competitor says this.
- The H1 is functional but front-loads the brand name at the end. A student scanning quickly may miss it.
- No visual hierarchy after the two CTAs. The subheadline is very long (two sentences, 40+ words).

**What's accurate:**
- The exam level targeting (PLE, UCE, UACE) is correct.
- Instant feedback IS implemented.
- AI-powered explanations ARE implemented.

---

### 4. How It Works

**Source:** `src/pages/LandingPage.tsx` — `StepCard` components

| Step | Title | Description |
|---|---|---|
| 1 | `Create Your Account` | `Quickly sign up as a student, parent, or school to get started.` |
| 2 | `Choose Your Exam` | `Select from a vast library of past papers and choose your study mode.` |
| 3 | `Learn & Improve` | `Get instant feedback, review explanations, and watch your scores climb.` |

**Section heading:** `Get Started in 3 Simple Steps`  
**Purpose:** Reduce signup friction by showing how the product works.  
**What it's trying to say:** Onboarding is simple, three steps, then you're getting value.

**Verdict:** KEEP WITH EDITS

**Issues:**
- Step 1: "parent, or school" — the product also has Teacher and School Admin roles, which are live. The copy should either be complete ("student, parent, teacher, or school") or simplified ("sign up for your role").
- Step 2: "vast library of past papers" — "vast" is unverified. The actual exam library content is limited at this stage. This is an overclaim.
- Step 3: "watch your scores climb" — vague motivational copy. Could be specific: the product actually tracks score history across exam attempts.
- The three steps accurately describe the real user journey (auth → exam library → exam → feedback) so the structure is valid.

---

### 5. Feature Blocks

**Source:** `src/pages/LandingPage.tsx` — `FeatureCard` components  
**Section heading:** `A Smarter Way to Prepare`  
**Section subheadline:** `Everything you need to succeed in one place.`

| Feature | Icon | Description |
|---|---|---|
| `AI-Powered Tutoring` | WrenchIcon | `Get instant, step-by-step explanations for every question. Understand the 'why' behind every answer.` |
| `Practice & Simulation` | BookOpenIcon | `Choose between a stress-free Practice Mode with instant feedback or a timed Exam Simulation.` |
| `Smart Review System` | ChartBarIcon | `Our spaced repetition system identifies your weak spots and creates personalized review sessions.` |
| `Performance Analytics` | ArrowTrendingUpIcon | `Track your progress with detailed charts. See your scores improve over time.` |

**Purpose:** Communicate product differentiators and key feature set.  
**What it's trying to say:** XamPreps has AI, multiple practice modes, smart review, and progress tracking.

**Verdict:** KEEP WITH EDITS (features are real, but copy and icons need work)

**Issues:**
- **WrenchIcon for "AI-Powered Tutoring"** — a wrench suggests tool/settings, not intelligence or explanation. Wrong icon choice for the AI feature. Communicates the opposite of what's intended.
- **"AI-Powered Tutoring"** — "Tutoring" implies an interactive back-and-forth conversation. What the product actually does is provide AI-generated step-by-step explanations for questions you've already answered. That is closer to "AI Explanations" or "AI Feedback" than "tutoring."
- **"Practice & Simulation"** description only mentions two modes (Practice + Simulation) but the product actually has three: Practice, Quiz, and Simulation. Quiz mode (one question at a time with auto-advance) is distinct and missing from this description.
- **"Smart Review System"** — "identifies your weak spots" is slightly overclaimed. The review system surfaces questions whose `nextReview <= now` based on SM-2 spaced repetition scheduling. It does not proactively identify weak spots in real time. It shows you what's due for review.
- **"Performance Analytics"** with "detailed charts" — the student dashboard does have some progress indicators (XP, streak, score history per exam) but "detailed charts" implies more than what's currently live. This risks disappointing users who expect a full analytics suite.
- **"Everything you need to succeed in one place"** — generic tagline, adds no information.

**What's accurate:**
- AI explanations are real (Cloud Function: aiExplanations).
- Practice and Simulation modes are real.
- Quiz mode is real (omitted from copy).
- Spaced repetition review is real (SM-2 variant fully implemented).
- Progress tracking (XP, streak, exam history) is real.

---

### 6. Who We Serve

**Source:** `src/pages/LandingPage.tsx` — `WhoCard` components  
**Section heading:** `Why XamPreps Works for Everyone`  
**Section subheadline:** `Personalized solutions that drive academic success.`

#### 6a. For Students

| Copy |
|---|
| `Practice with real exam questions` |
| `Track your progress and weak spots` |
| `Get instant feedback and AI explanations` |
| `Build confidence consistently` |

**Verdict:** KEEP WITH EDITS  
**Issues:** "Track your progress and weak spots" — progress tracking is real but the "weak spots" language implies proactive identification. The review system is pull-based (shows due questions), not push-based (alerts you to weakness). The last point "Build confidence consistently" is vague filler.

#### 6b. For Parents

| Copy |
|---|
| `Monitor your child's progress` |
| `Identify learning gaps early` |
| `Provide targeted support` |
| `Affordable access to quality resources` |

**Verdict:** KEEP WITH EDITS  
**Issues:**
- "Monitor your child's progress" — accurate, parent dashboard shows linked student XP, streak, exam scores.
- "Identify learning gaps early" — partially accurate. Parents can see exam scores but there's no dedicated "gap identification" feature. The copy implies a more sophisticated diagnostic than what's delivered.
- "Provide targeted support" — vague. What support? The product gives visibility, not a support workflow.
- "Affordable access to quality resources" — this is the weakest bullet in the entire page. It says nothing specific about the product and reads as a placeholder. Remove or replace.

#### 6c. For Schools

| Copy |
|---|
| `Assess students' exam readiness` |
| `Generate detailed performance reports` |
| `Supplement your curriculum` |
| `Improve overall student outcomes` |

**Verdict:** REWRITE  
**Issues:**
- "Generate detailed performance reports" — the admin analytics dashboard is a **placeholder** ("coming soon"). There are no automated performance reports for schools yet. This is an overclaim.
- "Assess students' exam readiness" — valid if school admin can see student exam results via linked students. This needs confirmation against the SchoolAdminDashboard feature set.
- "Supplement your curriculum" — vague and applies to any edtech product.
- "Improve overall student outcomes" — generic outcomes statement, adds zero specificity.
- The School section is the weakest of the three. It overclaims analytics and uses generic phrases.

**Missing from "Who We Serve":**
- **Teachers** are a fully implemented, working role in the product (TeacherDashboard is live). Teachers can manage rosters, view linked students, and create managed student accounts. They are completely absent from the landing page's audience messaging. This is a gap.

---

### 7. Final CTA Section

**Source:** `src/pages/LandingPage.tsx` — `gradient-primary` section

| Element | Current Copy |
|---|---|
| Heading | `Ready to Ace Your Exams?` |
| Subtext | `Join thousands of students who have improved their exam scores with XamPreps.` |
| CTA button | `Get Started Now` |

**Purpose:** Final conversion push for users who scrolled the full page.  
**What it's trying to say:** Many people use this, it works, now sign up.

**Verdict:** REWRITE  
**Issues:**
- "Join thousands of students" — this is almost certainly not verifiable at this stage of the product. If the platform is in early launch or beta, this is a false social proof claim. It should be removed or replaced with something honest.
- "who have improved their exam scores" — an outcome claim with no data to support it.
- "Ready to Ace Your Exams?" echoes the H1 too closely. The CTA section should add something new, not repeat the hero.

---

### 8. Public Nav — "Past Papers" / "Practice Papers" Navigation Failure

**Source:** `src/components/layout/PublicLayout.tsx`, `src/App.tsx`

This is a structural UX and copy issue that affects conversion.

The header nav has two links: "Past Papers" and "Practice Papers". In `App.tsx`, both routes (`/past-papers`, `/practice-papers`) redirect to `/exams`, which is a **protected route**. An unauthenticated visitor clicking either link gets silently pushed to `/auth` without any explanation.

The user's mental model: "I can browse past papers without signing up."  
The product reality: "You must sign up before seeing any exams."

This gap between what the nav implies and what happens creates friction and likely increases bounce rate. The copy should either:
- Be honest in the nav ("Browse Exams" with a sign-in prompt on click), or
- Remove these nav items and replace with a clear "Sign Up" / CTA path only.

**Verdict:** REWRITE (nav label and behavior need to align)

---

### 9. Footer

**Source:** `src/components/layout/PublicLayout.tsx`

| Column | Links |
|---|---|
| Brand | `XamPreps` logo, `Transforming the way we learn.` tagline |
| Quick Links | `PLE Papers`, `UCE Papers`, `UACE Papers` |
| Resources | `About Us`, `Pricing`, `Contact` |
| Support | `FAQ`, `Terms of Service`, `Privacy Policy` |

**Purpose:** Navigation fallback, trust signals, legal links.  
**What it's trying to say:** We are a real company with resources and support.

**Verdict:** REWRITE

**Issues:**
- **"Transforming the way we learn"** — the most generic edtech tagline possible. Every platform from Duolingo to Coursera could use this. It says nothing about XamPreps specifically. The brand guidelines describe the product as "Practice with purpose. Clear feedback loops. Continuous improvement. Measurable progress." — any of those would be better.
- **"About Us", "Contact", "FAQ", "Terms of Service", "Privacy Policy"** — none of these links navigate anywhere. The `handleFooterClick` function only handles Pricing and Papers links. Everything else does nothing on click. Dead footer links are a trust and legal risk. Privacy Policy and Terms of Service being dead links is a compliance issue.
- **"PLE Papers", "UCE Papers", "UACE Papers"** — these all route to `/past-papers` which redirects to the protected `/exams` route. Same navigation failure as the header.
- The footer has no copyright line until the bottom: `© {year} XamPreps. All rights reserved.` — this is fine.

---

### 10. Pricing Page

**Source:** `src/pages/PricingPage.tsx` and `src/components/pricing/`

| Section | Key Copy |
|---|---|
| Hero | `Practice how you want. Upgrade anytime.` |
| Standard Plan label | `Standard Price` |
| Standard Plan name | `Premium Access` |
| Standard Plan tagline | `Best for students preparing seriously for exams.` |
| Monthly price | `UGX 20,000 / month` |
| Annual price | `UGX 200,000 / year` |
| Annual badge | `Save 2 months` |
| Cancel text | `Cancel anytime` |
| Standard features | Unlimited access, full explanations, real exam timing, progress tracking, parent access |
| Pay Per Paper price | `UGX 2,000` |
| Pay Per Paper limit | `Max 2 papers per month` |
| Free Trial | `Try 1 full exam.` |
| Free excludes | `Repeat attempts, Progress tracking, Parent dashboard` |
| Parent section | `No guesswork. Just results.` |
| School section | `We offer special plans for schools. Bulk access. Student performance reports.` |
| FAQ Q1 | `Can I upgrade anytime?` → `Yes. Upgrade or cancel whenever you want.` |
| FAQ Q2 | `Do I need a credit card?` → `No. Pay using Mobile Money.` |
| FAQ Q3 | `Can one account be used by multiple students?` → `Each student needs their own account for accurate tracking.` |
| Final CTA | `Exams reward practice. XamPreps makes practice simple.` |

**Purpose:** Communicate value proposition and pricing options, drive sign-ups or purchases.  
**What it's trying to say:** There are clear plans, you can start free, upgrade later, pay monthly or annually.

**Verdict:** REWRITE (pricing page is the most high-risk copy on the site right now)

**Issues:**
- **No payment gateway exists.** The user flow docs explicitly document: `Payment Processing — Broken. No payment gateway; success page shown without payment.` A user who reads these prices, clicks a plan, creates an account, and tries to pay will find no payment flow. The pricing page copy should not advertise prices that cannot be collected. This is the single highest-risk issue in the entire codebase from a user trust perspective.
- **"Cancel anytime"** — implies there is a subscription management system. There is not. Subscriptions are never created in Firestore.
- **"Pay using Mobile Money"** — no mobile money integration exists. This is stated as fact in the FAQ.
- **"Parent access to results and performance"** in Standard Plan features — this IS implemented. Accurate.
- **"Unlimited access to all past exam papers"** — the access gating system (`useExamAccess` hook) may or may not enforce this correctly. The user flow docs note the free trial path has "no clear UI to claim free trial." The access system is partially implemented.
- **"Student performance reports"** in School section — these do not exist (admin analytics are "coming soon" placeholders).
- **"Upgrade or cancel whenever you want"** — implies subscription CRUD that doesn't exist.
- **The final CTA tagline "Exams reward practice. XamPreps makes practice simple."** — this is actually good copy. Specific, clear, honest. Worth keeping in a rewrite.

---

### 11. Auth Page Copy

**Source:** `src/pages/Auth.tsx`

| Element | Current Copy |
|---|---|
| Page title | `XamPreps` |
| Page subtitle | `Identity access aligned to the new account model.` |
| Signup form note | `Self-signup now provisions your canonical identity before continuing to the dashboard.` |
| Student access note | `Managed students sign in with the issued access code and temporary secret or active PIN.` |
| School admin note | `Schools are created as organization records and then managed by school admin accounts. There is no public "school" auth signup path.` |
| Student access description on login card | `Managed students sign in with access code and secret` |
| Setup screen note | `Complete your first student login setup to continue. Your account remains a real student identity in Firebase Auth.` |
| Setup follow-on note | `After setup, continue signing in with your access code and the new password or PIN you choose here.` |

**Purpose:** Allow users to create accounts or sign in.  
**What it's trying to say:** Sign in or sign up for your role.

**Verdict:** REWRITE (critical — developer notes are user-visible)

**Issues:**
- **"Identity access aligned to the new account model."** — This is a developer implementation note committed into UI copy. No user should ever read this. It communicates nothing to a student or parent trying to log in.
- **"Self-signup now provisions your canonical identity before continuing to the dashboard."** — Developer commit message. Completely opaque to any end user.
- **"Your account remains a real student identity in Firebase Auth."** — Developer infrastructure detail. Should never be shown to a student.
- **"Managed students sign in with the issued access code and temporary secret or active PIN."** — The "access code and secret" terminology is internal. The user-facing wording should just be: "Sign in with your student code and PIN."
- **"Schools are created as organization records and then managed by school admin accounts. There is no public 'school' auth signup path."** — Developer architecture note exposed on the sign-up form.
- The auth page shows 4 signup role cards — Student, Parent, Teacher, School Admin — with descriptions. These role card descriptions are minimal but acceptable. However the form around them contains developer copy.

---

---

## Recommended Landing Page Copy Structure

This section proposes the ideal landing page content structure — sections in order, their job, key message, and CTA intent. This is not final polished copy — it is the architecture for a rewrite pass.

---

### Section 1: Hero

**Job:** Make the value proposition instantly clear to a Ugandan student or parent landing on the site.  
**Key message:** XamPreps is the exam practice platform built for PLE, UCE, and UACE. Practice real questions, get immediate feedback, understand every answer.  
**What to remove:** "thousands of" claims, generic boost language.  
**CTA intent:** Start free trial → sign up.  
**Suggested CTA hierarchy:**
- Primary: `Start Practising Free` (drives sign-up to free trial)
- Secondary: `See how it works` (scrolls to How It Works section)

---

### Section 2: Social Proof / Trust Bar

**Job:** Build credibility immediately below the hero before the user keeps scrolling.  
**Key message:** Real exam content. Real feedback. Honest numbers.  
**What to include:** Exam levels covered (PLE, UCE, UACE), subjects available, any honest usage metric if available. If no metric is available, use exam-level and subject breadth instead of user count claims.  
**CTA intent:** None — this is a trust signal, not a conversion block.

---

### Section 3: How It Works

**Job:** Reduce friction by showing the product journey in three steps.  
**Key message:** Sign up for your role → pick an exam → practice and review.  
**What to fix:** Step 1 should name all roles (student, parent, teacher, school). Step 2 should be honest about what's browseable. Step 3 should reference specific outcomes (score, feedback, review queue).  
**CTA intent:** None — informational.

---

### Section 4: Practice Modes

**Job:** Differentiate XamPreps from generic "past papers PDF" resources by explaining the three distinct ways to practice.  
**Key message:** Choose how you want to learn — self-paced Practice, flashcard-style Quiz, or pressure-test Simulation.  
**What to include:**
- Practice Mode: answer questions, check immediately, see feedback as you go
- Quiz Mode: one question at a time, auto-advance, immediate result
- Simulation Mode: timed, exam conditions, full paper
**CTA intent:** `Try a free exam` — drives sign-up.

---

### Section 5: AI Explanations

**Job:** Highlight the AI feature as a concrete differentiator over paper-only resources.  
**Key message:** After every answer, XamPreps shows you not just whether you were right, but why — with step-by-step AI-generated explanations specific to the question.  
**What to avoid:** "AI-Powered Tutoring" (overclaims an interactive tutor). Be specific: explanations per question.  
**CTA intent:** None — feature highlight.

---

### Section 6: Smart Review (Spaced Repetition)

**Job:** Explain the review system as a reason to keep coming back.  
**Key message:** XamPreps remembers which questions you got wrong and brings them back at the right intervals to help you actually remember — not just practice once and forget.  
**What to include:** Honest description of the SM-2 spaced repetition review queue.  
**CTA intent:** None — retention feature highlight.

---

### Section 7: Progress Tracking

**Job:** Show that practice leads to visible improvement, not just blind repetition.  
**Key message:** Every exam attempt is tracked. You can see your score history, XP, and study streak to know you're improving.  
**What to avoid:** "detailed charts" (overclaims current analytics state). Be conservative: scores, streaks, history.  
**CTA intent:** None — credibility.

---

### Section 8: Who It's For

**Job:** Speak directly to each audience segment so they self-identify and feel the product is built for them.  
**Audiences to include:** Students, Parents, Teachers, Schools  
**Key messages per role:**
- **Students:** Practice with real PLE/UCE/UACE questions. Understand every answer. Build a study habit with streaks and review.
- **Parents:** See how your child is practising. View their scores, streaks, and recent exam history. No guesswork.
- **Teachers:** Manage your student roster. Assign access. Track how your students are performing across exam sessions.
- **Schools:** Enquire about institutional access for your student body. Contact us for volume pricing.
**CTA intent per card:** Student → sign up free; Parent → sign up and link your child; Teacher → sign up; School → contact us.

---

### Section 9: Exam Coverage

**Job:** Be specific about what exams and subjects are available so users know whether XamPreps has content relevant to them.  
**Key message:** We cover [list actual exam levels and subjects available in the library].  
**What to avoid:** "thousands of past papers" if not accurate. Be specific about levels and subjects.  
**CTA intent:** `Browse the exam library` → drives sign-up.

---

### Section 10: CTA Block

**Job:** Final conversion push for users who scrolled the full page.  
**Key message:** Start practising today — one free exam, no payment required.  
**What to remove:** "thousands of students" social proof (unverifiable).  
**CTA intent:**
- Primary: `Start Free` (sign up, free trial)
- Secondary: `View Pricing` (for committed users)

---

### Section 11: FAQ

**Job:** Address the top objections that prevent sign-up.  
**Recommended questions:**
- What exam levels does XamPreps cover? (PLE, UCE, UACE)
- Is there a free option? (yes — one free exam, no card required)
- How does payment work? (only add this when payments are live)
- Can parents monitor their children? (yes — link accounts)
- Do teachers and schools have dedicated accounts? (yes)
- What countries do you support? (Uganda first, expanding)
**What to remove:** "Pay using Mobile Money" FAQ until mobile money is actually integrated.

---

### Section 12: Footer

**Job:** Navigation fallback and trust signals (legal, support, brand).  
**What to include:**
- Brand tagline — replace "Transforming the way we learn" with something specific to XamPreps mission (e.g. "Practice with purpose. Built for Ugandan students.")
- Working links only — do not list About Us, Privacy Policy, Terms of Service, or Contact if those pages don't exist yet
- Exam level quick links (PLE, UCE, UACE) — but only link to pages that load correctly for unauthenticated users

---

---

## Summary Reference Table

| Section | Source File | Verdict | Primary Issue |
|---|---|---|---|
| SEO / Meta | `index.html` | KEEP WITH EDITS | Placeholder OG image; quantity claims |
| Nav / Header | `PublicLayout.tsx` | KEEP WITH EDITS | "Past Papers" / "Practice Papers" nav dead-end flow |
| Hero | `LandingPage.tsx` | KEEP WITH EDITS | "thousands" overclaim; "free" promise unclear |
| How It Works | `LandingPage.tsx` | KEEP WITH EDITS | Missing Teacher role; "vast library" overclaim |
| Feature Blocks | `LandingPage.tsx` | KEEP WITH EDITS | Wrong icon for AI; "Tutoring" overclaims; Quiz mode missing |
| For Students | `LandingPage.tsx` | KEEP WITH EDITS | "weak spots" slightly overclaims |
| For Parents | `LandingPage.tsx` | KEEP WITH EDITS | "Affordable" is filler; "targeted support" is vague |
| For Schools | `LandingPage.tsx` | REWRITE | "Detailed reports" overclaims (analytics are placeholder) |
| For Teachers | `LandingPage.tsx` | MISSING | Teacher role is live; not represented at all |
| Final CTA | `LandingPage.tsx` | REWRITE | "Thousands of students" is unverified social proof |
| Footer | `PublicLayout.tsx` | REWRITE | Dead links; generic tagline; legal risk |
| Pricing — Hero | `PricingPage.tsx` | KEEP | Good copy |
| Pricing — Plans | `StandardPlanCard.tsx`, `PayPerPaperCard.tsx` | REWRITE | No payment gateway; "Cancel anytime" misleads |
| Pricing — Free Trial | `FreeTrialCard.tsx` | KEEP WITH EDITS | Access gating clarity needed |
| Pricing — Parents | `ParentSection.tsx` | KEEP | Accurate and clear |
| Pricing — Schools | `SchoolSection.tsx` | KEEP WITH EDITS | "Student performance reports" needs caveat |
| Pricing — FAQ | `PricingFAQ.tsx` | REWRITE | "Pay using Mobile Money" — not implemented |
| Auth page copy | `Auth.tsx` | REWRITE | Developer implementation notes exposed to users |

---

*End of audit. Next step: schedule a copy rewrite pass using this document as the source of truth.*
