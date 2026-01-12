import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import { useAIExplanation } from '@/hooks/useAIExplanation';
import { 
  CheckCircle, 
  XCircle, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Loader2,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionPart {
  id: string;
  text: string;
  answer: string;
  marks: number;
  explanation?: string | null;
}

interface Question {
  id: string;
  question_number: number;
  text: string;
  image_url?: string | null;
  question_parts: QuestionPart[];
}

interface UserAnswer {
  partId: string;
  answer: string;
  isCorrect: boolean;
}

interface QuestionReviewCardProps {
  question: Question;
  userAnswers: UserAnswer[];
  questionIndex: number;
  subject?: string;
  level?: string;
  onStudyTopic?: (topic: string) => void;
}

export default function QuestionReviewCard({
  question,
  userAnswers,
  questionIndex,
  subject,
  level,
  onStudyTopic,
}: QuestionReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePartId, setActivePartId] = useState<string | null>(null);
  const { loading, explanation, getExplanation, getFeedback, clearExplanation } = useAIExplanation({
    studentLevel: level,
    subject: subject,
  });

  const correctCount = userAnswers.filter(a => a.isCorrect).length;
  const totalParts = question.question_parts.length;
  const isFullyCorrect = correctCount === totalParts;
  const isPartiallyCorrect = correctCount > 0 && correctCount < totalParts;

  const handleGetAIHelp = async (part: QuestionPart) => {
    setActivePartId(part.id);
    clearExplanation();
    await getExplanation(
      `${question.text}\n\n${part.text}`,
      part.answer,
      part.marks
    );
  };

  const handleGetFeedback = async (part: QuestionPart, userAnswer: string) => {
    setActivePartId(part.id);
    clearExplanation();
    await getFeedback(
      `${question.text}\n\n${part.text}`,
      userAnswer,
      part.answer,
      part.marks
    );
  };

  return (
    <Card className={cn(
      'border-l-4 transition-all',
      isFullyCorrect ? 'border-l-emerald-500 bg-emerald-500/5' :
      isPartiallyCorrect ? 'border-l-amber-500 bg-amber-500/5' :
      'border-l-red-500 bg-red-500/5'
    )}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                  isFullyCorrect ? 'bg-emerald-500/20' :
                  isPartiallyCorrect ? 'bg-amber-500/20' :
                  'bg-red-500/20'
                )}>
                  {isFullyCorrect ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : isPartiallyCorrect ? (
                    <HelpCircle className="w-5 h-5 text-amber-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">
                    Question {question.question_number}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {question.text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {correctCount}/{totalParts} parts correct
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            {/* Question Context */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-foreground mb-2">Question</h4>
              <p className="text-foreground">{question.text}</p>
              {question.image_url && (
                <img 
                  src={question.image_url} 
                  alt="Question diagram" 
                  className="mt-3 max-w-full h-auto rounded-lg border border-border"
                />
              )}
            </div>

            {/* Question Parts */}
            {question.question_parts.map((part, partIndex) => {
              const userAnswer = userAnswers.find(a => a.partId === part.id);
              const isCorrect = userAnswer?.isCorrect ?? false;

              return (
                <div key={part.id} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                      isCorrect ? 'bg-emerald-500/20' : 'bg-red-500/20'
                    )}>
                      {isCorrect ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        {totalParts > 1 ? `Part ${String.fromCharCode(97 + partIndex)}: ` : ''}
                        {part.text}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ({part.marks} mark{part.marks !== 1 ? 's' : ''})
                      </p>

                      {/* Answer Comparison */}
                      <div className="grid gap-2 mt-2">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-medium text-muted-foreground w-24 shrink-0">
                            Your answer:
                          </span>
                          <span className={cn(
                            'text-sm',
                            isCorrect ? 'text-emerald-600' : 'text-red-600'
                          )}>
                            {userAnswer?.answer || '(No answer)'}
                          </span>
                        </div>
                        {!isCorrect && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-muted-foreground w-24 shrink-0">
                              Correct answer:
                            </span>
                            <span className="text-sm text-emerald-600 font-medium">
                              {part.answer}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Stored Explanation */}
                      {part.explanation && (
                        <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <p className="text-xs font-medium text-primary mb-2">Step-by-step explanation:</p>
                          <MarkdownRenderer content={part.explanation} className="text-sm" />
                        </div>
                      )}

                      {/* AI Help Section */}
                      {activePartId === part.id && explanation && (
                        <div className="mt-3 p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <p className="text-xs font-medium text-primary">AI Explanation</p>
                          </div>
                          <MarkdownRenderer content={explanation} className="text-sm" />
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGetAIHelp(part)}
                          disabled={loading && activePartId === part.id}
                          className="gap-1.5"
                        >
                          {loading && activePartId === part.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          Get AI Help
                        </Button>
                        {!isCorrect && userAnswer?.answer && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGetFeedback(part, userAnswer.answer)}
                            disabled={loading && activePartId === part.id}
                            className="gap-1.5"
                          >
                            {loading && activePartId === part.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <HelpCircle className="w-3.5 h-3.5" />
                            )}
                            Why was I wrong?
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Study Topic Button */}
            {subject && onStudyTopic && (
              <div className="pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onStudyTopic(subject)}
                  className="gap-2 text-primary"
                >
                  <BookOpen className="w-4 h-4" />
                  Study More {subject} Questions
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
