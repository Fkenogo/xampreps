import { cn } from '@/lib/utils';
import { Trophy, Star, Flame, Target, Zap, Award } from 'lucide-react';

interface AchievementBadgeProps {
  name: string;
  description: string;
  icon?: string;
  earned?: boolean;
  xpReward?: number;
  className?: string;
}

const iconMap: Record<string, React.ElementType> = {
  trophy: Trophy,
  star: Star,
  flame: Flame,
  target: Target,
  zap: Zap,
  award: Award,
};

export default function AchievementBadge({
  name,
  description,
  icon = 'trophy',
  earned = true,
  xpReward,
  className,
}: AchievementBadgeProps) {
  const Icon = iconMap[icon] || Trophy;

  return (
    <div
      className={cn(
        'relative group rounded-2xl p-4 transition-all',
        earned
          ? 'bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/10'
          : 'bg-muted/50 border border-border opacity-50',
        className
      )}
    >
      {/* Badge Icon */}
      <div
        className={cn(
          'w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 transition-transform group-hover:scale-110',
          earned
            ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-500/25'
            : 'bg-muted text-muted-foreground'
        )}
      >
        <Icon className="w-7 h-7" />
      </div>

      {/* Badge Info */}
      <div className="text-center">
        <p className={cn(
          'font-semibold text-sm',
          earned ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {name}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        {xpReward && earned && (
          <p className="text-xs font-medium text-amber-500 mt-2">+{xpReward} XP</p>
        )}
      </div>

      {/* Locked Overlay */}
      {!earned && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-2xl">
          <span className="text-2xl">🔒</span>
        </div>
      )}
    </div>
  );
}
