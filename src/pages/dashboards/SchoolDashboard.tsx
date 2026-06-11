import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';

export default function SchoolDashboard() {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold text-foreground">
          {profile?.school || 'School'} Dashboard
        </h1>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          The legacy school dashboard is temporarily disabled while identity is moving to canonical
          school_admin flows. Use the school admin dashboard for roster and linking actions.
        </div>
      </div>
    </DashboardLayout>
  );
}
