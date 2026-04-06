import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/integrations/firebase/client';

export interface FirebaseLinkCode {
  id: string;
  code: string;
  expiresAt: string;
  usedBy: string | null;
  usedAt?: string | null;
  createdAt?: string | null;
}

export interface FirebaseLinkRequest {
  id: string;
  requesterId: string;
  targetId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  requesterName: string;
  requesterEmail: string;
  requesterType: 'parent' | 'school';
  isIncoming: boolean;
  targetName?: string;
  targetEmail?: string;
}

export interface FirebaseLinkedAccount {
  id: string;
  name: string;
  email: string;
  type: 'parent' | 'school' | 'student';
  linkedAt: string;
  parentOrSchoolId: string;
  studentId: string;
}

export interface FirebaseLinkedStudentOverview {
  id: string;
  name: string;
  email: string;
  level: string | null;
  xp: number;
  streak: number;
  avgScore: number;
  examsTaken: number;
  studyMinutesThisWeek: number;
  recentActivity: Array<{
    date: string;
    score: number;
    examTitle: string;
  }>;
}

export interface SearchLinkTargetResult {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'parent' | 'school';
}

const call = <TReq, TRes>(name: string) =>
  httpsCallable<TReq, TRes>(getFirebaseFunctions(), name);

export async function listActiveLinkCodesFirebase() {
  const fn = call<Record<string, never>, { ok: boolean; items: FirebaseLinkCode[] }>('listActiveLinkCodes');
  return (await fn({})).data;
}

export async function generateLinkCodeFirebase(creatorType: 'parent' | 'school') {
  const fn = call<{ creatorType: 'parent' | 'school' }, { ok: boolean; id: string; code: string; expiresAt: string }>('generateLinkCode');
  return (await fn({ creatorType })).data;
}

export async function redeemLinkCodeFirebase(code: string) {
  const fn = call<{ code: string }, { ok: boolean; status: 'linked' | 'already_linked' | 'already_redeemed'; linkId: string }>(
    'redeemLinkCode'
  );
  return (await fn({ code })).data;
}

export async function searchLinkTargetFirebase(email: string, targetRole: 'student' | 'parent' | 'school') {
  const fn = call<{ email: string; targetRole: 'student' | 'parent' | 'school' }, {
    ok: boolean;
    reason?: string;
    target?: SearchLinkTargetResult;
  }>('searchLinkTarget');
  return (await fn({ email, targetRole })).data;
}

export async function sendLinkRequestFirebase(targetId: string) {
  const fn = call<{ targetId: string }, { ok: boolean; requestId: string }>('sendLinkRequest');
  return (await fn({ targetId })).data;
}

export async function listLinkRequestsFirebase() {
  const fn = call<Record<string, never>, { ok: boolean; items: FirebaseLinkRequest[] }>('listLinkRequests');
  return (await fn({})).data;
}

export async function respondToLinkRequestFirebase(requestId: string, action: 'accept' | 'reject') {
  const fn = call<{ requestId: string; action: 'accept' | 'reject' }, { ok: boolean; status: 'accepted' | 'rejected' }>('respondToLinkRequest');
  return (await fn({ requestId, action })).data;
}

export async function listLinkedAccountsFirebase() {
  const fn = call<Record<string, never>, { ok: boolean; items: FirebaseLinkedAccount[] }>('listLinkedAccounts');
  return (await fn({})).data;
}

export async function unlinkAccountFirebase(linkId: string) {
  const fn = call<{ linkId: string }, { ok: boolean }>('unlinkAccount');
  return (await fn({ linkId })).data;
}

export async function listLinkedStudentsOverviewFirebase() {
  const fn = call<Record<string, never>, { ok: boolean; items: FirebaseLinkedStudentOverview[] }>(
    'listLinkedStudentsOverview'
  );
  return (await fn({})).data;
}
