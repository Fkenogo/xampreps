import { useEffect, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SchoolStaffCreatePayload } from '@/integrations/firebase/identity';
import { getCountryOptions, getDefaultCountryOption, validateCountrySelection } from '@/lib/identity-options';

interface SchoolStaffCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: 'school_admin' | 'teacher';
  schoolName: string | null;
  submitting: boolean;
  blockedReason?: string | null;
  onSubmit: (payload: SchoolStaffCreatePayload) => Promise<void>;
}

export default function SchoolStaffCreateDialog({
  open,
  onOpenChange,
  role,
  schoolName,
  submitting,
  blockedReason,
  onSubmit,
}: SchoolStaffCreateDialogProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState(getDefaultCountryOption());
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [password, setPassword] = useState('');
  const countryOptions = useState(() => getCountryOptions())[0];
  const canSubmit =
    displayName.trim().length > 0 &&
    email.trim().length > 0 &&
    validateCountrySelection(country) &&
    !blockedReason;

  useEffect(() => {
    if (!open) {
      setDisplayName('');
      setEmail('');
      setCountry(getDefaultCountryOption());
      setPhone('');
      setJobTitle('');
      setPassword('');
    }
  }, [open]);

  const handleSubmit = async () => {
    await onSubmit({
      role,
      displayName: displayName.trim(),
      email: email.trim(),
      country,
      phone: phone.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      password: password.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add {role === 'teacher' ? 'Teacher' : 'School Admin'}
          </DialogTitle>
          <DialogDescription>
            {schoolName
              ? `Create a ${role === 'teacher' ? 'teacher' : 'school admin'} account linked to ${schoolName}.`
              : 'Create a school staff account linked to the active school context.'}
          </DialogDescription>
        </DialogHeader>

        {blockedReason ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {blockedReason}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`school-staff-name-${role}`}>Display name</Label>
              <Input
                id={`school-staff-name-${role}`}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`school-staff-email-${role}`}>Email</Label>
              <Input
                id={`school-staff-email-${role}`}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={country} onValueChange={setCountry} disabled={submitting}>
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label htmlFor={`school-staff-phone-${role}`}>Phone (optional)</Label>
                <Input
                  id={`school-staff-phone-${role}`}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`school-staff-title-${role}`}>Job title (optional)</Label>
                <Input
                  id={`school-staff-title-${role}`}
                  value={jobTitle}
                  onChange={(event) => setJobTitle(event.target.value)}
                  placeholder={role === 'teacher' ? 'Mathematics Teacher' : 'Deputy School Admin'}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`school-staff-password-${role}`}>Password (optional)</Label>
                <Input
                  id={`school-staff-password-${role}`}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Auto-generate if blank"
                  disabled={submitting}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create {role === 'teacher' ? 'Teacher' : 'School Admin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
