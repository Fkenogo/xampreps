import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
type AppRole = 'student' | 'parent' | 'school' | 'admin' | 'super_admin';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, role, isSuperAdmin, loading } = useAuth();
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

  if (allowedRoles) {
    // Use real role for access control (not effectiveRole which includes view-as)
    // View-as is UI-only and should never affect route access
    if (!role) {
      return <Navigate to="/dashboard" replace />;
    }

    // Super admin can access all role-restricted routes
    if (isSuperAdmin) {
      return <>{children}</>;
    }

    if (!allowedRoles.includes(role)) {
      // Redirect to appropriate dashboard based on real role
      const dashboardPath = `/dashboard/${role}`;
      return <Navigate to={dashboardPath} replace />;
    }
  }

  return <>{children}</>;
};