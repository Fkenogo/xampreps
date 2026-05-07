import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Flag,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  createTeacherAnswerSuggestionFirebase,
  getTeacherAttemptReviewFirebase,
  listTeacherReviewQueueFirebase,
  overrideTeacherSubmissionScoreFirebase,
  type V2TeacherReviewQueueItem,
} from '@/integrations/firebase/v2-review';
import { loadV2ExamDataFirebase, type LoadedV2ExamData } from '@/integrations/firebase/content';
import { cn } from '@/lib/utils';
import type { V2ContextBlock, V2InstructionGroup, V2Interaction, V2Item, V2Section } from '@/types/v2';
import { V2ContextBlockRenderer } from '@/components/exam/v2/V2ContextBlockRenderer';
import { V2ItemRenderer } from '@/components/exam/v2/V2ItemRenderer';

type ReviewBatchStatus = 'pending' | 'partially_reviewed' | 'completed';

interface ReviewBatch {
  id: string;
  attemptId: string;
  examId: string;
  studentId: string;
  examTitle: string;
  studentName: string;
  studentEmail: string | null;
  submittedAt: string | null;
  pendingCount: number;
  reviewedCount: number;
  totalCount: number;
  scoreEarned: number | null;
  scoreMax: number | null;
  status: ReviewBatchStatus;
  tasks: V2TeacherReviewQueueItem[];
}

function asText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function field(record: Record<string, unknown> | null | undefined, key: string) {
  return record ? record[key] : undefined;
}

function firstText(...values: unknown[]) {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0) || '';
}

function extractSeconds(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const time = Date.parse(value);
    return Number.isFinite(time) ? Math.floor(time / 1000) : null;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const seconds = asNumber(record.seconds) ?? asNumber(record._seconds);
    if (seconds !== null) return seconds;
    const time = asText(record.toDate instanceof Function ? record.toDate().toISOString() : '');
    if (time) return extractSeconds(time);
  }
  return null;
}

function toIso(value: unknown) {
  const seconds = extractSeconds(value);
  return seconds === null ? null : new Date(seconds * 1000).toISOString();
}

