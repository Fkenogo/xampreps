import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PromptVariant } from '@/components/prompts/UpgradePrompt';

interface UpgradePromptsResult {
  shouldShowBanner: boolean;
  activePrompt: PromptVariant | null;
  totalAttempts: number;
}

export const useUpgradePrompts = (): UpgradePromptsResult => {
  const { progress } = useAuth();

  const result = useMemo(() => {
    // Check if user has 3+ exam attempts (for banner)
    const totalAttempts = 0; // This would be fetched from exam_attempts count
    const shouldShowBanner = totalAttempts >= 3;

    return {
      shouldShowBanner,
      activePrompt: null,
      totalAttempts,
    };
  }, [progress]);

  return result;
};

export default useUpgradePrompts;