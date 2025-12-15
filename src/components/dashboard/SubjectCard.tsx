import { cn } from '@/lib/utils';
import { LucideIcon, BookOpen, FlaskConical, Globe, Calculator, Palette, Music } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface SubjectCardProps {
  subject: string;
  progress: number;
  examCount: number;
  level?: string;
  className?: string;
  delay?: number;
}

const subjectConfig: Record<string, { icon: LucideIcon; gradient: string }> = {
  Mathematics: { icon: Calculator, gradient: 'from-blue-500 to-cyan-500' },
  Science: { icon: FlaskConical, gradient: 'from-emerald-500 to-teal-500' },
  English: { icon: BookOpen, gradient: 'from-violet-500 to-purple-500' },
  'Social Studies': { icon: Globe, gradient: 'from-orange-500 to-amber-500' },
  Art: { icon: Palette, gradient: 'from-pink-500 to-rose-500' },
  Music: { icon: Music, gradient: 'from-indigo-500 to-blue-500' },
};

export default function SubjectCard({
  subject,
  progress,
  examCount,
  level = 'PLE',
  className,
  delay = 0,
}: SubjectCardProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const config = subjectConfig[subject] || { icon: BookOpen, gradient: 'from-primary to-primary/80' };
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, delay + 300);
    return () => clearTimeout(timer);
  }, [progress, delay]);

  return (
    <Link
      to={`/exams?subject=${encodeURIComponent(subject)}&level=${level}`}
      className={cn(
        'group block bg-card rounded-2xl border border-border p-5 transition-all',
        'hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1',
        'opacity-0 animate-scale-in',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3',
            config.gradient
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {examCount} exams
        </span>
      </div>

      <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{subject}</h3>
      
      {/* Progress Bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-1000 ease-out',
            config.gradient
          )}
          style={{ width: `${animatedProgress}%` }}
        />
        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer" />
      </div>
      
      <p className="text-sm text-muted-foreground">{progress}% mastery</p>
    </Link>
  );
}
