import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Flag, Loader2, MessageSquareText, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  createTeacherAnswerSuggestionFirebase,
  listTeacherReviewQueueFirebase,
  submitTeacherReviewFirebase,
  type V2TeacherReviewQueueItem,
} from '@/integrations/firebase/v2-review';

function asText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function field(record: Record<string, unknown> | null | undefined, key: string) {
  return record ? record[key] : undefined;
}

function formatStudentAnswer(task: V2TeacherReviewQueueItem) {
  const payload = task.submission?.responsePayload as Record<string, unknown> | undefined;
  if (!payload) return 'No answer submitted';
  if (typeof payload.textAnswer === 'string') return payload.textAnswer;
  if (payload.textAnswer && typeof payload.textAnswer === 'object') {
    return Object.entries(payload.textAnswer as Record<string, unknown>)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join('\n');
  }
  if (Array.isArray(payload.selectedOptions)) return payload.selectedOptions.join(', ');
  return 'Answer saved in a structured format.';
}

export default function V2TeacherReviewPanel({ previewMode = false }: { previewMode?: boolean }) {
  const [status, setStatus] = useState<'pending' | 'completed'>('pending');
  const [tasks, setTasks] = useState<V2TeacherReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [flagOpen, setFlagOpen] = useState<Record<string, boolean>>({});
  const [suggestions, setSuggestions] = useState<Record<string, {
    issueType: string;
    suggestedAnswer: string;
    suggestedAlternatives: string;
    suggestedExplanation: string;
    suggestedMarkingMode: string;
    teacherComment: string;
  }>>({});

  const loadQueue = async () => {
    if (previewMode) return;
    try {
      setLoading(true);
      const response = await listTeacherReviewQueueFirebase({ status, limit: 25 });
      setTasks(response.tasks || []);
    } catch (error) {
      console.error('[V2TeacherReviewPanel] Failed to load review queue', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load review queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, [status, previewMode]);

  const counts = useMemo(() => ({
    pending: tasks.filter((task) => task.status !== 'completed').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
  }), [tasks]);

  const handleSaveReview = async (task: V2TeacherReviewQueueItem) => {
    const score = Number(scores[task.id]);
    if (!Number.isFinite(score)) {
      toast.error('Enter a numeric score before saving.');
      return;
    }

    try {
      setSavingTaskId(task.id);
      await submitTeacherReviewFirebase({
        reviewTaskId: task.id,
        score,
        comments: comments[task.id] || '',
      });
      toast.success('Teacher review saved');
      await loadQueue();
    } catch (error) {
      console.error('[V2TeacherReviewPanel] Failed to save review', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save review');
    } finally {
      setSavingTaskId(null);
    }
  };

  const handleCreateSuggestion = async (task: V2TeacherReviewQueueItem) => {
    const draft = suggestions[task.id] || {
      issueType: 'wrong_or_too_strict_answer_key',
      suggestedAnswer: '',
      suggestedAlternatives: '',
      suggestedExplanation: '',
      suggestedMarkingMode: '',
      teacherComment: '',
    };

    if (!draft.teacherComment.trim() && !draft.suggestedAnswer.trim() && !draft.suggestedExplanation.trim()) {
      toast.error('Add a comment or suggested correction first.');
      return;
    }

    try {
      setSavingTaskId(task.id);
      await createTeacherAnswerSuggestionFirebase({
        reviewTaskId: task.id,
        issueType: draft.issueType,
        suggestedAnswer: draft.suggestedAnswer,
        suggestedAlternatives: draft.suggestedAlternatives.split('\n').map((value) => value.trim()).filter(Boolean),
        suggestedExplanation: draft.suggestedExplanation,
        suggestedMarkingMode: draft.suggestedMarkingMode,
        teacherComment: draft.teacherComment,
      });
      toast.success('Suggestion sent to admins');
      setFlagOpen((current) => ({ ...current, [task.id]: false }));
    } catch (error) {
      console.error('[V2TeacherReviewPanel] Failed to send suggestion', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send suggestion');
    } finally {
      setSavingTaskId(null);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">V2 teacher review</h2>
          <p className="text-sm text-muted-foreground">
            Score manual-review answers and flag answer keys that need admin attention.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={status === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('pending')}>
            Pending
          </Button>
          <Button variant={status === 'completed' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('completed')}>
            Reviewed
          </Button>
          <Button variant="outline" size="icon" onClick={loadQueue} disabled={loading || previewMode}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {previewMode ? (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          Review queue reads require a live teacher session.
        </div>
      ) : loading ? (
        <div className="mt-4 flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          No {status === 'pending' ? 'pending' : 'reviewed'} V2 submissions found.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{counts.pending} pending in view</Badge>
            <Badge variant="outline">{counts.completed} reviewed in view</Badge>
          </div>
          {tasks.map((task) => {
            const examTitle = asText(field(task.exam, 'title'), task.examId);
            const studentName = asText(field(task.student, 'displayName'), asText(field(task.student, 'name'), task.userId));
            const questionText = asText(
              field(task.interaction, 'promptMarkdown'),
              asText(field(task.interaction, 'promptText'), asText(field(task.item, 'stemMarkdown'), 'Question')),
            );
            const officialAnswer = asText(field(task.modelAnswer, 'approvedAnswer'), asText(field(task.markingRule, 'exactAnswer'), 'No model answer recorded'));
            const explanation = asText(field(task.modelAnswer, 'explanation'));
            const markingMode = asText(field(task.markingRule, 'markingMode'), 'manualReviewRequired');
            const draft = suggestions[task.id] || {
              issueType: 'wrong_or_too_strict_answer_key',
              suggestedAnswer: '',
              suggestedAlternatives: '',
              suggestedExplanation: '',
              suggestedMarkingMode: '',
              teacherComment: '',
            };

            return (
              <article key={task.id} className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{examTitle}</h3>
                    <p className="text-sm text-muted-foreground">{studentName}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{task.status}</Badge>
                    <Badge variant="secondary">{markingMode}</Badge>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Question</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{questionText}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 p-3">
                      <p className="text-xs uppercase text-muted-foreground">Student answer</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{formatStudentAnswer(task)}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Official answer</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{officialAnswer}</p>
                    </div>
                    {explanation ? (
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Explanation</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{explanation}</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                {task.status !== 'completed' ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-[140px_1fr_auto] md:items-end">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground" htmlFor={`score-${task.id}`}>Score</label>
                      <Input
                        id={`score-${task.id}`}
                        type="number"
                        min="0"
                        value={scores[task.id] || ''}
                        onChange={(event) => setScores((current) => ({ ...current, [task.id]: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground" htmlFor={`comment-${task.id}`}>Teacher comment</label>
                      <Textarea
                        id={`comment-${task.id}`}
                        value={comments[task.id] || ''}
                        onChange={(event) => setComments((current) => ({ ...current, [task.id]: event.target.value }))}
                      />
                    </div>
                    <Button onClick={() => handleSaveReview(task)} disabled={savingTaskId === task.id} className="gap-2">
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                  </div>
                ) : null}

                <div className="mt-4 border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setFlagOpen((current) => ({ ...current, [task.id]: !current[task.id] }))}
                  >
                    <Flag className="h-4 w-4" />
                    Flag answer key
                  </Button>

                  {flagOpen[task.id] ? (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={draft.issueType}
                        onChange={(event) => setSuggestions((current) => ({
                          ...current,
                          [task.id]: { ...draft, issueType: event.target.value },
                        }))}
                      >
                        <option value="wrong_or_too_strict_answer_key">Wrong or too strict answer key</option>
                        <option value="missing_alternative_answer">Missing alternative answer</option>
                        <option value="weak_explanation">Weak explanation</option>
                        <option value="marking_mode_should_change">Marking mode should change</option>
                        <option value="needs_manual_review_instead_of_auto_mark">Needs manual review</option>
                        <option value="question_wording_issue">Question wording issue</option>
                        <option value="typo_or_media_issue">Typo or media issue</option>
                      </select>
                      <Input
                        placeholder="Suggested marking mode"
                        value={draft.suggestedMarkingMode}
                        onChange={(event) => setSuggestions((current) => ({
                          ...current,
                          [task.id]: { ...draft, suggestedMarkingMode: event.target.value },
                        }))}
                      />
                      <Textarea
                        placeholder="Suggested answer"
                        value={draft.suggestedAnswer}
                        onChange={(event) => setSuggestions((current) => ({
                          ...current,
                          [task.id]: { ...draft, suggestedAnswer: event.target.value },
                        }))}
                      />
                      <Textarea
                        placeholder="Suggested alternatives, one per line"
                        value={draft.suggestedAlternatives}
                        onChange={(event) => setSuggestions((current) => ({
                          ...current,
                          [task.id]: { ...draft, suggestedAlternatives: event.target.value },
                        }))}
                      />
                      <Textarea
                        placeholder="Suggested explanation"
                        value={draft.suggestedExplanation}
                        onChange={(event) => setSuggestions((current) => ({
                          ...current,
                          [task.id]: { ...draft, suggestedExplanation: event.target.value },
                        }))}
                      />
                      <Textarea
                        placeholder="Why should admins review this?"
                        value={draft.teacherComment}
                        onChange={(event) => setSuggestions((current) => ({
                          ...current,
                          [task.id]: { ...draft, teacherComment: event.target.value },
                        }))}
                      />
                      <div className="md:col-span-2">
                        <Button size="sm" className="gap-2" onClick={() => handleCreateSuggestion(task)} disabled={savingTaskId === task.id}>
                          <MessageSquareText className="h-4 w-4" />
                          Send suggestion
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
