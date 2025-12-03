import { cn } from '@/lib/utils';

interface StreakCalendarProps {
  streak: number;
  lastExamDate?: string;
  className?: string;
}

export default function StreakCalendar({ streak, lastExamDate, className }: StreakCalendarProps) {
  const today = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Get the last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      active: i >= 7 - streak,
      isToday: i === 6,
    };
  });

  return (
    <div className={cn('bg-card rounded-2xl border border-border p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Weekly Streak</h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <span className="text-xl font-bold text-orange-500">{streak}</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {last7Days.map((day, index) => (
          <div key={index} className="text-center">
            <p className="text-xs text-muted-foreground mb-2">{day.day}</p>
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center mx-auto text-sm font-medium transition-all',
                day.active
                  ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-muted text-muted-foreground',
                day.isToday && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
              )}
            >
              {day.active ? '🔥' : day.date}
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground text-center mt-4">
        {streak > 0
          ? `Amazing! You've been studying for ${streak} days straight! 🎉`
          : "Start your streak today! Complete an exam to begin."}
      </p>
    </div>
  );
}
