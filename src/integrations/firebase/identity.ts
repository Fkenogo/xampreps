import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/integrations/firebase/client';

const call = <TReq, TRes>(name: string) =>
  httpsCallable<TReq, TRes>(getFirebaseFunctions(), name);

export interface ManagedStudentCreatePayload {
  firstName: string;
  lastName: string;
  country: string;
  educationLevel: string;
  relationshipType?: string;
  subjectTags?: string[];
  schoolId?: string;
  className?: string;
  streamName?: string;
}

export interface ManagedStudentProvisioningResult {
  ok: boolean;
  studentUid: string;
  studentDisplayName: string;
  accessCode: string;
  temporarySecret: string;
  temporarySecretIssued: boolean;
  creatorRole: 'parent' | 'teacher' | 'school_admin';
  schoolId: string | null;
  creationRecordId: string;
  relationshipLinkId: string;
}

export interface ManagedStudentListItem {
  studentUid: string;
  studentDisplayName: string;
  educationLevel: string | null;
  educationStage?: string | null;
  country: string | null;
  createdAt: string | null;
  relationshipLabel: string;
  relationshipType: string | null;
  schoolId: string | null;
  schoolName: string | null;
  className: string | null;
  streamName: string | null;
}

export interface ManagedStudentListResponse {
  ok: boolean;
  creatorRole: 'parent' | 'teacher' | 'school_admin';
  items: ManagedStudentListItem[];
  debug?: {
    totalLinks: number;
    hydrated: number;
    skippedMalformedLinks: number;
    missingUsers: number;
    missingStudentProfiles: number;
  };
}

export interface SchoolAdminManagedStudentListResponse extends ManagedStudentListResponse {
  activeSchools: Array<{
    schoolId: string;
    schoolName: string;
    role: string;
    createdAt: string | null;
  }>;
  selectedSchoolId: string | null;
}

export interface SchoolStaffCreatePayload {
  role: 'school_admin' | 'teacher';
  displayName: string;
  email: string;
  country?: string;
  phone?: string;
  jobTitle?: string;
  password?: string;
  schoolId?: string;
}

export interface SchoolStaffProvisioningResult {
  ok: boolean;
  created: boolean;
  uid: string;
  email: string;
  role: 'school_admin' | 'teacher';
  displayName: string;
  passwordIssued: boolean;
  temporaryPassword: string | null;
  schoolId: string;
  linkId: string;
}

export interface SchoolStaffListItem {
  uid: string;
  displayName: string;
  email: string;
  role: 'school_admin' | 'teacher';
  status: string;
  schoolId: string;
  schoolName: string;
  createdAt: string | null;
  jobTitle: string | null;
}

export interface SchoolStaffListResponse {
  ok: boolean;
  schoolId: string;
  schoolName: string;
  items: SchoolStaffListItem[];
}

export interface StudentAccessSignInResponse {
  ok: boolean;
  uid: string;
  role: 'student';
  customToken: string;
  displayName: string;
  onboardingState: 'provisioned' | 'first_login_pending' | 'active' | 'recovery_required';
  loginMode: 'access_code' | 'email_password' | 'both';
  mustChangePassword: boolean;
  mustSetPin: boolean;
}

export interface CompleteStudentFirstLoginPayload {
  newSecret: string;
  loginMode?: 'access_code' | 'email_password' | 'both';
}

export interface TeacherDashboardContextResponse {
  ok: boolean;
  activeSchools: Array<{
    schoolId: string;
    schoolName: string;
    role: string;
    employmentType: string;
    createdAt: string | null;
    jobTitle: string | null;
  }>;
}

export interface StudentLinkCodeItem {
  codeId: string;
  code: string | null;
  codeNormalized: string | null;
  targetType: 'parent' | 'school_admin' | 'teacher' | null;
  status: 'active' | 'claimed' | 'expired' | 'revoked' | null;
  expiresAt: string | null;
  claimedByUid: string | null;
  claimedAt: string | null;
  createdAt: string | null;
}

export interface StudentLinkCodesResponse {
  ok: boolean;
  items: StudentLinkCodeItem[];
}

export interface GenerateStudentLinkCodeResponse {
  ok: boolean;
  codeId: string;
  code: string;
  codeNormalized: string;
  targetType: 'parent' | 'school_admin' | 'teacher';
  status: 'active';
  expiresAt: string;
}

export interface ClaimStudentLinkResponse {
  ok: boolean;
  status: 'linked' | 'already_linked';
  alreadyLinked?: boolean;
  message?: string;
  linkId: string;
  studentUid: string;
  schoolId?: string;
}

