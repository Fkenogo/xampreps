import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/integrations/firebase/client';

const call = <TReq, TRes>(name: string) =>
  httpsCallable<TReq, TRes>(getFirebaseFunctions(), name);

export interface FirebaseNotification {
  id: string;
  user_id: string;
  text: string;
  read: boolean;
  created_at: string;
}

export async function listNotificationsFirebase(limit = 20) {
  const fn = call<{ limit: number }, { ok: boolean; items: FirebaseNotification[] }>('listNotifications');
  return (await fn({ limit })).data;
}

export async function markNotificationReadFirebase(id: string) {
  const fn = call<{ id: string }, { ok: boolean }>('markNotificationRead');
  return (await fn({ id })).data;
}

export async function markAllNotificationsReadFirebase() {
  const fn = call<Record<string, never>, { ok: boolean; count: number }>('markAllNotificationsRead');
  return (await fn({})).data;
}

export async function deleteNotificationFirebase(id: string) {
  const fn = call<{ id: string }, { ok: boolean }>('deleteNotification');
  return (await fn({ id })).data;
}
