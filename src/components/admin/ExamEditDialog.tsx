import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Exam = {
  id: string;
  title: string;
  subject: string;
  level: 'PLE' | 'UCE' | 'UACE';
  year: number;
  time_limit: number;
  question_count: number;
  status?: string;
};

interface ExamEditDialogProps {
  exam: Exam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function ExamEditDialog({
  exam,
  open,
  onOpenChange,
}: ExamEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{exam ? 'V2 Exam Details' : 'V2 Exam Editing Disabled'}</DialogTitle>
          <DialogDescription>
            The legacy exam editor has been retired. XamPreps is now V2-only, and a V2-native admin editor has not
            shipped yet.
          </DialogDescription>
        </DialogHeader>

        {exam ? (
          <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-5 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Title</p>
              <p className="mt-1 font-medium text-foreground">{exam.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Subject</p>
                <p className="mt-1 text-foreground">{exam.subject}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Level</p>
                <p className="mt-1 text-foreground">{exam.level}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Year</p>
                <p className="mt-1 text-foreground">{exam.year}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Questions</p>
                <p className="mt-1 text-foreground">{exam.question_count}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Duration</p>
                <p className="mt-1 text-foreground">{exam.time_limit} minutes</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                <p className="mt-1 text-foreground">{exam.status || 'published'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            New V2 exams should be created through the V2 import/seeding workflow for now. This prevents the old schema
            form from accidentally writing incompatible exam data.
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
