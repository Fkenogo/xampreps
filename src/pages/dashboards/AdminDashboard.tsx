import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  adminDashboardSummaryFirebase,
  adminListSchoolAdminCandidatesFirebase,
  adminListSchoolsFirebase,
  adminListExamsFirebase,
  type AdminSchoolAdminCandidate,
} from '@/integrations/firebase/admin';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
import ExamEditDialog from '@/components/admin/ExamEditDialog';
import CreateSchoolDialog from '@/components/admin/CreateSchoolDialog';
import AddUserDialog from '@/components/admin/AddUserDialog';
import IdentityOpsPanel from '@/components/admin/IdentityOpsPanel';
import V2AnswerSuggestionsPanel from '@/components/admin/V2AnswerSuggestionsPanel';
import V2TeacherReviewActionsPanel from '@/components/admin/V2TeacherReviewActionsPanel';
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
  MessageSquare,
  Building2,
  Wrench,
  GraduationCap,
  UserCheck,
  PieChart,
  Activity,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AdminForumModeration from '@/components/admin/AdminForumModeration';
import PricingPlansAdmin from '@/components/admin/PricingPlansAdmin';

type AppRole = 'student' | 'parent' | 'teacher' | 'school_admin' | 'school' | 'admin' | 'super_admin';
type Exam = {
  id: string;
  title: string;
  subject: string;
  level: 'PLE' | 'UCE' | 'UACE';
  year: number;
  type: 'Past Paper' | 'Practice Paper';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  time_limit: number;
  is_free: boolean;
  description: string | null;
  topic: string | null;
  question_count: number;
  explanation_pdf_url: string | null;
};

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

interface SchoolData {
  schoolId: string;
  name: string;
  shortName?: string | null;
  registrationNumber?: string | null;
  country: string;
  district?: string | null;
  schoolType: 'primary' | 'secondary' | 'mixed' | 'other';
  status: 'pending' | 'active' | 'suspended' | 'archived';
  subscriptionTier: 'free' | 'premium' | 'enterprise';
  onboardingMode: 'admin_created' | 'request_approved';
  primaryAdminUid?: string | null;
  createdAt: string | null;
  primaryAdmin?: {
    uid: string;
    name: string;
    email: string;
  } | null;
}

