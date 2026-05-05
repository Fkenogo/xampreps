import {
  Clock,
  BookOpen,
  Globe,
  Star,
  LogIn,
  Play,
  Building2,
  Tag,
  BarChart2,
  Calendar,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { COUNTRY_LABELS } from '@/lib/education-system';
import type { FirebaseExam } from '@/integrations/firebase/content';

interface ExamPreviewModalProps {
  exam: FirebaseExam | null;
  open: boolean;
  onClose: () => void;
  /** Called when authenticated user clicks "Start Exam" */
  onStartExam: (examId: string) => void;
  /** Called when unauthenticated user clicks "Sign in to practice" */
  onSignIn: () => void;
}

const difficultyConfig: Record<string, { color: string; bg: string }> = {
  Easy: { color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  Medium: { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  Hard: { color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30' },
};

interface MetaRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

function MetaRow({ icon: Icon, label, value }: MetaRowProps) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function formatQuestionCount(count: number) {
  return `${count} question${count === 1 ? '' : 's'}`;
}

export default function ExamPreviewModal({
  exam,
  open,
  onClose,
  onStartExam,
  onSignIn,
}: ExamPreviewModalProps) {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);

  if (!exam) return null;

  const isPracticePaper = exam.type === 'Practice Paper';
  const countryLabel = exam.country
    ? ((COUNTRY_LABELS as Record<string, string>)[exam.country] ?? exam.country)
    : null;
  const diffConfig = difficultyConfig[exam.difficulty] ?? difficultyConfig.Medium;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {isPracticePaper ? 'Practice Paper' : 'Past Paper'}
                </Badge>
                {exam.is_free ? (
                  <Badge className="bg-emerald-500 text-white text-xs border-0">Free</Badge>
                ) : (
                  <Badge className="bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900 text-xs border-0">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    Premium
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className={cn('text-xs', diffConfig.bg, diffConfig.color)}
                >
                  {exam.difficulty}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold leading-snug pr-2">
                {exam.title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Description */}
        {exam.description && (
          <p className="text-sm text-muted-foreground leading-relaxed -mt-1">
            {exam.description}
          </p>
        )}

        {/* Metadata table */}
        <div className="bg-muted/30 rounded-xl border border-border/50 px-4 py-1 mt-2">
          {countryLabel && (
            <MetaRow icon={Globe} label="Country" value={countryLabel} />
          )}
          {exam.level && (
            <MetaRow icon={Tag} label="Exam Level" value={exam.level} />
          )}
          {exam.subject && (
            <MetaRow icon={BookOpen} label="Subject" value={exam.subject} />
          )}
          {isPracticePaper && exam.source ? (
            <MetaRow icon={Building2} label="Source" value={exam.source} />
          ) : !isPracticePaper && exam.year > 0 ? (
            <MetaRow icon={Calendar} label="Year" value={exam.year.toString()} />
          ) : null}
          {/* Show year for Practice Papers too if present and non-zero */}
          {isPracticePaper && exam.year > 0 && (
            <MetaRow icon={Calendar} label="Year" value={exam.year.toString()} />
          )}
          {!isPracticePaper && exam.examAuthority && (
            <MetaRow icon={Building2} label="Authority" value={exam.examAuthority} />
          )}
          {isPracticePaper && exam.sourceType && (
            <MetaRow icon={Tag} label="Source type" value={exam.sourceType} />
          )}
          {exam.time_limit > 0 && (
            <MetaRow icon={Clock} label="Duration" value={`${exam.time_limit} min`} />
          )}
          {exam.question_count > 0 && (
            <MetaRow icon={BookOpen} label="Questions" value={formatQuestionCount(exam.question_count)} />
          )}
          <MetaRow icon={BarChart2} label="Difficulty" value={exam.difficulty} />
        </div>

        {/* CTA */}
        <div className="pt-2 space-y-3">
          {isAuthenticated ? (
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => { onStartExam(exam.id); onClose(); }}
            >
              <Play className="w-4 h-4" />
              Start Exam
            </Button>
          ) : (
            <>
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => { onSignIn(); onClose(); }}
              >
                <LogIn className="w-4 h-4" />
                Sign in to practice
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Free account — 2 practice sessions included, no payment required.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
