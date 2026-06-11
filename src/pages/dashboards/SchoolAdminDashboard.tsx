import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ManagedStudentCreateDialog from '@/components/identity/ManagedStudentCreateDialog';
import IssuedStudentCredentialsCard from '@/components/identity/IssuedStudentCredentialsCard';
import ManagedStudentsTable from '@/components/identity/ManagedStudentsTable';
import SchoolStaffCreateDialog from '@/components/identity/SchoolStaffCreateDialog';
import ClaimStudentLinkDialog from '@/components/identity/ClaimStudentLinkDialog';
import {
  ArrowRight,
  BadgePlus,
  Briefcase,
  Building2,
  CalendarClock,
  Link2,
  School,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  createSchoolStaffUserFirebase,
  claimStudentLinkCodeFirebase,
  createStudentAsSchoolAdminFirebase,
  generateStudentInviteAsSchoolAdminFirebase,
  listManagedStudentsAsSchoolAdminFirebase,
  listSchoolStaffFirebase,
  listStudentInvitesAsSchoolAdminFirebase,
  type ManagedStudentListItem,
  type ManagedStudentProvisioningResult,
  type SchoolStaffCreatePayload,
  type SchoolStaffListItem,
  type SchoolStaffProvisioningResult,
  type StudentInviteCodeItem,
} from '@/integrations/firebase/identity';

interface ActiveSchoolSummary {
  schoolId: string;
  schoolName: string;
  role: string;
  createdAt: string | null;
}

interface SchoolAdminDashboardContentProps {
  previewMode?: boolean;
}

const normaliseStaffStatus = (raw: string | null): string => {
  if (!raw) return '—';
  const map: Record<string, string> = {
    active: 'Active',
    pending: 'Pending',
    disabled: 'Disabled',
    invited: 'Invited',
    suspended: 'Suspended',
  };
  return map[raw.toLowerCase()] ?? raw;
};

const normaliseSchoolRole = (raw: string | null): string => {
  if (!raw) return 'School Admin';
  const map: Record<string, string> = {
    school_admin: 'School Admin',
    owner: 'School Owner',
    teacher: 'Teacher',
    staff: 'Staff',
  };
  return map[raw.toLowerCase()] ?? raw;
};

const staffStatusBadgeClass = (raw: string | null): string => {
  const s = raw?.toLowerCase();
  if (s === 'active') return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-200';
  if (s === 'pending' || s === 'invited') return 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-200';
  if (s === 'disabled' || s === 'suspended') return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200';
  return 'border-border bg-background text-muted-foreground';
};

