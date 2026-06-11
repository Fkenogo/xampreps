import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/integrations/firebase/client';
import { listExamsFirebase } from '@/integrations/firebase/content';

const call = <TReq, TRes>(name: string) =>
  httpsCallable<TReq, TRes>(getFirebaseFunctions(), name);

type UnknownRecord = Record<string, unknown>;
type UnknownItem = Record<string, unknown>;

interface AdminDashboardSummaryResponse {
  ok: boolean;
  users: UnknownItem[];
  exams: UnknownItem[];
  stats: {
    totalUsers: number;
    totalExams: number;
    totalAttempts: number;
    premiumUsers: number;
  };
}

interface AdminListItemsResponse {
  ok: boolean;
  items: UnknownItem[];
}

export interface AdminSchoolAdminCandidate {
  id: string;
  name: string;
  email: string;
  role: 'school_admin';
  status?: string;
}

interface AdminSchoolAdminCandidatesResponse {
  ok: boolean;
  items: AdminSchoolAdminCandidate[];
  debug?: {
    source: string;
    matchedCanonicalUsers: number;
    eligibleCandidates: number;
  };
}

export interface AdminSchoolListItem {
  schoolId: string;
  name: string;
  shortName?: string | null;
  registrationNumber?: string | null;
  country: string;
  district?: string | null;
  schoolType: 'primary' | 'secondary' | 'mixed' | 'other';
  status: 'pending' | 'active' | 'suspended' | 'archived';
  subscriptionTier: 'free' | 'premium' | 'enterprise';
  onboardingMode: 'admin_created' | 'request_approved';
  primaryAdminUid?: string | null;
  billingOwnerUid?: string | null;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
  primaryAdmin?: {
    uid: string;
    name: string;
    email: string;
  } | null;
}

export interface AdminCreateSchoolPayload {
  name: string;
  country: string;
  schoolType: 'primary' | 'secondary' | 'mixed' | 'other';
  schoolAdminUid: string;
  shortName?: string;
  registrationNumber?: string;
  district?: string;
}

interface AdminCreateSchoolResponse {
  ok: boolean;
  schoolId: string;
  school: UnknownRecord;
  schoolAdminLinkId: string;
}

export interface AdminResetIdentitySystemPayload {
  dryRun?: boolean;
  confirm?: string;
}

export interface AdminResetIdentitySystemResponse {
  ok: boolean;
  dryRun: boolean;
  confirmRequiredToken: string | null;
  actorUid: string;
  preservedUsers: Array<{
    uid: string;
    email: string | null;
    role: string | null;
  }>;
  auth: {
    matched: number;
    preserved: number;
    wouldDelete: number;
    deleted: number;
    failures: Array<{ index: number; uid: string; error: string }>;
  };
  firestoreCollections: Array<{
    collection: string;
    matched: number;
    deleted: number;
  }>;
  prunedCollections: Array<{
    collection: string;
    matched: number;
    preserved: number;
    deleted: number;
    wouldDelete: number;
  }>;
}

export interface AdminIdentityCoverageReport {
  ok: boolean;
  totalUsers: number;
  studentCount: number;
  adultCount: number;
  scanned: number;
  truncated: boolean;
  missing: {
    users: string[];
    studentProfiles: string[];
    adultProfiles: string[];
  };
  legacyFallback: {
    profiles: string[];
    userRoles: string[];
  };
}

export interface AdminIdentityRepairReport {
  ok: boolean;
  scanned: number;
  repairedUsers: number;
  repairedStudentProfiles: number;
  repairedAdultProfiles: number;
  skipped: number;
  missingAfterRepair: {
    users: string[];
    studentProfiles: string[];
    adultProfiles: string[];
  };
}

export interface AdminIdentityAuditPayload {
  maxUsers?: number;
}

export interface AdminProvisionIdentityTestUserPayload {
  role: 'parent' | 'teacher' | 'school_admin';
  email: string;
  displayName: string;
  country?: string;
  password?: string;
}

