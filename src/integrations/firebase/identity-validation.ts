/**
 * XamPreps Identity V2 Validation Helpers
 *
 * Additive validation layer for the new identity architecture.
 */

import type {
  XamAdminPreviewSession,
  XamAdultProfile,
  XamAuthLoginAlias,
  XamSchool,
  XamSchoolAdminLink,
  XamSchoolStudentLink,
  XamStudentAccess,
  XamStudentCreationRecord,
  XamStudentProfile,
  XamTeacherSchoolLink,
  XamTeacherStudentLink,
  XamParentStudentLink,
  XamUser,
} from '@/types/identity-v2';
import {
  getStageForEducationLevel,
  normalizeCountry,
  normalizeCountryAndLevel,
} from '@/lib/education-system';

const USER_ROLES = ['student', 'parent', 'teacher', 'school_admin', 'admin', 'super_admin'] as const;
const USER_STATUSES = ['active', 'invited', 'pending_setup', 'suspended', 'archived'] as const;
const SCHOOL_TYPES = ['primary', 'secondary', 'mixed', 'other'] as const;
const SCHOOL_STATUSES = ['pending', 'active', 'suspended', 'archived'] as const;
const SUBSCRIPTION_TIERS = ['free', 'premium', 'enterprise'] as const;
const SCHOOL_ONBOARDING_MODES = ['admin_created', 'request_approved'] as const;
const STUDENT_LEARNING_MODES = ['self', 'parent_managed', 'school_managed', 'teacher_managed', 'hybrid'] as const;
const STUDENT_LOGIN_MODES = ['access_code', 'email_password', 'both'] as const;
const STUDENT_ONBOARDING_STATES = ['provisioned', 'first_login_pending', 'active', 'recovery_required'] as const;
const ADULT_TYPES = ['parent', 'teacher', 'school_admin'] as const;
const CREDENTIAL_STATES = ['temporary', 'active', 'locked', 'reset_required', 'archived'] as const;
const LINK_STATUSES = ['active', 'pending', 'revoked', 'archived'] as const;
const LOGIN_ALIAS_TYPES = ['student_access_code'] as const;
const TEACHER_STUDENT_SOURCES = ['teacher_created', 'school_assigned', 'invited', 'claimed'] as const;
const TEACHER_STUDENT_SCOPES = ['full', 'academic', 'marking_only'] as const;
const TEACHER_SCHOOL_EMPLOYMENT_TYPES = ['staff', 'contractor', 'partner', 'tutor'] as const;
const SCHOOL_ADMIN_ROLES = ['owner', 'director', 'headteacher', 'operations', 'bursar', 'staff_admin'] as const;
const STUDENT_CREATION_METHODS = ['self_signup', 'parent_created', 'teacher_created', 'school_admin_created'] as const;
const CREATION_RECORD_STATES = ['provisioned', 'first_login_pending', 'active', 'failed', 'archived'] as const;
const PARENT_RELATIONSHIP_TYPES = ['mother', 'father', 'guardian', 'sponsor', 'other'] as const;

export interface IdentityValidationError {
  field: string;
  message: string;
}

export interface IdentityValidationResult {
  valid: boolean;
  errors: IdentityValidationError[];
}

function validResult(): IdentityValidationResult {
  return { valid: true, errors: [] };
}

function invalidResult(errors: IdentityValidationError[]): IdentityValidationResult {
  return { valid: false, errors };
}

function createError(field: string, message: string): IdentityValidationError {
  return { field, message };
}

