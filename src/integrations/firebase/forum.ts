import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/integrations/firebase/client';

const call = <TReq, TRes>(name: string) =>
  httpsCallable<TReq, TRes>(getFirebaseFunctions(), name);

export interface FirebaseForumCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

export interface FirebaseForumPost {
  id: string;
  title: string;
  content: string;
  author_id: string;
  category_id: string;
  is_pinned: boolean;
  is_locked: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  category_name?: string;
  author?: { name: string };
  replies_count?: number;
}

export interface FirebaseForumReply {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { name: string };
}

export async function listForumCategoriesFirebase() {
  const fn = call<Record<string, never>, { ok: boolean; items: FirebaseForumCategory[] }>('listForumCategories');
  return (await fn({})).data;
}

export async function listForumPostsFirebase(categoryId?: string) {
  const fn = call<{ categoryId?: string }, { ok: boolean; items: FirebaseForumPost[] }>('listForumPosts');
  return (await fn(categoryId ? { categoryId } : {})).data;
}

export async function listForumRepliesFirebase(postId: string) {
  const fn = call<{ postId: string }, { ok: boolean; items: FirebaseForumReply[] }>('listForumReplies');
  return (await fn({ postId })).data;
}

export async function createForumPostFirebase(payload: {
  title: string;
  content: string;
  categoryId: string;
  tags: string[];
}) {
  const fn = call<typeof payload, { ok: boolean; id: string }>('createForumPost');
  return (await fn(payload)).data;
}

export async function createForumReplyFirebase(payload: {
  postId: string;
  content: string;
}) {
  const fn = call<typeof payload, { ok: boolean; id: string }>('createForumReply');
  return (await fn(payload)).data;
}

export async function upsertForumCategoryFirebase(payload: {
  id?: string;
  name: string;
  description?: string;
  icon?: string;
}) {
  const fn = call<typeof payload, { ok: boolean; id: string }>('upsertForumCategory');
  return (await fn(payload)).data;
}

export async function deleteForumCategoryFirebase(categoryId: string) {
  const fn = call<{ categoryId: string }, { ok: boolean }>('deleteForumCategory');
  return (await fn({ categoryId })).data;
}

export async function setForumPostPinnedFirebase(postId: string, isPinned: boolean) {
  const fn = call<{ postId: string; isPinned: boolean }, { ok: boolean }>('setForumPostPinned');
  return (await fn({ postId, isPinned })).data;
}

export async function setForumPostLockedFirebase(postId: string, isLocked: boolean) {
  const fn = call<{ postId: string; isLocked: boolean }, { ok: boolean }>('setForumPostLocked');
  return (await fn({ postId, isLocked })).data;
}

export async function deleteForumPostFirebase(postId: string) {
  const fn = call<{ postId: string }, { ok: boolean }>('deleteForumPost');
  return (await fn({ postId })).data;
}
