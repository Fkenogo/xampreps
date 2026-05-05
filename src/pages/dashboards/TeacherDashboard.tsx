import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ManagedStudentCreateDialog from '@/components/identity/ManagedStudentCreateDialog';
import IssuedStudentCredentialsCard from '@/components/identity/IssuedStudentCredentialsCard';
import ManagedStudentsTable from '@/components/identity/ManagedStudentsTable';
import ClaimStudentLinkDialog from '@/components/identity/ClaimStudentLinkDialog';
import V2TeacherReviewPanel from '@/components/teacher/V2TeacherReviewPanel';
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
  claimStudentLinkCodeFirebase,
  createStudentAsTeacherFirebase,
  generateStudentInviteAsTeacherFirebase,
  getTeacherDashboardContextFirebase,
  getTeacherStudentPerformanceSummaryFirebase,
  listStudentInvitesAsTeacherFirebase,
  listManagedStudentsAsTeacherFirebase,
  type ManagedStudentListItem,
  type ManagedStudentProvisioningResult,
  type StudentInviteCodeItem,
  type TeacherStudentPerformanceSummaryResponse,
} from '@/integrations/firebase/identity';

type StudentPerformanceState =
  | { status: 'loading' }
  | { status: 'ready'; data: TeacherStudentPerformanceSummaryResponse }
  | { status: 'error'; message: string };

interface TeacherDashboardContentProps {
  previewMode?: boolean;
}

