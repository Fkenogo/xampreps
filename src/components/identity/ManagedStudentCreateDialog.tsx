import { useEffect, useMemo, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ManagedStudentCreatePayload } from '@/integrations/firebase/identity';
import {
  getCountryOptions,
  getDefaultCountryOption,
  getEducationLevelOptionsForCountry,
  validateCountryLevelSelection,
  validateCountrySelection,
} from '@/lib/identity-options';

type CreatorRole = 'parent' | 'teacher' | 'school_admin';

interface ManagedStudentCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorRole: CreatorRole;
  title: string;
  description: string;
  submitting: boolean;
  blockedReason?: string | null;
  lockedSchoolId?: string | null;
  onSubmit: (payload: ManagedStudentCreatePayload) => Promise<void>;
}

const relationshipOptions = ['guardian', 'mother', 'father', 'sponsor', 'other'] as const;

export default function ManagedStudentCreateDialog({
  open,
  onOpenChange,
  creatorRole,
  title,
  description,
  submitting,
  blockedReason,
  lockedSchoolId,
  onSubmit,
}: ManagedStudentCreateDialogProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState(getDefaultCountryOption());
  const [educationLevel, setEducationLevel] = useState('');
  const [relationshipType, setRelationshipType] = useState<(typeof relationshipOptions)[number]>('guardian');
  const [subjectTagsText, setSubjectTagsText] = useState('');
  const [className, setClassName] = useState('');
  const [streamName, setStreamName] = useState('');

  const subjectTags = useMemo(
    () =>
      subjectTagsText
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
    [subjectTagsText],
  );
  const countryOptions = useMemo(() => getCountryOptions(), []);
  const educationLevelOptions = useMemo(
    () => getEducationLevelOptionsForCountry(country),
    [country],
  );
  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    validateCountrySelection(country) &&
    validateCountryLevelSelection(country, educationLevel) &&
    !blockedReason;

  useEffect(() => {
    if (!open) {
      setFirstName('');
      setLastName('');
      setCountry(getDefaultCountryOption());
      setEducationLevel('');
      setRelationshipType('guardian');
      setSubjectTagsText('');
      setClassName('');
      setStreamName('');
    }
  }, [open]);

  useEffect(() => {
    if (educationLevel && !validateCountryLevelSelection(country, educationLevel)) {
      setEducationLevel('');
    }
  }, [country, educationLevel]);

  const handleSubmit = async () => {
    await onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      country,
      educationLevel,
      relationshipType: creatorRole === 'parent' ? relationshipType : undefined,
      subjectTags: creatorRole === 'teacher' && subjectTags.length > 0 ? subjectTags : undefined,
      schoolId: creatorRole === 'school_admin' ? lockedSchoolId || undefined : undefined,
      className: creatorRole === 'school_admin' ? className.trim() || undefined : undefined,
      streamName: creatorRole === 'school_admin' ? streamName.trim() || undefined : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {blockedReason ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {blockedReason}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${creatorRole}-student-firstName`}>First name</Label>
                <Input
                  id={`${creatorRole}-student-firstName`}
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${creatorRole}-student-lastName`}>Last name</Label>
                <Input
                  id={`${creatorRole}-student-lastName`}
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  disabled={submitting}
                />
              </div>
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
                <Label>Education level</Label>
                <Select value={educationLevel || undefined} onValueChange={setEducationLevel} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select education level" />
                  </SelectTrigger>
                  <SelectContent>
                    {educationLevelOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {creatorRole === 'parent' && (
              <div className="space-y-2">
                <Label htmlFor="parent-student-relationship">Relationship type</Label>
                <Input
                  id="parent-student-relationship"
                  value={relationshipType}
                  onChange={(event) => setRelationshipType(event.target.value as (typeof relationshipOptions)[number])}
                  placeholder="guardian"
                  disabled={submitting}
                />
              </div>
            )}

            {creatorRole === 'teacher' && (
              <div className="space-y-2">
                <Label htmlFor="teacher-student-subjects">Subject tags (optional)</Label>
                <Textarea
                  id="teacher-student-subjects"
                  value={subjectTagsText}
                  onChange={(event) => setSubjectTagsText(event.target.value)}
                  placeholder="Mathematics, English"
                  className="min-h-[90px]"
                  disabled={submitting}
                />
              </div>
            )}

            {creatorRole === 'school_admin' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="school-admin-student-class">Class name (optional)</Label>
                  <Input
                    id="school-admin-student-class"
                    value={className}
                    onChange={(event) => setClassName(event.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-admin-student-stream">Stream name (optional)</Label>
                  <Input
                    id="school-admin-student-stream"
                    value={streamName}
                    onChange={(event) => setStreamName(event.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create Student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