function isValidEnum(value: string, allowed: readonly string[]): boolean {
  return allowed.includes(value as never);
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isBoolean(value: unknown): boolean {
  return typeof value === 'boolean';
}

function isNonNegativeNumber(value: unknown): boolean {
  return typeof value === 'number' && value >= 0;
}

function isDateLike(value: unknown): boolean {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function validateStringArray(
  errors: IdentityValidationError[],
  field: string,
  value: unknown,
  allowEmpty = true,
) {
  if (!Array.isArray(value)) {
    errors.push(createError(field, `${field} must be an array`));
    return;
  }
  if (!allowEmpty && value.length === 0) {
    errors.push(createError(field, `${field} must not be empty`));
    return;
  }
  value.forEach((entry, index) => {
    if (!isNonEmptyString(entry)) {
      errors.push(createError(`${field}[${index}]`, 'Must be a non-empty string'));
    }
  });
}

export function validateIdentityUser(user: Partial<XamUser>): IdentityValidationResult {
  const errors: IdentityValidationError[] = [];

  if (!isNonEmptyString(user.uid)) errors.push(createError('uid', 'uid is required'));
  if (!isNonEmptyString(user.displayName)) errors.push(createError('displayName', 'displayName is required'));
  if (!user.primaryRole || !isValidEnum(user.primaryRole, USER_ROLES)) {
    errors.push(createError('primaryRole', `primaryRole must be one of: ${USER_ROLES.join(', ')}`));
  }
  if (!user.status || !isValidEnum(user.status, USER_STATUSES)) {
    errors.push(createError('status', `status must be one of: ${USER_STATUSES.join(', ')}`));
  }
  if (!Array.isArray(user.secondaryRoles)) {
    errors.push(createError('secondaryRoles', 'secondaryRoles must be an array'));
  } else {
    user.secondaryRoles.forEach((role, index) => {
      if (!isValidEnum(role, USER_ROLES)) {
        errors.push(createError(`secondaryRoles[${index}]`, 'Invalid role value'));
      }
    });
  }
  if (!isBoolean(user.hasEmailLogin)) errors.push(createError('hasEmailLogin', 'hasEmailLogin must be a boolean'));
  if (user.profileVersion !== undefined && !isNonNegativeNumber(user.profileVersion)) {
    errors.push(createError('profileVersion', 'profileVersion must be a non-negative number'));
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

export function validateSchool(school: Partial<XamSchool>): IdentityValidationResult {
  const errors: IdentityValidationError[] = [];

  if (!isNonEmptyString(school.schoolId)) errors.push(createError('schoolId', 'schoolId is required'));
  if (!isNonEmptyString(school.name)) errors.push(createError('name', 'name is required'));
  if (!isNonEmptyString(school.country)) {
    errors.push(createError('country', 'country is required'));
  } else if (!normalizeCountry(school.country)) {
    errors.push(createError('country', 'country must be a supported country'));
  }
  if (!school.schoolType || !isValidEnum(school.schoolType, SCHOOL_TYPES)) {
    errors.push(createError('schoolType', `schoolType must be one of: ${SCHOOL_TYPES.join(', ')}`));
  }
  if (!school.status || !isValidEnum(school.status, SCHOOL_STATUSES)) {
    errors.push(createError('status', `status must be one of: ${SCHOOL_STATUSES.join(', ')}`));
  }
  if (!school.subscriptionTier || !isValidEnum(school.subscriptionTier, SUBSCRIPTION_TIERS)) {
    errors.push(createError('subscriptionTier', `subscriptionTier must be one of: ${SUBSCRIPTION_TIERS.join(', ')}`));
  }
  if (!school.onboardingMode || !isValidEnum(school.onboardingMode, SCHOOL_ONBOARDING_MODES)) {
    errors.push(createError('onboardingMode', `onboardingMode must be one of: ${SCHOOL_ONBOARDING_MODES.join(', ')}`));
  }
  if (!isNonEmptyString(school.createdBy)) errors.push(createError('createdBy', 'createdBy is required'));

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

export function validateStudentProfile(profile: Partial<XamStudentProfile>): IdentityValidationResult {
  const errors: IdentityValidationError[] = [];

  if (!isNonEmptyString(profile.uid)) errors.push(createError('uid', 'uid is required'));
  if (!isNonEmptyString(profile.firstName)) errors.push(createError('firstName', 'firstName is required'));
  if (!isNonEmptyString(profile.lastName)) errors.push(createError('lastName', 'lastName is required'));
  if (!isNonEmptyString(profile.country)) {
    errors.push(createError('country', 'country is required'));
  } else if (!normalizeCountry(profile.country)) {
    errors.push(createError('country', 'country must be a supported country'));
  }
  if (!isNonEmptyString(profile.educationLevel)) {
    errors.push(createError('educationLevel', 'educationLevel is required'));
  } else {
    const normalized = normalizeCountryAndLevel({
      country: profile.country,
      level: profile.educationLevel,
    });
    if (!normalized.valid) {
      errors.push(createError('educationLevel', 'educationLevel must match the selected country'));
    }
    if (profile.educationStage !== undefined && profile.educationStage !== null) {
      const expectedStage = getStageForEducationLevel(profile.country, profile.educationLevel);
      if (profile.educationStage !== expectedStage) {
        errors.push(createError('educationStage', 'educationStage must match the derived stage for country and educationLevel'));
      }
    }
  }
  if (!profile.learningMode || !isValidEnum(profile.learningMode, STUDENT_LEARNING_MODES)) {
    errors.push(createError('learningMode', `learningMode must be one of: ${STUDENT_LEARNING_MODES.join(', ')}`));
  }
  if (!profile.loginMode || !isValidEnum(profile.loginMode, STUDENT_LOGIN_MODES)) {
    errors.push(createError('loginMode', `loginMode must be one of: ${STUDENT_LOGIN_MODES.join(', ')}`));
  }
  if (!profile.onboardingState || !isValidEnum(profile.onboardingState, STUDENT_ONBOARDING_STATES)) {
    errors.push(createError('onboardingState', `onboardingState must be one of: ${STUDENT_ONBOARDING_STATES.join(', ')}`));
  }
  if (!isBoolean(profile.mustChangePassword)) errors.push(createError('mustChangePassword', 'mustChangePassword must be a boolean'));
  if (!isBoolean(profile.mustSetPin)) errors.push(createError('mustSetPin', 'mustSetPin must be a boolean'));
  if (profile.dateOfBirth !== undefined && profile.dateOfBirth !== null && !isDateLike(profile.dateOfBirth)) {
    errors.push(createError('dateOfBirth', 'dateOfBirth must be a valid Date when provided'));
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

export function validateAdultProfile(profile: Partial<XamAdultProfile>): IdentityValidationResult {
  const errors: IdentityValidationError[] = [];

  if (!isNonEmptyString(profile.uid)) errors.push(createError('uid', 'uid is required'));
  if (!isNonEmptyString(profile.firstName)) errors.push(createError('firstName', 'firstName is required'));
  if (!isNonEmptyString(profile.lastName)) errors.push(createError('lastName', 'lastName is required'));
  if (!isNonEmptyString(profile.country)) {
    errors.push(createError('country', 'country is required'));
  } else if (!normalizeCountry(profile.country)) {
    errors.push(createError('country', 'country must be a supported country'));
  }
  if (!profile.adultType || !isValidEnum(profile.adultType, ADULT_TYPES)) {
    errors.push(createError('adultType', `adultType must be one of: ${ADULT_TYPES.join(', ')}`));
  }
  if (!profile.status || !isValidEnum(profile.status, USER_STATUSES)) {
    errors.push(createError('status', `status must be one of: ${USER_STATUSES.join(', ')}`));
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

export function validateStudentAccess(access: Partial<XamStudentAccess>): IdentityValidationResult {
  const errors: IdentityValidationError[] = [];

  if (!isNonEmptyString(access.studentUid)) errors.push(createError('studentUid', 'studentUid is required'));
  if (!isNonEmptyString(access.accessCode)) errors.push(createError('accessCode', 'accessCode is required'));
  if (!isNonEmptyString(access.accessCodeNormalized)) errors.push(createError('accessCodeNormalized', 'accessCodeNormalized is required'));
  if (!access.credentialState || !isValidEnum(access.credentialState, CREDENTIAL_STATES)) {
    errors.push(createError('credentialState', `credentialState must be one of: ${CREDENTIAL_STATES.join(', ')}`));
  }
  if (!isBoolean(access.passwordInitialized)) errors.push(createError('passwordInitialized', 'passwordInitialized must be a boolean'));
  if (access.failedAttempts !== undefined && !isNonNegativeNumber(access.failedAttempts)) {
    errors.push(createError('failedAttempts', 'failedAttempts must be a non-negative number'));
  }
  if (access.lockedUntil !== undefined && access.lockedUntil !== null && !isDateLike(access.lockedUntil)) {
    errors.push(createError('lockedUntil', 'lockedUntil must be a valid Date when provided'));
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

export function validateAuthLoginAlias(alias: Partial<XamAuthLoginAlias>): IdentityValidationResult {
  const errors: IdentityValidationError[] = [];

  if (!isNonEmptyString(alias.aliasKey)) errors.push(createError('aliasKey', 'aliasKey is required'));
  if (!isNonEmptyString(alias.uid)) errors.push(createError('uid', 'uid is required'));
  if (!alias.type || !isValidEnum(alias.type, LOGIN_ALIAS_TYPES)) {
    errors.push(createError('type', `type must be one of: ${LOGIN_ALIAS_TYPES.join(', ')}`));
  }
  if (!alias.status || !isValidEnum(alias.status, LINK_STATUSES)) {
    errors.push(createError('status', `status must be one of: ${LINK_STATUSES.join(', ')}`));
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

export function validateParentStudentLink(link: Partial<XamParentStudentLink>): IdentityValidationResult {
  const errors: IdentityValidationError[] = [];

  if (!isNonEmptyString(link.linkId)) errors.push(createError('linkId', 'linkId is required'));
  if (!isNonEmptyString(link.parentUid)) errors.push(createError('parentUid', 'parentUid is required'));
  if (!isNonEmptyString(link.studentUid)) errors.push(createError('studentUid', 'studentUid is required'));
  if (!link.relationshipType || !isValidEnum(link.relationshipType, PARENT_RELATIONSHIP_TYPES)) {
    errors.push(createError('relationshipType', `relationshipType must be one of: ${PARENT_RELATIONSHIP_TYPES.join(', ')}`));
  }
  if (!link.status || !isValidEnum(link.status, LINK_STATUSES)) {
    errors.push(createError('status', `status must be one of: ${LINK_STATUSES.join(', ')}`));
  }
  if (!isNonEmptyString(link.createdBy)) errors.push(createError('createdBy', 'createdBy is required'));

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

export function validateSchoolStudentLink(link: Partial<XamSchoolStudentLink>): IdentityValidationResult {
  const errors: IdentityValidationError[] = [];

  if (!isNonEmptyString(link.linkId)) errors.push(createError('linkId', 'linkId is required'));
  if (!isNonEmptyString(link.schoolId)) errors.push(createError('schoolId', 'schoolId is required'));
  if (!isNonEmptyString(link.studentUid)) errors.push(createError('studentUid', 'studentUid is required'));
  if (!link.status || !isValidEnum(link.status, LINK_STATUSES)) {
    errors.push(createError('status', `status must be one of: ${LINK_STATUSES.join(', ')}`));
  }
  if (!isNonEmptyString(link.createdBy)) errors.push(createError('createdBy', 'createdBy is required'));

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

export function validateTeacherStudentLink(link: Partial<XamTeacherStudentLink>): IdentityValidationResult {
  const errors: IdentityValidationError[] = [];

  if (!isNonEmptyString(link.linkId)) errors.push(createError('linkId', 'linkId is required'));
  if (!isNonEmptyString(link.teacherUid)) errors.push(createError('teacherUid', 'teacherUid is required'));
  if (!isNonEmptyString(link.studentUid)) errors.push(createError('studentUid', 'studentUid is required'));
  if (!link.status || !isValidEnum(link.status, LINK_STATUSES)) {
    errors.push(createError('status', `status must be one of: ${LINK_STATUSES.join(', ')}`));
  }
  if (!link.source || !isValidEnum(link.source, TEACHER_STUDENT_SOURCES)) {
    errors.push(createError('source', `source must be one of: ${TEACHER_STUDENT_SOURCES.join(', ')}`));
  }
  if (!link.scope || !isValidEnum(link.scope, TEACHER_STUDENT_SCOPES)) {
    errors.push(createError('scope', `scope must be one of: ${TEACHER_STUDENT_SCOPES.join(', ')}`));
  }
  if (!Array.isArray(link.subjectTags)) {
    errors.push(createError('subjectTags', 'subjectTags must be an array'));
  }
  if (!isNonEmptyString(link.createdBy)) errors.push(createError('createdBy', 'createdBy is required'));

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

export function validateTeacherSchoolLink(link: Partial<XamTeacherSchoolLink>): IdentityValidationResult {
  const errors: IdentityValidationError[] = [];

  if (!isNonEmptyString(link.linkId)) errors.push(createError('linkId', 'linkId is required'));
  if (!isNonEmptyString(link.teacherUid)) errors.push(createError('teacherUid', 'teacherUid is required'));
  if (!isNonEmptyString(link.schoolId)) errors.push(createError('schoolId', 'schoolId is required'));
  if (!link.status || !isValidEnum(link.status, LINK_STATUSES)) {
    errors.push(createError('status', `status must be one of: ${LINK_STATUSES.join(', ')}`));
  }
  if (!link.employmentType || !isValidEnum(link.employmentType, TEACHER_SCHOOL_EMPLOYMENT_TYPES)) {
    errors.push(createError('employmentType', `employmentType must be one of: ${TEACHER_SCHOOL_EMPLOYMENT_TYPES.join(', ')}`));
  }
  if (!Array.isArray(link.subjectTags)) {
    errors.push(createError('subjectTags', 'subjectTags must be an array'));
  }
  if (!isNonEmptyString(link.createdBy)) errors.push(createError('createdBy', 'createdBy is required'));

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

export function validateSchoolAdminLink(link: Partial<XamSchoolAdminLink>): IdentityValidationResult {
  const errors: IdentityValidationError[] = [];

  if (!isNonEmptyString(link.linkId)) errors.push(createError('linkId', 'linkId is required'));
  if (!isNonEmptyString(link.schoolId)) errors.push(createError('schoolId', 'schoolId is required'));
  if (!isNonEmptyString(link.uid)) errors.push(createError('uid', 'uid is required'));
  if (!link.role || !isValidEnum(link.role, SCHOOL_ADMIN_ROLES)) {
    errors.push(createError('role', `role must be one of: ${SCHOOL_ADMIN_ROLES.join(', ')}`));
  }
  if (!link.status || !isValidEnum(link.status, LINK_STATUSES)) {
    errors.push(createError('status', `status must be one of: ${LINK_STATUSES.join(', ')}`));
  }
  if (!isNonEmptyString(link.createdBy)) errors.push(createError('createdBy', 'createdBy is required'));

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

export function validateStudentCreationRecord(record: Partial<XamStudentCreationRecord>): IdentityValidationResult {
  const errors: IdentityValidationError[] = [];

  if (!isNonEmptyString(record.recordId)) errors.push(createError('recordId', 'recordId is required'));
  if (!isNonEmptyString(record.studentUid)) errors.push(createError('studentUid', 'studentUid is required'));
  if (!isNonEmptyString(record.createdByUid)) errors.push(createError('createdByUid', 'createdByUid is required'));
  if (!record.createdByRole || !isValidEnum(record.createdByRole, USER_ROLES)) {
    errors.push(createError('createdByRole', `createdByRole must be one of: ${USER_ROLES.join(', ')}`));
  }
  if (!record.creationMethod || !isValidEnum(record.creationMethod, STUDENT_CREATION_METHODS)) {
    errors.push(createError('creationMethod', `creationMethod must be one of: ${STUDENT_CREATION_METHODS.join(', ')}`));
  }
  if (!record.setupState || !isValidEnum(record.setupState, CREATION_RECORD_STATES)) {
    errors.push(createError('setupState', `setupState must be one of: ${CREATION_RECORD_STATES.join(', ')}`));
  }
  if (record.initialLinkTargets?.teacherUids !== undefined) {
    validateStringArray(errors, 'initialLinkTargets.teacherUids', record.initialLinkTargets.teacherUids);
  }

  return errors.length > 0 ? invalidResult(errors) : validResult();
}

export function validateAdminPreviewSession(session: Partial<XamAdminPreviewSession>): IdentityValidationResult {
  const errors: IdentityValidationError[] = [];

  if (!isNonEmptyString(session.sessionId)) errors.push(createError('sessionId', 'sessionId is required'));
  if (!isNonEmptyString(session.adminUid)) errors.push(createError('adminUid', 'adminUid is required'));
  if (!isNonEmptyString(session.targetUid)) errors.push(createError('targetUid', 'targetUid is required'));
  if (!session.targetRole || !isValidEnum(session.targetRole, USER_ROLES)) {
    errors.push(createError('targetRole', `targetRole must be one of: ${USER_ROLES.join(', ')}`));
  }
  if (!isDateLike(session.createdAt)) errors.push(createError('createdAt', 'createdAt must be a valid Date'));
  if (!isDateLike(session.expiresAt)) errors.push(createError('expiresAt', 'expiresAt must be a valid Date'));

  return errors.length > 0 ? invalidResult(errors) : validResult();
}