export function TeacherDashboardContent({ previewMode = false }: TeacherDashboardContentProps) {
  const { profile } = useAuth();
  const [students, setStudents] = useState<ManagedStudentListItem[]>([]);
  const [activeSchools, setActiveSchools] = useState<Array<{
    schoolId: string;
    schoolName: string;
    role: string;
    employmentType: string;
    createdAt: string | null;
    jobTitle: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [issuedCredentials, setIssuedCredentials] = useState<ManagedStudentProvisioningResult | null>(null);
  const [inviteCodes, setInviteCodes] = useState<StudentInviteCodeItem[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [studentPerformance, setStudentPerformance] = useState<Record<string, StudentPerformanceState>>({});

  const extractErrorMessage = (error: unknown, fallback: string) =>
    (error as { details?: { message?: string } })?.details?.message ||
    (error as { message?: string })?.message ||
    fallback;

  const refreshRoster = async () => {
    if (previewMode) {
      setStudents([]);
      setActiveSchools([]);
      setLoading(false);
      return;
    }
    try {
      const [response, schoolContext] = await Promise.all([
        listManagedStudentsAsTeacherFirebase(),
        getTeacherDashboardContextFirebase(),
      ]);
      if (response.ok) {
        setStudents(response.items);
      }
      if (schoolContext.ok) {
        setActiveSchools(schoolContext.activeSchools);
      }
      const inviteResponse = await listStudentInvitesAsTeacherFirebase();
      if (inviteResponse.ok) {
        setInviteCodes(inviteResponse.items);
      }
    } catch (error) {
      console.error('[TeacherDashboard] Failed to load teacher roster', error);
      toast.error(extractErrorMessage(error, 'Failed to load teacher roster'));
      setStudents([]);
      setActiveSchools([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshRoster();
  }, []);

  useEffect(() => {
    if (previewMode || students.length === 0) {
      setStudentPerformance({});
      return;
    }

    let cancelled = false;

    setStudentPerformance((current) => {
      const next: Record<string, StudentPerformanceState> = {};
      students.forEach((student) => {
        const existing = current[student.studentUid];
        next[student.studentUid] = existing?.status === 'ready' ? existing : { status: 'loading' };
      });
      return next;
    });

    const loadPerformance = async () => {
      const results = await Promise.allSettled(
        students.map(async (student) => ({
          studentUid: student.studentUid,
          response: await getTeacherStudentPerformanceSummaryFirebase({ studentUid: student.studentUid }),
        })),
      );

      if (cancelled) return;

      setStudentPerformance((current) => {
        const next = { ...current };
        results.forEach((result, index) => {
          const studentUid = students[index]?.studentUid;
          if (!studentUid) return;
          if (result.status === 'fulfilled') {
            next[studentUid] = { status: 'ready', data: result.value.response };
          } else {
            console.warn('[TeacherDashboard] Failed to load student performance summary', {
              studentUid,
              error: result.reason,
            });
            next[studentUid] = {
              status: 'error',
              message: extractErrorMessage(result.reason, 'Could not load this student summary.'),
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

  const handleCreateStudent = async (payload: Parameters<typeof createStudentAsTeacherFirebase>[0]) => {
    if (!payload.firstName || !payload.lastName || !payload.country || !payload.educationLevel) {
      toast.error('First name, last name, country, and education level are required.');
      return;
    }
    try {
      setCreating(true);
      const result = await createStudentAsTeacherFirebase(payload);
      setIssuedCredentials(result);
      setDialogOpen(false);
      toast.success('Teacher-managed student created');
      await refreshRoster();
    } catch (error) {
      console.error('[TeacherDashboard] Failed to create managed student', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create student');
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateInvite = async () => {
    try {
      setInviteLoading(true);
      const result = await generateStudentInviteAsTeacherFirebase();
      if (result.ok) {
        toast.success('Teacher invite code generated');
        const inviteResponse = await listStudentInvitesAsTeacherFirebase();
        if (inviteResponse.ok) {
          setInviteCodes(inviteResponse.items);
        }
      }
    } catch (error) {
      console.error('[TeacherDashboard] Failed to generate invite', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleClaimStudent = async (code: string) => {
    try {
      setClaimSubmitting(true);
      const result = await claimStudentLinkCodeFirebase({ code });
      setClaimDialogOpen(false);
      if (result.alreadyLinked || result.status === 'already_linked') {
        toast.message(result.message || 'Student is already linked to this teacher.');
      } else {
        toast.success(result.message || 'Student linked to teacher');
      }
      await refreshRoster();
    } catch (error) {
      console.error('[TeacherDashboard] Failed to claim student code', error);
      toast.error(extractErrorMessage(error, 'Failed to claim student code'));
    } finally {
      setClaimSubmitting(false);
    }
  };

  const selectedSchool = activeSchools.length === 1 ? activeSchools[0] : null;

  const formatScore = (value: number | null) => (typeof value === 'number' ? `${value}%` : '—');

  const getLatestScore = (summary: TeacherStudentPerformanceSummaryResponse['summary']) => {
    const latest = summary.latestAttempts.find((a) => typeof a.scorePercent === 'number');
    return latest?.scorePercent ?? null;
  };

  const hasNoActivity = (summary: TeacherStudentPerformanceSummaryResponse['summary']) =>
    summary.lastActivityAt === null &&
    summary.latestAttempts.length === 0 &&
    summary.averageScorePercent === null &&
    summary.attemptsLast7Days === 0;

  const getStudentStatus = (summary: TeacherStudentPerformanceSummaryResponse['summary']) => {
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

  const educationLevelsRepresented = useMemo(
    () => new Set(students.map((s) => s.educationLevel).filter(Boolean)).size,
    [students],
  );

  const recentlyAdded = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return students.filter((s) => {
      if (!s.createdAt) return false;
      const t = new Date(s.createdAt).getTime();
      return !Number.isNaN(t) && t >= cutoff;
    }).length;
  }, [students]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {/* Welcome header */}
      <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-card to-card p-6 shadow-sm dark:border-violet-900/50 dark:from-violet-950/20">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            {profile?.name ? `${profile.name.split(' ')[0]}'s roster` : 'Teacher roster'}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Manage your students, track who is linked, and act where needed.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {selectedSchool ? (
              <>
                <span className="font-medium text-foreground">{selectedSchool.schoolName}</span>
                <span>•</span>
              </>
            ) : null}
            <span>{students.length} linked {students.length === 1 ? 'student' : 'students'}</span>
            <span>•</span>
            <span>{educationLevelsRepresented} education {educationLevelsRepresented === 1 ? 'level' : 'levels'}</span>
            <span>•</span>
            <span>{recentlyAdded} added in last 30 days</span>
          </div>
        </div>
      </section>

      {/* Preview mode banner */}
      {previewMode ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Teacher preview mode shows the managed roster layout only. Real roster reads and student creation require a teacher session.
        </div>
      ) : null}

      <V2TeacherReviewPanel previewMode={previewMode} />

      {/* Dialogs — invisible until triggered */}
      <ManagedStudentCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        creatorRole="teacher"
        title="Create Student as Teacher"
        description="This creates an independent student account and links it to your teacher roster."
        submitting={creating}
        blockedReason={previewMode ? 'Disabled in admin preview mode.' : null}
        onSubmit={handleCreateStudent}
      />
      <ClaimStudentLinkDialog
        open={claimDialogOpen}
        onOpenChange={setClaimDialogOpen}
        title="Claim Student Code"
        description="Enter the student-generated teacher code from the student link panel to add that student to your teacher roster."
        submitting={claimSubmitting}
        blockedReason={previewMode ? 'Disabled in admin preview mode.' : null}
        onSubmit={handleClaimStudent}
      />

      {/* Issued credentials — shown after creating a student */}
      {issuedCredentials ? (
        <IssuedStudentCredentialsCard
          studentDisplayName={issuedCredentials.studentDisplayName}
          accessCode={issuedCredentials.accessCode}
          temporarySecret={issuedCredentials.temporarySecret}
          creatorRole={issuedCredentials.creatorRole}
          schoolId={issuedCredentials.schoolId}
        />
      ) : null}

      {/* Summary stats */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-violet-200 bg-card p-5 shadow-sm dark:border-violet-900/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Linked students</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{loading ? '—' : students.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">Students on your roster.</p>
            </div>
            <div className="rounded-xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Education levels</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{loading ? '—' : educationLevelsRepresented}</p>
              <p className="mt-2 text-sm text-muted-foreground">Distinct levels in your roster.</p>
            </div>
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
              <BookOpenCheck className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Added recently</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{loading ? '—' : recentlyAdded}</p>
              <p className="mt-2 text-sm text-muted-foreground">Joined in the last 30 days.</p>
            </div>
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
              <CalendarClock className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      {/* Roster table — promoted to top of content */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Linked students</h2>
            <p className="text-sm text-muted-foreground">
              Review the students connected to your teacher account.
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
            emptyTitle="No students on your roster yet"
            emptyDescription="Use the actions below to add students to your roster."
          />
        )}
      </section>

      {/* Learning snapshot */}
      <section className="rounded-2xl border border-blue-200 bg-card p-5 shadow-sm dark:border-blue-900/40">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Learning snapshot</h2>
          <p className="text-sm text-muted-foreground">
            See recent activity and where students may need support.
          </p>
        </div>

        {students.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            Learning snapshots appear once a student is linked.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {students.map((student) => {
              const state = studentPerformance[student.studentUid] || { status: 'loading' as const };

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
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="h-16 rounded-lg bg-background/70 animate-pulse" />
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
              const latestScore = getLatestScore(summary);
              const status = getStudentStatus(summary);
              const studentName = studentSummary.displayName || student.studentDisplayName;
              const studentMeta = [
                studentSummary.educationLevel || student.educationLevel,
                studentSummary.schoolName || student.schoolName,
              ].filter(Boolean).join(' · ');

              if (hasNoActivity(summary)) {
                return (
                  <div
                    key={student.studentUid}
                    className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{studentName}</h3>
                        {studentMeta ? (
                          <p className="mt-1 text-sm text-muted-foreground">{studentMeta}</p>
                        ) : null}
                      </div>
                      <div className={`rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}>
                        {status.label}
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      No practice papers completed yet.
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Scores and subject data will appear here after their first attempt.
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
                      <h3 className="font-semibold text-foreground">{studentName}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {studentMeta || 'No school or level on record'}
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
                        {summary.strongestSubject?.subject || '—'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Weakest subject</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {summary.weakestSubject?.subject || '—'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-3 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Latest paper</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {summary.latestAttempts[0]?.examTitle || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Roster actions */}
      <section className="rounded-2xl border border-violet-200 bg-card p-5 shadow-sm dark:border-violet-900/40">
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">Roster actions</h2>
            <p className="text-sm text-muted-foreground">
              Add students to your roster or issue an invite for them to join.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => setClaimDialogOpen(true)}
              className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-left transition-colors hover:bg-blue-100/80 dark:border-blue-900/40 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                  <Link2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Claim student code</h3>
                  <p className="text-sm text-muted-foreground">Link a student who has already generated a teacher code.</p>
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
                  <h3 className="font-semibold text-foreground">Create student account</h3>
                  <p className="text-sm text-muted-foreground">Create and link a new student account directly.</p>
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
                  <h3 className="font-semibold text-foreground">Generate teacher invite</h3>
                  <p className="text-sm text-muted-foreground">Send a code for an independent student to join your roster.</p>
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

      {/* School context */}
      {selectedSchool ? (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
              <School className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Linked school</p>
              <h2 className="mt-0.5 text-xl font-semibold text-foreground">{selectedSchool.schoolName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {[selectedSchool.jobTitle || 'Teacher', selectedSchool.employmentType].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        </section>
      ) : activeSchools.length > 1 ? (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
              <School className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">School context</p>
              <p className="mt-1 text-sm text-foreground">{activeSchools.length} active school links detected.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Multi-school display is not yet supported. Contact support if this looks incorrect.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
              <School className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">School context</p>
              <p className="mt-1 text-sm text-foreground">No school is linked to this account yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You can still manage students independently. Contact a school admin to be linked to a school.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Teacher-issued invite codes — utility section */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Teacher-issued invite codes</h2>
            <p className="text-sm text-muted-foreground">
              Active codes that independent students can use to join your roster.
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
        {inviteCodes.length === 0 ? (
          <div className="text-sm text-muted-foreground">No active teacher-issued invite codes yet.</div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {inviteCodes.map((invite) => (
              <div key={invite.codeId} className="rounded-xl border border-border bg-background px-4 py-3 space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Teacher-issued</div>
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

export default function TeacherDashboard() {
  return (
    <DashboardLayout>
      <TeacherDashboardContent />
    </DashboardLayout>
  );
}
