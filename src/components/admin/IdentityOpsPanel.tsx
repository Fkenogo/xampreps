import { useMemo, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCcw, UserPlus, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import {
  adminProvisionIdentityTestUserFirebase,
  adminResetIdentitySystemFirebase,
  type AdminProvisionIdentityTestUserPayload,
} from '@/integrations/firebase/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getCountryOptions, getDefaultCountryOption, validateCountrySelection } from '@/lib/identity-options';

type IdentityRole = 'parent' | 'teacher' | 'school_admin';

interface IdentityOpsPanelProps {
  isSuperAdmin: boolean;
  onUsersChanged: () => Promise<void> | void;
  onSchoolsChanged: () => Promise<void> | void;
}

interface IdentityOpsLogEntry {
  id: string;
  timestamp: string;
  title: string;
  payload: unknown;
  tone: 'default' | 'success' | 'danger';
}

const RESET_CONFIRM_TOKEN = 'RESET_IDENTITY_SYSTEM';

function serializeLogPayload(payload: unknown) {
  return JSON.stringify(payload, null, 2);
}

export default function IdentityOpsPanel({
  isSuperAdmin,
  onUsersChanged,
  onSchoolsChanged,
}: IdentityOpsPanelProps) {
  const [resetLoading, setResetLoading] = useState(false);
  const [testUserLoading, setTestUserLoading] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [testRole, setTestRole] = useState<IdentityRole>('parent');
  const [testEmail, setTestEmail] = useState('');
  const [testDisplayName, setTestDisplayName] = useState('');
  const [testCountry, setTestCountry] = useState(getDefaultCountryOption());
  const [testPassword, setTestPassword] = useState('');
  const [logs, setLogs] = useState<IdentityOpsLogEntry[]>([]);
  const countryOptions = useState(() => getCountryOptions())[0];

  const canExecuteReset = isSuperAdmin && resetConfirm.trim() === RESET_CONFIRM_TOKEN;

  const logCountLabel = useMemo(() => `${logs.length} operation${logs.length === 1 ? '' : 's'}`, [logs.length]);

  const appendLog = (title: string, payload: unknown, tone: IdentityOpsLogEntry['tone'] = 'default') => {
    setLogs((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        title,
        payload,
        tone,
      },
      ...current,
    ]);
  };

  const handleDryRunReset = async () => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can run identity reset dry-runs.');
      return;
    }

    try {
      setResetLoading(true);
      const result = await adminResetIdentitySystemFirebase({ dryRun: true });
      appendLog('Identity reset dry-run', result, 'default');
      toast.success('Dry-run completed. Review the result log below.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Identity reset dry-run failed';
      appendLog('Identity reset dry-run failed', { message }, 'danger');
      toast.error(message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleExecuteReset = async () => {
    if (!canExecuteReset) {
      toast.error(`Type ${RESET_CONFIRM_TOKEN} exactly to execute the reset.`);
      return;
    }

    try {
      setResetLoading(true);
      const result = await adminResetIdentitySystemFirebase({
        dryRun: false,
        confirm: RESET_CONFIRM_TOKEN,
      });
      appendLog('Identity reset executed', result, 'danger');
      toast.success('Identity reset completed.');
      await onUsersChanged();
      await onSchoolsChanged();
      setResetConfirm('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Identity reset failed';
      appendLog('Identity reset failed', { message }, 'danger');
      toast.error(message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleProvisionTestUser = async () => {
    const payload: AdminProvisionIdentityTestUserPayload = {
      role: testRole,
      email: testEmail.trim(),
      displayName: testDisplayName.trim(),
      country: testCountry,
      password: testPassword.trim() || undefined,
    };

    if (!payload.email || !payload.displayName || !validateCountrySelection(testCountry)) {
      toast.error('Email, display name, and a valid country are required.');
      return;
    }

    try {
      setTestUserLoading(true);
      const result = await adminProvisionIdentityTestUserFirebase(payload);
      appendLog(`Identity test user ${result.created ? 'created' : 'updated'}`, result, 'success');
      toast.success(
        result.created
          ? `${result.role} test user created`
          : `${result.role} test user updated`,
      );
      await onUsersChanged();
      setTestEmail('');
      setTestDisplayName('');
      setTestPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to provision identity test user';
      appendLog('Identity test user provisioning failed', { message, payload }, 'danger');
      toast.error(message);
    } finally {
      setTestUserLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              Identity Ops
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Temporary Phase 4 operator panel for reset validation and canonical test-user setup.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLogs([])}
            disabled={logs.length === 0}
          >
            Clear Logs
          </Button>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-border p-5 space-y-4">
            <div className="space-y-1">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <RefreshCcw className="w-4 h-4 text-amber-600" />
                Identity Reset
              </h4>
              <p className="text-sm text-muted-foreground">
                Super-admin-only reset for identity collections and non-admin auth users. Exam engine data is untouched.
              </p>
            </div>

            {!isSuperAdmin && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Dry-run and execute reset are disabled unless you are signed in as `super_admin`.
              </div>
            )}

            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                <div>
                  This reset removes legacy identity collections and all non-admin identity records. Run a dry-run first,
                  then type <strong>{RESET_CONFIRM_TOKEN}</strong> exactly before execution.
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="identity-reset-confirm">Execution confirmation token</Label>
              <Input
                id="identity-reset-confirm"
                value={resetConfirm}
                onChange={(event) => setResetConfirm(event.target.value)}
                placeholder={RESET_CONFIRM_TOKEN}
                disabled={!isSuperAdmin || resetLoading}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={handleDryRunReset}
                disabled={!isSuperAdmin || resetLoading}
              >
                {resetLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Dry Run Reset
              </Button>
              <Button
                variant="destructive"
                onClick={handleExecuteReset}
                disabled={!canExecuteReset || resetLoading}
              >
                {resetLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Execute Reset
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border p-5 space-y-4">
            <div className="space-y-1">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                Test User Registration
              </h4>
              <p className="text-sm text-muted-foreground">
                Create or update canonical `parent`, `teacher`, and `school_admin` test users for Phase 4 validation.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={testRole} onValueChange={(value) => setTestRole(value as IdentityRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="school_admin">School Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="identity-test-country">Country</Label>
                <Select value={testCountry} onValueChange={setTestCountry} disabled={testUserLoading}>
                  <SelectTrigger id="identity-test-country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="identity-test-display-name">Display name</Label>
              <Input
                id="identity-test-display-name"
                value={testDisplayName}
                onChange={(event) => setTestDisplayName(event.target.value)}
                placeholder="Grace Nansubuga"
                disabled={testUserLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="identity-test-email">Email</Label>
              <Input
                id="identity-test-email"
                type="email"
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
                placeholder="grace.parent@example.com"
                disabled={testUserLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="identity-test-password">Password (optional)</Label>
              <Input
                id="identity-test-password"
                type="text"
                value={testPassword}
                onChange={(event) => setTestPassword(event.target.value)}
                placeholder="Leave blank to auto-generate"
                disabled={testUserLoading}
              />
              <p className="text-xs text-muted-foreground">
                If the user already exists and you leave this blank, the password is unchanged.
              </p>
            </div>

            <Button onClick={handleProvisionTestUser} disabled={testUserLoading}>
              {testUserLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create or Register Test User
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <div>
            <h4 className="font-medium text-foreground">Operation Log</h4>
            <p className="text-sm text-muted-foreground">{logCountLabel}</p>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground">
            No identity operations have been run yet from this panel.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((entry) => (
              <div key={entry.id} className="p-4 space-y-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-2.5 w-2.5 rounded-full ${
                        entry.tone === 'danger'
                          ? 'bg-destructive'
                          : entry.tone === 'success'
                            ? 'bg-emerald-500'
                            : 'bg-primary'
                      }`}
                    />
                    <span className="font-medium text-foreground">{entry.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                <Textarea
                  readOnly
                  value={serializeLogPayload(entry.payload)}
                  className="min-h-[180px] font-mono text-xs"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
