import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import StatCard from '@/components/dashboard/StatCard';
import LinkRequestsCard from '@/components/dashboard/LinkRequestsCard';
import AddStudentDialog from '@/components/modals/AddStudentDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  TrendingUp, 
  BookOpen, 
  Trophy,
  Search,
  Download,
  UserPlus,
  BarChart3,
  GraduationCap,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface StudentData {
  id: string;
  name: string;
  email: string;
  level?: string;
  xp: number;
  streak: number;
  examsTaken: number;
}

export default function SchoolDashboardContent() {
  const { profile, user } = useAuth();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const fetchStudents = async () => {
    if (!user?.id) return;

    const { data: links } = await supabase
      .from('linked_accounts')
      .select('student_id')
      .eq('parent_or_school_id', user.id);

    if (links && links.length > 0) {
      const studentIds = links.map(l => l.student_id);
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', studentIds);

      const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .in('user_id', studentIds);

      const { data: attempts } = await supabase
        .from('exam_attempts')
        .select('user_id')
        .in('user_id', studentIds);

      if (profiles) {
        const studentData: StudentData[] = profiles.map(p => {
          const studentProgress = progress?.find(pr => pr.user_id === p.id);
          const studentAttempts = attempts?.filter(a => a.user_id === p.id).length || 0;
          return {
            id: p.id,
            name: p.name,
            email: p.email,
            level: p.level || undefined,
            xp: studentProgress?.xp || 0,
            streak: studentProgress?.streak || 0,
            examsTaken: studentAttempts,
          };
        });
        setStudents(studentData);
      }
    } else {
      setStudents([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, [user?.id]);

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalXP = students.reduce((acc, s) => acc + s.xp, 0);
  const totalExams = students.reduce((acc, s) => acc + s.examsTaken, 0);
  const avgStreak = students.length > 0
    ? Math.round(students.reduce((acc, s) => acc + s.streak, 0) / students.length)
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {profile?.school || 'School'} Dashboard 🏫
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage student performance
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
          <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
            <UserPlus className="w-4 h-4" />
            Add Student
          </Button>
        </div>
      </div>

      <AddStudentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchStudents}
      />

      {/* Link Requests */}
      <LinkRequestsCard />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={students.length}
          icon={Users}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCard
          title="Total Exams Taken"
          value={totalExams}
          icon={BookOpen}
          gradient="from-violet-500 to-purple-600"
        />
        <StatCard
          title="Avg Student Streak"
          value={`${avgStreak} days`}
          icon={TrendingUp}
          gradient="from-emerald-500 to-teal-500"
        />
        <StatCard
          title="Total XP Earned"
          value={totalXP.toLocaleString()}
          icon={Trophy}
          gradient="from-amber-500 to-yellow-500"
        />
      </div>

      {/* Performance Overview */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Subject Performance */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Subject Performance</h3>
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            {['Mathematics', 'English', 'Science', 'Social Studies'].map((subject, i) => (
              <div key={subject}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground">{subject}</span>
                  <span className="text-muted-foreground">{75 - i * 5}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                    style={{ width: `${75 - i * 5}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Level Distribution */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Level Distribution</h3>
            <GraduationCap className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            {['PLE', 'UCE', 'UACE'].map((level) => {
              const count = students.filter(s => s.level === level).length;
              const percentage = students.length > 0 ? (count / students.length) * 100 : 0;
              return (
                <div key={level} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">{level}</span>
                    </div>
                    <span className="text-foreground">{count} students</span>
                  </div>
                  <span className="text-muted-foreground">{Math.round(percentage)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Top Performers</h3>
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <div className="space-y-3">
            {students
              .sort((a, b) => b.xp - a.xp)
              .slice(0, 5)
              .map((student, index) => (
                <div key={student.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-amber-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-amber-700 text-white' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.xp} XP</p>
                  </div>
                </div>
              ))}
            {students.length === 0 && (
              <p className="text-sm text-muted-foreground">No students linked yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="font-semibold text-foreground">All Students</h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="font-semibold text-foreground mb-2">No students yet</h4>
            <p className="text-muted-foreground text-sm mb-4">Add students to start tracking their progress</p>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add Student
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="text-center">XP</TableHead>
                <TableHead className="text-center">Streak</TableHead>
                <TableHead className="text-center">Exams</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      {student.level || 'PLE'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-medium">{student.xp}</TableCell>
                  <TableCell className="text-center">
                    {student.streak > 0 ? (
                      <span className="text-orange-500">🔥 {student.streak}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{student.examsTaken}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}