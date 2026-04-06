import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect based on role - super_admin lands on /dashboard/admin
  switch (role) {
    case 'super_admin':
    case 'admin':
      return <Navigate to="/dashboard/admin" replace />;
    case 'school':
      return <Navigate to="/dashboard/school" replace />;
    case 'parent':
      return <Navigate to="/dashboard/parent" replace />;
    case 'student':
    default:
      return <Navigate to="/dashboard/student" replace />;
  }
}
