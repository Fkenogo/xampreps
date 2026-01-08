import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
import LinkChildDialog from '@/components/modals/LinkChildDialog';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  UserPlus,
  Eye,
  BookOpen,
  Trophy,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

interface LinkedStudent {
  id: string;
  name: string;
  email: string;
  level?: string;
  xp: number;
  streak: number;
  avgScore: number;
  studyMinutesThisWeek: number;
  recentActivity: { date: string; score: number; examTitle: string }[];
}

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  useEffect(() => {
    const fetchLinkedStudents = async () => {
      if (!user?.id) return;

      const { data: links } = await supabase
        .from('linked_accounts')
        .select('student_id')
        .eq('parent_or_school_id', user.id);

      if (links && links.length > 0) {
        const studentIds = links.map(l => l.student_id);
        
        // Fetch student profiles and progress
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', studentIds);

        const { data: progress } = await supabase
          .from('user_progress')
          .select('*')
          .in('user_id', studentIds);

        // Fetch exam attempts for study time and scores
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
        
        const { data: attempts } = await supabase
          .from('exam_attempts')
          .select('*, exams(title)')
          .in('user_id', studentIds)
          .order('completed_at', { ascending: false });

        if (profiles) {
          const students: LinkedStudent[] = profiles.map(p => {
            const studentProgress = progress?.find(pr => pr.user_id === p.id);
            const studentAttempts = attempts?.filter(a => a.user_id === p.id) || [];
            
            // Calculate average score
            const avgScore = studentAttempts.length > 0
              ? Math.round(studentAttempts.reduce((acc, a) => acc + (a.score / a.total_questions) * 100, 0) / studentAttempts.length)
              : 0;
            
            // Calculate study time this week (based on time_taken from attempts)
            const weeklyAttempts = studentAttempts.filter(a => {
              const attemptDate = new Date(a.completed_at);
              return isWithinInterval(attemptDate, { start: weekStart, end: weekEnd });
            });
            const studyMinutesThisWeek = weeklyAttempts.reduce((acc, a) => acc + (a.time_taken || 0), 0) / 60;
            
            // Recent activity (last 5 attempts)
            const recentActivity = studentAttempts.slice(0, 5).map(a => ({
              date: a.completed_at,
              score: Math.round((a.score / a.total_questions) * 100),
              examTitle: (a.exams as any)?.title || 'Unknown Exam',
            }));

            return {
              id: p.id,
              name: p.name,
              email: p.email,
              level: p.level || undefined,
              xp: studentProgress?.xp || 0,
              streak: studentProgress?.streak || 0,
              avgScore,
              studyMinutesThisWeek,
              recentActivity,
            };
          });
          setLinkedStudents(students);
        }
      }
      setLoading(false);
    };

    fetchLinkedStudents();
  }, [user?.id]);

  const totalXP = linkedStudents.reduce((acc, s) => acc + s.xp, 0);
  const avgStreak = linkedStudents.length > 0 
    ? Math.round(linkedStudents.reduce((acc, s) => acc + s.streak, 0) / linkedStudents.length)
    : 0;
  const totalStudyHours = Math.round(linkedStudents.reduce((acc, s) => acc + s.studyMinutesThisWeek, 0) / 60 * 10) / 10;
  
  // Collect all recent activity across children
  const allRecentActivity = linkedStudents
    .flatMap(s => s.recentActivity.map(a => ({ ...a, studentName: s.name })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome, {profile?.name?.split(' ')[0] || 'Parent'}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor your children's learning progress
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => navigate('/forum')}>
              <MessageSquare className="w-4 h-4" />
              Community Forum
            </Button>
            <Button className="gap-2" onClick={() => setShowLinkDialog(true)}>
              <UserPlus className="w-4 h-4" />
              Link a Child
            </Button>
          </div>
        </div>

        <LinkChildDialog 
          open={showLinkDialog} 
          onOpenChange={setShowLinkDialog}
          onSuccess={() => window.location.reload()}
        />

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Linked Children"
            value={linkedStudents.length}
            icon={Users}
            gradient="from-blue-500 to-cyan-500"
          />
          <StatCard
            title="Combined XP"
            value={totalXP.toLocaleString()}
            icon={Trophy}
            gradient="from-amber-500 to-yellow-500"
          />
          <StatCard
            title="Avg Streak"
            value={`${avgStreak} days`}
            icon={TrendingUp}
            gradient="from-emerald-500 to-teal-500"
          />
          <StatCard
            title="Study Hours"
            value={`${totalStudyHours}h`}
            subtitle="This week"
            icon={Clock}
            gradient="from-violet-500 to-purple-600"
          />
        </div>

        {/* Children List */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Your Children</h2>
          
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : linkedStudents.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No children linked yet</h3>
              <p className="text-muted-foreground mb-6">
                Link your child's account to monitor their progress
              </p>
              <Button className="gap-2" onClick={() => setShowLinkDialog(true)}>
                <UserPlus className="w-4 h-4" />
                Link a Child
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {linkedStudents.map((student) => (
                <div
                  key={student.id}
                  className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:shadow-primary/5 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{student.name}</h3>
                        <p className="text-sm text-muted-foreground">{student.level || 'PLE'}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{student.xp}</p>
                      <p className="text-xs text-muted-foreground">XP</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{student.streak}</p>
                      <p className="text-xs text-muted-foreground">Streak</p>
                    </div>
                    <div className="text-center">
                      <p className={cn(
                        'text-2xl font-bold',
                        student.avgScore >= 70 ? 'text-emerald-500' : student.avgScore >= 50 ? 'text-amber-500' : 'text-foreground'
                      )}>
                        {student.avgScore > 0 ? `${student.avgScore}%` : '--'}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Score</p>
                    </div>
                  </div>

                  {student.streak === 0 && (
                    <div className="flex items-center gap-2 p-3 bg-amber-500/10 text-amber-600 rounded-xl text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Hasn't studied in a while</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Insights */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Activity Timeline */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              {allRecentActivity.length > 0 ? (
                allRecentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{activity.studentName}</p>
                      <p className="text-xs text-muted-foreground">{activity.examTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'text-sm font-bold',
                        activity.score >= 70 ? 'text-emerald-500' : activity.score >= 50 ? 'text-amber-500' : 'text-red-500'
                      )}>
                        {activity.score}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.date), 'MMM d')}
                      </p>
                    </div>
                  </div>
                ))
              ) : linkedStudents.length > 0 ? (
                <p className="text-muted-foreground text-sm">No recent activity yet</p>
              ) : (
                <p className="text-muted-foreground text-sm">Link a child to see their activity</p>
              )}
            </div>
          </div>

          {/* Study Summary */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Weekly Summary</h3>
            <div className="space-y-4">
              {linkedStudents.length > 0 ? (
                linkedStudents.map(student => (
                  <div key={student.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                        {student.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-foreground">{student.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">
                        {Math.round(student.studyMinutesThisWeek)} min
                      </p>
                      <p className="text-xs text-muted-foreground">this week</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">Link a child to see their summary</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
