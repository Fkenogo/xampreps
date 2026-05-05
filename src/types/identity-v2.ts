import type { NormalizedEducationStage } from '@/lib/education-system';

/**
 * XamPreps Identity V2 Type Definitions
 *
 * Canonical identity model for users, schools, managed student access,
 * and relationship links. This layer is additive and migration-safe.
 */

export type XamAuthUserRole =
  | 'student'
  | 'parent'
  | 'teacher'
  | 'school_admin'
  | 'admin'
  | 'super_admin';

export type XamAdultUserRole = Exclude<XamAuthUserRole, 'student'>;

export type XamUserStatus =
  | 'active'
  | 'invited'
  | 'pending_setup'
  | 'suspended'
  | 'archived';

export type XamSchoolType = 'primary' | 'secondary' | 'mixed' | 'other';
export type XamSchoolStatus = 'pending' | 'active' | 'suspended' | 'archived';
export type XamSubscriptionTier = 'free' | 'premium' | 'enterprise';
export type XamSchoolOnboardingMode = 'admin_created' | 'request_approved';

export type XamStudentLearningMode =
  | 'self'
  | 'parent_managed'
  | 'school_managed'
  | 'teacher_managed'
  | 'hybrid';

export type XamStudentLoginMode = 'access_code' | 'email_password' | 'both';
export type XamStudentOnboardingState =
  | 'provisioned'
  | 'first_login_pending'
  | 'active'
  | 'recovery_required';

export type XamAdultType = 'parent' | 'teacher' | 'school_admin';

export type XamStudentCredentialState =
  | 'temporary'
  | 'active'
  | 'locked'
  | 'reset_required'
  | 'archived';

export type XamLoginAliasType = 'student_access_code';
export type XamLinkStatus = 'active' | 'pending' | 'revoked' | 'archived';
export type XamStudentLinkTarget = 'parent' | 'school_admin' | 'teacher';
export type XamStudentLinkCodeStatus = 'active' | 'claimed' | 'expired' | 'revoked';
export type XamTeacherStudentSource =
  | 'teacher_created'
  | 'school_assigned'
  | 'invited'
  | 'claimed';

export type XamTeacherStudentScope = 'full' | 'academic' | 'marking_only';
export type XamTeacherSchoolEmploymentType = 'staff' | 'contractor' | 'partner' | 'tutor';
export type XamSchoolAdminRole = 'owner' | 'director' | 'headteacher' | 'operations' | 'bursar' | 'staff_admin';

export type XamStudentCreationMethod =
  | 'self_signup'
  | 'parent_created'
  | 'teacher_created'
  | 'school_admin_created';

export type XamCreationRecordState =
  | 'provisioned'
  | 'first_login_pending'
  | 'active'
  | 'failed'
  | 'archived';

export type XamPreviewTargetRole = XamAuthUserRole;

export interface XamAuthProviderSummary {
  hasPassword: boolean;
  providers: string[];
}

export interface XamUser {
  uid: string;
  primaryRole: XamAuthUserRole;
  secondaryRoles: XamAuthUserRole[];
  status: XamUserStatus;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  hasEmailLogin: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  authProviderSummary?: XamAuthProviderSummary;
  profileVersion: number;
}

