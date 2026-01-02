import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

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
    const currentMonth = format(new Date(), 'yyyy-MM');

    try {
      // Check subscription status
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      // Check for Standard or Premium (Standard is new, Premium is legacy)
      const planStr = subscription?.plan as string;
      const hasStandardOrPremium = subscription && 
        (planStr === 'Standard' || planStr === 'Premium') &&
        (!subscription.expires_at || new Date(subscription.expires_at) > new Date());

      if (hasStandardOrPremium) {
        setHasAccess(true);
        setAccessType('standard');
        setCanPurchase(true);
        setMonthlyPurchasesRemaining(2);
        setIsLoading(false);
        return;
      }

      // Check paper purchases for this month using raw query
      const { data: purchases, error: purchasesError } = await supabase
        .from('paper_purchases' as any)
        .select('id, exam_id')
        .eq('user_id', user.id)
        .eq('month_year', currentMonth);

      // Handle as unknown first then cast
      const purchaseList = (purchases as unknown as Array<{ id: string; exam_id: string }>) || [];
      const count = purchaseList.length;
      setMonthlyPurchasesRemaining(Math.max(0, 2 - count));
      setCanPurchase(count < 2);

      // Check if this specific exam was purchased
      if (examId && purchaseList.length > 0) {
        const wasPurchased = purchaseList.some(p => p.exam_id === examId);
        if (wasPurchased) {
          setHasAccess(true);
          setAccessType('purchased');
          setIsLoading(false);
          return;
        }
      }

      // Check free trial status from user_progress
      const { data: userProgress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Type assertion for new columns
      const progressData = userProgress as Record<string, unknown> | null;
      const freeTrialUsed = (progressData?.free_trial_used as boolean) || false;
      const freeTrialExamId = progressData?.free_trial_exam_id as string | null;
      setFreeTrialAvailable(!freeTrialUsed);

      // Check if this specific exam used free trial
      if (examId && freeTrialExamId === examId) {
        setHasAccess(true);
        setAccessType('free-trial');
        setIsLoading(false);
        return;
      }

      // Check if exam is free
      if (examId) {
        const { data: exam } = await supabase
          .from('exams')
          .select('is_free')
          .eq('id', examId)
          .maybeSingle();

        if (exam?.is_free) {
          setHasAccess(true);
          setAccessType('free-trial');
          setIsLoading(false);
          return;
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

    const currentMonth = format(new Date(), 'yyyy-MM');

    try {
      const { error } = await supabase
        .from('paper_purchases' as any)
        .insert({
          user_id: user.id,
          exam_id: purchaseExamId,
          amount: 2000,
          month_year: currentMonth,
        });

      if (error) throw error;
      await checkAccess();
      return true;
    } catch (error) {
      console.error('Error recording purchase:', error);
      return false;
    }
  };

  const useFreeTrialForExam = async (trialExamId: string): Promise<boolean> => {
    if (!user || !freeTrialAvailable) return false;

    try {
      // Using raw update for new columns
      const { error } = await supabase
        .from('user_progress')
        .update({
          free_trial_used: true,
          free_trial_exam_id: trialExamId,
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;
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