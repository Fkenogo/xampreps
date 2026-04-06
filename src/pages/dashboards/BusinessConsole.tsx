import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  UserCog,
  BarChart3,
  Database,
  FileText,
  AlertTriangle
} from 'lucide-react';
import type { AppRole } from '@/contexts/AuthContext';

const roleOptions: { value: AppRole | ''; label: string; icon: any }[] = [
  { value: '', label: 'Super Admin (default)', icon: Shield },
  { value: 'student', label: 'Student View', icon: GraduationCap },
  { value: 'parent', label: 'Parent View', icon: Users },
  { value: 'school', label: 'School View', icon: Building },
  { value: 'admin', label: 'Admin View', icon: UserCog },
];

const consoleCards = [
  { title: 'Users', value: '—', icon: Users, description: 'Total registered users', color: 'text-blue-500' },
  { title: 'Exams', value: '—', icon: BookOpen, description: 'Available exam papers', color: 'text-green-500' },
  { title: 'Active Sessions', value: '—', icon: BarChart3, description: 'Current active users', color: 'text-purple-500' },
  { title: 'Database', value: '—', icon: Database, description: 'Firestore status', color: 'text-amber-500' },
];

export default function BusinessConsole() {
  const navigate = useNavigate();
  const { user, isSuperAdmin, viewAsRole, setViewAsRole, effectiveRole, role } = useAuth();
  const [selectedView, setSelectedView] = useState<AppRole | ''>('');

  // View As is UI-only - it only changes what the sidebar/navigation shows
  // It does NOT trigger navigation or affect route access
  const handleViewChange = (value: AppRole | '') => {
    setSelectedView(value);
    setViewAsRole(value || null);
  };

  // Navigate to a role-specific dashboard WITHOUT setting viewAsRole
  // The user's real role (super_admin) still controls access
  const handleNavigateToRoleDashboard = (targetRole: AppRole) => {
    // Don't set viewAsRole here - that would trigger a redirect loop
    // Just navigate to the dashboard. The ProtectedRoute will allow
    // super_admin access to all dashboards.
    navigate(`/dashboard/${targetRole}`);
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">XamPreps Business Console</h1>
                <p className="text-sm text-muted-foreground">
                  Super Administrator Dashboard
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

        {/* View As Switcher */}
        <Card className="border-violet-200 bg-violet-50/50 dark:bg-violet-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-violet-500" />
              View As Role Switcher
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
                    <SelectItem key={option.value || 'default'} value={option.value}>
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
              {selectedView && (
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

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/dashboard/admin')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Admin Panel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Manage content</span>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/exams')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Exam Library</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Browse exams</span>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/forum')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Forum</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Community</span>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/settings')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Configuration</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {consoleCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Platform health and configuration overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Firebase Authentication</span>
                </div>
                <Badge variant="outline" className="text-green-600">Operational</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Firestore Database</span>
                </div>
                <Badge variant="outline" className="text-green-600">Operational</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="font-medium">Payment System</span>
                </div>
                <Badge variant="outline" className="text-amber-600">Not Configured</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Cloud Functions</span>
                </div>
                <Badge variant="outline" className="text-green-600">Operational</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}