function formatDateTime(value: string | null) {
  if (!value) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatStudentAnswer(task: V2TeacherReviewQueueItem) {
  const payload = task.submission?.responsePayload as Record<string, unknown> | undefined;
  if (!payload) return 'No answer submitted';
  if (typeof payload.textAnswer === 'string') return payload.textAnswer || 'No answer submitted';
  if (payload.textAnswer && typeof payload.textAnswer === 'object') {
    return Object.entries(payload.textAnswer as Record<string, unknown>)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join('\n');
  }
  if (Array.isArray(payload.selectedOptions)) return payload.selectedOptions.join(', ');
  return 'Answer saved in a structured format.';
}

function getTaskAttemptId(task: V2TeacherReviewQueueItem) {
  return firstText(
    field(task.submission, 'attemptId'),
    field(task.submission, 'attempt_id'),
    task.submissionId.includes('__') ? task.submissionId.split('__')[0] : '',
  );
}

function getTaskStudentId(task: V2TeacherReviewQueueItem) {
  return firstText(task.userId, field(task.submission, 'userId'), field(task.submission, 'user_id'), field(task.submission, 'studentId'), field(task.submission, 'student_id'));
}

function getStudentDisplayName(student: Record<string, unknown> | null | undefined, fallback: string) {
  return firstText(
    field(student, 'displayName'),
    field(student, 'name'),
    [field(student, 'firstName'), field(student, 'lastName')].filter(Boolean).join(' '),
    fallback,
  );
}

function getStudentEmail(student: Record<string, unknown> | null | undefined) {
  return firstText(field(student, 'email'), field(student, 'studentEmail')) || null;
}

function getTaskSubmittedAt(task: V2TeacherReviewQueueItem) {
  return toIso(field(task.submission, 'submittedAt')) ||
    toIso(field(task.submission, 'submitted_at')) ||
    toIso(field(task.submission, 'createdAt')) ||
    toIso(field(task.submission, 'created_at')) ||
    toIso((task as unknown as Record<string, unknown>).createdAt);
}

function getTaskScore(task: V2TeacherReviewQueueItem) {
  return asNumber(field(task.submission, 'finalScore')) ??
    asNumber(field(task.submission, 'final_score')) ??
    asNumber(field(task.submission, 'manualScore')) ??
    asNumber(field(task.submission, 'manual_score')) ??
    asNumber(field(task.submission, 'autoScore')) ??
    asNumber(field(task.submission, 'auto_score'));
}

function getTaskMaxScore(task: V2TeacherReviewQueueItem) {
  return asNumber(field(task.markingRule, 'marks')) ?? asNumber(field(task.interaction, 'marks'));
}

function groupReviewTasks(tasks: V2TeacherReviewQueueItem[]) {
  const batches = new Map<string, ReviewBatch>();

  tasks.forEach((task) => {
    const attemptId = getTaskAttemptId(task);
    const studentId = getTaskStudentId(task);
    const examId = task.examId;
    if (!attemptId || !studentId || !examId) return;

    const key = `${studentId}__${attemptId}__${examId}`;
    const existing = batches.get(key);
    const score = getTaskScore(task);
    const maxScore = getTaskMaxScore(task);
    const submittedAt = getTaskSubmittedAt(task);

    if (!existing) {
      const examTitle = asText(field(task.exam, 'title'), examId);
      const studentName = getStudentDisplayName(task.student, studentId);
      batches.set(key, {
        id: key,
        attemptId,
        examId,
        studentId,
        examTitle,
        studentName,
        studentEmail: getStudentEmail(task.student),
        submittedAt,
        pendingCount: task.status === 'completed' ? 0 : 1,
        reviewedCount: task.status === 'completed' ? 1 : 0,
        totalCount: 1,
        scoreEarned: score,
        scoreMax: maxScore,
        status: task.status === 'completed' ? 'completed' : 'pending',
        tasks: [task],
      });
      return;
    }

    existing.tasks.push(task);
    existing.totalCount += 1;
    existing.pendingCount += task.status === 'completed' ? 0 : 1;
    existing.reviewedCount += task.status === 'completed' ? 1 : 0;
    if (score !== null) existing.scoreEarned = (existing.scoreEarned ?? 0) + score;
    if (maxScore !== null) existing.scoreMax = (existing.scoreMax ?? 0) + maxScore;
    if (!existing.submittedAt || (submittedAt && submittedAt < existing.submittedAt)) existing.submittedAt = submittedAt;
    existing.status = existing.pendingCount === 0 ? 'completed' : existing.reviewedCount > 0 ? 'partially_reviewed' : 'pending';
  });

  return Array.from(batches.values())
    .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
}

async function loadReviewTasks() {
  const [pending, completed] = await Promise.all([
    listTeacherReviewQueueFirebase({ status: 'pending', limit: 100 }),
    listTeacherReviewQueueFirebase({ status: 'completed', limit: 100 }),
  ]);

  const byId = new Map<string, V2TeacherReviewQueueItem>();
  [...(pending.tasks || []), ...(completed.tasks || [])].forEach((task) => byId.set(task.id, task));
  return Array.from(byId.values());
}

function statusLabel(status: ReviewBatchStatus) {
  if (status === 'completed') return 'Completed';
  if (status === 'partially_reviewed') return 'Partially reviewed';
  return 'Pending review';
}

function scoreLabel(batch: ReviewBatch) {
  if (batch.scoreEarned === null || batch.scoreMax === null) return 'Score pending';
  return `${batch.scoreEarned}/${batch.scoreMax}`;
}

interface FullReviewItem {
  id: string;
  label: string;
  section: V2Section | null;
  instructionGroup: V2InstructionGroup | null;
  contextBlocks: V2ContextBlock[];
  item: V2Item;
  interaction: V2Interaction;
  submission: Record<string, unknown> | null;
  reviewTask: Record<string, unknown> | null;
  modelAnswer: Record<string, unknown> | null;
}

function flattenFullReviewItems(examData: LoadedV2ExamData | null, submissions: Record<string, unknown>[], reviewTasks: Record<string, unknown>[]) {
  if (!examData) return [];
  const submissionsByInteraction = new Map(
    submissions.map((submission) => [firstText(field(submission, 'interactionId'), field(submission, 'interaction_id')), submission]),
  );
  const reviewTasksByInteraction = new Map(
    reviewTasks.map((task) => [firstText(field(task, 'interactionId'), field(task, 'interaction_id')), task]),
  );
  const items: FullReviewItem[] = [];

  examData.sections.forEach((section) => {
    const groups = examData.instructionGroups.get(section.sectionId) || [];
    groups.forEach((group) => {
      const groupItems = examData.items.get(group.instructionGroupId) || [];
      const groupContexts = examData.contextBlocks.get(group.instructionGroupId) || [];
      groupItems.forEach((item) => {
        const interactions = examData.interactions.get(item.itemId) || [];
        const itemContexts = item.contextBlockId
          ? groupContexts.filter((block) => block.contextBlockId === item.contextBlockId)
          : groupContexts;
        interactions.forEach((interaction, index) => {
          const itemNumber = firstText(field(item as unknown as Record<string, unknown>, 'questionNumber'), field(item as unknown as Record<string, unknown>, 'questionLabel')) || String(item.orderIndex + 1);
          const label = interaction.label ? `Q${itemNumber}${interaction.label}` : interactions.length > 1 ? `Q${itemNumber}(${String.fromCharCode(97 + index)})` : `Q${itemNumber}`;
          items.push({
            id: interaction.interactionId,
            label,
            section,
            instructionGroup: group,
            contextBlocks: itemContexts,
            item,
            interaction,
            submission: submissionsByInteraction.get(interaction.interactionId) || null,
            reviewTask: reviewTasksByInteraction.get(interaction.interactionId) || null,
            modelAnswer: (examData.modelAnswers.get(item.itemId) || []).find((answer) => answer.interactionId === interaction.interactionId) as unknown as Record<string, unknown> | undefined || null,
          });
        });
      });
    });
  });

  return items;
}

function getReviewStatus(item: FullReviewItem) {
  const status = firstText(field(item.submission, 'reviewStatus'), field(item.submission, 'review_status'), field(item.reviewTask, 'status'));
  if (!item.submission || field(item.submission, 'isAnswered') === false || status === 'unanswered') return 'unanswered';
  if (status === 'reviewed' || status === 'completed' || status === 'teacherReviewed' || status === 'teacherOverride' || field(item.submission, 'scoredByTeacher') === true) {
    return status === 'teacherOverride' || field(item.submission, 'teacherOverride') === true ? 'teacher-override' : 'teacher-reviewed';
  }
  if (status === 'teacherReview' || item.reviewTask) return 'manual-review';
  const finalScore = asNumber(field(item.submission, 'finalScore')) ?? asNumber(field(item.submission, 'final_score'));
  const maxScore = item.interaction.marks || item.item.marks || 1;
  if (finalScore !== null) return finalScore >= maxScore ? 'auto-correct' : 'auto-incorrect';
  return 'pending';
}

function statusBadgeClass(status: string) {
  if (status === 'manual-review') return 'border-rose-300 bg-rose-50 text-rose-700';
  if (status === 'auto-correct') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (status === 'auto-incorrect') return 'border-red-300 bg-red-50 text-red-700';
  if (status === 'unanswered') return 'border-muted bg-muted text-muted-foreground';
  if (status === 'teacher-override') return 'border-blue-300 bg-blue-50 text-blue-700';
  if (status === 'teacher-reviewed') return 'border-violet-300 bg-violet-50 text-violet-700';
  return 'border-amber-300 bg-amber-50 text-amber-700';
}

function statusText(status: string) {
  if (status === 'manual-review') return 'Manual review required';
  if (status === 'auto-correct') return 'Auto-correct';
  if (status === 'auto-incorrect') return 'Auto-incorrect';
  if (status === 'unanswered') return 'Unanswered';
  if (status === 'teacher-override') return 'Teacher corrected auto score';
  if (status === 'teacher-reviewed') return 'Scored by teacher';
  return 'Pending';
}

function BatchCard({ batch }: { batch: ReviewBatch }) {
  const navigate = useNavigate();
  const progress = batch.totalCount > 0 ? Math.round((batch.reviewedCount / batch.totalCount) * 100) : 0;

  return (
    <article className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">{batch.examTitle}</h3>
            <Badge variant={batch.status === 'completed' ? 'secondary' : 'outline'}>{statusLabel(batch.status)}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{batch.studentName}</span>
            {batch.studentEmail ? (
              <>
                <span>|</span>
                <span>{batch.studentEmail}</span>
              </>
            ) : null}
            <span>|</span>
            <span>{formatDateTime(batch.submittedAt)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm md:min-w-[300px]">
          <div>
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="font-semibold text-foreground">{batch.pendingCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reviewed</p>
            <p className="font-semibold text-foreground">{batch.reviewedCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Marks</p>
            <p className="font-semibold text-foreground">{scoreLabel(batch)}</p>
          </div>
        </div>

        <Button className="gap-2 md:w-auto" onClick={() => navigate(`/dashboard/teacher/reviews/${batch.attemptId}`)}>
          Review full exam
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
      <Progress className="mt-3 h-2" value={progress} />
    </article>
  );
}

export default function V2TeacherReviewPanel({ previewMode = false }: { previewMode?: boolean }) {
  const [tab, setTab] = useState<'pending' | 'reviewed'>('pending');
  const [tasks, setTasks] = useState<V2TeacherReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(false);

  const batches = useMemo(() => groupReviewTasks(tasks), [tasks]);
  const pendingBatches = useMemo(() => batches.filter((batch) => batch.pendingCount > 0), [batches]);
  const reviewedBatches = useMemo(() => batches.filter((batch) => batch.reviewedCount > 0), [batches]);
  const visibleBatches = tab === 'pending' ? pendingBatches : reviewedBatches;

  const loadQueue = async () => {
    if (previewMode) return;
    try {
      setLoading(true);
      setTasks(await loadReviewTasks());
    } catch (error) {
      console.error('[V2TeacherReviewPanel] Failed to load review queue', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load review queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, [previewMode]);

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">V2 teacher review</h2>
          <p className="text-sm text-muted-foreground">Manual marking batches grouped by student exam attempt.</p>
        </div>
        <Button variant="outline" size="icon" onClick={loadQueue} disabled={loading || previewMode}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {previewMode ? (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          Review queue reads require a live teacher session.
        </div>
      ) : loading ? (
        <div className="mt-4 flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(value) => setTab(value as 'pending' | 'reviewed')} className="mt-4">
          <TabsList>
            <TabsTrigger value="pending">Pending {pendingBatches.length}</TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed {reviewedBatches.length}</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {visibleBatches.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                No pending V2 review batches found.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleBatches.map((batch) => <BatchCard key={batch.id} batch={batch} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviewed" className="mt-4">
            {visibleBatches.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                No reviewed V2 batches found.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleBatches.map((batch) => <BatchCard key={batch.id} batch={batch} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}

export function V2TeacherReviewDetail() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [examData, setExamData] = useState<LoadedV2ExamData | null>(null);
  const [attempt, setAttempt] = useState<Record<string, unknown> | null>(null);
  const [student, setStudent] = useState<Record<string, unknown> | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, unknown>[]>([]);
  const [reviewTasks, setReviewTasks] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [reviewPanelOpen, setReviewPanelOpen] = useState<Record<string, boolean>>({});
  const [officialOpen, setOfficialOpen] = useState<Record<string, boolean>>({});
  const [explanationOpen, setExplanationOpen] = useState<Record<string, boolean>>({});
  const [flagOpen, setFlagOpen] = useState<Record<string, boolean>>({});
  const [scores, setScores] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Record<string, {
    issueType: string;
    suggestedAnswer: string;
    suggestedAlternatives: string;
    suggestedExplanation: string;
    suggestedMarkingMode: string;
    teacherComment: string;
  }>>({});

  const loadAttempt = async () => {
    if (!attemptId) return;
    try {
      setLoading(true);
      const review = await getTeacherAttemptReviewFirebase({ attemptId });
      setAttempt(review.attempt);
      setStudent(review.student);
      setSubmissions(review.submissions || []);
      setReviewTasks(review.reviewTasks || []);
      const examId = firstText(field(review.attempt, 'examId'), field(review.attempt, 'exam_id'));
      setExamData(await loadV2ExamDataFirebase(examId));
    } catch (error) {
      console.error('[V2TeacherReviewDetail] Failed to load full review attempt', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load review attempt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAttempt();
  }, [attemptId]);

  const reviewItems = useMemo(() => flattenFullReviewItems(examData, submissions, reviewTasks), [examData, submissions, reviewTasks]);
  const reviewedCount = reviewItems.filter((item) => ['teacher-reviewed', 'teacher-override'].includes(getReviewStatus(item))).length;
  const manualPendingCount = reviewItems.filter((item) => getReviewStatus(item) === 'manual-review').length;
  const progress = reviewItems.length > 0 ? Math.round((reviewedCount / reviewItems.length) * 100) : 0;
  const finalScore = asNumber(field(attempt, 'finalScore')) ?? asNumber(field(attempt, 'final_score')) ?? 0;
  const maxScore = asNumber(field(attempt, 'maxScore')) ?? asNumber(field(attempt, 'max_score')) ?? examData?.exam?.totalMarks ?? 0;
  const examTitle = examData?.exam?.title || asText(field(attempt, 'examTitle'), 'V2 exam attempt');
  const studentName = getStudentDisplayName(student, firstText(field(attempt, 'userId'), field(attempt, 'user_id'), 'Student'));
  const studentEmail = getStudentEmail(student);
  const submittedAt = toIso(field(attempt, 'submittedAt')) || toIso(field(attempt, 'submitted_at'));
  const submissionsMap = useMemo(() => new Map(
    submissions.map((submission) => [firstText(field(submission, 'interactionId'), field(submission, 'interaction_id')), submission]),
  ), [submissions]);
  const reviewItemsByInteraction = useMemo(() => new Map(reviewItems.map((item) => [item.id, item])), [reviewItems]);

  const getSuggestionDraft = (interactionId: string) => suggestions[interactionId] || {
    issueType: 'wrong_or_too_strict_answer_key',
    suggestedAnswer: '',
    suggestedAlternatives: '',
    suggestedExplanation: '',
    suggestedMarkingMode: '',
    teacherComment: '',
  };

  const handleSaveReview = async (item: FullReviewItem) => {
    const existingScore = getTaskScore({ submission: item.submission } as V2TeacherReviewQueueItem);
    const score = Number(scores[item.id] ?? existingScore ?? '');
    const submissionId = asText(field(item.submission, 'id'), asText(field(item.submission, 'submissionId')));
    const comment = comments[item.id] || '';
    const itemMaxScore = item.interaction.marks || item.item.marks || 1;
    if (!submissionId) {
      toast.error('This answer does not have a saved submission record.');
      return;
    }
    if (!Number.isFinite(score)) {
      toast.error('Enter a numeric score before saving.');
      return;
    }
    if (score < 0 || score > itemMaxScore) {
      toast.error(`Score must be between 0 and ${itemMaxScore}.`);
      return;
    }
    if (!comment.trim()) {
      toast.error('Add a teacher comment or reason before saving.');
      return;
    }

    try {
      setSavingKey(item.id);
      await overrideTeacherSubmissionScoreFirebase({
        submissionId,
        score,
        comment,
      });
      toast.success(getReviewStatus(item) === 'manual-review' ? 'Teacher review saved' : 'Teacher score correction saved');
      await loadAttempt();
      setReviewPanelOpen((current) => ({ ...current, [item.id]: false }));
    } catch (error) {
      console.error('[V2TeacherReviewDetail] Failed to save review', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save review');
    } finally {
      setSavingKey(null);
    }
  };

  const handleCreateSuggestion = async (item: FullReviewItem) => {
    const suggestion = getSuggestionDraft(item.id);
    if (!suggestion.teacherComment.trim() && !suggestion.suggestedAnswer.trim() && !suggestion.suggestedExplanation.trim()) {
      toast.error('Add a comment or suggested correction first.');
      return;
    }

    try {
      setSavingKey(item.id);
      await createTeacherAnswerSuggestionFirebase({
        reviewTaskId: asText(field(item.reviewTask, 'id')) || undefined,
        submissionId: asText(field(item.submission, 'id'), asText(field(item.submission, 'submissionId'))) || undefined,
        issueType: suggestion.issueType,
        suggestedAnswer: suggestion.suggestedAnswer,
        suggestedAlternatives: suggestion.suggestedAlternatives.split('\n').map((value) => value.trim()).filter(Boolean),
        suggestedExplanation: suggestion.suggestedExplanation,
        suggestedMarkingMode: suggestion.suggestedMarkingMode,
        teacherComment: suggestion.teacherComment,
      });
      toast.success('Suggestion sent to admins');
      setFlagOpen((current) => ({ ...current, [item.id]: false }));
      setSuggestions((current) => ({ ...current, [item.id]: undefined as never }));
    } catch (error) {
      console.error('[V2TeacherReviewDetail] Failed to send suggestion', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send suggestion');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!examData || reviewItems.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
        <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold text-foreground">Review attempt unavailable</h1>
        <Button className="mt-4" onClick={() => navigate('/dashboard/teacher')}>Back to dashboard</Button>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" className="gap-2" onClick={() => navigate('/dashboard/teacher')}>
        <ArrowLeft className="h-4 w-4" />
        Teacher dashboard
      </Button>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{examTitle}</h1>
            <p className="text-sm text-muted-foreground">
              {studentName}{studentEmail ? ` | ${studentEmail}` : ''} | {formatDateTime(submittedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{asText(field(attempt, 'status'), manualPendingCount > 0 ? 'pending_review' : 'completed')}</Badge>
            <Badge variant="secondary">{reviewedCount} of {reviewItems.length} teacher-reviewed</Badge>
            <Badge variant="outline">{finalScore}/{maxScore} marks</Badge>
          </div>
        </div>
        <Progress className="mt-4 h-2" value={progress} />
      </section>

      <div className="rounded-lg border border-border bg-card p-5">
        {examData.sections.map((section) => (
          <section key={section.sectionId} className="mb-10">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
              {section.marks > 0 ? <span className="text-sm text-gray-600">[{section.marks} marks]</span> : null}
              {section.sharedInstructions ? (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap">
                  {section.sharedInstructions}
                </div>
              ) : null}
            </div>

            {(examData.instructionGroups.get(section.sectionId) || []).map((group) => (
              <div key={group.instructionGroupId} className="mb-8">
                <div className="mb-6 rounded-lg bg-gray-50 p-4">
                  {group.title ? <h3 className="mb-2 font-semibold text-gray-800">{group.title}</h3> : null}
                  {group.questionRangeLabel ? (
                    <span className="mb-2 inline-block rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                      {group.questionRangeLabel}
                    </span>
                  ) : null}
                  <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: group.instructionsMarkdown }} />
                </div>

                {(examData.contextBlocks.get(group.instructionGroupId) || []).map((block) => (
                  <V2ContextBlockRenderer key={block.contextBlockId} block={block} isSimulation={false} />
                ))}

                <div className="space-y-6">
                  {(examData.items.get(group.instructionGroupId) || []).map((item) => {
                    const itemInteractions = examData.interactions.get(item.itemId) || [];
                    return (
                      <article key={item.itemId} className="rounded-lg border border-border bg-background p-4">
                        <V2ItemRenderer
                          item={item}
                          interactions={itemInteractions}
                          mode="practice"
                          isSimulation={false}
                          showFeedback
                          submissions={submissionsMap}
                          readOnly
                        />

                        <div className="mt-4 space-y-3 border-t border-border pt-4">
                          {itemInteractions.map((interaction) => {
                            const reviewItem = reviewItemsByInteraction.get(interaction.interactionId);
                            if (!reviewItem) {
                              console.warn('[V2TeacherReviewDetail] Missing review hydration for interaction', {
                                attemptId,
                                itemId: item.itemId,
                                interactionId: interaction.interactionId,
                                sourceReference: field(item as unknown as Record<string, unknown>, 'sourceReference') || null,
                              });
                              return null;
                            }
                            const itemStatus = getReviewStatus(reviewItem);
                            const itemMaxScore = interaction.marks || item.marks || 1;
                            const score = getTaskScore({ submission: reviewItem.submission } as V2TeacherReviewQueueItem);
                            const officialAnswer = asText(field(reviewItem.modelAnswer, 'approvedAnswer'), 'No model answer recorded');
                            const explanation = firstText(field(reviewItem.modelAnswer, 'teacherNotes'), field(reviewItem.modelAnswer, 'explanation'));
                            const autoFeedback = field(reviewItem.submission, 'autoFeedback') as Record<string, unknown> | undefined;
                            const draft = getSuggestionDraft(reviewItem.id);
                            const isReviewOpen = reviewPanelOpen[reviewItem.id] || itemStatus === 'manual-review';

                            return (
                              <div key={interaction.interactionId} className={cn('rounded-md border p-3', statusBadgeClass(itemStatus))}>
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className={statusBadgeClass(itemStatus)}>{statusText(itemStatus)}</Badge>
                                    <span className="text-sm font-medium text-foreground">{score ?? 0}/{itemMaxScore} marks</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setOfficialOpen((current) => ({ ...current, [reviewItem.id]: !current[reviewItem.id] }))}>
                                      Show official answer
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setExplanationOpen((current) => ({ ...current, [reviewItem.id]: !current[reviewItem.id] }))}>
                                      Show explanation
                                    </Button>
                                    <Button size="sm" onClick={() => setReviewPanelOpen((current) => ({ ...current, [reviewItem.id]: !current[reviewItem.id] }))}>
                                      {itemStatus === 'manual-review' ? 'Review / score' : 'Review answer'}
                                    </Button>
                                  </div>
                                </div>

                                {officialOpen[reviewItem.id] ? (
                                  <div className="mt-3 rounded-md bg-white/70 p-3">
                                    <p className="text-xs uppercase text-muted-foreground">Official answer</p>
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{officialAnswer}</p>
                                  </div>
                                ) : null}

                                {explanationOpen[reviewItem.id] ? (
                                  <div className="mt-3 rounded-md bg-white/70 p-3">
                                    <p className="text-xs uppercase text-muted-foreground">Explanation</p>
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{explanation || 'No explanation recorded.'}</p>
                                    {autoFeedback ? (
                                      <p className="mt-2 text-xs text-muted-foreground">
                                        Auto feedback: {asText(field(autoFeedback, 'markingModeUsed'), 'auto-marked')} | {field(autoFeedback, 'isCorrect') === true ? 'Correct' : 'Not fully correct'}
                                      </p>
                                    ) : null}
                                  </div>
                                ) : null}

                                {isReviewOpen ? (
                                  <div className="mt-3 grid gap-3 rounded-md border border-border bg-background p-3 md:grid-cols-[140px_1fr_auto] md:items-end">
                                    <div>
                                      <label className="text-xs font-medium text-muted-foreground" htmlFor={`score-${reviewItem.id}`}>
                                        {itemStatus === 'manual-review' ? 'Score' : 'Correct score / override'} / {itemMaxScore}
                                      </label>
                                      <Input
                                        id={`score-${reviewItem.id}`}
                                        type="number"
                                        min="0"
                                        max={itemMaxScore}
                                        value={scores[reviewItem.id] ?? String(score ?? '')}
                                        onChange={(event) => setScores((current) => ({ ...current, [reviewItem.id]: event.target.value }))}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-muted-foreground" htmlFor={`comment-${reviewItem.id}`}>
                                        {itemStatus === 'manual-review' ? 'Teacher comment' : 'Teacher comment / correction reason'}
                                      </label>
                                      <Textarea
                                        id={`comment-${reviewItem.id}`}
                                        value={comments[reviewItem.id] || ''}
                                        onChange={(event) => setComments((current) => ({ ...current, [reviewItem.id]: event.target.value }))}
                                      />
                                    </div>
                                    <Button onClick={() => handleSaveReview(reviewItem)} disabled={savingKey === reviewItem.id} className="gap-2">
                                      <Save className="h-4 w-4" />
                                      {itemStatus === 'manual-review' ? 'Save review' : 'Save comment / score'}
                                    </Button>

                                    <div className="md:col-span-3">
                                      <Button variant="outline" size="sm" className="gap-2" onClick={() => setFlagOpen((current) => ({ ...current, [reviewItem.id]: !current[reviewItem.id] }))}>
                                        <Flag className="h-4 w-4" />
                                        Flag answer key
                                      </Button>
                                    </div>

                                    {flagOpen[reviewItem.id] ? (
                                      <div className="grid gap-3 md:col-span-3 md:grid-cols-2">
                                        <select
                                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                          value={draft.issueType}
                                          onChange={(event) => setSuggestions((current) => ({ ...current, [reviewItem.id]: { ...draft, issueType: event.target.value } }))}
                                        >
                                          <option value="wrong_or_too_strict_answer_key">Wrong or too strict answer key</option>
                                          <option value="missing_alternative_answer">Missing alternative answer</option>
                                          <option value="weak_explanation">Weak explanation</option>
                                          <option value="marking_mode_should_change">Marking mode should change</option>
                                          <option value="needs_manual_review_instead_of_auto_mark">Needs manual review</option>
                                          <option value="question_wording_issue">Question wording issue</option>
                                          <option value="typo_or_media_issue">Typo or media issue</option>
                                        </select>
                                        <Input placeholder="Suggested marking mode" value={draft.suggestedMarkingMode} onChange={(event) => setSuggestions((current) => ({ ...current, [reviewItem.id]: { ...draft, suggestedMarkingMode: event.target.value } }))} />
                                        <Textarea placeholder="Suggested answer" value={draft.suggestedAnswer} onChange={(event) => setSuggestions((current) => ({ ...current, [reviewItem.id]: { ...draft, suggestedAnswer: event.target.value } }))} />
                                        <Textarea placeholder="Suggested alternatives, one per line" value={draft.suggestedAlternatives} onChange={(event) => setSuggestions((current) => ({ ...current, [reviewItem.id]: { ...draft, suggestedAlternatives: event.target.value } }))} />
                                        <Textarea placeholder="Suggested explanation" value={draft.suggestedExplanation} onChange={(event) => setSuggestions((current) => ({ ...current, [reviewItem.id]: { ...draft, suggestedExplanation: event.target.value } }))} />
                                        <Textarea placeholder="Why should admins review this?" value={draft.teacherComment} onChange={(event) => setSuggestions((current) => ({ ...current, [reviewItem.id]: { ...draft, teacherComment: event.target.value } }))} />
                                        <div className="md:col-span-2">
                                          <Button size="sm" className="gap-2" onClick={() => handleCreateSuggestion(reviewItem)} disabled={savingKey === reviewItem.id}>
                                            <MessageSquareText className="h-4 w-4" />
                                            Send suggestion
                                          </Button>
                                        </div>
                                      </div>
                                    ) : null}
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
    </div>
  );
}
