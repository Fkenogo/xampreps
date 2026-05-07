import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  listTeacherReviewActionsFirebase,
  type V2TeacherReviewActionItem,
} from '@/integrations/firebase/v2-review';

function asText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function formatTimestamp(value: unknown) {
  if (!value) return 'Date unavailable';
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const seconds = typeof record.seconds === 'number' ? record.seconds : typeof record._seconds === 'number' ? record._seconds : null;
    if (seconds) return new Date(seconds * 1000).toLocaleString();
  }
  if (typeof value === 'string') return new Date(value).toLocaleString();
  return 'Date unavailable';
}

function actionLabel(actionType: string) {
  return actionType.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
}

export default function V2TeacherReviewActionsPanel() {
  const navigate = useNavigate();
  const [actions, setActions] = useState<V2TeacherReviewActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [technicalOpen, setTechnicalOpen] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState({
    teacherId: '',
    studentId: '',
    examId: '',
    actionType: '',
  });

  const loadActions = async () => {
    try {
      setLoading(true);
      const response = await listTeacherReviewActionsFirebase({
        teacherId: filters.teacherId || undefined,
        studentId: filters.studentId || undefined,
        examId: filters.examId || undefined,
        actionType: filters.actionType || undefined,
        limit: 100,
      });
      setActions(response.actions || []);
    } catch (error) {
      console.error('[V2TeacherReviewActionsPanel] Failed to load teacher actions', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load teacher activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadActions();
  }, []);

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Teacher review activity</h2>
            <p className="text-sm text-muted-foreground">Score corrections, manual reviews, comments, and answer-key flags.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={loadActions} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <Input placeholder="Teacher ID" value={filters.teacherId} onChange={(event) => setFilters((current) => ({ ...current, teacherId: event.target.value }))} />
          <Input placeholder="Student ID" value={filters.studentId} onChange={(event) => setFilters((current) => ({ ...current, studentId: event.target.value }))} />
          <Input placeholder="Exam ID" value={filters.examId} onChange={(event) => setFilters((current) => ({ ...current, examId: event.target.value }))} />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filters.actionType}
            onChange={(event) => setFilters((current) => ({ ...current, actionType: event.target.value }))}
          >
            <option value="">All actions</option>
            <option value="scoreOverride">Score override</option>
            <option value="manualScore">Manual score</option>
            <option value="teacherComment">Teacher comment</option>
            <option value="answerKeyFlag">Answer-key flag</option>
            <option value="suggestedCorrection">Suggested correction</option>
          </select>
        </div>
        <Button className="mt-3" size="sm" onClick={loadActions} disabled={loading}>Apply filters</Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : actions.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">No teacher review actions found.</div>
      ) : (
        <div className="divide-y divide-border">
          {actions.map((action) => (
            <article key={action.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_180px_220px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium capitalize text-primary">
                    {actionLabel(action.actionType)}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {asText(action.exam?.title, asText(action.examId, 'Exam unavailable'))}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Teacher: {asText(action.teacherName, asText(action.teacherId, 'Unknown'))} | Student: {asText(action.studentName, asText(action.studentId, 'Unknown'))}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Question: {asText(action.questionLabel, asText(action.sourceReference, asText(action.interactionId, 'Unknown question')))}
                </p>
                {action.comment ? <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{action.comment}</p> : null}
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  <div className="rounded-md bg-muted/40 p-2">
                    <p className="text-xs uppercase text-muted-foreground">Student answer</p>
                    <p className="mt-1 whitespace-pre-wrap text-foreground">{action.studentAnswer || 'No answer recorded'}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <p className="text-xs uppercase text-muted-foreground">Official answer</p>
                    <p className="mt-1 whitespace-pre-wrap text-foreground">{action.officialAnswer || 'No official answer recorded'}</p>
                  </div>
                </div>
                {action.suggestedAnswer || action.suggestedExplanation || action.suggestedMarkingMode ? (
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
                    {action.suggestedAnswer ? <p><span className="font-medium">Suggested answer:</span> {action.suggestedAnswer}</p> : null}
                    {action.suggestedExplanation ? <p className="mt-1"><span className="font-medium">Suggested explanation:</span> {action.suggestedExplanation}</p> : null}
                    {action.suggestedMarkingMode ? <p className="mt-1"><span className="font-medium">Suggested mode:</span> {action.suggestedMarkingMode}</p> : null}
                  </div>
                ) : null}
              </div>
              <div className="text-sm">
                <p className="text-xs uppercase text-muted-foreground">Score change</p>
                <p className="font-medium text-foreground">{action.previousScore ?? '-'} to {action.newScore ?? '-'}</p>
                <p className="mt-1 text-xs text-muted-foreground">{action.previousReviewStatus || '-'} to {action.newReviewStatus || '-'}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>{formatTimestamp(action.createdAt)}</p>
                {action.status ? <p>Status: {action.status}</p> : null}
                {action.examId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-2"
                    onClick={() => navigate(`/dashboard/admin/v2-exams/${action.examId}/edit`)}
                  >
                    <Eye className="h-4 w-4" />
                    Open context
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 px-0 text-xs"
                  onClick={() => setTechnicalOpen((current) => ({ ...current, [action.id]: !current[action.id] }))}
                >
                  View technical details
                </Button>
                {technicalOpen[action.id] ? (
                  <div className="mt-2 rounded-md bg-muted/40 p-2 text-xs">
                    <p>Attempt: {action.attemptId || '-'}</p>
                    <p>Submission: {action.submissionId || '-'}</p>
                    <p>Item: {action.itemId || '-'}</p>
                    <p>Interaction: {action.interactionId || '-'}</p>
                    <p>Suggestion: {action.suggestionId || '-'}</p>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
