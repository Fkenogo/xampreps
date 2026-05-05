import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  BookOpen, 
  Settings, 
  Shield, 
  Eye,
  GraduationCap,
  Building,
  School,
  UserCog,
  BarChart3,
  FileText,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import type { AppRole } from '@/contexts/AuthContext';
import { getDashboardPathForRole } from '@/lib/auth-routing';
import {
  adminAuditCanonicalIdentityCoverageFirebase,
  adminRepairCanonicalIdentityCoverageFirebase,
  adminDashboardSummaryFirebase,
  type AdminIdentityCoverageReport,
  type AdminIdentityRepairReport,
} from '@/integrations/firebase/admin';

const SUPER_ADMIN_SENTINEL = 'super_admin_default';

const roleOptions: { value: AppRole | typeof SUPER_ADMIN_SENTINEL; label: string; icon: any }[] = [
  { value: SUPER_ADMIN_SENTINEL, label: 'Super Admin (default)', icon: Shield },
  { value: 'student', label: 'Student View', icon: GraduationCap },
  { value: 'parent', label: 'Parent View', icon: Users },
  { value: 'teacher', label: 'Teacher View', icon: FileText },
  { value: 'school_admin', label: 'School Admin View', icon: School },
  { value: 'school', label: 'Legacy School View', icon: Building },
  { value: 'admin', label: 'Admin View', icon: UserCog },
];


