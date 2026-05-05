import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/integrations/firebase/client';

export type TierType = 'basic' | 'standard' | 'premium' | 'pay_per_paper' | 'school';

export interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  tierType: TierType;
  monthlyPriceUsd: number | null;
  annualPriceUsd: number | null;
  annualSavingsMonths: number;
  perPaperPriceUsd: number | null;
  /** null = unlimited */
  monthlyExamCap: number | null;
  includesPracticePapers: boolean;
  includesPastPapers: boolean;
  includesBasicExplanations: boolean;
  includesFullExplanations: boolean;
  includesProgressTracking: boolean;
  includesParentAccess: boolean;
  includesAiHelp: boolean;
  includesTeacherSupport: boolean;
  teacherSupportNote: string | null;
  bulkMinimumStudents: number | null;
  bulkDiscountPercent: number | null;
  isVisible: boolean;
  isHighlighted: boolean;
  /** Badge label e.g. "Best value" */
  highlightLabel: string | null;
  sortOrder: number;
  featuresIncluded: string[];
  featuresExcluded: string[];
}

export type PricingPlanInput = Omit<PricingPlan, 'id'>;

const COLLECTION = 'pricing_plans';

const db = getFirebaseDb();

// ---------------------------------------------------------------------------
// Seed data — shown when no Firestore plans exist yet
// ---------------------------------------------------------------------------
export const SEED_PLANS: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    slug: 'basic',
    description: 'Entry-level access to past and practice papers.',
    tierType: 'basic',
    monthlyPriceUsd: 4,
    annualPriceUsd: 40,
    annualSavingsMonths: 2,
    perPaperPriceUsd: null,
    monthlyExamCap: 10,
    includesPracticePapers: true,
    includesPastPapers: true,
    includesBasicExplanations: true,
    includesFullExplanations: false,
    includesProgressTracking: false,
    includesParentAccess: false,
    includesAiHelp: false,
    includesTeacherSupport: false,
    teacherSupportNote: null,
    bulkMinimumStudents: null,
    bulkDiscountPercent: null,
    isVisible: true,
    isHighlighted: false,
    highlightLabel: null,
    sortOrder: 1,
    featuresIncluded: [
      'Past Papers + Practice Papers',
      'Up to 10 practice exams per month',
      'Instant score after each exam',
      'Basic explanations',
    ],
    featuresExcluded: ['Unlimited exams', 'Full explanations', 'Progress tracking', 'Parent visibility', 'AI help'],
  },
  {
    id: 'standard',
    name: 'Standard',
    slug: 'standard',
    description: 'Core plan for students preparing seriously for exams.',
    tierType: 'standard',
    monthlyPriceUsd: 7,
    annualPriceUsd: 70,
    annualSavingsMonths: 2,
    perPaperPriceUsd: null,
    monthlyExamCap: null,
    includesPracticePapers: true,
    includesPastPapers: true,
    includesBasicExplanations: true,
    includesFullExplanations: true,
    includesProgressTracking: true,
    includesParentAccess: true,
    includesAiHelp: false,
    includesTeacherSupport: false,
    teacherSupportNote: null,
    bulkMinimumStudents: null,
    bulkDiscountPercent: null,
    isVisible: true,
    isHighlighted: true,
    highlightLabel: 'Best value',
    sortOrder: 2,
    featuresIncluded: [
      'Everything in Basic',
      'Unlimited practice exams',
      'Full step-by-step explanations',
      'Progress tracking over time',
      'Parent visibility into performance',
    ],
    featuresExcluded: ['AI help', 'Teacher support'],
  },
  {
    id: 'premium',
    name: 'Premium',
    slug: 'premium',
    description: 'Advanced support layer for students who want more.',
    tierType: 'premium',
    monthlyPriceUsd: 10,
    annualPriceUsd: 100,
    annualSavingsMonths: 2,
    perPaperPriceUsd: null,
    monthlyExamCap: null,
    includesPracticePapers: true,
    includesPastPapers: true,
    includesBasicExplanations: true,
    includesFullExplanations: true,
    includesProgressTracking: true,
    includesParentAccess: true,
    includesAiHelp: true,
    includesTeacherSupport: true,
    teacherSupportNote: 'Where available',
    bulkMinimumStudents: null,
    bulkDiscountPercent: null,
    isVisible: true,
    isHighlighted: false,
    highlightLabel: null,
    sortOrder: 3,
    featuresIncluded: [
      'Everything in Standard',
      'AI-powered deeper explanations',
      'Teacher-in-the-loop support (where available)',
    ],
    featuresExcluded: [],
  },
  {
    id: 'pay_per_paper',
    name: 'Pay per paper',
    slug: 'pay-per-paper',
    description: 'Access one paper at a time. Good for occasional use.',
    tierType: 'pay_per_paper',
    monthlyPriceUsd: null,
    annualPriceUsd: null,
    annualSavingsMonths: 0,
    perPaperPriceUsd: 1,
    monthlyExamCap: null,
    includesPracticePapers: true,
    includesPastPapers: true,
    includesBasicExplanations: false,
    includesFullExplanations: true,
    includesProgressTracking: false,
    includesParentAccess: false,
    includesAiHelp: false,
    includesTeacherSupport: false,
    teacherSupportNote: null,
    bulkMinimumStudents: null,
    bulkDiscountPercent: null,
    isVisible: true,
    isHighlighted: false,
    highlightLabel: null,
    sortOrder: 4,
    featuresIncluded: [
      'One paper at a time',
      'Instant score',
      'Full explanations',
    ],
    featuresExcluded: ['Unlimited access', 'Progress tracking', 'Parent visibility'],
  },
  {
    id: 'school',
    name: 'School / Bulk',
    slug: 'school',
    description: 'Managed access for schools and institutions.',
    tierType: 'school',
    monthlyPriceUsd: null,
    annualPriceUsd: null,
    annualSavingsMonths: 0,
    perPaperPriceUsd: null,
    monthlyExamCap: null,
    includesPracticePapers: true,
    includesPastPapers: true,
    includesBasicExplanations: true,
    includesFullExplanations: true,
    includesProgressTracking: true,
    includesParentAccess: true,
    includesAiHelp: false,
    includesTeacherSupport: true,
    teacherSupportNote: null,
    bulkMinimumStudents: 50,
    bulkDiscountPercent: 40,
    isVisible: true,
    isHighlighted: false,
    highlightLabel: null,
    sortOrder: 5,
    featuresIncluded: [
      'Minimum 50 students',
      '40% discount on standard rates',
      'Annual billing available',
      'Managed onboarding',
      'Student performance reports',
    ],
    featuresExcluded: [],
  },
];

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------
export async function getPricingPlans(): Promise<PricingPlan[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTION), orderBy('sortOrder')));
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<PricingPlan, 'id'>),
  }));
}

// ---------------------------------------------------------------------------
// Write (admin only — enforced by Firestore rules)
// ---------------------------------------------------------------------------
export async function createPricingPlan(input: PricingPlanInput): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updatePricingPlan(id: string, input: Partial<PricingPlanInput>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePricingPlan(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
