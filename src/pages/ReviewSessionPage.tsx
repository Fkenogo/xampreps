import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';

export default function ReviewSessionPage() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-16 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Button>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="mt-1 h-6 w-6 text-amber-700" />
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold text-amber-900">Legacy review session disabled</h1>
              <p className="text-amber-900/80">
                The old spaced-repetition review screen depended on the retired exam engine. XamPreps is now running
                a V2-only exam flow, so this page is intentionally disabled until a V2-native review experience is
                built.
              </p>
              <p className="text-sm text-amber-900/70">
                V2 teacher review tasks are still created in the backend for manual-marking responses.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
