import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  gradient?: string;
  className?: string;
  animate?: boolean;
  delay?: number;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  gradient = 'from-primary to-primary/80',
  className,
  animate = true,
  delay = 0,
}: StatCardProps) {
  const numericValue = typeof value === 'string' ? parseInt(value.replace(/,/g, ''), 10) : value;
  const isNumeric = !isNaN(numericValue);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-card border border-border p-6 transition-all',
        'hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1',
        'opacity-0 animate-scale-in',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background Decoration */}
      <div className={cn('absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br opacity-10', gradient)} />
      
      {/* Animated glow effect */}
      <div className={cn('absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br opacity-0 hover:opacity-20 transition-opacity duration-500', gradient)} />
      
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <div className="text-3xl font-bold text-foreground mt-2">
            {animate && isNumeric ? (
              <AnimatedCounter value={numericValue} duration={1200} />
            ) : (
              value
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-sm font-medium',
              trend.positive ? 'text-emerald-600' : 'text-red-500'
            )}>
              <span className={cn(
                'transition-transform duration-300',
                trend.positive ? 'animate-bounce-soft' : ''
              )}>
                {trend.positive ? '↑' : '↓'}
              </span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground font-normal">vs last week</span>
            </div>
          )}
        </div>
        
        <div className={cn(
          'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg',
          'group-hover:scale-110 transition-transform duration-300',
          gradient
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
