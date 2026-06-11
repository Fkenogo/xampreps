# Pricing Model and Admin Plan Management Pass

**Date:** 2026-04-14  
**Branch:** fix/firestore-rules-compile  
**Goal:** Align pricing page with agreed model, enable logged-in access to pricing, create admin-managed plan data with super admin CRUD.

---

## Pricing Model Implemented

| Plan | Type | Monthly | Annual | Notes |
|---|---|---|---|---|
| Basic | Subscription | $4/month | $40/year | Up to 10 exams/month, basic explanations |
| Standard | Subscription | $7/month | $70/year | Unlimited exams, full explanations, progress tracking, parent visibility |
| Premium | Subscription | $10/month | $100/year | Everything in Standard + AI help + teacher support (where available) |
| Pay per paper | One-off | — | — | $1 per paper, instant score, full explanations |
| School / Bulk | Managed | — | — | Min 50 students, 40% discount, annual option, managed onboarding |

Annual billing saves 2 months across all subscription tiers (10 months paid = 12 months access).

All prices shown in USD. Note on public page: "Local currency is shown at checkout."

---

## Files Changed

### New files
| File | Purpose |
|---|---|
| `src/integrations/firebase/pricing.ts` | `PricingPlan` interface, `SEED_PLANS` array, Firestore CRUD (`getPricingPlans`, `createPricingPlan`, `updatePricingPlan`, `deletePricingPlan`) |
| `src/components/admin/PricingPlansAdmin.tsx` | Super admin CRUD UI — list, create, edit, delete, toggle visibility, seed button |

### Modified files
| File | Change |
|---|---|
| `src/pages/PricingPage.tsx` | Full rewrite — reads from Firestore (`pricing_plans`), falls back to `SEED_PLANS`; annual/monthly toggle; 3-tier subscription grid; pay-per-paper card; school card; updated FAQ |
| `src/pages/dashboards/AdminDashboard.tsx` | Added "Plans" tab importing `PricingPlansAdmin`; added `CreditCard` icon import |
| `src/components/layout/DashboardLayout.tsx` | Added `CreditCard`, `Star` icon imports; added "Plans" nav item to `admin` and `super_admin`; added "Upgrade" nav item to `student`; added "Plans" nav item to `parent` |
| `firestore.rules` | Added `pricing_plans/{planId}` — `allow read: if true`; `allow create, update, delete: if isAdmin()` |

### Old pricing components (retained, no longer imported by PricingPage)
`StandardPlanCard.tsx`, `PayPerPaperCard.tsx`, `FreeTrialCard.tsx`, `ParentSection.tsx`, `SchoolSection.tsx` — still on disk but no longer used by the pricing page. Safe to remove in a future cleanup pass.

---

## Route Changes

No new routes added. `/pricing` was already a public route accessible to all users.

**Dashboard entry points added via nav items:**

| Role | Nav item | Destination |
|---|---|---|
| student | Upgrade (Star icon) | `/pricing` |
| parent | Plans (CreditCard icon) | `/pricing` |
| admin | Plans (CreditCard icon) | `/pricing` |
| super_admin | Plans (CreditCard icon) | `/pricing` |

Logged-in users no longer need to log out to view pricing.

---

## Pricing Plan Schema (`pricing_plans` Firestore collection)

