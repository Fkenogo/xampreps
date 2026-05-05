import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import type { AppRole } from '@/contexts/AuthContext';
import { getDashboardPathForRole } from '@/lib/auth-routing';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, role, isSuperAdmin, loading, requiresStudentSetup, startupError, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requiresStudentSetup && location.pathname !== '/auth') {
    return <Navigate to="/auth?mode=student-setup" replace />;
  }

  if (startupError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-lg rounded-2xl border border-border bg-card p-6 text-center space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Your account identity needs attention.</h2>
          <p className="text-sm text-muted-foreground">{startupError}</p>
          <div className="flex justify-center">
            <Button onClick={signOut} variant="outline">Sign out</Button>
          </div>
        </div>
      </div>
    );
  }

  if (allowedRoles) {
    // Use real role for access control (not effectiveRole which includes view-as)
    // View-as is UI-only and should never affect route access
    if (!role) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-lg rounded-2xl border border-border bg-card p-6 text-center space-y-4">
            <h2 className="text-lg font-semibold text-foreground">We could not determine your account role.</h2>
            <p className="text-sm text-muted-foreground">
              {startupError || 'Your account is missing role data. Please sign out and sign in again, or contact support.'}
            </p>
            <div className="flex justify-center">
              <Button onClick={signOut} variant="outline">Sign out</Button>
            </div>
          </div>
        </div>
      );
    }

    // Super admin can access all role-restricted routes
    if (isSuperAdmin) {
      return <>{children}</>;
    }

    if (!allowedRoles.includes(role)) {
      // Redirect to appropriate dashboard based on real role
      const dashboardPath = getDashboardPathForRole(role);
      return <Navigate to={dashboardPath} replace />;
    }
  }

  return <>{children}</>;
};
