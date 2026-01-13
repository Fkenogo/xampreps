import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Search, ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react';
import PdfUpload from './PdfUpload';
import type { Database } from '@/integrations/supabase/types';

type Exam = Database['public']['Tables']['exams']['Row'];
type Question = Database['public']['Tables']['questions']['Row'];

interface QuestionPreview extends Question {
  parts_count: number;
}

interface ExamEditDialogProps {
  exam: Exam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function ExamEditDialog({ exam, open, onOpenChange, onSaved }: ExamEditDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  // Form data state
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    level: 'PLE' as 'PLE' | 'UCE' | 'UACE',
    year: new Date().getFullYear(),
    time_limit: 60,
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard',
    type: 'Past Paper' as 'Past Paper' | 'Practice Paper',
    is_free: true,
    description: '',
    explanation_pdf_url: null as string | null,
  });

  // Question browser state
  const [questions, setQuestions] = useState<QuestionPreview[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionSearch, setQuestionSearch] = useState('');
  const [currentQuestionPage, setCurrentQuestionPage] = useState(1);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const QUESTIONS_PER_PAGE = 10;

  useEffect(() => {
    if (exam) {
      setFormData({
        title: exam.title,
        subject: exam.subject,
        level: exam.level,
        year: exam.year,
        time_limit: exam.time_limit,
        difficulty: exam.difficulty,
        type: exam.type,
        is_free: exam.is_free,
        description: exam.description || '',
        explanation_pdf_url: exam.explanation_pdf_url || null,
      });
      // Fetch questions when editing
      fetchQuestions(exam.id);
    } else {
      setFormData({
        title: '',
        subject: '',
        level: 'PLE',
        year: new Date().getFullYear(),
        time_limit: 60,
        difficulty: 'Medium',
        type: 'Past Paper',
        is_free: true,
        description: '',
        explanation_pdf_url: null,
      });
      setQuestions([]);
    }
    setActiveTab('details');
    setQuestionSearch('');
    setCurrentQuestionPage(1);
    setSelectedQuestionId(null);
  }, [exam, open]);

  const fetchQuestions = async (examId: string) => {
    setQuestionsLoading(true);
    try {
      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('question_number');

      if (questionsError) throw questionsError;

      // Fetch parts count for each question
      const questionIds = questionsData?.map(q => q.id) || [];
      const { data: partsData } = await supabase
        .from('question_parts')
        .select('question_id')
        .in('question_id', questionIds);

      const partsCounts: Record<string, number> = {};
      partsData?.forEach(p => {
        partsCounts[p.question_id] = (partsCounts[p.question_id] || 0) + 1;
      });

      const questionsWithParts: QuestionPreview[] = (questionsData || []).map(q => ({
        ...q,
        parts_count: partsCounts[q.id] || 0,
      }));

      setQuestions(questionsWithParts);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
    } finally {
      setQuestionsLoading(false);
    }
  };

  // Filter questions based on search
  const filteredQuestions = questions.filter(q => {
    const searchLower = questionSearch.toLowerCase();
    return (
      q.question_number.toString().includes(searchLower) ||
      q.text.toLowerCase().includes(searchLower)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE);
  const paginatedQuestions = filteredQuestions.slice(
    (currentQuestionPage - 1) * QUESTIONS_PER_PAGE,
    currentQuestionPage * QUESTIONS_PER_PAGE
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (exam) {
        // Update existing exam
        const { error } = await supabase
          .from('exams')
          .update({
            title: formData.title,
            subject: formData.subject,
            level: formData.level,
            year: formData.year,
            time_limit: formData.time_limit,
            difficulty: formData.difficulty,
            type: formData.type,
            is_free: formData.is_free,
            description: formData.description || null,
            explanation_pdf_url: formData.explanation_pdf_url,
          })
          .eq('id', exam.id);

        if (error) throw error;
        toast({ title: 'Exam updated successfully' });
      } else {
        // Create new exam
        const { error } = await supabase
          .from('exams')
          .insert({
            title: formData.title,
            subject: formData.subject,
            level: formData.level,
            year: formData.year,
            time_limit: formData.time_limit,
            difficulty: formData.difficulty,
            type: formData.type,
            is_free: formData.is_free,
            description: formData.description || null,
            explanation_pdf_url: formData.explanation_pdf_url,
          });

        if (error) throw error;
        toast({ title: 'Exam created successfully' });
      }

      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{exam ? 'Edit Exam' : 'Create New Exam'}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="details">Details</TabsTrigger>
            {exam && (
              <TabsTrigger value="questions" className="gap-2">
                <FileText className="w-4 h-4" />
                Questions ({questions.length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="flex-1 overflow-auto mt-0">
            <form onSubmit={handleSubmit} className="space-y-4 p-1">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., PLE Mathematics 2024"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g., Mathematics"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    min={2000}
                    max={2030}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value: 'PLE' | 'UCE' | 'UACE') => 
                      setFormData(prev => ({ ...prev, level: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLE">PLE</SelectItem>
                      <SelectItem value="UCE">UCE</SelectItem>
                      <SelectItem value="UACE">UACE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value: 'Easy' | 'Medium' | 'Hard') => 
                      setFormData(prev => ({ ...prev, difficulty: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'Past Paper' | 'Practice Paper') => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Past Paper">Past Paper</SelectItem>
                      <SelectItem value="Practice Paper">Practice Paper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time_limit">Time Limit (minutes)</Label>
                  <Input
                    id="time_limit"
                    type="number"
                    value={formData.time_limit}
                    onChange={(e) => setFormData(prev => ({ ...prev, time_limit: parseInt(e.target.value) }))}
                    min={10}
                    max={300}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the exam..."
                  rows={3}
                />
              </div>

              {/* PDF Upload */}
              {exam && (
                <PdfUpload
                  currentPdfUrl={formData.explanation_pdf_url}
                  onPdfChange={(url) => setFormData(prev => ({ ...prev, explanation_pdf_url: url }))}
                  examId={exam.id}
                />
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="is_free">Free Access</Label>
                <Switch
                  id="is_free"
                  checked={formData.is_free}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_free: checked }))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : exam ? 'Update Exam' : 'Create Exam'}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Questions Tab */}
          {exam && (
            <TabsContent value="questions" className="flex-1 flex flex-col overflow-hidden mt-0">
              {/* Search Bar */}
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by question number or text..."
                    value={questionSearch}
                    onChange={(e) => {
                      setQuestionSearch(e.target.value);
                      setCurrentQuestionPage(1);
                    }}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Questions List */}
              <ScrollArea className="flex-1">
                {questionsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : paginatedQuestions.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {questionSearch ? 'No questions match your search' : 'No questions added yet'}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {paginatedQuestions.map((question) => (
                      <div
                        key={question.id}
                        className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedQuestionId === question.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                        }`}
                        onClick={() => setSelectedQuestionId(
                          selectedQuestionId === question.id ? null : question.id
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="font-semibold text-primary">
                              {question.question_number}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground line-clamp-2">
                              {question.text || '(No question text)'}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {question.parts_count} part{question.parts_count !== 1 ? 's' : ''}
                              </span>
                              {question.image_url && (
                                <span className="text-xs text-primary">Has image</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-border flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Page {currentQuestionPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentQuestionPage(p => Math.max(1, p - 1))}
                      disabled={currentQuestionPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentQuestionPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentQuestionPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Info Footer */}
              <div className="p-4 border-t border-border bg-muted/30">
                <p className="text-sm text-muted-foreground text-center">
                  Use "Edit Questions" from the Actions menu to modify question content
                </p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
