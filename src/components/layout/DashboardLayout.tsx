import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, limit as fireLimit, query, where } from 'firebase/firestore';
import { getFirebaseDb } from '@/integrations/firebase/client';
import { cn } from '@/lib/utils';
import NotificationBell from '@/components/notifications/NotificationBell';
import RenewalReminder from '@/components/payment/RenewalReminder';
import {
  Home,
  BookOpen,
  Trophy,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  ChevronDown,
  Sparkles,
  BarChart3,
  Users,
  FileText,
  Shield,
  Eye,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
type AppRole = 'student' | 'parent' | 'school' | 'admin' | 'super_admin';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  previewRole?: AppRole | null;
  onPreviewRoleChange?: (role: AppRole | null) => void;
}

const roleNavItems: Record<AppRole, NavItem[]> = {
  student: [
    { label: 'Dashboard', href: '/dashboard/student', icon: Home },
    { label: 'Exams', href: '/exams', icon: BookOpen },
    { label: 'Achievements', href: '/achievements', icon: Trophy },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  parent: [
    { label: 'Dashboard', href: '/dashboard/parent', icon: Home },
    { label: 'Children', href: '/children', icon: Users },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  school: [
    { label: 'Dashboard', href: '/dashboard/school', icon: Home },
    { label: 'Students', href: '/students', icon: Users },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  admin: [
    { label: 'Dashboard', href: '/dashboard/admin', icon: Home },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Exams', href: '/admin/exams', icon: FileText },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  super_admin: [
    { label: 'Business Console', href: '/dashboard/business-console', icon: Shield },
    { label: 'Admin Panel', href: '/dashboard/admin', icon: Home },
    { label: 'Exams', href: '/exams', icon: BookOpen },
    { label: 'Forum', href: '/forum', icon: FileText },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
};

interface SubscriptionInfo {
  plan: string;
  expiresAt: string | null;
  daysRemaining: number | null;
}

export default function DashboardLayout({ children, previewRole, onPreviewRoleChange }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const { profile, role, progress, signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const displayRole = previewRole || role || 'student';
  const navItems = roleNavItems[displayRole] || roleNavItems.student; // Safe fallback
  const isPreviewMode = previewRole !== null && previewRole !== undefined;

  // Fetch subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user?.id) return;

      const db = getFirebaseDb();
      const byUserId = await getDocs(query(
        collection(db, 'subscriptions'),
        where('userId', '==', user.id),
        fireLimit(1)
      ));
      const byUserSnake = byUserId.empty ? await getDocs(query(
        collection(db, 'subscriptions'),
        where('user_id', '==', user.id),
        fireLimit(1)
      )) : byUserId;

      if (!byUserSnake.empty) {
        const data = byUserSnake.docs[0].data();
        const expiresAtRaw = data.expiresAt || data.expires_at || null;
        const expiresAt =
          typeof expiresAtRaw === 'string'
            ? expiresAtRaw
            : expiresAtRaw && typeof expiresAtRaw.toDate === 'function'
              ? expiresAtRaw.toDate().toISOString()
              : null;
        let daysRemaining: number | null = null;
        if (expiresAt) {
          const expiryDate = new Date(expiresAt);
          const today = new Date();
          daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        setSubscription({
          plan: typeof data.plan === 'string' ? data.plan : 'Free',
          expiresAt,
          daysRemaining,
        });
      }
    };

    fetchSubscription();
  }, [user?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getLevelInfo = (xp: number) => {
    const level = Math.floor(xp / 100) + 1;
    const progress = xp % 100;
    const titles = ['Starter', 'Explorer', 'Achiever', 'Scholar', 'Master', 'Legend'];
    return {
      level,
      progress,
      title: titles[Math.min(level - 1, titles.length - 1)],
    };
  };

  const levelInfo = getLevelInfo(progress?.xp || 0);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-amber-950 py-2 px-4 text-center text-sm font-medium z-50 flex items-center justify-center gap-2">
          <Eye className="w-4 h-4" />
          Preview Mode - Viewing as {previewRole}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onPreviewRoleChange?.(null)}
            className="ml-4 h-6 text-xs"
          >
            Exit Preview
          </Button>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:transform-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isPreviewMode && 'lg:pt-10'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-foreground">XamPreps</span>
            </Link>
          </div>

          {/* User Info (for students) */}
          {displayRole === 'student' && (
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  {profile?.name?.charAt(0) || 'S'}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{profile?.name || 'Student'}</p>
                  <p className="text-xs text-muted-foreground">Level {levelInfo.level} • {levelInfo.title}</p>
                </div>
              </div>
              {/* XP Progress Bar */}
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${levelInfo.progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {levelInfo.progress}/100 XP to Level {levelInfo.level + 1}
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Admin & Super Admin View Switcher */}
          {(role === 'admin' || role === 'super_admin') && (
            <div className="p-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2 px-2">
                {role === 'super_admin' ? 'View As:' : 'Preview Dashboard As:'}
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      {previewRole ? previewRole.charAt(0).toUpperCase() + previewRole.slice(1) : 'Select Role'}
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => onPreviewRoleChange?.('student')}>
                    <User className="w-4 h-4 mr-2" />
                    Student View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPreviewRoleChange?.('parent')}>
                    <Users className="w-4 h-4 mr-2" />
                    Parent View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPreviewRoleChange?.('school')}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    School View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPreviewRoleChange?.('admin')}>
                    <User className="w-4 h-4 mr-2" />
                    Admin View
                  </DropdownMenuItem>
                  {role === 'super_admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onPreviewRoleChange?.(null)}>
                        <Shield className="w-4 h-4 mr-2" />
                        Super Admin View
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Sign Out */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="w-full justify-start text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn('flex-1 flex flex-col min-h-screen', isPreviewMode && 'pt-10')}>
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          {/* Subscription Status & Streak (for students) */}
          {displayRole === 'student' && (
            <div className="hidden sm:flex items-center gap-3">
              {/* Subscription Badge */}
              {subscription && (
                <Link 
                  to="/pricing"
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    subscription.plan === 'Free' 
                      ? "bg-muted text-muted-foreground hover:bg-muted/80"
                      : "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-amber-600 hover:from-amber-500/20 hover:to-yellow-500/20"
                  )}
                >
                  {subscription.plan !== 'Free' && <Crown className="w-4 h-4" />}
                  <span>{subscription.plan}</span>
                  {subscription.daysRemaining !== null && subscription.daysRemaining <= 30 && subscription.daysRemaining > 0 && (
                    <span className="text-xs opacity-75">
                      • {subscription.daysRemaining}d left
                    </span>
                  )}
                </Link>
              )}
              
              {/* Streak Display */}
              {progress?.streak && progress.streak > 0 && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500/10 to-red-500/10 px-4 py-2 rounded-full">
                  <span className="text-2xl">🔥</span>
                  <span className="font-bold text-orange-600">{progress.streak} day streak!</span>
                </div>
              )}
            </div>
          )}

          <div className="flex-1" />
          
          {/* Renewal Reminder */}
          {displayRole === 'student' && subscription && subscription.daysRemaining !== null && subscription.daysRemaining <= 7 && subscription.daysRemaining > 0 && (
            <RenewalReminder daysRemaining={subscription.daysRemaining} onRenew={() => navigate('/pricing')} />
          )}

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <NotificationBell />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-sm font-medium">
                    {profile?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{profile?.name}</span>
                  <ChevronDown className="w-4 h-4 hidden sm:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
