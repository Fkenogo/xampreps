import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkedStudent {
  id: string;
  name: string;
  email: string;
  level?: string;
  xp: number;
  streak: number;
  recentScore?: number;
}

export default function ParentDashboard() {
  const { profile, user } = useAuth();
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [loading, setLoading] = useState(true);

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

        if (profiles) {
          const students: LinkedStudent[] = profiles.map(p => {
            const studentProgress = progress?.find(pr => pr.user_id === p.id);
            return {
              id: p.id,
              name: p.name,
              email: p.email,
              level: p.level || undefined,
              xp: studentProgress?.xp || 0,
              streak: studentProgress?.streak || 0,
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
          
          <Button className="gap-2">
            <UserPlus className="w-4 h-4" />
            Link a Child
          </Button>
        </div>

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
            value="12h"
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
              <Button className="gap-2">
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
                      <p className="text-2xl font-bold text-foreground">--</p>
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
            <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {linkedStudents.length > 0 ? (
                <p className="text-muted-foreground text-sm">Activity tracking coming soon...</p>
              ) : (
                <p className="text-muted-foreground text-sm">Link a child to see their activity</p>
              )}
            </div>
          </div>

          {/* Weak Areas */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Areas Needing Attention</h3>
            <div className="space-y-4">
              {linkedStudents.length > 0 ? (
                <p className="text-muted-foreground text-sm">Analysis coming soon...</p>
              ) : (
                <p className="text-muted-foreground text-sm">Link a child to see areas needing attention</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
