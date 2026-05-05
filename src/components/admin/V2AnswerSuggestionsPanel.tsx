import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Loader2, RefreshCw, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  adminResolveAnswerSuggestionFirebase,
  listAdminAnswerSuggestionsFirebase,
  type V2AnswerSuggestionItem,
} from '@/integrations/firebase/v2-review';

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function field(record: Record<string, unknown> | null | undefined, key: string) {
  return record ? record[key] : undefined;
}

export default function V2AnswerSuggestionsPanel() {
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<V2AnswerSuggestionItem[]>([]);
  const [edits, setEdits] = useState<Record<string, {
    approvedAnswer: string;
    acceptableAlternatives: string;
    explanation: string;
    markingMode: string;
    adminComment: string;
  }>>({});

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const response = await listAdminAnswerSuggestionsFirebase({ status, limit: 50 });
      setSuggestions(response.suggestions || []);
      const nextEdits: typeof edits = {};
      response.suggestions?.forEach((suggestion) => {
        nextEdits[suggestion.id] = {
          approvedAnswer: suggestion.suggestedAnswer || suggestion.currentAnswer || '',
          acceptableAlternatives: (suggestion.suggestedAlternatives || suggestion.currentAlternatives || []).join('\n'),
          explanation: suggestion.suggestedExplanation || suggestion.currentExplanation || '',
          markingMode: suggestion.suggestedMarkingMode || suggestion.currentMarkingMode || '',
          adminComment: suggestion.adminComment || '',
        };
      });
      setEdits(nextEdits);
    } catch (error) {
      console.error('[V2AnswerSuggestionsPanel] Failed to load suggestions', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load teacher suggestions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSuggestions();
  }, [status]);

  const resolveSuggestion = async (
    suggestion: V2AnswerSuggestionItem,
    resolutionStatus: 'accepted' | 'rejected' | 'needs_discussion',
  ) => {
    const edit = edits[suggestion.id] || {
      approvedAnswer: '',
      acceptableAlternatives: '',
      explanation: '',
      markingMode: '',
      adminComment: '',
    };

    try {
      setSavingId(suggestion.id);
      await adminResolveAnswerSuggestionFirebase({
        suggestionId: suggestion.id,
        resolutionStatus,
        adminComment: edit.adminComment,
        approvedAnswer: edit.approvedAnswer,
        acceptableAlternatives: edit.acceptableAlternatives.split('\n').map((value) => value.trim()).filter(Boolean),
        explanation: edit.explanation,
        markingMode: edit.markingMode,
        changeReason: edit.adminComment || `Admin ${resolutionStatus} teacher suggestion`,
      });
      toast.success(resolutionStatus === 'accepted' ? 'Suggestion accepted and versioned' : 'Suggestion updated');
      await loadSuggestions();
    } catch (error) {
      console.error('[V2AnswerSuggestionsPanel] Failed to resolve suggestion', error);
      toast.error(error instanceof Error ? error.message : 'Failed to resolve suggestion');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Content Feedback / Teacher Suggestions</h3>
          <p className="text-xs text-muted-foreground">
            Review teacher-reported answer key, explanation, wording, and marking issues.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={status === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('pending')}>
            Pending
          </Button>
          <Button variant={status === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('all')}>
            All
          </Button>
          <Button variant="outline" size="icon" onClick={loadSuggestions} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          No teacher suggestions found for this filter.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {suggestions.map((suggestion) => {
            const edit = edits[suggestion.id] || {
              approvedAnswer: '',
              acceptableAlternatives: '',
              explanation: '',
              markingMode: '',
              adminComment: '',
            };
            const examTitle = text(field(suggestion.exam, 'title'), suggestion.examId);
            const question = text(
              suggestion.currentQuestionText,
              text(field(suggestion.interaction, 'promptMarkdown'), text(field(suggestion.item, 'stemMarkdown'), 'Question')),
            );

            return (
              <article key={suggestion.id} className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground">{examTitle}</h4>
                    <p className="text-sm text-muted-foreground">{suggestion.teacherName} reported {suggestion.issueType.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{suggestion.status}</Badge>
                    {suggestion.currentMarkingMode ? <Badge variant="secondary">{suggestion.currentMarkingMode}</Badge> : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Question</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{question}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Current answer</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{suggestion.currentAnswer || 'No current answer recorded'}</p>
                    </div>
                    {suggestion.teacherComment ? (
                      <div className="rounded-md bg-muted/40 p-3">
                        <p className="text-xs uppercase text-muted-foreground">Teacher comment</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{suggestion.teacherComment}</p>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-3">
                    <Input
                      placeholder="Approved answer"
                      value={edit.approvedAnswer}
                      onChange={(event) => setEdits((current) => ({
                        ...current,
                        [suggestion.id]: { ...edit, approvedAnswer: event.target.value },
                      }))}
                    />
                    <Textarea
                      placeholder="Accepted alternatives, one per line"
                      value={edit.acceptableAlternatives}
                      onChange={(event) => setEdits((current) => ({
                        ...current,
                        [suggestion.id]: { ...edit, acceptableAlternatives: event.target.value },
                      }))}
                    />
                    <Textarea
                      placeholder="Explanation / teacher guidance"
                      value={edit.explanation}
                      onChange={(event) => setEdits((current) => ({
                        ...current,
                        [suggestion.id]: { ...edit, explanation: event.target.value },
                      }))}
                    />
                    <Input
                      placeholder="Marking mode"
                      value={edit.markingMode}
                      onChange={(event) => setEdits((current) => ({
                        ...current,
                        [suggestion.id]: { ...edit, markingMode: event.target.value },
                      }))}
                    />
                    <Textarea
                      placeholder="Admin comment or rejection reason"
                      value={edit.adminComment}
                      onChange={(event) => setEdits((current) => ({
                        ...current,
                        [suggestion.id]: { ...edit, adminComment: event.target.value },
                      }))}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => resolveSuggestion(suggestion, 'accepted')}
                    disabled={savingId === suggestion.id || suggestion.status !== 'pending'}
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveSuggestion(suggestion, 'needs_discussion')}
                    disabled={savingId === suggestion.id || suggestion.status !== 'pending'}
                  >
                    Needs discussion
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-2"
                    onClick={() => resolveSuggestion(suggestion, 'rejected')}
                    disabled={savingId === suggestion.id || suggestion.status !== 'pending'}
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
