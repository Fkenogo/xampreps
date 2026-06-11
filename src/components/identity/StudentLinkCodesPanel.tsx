import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  claimStudentLinkCodeFirebase,
  generateStudentLinkCodeFirebase,
  getStudentLinkSummaryFirebase,
  listStudentLinkCodesFirebase,
  type StudentLinkCodeItem,
} from '@/integrations/firebase/identity';
import { Copy, Link2 } from 'lucide-react';

export default function StudentLinkCodesPanel() {
  const emptyLinkSummary = {
    parents: [],
    school: null,
    teachers: [],
  } as const;
  const [codes, setCodes] = useState<StudentLinkCodeItem[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [codesError, setCodesError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<'parent' | 'school_admin' | 'teacher' | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [linkSummary, setLinkSummary] = useState<{
    parents: Array<{
      uid: string;
      displayName: string | null;
      email: string | null;
      relationshipLabel: string;
    }>;
    school: {
      id: string;
      name: string | null;
    } | null;
    teachers: Array<{
      uid: string;
      displayName: string | null;
      email: string | null;
      schoolName?: string | null;
    }>;
  }>(emptyLinkSummary);

  const refreshCodes = async () => {
    try {
      const response = await listStudentLinkCodesFirebase();
      if (response.ok) {
        setCodes(response.items);
      }
    } catch (error) {
      console.error('[StudentLinkCodes] Failed to load link codes', error);
      const message = error instanceof Error ? error.message : 'Failed to load link codes';
      setCodesError(message);
      toast.error(message);
    } finally {
      setCodesLoading(false);
    }
  };

  const refreshSummary = async () => {
    try {
      const response = await getStudentLinkSummaryFirebase();
      if (response.ok) {
        const parents = Array.isArray(response.parents) ? response.parents : null;
        const teachers = Array.isArray(response.teachers) ? response.teachers : null;
        const school =
          response.school === null ||
          (typeof response.school === 'object' &&
            response.school !== null &&
            typeof response.school.id === 'string')
            ? response.school
            : null;

        if (!parents || !teachers || (response.school !== null && !school)) {
          throw new Error('Student link summary returned an unexpected payload shape.');
        }

        setLinkSummary({
          parents,
          school,
          teachers,
        });
      }
    } catch (error) {
      console.error('[StudentLinkCodes] Failed to load link summary', error);
      const message = error instanceof Error ? error.message : 'Failed to load link summary';
      setSummaryError(message);
      setLinkSummary(emptyLinkSummary);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    refreshCodes();
    refreshSummary();
  }, []);

  const handleGenerate = async (targetType: 'parent' | 'school_admin' | 'teacher') => {
    try {
      setGenerating(targetType);
      const result = await generateStudentLinkCodeFirebase({ targetType });
      if (result.ok) {
        toast.success(
          targetType === 'parent'
            ? 'Parent link code generated'
            : targetType === 'school_admin'
              ? 'School link code generated'
              : 'Teacher link code generated'
        );
        setCodes((prev) => {
          const next = [
            {
              codeId: result.codeId,
              code: result.code,
              codeNormalized: result.codeNormalized,
              targetType: result.targetType,
              status: 'active',
              expiresAt: result.expiresAt,
              claimedByUid: null,
              claimedAt: null,
              createdAt: new Date().toISOString(),
            },
            ...prev.filter((item) => item.codeId !== result.codeId),
          ];
          return next;
        });
        await refreshCodes();
      }
    } catch (error) {
      console.error('[StudentLinkCodes] Failed to generate link code', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate link code');
    } finally {
      setGenerating(null);
    }
  };

  const handleClaimInvite = async () => {
    if (!inviteCode.trim()) {
      toast.error('Enter a link code first.');
      return;
    }
    try {
      setClaiming(true);
      const result = await claimStudentLinkCodeFirebase({ code: inviteCode.trim() });
      if (result.ok) {
        toast.success(result.message || 'Link completed successfully.');
        setInviteCode('');
        await Promise.all([refreshSummary(), refreshCodes()]);
      }
    } catch (error) {
      console.error('[StudentLinkCodes] Failed to claim invite code', error);
      toast.error(error instanceof Error ? error.message : 'Failed to link with code');
    } finally {
      setClaiming(false);
    }
  };

  const activeCodes = useMemo(() => {
    const now = Date.now();
    return codes.filter((code) => {
      if (code.status !== 'active') return false;
      if (!code.expiresAt) return true;
      return new Date(code.expiresAt).getTime() > now;
    });
  }, [codes]);

  const handleCopy = async (code: string | null) => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Link Summary</h2>
          <p className="text-sm text-muted-foreground">
            Generate a code for a parent, school admin, or teacher, or claim a teacher, parent, or school invite code.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => handleGenerate('parent')}
            disabled={generating !== null}
          >
            {generating === 'parent' ? 'Generating…' : 'Generate Parent Code'}
          </Button>
          <Button
            onClick={() => handleGenerate('school_admin')}
            disabled={generating !== null}
          >
            {generating === 'school_admin' ? 'Generating…' : 'Generate School Code'}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleGenerate('teacher')}
            disabled={generating !== null}
          >
            {generating === 'teacher' ? 'Generating…' : 'Generate Teacher Code'}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-background px-4 py-3 space-y-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Linked Parents/Guardians</p>
          {summaryLoading ? (
            <p className="text-sm font-medium text-foreground">Loading…</p>
          ) : linkSummary.parents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No linked parents or guardians yet</p>
          ) : (
            <div className="space-y-2">
              {linkSummary.parents.map((parent) => (
                <div key={parent.uid} className="rounded-md border border-border px-3 py-2">
                  <p className="text-sm font-medium text-foreground">
                    {parent.displayName || 'Unnamed parent or guardian'}
                  </p>
                  <p className="text-xs text-muted-foreground">{parent.relationshipLabel || 'guardian'}</p>
                  {parent.email ? (
                    <p className="text-xs text-muted-foreground">{parent.email}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border bg-background px-4 py-3 space-y-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Linked Teachers</p>
          {summaryLoading ? (
            <p className="text-sm font-medium text-foreground">Loading…</p>
          ) : linkSummary.teachers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No linked teachers yet</p>
          ) : (
            <div className="space-y-2">
              {linkSummary.teachers.map((teacher) => (
                <div key={teacher.uid} className="rounded-md border border-border px-3 py-2">
                  <p className="text-sm font-medium text-foreground">
                    {teacher.displayName || 'Unnamed teacher'}
                  </p>
                  {teacher.email ? (
                    <p className="text-xs text-muted-foreground">{teacher.email}</p>
                  ) : null}
                  {teacher.schoolName ? (
                    <p className="text-xs text-muted-foreground">{teacher.schoolName}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border bg-background px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Linked School</p>
          <p className="text-sm font-medium text-foreground">
            {summaryLoading ? 'Loading…' : linkSummary.school?.name || 'No linked school yet'}
          </p>
        </div>
      </div>
      {summaryError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {summaryError}
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-background px-4 py-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Link2 className="w-4 h-4 text-primary" />
          Link to an existing parent, school, or teacher
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-invite-code">Invite code</Label>
          <Input
            id="student-invite-code"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            placeholder="Enter code from a parent, school admin, or teacher"
            disabled={claiming}
          />
        </div>
        <Button onClick={handleClaimInvite} disabled={claiming}>
          {claiming ? 'Linking…' : 'Link with Code'}
        </Button>
      </div>

      {codesLoading ? (
        <div className="text-sm text-muted-foreground">Loading link codes…</div>
      ) : codesError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {codesError}
        </div>
      ) : activeCodes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          No active link codes yet. Generate one to share with a parent, school admin, or teacher.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {activeCodes.map((code) => (
            <div key={code.codeId} className="rounded-xl border border-border bg-background px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline">
                  {code.targetType === 'parent'
                    ? 'Parent'
                    : code.targetType === 'school_admin'
                      ? 'School Admin'
                      : 'Teacher'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Expires {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString() : 'soon'}
                </span>
              </div>
              <div className="text-xl font-semibold font-mono tracking-wide">{code.code}</div>
              <p className="text-xs text-muted-foreground">
                {code.targetType === 'teacher'
                  ? 'Share this with your teacher so they can claim it from the teacher dashboard.'
                  : code.targetType === 'school_admin'
                    ? 'Share this with your school admin so they can claim it from the school dashboard.'
                    : 'Share this with your parent so they can claim it from the parent dashboard.'}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Status: {code.status}</span>
                <span>{code.createdAt ? new Date(code.createdAt).toLocaleString() : '—'}</span>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => handleCopy(code.code)}>
                <Copy className="w-4 h-4" />
                Copy code
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
