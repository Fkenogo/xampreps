import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useV2ExamData } from '@/hooks/useV2ExamData';
import { V2ExamRenderer } from '@/components/exam/v2/V2ExamRenderer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  autoCheckV2SubmissionFirebase,
  describeV2CallableError,
  initializeV2ExamAttemptFirebase,
  persistV2SubmissionFirebase,
  submitV2ExamAttemptFirebase,
  type PersistedSubmissionState,
} from '@/integrations/firebase/exams';
import type { V2ExamMode, V2Interaction, V2ResponsePayload } from '@/types/v2';

const VALID_MODES: V2ExamMode[] = ['practice', 'quiz', 'simulation'];

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function ExamTakingPage() {
  const { examId } = useParams<{ examId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const requestedMode = searchParams.get('mode') as V2ExamMode | null;
  const mode = VALID_MODES.includes(requestedMode as V2ExamMode) ? (requestedMode as V2ExamMode) : 'practice';

  const {
    exam,
    sections,
    instructionGroups,
    contextBlocks,
    items,
    interactions,
    loading,
    error,
  } = useV2ExamData(examId || null);

  const [responses, setResponses] = useState<Record<string, V2ResponsePayload>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [submissionStates, setSubmissionStates] = useState<Record<string, PersistedSubmissionState>>({});
  const [checkingInteractionIds, setCheckingInteractionIds] = useState<Set<string>>(new Set());
  const [interactionErrors, setInteractionErrors] = useState<Record<string, string | null>>({});
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [initializingAttempt, setInitializingAttempt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const latestResponsesRef = useRef<Record<string, V2ResponsePayload>>({});
  const quizDebounceTimersRef = useRef<Record<string, number>>({});
  const lastQueuedQuizSignatureRef = useRef<Record<string, string>>({});
  const lastCompletedQuizSignatureRef = useRef<Record<string, string>>({});
  const activeQuizCheckSignatureRef = useRef<Record<string, string>>({});

  const flattenedInstructionGroups = useMemo(
    () => Array.from(instructionGroups.values()).flat(),
    [instructionGroups],
  );
  const flattenedContextBlocks = useMemo(
    () => Array.from(contextBlocks.values()).flat(),
    [contextBlocks],
  );
  const flattenedItems = useMemo(() => Array.from(items.values()).flat(), [items]);
  const flattenedInteractions = useMemo(
    () => Array.from(interactions.values()).flat(),
    [interactions],
  );

  const hasResponseContent = useCallback((response: V2ResponsePayload | undefined) => {
    if (!response) return false;
    if (typeof response.textAnswer === 'string') {
      return response.textAnswer.trim().length > 0;
    }
    if (response.textAnswer && typeof response.textAnswer === 'object') {
      return Object.values(response.textAnswer as Record<string, string>).some((value) => String(value || '').trim().length > 0);
    }
    if (response.selectedOptions?.length) return true;
    if (response.tableAnswers) {
      return Object.values(response.tableAnswers).some((value) => String(value || '').trim().length > 0);
    }
    if (response.uploadedFileUrl) return true;
    return false;
  }, []);

  const answeredCount = useMemo(
    () =>
      flattenedInteractions.filter((interaction) => hasResponseContent(responses[interaction.interactionId])).length,
    [flattenedInteractions, hasResponseContent, responses],
  );

  const submissionsMap = useMemo(
    () => new Map<string, PersistedSubmissionState>(Object.entries(submissionStates)),
    [submissionStates],
  );

  useEffect(() => {
    latestResponsesRef.current = responses;
  }, [responses]);

  useEffect(() => {
    if (!exam) return;
    if (mode !== 'simulation') {
      setTimeLeft(null);
      return;
    }
    setTimeLeft(exam.durationMinutes * 60);
  }, [exam, mode]);

  useEffect(() => {
    if (mode !== 'simulation' || timeLeft === null || submitting) {
      return;
    }
    if (timeLeft <= 0) {
      void handleSubmit(true);
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((current) => (current === null ? current : current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [mode, timeLeft, submitting]);

  useEffect(() => {
    setAttemptId(null);
    setSubmissionStates({});
    setCheckingInteractionIds(new Set());
    setInteractionErrors({});
    setRuntimeError(null);
    setResponses({});
    Object.values(quizDebounceTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
    quizDebounceTimersRef.current = {};
    lastQueuedQuizSignatureRef.current = {};
    lastCompletedQuizSignatureRef.current = {};
    activeQuizCheckSignatureRef.current = {};
  }, [exam?.examId, mode, user?.id]);

  useEffect(() => () => {
    Object.values(quizDebounceTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
  }, []);

  const normalizeError = useCallback((cause: unknown, fallback: string) => {
    const described = describeV2CallableError(cause);
    return described || fallback;
  }, []);

  const getInteractionMeta = useCallback((interactionId: string) => {
    const interaction = flattenedInteractions.find((candidate) => candidate.interactionId === interactionId);
    if (!interaction) {
      throw new Error(`Missing interactionId ${interactionId} in the loaded V2 exam.`);
    }
    return interaction;
  }, [flattenedInteractions]);

  const getResponseSignature = useCallback((response: V2ResponsePayload | undefined) => {
    return JSON.stringify(response || {});
  }, []);

  const getQuizAutoCheckDelay = useCallback((interaction: V2Interaction) => {
    switch (interaction.responseMode) {
      case 'textShort':
      case 'textLong':
      case 'textarea':
      case 'structuredComposition':
      case 'tableInputs':
        return 500;
      default:
        return 0;
    }
  }, []);

  const ensureAttempt = useCallback(async () => {
    if (!user?.id) {
      throw new Error('You must be signed in to create a V2 exam attempt.');
    }
    if (!exam?.examId) {
      throw new Error('Missing examId for V2 attempt creation.');
    }
    if (attemptId) {
      return attemptId;
    }

    setInitializingAttempt(true);
    try {
      const result = await initializeV2ExamAttemptFirebase({
        userId: user.id,
        examId: exam.examId,
        mode,
      });
      setAttemptId(result.attemptId);
      return result.attemptId;
    } finally {
      setInitializingAttempt(false);
    }
  }, [attemptId, exam?.examId, mode, user?.id]);

  const persistInteractionResponse = useCallback(async (
    interaction: Pick<V2Interaction, 'interactionId' | 'itemId'>,
    response: V2ResponsePayload,
  ) => {
    if (!user?.id || !exam?.examId) {
      throw new Error('Missing user or exam context for V2 submission persistence.');
    }

    const activeAttemptId = await ensureAttempt();
    const { submissionId } = await persistV2SubmissionFirebase({
      attemptId: activeAttemptId,
      userId: user.id,
      examId: exam.examId,
      itemId: interaction.itemId,
      interactionId: interaction.interactionId,
      responsePayload: response,
    });

    setSubmissionStates((current) => ({
      ...current,
      [interaction.interactionId]: {
        submissionId,
        itemId: interaction.itemId,
        interactionId: interaction.interactionId,
        responsePayload: response,
        autoScore: undefined,
        manualScore: undefined,
        finalScore: undefined,
        autoFeedback: undefined,
        teacherFeedback: undefined,
        reviewStatus: 'pending',
      },
    }));

    setInteractionErrors((current) => ({ ...current, [interaction.interactionId]: null }));
    return submissionId;
  }, [ensureAttempt, exam?.examId, user?.id]);

  function handleInteractionSubmit(interactionId: string, response: V2ResponsePayload) {
    setResponses((current) => ({
      ...current,
      [interactionId]: response,
    }));
    setRuntimeError(null);
    setInteractionErrors((current) => ({ ...current, [interactionId]: null }));

    try {
      const interaction = getInteractionMeta(interactionId);
      void persistInteractionResponse(interaction, response).catch((cause) => {
        const message = normalizeError(cause, 'Failed to save this answer.');
        setInteractionErrors((current) => ({ ...current, [interactionId]: message }));
        setRuntimeError(message);
      });
    } catch (cause) {
      const message = normalizeError(cause, 'Failed to resolve this interaction.');
      setInteractionErrors((current) => ({ ...current, [interactionId]: message }));
      setRuntimeError(message);
    }
  }

  const handleInteractionCheck = useCallback(async (
    interactionId: string,
    options?: {
      responseOverride?: V2ResponsePayload;
      expectedSignature?: string;
      showToast?: boolean;
    },
  ) => {
    if (!exam?.examId || !user?.id) {
      const message = 'Missing exam or user context for V2 auto-check.';
      setRuntimeError(message);
      throw new Error(message);
    }

    const response = options?.responseOverride ?? responses[interactionId];
    const expectedSignature = options?.expectedSignature ?? getResponseSignature(response);
    const showToast = options?.showToast ?? true;

    if (!hasResponseContent(response)) {
      const message = 'Enter an answer before running V2 auto-check.';
      setInteractionErrors((current) => ({ ...current, [interactionId]: message }));
      throw new Error(message);
    }

    if (
      lastCompletedQuizSignatureRef.current[interactionId] === expectedSignature ||
      activeQuizCheckSignatureRef.current[interactionId] === expectedSignature
    ) {
      return;
    }

    const interaction = getInteractionMeta(interactionId);
    activeQuizCheckSignatureRef.current[interactionId] = expectedSignature;
    setCheckingInteractionIds((current) => new Set(current).add(interactionId));
    setInteractionErrors((current) => ({ ...current, [interactionId]: null }));
    setRuntimeError(null);

    try {
      const result = await autoCheckV2SubmissionFirebase({
        attemptId: await ensureAttempt(),
        userId: user.id,
        examId: exam.examId,
        itemId: interaction.itemId,
        interactionId,
        responsePayload: response,
      });

      if (getResponseSignature(latestResponsesRef.current[interactionId]) === expectedSignature) {
        lastCompletedQuizSignatureRef.current[interactionId] = expectedSignature;
        setSubmissionStates((current) => ({
          ...current,
          [interactionId]: {
            ...current[interactionId],
            submissionId: result.submissionId,
            itemId: interaction.itemId,
            interactionId,
            responsePayload: response,
            autoScore: result.autoScore,
            finalScore: result.requiresManualReview ? undefined : result.autoScore,
            autoFeedback: result.feedback,
            reviewStatus: result.requiresManualReview ? 'teacherReview' : 'autoMarked',
          },
        }));

        if (showToast) {
          toast({
            title: result.requiresManualReview ? 'Saved for manual review' : 'Auto-check complete',
            description: result.requiresManualReview
              ? 'This interaction needs teacher review.'
              : `Score: ${result.autoScore}${typeof result.maxScore === 'number' ? ` / ${result.maxScore}` : ''}`,
          });
        }
      }
    } catch (cause) {
      const message = normalizeError(cause, 'V2 auto-check failed.');
      if (getResponseSignature(latestResponsesRef.current[interactionId]) === expectedSignature) {
        setInteractionErrors((current) => ({ ...current, [interactionId]: message }));
        setRuntimeError(message);
        if (showToast) {
          toast({
            title: 'Auto-check failed',
            description: message,
            variant: 'destructive',
          });
        }
      }
      throw cause;
    } finally {
      if (activeQuizCheckSignatureRef.current[interactionId] === expectedSignature) {
        delete activeQuizCheckSignatureRef.current[interactionId];
      }
      setCheckingInteractionIds((current) => {
        const next = new Set(current);
        next.delete(interactionId);
        return next;
      });
    }
  }, [ensureAttempt, exam?.examId, getInteractionMeta, getResponseSignature, hasResponseContent, normalizeError, responses, toast, user?.id]);

  useEffect(() => {
    if (mode !== 'quiz') {
      Object.values(quizDebounceTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
      quizDebounceTimersRef.current = {};
      return;
    }

    flattenedInteractions.forEach((interaction) => {
      const response = responses[interaction.interactionId];
      const signature = getResponseSignature(response);
      const interactionId = interaction.interactionId;

      if (!hasResponseContent(response)) {
        if (quizDebounceTimersRef.current[interactionId]) {
          window.clearTimeout(quizDebounceTimersRef.current[interactionId]);
          delete quizDebounceTimersRef.current[interactionId];
        }
        delete lastQueuedQuizSignatureRef.current[interactionId];
        delete lastCompletedQuizSignatureRef.current[interactionId];
        delete activeQuizCheckSignatureRef.current[interactionId];
        return;
      }

      if (
        activeQuizCheckSignatureRef.current[interactionId] ||
        lastQueuedQuizSignatureRef.current[interactionId] === signature ||
        lastCompletedQuizSignatureRef.current[interactionId] === signature ||
        activeQuizCheckSignatureRef.current[interactionId] === signature
      ) {
        return;
      }

      if (quizDebounceTimersRef.current[interactionId]) {
        window.clearTimeout(quizDebounceTimersRef.current[interactionId]);
      }

      lastQueuedQuizSignatureRef.current[interactionId] = signature;
      const delay = getQuizAutoCheckDelay(interaction);
      quizDebounceTimersRef.current[interactionId] = window.setTimeout(() => {
        delete quizDebounceTimersRef.current[interactionId];
        void handleInteractionCheck(interactionId, {
          responseOverride: response,
          expectedSignature: signature,
          showToast: false,
        }).catch(() => {
          // Visible state is handled inside handleInteractionCheck.
        });
      }, delay);
    });
  }, [
    flattenedInteractions,
    getQuizAutoCheckDelay,
    getResponseSignature,
    handleInteractionCheck,
    hasResponseContent,
    checkingInteractionIds,
    mode,
    responses,
  ]);

  async function handleSubmit(autoSubmitted = false) {
    if (!exam || !user || submitting) {
      return;
    }

    setSubmitting(true);
    setRuntimeError(null);

    try {
      const activeAttemptId = await ensureAttempt();
      const result = await submitV2ExamAttemptFirebase({
        attemptId: activeAttemptId,
        userId: user.id,
        examId: exam.examId,
        mode,
        durationSeconds:
          mode === 'simulation' && timeLeft !== null
            ? exam.durationMinutes * 60 - Math.max(0, timeLeft)
            : 0,
        interactions: flattenedInteractions.map((interaction) => ({
          interactionId: interaction.interactionId,
          itemId: interaction.itemId,
        })),
        responses,
        existingSubmissionStates: submissionStates,
      });

      navigate(`/exams/${exam.examId}/results/${result.attemptId}`, {
        state: { autoSubmitted },
      });
    } catch (cause) {
      const message = normalizeError(cause, 'Failed to submit this V2 exam attempt.');
      console.error('Failed to submit V2 exam attempt:', cause);
      setRuntimeError(message);
      toast({
        title: 'Submit failed',
        description: message,
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">You need to sign in to take this exam.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !exam) {
    const isPermissionError = typeof error === 'string' && (
      error.toLowerCase().includes('permission') ||
      error.toLowerCase().includes('insufficient')
    );
    const isMissingContent = !error && !exam;

    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h1 className="text-2xl font-semibold text-foreground">
            {isPermissionError ? 'Access restricted' : isMissingContent ? 'Exam not found' : 'Could not load exam'}
          </h1>
          <p className="text-muted-foreground">
            {isPermissionError
              ? "You don't have permission to access this exam. Sign in or upgrade your plan to unlock it."
              : isMissingContent
              ? 'This exam does not exist or has been removed.'
              : error}
          </p>
          <div className="flex justify-center gap-3">
            {isPermissionError && (
              <Button variant="outline" onClick={() => navigate('/pricing')}>View plans</Button>
            )}
            {!isPermissionError && (
              <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
            )}
            <Button onClick={() => navigate('/exams')}>Back to exam library</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">V2 Exam Engine</p>
            <h1 className="text-lg font-semibold text-foreground">{exam.title}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
              {mode === 'simulation' ? 'Exam Simulation' : mode === 'quiz' ? 'Quiz' : 'Practice'}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
              {attemptId ? 'Attempt active' : initializingAttempt ? 'Creating attempt...' : 'Attempt not started'}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
              {answeredCount}/{flattenedInteractions.length} parts answered
            </span>
            {timeLeft !== null && (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">
                <Clock className="h-4 w-4" />
                {formatTime(Math.max(0, timeLeft))}
              </span>
            )}
            <Button
              onClick={() => void handleSubmit(false)}
              disabled={submitting || initializingAttempt || flattenedInteractions.length === 0}
            >
              {submitting ? 'Submitting...' : 'Submit V2 Exam'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {runtimeError && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-medium">V2 runtime error</p>
                <p className="text-sm">{runtimeError}</p>
              </div>
            </div>
          </div>
        )}

        <V2ExamRenderer
          exam={exam}
          sections={sections}
          instructionGroups={flattenedInstructionGroups}
          contextBlocks={flattenedContextBlocks}
          items={flattenedItems}
          interactions={flattenedInteractions}
          mode={mode}
          onInteractionSubmit={handleInteractionSubmit}
          onInteractionCheck={handleInteractionCheck}
          showFeedback={mode !== 'simulation'}
          submissions={submissionsMap}
          checkingInteractionIds={checkingInteractionIds}
          interactionErrors={interactionErrors}
        />
      </div>
    </div>
  );
}
