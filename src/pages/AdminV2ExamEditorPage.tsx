import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { V2ContextBlockRenderer } from '@/components/exam/v2/V2ContextBlockRenderer';
import { V2ItemRenderer } from '@/components/exam/v2/V2ItemRenderer';
import { loadV2ExamDataFirebase, type LoadedV2ExamData } from '@/integrations/firebase/content';
import {
  adminResolveAnswerSuggestionFirebase,
  adminUpdateV2ExamContentFirebase,
  listAdminAnswerSuggestionsFirebase,
  listTeacherReviewActionsFirebase,
  type V2AnswerSuggestionItem,
  type V2TeacherReviewActionItem,
} from '@/integrations/firebase/v2-review';
import type { V2Interaction, V2Item, V2MarkingRule, V2ModelAnswerVersion } from '@/types/v2';

interface EditTarget {
  item: V2Item;
  interaction: V2Interaction;
  rule: V2MarkingRule | null;
  modelAnswer: V2ModelAnswerVersion | null;
}

function asText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
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

function actionLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
}

function findModelAnswer(data: LoadedV2ExamData, itemId: string, interactionId: string) {
  return (data.modelAnswers.get(itemId) || []).find((answer) => answer.interactionId === interactionId) || null;
}

export default function AdminV2ExamEditorPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [examData, setExamData] = useState<LoadedV2ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolvingSuggestionId, setResolvingSuggestionId] = useState<string | null>(null);
  const [teacherActions, setTeacherActions] = useState<V2TeacherReviewActionItem[]>([]);
  const [answerSuggestions, setAnswerSuggestions] = useState<V2AnswerSuggestionItem[]>([]);
  const [target, setTarget] = useState<EditTarget | null>(null);
  const [draft, setDraft] = useState({
    questionStem: '',
    itemMarks: '',
    interactionPromptMarkdown: '',
    interactionMarks: '',
    markingMode: 'exactMatch',
    exactAnswer: '',
    alternativeAnswers: '',
    allowFullSentenceContainingAnswer: false,
    approvedAnswer: '',
    explanation: '',
    teacherNotes: '',
    changeReason: '',
  });

  const loadExam = async () => {
    if (!examId) return;
    try {
      setLoading(true);
      const data = await loadV2ExamDataFirebase(examId);
      setExamData(data);
    } catch (error) {
      console.error('[AdminV2ExamEditorPage] Failed to load V2 exam', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load V2 exam');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadExam();
  }, [examId]);

  const loadRelatedFeedback = async () => {
    if (!examId) return;
    try {
      const [actionsResult, suggestionsResult] = await Promise.all([
        listTeacherReviewActionsFirebase({ examId, limit: 200 }),
        listAdminAnswerSuggestionsFirebase({ examId, status: 'all', limit: 200 }),
      ]);
      setTeacherActions(actionsResult.actions || []);
      setAnswerSuggestions(suggestionsResult.suggestions || []);
    } catch (error) {
      console.error('[AdminV2ExamEditorPage] Failed to load related teacher feedback', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load teacher feedback');
    }
  };

  useEffect(() => {
    void loadRelatedFeedback();
  }, [examId]);

  const selectTarget = (item: V2Item, interaction: V2Interaction) => {
    if (!examData) return;
    const rule = interaction.markingRuleId ? examData.markingRules.get(interaction.markingRuleId) || null : null;
    const modelAnswer = findModelAnswer(examData, item.itemId, interaction.interactionId);
    const itemRecord = item as unknown as Record<string, unknown>;
    setTarget({ item, interaction, rule, modelAnswer });
    setDraft({
      questionStem: asText(itemRecord.stemMarkdown, asText(item.promptMarkdown)),
      itemMarks: String(item.marks ?? ''),
      interactionPromptMarkdown: asText(interaction.promptMarkdown),
      interactionMarks: String(interaction.marks ?? ''),
      markingMode: rule?.markingMode || 'exactMatch',
      exactAnswer: rule?.exactAnswer || modelAnswer?.approvedAnswer || '',
      alternativeAnswers: (rule?.alternativeAnswers || modelAnswer?.acceptableAlternatives || []).join('\n'),
      allowFullSentenceContainingAnswer: Boolean(rule?.allowFullSentenceContainingAnswer),
      approvedAnswer: modelAnswer?.approvedAnswer || rule?.exactAnswer || '',
      explanation: modelAnswer?.explanation || '',
      teacherNotes: modelAnswer?.teacherNotes || '',
      changeReason: '',
    });
  };

  const selectedSubmissions = useMemo(() => new Map(), []);
  const relatedActions = useMemo(
    () => target ? teacherActions.filter((action) => action.interactionId === target.interaction.interactionId || action.itemId === target.item.itemId) : [],
    [target, teacherActions],
  );
  const relatedSuggestions = useMemo(
    () => target ? answerSuggestions.filter((suggestion) => suggestion.interactionId === target.interaction.interactionId || suggestion.itemId === target.item.itemId) : [],
    [target, answerSuggestions],
  );
  const showInteractionPrompt = Boolean(
    target &&
    draft.interactionPromptMarkdown.trim() &&
    draft.interactionPromptMarkdown.trim() !== draft.questionStem.trim()
  );

  const saveEdit = async () => {
    if (!examId || !target) return;
    const itemMarks = Number(draft.itemMarks);
    const interactionMarks = Number(draft.interactionMarks);
    if (!draft.changeReason.trim()) {
      toast.error('Add a change reason before saving.');
      return;
    }
    if (!Number.isFinite(itemMarks) || !Number.isFinite(interactionMarks)) {
      toast.error('Marks must be numeric.');
      return;
    }

    try {
      setSaving(true);
      await adminUpdateV2ExamContentFirebase({
        examId,
        itemId: target.item.itemId,
        interactionId: target.interaction.interactionId,
        markingRuleId: target.rule?.markingRuleId || target.interaction.markingRuleId || null,
        itemUpdates: {
          promptMarkdown: draft.questionStem,
          stemMarkdown: draft.questionStem,
          marks: itemMarks,
        },
        interactionUpdates: {
          promptMarkdown: showInteractionPrompt ? draft.interactionPromptMarkdown : '',
          marks: interactionMarks,
        },
        markingRuleUpdates: {
          markingMode: draft.markingMode,
          exactAnswer: draft.exactAnswer,
          alternativeAnswers: draft.alternativeAnswers.split('\n').map((value) => value.trim()).filter(Boolean),
          allowFullSentenceContainingAnswer: draft.allowFullSentenceContainingAnswer,
        },
        modelAnswerUpdates: {
          approvedAnswer: draft.approvedAnswer,
          acceptableAlternatives: draft.alternativeAnswers.split('\n').map((value) => value.trim()).filter(Boolean),
          explanation: draft.explanation,
          teacherNotes: draft.teacherNotes,
        },
        changeReason: draft.changeReason,
      });
      toast.success('V2 exam content saved');
      await loadExam();
    } catch (error) {
      console.error('[AdminV2ExamEditorPage] Failed to save V2 edit', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save V2 edit');
    } finally {
      setSaving(false);
    }
  };

  const resolveSuggestion = async (suggestion: V2AnswerSuggestionItem, resolutionStatus: 'accepted' | 'rejected') => {
    try {
      setResolvingSuggestionId(suggestion.id);
      await adminResolveAnswerSuggestionFirebase({
        suggestionId: suggestion.id,
        resolutionStatus,
        adminComment: `${resolutionStatus} from V2 exam editor`,
        approvedAnswer: suggestion.suggestedAnswer || suggestion.currentAnswer || '',
        acceptableAlternatives: suggestion.suggestedAlternatives || suggestion.currentAlternatives || [],
        explanation: suggestion.suggestedExplanation || suggestion.currentExplanation || '',
        markingMode: suggestion.suggestedMarkingMode || suggestion.currentMarkingMode || '',
        changeReason: `${resolutionStatus} teacher suggestion from V2 exam editor`,
      });
      toast.success(resolutionStatus === 'accepted' ? 'Suggestion accepted' : 'Suggestion rejected');
      await Promise.all([loadExam(), loadRelatedFeedback()]);
    } catch (error) {
      console.error('[AdminV2ExamEditorPage] Failed to resolve suggestion', error);
      toast.error(error instanceof Error ? error.message : 'Failed to resolve suggestion');
    } finally {
      setResolvingSuggestionId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-4">
        <Button variant="ghost" className="gap-2" onClick={() => navigate('/dashboard/admin')}>
          <ArrowLeft className="h-4 w-4" />
          Admin dashboard
        </Button>

        {loading ? (
          <div className="flex h-80 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : !examData?.exam ? (
          <section className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
            V2 exam unavailable.
          </section>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-5">
              <section className="rounded-lg border border-border bg-card p-5">
                <h1 className="text-2xl font-semibold text-foreground">{examData.exam.title}</h1>
                <p className="text-sm text-muted-foreground">{examData.exam.subject} | {examData.exam.level} | {examData.exam.year}</p>
              </section>

              <div className="rounded-lg border border-border bg-card p-5">
                {examData.sections.map((section) => (
                  <section key={section.sectionId} className="mb-10">
                    <h2 className="mb-3 text-xl font-bold text-foreground">{section.title}</h2>
                    {section.sharedInstructions ? (
                      <div className="mb-4 rounded-md bg-muted/30 p-3 text-sm whitespace-pre-wrap">{section.sharedInstructions}</div>
                    ) : null}

                    {(examData.instructionGroups.get(section.sectionId) || []).map((group) => (
                      <div key={group.instructionGroupId} className="mb-8">
                        <div className="mb-4 rounded-lg bg-muted/40 p-4">
                          {group.title ? <h3 className="font-semibold text-foreground">{group.title}</h3> : null}
                          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: group.instructionsMarkdown }} />
                        </div>

                        {(examData.contextBlocks.get(group.instructionGroupId) || []).map((block) => (
                          <V2ContextBlockRenderer key={block.contextBlockId} block={block} isSimulation={false} />
                        ))}

                        <div className="space-y-5">
                          {(examData.items.get(group.instructionGroupId) || []).map((item) => {
                            const interactions = examData.interactions.get(item.itemId) || [];
                            return (
                              <article key={item.itemId} className="rounded-lg border border-border bg-background p-4">
                                <V2ItemRenderer
                                  item={item}
                                  interactions={interactions}
                                  mode="practice"
                                  isSimulation={false}
                                  submissions={selectedSubmissions}
                                  readOnly
                                />
                                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                                  {interactions.map((interaction) => (
                                    <Button
                                      key={interaction.interactionId}
                                      variant={target?.interaction.interactionId === interaction.interactionId ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => selectTarget(item, interaction)}
                                    >
                                      Edit {interaction.label || interaction.interactionId}
                                    </Button>
                                  ))}
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

            <aside className="h-fit rounded-lg border border-border bg-card p-4 xl:sticky xl:top-4">
              <h2 className="text-lg font-semibold text-foreground">Edit V2 content</h2>
              {!target ? (
                <p className="mt-2 text-sm text-muted-foreground">Select an interaction from the full exam preview.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="question-stem">Question stem</label>
                    <Textarea
                      id="question-stem"
                      value={draft.questionStem}
                      onChange={(event) => setDraft((current) => ({ ...current, questionStem: event.target.value }))}
                      placeholder="Question stem"
                    />
                  </div>
                  {showInteractionPrompt ? (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground" htmlFor="interaction-prompt">Interaction prompt</label>
                      <Textarea
                        id="interaction-prompt"
                        value={draft.interactionPromptMarkdown}
                        onChange={(event) => setDraft((current) => ({ ...current, interactionPromptMarkdown: event.target.value }))}
                        placeholder="Interaction prompt"
                      />
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground" htmlFor="item-marks">Item marks</label>
                      <Input id="item-marks" value={draft.itemMarks} onChange={(event) => setDraft((current) => ({ ...current, itemMarks: event.target.value }))} placeholder="Item marks" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground" htmlFor="interaction-marks">Interaction marks</label>
                      <Input id="interaction-marks" value={draft.interactionMarks} onChange={(event) => setDraft((current) => ({ ...current, interactionMarks: event.target.value }))} placeholder="Interaction marks" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="marking-mode">Marking mode</label>
                    <select id="marking-mode" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.markingMode} onChange={(event) => setDraft((current) => ({ ...current, markingMode: event.target.value }))}>
                      <option value="exactMatch">exactMatch</option>
                      <option value="alternativeAnswers">alternativeAnswers</option>
                      <option value="manualReviewRequired">manualReviewRequired</option>
                      <option value="conceptMatch">conceptMatch</option>
                      <option value="normalizedTextMatch">normalizedTextMatch</option>
                      <option value="keywordBased">keywordBased</option>
                      <option value="mcqOptionMatch">mcqOptionMatch</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={draft.allowFullSentenceContainingAnswer}
                      onChange={(event) => setDraft((current) => ({ ...current, allowFullSentenceContainingAnswer: event.target.checked }))}
                    />
                    Allow full sentence containing answer
                  </label>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="exact-answer">Exact answer</label>
                    <Textarea id="exact-answer" value={draft.exactAnswer} onChange={(event) => setDraft((current) => ({ ...current, exactAnswer: event.target.value, approvedAnswer: event.target.value }))} placeholder="Exact answer" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="alternative-answers">Alternative answers</label>
                    <Textarea id="alternative-answers" value={draft.alternativeAnswers} onChange={(event) => setDraft((current) => ({ ...current, alternativeAnswers: event.target.value }))} placeholder="One alternative per line" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="explanation">Explanation</label>
                    <Textarea id="explanation" value={draft.explanation} onChange={(event) => setDraft((current) => ({ ...current, explanation: event.target.value }))} placeholder="Explanation" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="teacher-guidance">Teacher guidance</label>
                    <Textarea id="teacher-guidance" value={draft.teacherNotes} onChange={(event) => setDraft((current) => ({ ...current, teacherNotes: event.target.value }))} placeholder="Teacher guidance" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="change-reason">Change reason</label>
                    <Textarea id="change-reason" value={draft.changeReason} onChange={(event) => setDraft((current) => ({ ...current, changeReason: event.target.value }))} placeholder="Required before saving" />
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground">Related teacher feedback</h3>
                      <Badge variant="outline">{relatedActions.length + relatedSuggestions.length}</Badge>
                    </div>
                    {relatedActions.length === 0 && relatedSuggestions.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">No teacher feedback recorded for this question yet.</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {relatedActions.map((action) => (
                          <div key={action.id} className="rounded-md bg-background p-3 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="capitalize">{actionLabel(action.actionType)}</Badge>
                              <span className="text-xs text-muted-foreground">{formatTimestamp(action.createdAt)}</span>
                            </div>
                            <p className="mt-2 text-muted-foreground">
                              {action.teacherName || action.teacherId || 'Teacher'} {action.studentName ? `| Student: ${action.studentName}` : ''}
                            </p>
                            {action.comment ? <p className="mt-2 whitespace-pre-wrap text-foreground">{action.comment}</p> : null}
                            {action.previousScore !== null || action.newScore !== null ? (
                              <p className="mt-2 text-xs text-muted-foreground">Score: {action.previousScore ?? '-'} to {action.newScore ?? '-'}</p>
                            ) : null}
                            {action.studentAnswer ? (
                              <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">Student answer: {action.studentAnswer}</p>
                            ) : null}
                          </div>
                        ))}
                        {relatedSuggestions.map((suggestion) => (
                          <div key={suggestion.id} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{suggestion.status}</Badge>
                              <span className="text-xs">{suggestion.issueType.replace(/_/g, ' ')}</span>
                            </div>
                            <p className="mt-2">{suggestion.teacherName || 'Teacher'} suggested content feedback.</p>
                            {suggestion.teacherComment ? <p className="mt-2 whitespace-pre-wrap">{suggestion.teacherComment}</p> : null}
                            {suggestion.suggestedAnswer ? <p className="mt-2"><span className="font-medium">Suggested answer:</span> {suggestion.suggestedAnswer}</p> : null}
                            {suggestion.suggestedAlternatives?.length ? <p className="mt-1"><span className="font-medium">Alternatives:</span> {suggestion.suggestedAlternatives.join(', ')}</p> : null}
                            {suggestion.suggestedExplanation ? <p className="mt-1"><span className="font-medium">Explanation:</span> {suggestion.suggestedExplanation}</p> : null}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button size="sm" onClick={() => resolveSuggestion(suggestion, 'accepted')} disabled={resolvingSuggestionId === suggestion.id || suggestion.status !== 'pending'}>
                                Accept
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => resolveSuggestion(suggestion, 'rejected')} disabled={resolvingSuggestionId === suggestion.id || suggestion.status !== 'pending'}>
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button className="w-full gap-2" onClick={saveEdit} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save content edit
                  </Button>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
