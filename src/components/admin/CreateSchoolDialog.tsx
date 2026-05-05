import { useMemo, useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  adminCreateSchoolFirebase,
  type AdminSchoolAdminCandidate,
} from '@/integrations/firebase/admin';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateSchoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolAdminCandidates: AdminSchoolAdminCandidate[];
  candidatesLoaded?: boolean;
  onCreated: () => Promise<void> | void;
}

const SCHOOL_TYPES = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'other', label: 'Other' },
] as const;

export default function CreateSchoolDialog({
  open,
  onOpenChange,
  schoolAdminCandidates,
  candidatesLoaded = false,
  onCreated,
}: CreateSchoolDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [district, setDistrict] = useState('');
  const [country, setCountry] = useState('Uganda');
  const [schoolType, setSchoolType] = useState<'primary' | 'secondary' | 'mixed' | 'other'>('secondary');
  const [schoolAdminUid, setSchoolAdminUid] = useState('');

  const selectedAdmin = useMemo(
    () => schoolAdminCandidates.find((candidate) => candidate.id === schoolAdminUid) || null,
    [schoolAdminCandidates, schoolAdminUid],
  );
  const canSubmit =
    !submitting &&
    Boolean(name.trim()) &&
    Boolean(country.trim()) &&
    Boolean(schoolAdminUid);

  const resetForm = () => {
    setName('');
    setShortName('');
    setRegistrationNumber('');
    setDistrict('');
    setCountry('Uganda');
    setSchoolType('secondary');
    setSchoolAdminUid('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('School name is required');
      return;
    }
    if (!country.trim()) {
      toast.error('Country is required');
      return;
    }
    if (!schoolAdminUid) {
      toast.error('Select a school admin user');
      return;
    }

    try {
      setSubmitting(true);
      await adminCreateSchoolFirebase({
        name: name.trim(),
        shortName: shortName.trim() || undefined,
        registrationNumber: registrationNumber.trim() || undefined,
        district: district.trim() || undefined,
        country: country.trim(),
        schoolType,
        schoolAdminUid,
      });
      toast.success('School record created and first school admin linked');
      resetForm();
      onOpenChange(false);
      await onCreated();
    } catch (error) {
      console.error('Failed to create school:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create school');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Create School Organization
          </DialogTitle>
          <DialogDescription>
            This creates a `schools/{'{schoolId}'}` institution record and the first `school_admin_links` entry.
            It does not create a new auth user in this phase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="school-name">School Name</Label>
            <Input id="school-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="St. Mary's College" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="school-short-name">Short Name</Label>
              <Input id="school-short-name" value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="SMC" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration-number">Registration Number</Label>
              <Input id="registration-number" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <Input id="district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>School Type</Label>
            <Select value={schoolType} onValueChange={(value) => setSchoolType(value as typeof schoolType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select school type" />
              </SelectTrigger>
              <SelectContent>
                {SCHOOL_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>First School Admin</Label>
            <Select value={schoolAdminUid} onValueChange={setSchoolAdminUid} disabled={schoolAdminCandidates.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Select an existing school_admin user" />
              </SelectTrigger>
              <SelectContent>
                {schoolAdminCandidates.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.name} {candidate.email ? `(${candidate.email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only active canonical users with `users.primaryRole = school_admin` are eligible in this phase.
            </p>
            {schoolAdminCandidates.length === 0 && (
              <p className="text-xs text-amber-700">
                No eligible school_admin users found in canonical users collection.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Candidate load: {candidatesLoaded ? 'completed' : 'loading'} • loaded candidates: {schoolAdminCandidates.length}
            </p>
            {selectedAdmin && (
              <p className="text-xs text-foreground">
                Linking to: <strong>{selectedAdmin.name}</strong> {selectedAdmin.email ? `• ${selectedAdmin.email}` : ''}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create School
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