// Import role-specific dashboard content components
import StudentDashboardPreviewContent from './StudentDashboardContent';
import ParentDashboardContent from './ParentDashboardContent';
import { TeacherDashboardContent } from './TeacherDashboard';
import { SchoolAdminDashboardContent } from './SchoolAdminDashboard';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile, role } = useAuth();
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
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [schoolDialogOpen, setSchoolDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole>('all');
  const [schoolAdminCandidates, setSchoolAdminCandidates] = useState<AdminSchoolAdminCandidate[]>([]);
  const [schoolAdminCandidatesLoaded, setSchoolAdminCandidatesLoaded] = useState(false);

  // Computed analytics from loaded data
  const [roleDistribution, setRoleDistribution] = useState<Record<string, number>>({});
  const [examByLevel, setExamByLevel] = useState<Record<string, number>>({});
  const [examBySubject, setExamBySubject] = useState<Record<string, number>>({});
  const [activeSchools, setActiveSchools] = useState(0);

  useEffect(() => {
    // Compute role distribution
    const distribution: Record<string, number> = {};
    users.forEach((u) => {
      distribution[u.role] = (distribution[u.role] || 0) + 1;
    });
    setRoleDistribution(distribution);
  }, [users]);

  useEffect(() => {
    // Compute exam by level
    const byLevel: Record<string, number> = {};
    exams.forEach((e) => {
      byLevel[e.level] = (byLevel[e.level] || 0) + 1;
    });
    setExamByLevel(byLevel);
  }, [exams]);

  useEffect(() => {
    // Compute exam by subject
    const bySubject: Record<string, number> = {};
    exams.forEach((e) => {
      bySubject[e.subject] = (bySubject[e.subject] || 0) + 1;
    });
    setExamBySubject(bySubject);
  }, [exams]);

  useEffect(() => {
    // Compute active schools
    const active = schools.filter((s) => s.status === 'active').length;
    setActiveSchools(active);
  }, [schools]);

  const fetchUsers = async () => {
    try {
      const result = await adminDashboardSummaryFirebase();
      if (result.ok) {
        setUsers(result.users as unknown as UserData[]);
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Failed to load admin dashboard summary:', error);
    }
  };

  const fetchExams = async () => {
    try {
      const result = await adminListExamsFirebase();
      if (result.ok) setExams(result.items as Exam[]);
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    }
  };

  const fetchSchools = async () => {
    try {
      const result = await adminListSchoolsFirebase();
      if (result.ok) {
        setSchools(result.items);
      }
    } catch (error) {
      console.error('Failed to fetch schools:', error);
    }
  };

  const fetchSchoolAdminCandidates = async () => {
    try {
      setSchoolAdminCandidatesLoaded(false);
      const result = await adminListSchoolAdminCandidatesFirebase();
      if (result.ok) {
        setSchoolAdminCandidates(result.items);
      }
    } catch (error) {
      console.error('Failed to fetch school admin candidates:', error);
      setSchoolAdminCandidates([]);
    } finally {
      setSchoolAdminCandidatesLoaded(true);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([fetchUsers(), fetchExams(), fetchSchools(), fetchSchoolAdminCandidates()]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEditExam = (exam: Exam) => {
    setSelectedExam(exam);
    setEditDialogOpen(true);
  };

  const handleCreateExam = () => {
    setSelectedExam(null);
    setEditDialogOpen(true);
  };

  const handlePreviewExam = (examId: string, mode: 'practice' | 'simulation') => {
    navigate(`/exams/${examId}?mode=${mode}`);
  };

  const handleEditQuestions = (exam: Exam) => {
    navigate(`/dashboard/admin/v2-exams/${exam.id}/edit`);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'bg-red-500/10 text-red-600';
      case 'teacher': return 'bg-indigo-500/10 text-indigo-600';
      case 'school_admin': return 'bg-cyan-500/10 text-cyan-600';
      case 'school': return 'bg-blue-500/10 text-blue-600';
      case 'parent': return 'bg-amber-500/10 text-amber-600';
      default: return 'bg-emerald-500/10 text-emerald-600';
    }
  };

  const formatRoleLabel = (role: AppRole) => {
    switch (role) {
      case 'school_admin':
        return 'School Admin';
      case 'super_admin':
        return 'Super Admin';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
    }
  };

  // Render different dashboard content based on preview role
  if (previewRole === 'student') {
    return (
      <DashboardLayout previewRole={previewRole} onPreviewRoleChange={setPreviewRole}>
        <StudentDashboardPreviewContent />
      </DashboardLayout>
    );
  }

  if (previewRole === 'parent') {
    return (
      <DashboardLayout previewRole={previewRole} onPreviewRoleChange={setPreviewRole}>
        <ParentDashboardContent previewMode />
      </DashboardLayout>
    );
  }

  if (previewRole === 'school') {
    return (
      <DashboardLayout previewRole={previewRole} onPreviewRoleChange={setPreviewRole}>
        <div className="max-w-3xl mx-auto rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          The legacy school dashboard is disabled. Use school admin preview instead.
        </div>
      </DashboardLayout>
    );
  }

  if (previewRole === 'teacher') {
    return (
      <DashboardLayout previewRole={previewRole} onPreviewRoleChange={setPreviewRole}>
        <TeacherDashboardContent previewMode />
      </DashboardLayout>
    );
  }

  if (previewRole === 'school_admin') {
    return (
      <DashboardLayout previewRole={previewRole} onPreviewRoleChange={setPreviewRole}>
        <SchoolAdminDashboardContent previewMode />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout previewRole={previewRole} onPreviewRoleChange={setPreviewRole}>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* ===== COMPACT HEADER ===== */}
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <div>
            <span className="text-sm font-medium text-primary">Admin Dashboard</span>
            <h1 className="text-xl font-semibold text-foreground leading-tight">
              {profile?.name?.split(' ')[0] ? `${profile.name.split(' ')[0]}` : 'Dashboard'}
            </h1>
          </div>
        </div>

        {/* ===== STATS ROW (SECONDARY) ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            title="Users"
            value={stats.totalUsers}
            icon={Users}
            gradient="from-blue-500 to-cyan-500"
          />
          <StatCard
            title="Exams"
            value={stats.totalExams}
            icon={BookOpen}
            gradient="from-violet-500 to-purple-600"
          />
          <StatCard
            title="Attempts"
            value={stats.totalAttempts}
            icon={FileText}
            gradient="from-emerald-500 to-teal-500"
          />
          <StatCard
            title="Active Schools"
            value={activeSchools}
            icon={Building2}
            gradient="from-blue-500 to-indigo-500"
          />
        </div>

        {/* ===== WORKSPACE TABS ===== */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="exams" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Exams
            </TabsTrigger>
            <TabsTrigger value="schools" className="gap-2">
              <Building2 className="w-4 h-4" />
              Schools
            </TabsTrigger>
            <TabsTrigger value="identity-ops" className="gap-2">
              <Wrench className="w-4 h-4" />
              Identity Ops
            </TabsTrigger>
            <TabsTrigger value="content-feedback" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Content Feedback
            </TabsTrigger>
            <TabsTrigger value="teacher-activity" className="gap-2">
              <Activity className="w-4 h-4" />
              Teacher Activity
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <PieChart className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="community" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Community
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Plans
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">User Management</h3>
                    <p className="text-xs text-muted-foreground">All registered users across the platform</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative w-56">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                    <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as 'all' | AppRole)}>
                      <SelectTrigger className="w-[160px] h-9">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All roles</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="school_admin">School Admin</SelectItem>
                        <SelectItem value="school">Legacy School</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button className="gap-2 h-9" onClick={() => setAddUserDialogOpen(true)}>
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
                <div className="p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/3">User</TableHead>
                        <TableHead className="w-1/4">Role</TableHead>
                        <TableHead className="w-1/4">Joined</TableHead>
                        <TableHead className="w-1/6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-xs font-medium">
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-foreground text-sm">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                              {formatRoleLabel(user.role)}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8">Actions</Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled>
                                  Lifecycle actions coming soon
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No users found matching your search criteria.
                    </div>
                  )}
                </div>
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
                    V2 Exam Status
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
                  <h4 className="font-semibold text-foreground mb-2">No V2 exams yet</h4>
                  <p className="text-muted-foreground text-sm mb-4">Seed or import V2 data to populate the library.</p>
                  <Button className="gap-2" onClick={handleCreateExam}>
                    <Plus className="w-4 h-4" />
                    V2 Exam Status
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
                                V2 Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditQuestions(exam)}>
                                <ListOrdered className="w-4 h-4 mr-2" />
                                Edit V2 Exam
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePreviewExam(exam.id, 'practice')}>
                                <Eye className="w-4 h-4 mr-2" />
                                Preview (Practice)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePreviewExam(exam.id, 'simulation')}>
                                <Play className="w-4 h-4 mr-2" />
                                Preview (Simulation)
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

          <TabsContent value="schools">
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground">School Organizations ({schools.length})</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Additive Phase 3 foundation. These are institution records, not login users.
                    </p>
                  </div>
                  <Button className="gap-2" onClick={() => setSchoolDialogOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Create School
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : schools.length === 0 ? (
                <div className="p-12 text-center">
                  <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="font-semibold text-foreground mb-2">No school organizations yet</h4>
                  <p className="text-muted-foreground text-sm mb-4">
                    Create a `schools/{'{schoolId}'}` record and link the first `school_admin`.
                  </p>
                  <Button className="gap-2" onClick={() => setSchoolDialogOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Create School
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Primary Admin</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map((school) => (
                      <TableRow key={school.schoolId}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{school.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {school.shortName || school.schoolId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{school.schoolType}</TableCell>
                        <TableCell>{school.country}</TableCell>
                        <TableCell>
                          {school.primaryAdmin ? (
                            <div>
                              <p className="text-sm font-medium text-foreground">{school.primaryAdmin.name}</p>
                              <p className="text-xs text-muted-foreground">{school.primaryAdmin.email || school.primaryAdmin.uid}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-600">
                            {school.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {school.createdAt ? new Date(school.createdAt).toLocaleDateString() : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="content-feedback">
            <V2AnswerSuggestionsPanel />
          </TabsContent>

          <TabsContent value="teacher-activity">
            <V2TeacherReviewActionsPanel />
          </TabsContent>

          <TabsContent value="identity-ops">
            <IdentityOpsPanel
              isSuperAdmin={role === 'super_admin'}
              onUsersChanged={fetchUsers}
              onSchoolsChanged={fetchSchools}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* User Role Distribution */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-foreground">User Distribution</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(roleDistribution)
                    .sort((a, b) => b[1] - a[1])
                    .map(([roleKey, count]) => (
                      <div key={roleKey} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{formatRoleLabel(roleKey as AppRole)}</span>
                        <span className="font-medium text-foreground">{count}</span>
                      </div>
                    ))}
                  {Object.keys(roleDistribution).length === 0 && (
                    <p className="text-sm text-muted-foreground">No user data available</p>
                  )}
                </div>
              </div>

              {/* Exam by Level */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="w-5 h-5 text-violet-500" />
                  <h3 className="font-semibold text-foreground">Exams by Level</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(examByLevel)
                    .sort()
                    .map(([level, count]) => (
                      <div key={level} className="flex items-center justify-between">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                          {level}
                        </span>
                        <span className="font-medium text-foreground">{count}</span>
                      </div>
                    ))}
                  {Object.keys(examByLevel).length === 0 && (
                    <p className="text-sm text-muted-foreground">No exam data available</p>
                  )}
                </div>
              </div>

              {/* Exam by Subject */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-semibold text-foreground">Exams by Subject</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(examBySubject)
                    .sort((a, b) => b[1] - a[1])
                    .map(([subject, count]) => (
                      <div key={subject} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{subject}</span>
                        <span className="font-medium text-foreground">{count}</span>
                      </div>
                    ))}
                  {Object.keys(examBySubject).length === 0 && (
                    <p className="text-sm text-muted-foreground">No exam data available</p>
                  )}
                </div>
              </div>

              {/* School Summary */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-semibold text-foreground">School Summary</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Schools</span>
                    <span className="font-medium text-foreground">{schools.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active</span>
                    <span className="font-medium text-emerald-600">{activeSchools}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <span className="font-medium text-amber-600">
                      {schools.filter((s) => s.status === 'pending').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Assigned Admin</span>
                    <span className="font-medium text-foreground">
                      {schools.filter((s) => s.primaryAdmin).length}
                    </span>
                  </div>
                  {schools.length === 0 && (
                    <p className="text-sm text-muted-foreground">No school data available</p>
                  )}
                </div>
              </div>

              {/* Platform Activity */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-cyan-500" />
                  <h3 className="font-semibold text-foreground">Platform Activity</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Attempts</span>
                    <span className="font-medium text-foreground">{stats.totalAttempts}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Exams Available</span>
                    <span className="font-medium text-foreground">{stats.totalExams}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Questions in Library</span>
                    <span className="font-medium text-foreground">
                      {exams.reduce((sum, e) => sum + (e.question_count || 0), 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-semibold text-foreground">System Status</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-sm text-muted-foreground">Firebase Auth</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-sm text-muted-foreground">Firestore</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-sm text-muted-foreground">Cloud Functions</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community">
            <AdminForumModeration />
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans">
            <PricingPlansAdmin />
          </TabsContent>
        </Tabs>

        {/* Exam Edit Dialog */}
        <ExamEditDialog
          exam={selectedExam}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSaved={fetchExams}
        />
        <CreateSchoolDialog
          open={schoolDialogOpen}
          onOpenChange={setSchoolDialogOpen}
          schoolAdminCandidates={schoolAdminCandidates}
          candidatesLoaded={schoolAdminCandidatesLoaded}
          onCreated={fetchSchools}
        />

        <AddUserDialog
          open={addUserDialogOpen}
          onOpenChange={setAddUserDialogOpen}
          onCreated={async () => {
            await Promise.all([fetchUsers(), fetchSchoolAdminCandidates()]);
          }}
        />

        <Dialog open={selectedUser !== null} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Read-only identity snapshot for the current admin tooling phase.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium text-foreground">{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground">{selectedUser.email || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium text-foreground">{formatRoleLabel(selectedUser.role)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium text-foreground">
                    {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">UID</p>
                  <p className="font-mono text-xs text-foreground break-all">{selectedUser.id}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
