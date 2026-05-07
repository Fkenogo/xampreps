import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Loader2, AlertTriangle, UserCheck, XCircle } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getExamAttemptDetailsFirebase } from '@/integrations/firebase/exams';
import { loadV2ExamDataFirebase, type LoadedV2ExamData } from '@/integrations/firebase/content';
import type { FirebaseAttemptSubmission, FirebaseExamAttempt } from '@/integrations/firebase/exams';
import type { V2Interaction, V2Item, V2ModelAnswerVersion } from '@/types/v2';
import { V2ContextBlockRenderer } from '@/components/exam/v2/V2ContextBlockRenderer';
import { V2ItemRenderer } from '@/components/exam/v2/V2ItemRenderer';
import { hasSubmittedAnswer } from '@/lib/v2-response-display';

function asText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function getSubmissionStatus(submission: FirebaseAttemptSubmission | null) {
  const hasAnswer = hasSubmittedAnswer(submission?.responsePayload);
  if (!submission || (!hasAnswer && (submission.reviewStatus === 'unanswered' || submission.isAnswered === false))) return 'unanswered';
  if (submission.reviewStatus === 'teacherReview' || submission.autoFeedback?.requiresManualReview) return 'teacher-review-pending';
  if (submission.reviewStatus === 'teacherOverride' || (submission as unknown as Record<string, unknown>).teacherOverride === true) {
    return 'teacher-corrected';
  }
  if (
    submission.reviewStatus === 'teacherReviewed' ||
    submission.reviewStatus === 'reviewed' ||
    Boolean((submission as unknown as Record<string, unknown>).scoredByTeacher)
  ) {
    return 'teacher-reviewed';
  }
  if (submission.autoFeedback?.isCorrect === true) return 'correct';
  if (submission.autoFeedback?.isCorrect === false) return 'incorrect';
  if (!hasAnswer) return 'unanswered';
  return 'submitted';
}

function resolveSubmissionForInteraction(
  submissionsByInteractionId: Map<string, FirebaseAttemptSubmission>,
  submissionsBySuffix: Map<string, FirebaseAttemptSubmission>,
  interaction: V2Interaction,
) {
  return submissionsByInteractionId.get(interaction.interactionId) ||
    submissionsBySuffix.get(interaction.interactionId) ||
    null;
}