export function SchoolAdminDashboardContent({ previewMode = false }: SchoolAdminDashboardContentProps) {
  const [students, setStudents] = useState<ManagedStudentListItem[]>([]);
  const [activeSchools, setActiveSchools] = useState<ActiveSchoolSummary[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [issuedCredentials, setIssuedCredentials] = useState<ManagedStudentProvisioningResult | null>(null);
  const [staffItems, setStaffItems] = useState<SchoolStaffListItem[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffFilter, setStaffFilter] = useState<'all' | 'school_admin' | 'teacher'>('all');
  const [staffDialogRole, setStaffDialogRole] = useState<'school_admin' | 'teacher' | null>(null);
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [issuedStaffCredentials, setIssuedStaffCredentials] = useState<SchoolStaffProvisioningResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [inviteCodes, setInviteCodes] = useState<StudentInviteCodeItem[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);

  const refreshDashboard = async () => {
    if (previewMode) {
      setStudents([]);
      setActiveSchools([]);
      setSelectedSchoolId(null);
      setStaffItems([]);
      setLoading(false);
      setStaffLoading(false);
      setLoadError(null);
      return;
    }

    try {
      setLoadError(null);
      const [studentResponse, staffResponse] = await Promise.all([
        listManagedStudentsAsSchoolAdminFirebase(),
        listSchoolStaffFirebase(),
      ]);

      if (studentResponse.ok) {
        setStudents(studentResponse.items);
        setActiveSchools(studentResponse.activeSchools);
        setSelectedSchoolId(studentResponse.selectedSchoolId);
      }

      if (staffResponse.ok) {
        setStaffItems(staffResponse.items);
      }

      const inviteResponse = await listStudentInvitesAsSchoolAdminFirebase();
      if (inviteResponse.ok) {
        setInviteCodes(inviteResponse.items);
      }
    } catch (error) {
      console.error('[SchoolAdminDashboard] Failed to load school context', error);
      const message = error instanceof Error ? error.message : 'Failed to load school dashboard';
      toast.error(message);
      setLoadError(message);
      setStudents([]);
      setActiveSchools([]);
      setSelectedSchoolId(null);
      setStaffItems([]);
    } finally {
      setLoading(false);
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    refreshDashboard();
  }, []);

  const blockedReason = useMemo(() => {
    if (loadError || loading) return null;
    if (activeSchools.length === 0) {
      return 'You do not have an active school_admin link yet. Ask an admin to create a school and link you first.';
    }
    if (activeSchools.length > 1) {
      return 'Your account is linked to multiple schools. Please contact support to resolve this.';
    }
    return null;
  }, [activeSchools, loadError, loading]);

  const selectedSchool = activeSchools[0] || null;

  const filteredStaffItems = useMemo(() => {
    if (staffFilter === 'all') return staffItems;
    return staffItems.filter((item) => item.role === staffFilter);
  }, [staffFilter, staffItems]);

  const recentlyAdded = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return students.filter((s) => {
      if (!s.createdAt) return false;
      const t = new Date(s.createdAt).getTime();
      return !Number.isNaN(t) && t >= cutoff;
    }).length;
  }, [students]);

  const handleCreateStudent = async (payload: Parameters<typeof createStudentAsSchoolAdminFirebase>[0]) => {
    if (!selectedSchoolId) {
      toast.error('No active school is available for student creation.');
      return;
    }
    if (!payload.firstName || !payload.lastName || !payload.country || !payload.educationLevel) {
      toast.error('First name, last name, country, and education level are required.');
      return;
    }

    try {
      setCreating(true);
      const result = await createStudentAsSchoolAdminFirebase({
        ...payload,
        schoolId: selectedSchoolId,
      });
      setIssuedCredentials(result);
      setDialogOpen(false);
      toast.success('School-managed student created');
      await refreshDashboard();
    } catch (error) {
      console.error('[SchoolAdminDashboard] Failed to create managed student', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create student');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateStaff = async (payload: SchoolStaffCreatePayload) => {
    try {
      setStaffSubmitting(true);
      const result = await createSchoolStaffUserFirebase(payload);
      setIssuedStaffCredentials(result);
      setStaffDialogRole(null);
      toast.success(`${result.role === 'teacher' ? 'Teacher' : 'School admin'} account created`);
      await refreshDashboard();
    } catch (error) {
      console.error('[SchoolAdminDashboard] Failed to create school staff user', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create school staff user');
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleClaimStudent = async (code: string) => {
    try {
      setLinkSubmitting(true);
      const result = await claimStudentLinkCodeFirebase({ code });
      setLinkDialogOpen(false);
      if (result.status === 'already_linked') {
        toast.message('Student is already linked to this school.');
      } else {
        toast.success('Student linked to school');
      }
      await refreshDashboard();
    } catch (error) {
      console.error('[SchoolAdminDashboard] Failed to link student', error);
      toast.error(error instanceof Error ? error.message : 'Failed to link student');
    } finally {
      setLinkSubmitting(false);
    }
  };

  const handleGenerateInvite = async () => {
    try {
      setInviteLoading(true);
      const result = await generateStudentInviteAsSchoolAdminFirebase();
      if (result.ok) {
        toast.success('Student invite code generated');
        const inviteResponse = await listStudentInvitesAsSchoolAdminFirebase();
        if (inviteResponse.ok) {
          setInviteCodes(inviteResponse.items);
        }
      }
    } catch (error) {
      console.error('[SchoolAdminDashboard] Failed to generate invite', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate invite');
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {/* Welcome header */}
      <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-card to-card p-6 shadow-sm dark:border-violet-900/50 dark:from-violet-950/20">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            {selectedSchool ? `${selectedSchool.schoolName} overview` : 'School overview'}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Manage school-linked students and staff accounts for your school.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {selectedSchool ? (
              <>
                <span className="font-medium text-foreground">{selectedSchool.schoolName}</span>
                <span>•</span>
              </>
            ) : null}
            <span>{students.length} {students.length === 1 ? 'student' : 'students'}</span>
            <span>•</span>
            <span>{staffItems.length} {staffItems.length === 1 ? 'staff member' : 'staff members'}</span>
            <span>•</span>
            <span>{recentlyAdded} added in last 30 days</span>
          </div>
        </div>
      </section>

      {/* Preview mode banner */}
      {previewMode ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          School admin preview mode shows the layout only. Real school resolution, student creation, and staff reads require a school_admin session.
        </div>
      ) : null}

      {/* Dialogs — invisible until triggered */}
      <ManagedStudentCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        creatorRole="school_admin"
        title="Create Student as School Admin"
        description={
          selectedSchool
            ? `This creates an independent student account and links it to ${selectedSchool.schoolName}.`
            : 'This creates an independent student account and links it to your active school.'
        }
        submitting={creating}
        blockedReason={previewMode ? 'Disabled in admin preview mode.' : loadError || blockedReason}
        lockedSchoolId={selectedSchoolId}
        onSubmit={handleCreateStudent}
      />

      <ClaimStudentLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        title="Link Existing Student"
        description="Enter the student link code to connect their account to this school."
        submitting={linkSubmitting}
        blockedReason={previewMode ? 'Disabled in admin preview mode.' : loadError || blockedReason}
        onSubmit={handleClaimStudent}
      />

      <SchoolStaffCreateDialog
        open={staffDialogRole !== null}
        onOpenChange={(open) => !open && setStaffDialogRole(null)}
        role={staffDialogRole || 'teacher'}
        schoolName={selectedSchool?.schoolName || null}
        submitting={staffSubmitting}
        blockedReason={previewMode ? 'Disabled in admin preview mode.' : loadError || blockedReason}
        onSubmit={handleCreateStaff}
      />

      {/* Issued student credentials — shown after creating a student */}
      {issuedCredentials ? (
        <IssuedStudentCredentialsCard
          studentDisplayName={issuedCredentials.studentDisplayName}
          accessCode={issuedCredentials.accessCode}
          temporarySecret={issuedCredentials.temporarySecret}
          creatorRole={issuedCredentials.creatorRole}
          schoolId={issuedCredentials.schoolId}
        />
      ) : null}

      {/* Issued staff credentials — shown after creating a staff account */}
      {issuedStaffCredentials ? (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
          <p className="text-sm text-muted-foreground">Latest school staff credentials</p>
          <h3 className="text-lg font-semibold text-foreground">{issuedStaffCredentials.displayName}</h3>
          <p className="text-sm text-muted-foreground">
            {issuedStaffCredentials.role === 'teacher' ? 'Teacher' : 'School Admin'} · {issuedStaffCredentials.email}
          </p>
          {issuedStaffCredentials.temporaryPassword ? (
            <p className="text-sm">
              Temporary password: <span className="font-mono">{issuedStaffCredentials.temporaryPassword}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No temporary password was issued in this request.</p>
          )}
        </div>
      ) : null}

      {/* Load error */}
      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900 text-sm">
          Failed to resolve school-admin context: {loadError}
        </div>
      ) : null}

      {/* Blocked reason */}
      {blockedReason ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 text-sm">
          {blockedReason}
        </div>
      ) : null}

      {/* Summary stats */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-violet-200 bg-card p-5 shadow-sm dark:border-violet-900/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">School students</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{loading ? '—' : students.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">Students linked to this school.</p>
            </div>
            <div className="rounded-xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">School staff</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{loading ? '—' : staffItems.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">Teachers and admins at this school.</p>
            </div>
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Added recently</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{loading ? '—' : recentlyAdded}</p>
              <p className="mt-2 text-sm text-muted-foreground">Students joined in the last 30 days.</p>
            </div>
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
              <CalendarClock className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      {/* Student roster — promoted above invite codes */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">School students</h2>
          <p className="text-sm text-muted-foreground">
            Students linked to this school through managed creation or a claim code.
          </p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-48 rounded-2xl border border-border bg-card">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <ManagedStudentsTable
            items={students}
            emptyTitle="No school-managed students yet"
            emptyDescription="Use the actions below to add students to this school."
          />
        )}
      </section>

      {/* Staff section */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-5">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">School staff</h2>
          <p className="text-sm text-muted-foreground">
            Teachers and admins linked to this school.
          </p>
        </div>

        <Tabs value={staffFilter} onValueChange={(value) => setStaffFilter(value as typeof staffFilter)}>
          <TabsList>
            <TabsTrigger value="all">All Staff</TabsTrigger>
            <TabsTrigger value="school_admin">School Admins</TabsTrigger>
            <TabsTrigger value="teacher">Teachers</TabsTrigger>
          </TabsList>
        </Tabs>

        {staffLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredStaffItems.length === 0 ? (
          <div className="rounded-2xl border border-border bg-background p-8 text-center">
            <h3 className="font-semibold text-foreground">No school staff yet</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Once you add teachers or additional school admins, they will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaffItems.map((item) => (
                  <TableRow key={`${item.role}-${item.uid}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{item.displayName}</p>
                        <p className="text-xs text-muted-foreground">{item.email || item.uid}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.role === 'teacher' ? 'Teacher' : 'School Admin'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${staffStatusBadgeClass(item.status)}`}>
                        {normaliseStaffStatus(item.status)}
                      </div>
                    </TableCell>
                    <TableCell>{item.jobTitle || '—'}</TableCell>
                    <TableCell>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Roster actions */}
      <section className="rounded-2xl border border-violet-200 bg-card p-5 shadow-sm dark:border-violet-900/40">
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">School actions</h2>
            <p className="text-sm text-muted-foreground">
              Add and link students, or expand your school staff.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => setLinkDialogOpen(true)}
              disabled={Boolean(blockedReason) || Boolean(loadError)}
              className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-left transition-colors hover:bg-blue-100/80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900/40 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                  <Link2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Claim student code</h3>
                  <p className="text-sm text-muted-foreground">Link a student who has generated a school code.</p>
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
              disabled={Boolean(blockedReason) || Boolean(loadError)}
              className="rounded-xl border border-violet-200 bg-background p-4 text-left transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-900/40 dark:hover:bg-violet-950/20"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-violet-100 p-2 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Create student account</h3>
                  <p className="text-sm text-muted-foreground">Create and enrol a new student directly.</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-200">
                Open
                <ArrowRight className="h-4 w-4" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStaffDialogRole('teacher')}
              disabled={Boolean(blockedReason) || Boolean(loadError)}
              className="rounded-xl border border-violet-200 bg-background p-4 text-left transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-900/40 dark:hover:bg-violet-950/20"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-violet-100 p-2 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Add teacher</h3>
                  <p className="text-sm text-muted-foreground">Create a teacher account for this school.</p>
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
              disabled={Boolean(blockedReason) || inviteLoading}
              className="rounded-xl border border-orange-200 bg-orange-50/80 p-4 text-left transition-colors hover:bg-orange-100/80 disabled:cursor-not-allowed disabled:opacity-70 dark:border-orange-900/40 dark:bg-orange-950/20 dark:hover:bg-orange-950/30"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2 text-orange-700 dark:bg-orange-950/50 dark:text-orange-200">
                  <BadgePlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Generate school invite</h3>
                  <p className="text-sm text-muted-foreground">Send a code for an existing student to join this school.</p>
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
              <p className="text-sm font-medium text-muted-foreground">Active school</p>
              <h2 className="mt-0.5 text-xl font-semibold text-foreground">{selectedSchool.schoolName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {normaliseSchoolRole(selectedSchool.role)}
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
      ) : !loading && !loadError ? (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
              <School className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">School context</p>
              <p className="mt-1 text-sm text-foreground">No active school is linked to this account.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Contact a platform admin to be linked to a school before managing students.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* School-issued invite codes — utility section */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">School-issued invite codes</h2>
            <p className="text-sm text-muted-foreground">
              Active codes for existing students to join this school.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleGenerateInvite}
            disabled={Boolean(blockedReason) || inviteLoading}
            className="gap-2 border-border text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted/60"
          >
            <Building2 className="h-4 w-4" />
            {inviteLoading ? 'Generating…' : 'Generate Invite Code'}
          </Button>
        </div>
        {inviteCodes.length === 0 ? (
          <div className="text-sm text-muted-foreground">No active school-issued invite codes yet.</div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {inviteCodes.map((invite) => (
              <div key={invite.codeId} className="rounded-xl border border-border bg-background px-4 py-3 space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">School-issued</div>
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

export default function SchoolAdminDashboard() {
  return (
    <DashboardLayout>
      <SchoolAdminDashboardContent />
    </DashboardLayout>
  );
}