export default function BusinessConsole() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isSuperAdmin, viewAsRole, setViewAsRole, effectiveRole, role } = useAuth();
  const [selectedView, setSelectedView] = useState<AppRole | typeof SUPER_ADMIN_SENTINEL>(SUPER_ADMIN_SENTINEL);
  const [auditLoading, setAuditLoading] = useState(false);
  const [repairLoading, setRepairLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AdminIdentityCoverageReport | null>(null);
  const [repairResult, setRepairResult] = useState<AdminIdentityRepairReport | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Platform stats state
  const [platformStats, setPlatformStats] = useState({
    totalUsers: 0,
    totalExams: 0,
    totalAttempts: 0,
    premiumUsers: 0,
  });
  const [activeSchools, setActiveSchools] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch platform stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await adminDashboardSummaryFirebase();
        if (result.ok) {
          setPlatformStats(result.stats);
        }
      } catch (error) {
        console.error('[BusinessConsole] Failed to fetch platform stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Compute active schools from loaded data
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const { adminListSchoolsFirebase } = await import('@/integrations/firebase/admin');
        const result = await adminListSchoolsFirebase();
        if (result.ok) {
          const active = result.items.filter((s: any) => s.status === 'active').length;
          setActiveSchools(active);
        }
      } catch (error) {
        console.error('[BusinessConsole] Failed to fetch schools:', error);
      }
    };

    fetchSchools();
  }, []);

  // View As is UI-only - it only changes what the sidebar/navigation shows
  // It does NOT trigger navigation or affect route access
  const handleViewChange = (value: AppRole | typeof SUPER_ADMIN_SENTINEL) => {
    setSelectedView(value);
    setViewAsRole(value === SUPER_ADMIN_SENTINEL ? null : value);
  };

  // Navigate to a role-specific dashboard WITHOUT setting viewAsRole
  // The user's real role (super_admin) still controls access
  const handleNavigateToRoleDashboard = (targetRole: AppRole) => {
    const nextPath = getDashboardPathForRole(targetRole);
    if (location.pathname !== nextPath) {
      navigate(nextPath);
    }
  };

  const identityStatus = useMemo(() => {
    if (!auditResult) return 'Unknown';
    const missing =
      auditResult.missing.users.length +
      auditResult.missing.studentProfiles.length +
      auditResult.missing.adultProfiles.length;
    if (missing === 0) return 'Clean';
    if (repairResult) return 'Repair completed';
    return 'Repair needed';
  }, [auditResult, repairResult]);

  const runAudit = async () => {
    try {
      setAuditLoading(true);
      setAuditError(null);
      const result = await adminAuditCanonicalIdentityCoverageFirebase({ maxUsers: 2000 });
      setAuditResult(result);
      setRepairResult(null);
    } catch (error) {
      console.error('[BusinessConsole] Audit failed', error);
      setAuditError(error instanceof Error ? error.message : 'Audit failed');
    } finally {
      setAuditLoading(false);
    }
  };

  const runRepair = async () => {
    try {
      setRepairLoading(true);
      setAuditError(null);
      const result = await adminRepairCanonicalIdentityCoverageFirebase({ maxUsers: 2000 });
      setRepairResult(result);
      const audit = await adminAuditCanonicalIdentityCoverageFirebase({ maxUsers: 2000 });
      setAuditResult(audit);
    } catch (error) {
      console.error('[BusinessConsole] Repair failed', error);
      setAuditError(error instanceof Error ? error.message : 'Repair failed');
    } finally {
      setRepairLoading(false);
    }
  };

  const handleCopyAudit = async () => {
    if (!auditResult) return;
    await navigator.clipboard.writeText(JSON.stringify(auditResult, null, 2));
  };

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md text-center">
            <CardHeader>
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                The XamPreps Business Console is only accessible to super administrators.
              </p>
              <Button className="mt-4" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ===== ZONE 1: HEADER ===== */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Business Console</h1>
                <p className="text-sm text-muted-foreground">
                  Platform-wide operations and oversight
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="px-3 py-1 text-sm">
              <Shield className="w-3 h-3 mr-1" />
              Super Admin
            </Badge>
            <Badge variant="secondary" className="px-3 py-1 text-sm">
              {user?.email}
            </Badge>
          </div>
        </div>

        {/* ===== ZONE 2: PLATFORM OVERVIEW (Stats) ===== */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Platform Overview</h2>
            <p className="text-sm text-muted-foreground">Key signals across the entire platform</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Users
                </CardTitle>
                <Users className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsLoading ? '—' : platformStats.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total registered users
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Exams
                </CardTitle>
                <BookOpen className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsLoading ? '—' : platformStats.totalExams.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Available exam papers
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Exam Attempts
                </CardTitle>
                <BarChart3 className="w-4 h-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsLoading ? '—' : platformStats.totalAttempts.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total exam attempts
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Schools
                </CardTitle>
                <Building2 className="w-4 h-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsLoading ? '—' : activeSchools.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  School organizations
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ===== ZONE 3: CONTROL & NAVIGATION ===== */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Control & Navigation</h2>
            <p className="text-sm text-muted-foreground">Access management surfaces and preview user perspectives</p>
          </div>

          {/* Role Switcher */}
          <Card className="border-violet-200 bg-violet-50/50 dark:bg-violet-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-violet-500" />
                View As Role
              </CardTitle>
              <CardDescription>
                Preview the platform from different user perspectives without signing out.
                Your actual super admin privileges remain active.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Select
                  value={selectedView}
                  onValueChange={handleViewChange}
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Select view mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="w-4 h-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {viewAsRole && (
                  <Badge className="bg-violet-500">
                    Viewing as: {viewAsRole}
                  </Badge>
                )}
                {selectedView !== SUPER_ADMIN_SENTINEL && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigateToRoleDashboard(selectedView as AppRole)}
                  >
                    Go to {selectedView} Dashboard
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Current effective role: <strong>{effectiveRole}</strong> | 
                Real stored role: <strong>{role}</strong>
              </p>
            </CardContent>
          </Card>

          {/* Quick Launch Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/dashboard/admin')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Admin Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-muted-foreground">Users, exams & operations</span>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/exams')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Exam Library</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-muted-foreground">Browse all exams</span>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/forum')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Community</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-muted-foreground">Forum moderation</span>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/settings')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-muted-foreground">Platform settings</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ===== ZONE 4: SYSTEM CONTROLS ===== */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">System Controls</h2>
            <p className="text-sm text-muted-foreground">Monitor platform health and maintain data integrity</p>
          </div>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>
                Core platform services status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Auth</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Database</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Functions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="text-sm">Payments</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Identity Audit */}
          <Card>
          <CardHeader>
            <CardTitle>Identity Audit & Repair</CardTitle>
            <CardDescription>
              Review canonical identity coverage and repair missing records without using the browser console.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={runAudit} disabled={auditLoading}>
                {auditLoading ? 'Running audit…' : 'Run Audit'}
              </Button>
              <Button variant="outline" onClick={runRepair} disabled={repairLoading}>
                {repairLoading ? 'Repairing…' : 'Repair Missing Canonical Records'}
              </Button>
              <Badge variant="outline">Identity status: {identityStatus}</Badge>
            </div>

            {auditError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                {auditError}
              </div>
            ) : null}

            {auditResult ? (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Scanned Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{auditResult.scanned}</div>
                    <div className="text-xs text-muted-foreground">Total auth users scanned</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Missing Canonical Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{auditResult.missing.users.length}</div>
                    <div className="text-xs text-muted-foreground">users/{'{uid}'}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Missing Profiles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">students: {auditResult.missing.studentProfiles.length}</div>
                    <div className="text-sm text-muted-foreground">adults: {auditResult.missing.adultProfiles.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Legacy Profiles Fallback</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{auditResult.legacyFallback.profiles.length}</div>
                    <div className="text-xs text-muted-foreground">Still relying on profiles</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Legacy Roles Fallback</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{auditResult.legacyFallback.userRoles.length}</div>
                    <div className="text-xs text-muted-foreground">Still relying on user_roles</div>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {auditResult && (
              <div className="rounded-xl border border-border bg-background p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-foreground">Audit output (JSON)</div>
                  <Button size="sm" variant="outline" onClick={handleCopyAudit}>
                    Copy JSON
                  </Button>
                </div>
                <Textarea value={JSON.stringify(auditResult, null, 2)} readOnly className="h-48 font-mono text-xs" />
              </div>
            )}

            {auditResult && (auditResult.missing.users.length > 0 ||
              auditResult.missing.studentProfiles.length > 0 ||
              auditResult.missing.adultProfiles.length > 0) ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Legacy fallback cannot be removed yet. Run repair and re-audit before cutting over.
              </div>
            ) : null}

            {repairResult ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                Repair completed. Users repaired: {repairResult.repairedUsers}, student profiles repaired: {repairResult.repairedStudentProfiles}, adult profiles repaired: {repairResult.repairedAdultProfiles}.
              </div>
            ) : null}
          </CardContent>
        </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