```typescript
interface PricingPlan {
  id: string;                     // Firestore document ID
  name: string;                   // Display name: "Standard"
  slug: string;                   // URL-safe key: "standard"
  description: string;            // One-line description
  tierType: TierType;             // 'basic' | 'standard' | 'premium' | 'pay_per_paper' | 'school'
  monthlyPriceUsd: number | null; // null = not a monthly subscription
  annualPriceUsd: number | null;  // Full annual price (not monthly × 12)
  annualSavingsMonths: number;    // How many months free (2 for standard)
  perPaperPriceUsd: number | null;
  monthlyExamCap: number | null;  // null = unlimited
  includesPracticePapers: boolean;
  includesPastPapers: boolean;
  includesBasicExplanations: boolean;
  includesFullExplanations: boolean;
  includesProgressTracking: boolean;
  includesParentAccess: boolean;
  includesAiHelp: boolean;
  includesTeacherSupport: boolean;
  teacherSupportNote: string | null;  // "Where available"
  bulkMinimumStudents: number | null;
  bulkDiscountPercent: number | null;
  isVisible: boolean;             // Controls visibility on public pricing page
  isHighlighted: boolean;        // Shows ring/border emphasis
  highlightLabel: string | null; // "Best value"
  sortOrder: number;             // Ascending display order
  featuresIncluded: string[];    // Bullet list shown with checkmarks
  featuresExcluded: string[];    // Bullet list shown struck-out
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

---

## How Plans Are Seeded / Stored

**Firestore (primary):** `pricing_plans` collection. The public pricing page fetches from this collection on load. If `getPricingPlans()` returns at least one plan, those plans are used.

**Seed fallback:** `SEED_PLANS` in `src/integrations/firebase/pricing.ts` is used as the initial state for the pricing page. If Firestore returns an empty collection or throws, the page renders seed data silently.

**Seeding from admin UI:** The Plans tab in AdminDashboard shows a "Seed default plans" button when no Firestore plans exist. Clicking it writes all 5 seed plans to Firestore in one operation.

---

## What Super Admin Can Edit

From the Plans tab in AdminDashboard (`/dashboard/admin` → Plans tab):

- Create new plan
- Edit any plan:
  - Name, slug, description
  - Tier type
  - Monthly price (USD), annual price (USD), per-paper price (USD)
  - Monthly exam cap (null = unlimited)
  - Bulk minimum students, bulk discount %
  - Annual savings months
  - Individual feature toggles (past papers, practice papers, explanations, progress tracking, parent access, AI help, teacher support)
  - Teacher support note
  - Feature bullet lists (included and excluded)
  - Visibility toggle (shown/hidden on pricing page)
  - Highlighted flag + label
  - Sort order
- Toggle visibility without opening edit dialog
- Delete plan (with confirmation)
- Seed all 5 default plans in one click (shown only when Firestore is empty)

---

## Firestore Rules Change

```
// Before: no pricing_plans rule (would default-deny)

// After:
match /pricing_plans/{planId} {
  allow read: if true;                              // Public — pricing page works unauthenticated
  allow create, update, delete: if isAdmin();      // Only admin/super_admin can manage plans
}
```

---

## Remaining Blockers for Future Payment Integration

1. **Payment gateway not integrated** — pricing page CTAs navigate to auth (`/auth`). When a payment provider is added, CTAs should navigate to a checkout flow.

2. **Subscriptions collection not linked to plan IDs** — `subscriptions` documents use a `plan` string field (`"Free"`, `"Standard"`, `"Premium"`). When payment is live, this should reference `pricing_plans` document IDs.

3. **`useExamAccess` hook not updated** — access gating still uses hardcoded plan name strings. It should eventually read entitlements from the plan's feature flags.

4. **Local currency conversion not implemented** — the note "Local currency shown at checkout" is present but FX logic does not exist yet. This belongs in the checkout layer.

5. **Annual vs monthly subscription tracking** — the subscriptions collection has no `billingCycle` field. This will be needed when annual billing is live.

6. **Old pricing components** (`StandardPlanCard.tsx`, `PayPerPaperCard.tsx`, `FreeTrialCard.tsx`, `ParentSection.tsx`, `SchoolSection.tsx`) are no longer imported. They can be deleted in a cleanup pass.

---

## Validation

```
npx tsc --noEmit   → 0 errors
npm run build      → ✓ 2145 modules transformed, built in 3.13s
```

---

## Manual Test Results

| Test | Result |
|---|---|
| Public user opens `/pricing` (logged out) | ✅ Shows all 3 tiers, pay-per-paper, school section, annual toggle |
| Logged-in student visits `/pricing` via "Upgrade" nav | ✅ Nav item present; pricing page loads without requiring logout |
| Logged-in admin visits `/pricing` via "Plans" nav | ✅ Nav item present in admin sidebar |
| Super admin opens AdminDashboard → Plans tab | ✅ Plans tab renders; shows seed button when Firestore is empty |
| Super admin seeds plans | ✅ Writes 5 plans to `pricing_plans` collection |
| Super admin creates a plan | ✅ Dialog opens, saves to Firestore, table refreshes |
| Super admin edits a plan | ✅ Edit dialog pre-fills existing data, saves changes |
| Super admin deletes a plan | ✅ Confirmation dialog, then removes from Firestore |
| Pricing page renders from Firestore plans after seeding | ✅ Page re-fetches on load and uses Firestore data when available |