function statusBadge(status: string) {
  if (status === 'correct') return { label: 'Correct', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' };
  if (status === 'incorrect') return { label: 'Incorrect', className: 'border-rose-300 bg-rose-50 text-rose-700' };
  if (status === 'unanswered') return { label: 'Unanswered', className: 'border-muted bg-muted text-muted-foreground' };
  if (status === 'teacher-review-pending') return { label: 'Awaiting teacher review', className: 'border-amber-300 bg-amber-50 text-amber-700' };
  if (status === 'teacher-corrected') return { label: 'Teacher corrected auto score', className: 'border-blue-300 bg-blue-50 text-blue-700' };
  if (status === 'teacher-reviewed') return { label: 'Scored by teacher', className: 'border-blue-300 bg-blue-50 text-blue-700' };
  return { label: 'Submitted', className: 'border-border bg-background text-foreground' };
}

function statusIcon(status: string) {
  if (status === 'correct') return <CheckCircle2 className="h-4 w-4" />;
  if (status === 'incorrect') return <XCircle className="h-4 w-4" />;
  if (status === 'teacher-reviewed' || status === 'teacher-corrected') return <UserCheck className="h-4 w-4" />;
  if (status === 'teacher-review-pending') return <AlertTriangle className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
}

function findModelAnswer(examData: LoadedV2ExamData, item: V2Item, interaction: V2Interaction): V2ModelAnswerVersion | null {
  return (examData.modelAnswers.get(item.itemId) || [])
    .find((answer) => answer.interactionId === interaction.interactionId) || null;
}

function getScoreText(submission: FirebaseAttemptSubmission | null, interaction: V2Interaction, item: V2Item) {
  const maxScore = interaction.marks || item.marks || 1;
  const score = typeof submission?.finalScore === 'number'
    ? submission.finalScore
    : typeof submission?.autoScore === 'number'
      ? submission.autoScore
      : 0;
  return `${score}/${maxScore}`;
}

export default function ExamResultsPage() {
  const { examId, attemptId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<FirebaseExamAttempt | null>(null);
  const [submissions, setSubmissions] = useState<FirebaseAttemptSubmission[]>([]);
  const [examData, setExamData] = useState<LoadedV2ExamData | null>(null);
  const [openDetails, setOpenDetails] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    async function load() {
      if (!examId || !attemptId) return;

      try {
        console.info('[ExamResultsPage] Loading V2 result route', {
          routeExamId: examId,
          routeAttemptId: attemptId,
          currentUserId: user?.id || null,
        });
        const [attemptLoad, examLoad] = await Promise.allSettled([
          getExamAttemptDetailsFirebase(attemptId, {
            routeExamId: examId,
            currentUserId: user?.id || null,
          }),
          loadV2ExamDataFirebase(examId),
        ]);

        if (attemptLoad.status === 'rejected') {
          const error = attemptLoad.reason as { code?: unknown; message?: unknown };
          console.error('[ExamResultsPage] Failed to load V2 attempt', {
            routeExamId: examId,
            routeAttemptId: attemptId,
            path: `exam_attempts/${attemptId}`,
            currentUserId: user?.id || null,
            code: typeof error?.code === 'string' ? error.code : null,
            message: typeof error?.message === 'string' ? error.message : String(attemptLoad.reason),
            error: attemptLoad.reason,
          });
          setLoading(false);
          return;
        }

        if (examLoad.status === 'rejected') {
          console.warn('[ExamResultsPage] V2 exam content failed to load; showing attempt summary only', {
            examId,
            attemptId,
            error: examLoad.reason,
          });
        }

        setAttempt(attemptLoad.value.attempt || null);
        setSubmissions(attemptLoad.value.submissions || []);
        setExamData(examLoad.status === 'fulfilled' ? examLoad.value : null);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [attemptId, examId, user?.id]);

  const submissionsMap = useMemo(() => {
    const byInteractionId = new Map<string, FirebaseAttemptSubmission>();
    submissions.forEach((submission) => {
      if (submission.interactionId) byInteractionId.set(submission.interactionId, submission);
    });
    return byInteractionId;
  }, [submissions]);
  const submissionsBySuffix = useMemo(() => {
    const bySuffix = new Map<string, FirebaseAttemptSubmission>();
    submissions.forEach((submission) => {
      const suffix = submission.submissionId.includes('__') ? submission.submissionId.split('__').slice(1).join('__') : '';
      if (suffix) bySuffix.set(suffix, submission);
    });
    return bySuffix;
  }, [submissions]);

  useEffect(() => {
    if (!examData?.exam) return;
    const allInteractions = Array.from(examData.interactions.values()).flat();
    const matched = allInteractions.filter((interaction) =>
      resolveSubmissionForInteraction(submissionsMap, submissionsBySuffix, interaction),
    );
    const unmatched = allInteractions
      .filter((interaction) => !resolveSubmissionForInteraction(submissionsMap, submissionsBySuffix, interaction))
      .map((interaction) => interaction.interactionId);
    console.info('[ExamResultsPage] Submission interaction match summary', {
      attemptId,
      examId,
      submissionsCount: submissions.length,
      renderedInteractionsCount: allInteractions.length,
      matchedInteractionCount: matched.length,
      unmatchedInteractionIds: unmatched.slice(0, 20),
    });
    if (unmatched.length > 0 && submissions.length > 0) {
      console.warn('[ExamResultsPage] Some rendered interactions have no matching submission', {
        attemptId,
        examId,
        unmatchedInteractionIds: unmatched.slice(0, 20),
        submissionInteractionIds: submissions.map((submission) => submission.interactionId).slice(0, 20),
        submissionIds: submissions.map((submission) => submission.submissionId).slice(0, 20),
      });
    }
  }, [attemptId, examId, examData, submissions, submissionsMap, submissionsBySuffix]);

  const reviewRequiredCount = useMemo(
    () => submissions.filter((submission) => getSubmissionStatus(submission) === 'teacher-review-pending').length,
    [submissions],
  );
  const unansweredCount = useMemo(
    () => submissions.filter((submission) => getSubmissionStatus(submission) === 'unanswered').length,
    [submissions],
  );

  const toggleDetail = (interactionId: string, key: string) => {
    setOpenDetails((current) => ({
      ...current,
      [interactionId]: {
        ...(current[interactionId] || {}),
        [key]: !current[interactionId]?.[key],
      },
    }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!attempt) {
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
  const examTitle = examData?.exam?.title || 'V2 Exam Results';
  const examSubject = examData?.exam?.subject || '';
  const examLevel = examData?.exam?.level || '';

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/history')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{examTitle}</h1>
            <p className="text-muted-foreground">
              {[examSubject, examLevel].filter(Boolean).join(' | ')}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Current Score</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {attempt.finalScore}/{attempt.maxScore}
            </p>
            <p className="text-sm text-muted-foreground">{percentage}%</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Attempt Status</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{statusLabel}</p>
            <p className="text-sm text-muted-foreground">
              {attempt.completedAt || attempt.submittedAt || 'No completion timestamp'}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Teacher Review</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{reviewRequiredCount}</p>
            <p className="text-sm text-muted-foreground">
              {unansweredCount > 0 ? `${unansweredCount} unanswered, ` : ''}responses awaiting manual review
            </p>
          </div>
        </div>

        {reviewRequiredCount > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-medium">Some answers are awaiting teacher review.</p>
                <p className="text-sm">This page will update with teacher scores and comments when review is complete.</p>
              </div>
            </div>
          </div>
        )}

        {!examData?.exam ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            The full exam content could not be loaded, but your attempt summary is available.
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-5">
            {examData.sections.map((section) => (
              <section key={section.sectionId} className="mb-10">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
                  {section.marks > 0 ? <span className="text-sm text-muted-foreground">[{section.marks} marks]</span> : null}
                  {section.sharedInstructions ? (
                    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4 text-sm text-foreground whitespace-pre-wrap">
                      {section.sharedInstructions}
                    </div>
                  ) : null}
                </div>

                {(examData.instructionGroups.get(section.sectionId) || []).map((group) => (
                  <div key={group.instructionGroupId} className="mb-8">
                    <div className="mb-6 rounded-lg bg-muted/40 p-4">
                      {group.title ? <h3 className="mb-2 font-semibold text-foreground">{group.title}</h3> : null}
                      {group.questionRangeLabel ? (
                        <span className="mb-2 inline-block rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                          {group.questionRangeLabel}
                        </span>
                      ) : null}
                      <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: group.instructionsMarkdown }} />
                    </div>

                    {(examData.contextBlocks.get(group.instructionGroupId) || []).map((block) => (
                      <V2ContextBlockRenderer key={block.contextBlockId} block={block} isSimulation={false} />
                    ))}

                    <div className="space-y-6">
                      {(examData.items.get(group.instructionGroupId) || []).map((item) => {
                        const itemInteractions = examData.interactions.get(item.itemId) || [];
                        const itemSubmissionsMap = new Map<string, FirebaseAttemptSubmission>();
                        itemInteractions.forEach((interaction) => {
                          const submission = resolveSubmissionForInteraction(submissionsMap, submissionsBySuffix, interaction);
                          if (submission) itemSubmissionsMap.set(interaction.interactionId, submission);
                        });
                        return (
                          <article key={item.itemId} className="rounded-lg border border-border bg-background p-4">
                            <V2ItemRenderer
                              item={item}
                              interactions={itemInteractions}
                              mode="simulation"
                              isSimulation
                              submissions={itemSubmissionsMap}
                              readOnly
                            />

                            <div className="mt-4 space-y-3 border-t border-border pt-4">
                              {itemInteractions.map((interaction) => {
                                const submission = resolveSubmissionForInteraction(submissionsMap, submissionsBySuffix, interaction);
                                const status = getSubmissionStatus(submission);
                                const badge = statusBadge(status);
                                const modelAnswer = findModelAnswer(examData, item, interaction);
                                const alternatives = modelAnswer?.acceptableAlternatives || [];
                                const officialAnswer = asText(modelAnswer?.approvedAnswer, asText(submission?.autoFeedback?.correctAnswer));
                                const explanation = asText(modelAnswer?.explanation, asText(modelAnswer?.teacherNotes, asText(submission?.autoFeedback?.explanation)));
                                const teacherComment = asText(submission?.teacherFeedback?.comments, asText(submission?.teacherFeedback?.reason));
                                const teacherCorrected = status === 'teacher-corrected';
                                const detailState = openDetails[interaction.interactionId] || {};

                                return (
                                  <div key={interaction.interactionId} className="rounded-md border border-border bg-card p-3">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                      <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Badge variant="outline" className={badge.className}>
                                            <span className="mr-1 inline-flex">{statusIcon(status)}</span>
                                            {badge.label}
                                          </Badge>
                                          <Badge variant="secondary">{getScoreText(submission, interaction, item)} marks</Badge>
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap gap-2">
                                        <Button size="sm" variant="outline" onClick={() => toggleDetail(interaction.interactionId, 'answer')}>
                                          Show official answer
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => toggleDetail(interaction.interactionId, 'alternatives')}>
                                          Show alternative answers
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => toggleDetail(interaction.interactionId, 'explanation')}>
                                          Show detailed explanation
                                        </Button>
                                        {teacherComment ? (
                                          <Button size="sm" variant="outline" onClick={() => toggleDetail(interaction.interactionId, 'teacher')}>
                                            Show teacher comment
                                          </Button>
                                        ) : null}
                                      </div>
                                    </div>

                                    {submission?.autoFeedback ? (
                                      <div className="mt-3 rounded-md border border-border bg-background p-3 text-sm">
                                        <p className="font-medium text-foreground">Auto feedback</p>
                                        <p className="mt-1 text-muted-foreground">
                                          {submission.autoFeedback.isCorrect === true
                                            ? 'Auto-marked correct.'
                                            : submission.autoFeedback.requiresManualReview
                                              ? 'Auto-marker requested teacher review.'
                                              : 'Auto-marked incorrect.'}
                                        </p>
                                      </div>
                                    ) : null}

                                    {submission?.teacherFeedback ? (
                                      <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                                        <p className="font-medium">{teacherCorrected ? 'Teacher corrected auto score' : 'Scored by teacher'}</p>
                                        <p className="mt-1">
                                          {submission.teacherFeedback.teacherName || 'Teacher'}
                                          {typeof submission.teacherFeedback.score === 'number'
                                            ? ` awarded ${submission.teacherFeedback.score} mark(s).`
                                            : ' reviewed this answer.'}
                                        </p>
                                        {teacherCorrected && submission.autoFeedback ? (
                                          <p className="mt-1">
                                            Original auto status: {submission.autoFeedback.isCorrect ? 'correct' : 'incorrect'}.
                                          </p>
                                        ) : null}
                                      </div>
                                    ) : status === 'teacher-review-pending' ? (
                                      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                        Awaiting teacher review.
                                      </div>
                                    ) : null}

                                    {detailState.answer ? (
                                      <div className="mt-3 rounded-md bg-muted/30 p-3">
                                        <p className="text-xs uppercase text-muted-foreground">Official answer</p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{officialAnswer || 'No official answer recorded.'}</p>
                                      </div>
                                    ) : null}
                                    {detailState.alternatives ? (
                                      <div className="mt-3 rounded-md bg-muted/30 p-3">
                                        <p className="text-xs uppercase text-muted-foreground">Alternative answers</p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                                          {alternatives.length > 0 ? alternatives.join('\n') : 'No alternative answers recorded.'}
                                        </p>
                                      </div>
                                    ) : null}
                                    {detailState.explanation ? (
                                      <div className="mt-3 rounded-md bg-muted/30 p-3">
                                        <p className="text-xs uppercase text-muted-foreground">Detailed explanation</p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{explanation || 'No explanation recorded.'}</p>
                                      </div>
                                    ) : null}
                                    {detailState.teacher && teacherComment ? (
                                      <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                                        <p className="text-xs uppercase text-blue-700">Teacher comment</p>
                                        <p className="mt-1 whitespace-pre-wrap">{teacherComment}</p>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