export interface StudentLinkSummaryResponse {
  ok: boolean;
  parents: Array<{
    uid: string;
    displayName: string | null;
    email: string | null;
    relationshipLabel: string;
  }>;
  teachers: Array<{
    uid: string;
    displayName: string | null;
    email: string | null;
    schoolName?: string | null;
  }>;
  school: { id: string; name: string | null } | null;
}

export interface StudentInviteCodeItem {
  codeId: string;
  code: string | null;
  status: 'active' | 'claimed' | 'expired' | 'revoked' | null;
  expiresAt: string | null;
  createdAt: string | null;
  schoolId?: string | null;
}

export interface StudentInviteCodesResponse {
  ok: boolean;
  items: StudentInviteCodeItem[];
}

export interface ParentChildPerformanceSummaryResponse {
  ok: boolean;
  student: {
    uid: string;
    displayName: string | null;
    educationLevel: string | null;
    schoolName: string | null;
  };
  summary: {
    latestAttempts: Array<{
      examId: string | null;
      examTitle: string | null;
      subject: string | null;
      scorePercent: number | null;
      completedAt: string | null;
    }>;
    attemptsLast7Days: number;
    averageScorePercent: number | null;
    strongestSubject: {
      subject: string;
      averageScorePercent: number | null;
    } | null;
    weakestSubject: {
      subject: string;
      averageScorePercent: number | null;
    } | null;
    lastActivityAt: string | null;
    inactive: boolean;
  };
}

export interface CompleteAdultSelfSignupPayload {
  role: 'parent' | 'teacher' | 'school_admin';
  displayName?: string;
  country?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
}

export interface CompleteAdultSelfSignupResponse {
  ok: boolean;
  uid: string;
  role: 'parent' | 'teacher' | 'school_admin';
}

export async function createStudentAsParentFirebase(payload: ManagedStudentCreatePayload) {
  const fn = call<ManagedStudentCreatePayload, ManagedStudentProvisioningResult>('createStudentAsParent');
  return (await fn(payload)).data;
}

export async function completeAdultSelfSignupFirebase(payload: CompleteAdultSelfSignupPayload) {
  const fn = call<CompleteAdultSelfSignupPayload, CompleteAdultSelfSignupResponse>('completeAdultSelfSignup');
  return (await fn(payload)).data;
}

export async function createStudentAsTeacherFirebase(payload: ManagedStudentCreatePayload) {
  const fn = call<ManagedStudentCreatePayload, ManagedStudentProvisioningResult>('createStudentAsTeacher');
  return (await fn(payload)).data;
}

export async function createStudentAsSchoolAdminFirebase(payload: ManagedStudentCreatePayload) {
  const fn = call<ManagedStudentCreatePayload, ManagedStudentProvisioningResult>('createStudentAsSchoolAdmin');
  return (await fn(payload)).data;
}

export async function listManagedStudentsAsParentFirebase() {
  const fn = call<Record<string, never>, ManagedStudentListResponse>('listManagedStudentsAsParent');
  return (await fn({})).data;
}

export async function listManagedStudentsAsTeacherFirebase() {
  const fn = call<Record<string, never>, ManagedStudentListResponse>('listManagedStudentsAsTeacher');
  return (await fn({})).data;
}

export async function listManagedStudentsAsSchoolAdminFirebase() {
  const fn = call<Record<string, never>, SchoolAdminManagedStudentListResponse>('listManagedStudentsAsSchoolAdmin');
  return (await fn({})).data;
}

export async function createSchoolStaffUserFirebase(payload: SchoolStaffCreatePayload) {
  const fn = call<SchoolStaffCreatePayload, SchoolStaffProvisioningResult>('createSchoolStaffUser');
  return (await fn(payload)).data;
}

export async function listSchoolStaffFirebase(payload?: { schoolId?: string }) {
  const fn = call<{ schoolId?: string }, SchoolStaffListResponse>('listSchoolStaff');
  return (await fn(payload || {})).data;
}

export async function studentAccessSignInFirebase(payload: { accessCode: string; secret: string }) {
  const fn = call<{ accessCode: string; secret: string }, StudentAccessSignInResponse>('studentAccessSignIn');
  return (await fn(payload)).data;
}

