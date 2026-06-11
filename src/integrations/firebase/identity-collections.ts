/**
 * XamPreps Identity V2 Firestore Collection Access Layer
 *
 * Additive collection helpers for the new identity architecture.
 * This layer does not replace current auth/linking flows yet.
 */

import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { getFirebaseDb } from './client';
import type {
  XamAdminPreviewSession,
  XamAdultProfile,
  XamAuthLoginAlias,
  XamParentStudentLink,
  XamSchool,
  XamSchoolAdminLink,
  XamSchoolStudentLink,
  XamStudentAccess,
  XamStudentCreationRecord,
  XamStudentProfile,
  XamTeacherSchoolLink,
  XamTeacherStudentLink,
  XamUser,
} from '@/types/identity-v2';

const getDb = () => getFirebaseDb();

export const IDENTITY_COLLECTIONS = {
  users: 'users',
  schools: 'schools',
  studentProfiles: 'student_profiles',
  adultProfiles: 'adult_profiles',
  studentAccess: 'student_access',
  authLoginAliases: 'auth_login_aliases',
  studentLinkCodes: 'student_link_codes',
  parentStudentLinks: 'parent_student_links',
  schoolStudentLinks: 'school_student_links',
  teacherStudentLinks: 'teacher_student_links',
  teacherSchoolLinks: 'teacher_school_links',
  schoolAdminLinks: 'school_admin_links',
  studentCreationRecords: 'student_creation_records',
  adminPreviewSessions: 'admin_preview_sessions',
} as const;

function toTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

function fromTimestamp(timestamp: Timestamp): Date {
  return timestamp.toDate();
}

function serializeIdentityDates<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  const dateFields = [
    'createdAt',
    'updatedAt',
    'dateOfBirth',
    'lockedUntil',
    'lastAccessCodeRotationAt',
    'lastLoginAt',
    'startDate',
    'endDate',
    'expiresAt',
  ];

  for (const field of dateFields) {
    if (result[field] instanceof Date) {
      result[field] = toTimestamp(result[field] as Date) as T[keyof T];
    }
  }

  return result;
}

function deserializeIdentityDates<T>(data: DocumentData): T {
  const result = { ...data };
  const dateFields = [
    'createdAt',
    'updatedAt',
    'dateOfBirth',
    'lockedUntil',
    'lastAccessCodeRotationAt',
    'lastLoginAt',
    'startDate',
    'endDate',
    'expiresAt',
  ];

  for (const field of dateFields) {
    if (result[field] instanceof Timestamp) {
      result[field] = fromTimestamp(result[field]);
    }
  }

  return result as T;
}

export async function getIdentityUser(uid: string): Promise<XamUser | null> {
  const snap = await getDoc(doc(getDb(), IDENTITY_COLLECTIONS.users, uid));
  if (!snap.exists()) return null;
  return deserializeIdentityDates<XamUser>({ uid: snap.id, ...snap.data() });
}

export async function upsertIdentityUser(user: XamUser): Promise<void> {
  await setDoc(doc(getDb(), IDENTITY_COLLECTIONS.users, user.uid), serializeIdentityDates(user), { merge: true });
}

export async function getSchool(schoolId: string): Promise<XamSchool | null> {
  const snap = await getDoc(doc(getDb(), IDENTITY_COLLECTIONS.schools, schoolId));
  if (!snap.exists()) return null;
  return deserializeIdentityDates<XamSchool>({ schoolId: snap.id, ...snap.data() });
}

export async function upsertSchool(school: XamSchool): Promise<void> {
  await setDoc(doc(getDb(), IDENTITY_COLLECTIONS.schools, school.schoolId), serializeIdentityDates(school), { merge: true });
}

export async function getStudentProfile(uid: string): Promise<XamStudentProfile | null> {
  const snap = await getDoc(doc(getDb(), IDENTITY_COLLECTIONS.studentProfiles, uid));
  if (!snap.exists()) return null;
  return deserializeIdentityDates<XamStudentProfile>({ uid: snap.id, ...snap.data() });
}

export async function upsertStudentProfile(profile: XamStudentProfile): Promise<void> {
  await setDoc(doc(getDb(), IDENTITY_COLLECTIONS.studentProfiles, profile.uid), serializeIdentityDates(profile), { merge: true });
}

export async function getAdultProfile(uid: string): Promise<XamAdultProfile | null> {
  const snap = await getDoc(doc(getDb(), IDENTITY_COLLECTIONS.adultProfiles, uid));
  if (!snap.exists()) return null;
  return deserializeIdentityDates<XamAdultProfile>({ uid: snap.id, ...snap.data() });
}

export async function upsertAdultProfile(profile: XamAdultProfile): Promise<void> {
  await setDoc(doc(getDb(), IDENTITY_COLLECTIONS.adultProfiles, profile.uid), serializeIdentityDates(profile), { merge: true });
}

export async function getStudentAccess(studentUid: string): Promise<XamStudentAccess | null> {
  const snap = await getDoc(doc(getDb(), IDENTITY_COLLECTIONS.studentAccess, studentUid));
  if (!snap.exists()) return null;
  return deserializeIdentityDates<XamStudentAccess>({ studentUid: snap.id, ...snap.data() });
}

export async function upsertStudentAccess(access: XamStudentAccess): Promise<void> {
  await setDoc(doc(getDb(), IDENTITY_COLLECTIONS.studentAccess, access.studentUid), serializeIdentityDates(access), { merge: true });
}

