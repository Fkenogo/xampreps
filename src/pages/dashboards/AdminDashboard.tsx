import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
import ExamEditDialog from '@/components/admin/ExamEditDialog';
import QuestionEditor from '@/components/admin/QuestionEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  BookOpen, 
  Trophy,
  CreditCard,
  Search,
  Plus,
  Settings,
  Shield,
  TrendingUp,
  FileText,
  Eye,
  Edit,
  Play,
  ListOrdered,
  Copy,
  Loader2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];
type Exam = Database['public']['Tables']['exams']['Row'];

interface UserData {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  createdAt: string;
}

interface ExamData {
  id: string;
  title: string;
  subject: string;
  level: string;
  year: number;
  isFree: boolean;
  questionCount: number;
}

// Import role-specific dashboard content components
import StudentDashboardContent from './StudentDashboardContent';
import ParentDashboardContent from './ParentDashboardContent';
import SchoolDashboardContent from './SchoolDashboardContent';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [previewRole, setPreviewRole] = useState<AppRole | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalExams: 0,
    totalAttempts: 0,
    premiumUsers: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [editingQuestionsExam, setEditingQuestionsExam] = useState<Exam | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .limit(100);

      const { data: roles } = await supabase
        .from('user_roles')
        .select('*');

      if (profiles && roles) {
        const usersData: UserData[] = profiles.map(p => {
          const userRole = roles.find(r => r.user_id === p.id);
          return {
            id: p.id,
            name: p.name,
            email: p.email,
            role: userRole?.role || 'student',
            createdAt: p.created_at,
          };
        });
        setUsers(usersData);
      }

      // Fetch exams
      const { data: examsData } = await supabase
        .from('exams')
        .select('*')
        .order('year', { ascending: false })
        .limit(100);

      if (examsData) {
        setExams(examsData);
      }

      // Fetch stats
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: examCount } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true });

      const { count: attemptCount } = await supabase
        .from('exam_attempts')
        .select('*', { count: 'exact', head: true });

      const { count: premiumCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('plan', 'Premium');

      setStats({
        totalUsers: userCount || 0,
        totalExams: examCount || 0,
        totalAttempts: attemptCount || 0,
        premiumUsers: premiumCount || 0,
      });

      setLoading(false);
    };

    fetchData();
  }, []);

  const fetchExams = async () => {
    const { data: examsData } = await supabase
      .from('exams')
      .select('*')
      .order('year', { ascending: false })
      .limit(100);
    if (examsData) setExams(examsData);
  };

  const handleEditExam = (exam: Exam) => {
    setSelectedExam(exam);
    setEditDialogOpen(true);
  };

  const handleCreateExam = () => {
    setSelectedExam(null);
    setEditDialogOpen(true);
  };

  const handlePreviewExam = (examId: string, mode: 'practice' | 'simulation') => {
    navigate(`/exam/${examId}?mode=${mode}`);
  };

  const handleEditQuestions = (exam: Exam) => {
    setEditingQuestionsExam(exam);
  };

  const handleDuplicateExam = async (exam: Exam) => {
    setDuplicating(exam.id);
    try {
      // Create new exam with copied details
      const { data: newExam, error: examError } = await supabase
        .from('exams')
        .insert({
          title: `${exam.title} (Copy)`,
          subject: exam.subject,
          level: exam.level,
          year: exam.year,
          type: exam.type,
          difficulty: exam.difficulty,
          time_limit: exam.time_limit,
          is_free: exam.is_free,
          description: exam.description,
          topic: exam.topic,
          question_count: 0,
        })
        .select()
        .single();

      if (examError) throw examError;

      // Fetch original questions
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', exam.id)
        .order('question_number');

      if (questionsError) throw questionsError;

      // Duplicate questions and their parts
      for (const question of questions || []) {
        const { data: newQuestion, error: newQuestionError } = await supabase
          .from('questions')
          .insert({
            exam_id: newExam.id,
            question_number: question.question_number,
            text: question.text,
            image_url: question.image_url,
            table_data: question.table_data,
          })
          .select()
          .single();

        if (newQuestionError) throw newQuestionError;

        // Fetch and duplicate parts
        const { data: parts, error: partsError } = await supabase
          .from('question_parts')
          .select('*')
          .eq('question_id', question.id)
          .order('order_index');

        if (partsError) throw partsError;

        for (const part of parts || []) {
          const { error: partError } = await supabase
            .from('question_parts')
            .insert({
              question_id: newQuestion.id,
              text: part.text,
              answer: part.answer,
              explanation: part.explanation,
              marks: part.marks,
              order_index: part.order_index,
              answer_type: part.answer_type,
            });

          if (partError) throw partError;
        }
      }

      // Update question count
      await supabase
        .from('exams')
        .update({ question_count: questions?.length || 0 })
        .eq('id', newExam.id);

      await fetchExams();
      
      // Auto-open the new exam for editing
      setSelectedExam(newExam);
      setEditDialogOpen(true);
    } catch (error: any) {
      console.error('Error duplicating exam:', error);
    } finally {
      setDuplicating(null);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'bg-red-500/10 text-red-600';
      case 'school': return 'bg-blue-500/10 text-blue-600';
      case 'parent': return 'bg-amber-500/10 text-amber-600';
      default: return 'bg-emerald-500/10 text-emerald-600';
    }
  };

  // If editing questions, show the question editor
  if (editingQuestionsExam) {
    return (
      <DashboardLayout previewRole={previewRole} onPreviewRoleChange={setPreviewRole}>
        <div className="max-w-7xl mx-auto">
          <QuestionEditor
            examId={editingQuestionsExam.id}
            examTitle={editingQuestionsExam.title}
            onBack={() => {
              setEditingQuestionsExam(null);
              fetchExams();
            }}
          />
        </div>
      </DashboardLayout>
    );
  }

  // Render different dashboard content based on preview role
  if (previewRole === 'student') {
    return (
      <DashboardLayout previewRole={previewRole} onPreviewRoleChange={setPreviewRole}>
        <StudentDashboardContent />
      </DashboardLayout>
    );
  }

  if (previewRole === 'parent') {
    return (
      <DashboardLayout previewRole={previewRole} onPreviewRoleChange={setPreviewRole}>
        <ParentDashboardContent />
      </DashboardLayout>
    );
  }

  if (previewRole === 'school') {
    return (
      <DashboardLayout previewRole={previewRole} onPreviewRoleChange={setPreviewRole}>
        <SchoolDashboardContent />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout previewRole={previewRole} onPreviewRoleChange={setPreviewRole}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium text-primary">Super Admin</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {profile?.name?.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your platform and monitor performance
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            gradient="from-blue-500 to-cyan-500"
            trend={{ value: 12, positive: true }}
          />
          <StatCard
            title="Total Exams"
            value={stats.totalExams}
            icon={BookOpen}
            gradient="from-violet-500 to-purple-600"
          />
          <StatCard
            title="Exam Attempts"
            value={stats.totalAttempts}
            icon={FileText}
            gradient="from-emerald-500 to-teal-500"
            trend={{ value: 8, positive: true }}
          />
          <StatCard
            title="Premium Users"
            value={stats.premiumUsers}
            icon={CreditCard}
            gradient="from-amber-500 to-yellow-500"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="exams" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Exams
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="font-semibold text-foreground">All Users ({users.length})</h3>
                  <div className="flex gap-3">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add User
                    </Button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-sm font-medium">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          {/* Exams Tab */}
          <TabsContent value="exams">
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="font-semibold text-foreground">All Exams ({exams.length})</h3>
                  <Button className="gap-2" onClick={handleCreateExam}>
                    <Plus className="w-4 h-4" />
                    Create Exam
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : exams.length === 0 ? (
                <div className="p-12 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="font-semibold text-foreground mb-2">No exams yet</h4>
                  <p className="text-muted-foreground text-sm mb-4">Create your first exam to get started</p>
                  <Button className="gap-2" onClick={handleCreateExam}>
                    <Plus className="w-4 h-4" />
                    Create Exam
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead className="text-center">Questions</TableHead>
                      <TableHead>Access</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exams.map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell className="font-medium text-foreground">
                          {exam.title}
                        </TableCell>
                        <TableCell>{exam.subject}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                            {exam.level}
                          </span>
                        </TableCell>
                        <TableCell>{exam.year}</TableCell>
                        <TableCell className="text-center">{exam.question_count}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            exam.is_free ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {exam.is_free ? 'Free' : 'Premium'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">Actions</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditExam(exam)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditQuestions(exam)}>
                                <ListOrdered className="w-4 h-4 mr-2" />
                                Edit Questions
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePreviewExam(exam.id, 'practice')}>
                                <Eye className="w-4 h-4 mr-2" />
                                Preview (Practice)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePreviewExam(exam.id, 'simulation')}>
                                <Play className="w-4 h-4 mr-2" />
                                Preview (Simulation)
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDuplicateExam(exam)}
                                disabled={duplicating === exam.id}
                              >
                                {duplicating === exam.id ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Copy className="w-4 h-4 mr-2" />
                                )}
                                Duplicate Exam
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">User Growth</h3>
                <p className="text-muted-foreground text-sm">Analytics charts coming soon...</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Exam Completions</h3>
                <p className="text-muted-foreground text-sm">Analytics charts coming soon...</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Revenue</h3>
                <p className="text-muted-foreground text-sm">Analytics charts coming soon...</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Popular Subjects</h3>
                <p className="text-muted-foreground text-sm">Analytics charts coming soon...</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Exam Edit Dialog */}
        <ExamEditDialog
          exam={selectedExam}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSaved={fetchExams}
        />
      </div>
    </DashboardLayout>
  );
}