export async function completeStudentFirstLoginFirebase(payload: CompleteStudentFirstLoginPayload) {
  const fn = call<CompleteStudentFirstLoginPayload, StudentAccessSignInResponse | {
    ok: boolean;
    onboardingState: 'active';
    loginMode: 'access_code' | 'email_password' | 'both';
    mustChangePassword: false;
    mustSetPin: false;
  }>('completeStudentFirstLogin');
  return (await fn(payload)).data;
}

export async function getTeacherDashboardContextFirebase() {
  const fn = call<Record<string, never>, TeacherDashboardContextResponse>('getTeacherDashboardContext');
  return (await fn({})).data;
}

export async function generateStudentLinkCodeFirebase(payload: { targetType: 'parent' | 'school_admin' | 'teacher' }) {
  const fn = call<{ targetType: 'parent' | 'school_admin' | 'teacher' }, GenerateStudentLinkCodeResponse>('generateStudentLinkCode');
  return (await fn(payload)).data;
}

export async function listStudentLinkCodesFirebase() {
  const fn = call<Record<string, never>, StudentLinkCodesResponse>('listStudentLinkCodes');
  return (await fn({})).data;
}

export async function claimStudentLinkAsParentFirebase(payload: { code: string }) {
  void payload;
  throw new Error('Legacy parent claim helper is disabled. Use claimStudentLinkCodeFirebase.');
}

export async function claimStudentLinkAsSchoolAdminFirebase(payload: { code: string }) {
  void payload;
  throw new Error('Legacy school-admin claim helper is disabled. Use claimStudentLinkCodeFirebase.');
}

export async function claimStudentLinkFromInviteCodeFirebase(payload: { code: string }) {
  void payload;
  throw new Error('Legacy invite-code claim helper is disabled. Use claimStudentLinkCodeFirebase.');
}

export async function claimStudentLinkCodeFirebase(payload: { code: string }) {
  const fn = call<{ code: string }, ClaimStudentLinkResponse>('claimStudentLinkCode');
  return (await fn(payload)).data;
}

export async function getStudentLinkSummaryFirebase() {
  const fn = call<Record<string, never>, StudentLinkSummaryResponse>('getStudentLinkSummary');
  return (await fn({})).data;
}

export async function generateStudentInviteAsParentFirebase() {
  const fn = call<Record<string, never>, { ok: boolean; codeId: string; code: string; expiresAt: string; targetType: 'parent' }>(
    'generateStudentInviteAsParent'
  );
  return (await fn({})).data;
}

export async function listStudentInvitesAsParentFirebase() {
  const fn = call<Record<string, never>, StudentInviteCodesResponse>('listStudentInvitesAsParent');
  return (await fn({})).data;
}

export async function getParentChildPerformanceSummaryFirebase(payload: { studentUid: string }) {
  const fn = call<{ studentUid: string }, ParentChildPerformanceSummaryResponse>('getParentChildPerformanceSummary');
  return (await fn(payload)).data;
}

// Teacher-scoped performance summary — identical response shape to parent version.
// Backed by getTeacherStudentPerformanceSummary Cloud Function which enforces
// teacher-student link verification and permissions.viewProgress before returning data.
export type TeacherStudentPerformanceSummaryResponse = ParentChildPerformanceSummaryResponse;

export async function getTeacherStudentPerformanceSummaryFirebase(payload: { studentUid: string }) {
  const fn = call<{ studentUid: string }, TeacherStudentPerformanceSummaryResponse>('getTeacherStudentPerformanceSummary');
  return (await fn(payload)).data;
}

export async function generateStudentInviteAsSchoolAdminFirebase() {
  const fn = call<Record<string, never>, { ok: boolean; codeId: string; code: string; expiresAt: string; targetType: 'school_admin'; schoolId: string; schoolName: string }>(
    'generateStudentInviteAsSchoolAdmin'
  );
  return (await fn({})).data;
}

export async function listStudentInvitesAsSchoolAdminFirebase() {
  const fn = call<Record<string, never>, StudentInviteCodesResponse>('listStudentInvitesAsSchoolAdmin');
  return (await fn({})).data;
}

export async function generateStudentInviteAsTeacherFirebase() {
  const fn = call<Record<string, never>, { ok: boolean; codeId: string; code: string; expiresAt: string; targetType: 'teacher' }>(
    'generateStudentInviteAsTeacher'
  );
  return (await fn({})).data;
}

export async function listStudentInvitesAsTeacherFirebase() {
  const fn = call<Record<string, never>, StudentInviteCodesResponse>('listStudentInvitesAsTeacher');
  return (await fn({})).data;
}