export async function getAuthLoginAlias(aliasKey: string): Promise<XamAuthLoginAlias | null> {
  const snap = await getDoc(doc(getDb(), IDENTITY_COLLECTIONS.authLoginAliases, aliasKey));
  if (!snap.exists()) return null;
  return deserializeIdentityDates<XamAuthLoginAlias>({ aliasKey: snap.id, ...snap.data() });
}

export async function upsertAuthLoginAlias(alias: XamAuthLoginAlias): Promise<void> {
  await setDoc(doc(getDb(), IDENTITY_COLLECTIONS.authLoginAliases, alias.aliasKey), serializeIdentityDates(alias), { merge: true });
}

export async function upsertParentStudentLink(link: XamParentStudentLink): Promise<void> {
  await setDoc(doc(getDb(), IDENTITY_COLLECTIONS.parentStudentLinks, link.linkId), serializeIdentityDates(link), { merge: true });
}

export async function listParentStudentLinks(parentUid: string): Promise<XamParentStudentLink[]> {
  const q = query(
    collection(getDb(), IDENTITY_COLLECTIONS.parentStudentLinks),
    where('parentUid', '==', parentUid),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => deserializeIdentityDates<XamParentStudentLink>({ linkId: docSnap.id, ...docSnap.data() }));
}

export async function upsertSchoolStudentLink(link: XamSchoolStudentLink): Promise<void> {
  await setDoc(doc(getDb(), IDENTITY_COLLECTIONS.schoolStudentLinks, link.linkId), serializeIdentityDates(link), { merge: true });
}

export async function listSchoolStudentLinks(schoolId: string): Promise<XamSchoolStudentLink[]> {
  const q = query(
    collection(getDb(), IDENTITY_COLLECTIONS.schoolStudentLinks),
    where('schoolId', '==', schoolId),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => deserializeIdentityDates<XamSchoolStudentLink>({ linkId: docSnap.id, ...docSnap.data() }));
}

export async function upsertTeacherStudentLink(link: XamTeacherStudentLink): Promise<void> {
  await setDoc(doc(getDb(), IDENTITY_COLLECTIONS.teacherStudentLinks, link.linkId), serializeIdentityDates(link), { merge: true });
}

export async function listTeacherStudentLinks(teacherUid: string): Promise<XamTeacherStudentLink[]> {
  const q = query(
    collection(getDb(), IDENTITY_COLLECTIONS.teacherStudentLinks),
    where('teacherUid', '==', teacherUid),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => deserializeIdentityDates<XamTeacherStudentLink>({ linkId: docSnap.id, ...docSnap.data() }));
}

export async function upsertTeacherSchoolLink(link: XamTeacherSchoolLink): Promise<void> {
  await setDoc(doc(getDb(), IDENTITY_COLLECTIONS.teacherSchoolLinks, link.linkId), serializeIdentityDates(link), { merge: true });
}

export async function listTeacherSchoolLinksByTeacher(teacherUid: string): Promise<XamTeacherSchoolLink[]> {
  const q = query(
    collection(getDb(), IDENTITY_COLLECTIONS.teacherSchoolLinks),
    where('teacherUid', '==', teacherUid),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => deserializeIdentityDates<XamTeacherSchoolLink>({ linkId: docSnap.id, ...docSnap.data() }));
}

export async function upsertSchoolAdminLink(link: XamSchoolAdminLink): Promise<void> {
  await setDoc(doc(getDb(), IDENTITY_COLLECTIONS.schoolAdminLinks, link.linkId), serializeIdentityDates(link), { merge: true });
}

export async function listSchoolAdminLinks(schoolId: string): Promise<XamSchoolAdminLink[]> {
  const q = query(
    collection(getDb(), IDENTITY_COLLECTIONS.schoolAdminLinks),
    where('schoolId', '==', schoolId),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => deserializeIdentityDates<XamSchoolAdminLink>({ linkId: docSnap.id, ...docSnap.data() }));
}

export async function upsertStudentCreationRecord(record: XamStudentCreationRecord): Promise<void> {
  await setDoc(doc(getDb(), IDENTITY_COLLECTIONS.studentCreationRecords, record.recordId), serializeIdentityDates(record), { merge: true });
}

export async function listStudentCreationRecordsByCreator(createdByUid: string): Promise<XamStudentCreationRecord[]> {
  const q = query(
    collection(getDb(), IDENTITY_COLLECTIONS.studentCreationRecords),
    where('createdByUid', '==', createdByUid),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => deserializeIdentityDates<XamStudentCreationRecord>({ recordId: docSnap.id, ...docSnap.data() }));
}

export async function upsertAdminPreviewSession(session: XamAdminPreviewSession): Promise<void> {
  await setDoc(doc(getDb(), IDENTITY_COLLECTIONS.adminPreviewSessions, session.sessionId), serializeIdentityDates(session), { merge: true });
}

export async function getAdminPreviewSession(sessionId: string): Promise<XamAdminPreviewSession | null> {
  const snap = await getDoc(doc(getDb(), IDENTITY_COLLECTIONS.adminPreviewSessions, sessionId));
  if (!snap.exists()) return null;
  return deserializeIdentityDates<XamAdminPreviewSession>({ sessionId: snap.id, ...snap.data() });
}

export async function deleteAdminPreviewSession(sessionId: string): Promise<void> {
  await deleteDoc(doc(getDb(), IDENTITY_COLLECTIONS.adminPreviewSessions, sessionId));
}
