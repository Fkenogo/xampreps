/**
 * V2 Exam Data Loading Hook
 *
 * Loads complete V2 exam structure for rendering.
 */

import { useEffect, useState } from 'react';
import { loadV2ExamDataFirebase } from '@/integrations/firebase/content';
import type {
  V2ContextBlock,
  V2Exam,
  V2InstructionGroup,
  V2Interaction,
  V2Item,
  V2MarkingRule,
  V2ModelAnswerVersion,
  V2Rubric,
  V2Section,
} from '@/types/v2';

export interface V2ExamData {
  exam: V2Exam | null;
  sections: V2Section[];
  instructionGroups: Map<string, V2InstructionGroup[]>;
  contextBlocks: Map<string, V2ContextBlock[]>;
  items: Map<string, V2Item[]>;
  interactions: Map<string, V2Interaction[]>;
  markingRules: Map<string, V2MarkingRule>;
  rubrics: Map<string, V2Rubric>;
  modelAnswers: Map<string, V2ModelAnswerVersion[]>;
  loading: boolean;
  error: string | null;
}

const EMPTY_DATA: Omit<V2ExamData, 'loading' | 'error'> = {
  exam: null,
  sections: [],
  instructionGroups: new Map(),
  contextBlocks: new Map(),
  items: new Map(),
  interactions: new Map(),
  markingRules: new Map(),
  rubrics: new Map(),
  modelAnswers: new Map(),
};

export function useV2ExamData(examId: string | null): V2ExamData {
  const [state, setState] = useState<V2ExamData>({
    ...EMPTY_DATA,
    loading: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!examId) {
        setState({ ...EMPTY_DATA, loading: false, error: null });
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        console.time(`useV2ExamData:${examId}`);
        const data = await loadV2ExamDataFirebase(examId);
        if (!cancelled) {
          if (!data.exam) {
            setState({ ...EMPTY_DATA, loading: false, error: 'Exam not found' });
            return;
          }
          setState({ ...data, loading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            ...EMPTY_DATA,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load V2 exam data',
          });
        }
      } finally {
        console.timeEnd(`useV2ExamData:${examId}`);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [examId]);

  return state;
}
