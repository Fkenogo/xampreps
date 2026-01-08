import { Clock, BookOpen, Star, Lock, TrendingUp, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ExamCardProps {
  exam: {
    id: string;
    title: string;
    subject: string;
    year: number;
    level: string;
    difficulty: string;
    time_limit: number;
    question_count: number;
    avg_score: number;
    is_free: boolean;
    description?: string | null;
  };
  onStart: (examId: string) => void;
  index?: number;
}

const subjectColors: Record<string, string> = {
  Mathematics: 'from-blue-500 to-blue-600',
  English: 'from-rose-500 to-rose-600',
  Science: 'from-emerald-500 to-emerald-600',
  'Social Studies': 'from-amber-500 to-amber-600',
  SST: 'from-amber-500 to-amber-600',
  Physics: 'from-indigo-500 to-indigo-600',
  Chemistry: 'from-purple-500 to-purple-600',
  Biology: 'from-pink-500 to-pink-600',
};

const difficultyConfig: Record<string, { color: string; bgClass: string }> = {
  Easy: { color: 'text-emerald-600', bgClass: 'bg-emerald-100 dark:bg-emerald-900/30' },
  Medium: { color: 'text-amber-600', bgClass: 'bg-amber-100 dark:bg-amber-900/30' },
  Hard: { color: 'text-rose-600', bgClass: 'bg-rose-100 dark:bg-rose-900/30' },
};

export default function ExamCard({ exam, onStart, index = 0 }: ExamCardProps) {
  const diffConfig = difficultyConfig[exam.difficulty] || difficultyConfig.Medium;
  const subjectGradient = subjectColors[exam.subject] || 'from-primary to-secondary';

  return (
    <div
      className={cn(
        'bg-card rounded-2xl border border-border overflow-hidden',
        'hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30',
        'transition-all duration-300 group animate-fade-in'
      )}
      style={{ animationDelay: `${index * 75}ms` }}
    >
      {/* Header Strip */}
      <div className={cn('h-1.5 bg-gradient-to-r', subjectGradient)} />

      <div className="p-5">
        {/* Top Row - Badges */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn('text-xs font-semibold', diffConfig.bgClass, diffConfig.color)}
            >
              {exam.difficulty}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {exam.level}
            </Badge>
          </div>
          {!exam.is_free && (
            <Badge
              className="bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900 text-xs border-0"
            >
              <Star className="w-3 h-3 mr-1 fill-current" />
              Premium
            </Badge>
          )}
          {exam.is_free && (
            <Badge className="bg-emerald-500 text-white text-xs border-0">
              Free
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-lg text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
          {exam.title}
        </h3>

        {/* Subject & Year */}
        <p className="text-sm text-muted-foreground mb-4">
          {exam.subject} • {exam.year}
        </p>

        {/* Stats Row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-5">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {exam.time_limit} min
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            {exam.question_count} Q's
          </span>
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            {exam.avg_score}% avg
          </span>
        </div>

        {/* Actions */}
        <Button
          className="w-full gap-2"
          onClick={() => onStart(exam.id)}
        >
          <Play className="w-4 h-4" />
          Start Exam
        </Button>
      </div>
    </div>
  );
}
