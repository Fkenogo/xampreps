import { Clock, BookOpen, Star, FileText, Play, Globe } from 'lucide-react';
import { COUNTRY_LABELS } from '@/lib/education-system';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ExamListItemProps {
  exam: {
    id: string;
    title: string;
    subject: string;
    year: number;
    level: string;
    country?: string | null;
    difficulty: string;
    time_limit: number;
    question_count: number;
    avg_score?: number;
    is_free: boolean;
    description?: string | null;
    /** Source attribution for Practice Papers — shown when present */
    source?: string | null;
    /** Issuing authority for Past Papers — e.g. 'UNEB', 'KNEC' */
    examAuthority?: string | null;
  };
  onStart: (examId: string) => void;
  index?: number;
  /** Override the action button label. Defaults to "Start Exam". */
  startLabel?: string;
  /** When provided, clicking the row (not the button) opens a preview. */
  onPreview?: (examId: string) => void;
}

const subjectColors: Record<string, string> = {
  Mathematics: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  English: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  Science: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Social Studies': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  SST: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Physics: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  Chemistry: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Biology: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
};

const difficultyConfig: Record<string, { color: string; bg: string }> = {
  Easy: { color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  Medium: { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  Hard: { color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30' },
};

const levelColors: Record<string, string> = {
  PLE: 'bg-primary/10 text-primary',
  KCPE: 'bg-primary/10 text-primary',
  KPSEA: 'bg-primary/10 text-primary',
  PSLE: 'bg-primary/10 text-primary',
  CEP: 'bg-primary/10 text-primary',
  UCE: 'bg-secondary/10 text-secondary',
  KJSEA: 'bg-secondary/10 text-secondary',
  CSEE: 'bg-secondary/10 text-secondary',
  O_LEVEL: 'bg-secondary/10 text-secondary',
  CYCLE_FONDAMENTAL: 'bg-secondary/10 text-secondary',
  UACE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  KCSE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  ACSEE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  A_LEVEL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  EXAMEN_ETAT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

function formatQuestionCount(count: number) {
  return `${count} question${count === 1 ? '' : 's'}`;
}

export default function ExamListItem({ exam, onStart, index = 0, startLabel = 'Start Exam', onPreview }: ExamListItemProps) {
  const countryLabel = exam.country ? ((COUNTRY_LABELS as Record<string, string>)[exam.country] ?? exam.country) : null;
  const diffConfig = difficultyConfig[exam.difficulty] || difficultyConfig.Medium;
  const subjectColor = subjectColors[exam.subject] || 'bg-muted text-muted-foreground';
  const levelColor = levelColors[exam.level] || 'bg-muted text-muted-foreground';

  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border p-4 sm:p-5',
        'hover:shadow-lg hover:border-primary/30 transition-all duration-300',
        'group animate-fade-in',
        onPreview && 'cursor-pointer'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onPreview ? () => onPreview(exam.id) : undefined}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Icon */}
        <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary shrink-0">
          <FileText className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title Row with Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {exam.title}
            </h3>
            <Badge
              variant="secondary"
              className={cn('text-xs font-medium', diffConfig.bg, diffConfig.color)}
            >
              {exam.difficulty}
            </Badge>
            {!exam.is_free && (
              <Badge
                variant="secondary"
                className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 dark:from-amber-900/30 dark:to-yellow-900/30 dark:text-amber-300 text-xs"
              >
                <Star className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}
            {exam.is_free && (
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs"
              >
                Free
              </Badge>
            )}
          </div>

          {/* Description */}
          {exam.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
              {exam.description}
            </p>
          )}

          {/* Meta Tags */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline" className={cn('text-xs', levelColor)}>
              {exam.level}
            </Badge>
            <Badge variant="outline" className={cn('text-xs', subjectColor)}>
              {exam.subject}
            </Badge>
            {exam.year > 0 && <span className="text-muted-foreground">{exam.year}</span>}
            {countryLabel && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Globe className="w-3 h-3" />{countryLabel}
                </span>
              </>
            )}
            {exam.source && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground italic font-medium">Source: {exam.source}</span>
              </>
            )}
            {exam.examAuthority && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground font-medium">Authority: {exam.examAuthority}</span>
              </>
            )}
            {exam.time_limit > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {exam.time_limit} min
                </span>
              </>
            )}
            {exam.question_count > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <BookOpen className="w-3.5 h-3.5" />
                  {formatQuestionCount(exam.question_count)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            className="gap-2"
            onClick={(event) => {
              event.stopPropagation();
              onStart(exam.id);
            }}
          >
            {startLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
