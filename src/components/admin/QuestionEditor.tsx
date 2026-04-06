import { useState, useEffect } from 'react';
import {
  adminListExamQuestionsFullFirebase,
  adminSaveExamQuestionsFirebase,
} from '@/integrations/firebase/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import BulkQuestionImport from './BulkQuestionImport';
import ImageUpload from './ImageUpload';
import BatchImageUpload from './BatchImageUpload';

type Question = {
  id: string;
  exam_id: string;
  question_number: number;
  text: string;
  image_url: string | null;
  table_data: unknown;
  created_at: string;
};
type QuestionPart = {
  id: string;
  question_id: string;
  text: string;
  answer: string;
  explanation: string;
  marks: number;
  order_index: number;
  answer_type: string;
  created_at: string;
};

interface QuestionWithParts extends Question {
  parts: QuestionPart[];
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unexpected error';

interface QuestionEditorProps {
  examId: string;
  examTitle: string;
  onBack: () => void;
}

export default function QuestionEditor({ examId, examTitle, onBack }: QuestionEditorProps) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuestionWithParts[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [examId]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const result = await adminListExamQuestionsFullFirebase(examId);
      if (result.ok) {
        setQuestions(result.items as QuestionWithParts[]);
      } else {
        setQuestions([]);
      }
    } catch (error: unknown) {
      toast({
        title: 'Error loading questions',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];

  const updateQuestion = (field: keyof Question, value: Question[keyof Question]) => {
    setQuestions(prev => prev.map((q, i) => 
      i === currentIndex ? { ...q, [field]: value } : q
    ));
    setHasChanges(true);
  };

  const updatePart = (partIndex: number, field: keyof QuestionPart, value: QuestionPart[keyof QuestionPart]) => {
    setQuestions(prev => prev.map((q, i) => 
      i === currentIndex 
        ? { 
            ...q, 
            parts: q.parts.map((p, pi) => 
              pi === partIndex ? { ...p, [field]: value } : p
            ) 
          } 
        : q
    ));
    setHasChanges(true);
  };

  const addPart = () => {
    if (!currentQuestion) return;
    
    const newPart: QuestionPart = {
      id: `new-${Date.now()}`,
      question_id: currentQuestion.id,
      text: '',
      answer: '',
      explanation: '',
      marks: 1,
      order_index: currentQuestion.parts.length,
      answer_type: 'text',
      created_at: new Date().toISOString(),
    };

    setQuestions(prev => prev.map((q, i) => 
      i === currentIndex ? { ...q, parts: [...q.parts, newPart] } : q
    ));
    setHasChanges(true);
  };

  const removePart = (partIndex: number) => {
    setQuestions(prev => prev.map((q, i) => 
      i === currentIndex 
        ? { ...q, parts: q.parts.filter((_, pi) => pi !== partIndex) } 
        : q
    ));
    setHasChanges(true);
  };

  const addQuestion = () => {
    const newQuestion: QuestionWithParts = {
      id: `new-${Date.now()}`,
      exam_id: examId,
      question_number: questions.length + 1,
      text: '',
      image_url: null,
      table_data: null,
      created_at: new Date().toISOString(),
      parts: [{
        id: `new-part-${Date.now()}`,
        question_id: `new-${Date.now()}`,
        text: '',
        answer: '',
        explanation: '',
        marks: 1,
        order_index: 0,
        answer_type: 'text',
        created_at: new Date().toISOString(),
      }],
    };

    setQuestions(prev => [...prev, newQuestion]);
    setCurrentIndex(questions.length);
    setHasChanges(true);
  };

  const deleteQuestion = async () => {
    if (!currentQuestion) return;
    
    if (!confirm('Are you sure you want to delete this question?')) return;

    setQuestions(prev => prev.filter((_, i) => i !== currentIndex));
    setCurrentIndex(Math.max(0, currentIndex - 1));
    setHasChanges(true);
    toast({ title: 'Question removed (save to apply)' });
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const payload = questions.map((question, questionIndex) => ({
        question_number: question.question_number || questionIndex + 1,
        text: question.text || '',
        image_url: question.image_url || null,
        table_data: question.table_data || null,
        parts: question.parts.map((part, partIndex) => ({
          text: part.text || '',
          answer: part.answer || '',
          explanation: part.explanation || '',
          marks: part.marks || 1,
          order_index: typeof part.order_index === 'number' ? part.order_index : partIndex,
          answer_type: part.answer_type || 'text',
        })),
      }));

      const result = await adminSaveExamQuestionsFirebase(examId, payload);
      if (!result.ok) throw new Error('Failed to save exam questions');

      setHasChanges(false);
      toast({ title: 'All changes saved successfully' });
      
      // Refresh to get proper IDs
      fetchQuestions();
    } catch (error: unknown) {
      toast({
        title: 'Error saving changes',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Exams
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{examTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {questions.length} questions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BulkQuestionImport examId={examId} onImportComplete={fetchQuestions} />
          <BatchImageUpload examId={examId} questionCount={questions.length} onUploadComplete={fetchQuestions} />
          <Button variant="outline" onClick={addQuestion}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
          <Button onClick={saveChanges} disabled={!hasChanges || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Question Navigation */}
      {questions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {questions.map((q, i) => (
            <Button
              key={q.id}
              variant={i === currentIndex ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentIndex(i)}
              className="w-10 h-10"
            >
              {q.question_number}
            </Button>
          ))}
        </div>
      )}

      {/* Question Editor */}
      {currentQuestion ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Question {currentQuestion.question_number}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} of {questions.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                disabled={currentIndex === questions.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteQuestion}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question Text */}
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Textarea
                value={currentQuestion.text}
                onChange={(e) => updateQuestion('text', e.target.value)}
                placeholder="Enter the question text..."
                rows={3}
              />
            </div>

            {/* Question Number */}
            <div className="space-y-2">
              <Label>Question Number</Label>
              <Input
                type="number"
                value={currentQuestion.question_number}
                onChange={(e) => updateQuestion('question_number', parseInt(e.target.value))}
                min={1}
                className="max-w-[120px]"
              />
            </div>

            {/* Image Upload */}
            <ImageUpload
              currentImageUrl={currentQuestion.image_url}
              onImageChange={(url) => updateQuestion('image_url', url)}
              questionId={currentQuestion.id}
            />

            {/* Question Parts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Answer Parts</Label>
                <Button variant="outline" size="sm" onClick={addPart}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Part
                </Button>
              </div>

              <Accordion type="multiple" className="space-y-2">
                {currentQuestion.parts.map((part, partIndex) => (
                  <AccordionItem 
                    key={part.id} 
                    value={part.id}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          Part {String.fromCharCode(97 + partIndex)}
                        </span>
                        <span className="text-muted-foreground text-sm truncate max-w-[300px]">
                          {part.text || '(empty)'}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Part Text / Sub-question</Label>
                        <Textarea
                          value={part.text}
                          onChange={(e) => updatePart(partIndex, 'text', e.target.value)}
                          placeholder="Enter the part text or leave empty if single answer..."
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Answer</Label>
                          <Input
                            value={part.answer}
                            onChange={(e) => updatePart(partIndex, 'answer', e.target.value)}
                            placeholder="Correct answer"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Marks</Label>
                          <Input
                            type="number"
                            value={part.marks}
                            onChange={(e) => updatePart(partIndex, 'marks', parseInt(e.target.value))}
                            min={1}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Answer Type</Label>
                        <Select
                          value={part.answer_type}
                          onValueChange={(value: 'text' | 'numeric' | 'open-ended') => 
                            updatePart(partIndex, 'answer_type', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="numeric">Numeric</SelectItem>
                            <SelectItem value="open-ended">Open-ended</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Explanation</Label>
                        <Textarea
                          value={part.explanation || ''}
                          onChange={(e) => updatePart(partIndex, 'explanation', e.target.value)}
                          placeholder="Detailed explanation for this answer..."
                          rows={4}
                        />
                      </div>

                      {currentQuestion.parts.length > 1 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removePart(partIndex)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Part
                        </Button>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No questions yet</p>
            <Button onClick={addQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Question
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
