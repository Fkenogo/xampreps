import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import ManagedStudentCreateDialog from '@/components/identity/ManagedStudentCreateDialog';
import IssuedStudentCredentialsCard from '@/components/identity/IssuedStudentCredentialsCard';
import ManagedStudentsTable from '@/components/identity/ManagedStudentsTable';
import ClaimStudentLinkDialog from '@/components/identity/ClaimStudentLinkDialog';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BadgePlus,
  BookOpenCheck,
  Building2,
  CalendarClock,
  Link2,
  School,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  createStudentAsParentFirebase,
  claimStudentLinkCodeFirebase,
  getParentChildPerformanceSummaryFirebase,
  generateStudentInviteAsParentFirebase,
  listStudentInvitesAsParentFirebase,
  listManagedStudentsAsParentFirebase,
  type ManagedStudentListItem,
  type ManagedStudentProvisioningResult,
  type ParentChildPerformanceSummaryResponse,
  type StudentInviteCodeItem,
} from '@/integrations/firebase/identity';

interface ParentDashboardContentProps {
  previewMode?: boolean;
}

type ChildPerformanceState =
  | { status: 'loading' }
  | { status: 'ready'; data: ParentChildPerformanceSummaryResponse }
  | { status: 'error'; message: string };

export default function ParentDashboardContent({ previewMode = false }: ParentDashboardContentProps) {
  const { profile } = useAuth();
  const [students, setStudents] = useState<ManagedStudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [issuedCredentials, setIssuedCredentials] = useState<ManagedStudentProvisioningResult | null>(null);
  const [inviteCodes, setInviteCodes] = useState<StudentInviteCodeItem[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [childPerformance, setChildPerformance] = useState<Record<string, ChildPerformanceState>>({});

  const extractErrorMessage = (error: unknown, fallback: string) =>
    (error as { details?: { message?: string } })?.details?.message ||
    (error as { message?: string })?.message ||
    fallback;

  const refreshStudents = async () => {
    if (previewMode) {
      setStudents([]);
      setInviteCodes([]);
      setInviteError(null);
      setLoading(false);
      return;
    }

    const [rosterResult, inviteResult] = await Promise.allSettled([
      listManagedStudentsAsParentFirebase(),
      listStudentInvitesAsParentFirebase(),
    ]);

    if (rosterResult.status === 'fulfilled' && rosterResult.value.ok) {
      setStudents(rosterResult.value.items);
      if (
        rosterResult.value.debug &&
        (
          rosterResult.value.debug.skippedMalformedLinks > 0 ||
          rosterResult.value.debug.missingUsers > 0 ||
          rosterResult.value.debug.missingStudentProfiles > 0
        )
      ) {
        console.warn('[ParentDashboard] Skipped malformed linked student records', rosterResult.value.debug);
      }
    } else {
      const error = rosterResult.status === 'rejected' ? rosterResult.reason : new Error('Failed to load managed students');
      console.error('[ParentDashboard] Failed to load managed students', error);
      toast.error(extractErrorMessage(error, 'Failed to load managed students'));
      setStudents([]);
    }

    if (inviteResult.status === 'fulfilled' && inviteResult.value.ok) {
      setInviteCodes(inviteResult.value.items);
      setInviteError(null);
    } else {
      const error = inviteResult.status === 'rejected' ? inviteResult.reason : new Error('Failed to load parent-issued invite codes');
      console.error('[ParentDashboard] Failed to load invite codes', error);
      setInviteCodes([]);
      setInviteError(extractErrorMessage(error, 'Failed to load parent-issued invite codes'));
    }

    setLoading(false);
  };

  useEffect(() => {
    refreshStudents();
  }, []);

  useEffect(() => {
    if (previewMode || students.length === 0) {
      setChildPerformance({});
      return;
    }

    let cancelled = false;
    const studentUids = students.map((student) => student.studentUid);

    setChildPerformance((current) => {
      const next: Record<string, ChildPerformanceState> = {};
      studentUids.forEach((studentUid) => {
        const existing = current[studentUid];
        next[studentUid] = existing?.status === 'ready' ? existing : { status: 'loading' };
      });
      return next;
    });

    const loadPerformance = async () => {
      const results = await Promise.allSettled(
        students.map(async (student) => ({
          studentUid: student.studentUid,
          response: await getParentChildPerformanceSummaryFirebase({ studentUid: student.studentUid }),
        })),
      );

      if (cancelled) return;

      setChildPerformance((current) => {
        const next = { ...current };

        results.forEach((result, index) => {
          const studentUid = students[index]?.studentUid;
          if (!studentUid) return;

          if (result.status === 'fulfilled') {
            next[studentUid] = {
              status: 'ready',
              data: result.value.response,
            };
          } else {
            console.warn('[ParentDashboard] Failed to load child performance summary', {
              studentUid,
              error: result.reason,
            });
            next[studentUid] = {
              status: 'error',
              message: extractErrorMessage(result.reason, 'Could not load this child summary.'),
            };
          }
        });

        return next;
      });
    };

    void loadPerformance();

    return () => {
      cancelled = true;
    };
  }, [previewMode, students]);

  const schoolsRepresented = useMemo(
    () => new Set(students.map((student) => student.schoolId || student.schoolName).filter(Boolean)).size,
    [students],
  );

  const educationLevelsRepresented = useMemo(
    () => new Set(students.map((student) => student.educationLevel).filter(Boolean)).size,
    [students],
  );

  const newestLinkedStudent = useMemo(() => {
    return [...students]
      .filter((student) => student.createdAt)
      .sort((a, b) => {
        const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return right - left;
      })[0] || null;
  }, [students]);

  const recentLinks = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return students.filter((student) => {
      if (!student.createdAt) return false;
      const createdAt = new Date(student.createdAt).getTime();
      return !Number.isNaN(createdAt) && createdAt >= cutoff;
    }).length;
  }, [students]);

  const handleCreateStudent = async (payload: Parameters<typeof createStudentAsParentFirebase>[0]) => {
    if (!payload.firstName || !payload.lastName || !payload.country || !payload.educationLevel) {
      toast.error('First name, last name, country, and education level are required.');
      return;
    }

    try {
      setCreating(true);
      const result = await createStudentAsParentFirebase(payload);
      setIssuedCredentials(result);
      setDialogOpen(false);
      toast.success('Student account created for parent management');
      await refreshStudents();
    } catch (error) {
      console.error('[ParentDashboard] Failed to create managed student', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create student');
    } finally {
      setCreating(false);
    }
  };

  const handleClaimStudent = async (code: string) => {
    try {
      setLinkSubmitting(true);
      const result = await claimStudentLinkCodeFirebase({ code });
      setLinkDialogOpen(false);
      if (result.alreadyLinked || result.status === 'already_linked') {
        toast.message(result.message || 'Student is already linked to this parent.');
      } else {
        toast.success('Student linked successfully');
      }
      await refreshStudents();
    } catch (error) {
      console.error('[ParentDashboard] Failed to link student', error);
      toast.error(error instanceof Error ? error.message : 'Failed to link student');
    } finally {
      setLinkSubmitting(false);
    }
  };

  const handleGenerateInvite = async () => {
    try {
      setInviteLoading(true);
      const result = await generateStudentInviteAsParentFirebase();
      if (result.ok) {
        toast.success('Student invite code generated');
        const inviteResponse = await listStudentInvitesAsParentFirebase();
        if (inviteResponse.ok) {
          setInviteCodes(inviteResponse.items);
        }
      }
    } catch (error) {
      console.error('[ParentDashboard] Failed to generate invite', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const formatScore = (value: number | null) => (typeof value === 'number' ? `${value}%` : 'No scores yet');

  const getChildLatestScore = (summary: ParentChildPerformanceSummaryResponse['summary']) => {
    const latestWithScore = summary.latestAttempts.find((attempt) => typeof attempt.scorePercent === 'number');
    return latestWithScore?.scorePercent ?? null;
  };

  const hasNoActivity = (summary: ParentChildPerformanceSummaryResponse['summary']) =>
    summary.lastActivityAt === null &&
    summary.latestAttempts.length === 0 &&
    summary.averageScorePercent === null &&
    summary.attemptsLast7Days === 0;

  const getChildStatus = (summary: ParentChildPerformanceSummaryResponse['summary']) => {
    if (!summary.lastActivityAt) {
      return {
        label: 'No activity yet',
        className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200',
      };
    }

    if (summary.inactive) {
      return {
        label: 'Inactive',
        className: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-200',
      };
    }

    return {
      label: 'Active',
      className: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-200',
    };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-card to-card p-6 shadow-sm dark:border-violet-900/50 dark:from-violet-950/20">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome, {profile?.name?.split(' ')[0] || 'Parent'}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            See who is linked to you and manage your parent account here.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{students.length} linked {students.length === 1 ? 'child' : 'children'}</span>
            <span>•</span>
            <span>{schoolsRepresented} {schoolsRepresented === 1 ? 'school' : 'schools'}</span>
            <span>•</span>
            <span>{educationLevelsRepresented} learning level{educationLevelsRepresented === 1 ? '' : 's'}</span>
            <span>•</span>
            <span>{recentLinks} added recently</span>
          </div>
        </div>
      </section>

      {previewMode ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Parent preview mode shows the layout only. Managed student creation and roster reads require a real parent session.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-violet-200 bg-card p-5 shadow-sm dark:border-violet-900/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Linked children</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{loading ? '—' : students.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Children linked to this account.
              </p>
            </div>
            <div className="rounded-xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Schools represented</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{loading ? '—' : schoolsRepresented}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Schools shown in your roster.
              </p>
            </div>
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
              <School className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Education levels</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{loading ? '—' : educationLevelsRepresented}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Learning levels across your children.
              </p>
            </div>
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
              <BookOpenCheck className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-card p-5 shadow-sm dark:border-violet-900/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Recent additions</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{loading ? '—' : recentLinks}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Added in the last 30 days.
              </p>
            </div>
            <div className="rounded-xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">
              <CalendarClock className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      <ManagedStudentCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        creatorRole="parent"
        title="Create Student as Parent"
        description="This creates an independent student account and links it to you immediately."
        submitting={creating}
        blockedReason={previewMode ? 'Disabled in admin preview mode.' : null}
        onSubmit={handleCreateStudent}
      />

      <ClaimStudentLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        title="Claim Student Link Code"
        description="Enter the student-generated parent code from the student’s dashboard to link their account to this parent."
        submitting={linkSubmitting}
        blockedReason={previewMode ? 'Disabled in admin preview mode.' : null}
        onSubmit={handleClaimStudent}
      />

      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Linked children</h2>
            <p className="text-sm text-muted-foreground">
              Review the children connected to your account.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 rounded-2xl border border-border bg-card">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <ManagedStudentsTable
            items={students}
            emptyTitle="No linked children yet"
            emptyDescription="Claim a child code or create a child account below to get started."
          />
        )}
      </section>

      <section className="rounded-2xl border border-blue-200 bg-card p-5 shadow-sm dark:border-blue-900/40">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Learning snapshot</h2>
          <p className="text-sm text-muted-foreground">
            See recent activity and where each child may need support.
          </p>
        </div>

        {students.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            Learning snapshots appear once a child is linked.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {students.map((student) => {
              const state = childPerformance[student.studentUid] || { status: 'loading' as const };

              if (state.status === 'loading') {
                return (
                  <div
                    key={student.studentUid}
                    className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20"
                  >
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{student.studentDisplayName}</h3>
                        <p className="text-sm text-muted-foreground">Loading summary…</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[0, 1, 2, 3].map((item) => (
                          <div key={item} className="h-16 rounded-lg bg-background/70 animate-pulse" />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }

              if (state.status === 'error') {
                return (
                  <div
                    key={student.studentUid}
                    className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20"
                  >
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">{student.studentDisplayName}</h3>
                      <p className="text-sm text-muted-foreground">{state.message}</p>
                    </div>
                  </div>
                );
              }

              const { student: studentSummary, summary } = state.data;
              const latestScore = getChildLatestScore(summary);
              const status = getChildStatus(summary);
              const childName = studentSummary.displayName || student.studentDisplayName;
              const childMeta = [studentSummary.educationLevel || student.educationLevel, studentSummary.schoolName || student.schoolName]
                .filter(Boolean)
                .join(' • ');

              if (hasNoActivity(summary)) {
                return (
                  <div
                    key={student.studentUid}
                    className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{childName}</h3>
                        {childMeta ? (
                          <p className="mt-1 text-sm text-muted-foreground">{childMeta}</p>
                        ) : null}
                      </div>
                      <div className={`rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}>
                        {status.label}
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      This child has not completed a practice paper yet.
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Recent scores and subject trends will appear here after their first activity.
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={student.studentUid}
                  className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{childName}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {childMeta || 'No school or level yet'}
                      </p>
                    </div>
                    <div className={`rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}>
                      {status.label}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg border border-border bg-background px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Average score</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{formatScore(summary.averageScorePercent)}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Latest score</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{formatScore(latestScore)}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Last 7 days</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{summary.attemptsLast7Days}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Strongest subject</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {summary.strongestSubject?.subject || 'No pattern yet'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Weakest subject</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {summary.weakestSubject?.subject || 'No pattern yet'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Latest paper</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {summary.latestAttempts[0]?.examTitle || 'No activity yet'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-violet-200 bg-card p-5 shadow-sm dark:border-violet-900/40">
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">Manage child links</h2>
            <p className="text-sm text-muted-foreground">
              Use these tools when you need to add or link another child.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => setLinkDialogOpen(true)}
              className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-left transition-colors hover:bg-blue-100/80 dark:border-blue-900/40 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                  <Link2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Claim child code</h3>
                  <p className="text-sm text-muted-foreground">Link a child who already has a parent code.</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-200">
                Open
                <ArrowRight className="h-4 w-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="rounded-xl border border-violet-200 bg-background p-4 text-left transition-colors hover:bg-violet-50 dark:border-violet-900/40 dark:hover:bg-violet-950/20"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-violet-100 p-2 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Create child account</h3>
                  <p className="text-sm text-muted-foreground">Create and link a new student account.</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-200">
                Open
                <ArrowRight className="h-4 w-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={handleGenerateInvite}
              disabled={inviteLoading}
              className="rounded-xl border border-orange-200 bg-orange-50/80 p-4 text-left transition-colors hover:bg-orange-100/80 disabled:cursor-not-allowed disabled:opacity-70 dark:border-orange-900/40 dark:bg-orange-950/20 dark:hover:bg-orange-950/30"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200">
                  <BadgePlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Generate parent invite</h3>
                  <p className="text-sm text-muted-foreground">Make a code for a student to link back to you.</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-200">
                {inviteLoading ? 'Generating…' : 'Generate now'}
                <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          </div>
        </div>
      </section>

      {issuedCredentials ? (
        <IssuedStudentCredentialsCard
          studentDisplayName={issuedCredentials.studentDisplayName}
          accessCode={issuedCredentials.accessCode}
          temporarySecret={issuedCredentials.temporarySecret}
          creatorRole={issuedCredentials.creatorRole}
          schoolId={issuedCredentials.schoolId}
        />
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Parent-issued invite codes</h2>
            <p className="text-sm text-muted-foreground">
              Active invite codes stay here.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleGenerateInvite}
            disabled={inviteLoading}
            className="gap-2 border-border text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted/60"
          >
            <Building2 className="h-4 w-4" />
            {inviteLoading ? 'Generating…' : 'Generate Invite Code'}
          </Button>
        </div>
        {inviteError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {inviteError}
          </div>
        ) : null}
        {inviteCodes.length === 0 ? (
          <div className="text-sm text-muted-foreground">No active parent-issued invite codes yet.</div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {inviteCodes.map((invite) => (
              <div key={invite.codeId} className="rounded-xl border border-border bg-background px-4 py-3 space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Parent-issued</div>
                <div className="text-lg font-mono font-semibold">{invite.code}</div>
                <div className="text-xs text-muted-foreground">
                  {invite.expiresAt ? `Expires ${new Date(invite.expiresAt).toLocaleString()}` : 'Expires soon'}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
