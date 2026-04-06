import { useState, useRef } from 'react';
import { adminBulkImportQuestionsFirebase } from '@/integrations/firebase/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileJson, FileSpreadsheet, Loader2, Download, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BulkQuestionImportProps {
  examId: string;
  onImportComplete: () => void;
}

interface ImportedQuestion {
  question_number: number;
  text: string;
  image_url?: string;
  parts: {
    text: string;
    answer: string;
    explanation?: string;
    marks: number;
    answer_type: 'text' | 'numeric' | 'open-ended';
  }[];
}

type AnswerType = ImportedQuestion['parts'][number]['answer_type'];

const isAnswerType = (value: string): value is AnswerType =>
  value === 'text' || value === 'numeric' || value === 'open-ended';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

export default function BulkQuestionImport({ examId, onImportComplete }: BulkQuestionImportProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [csvInput, setCsvInput] = useState('');
  const [preview, setPreview] = useState<ImportedQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleJson = JSON.stringify([
    {
      question_number: 1,
      text: "What is 2 + 2?",
      parts: [
        {
          text: "",
          answer: "4",
          explanation: "Basic addition: 2 + 2 = 4",
          marks: 1,
          answer_type: "numeric"
        }
      ]
    },
    {
      question_number: 2,
      text: "Solve the following:",
      parts: [
        {
          text: "(a) 5 × 3",
          answer: "15",
          explanation: "5 multiplied by 3 equals 15",
          marks: 2,
          answer_type: "numeric"
        },
        {
          text: "(b) 10 ÷ 2",
          answer: "5",
          explanation: "10 divided by 2 equals 5",
          marks: 2,
          answer_type: "numeric"
        }
      ]
    }
  ], null, 2);

  const sampleCsv = `question_number,question_text,part_text,answer,explanation,marks,answer_type
1,What is 2 + 2?,,4,Basic addition: 2 + 2 = 4,1,numeric
2,Solve the following:,(a) 5 × 3,15,5 multiplied by 3 equals 15,2,numeric
2,Solve the following:,(b) 10 ÷ 2,5,10 divided by 2 equals 5,2,numeric`;

  const parseJson = (input: string): ImportedQuestion[] => {
    const data = JSON.parse(input);
    if (!Array.isArray(data)) {
      throw new Error('JSON must be an array of questions');
    }
    return data.map((q, i) => ({
      question_number: q.question_number || i + 1,
      text: q.text || '',
      image_url: q.image_url,
      parts: (q.parts || []).map((p: unknown) => {
        const part = (p || {}) as Partial<ImportedQuestion['parts'][number]>;
        return {
          text: part.text || '',
          answer: part.answer || '',
          explanation: part.explanation || '',
          marks: part.marks || 1,
          answer_type: isAnswerType(part.answer_type || '') ? part.answer_type : 'text',
        };
      }),
    }));
  };

  const parseCsv = (input: string): ImportedQuestion[] => {
    const lines = input.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['question_number', 'question_text', 'answer'];
    
    for (const header of requiredHeaders) {
      if (!headers.includes(header)) {
        throw new Error(`Missing required header: ${header}`);
      }
    }

    const questionsMap = new Map<number, ImportedQuestion>();

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      const questionNum = parseInt(row.question_number);
      if (isNaN(questionNum)) continue;

      if (!questionsMap.has(questionNum)) {
        questionsMap.set(questionNum, {
          question_number: questionNum,
          text: row.question_text || '',
          image_url: row.image_url,
          parts: [],
        });
      }

      const question = questionsMap.get(questionNum)!;
      question.parts.push({
        text: row.part_text || '',
        answer: row.answer || '',
        explanation: row.explanation || '',
        marks: parseInt(row.marks) || 1,
        answer_type: isAnswerType(row.answer_type) ? row.answer_type : 'text',
      });
    }

    return Array.from(questionsMap.values()).sort((a, b) => a.question_number - b.question_number);
  };

  const handlePreviewJson = () => {
    setError(null);
    try {
      const questions = parseJson(jsonInput);
      setPreview(questions);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setPreview([]);
    }
  };

  const handlePreviewCsv = () => {
    setError(null);
    try {
      const questions = parseCsv(csvInput);
      setPreview(questions);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setPreview([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (file.name.endsWith('.json')) {
        setJsonInput(content);
        try {
          const questions = parseJson(content);
          setPreview(questions);
          setError(null);
        } catch (err: unknown) {
          setError(getErrorMessage(err));
        }
      } else if (file.name.endsWith('.csv')) {
        setCsvInput(content);
        try {
          const questions = parseCsv(content);
          setPreview(questions);
          setError(null);
        } catch (err: unknown) {
          setError(getErrorMessage(err));
        }
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      toast({ title: 'No questions to import', variant: 'destructive' });
      return;
    }

    setImporting(true);
    try {
      const result = await adminBulkImportQuestionsFirebase(examId, preview);
      if (!result.ok) throw new Error('Import failed');

      toast({ title: `Successfully imported ${preview.length} questions` });
      setOpen(false);
      setPreview([]);
      setJsonInput('');
      setCsvInput('');
      onImportComplete();
    } catch (err: unknown) {
      toast({
        title: 'Import failed',
        description: getErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadSample = (type: 'json' | 'csv') => {
    const content = type === 'json' ? sampleJson : sampleCsv;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample-questions.${type}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Questions</DialogTitle>
          <DialogDescription>
            Import multiple questions at once from JSON or CSV files
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="json" className="space-y-4">
          <TabsList>
            <TabsTrigger value="json" className="gap-2">
              <FileJson className="h-4 w-4" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="csv" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="json" className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadSample('json')}>
                <Download className="h-4 w-4 mr-2" />
                Download Sample JSON
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="max-w-xs"
              />
            </div>
            <div className="space-y-2">
              <Label>Paste JSON Data</Label>
              <Textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={sampleJson}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={handlePreviewJson} variant="secondary">
              Preview Import
            </Button>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadSample('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Download Sample CSV
              </Button>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="max-w-xs"
              />
            </div>
            <div className="space-y-2">
              <Label>Paste CSV Data</Label>
              <Textarea
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder={sampleCsv}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={handlePreviewCsv} variant="secondary">
              Preview Import
            </Button>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {preview.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold">Preview ({preview.length} questions)</h4>
            <div className="max-h-48 overflow-y-auto border rounded-lg p-4 space-y-3">
              {preview.map((q, i) => (
                <div key={i} className="border-b pb-2 last:border-b-0">
                  <p className="font-medium">Q{q.question_number}: {q.text}</p>
                  <p className="text-sm text-muted-foreground">
                    {q.parts.length} part(s) • {q.parts.reduce((sum, p) => sum + p.marks, 0)} marks
                  </p>
                </div>
              ))}
            </div>
            <Button onClick={handleImport} disabled={importing} className="w-full">
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {preview.length} Questions
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