export interface AdminProvisionIdentityTestUserResponse {
  ok: boolean;
  created: boolean;
  uid: string;
  email: string;
  role: 'parent' | 'teacher' | 'school_admin';
  displayName: string;
  passwordIssued: boolean;
  temporaryPassword: string | null;
}

export async function adminDashboardSummaryFirebase() {
  const fn = call<Record<string, never>, AdminDashboardSummaryResponse>('adminDashboardSummary');
  return (await fn({})).data;
}

export async function adminListExamsFirebase() {
  const listed = await listExamsFirebase();
  return { ok: true, items: listed.items as UnknownItem[] } satisfies AdminListItemsResponse;
}

export async function adminListSchoolsFirebase() {
  const fn = call<Record<string, never>, AdminListItemsResponse>('adminListSchools');
  return (await fn({})).data as { ok: boolean; items: AdminSchoolListItem[] };
}

export async function adminListSchoolAdminCandidatesFirebase() {
  const fn = call<Record<string, never>, AdminSchoolAdminCandidatesResponse>('adminListSchoolAdminCandidates');
  return (await fn({})).data;
}

export async function adminCreateSchoolFirebase(payload: AdminCreateSchoolPayload) {
  const fn = call<AdminCreateSchoolPayload, AdminCreateSchoolResponse>('adminCreateSchool');
  return (await fn(payload)).data;
}

export async function adminResetIdentitySystemFirebase(payload: AdminResetIdentitySystemPayload) {
  const fn = call<AdminResetIdentitySystemPayload, AdminResetIdentitySystemResponse>('adminResetIdentitySystem');
  return (await fn(payload)).data;
}

export async function adminAuditCanonicalIdentityCoverageFirebase(payload?: AdminIdentityAuditPayload) {
  const fn = call<AdminIdentityAuditPayload, AdminIdentityCoverageReport>('adminAuditCanonicalIdentityCoverage');
  return (await fn(payload || {})).data;
}

export async function adminRepairCanonicalIdentityCoverageFirebase(payload?: AdminIdentityAuditPayload) {
  const fn = call<AdminIdentityAuditPayload, AdminIdentityRepairReport>('adminRepairCanonicalIdentityCoverage');
  return (await fn(payload || {})).data;
}

export async function adminProvisionIdentityTestUserFirebase(payload: AdminProvisionIdentityTestUserPayload) {
  const fn = call<AdminProvisionIdentityTestUserPayload, AdminProvisionIdentityTestUserResponse>('adminProvisionIdentityTestUser');
  return (await fn(payload)).data;
}

function legacyAdminDisabled(action: string): never {
  throw new Error(`${action} has been disabled. The legacy exam admin schema is retired and XamPreps now uses V2-only exam data.`);
}

export async function adminUpsertExamFirebase(_payload: UnknownRecord) {
  legacyAdminDisabled('Exam creation/editing');
}

export async function adminDuplicateExamFirebase(_examId: string) {
  legacyAdminDisabled('Exam duplication');
}

export async function adminListExamQuestionsPreviewFirebase(_examId: string) {
  legacyAdminDisabled('Legacy question preview');
}

export async function adminListExamQuestionsFullFirebase(_examId: string) {
  legacyAdminDisabled('Legacy question editor');
}

export async function adminSaveExamQuestionsFirebase(_examId: string, _questions: UnknownItem[]) {
  legacyAdminDisabled('Legacy question saving');
}

export async function adminBulkImportQuestionsFirebase(_examId: string, _questions: UnknownItem[]) {
  legacyAdminDisabled('Legacy bulk question import');
}

export async function adminSetQuestionImageUrlsFirebase(
  _examId: string,
  _updates: Array<{ question_number: number; image_url: string }>,
) {
  legacyAdminDisabled('Legacy question image patching');
}
