import { useEffect, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  adminProvisionIdentityTestUserFirebase,
  type AdminProvisionIdentityTestUserPayload,
} from '@/integrations/firebase/admin';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCountryOptions, getDefaultCountryOption, validateCountrySelection } from '@/lib/identity-options';

type AddableRole = 'parent' | 'teacher' | 'school_admin';

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void> | void;
}

export default function AddUserDialog({ open, onOpenChange, onCreated }: AddUserDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<AddableRole>('parent');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState(getDefaultCountryOption());
  const [password, setPassword] = useState('');
  const countryOptions = useState(() => getCountryOptions())[0];
  const canSubmit = displayName.trim().length > 0 && email.trim().length > 0 && validateCountrySelection(country);

  useEffect(() => {
    if (!open) {
      setRole('parent');
      setDisplayName('');
      setEmail('');
      setCountry(getDefaultCountryOption());
      setPassword('');
    }
  }, [open]);

  const handleSubmit = async () => {
    const payload: AdminProvisionIdentityTestUserPayload = {
      role,
      email: email.trim(),
      displayName: displayName.trim(),
      country,
      password: password.trim() || undefined,
    };

    if (!payload.email || !payload.displayName) {
      toast.error('Display name and email are required.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await adminProvisionIdentityTestUserFirebase(payload);
      toast.success(
        result.created
          ? `${result.role} user created`
          : `${result.role} user updated`,
      );
      if (result.temporaryPassword) {
        toast.success(`Issued password: ${result.temporaryPassword}`);
      }
      onOpenChange(false);
      await onCreated();
    } catch (error) {
      console.error('[AddUserDialog] Failed to provision user', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add User
          </DialogTitle>
          <DialogDescription>
            Temporary admin creation flow for `parent`, `teacher`, and `school_admin`. Use the Schools tab for school organization creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>User role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as AddableRole)}>
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
            <Label htmlFor="add-user-display-name">Display name</Label>
            <Input
              id="add-user-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Grace Nansubuga"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-user-email">Email</Label>
            <Input
              id="add-user-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="grace@example.com"
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
              <Label htmlFor="add-user-password">Password (optional)</Label>
              <Input
                id="add-user-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Auto-generate if blank"
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !canSubmit}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
