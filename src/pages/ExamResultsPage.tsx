import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Loader2, AlertTriangle, UserCheck } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { getExamAttemptDetailsFirebase } from '@/integrations/firebase/exams';
import { loadV2ExamDataFirebase } from '@/integrations/firebase/content';
import type { FirebaseAttemptSubmission, FirebaseExamAttempt } from '@/integrations/firebase/exams';
import type { V2Interaction, V2Item } from '@/types/v2';

interface ExamResultState {
  examTitle: string;
  examSubject: string;
  examLevel: string;
  items: V2Item[];
  interactions: V2Interaction[];
}

function formatAnswer(submission: FirebaseAttemptSubmission) {
  const payload = submission.responsePayload || {};
  if (typeof payload.textAnswer === 'string') return payload.textAnswer;
  if (payload.textAnswer && typeof payload.textAnswer === 'object') {
    return Object.entries(payload.textAnswer)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join('\n');
  }
  if (payload.selectedOptions?.length) return payload.selectedOptions.join(', ');
  if (payload.tableAnswers) return Object.values(payload.tableAnswers).join(', ');
  if (payload.uploadedFileUrl) return 'Uploaded file';
  return 'No answer submitted';
}

export default function ExamResultsPage() {
  const { examId, attemptId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<FirebaseExamAttempt | null>(null);
  const [submissions, setSubmissions] = useState<FirebaseAttemptSubmission[]>([]);
  const [state, setState] = useState<ExamResultState | null>(null);

  useEffect(() => {
    async function load() {
      if (!examId || !attemptId) return;

      try {
        const [attemptLoad, examLoad] = await Promise.allSettled([
          getExamAttemptDetailsFirebase(attemptId),
          loadV2ExamDataFirebase(examId),
        ]);

        if (attemptLoad.status === 'rejected') {
          console.error('[ExamResultsPage] Failed to load V2 attempt', { examId, attemptId, error: attemptLoad.reason });
          setLoading(false);
          return;
        }

        const attemptResult = attemptLoad.value;
        const examResult = examLoad.status === 'fulfilled' ? examLoad.value : null;
        if (examLoad.status === 'rejected') {
          console.warn('[ExamResultsPage] V2 exam content failed to load; showing attempt summary only', {
            examId,
            attemptId,
            error: examLoad.reason,
          });
        }

        if (!attemptResult.ok || !attemptResult.attempt || !examResult?.exam) {
          if (attemptResult.ok && attemptResult.attempt) {
            setAttempt(attemptResult.attempt);
            setSubmissions(attemptResult.submissions);
            setState({
              examTitle: 'V2 Exam Results',
              examSubject: '',
              examLevel: '',
              items: [],
              interactions: [],
            });
          }
          setLoading(false);
          return;
        }

        setAttempt(attemptResult.attempt);
        setSubmissions(attemptResult.submissions);
        setState({
          examTitle: examResult.exam.title,
          examSubject: examResult.exam.subject,
          examLevel: examResult.exam.level,
          items: Array.from(examResult.items.values()).flat(),
          interactions: Array.from(examResult.interactions.values()).flat(),
        });
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [attemptId, examId]);

  const interactionsById = useMemo(
    () => new Map((state?.interactions || []).map((interaction) => [interaction.interactionId, interaction])),
    [state?.interactions],
  );
  const itemsById = useMemo(
    () => new Map((state?.items || []).map((item) => [item.itemId, item])),
    [state?.items],
  );

  const reviewRequiredCount = useMemo(
    () => submissions.filter((submission) => submission.reviewStatus === 'teacherReview').length,
    [submissions],
  );
  const unansweredCount = useMemo(
    () => submissions.filter((submission) => submission.reviewStatus === 'unanswered' || submission.isAnswered === false).length,
    [submissions],
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!attempt || !state) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
          <h1 className="text-2xl font-semibold text-foreground">Results unavailable</h1>
          <p className="text-muted-foreground">This V2 exam attempt could not be loaded.</p>
          <Button onClick={() => navigate('/history')}>Go to exam history</Button>
        </div>
      </DashboardLayout>
    );
  }

  const percentage = attempt.maxScore > 0 ? Math.round((attempt.finalScore / attempt.maxScore) * 100) : 0;
  const statusLabel = attempt.status === 'pending_review'
    ? 'Submitted / pending teacher review'
    : attempt.status === 'submitted'
      ? 'Submitted'
      : attempt.status === 'completed'
        ? 'Completed'
        : attempt.status;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/history')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{state.examTitle}</h1>
            <p className="text-muted-foreground">
              {state.examSubject} • {state.examLevel}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Current Score</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {attempt.finalScore}/{attempt.maxScore}
            </p>
            <p className="text-sm text-muted-foreground">{percentage}%</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Attempt Status</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{statusLabel}</p>
            <p className="text-sm text-muted-foreground">
              {attempt.completedAt || attempt.submittedAt || 'No completion timestamp'}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Teacher Review</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{reviewRequiredCount}</p>
            <p className="text-sm text-muted-foreground">
              {unansweredCount > 0 ? `${unansweredCount} unanswered, ` : ''}responses awaiting manual review
            </p>
          </div>
        </div>

        {reviewRequiredCount > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-medium">Manual review is pending.</p>
                <p className="text-sm">
                  This answer may be correct but needs teacher review. Linked teachers can score these responses from
                  their V2 teacher review queue.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {submissions.map((submission) => {
            const interaction = interactionsById.get(submission.interactionId);
            const item = itemsById.get(submission.itemId);
            const isCorrect = submission.autoFeedback?.isCorrect === true;
            const awaitingTeacher = submission.reviewStatus === 'teacherReview';
            const scoredByTeacher = submission.reviewStatus === 'reviewed' && Boolean(submission.teacherFeedback);
            const unanswered = submission.reviewStatus === 'unanswered' || submission.isAnswered === false;

            return (
              <div key={submission.submissionId} className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {item ? `${item.orderIndex + 1}. ${item.stemText || item.stemMarkdown || 'Untitled item'}` : 'Item'}
                    </p>
                    <p className="font-medium text-foreground">
                      {interaction?.label ? `${interaction.label} ` : ''}
                      {interaction?.promptText || interaction?.promptMarkdown || 'Interaction'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Review status</p>
                    <p className="font-medium text-foreground">
                      {unanswered ? 'Unanswered' : scoredByTeacher ? 'Scored by teacher' : awaitingTeacher ? 'Awaiting teacher review' : 'Auto-marked'}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Your answer</p>
                  <p className="mt-2 text-foreground whitespace-pre-wrap">{formatAnswer(submission)}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {submission.submittedAt || 'No timestamp'}
                  </span>
                  {scoredByTeacher ? (
                    <span className="inline-flex items-center gap-2 font-medium text-emerald-600">
                      <UserCheck className="h-4 w-4" />
                      Scored by teacher
                    </span>
                  ) : unanswered ? (
                    <span className="inline-flex items-center gap-2 font-medium text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Unanswered
                    </span>
                  ) : awaitingTeacher ? (
                    <span className="inline-flex items-center gap-2 font-medium text-amber-700">
                      <AlertTriangle className="h-4 w-4" />
                      Awaiting teacher review
                    </span>
                  ) : submission.autoFeedback && (
                    <span
                      className={`inline-flex items-center gap-2 font-medium ${
                        isCorrect ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {isCorrect ? 'Auto-marked correct' : 'Auto-marked incorrect'}
                    </span>
                  )}
                  {typeof submission.finalScore === 'number' && (
                    <span className="text-muted-foreground">
                      Score: {submission.finalScore}
                      {typeof submission.autoScore === 'number' ? ` / ${submission.autoScore}` : ''}
                    </span>
                  )}
                </div>

                {submission.autoFeedback?.correctAnswer && (
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Expected answer</p>
                    <p className="mt-2 text-foreground">{submission.autoFeedback.correctAnswer}</p>
                    {submission.autoFeedback.explanation && (
                      <p className="mt-2 text-sm text-muted-foreground">{submission.autoFeedback.explanation}</p>
                    )}
                  </div>
                )}

                {submission.teacherFeedback && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                    <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">Scored by teacher</p>
                    <p className="mt-2 text-sm">
                      {submission.teacherFeedback.teacherName || 'Teacher'}
                      {typeof submission.teacherFeedback.score === 'number' ? ` awarded ${submission.teacherFeedback.score} mark(s).` : ' reviewed this answer.'}
                    </p>
                    {submission.teacherFeedback.comments ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm">{submission.teacherFeedback.comments}</p>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
