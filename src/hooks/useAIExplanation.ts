import { useState } from 'react';
import { getAIExplanationFirebase } from '@/integrations/firebase/ai';
import { toast } from 'sonner';

interface UseAIExplanationOptions {
  studentLevel?: string;
  subject?: string;
}

export function useAIExplanation(options: UseAIExplanationOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  const getExplanation = async (questionText: string, correctAnswer: string, marks?: number) => {
    setLoading(true);
    setExplanation(null);

    try {
      const data = await getAIExplanationFirebase({
        type: 'explanation',
        questionText,
        correctAnswer,
        studentLevel: options.studentLevel,
        subject: options.subject,
        marks,
      });
      
      if (data?.explanation) {
        setExplanation(data.explanation);
        return data.explanation;
      }
    } catch (error) {
      console.error('Error getting AI explanation:', error);
      toast.error('Failed to get explanation. Please try again.');
    } finally {
      setLoading(false);
    }
    
    return null;
  };

  const getFeedback = async (questionText: string, userAnswer: string, correctAnswer: string, marks?: number) => {
    setLoading(true);
    setExplanation(null);

    try {
      const data = await getAIExplanationFirebase({
        type: 'feedback',
        questionText,
        correctAnswer,
        userAnswer,
        studentLevel: options.studentLevel,
        subject: options.subject,
        marks,
      });
      
      if (data?.explanation) {
        setExplanation(data.explanation);
        return data.explanation;
      }
    } catch (error) {
      console.error('Error getting AI feedback:', error);
      toast.error('Failed to get feedback. Please try again.');
    } finally {
      setLoading(false);
    }
    
    return null;
  };

  const clearExplanation = () => {
    setExplanation(null);
  };

  return {
    loading,
    explanation,
    getExplanation,
    getFeedback,
    clearExplanation,
  };
}
