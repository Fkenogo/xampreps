import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface DayData {
  day: string;
  exams: number;
  avgScore: number;
}

interface WeeklyProgressChartProps {
  className?: string;
}

export default function WeeklyProgressChart({ className }: WeeklyProgressChartProps) {
  const { profile } = useAuth();
  const [data, setData] = useState<DayData[]>([]);
  const [trend, setTrend] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyData = async () => {
      if (!profile?.id) return;

      const today = new Date();
      const weekData: DayData[] = [];

      // Get data for last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dayStart = startOfDay(date).toISOString();
        const dayEnd = endOfDay(date).toISOString();

        const { data: attempts } = await supabase
          .from('exam_attempts')
          .select('score, total_questions')
          .eq('user_id', profile.id)
          .gte('completed_at', dayStart)
          .lte('completed_at', dayEnd);

        const exams = attempts?.length || 0;
        const avgScore = attempts && attempts.length > 0
          ? Math.round(
              attempts.reduce((acc, a) => acc + (a.score / a.total_questions) * 100, 0) / attempts.length
            )
          : 0;

        weekData.push({
          day: format(date, 'EEE'),
          exams,
          avgScore,
        });
      }

      setData(weekData);

      // Calculate trend
      const thisWeekExams = weekData.slice(4).reduce((a, b) => a + b.exams, 0);
      const lastWeekExams = weekData.slice(0, 3).reduce((a, b) => a + b.exams, 0);
      
      if (thisWeekExams > lastWeekExams) setTrend('up');
      else if (thisWeekExams < lastWeekExams) setTrend('down');
      else setTrend('neutral');

      setLoading(false);
    };

    fetchWeeklyData();
  }, [profile?.id]);

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  const totalExams = data.reduce((a, b) => a + b.exams, 0);
  const avgScore = data.filter(d => d.avgScore > 0).length > 0
    ? Math.round(data.filter(d => d.avgScore > 0).reduce((a, b) => a + b.avgScore, 0) / data.filter(d => d.avgScore > 0).length)
    : 0;

  if (loading) {
    return (
      <div className={cn('bg-card rounded-2xl border border-border p-6', className)}>
        <h3 className="font-semibold text-foreground mb-4">This Week</h3>
        <div className="h-40 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className={cn('bg-card rounded-2xl border border-border p-6 animate-fade-in', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">This Week</h3>
        <div className={cn('flex items-center gap-1 text-sm', trendColor)}>
          <TrendIcon className="w-4 h-4" />
          <span className="font-medium">
            {trend === 'up' ? 'Improving' : trend === 'down' ? 'Keep going' : 'Steady'}
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 rounded-xl bg-primary/5">
          <p className="text-2xl font-bold text-primary">{totalExams}</p>
          <p className="text-xs text-muted-foreground">Exams taken</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-emerald-500/10">
          <p className="text-2xl font-bold text-emerald-600">{avgScore}%</p>
          <p className="text-xs text-muted-foreground">Avg score</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={20}>
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis hide />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as DayData;
                  return (
                    <div className="bg-popover border border-border rounded-lg p-2 shadow-lg text-xs">
                      <p className="font-medium">{d.exams} exams</p>
                      {d.avgScore > 0 && <p className="text-muted-foreground">{d.avgScore}% avg</p>}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="exams" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.exams > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
