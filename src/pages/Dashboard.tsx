import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { getDashboardPathForRole } from '@/lib/auth-routing';

export default function Dashboard() {
  const { role, loading, startupError, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
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

  return <Navigate to={getDashboardPathForRole(role)} replace />;
}
