import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { addDoc, collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { getFirebaseDb } from '@/integrations/firebase/client';

export type AccessType = 'standard' | 'purchased' | 'free-trial' | 'none';

interface ExamAccessResult {
  hasAccess: boolean;
  accessType: AccessType;
  canPurchase: boolean;
  monthlyPurchasesRemaining: number;
  freeTrialAvailable: boolean;
  isLoading: boolean;
  checkAccess: () => Promise<void>;
  recordPurchase: (examId: string) => Promise<boolean>;
  useFreeTrialForExam: (examId: string) => Promise<boolean>;
}

export const useExamAccess = (examId?: string): ExamAccessResult => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [accessType, setAccessType] = useState<AccessType>('none');
  const [canPurchase, setCanPurchase] = useState(true);
  const [monthlyPurchasesRemaining, setMonthlyPurchasesRemaining] = useState(2);
  const [freeTrialAvailable, setFreeTrialAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const checkAccess = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const db = getFirebaseDb();
    const currentMonth = format(new Date(), 'yyyy-MM');

    try {
      const subscriptionByUserId = await getDocs(query(collection(db, 'subscriptions'), where('userId', '==', user.id)));
      const subscriptionByUserSnake = subscriptionByUserId.empty
        ? await getDocs(query(collection(db, 'subscriptions'), where('user_id', '==', user.id)))
        : subscriptionByUserId;
      const subscription = subscriptionByUserSnake.empty ? null : subscriptionByUserSnake.docs[0].data();

      const plan = typeof subscription?.plan === 'string' ? subscription.plan : '';
      const expiresAtRaw = subscription?.expiresAt || subscription?.expires_at || null;
      const expiresAt =
        typeof expiresAtRaw === 'string'
          ? expiresAtRaw
          : expiresAtRaw && typeof expiresAtRaw.toDate === 'function'
            ? expiresAtRaw.toDate().toISOString()
            : null;

      const hasStandardOrPremium =
        (plan === 'Standard' || plan === 'Premium') &&
        (!expiresAt || new Date(expiresAt) > new Date());

      if (hasStandardOrPremium) {
        setHasAccess(true);
        setAccessType('standard');
        setCanPurchase(true);
        setMonthlyPurchasesRemaining(2);
        setIsLoading(false);
        return;
      }

      const purchasesByUserId = await getDocs(query(collection(db, 'paper_purchases'), where('userId', '==', user.id)));
      const purchasesByUserSnake = await getDocs(query(collection(db, 'paper_purchases'), where('user_id', '==', user.id)));
      const purchasesMerged = [...purchasesByUserId.docs, ...purchasesByUserSnake.docs];
      const purchases = purchasesMerged
        .map((snap) => ({ id: snap.id, ...snap.data() }))
        .filter((purchase) => {
          const monthYear =
            typeof purchase.monthYear === 'string'
              ? purchase.monthYear
              : typeof purchase.month_year === 'string'
                ? purchase.month_year
                : '';
          return monthYear === currentMonth;
        });

      const count = purchases.length;
      setMonthlyPurchasesRemaining(Math.max(0, 2 - count));
      setCanPurchase(count < 2);

      if (examId && purchases.length > 0) {
        const wasPurchased = purchases.some((p) => p.examId === examId || p.exam_id === examId);
        if (wasPurchased) {
          setHasAccess(true);
          setAccessType('purchased');
          setIsLoading(false);
          return;
        }
      }

      const progressRef = doc(db, 'user_progress', user.id);
      const progressDoc = await getDoc(progressRef);
      const progressData = progressDoc.exists() ? progressDoc.data() : null;
      const freeTrialUsed =
        typeof progressData?.freeTrialUsed === 'boolean'
          ? progressData.freeTrialUsed
          : typeof progressData?.free_trial_used === 'boolean'
            ? progressData.free_trial_used
            : false;
      const freeTrialExamId =
        typeof progressData?.freeTrialExamId === 'string'
          ? progressData.freeTrialExamId
          : typeof progressData?.free_trial_exam_id === 'string'
            ? progressData.free_trial_exam_id
            : null;
      setFreeTrialAvailable(!freeTrialUsed);

      if (examId && freeTrialExamId === examId) {
        setHasAccess(true);
        setAccessType('free-trial');
        setIsLoading(false);
        return;
      }

      if (examId) {
        const examDoc = await getDoc(doc(db, 'exams', examId));
        if (examDoc.exists()) {
          const exam = examDoc.data();
          const isFree = typeof exam.isFree === 'boolean' ? exam.isFree : !!exam.is_free;
          if (isFree) {
            setHasAccess(true);
            setAccessType('free-trial');
            setIsLoading(false);
            return;
          }
        }
      }

      setHasAccess(false);
      setAccessType('none');
    } catch (error) {
      console.error('Error checking exam access:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, examId]);

  const recordPurchase = async (purchaseExamId: string): Promise<boolean> => {
    if (!user || monthlyPurchasesRemaining <= 0) return false;

    const db = getFirebaseDb();
    const currentMonth = format(new Date(), 'yyyy-MM');

    try {
      await addDoc(collection(db, 'paper_purchases'), {
        userId: user.id,
        user_id: user.id,
        examId: purchaseExamId,
        exam_id: purchaseExamId,
        amount: 2000,
        monthYear: currentMonth,
        month_year: currentMonth,
        createdAt: new Date().toISOString(),
      });
      await checkAccess();
      return true;
    } catch (error) {
      console.error('Error recording purchase:', error);
      return false;
    }
  };

  const useFreeTrialForExam = async (trialExamId: string): Promise<boolean> => {
    if (!user || !freeTrialAvailable) return false;

    const db = getFirebaseDb();
    try {
      await setDoc(doc(db, 'user_progress', user.id), {
        freeTrialUsed: true,
        free_trial_used: true,
        freeTrialExamId: trialExamId,
        free_trial_exam_id: trialExamId,
      }, { merge: true });
      await checkAccess();
      return true;
    } catch (error) {
      console.error('Error using free trial:', error);
      return false;
    }
  };

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return {
    hasAccess,
    accessType,
    canPurchase,
    monthlyPurchasesRemaining,
    freeTrialAvailable,
    isLoading,
    checkAccess,
    recordPurchase,
    useFreeTrialForExam,
  };
};

export default useExamAccess;