export interface XamSchool {
  schoolId: string;
  name: string;
  shortName?: string | null;
  registrationNumber?: string | null;
  country: string;
  district?: string | null;
  schoolType: XamSchoolType;
  status: XamSchoolStatus;
  subscriptionTier: XamSubscriptionTier;
  onboardingMode: XamSchoolOnboardingMode;
  primaryAdminUid?: string | null;
  billingOwnerUid?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface XamStudentProfile {
  uid: string;
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  country: string;
  educationLevel: string;
  educationStage?: NormalizedEducationStage | null;
  gradeLevel?: string | null;
  candidateNumber?: string | null;
  learningMode: XamStudentLearningMode;
  loginMode: XamStudentLoginMode;
  onboardingState: XamStudentOnboardingState;
  mustChangePassword: boolean;
  mustSetPin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface XamAdultProfile {
  uid: string;
  adultType: XamAdultType;
  firstName: string;
  lastName: string;
  phone?: string | null;
  country: string;
  jobTitle?: string | null;
  status: XamUserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface XamStudentAccess {
  studentUid: string;
  accessCode: string;
  accessCodeNormalized: string;
  temporarySecretHash?: string | null;
  pinHash?: string | null;
  passwordInitialized: boolean;
  failedAttempts: number;
  lockedUntil?: Date | null;
  lastAccessCodeRotationAt?: Date | null;
  lastLoginAt?: Date | null;
  credentialState: XamStudentCredentialState;
  createdAt: Date;
  updatedAt: Date;
}

export interface XamAuthLoginAlias {
  aliasKey: string;
  uid: string;
  type: XamLoginAliasType;
  status: XamLinkStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface XamStudentLinkCode {
  codeId: string;
  studentUid: string;
  studentDisplayName: string;
  studentCountry?: string | null;
  studentEducationLevel?: string | null;
  targetType: XamStudentLinkTarget;
  code: string;
  codeNormalized: string;
  status: XamStudentLinkCodeStatus;
  expiresAt: Date;
  claimedByUid?: string | null;
  claimedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface XamParentStudentPermissions {
  viewProgress: boolean;
  manageAccount: boolean;
  receiveAlerts: boolean;
}

export interface XamParentStudentLink {
  linkId: string;
  parentUid: string;
  studentUid: string;
  relationshipType: 'mother' | 'father' | 'guardian' | 'sponsor' | 'other';
  status: XamLinkStatus;
  permissions: XamParentStudentPermissions;
  createdAt: Date;
  createdBy: string;
}

export interface XamSchoolStudentPermissions {
  viewProgress: boolean;
  manageRoster: boolean;
}

export interface XamSchoolStudentLink {
  linkId: string;
  schoolId: string;
  studentUid: string;
  status: XamLinkStatus;
  studentNumber?: string | null;
  className?: string | null;
  streamName?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  permissions: XamSchoolStudentPermissions;
  createdAt: Date;
  createdBy: string;
}

export interface XamTeacherStudentPermissions {
  viewProgress: boolean;
  assignWork: boolean;
  futureMarking: boolean;
}

export interface XamTeacherStudentLink {
  linkId: string;
  teacherUid: string;
  studentUid: string;
  status: XamLinkStatus;
  source: XamTeacherStudentSource;
  scope: XamTeacherStudentScope;
  subjectTags: string[];
  permissions: XamTeacherStudentPermissions;
  createdAt: Date;
  createdBy: string;
}

export interface XamTeacherSchoolLink {
  linkId: string;
  teacherUid: string;
  schoolId: string;
  status: XamLinkStatus;
  employmentType: XamTeacherSchoolEmploymentType;
  subjectTags: string[];
  createdAt: Date;
  createdBy: string;
}

export interface XamSchoolAdminPermissions {
  manageStudents: boolean;
  manageTeachers: boolean;
  manageBilling: boolean;
  viewAnalytics: boolean;
}

export interface XamSchoolAdminLink {
  linkId: string;
  schoolId: string;
  uid: string;
  role: XamSchoolAdminRole;
  status: XamLinkStatus;
  permissions: XamSchoolAdminPermissions;
  createdAt: Date;
  createdBy: string;
}

export interface XamInitialLinkTargets {
  parentUid?: string;
  schoolId?: string;
  teacherUids?: string[];
}

export interface XamStudentCreationRecord {
  recordId: string;
  studentUid: string;
  createdByUid: string;
  createdByRole: Extract<XamAuthUserRole, 'student' | 'parent' | 'teacher' | 'school_admin' | 'admin' | 'super_admin'>;
  creationMethod: XamStudentCreationMethod;
  initialLinkTargets: XamInitialLinkTargets;
  initialAccessCode?: string | null;
  setupState: XamCreationRecordState;
  createdAt: Date;
}

export interface XamAdminPreviewSession {
  sessionId: string;
  adminUid: string;
  targetUid: string;
  targetRole: XamPreviewTargetRole;
  reason?: string | null;
  createdAt: Date;
  expiresAt: Date;
}
