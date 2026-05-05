import { Badge } from '@/components/ui/badge';

interface IssuedStudentCredentialsCardProps {
  studentDisplayName: string;
  accessCode: string;
  temporarySecret: string;
  creatorRole: 'parent' | 'teacher' | 'school_admin';
  schoolId?: string | null;
}

export default function IssuedStudentCredentialsCard({
  studentDisplayName,
  accessCode,
  temporarySecret,
  creatorRole,
  schoolId,
}: IssuedStudentCredentialsCardProps) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-emerald-950">Student created successfully</h3>
          <p className="text-sm text-emerald-900">
            Share these credentials securely with <strong>{studentDisplayName}</strong>. The temporary secret is shown only once.
          </p>
        </div>
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{creatorRole.replace('_', ' ')}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white border border-emerald-200 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Access code</p>
          <p className="text-lg font-semibold text-foreground">{accessCode}</p>
        </div>
        <div className="rounded-xl bg-white border border-emerald-200 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Temporary secret</p>
          <p className="text-lg font-semibold text-foreground">{temporarySecret}</p>
        </div>
      </div>

      {schoolId ? (
        <p className="text-xs text-muted-foreground">Linked school: {schoolId}</p>
      ) : null}
    </div>
  );
}
