import { useEffect, useState } from 'react';
import { Loader2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ClaimStudentLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitting: boolean;
  blockedReason?: string | null;
  onSubmit: (code: string) => Promise<void>;
}

export default function ClaimStudentLinkDialog({
  open,
  onOpenChange,
  title,
  description,
  submitting,
  blockedReason,
  onSubmit,
}: ClaimStudentLinkDialogProps) {
  const [code, setCode] = useState('');
  const canSubmit = code.trim().length >= 6 && !blockedReason;

  useEffect(() => {
    if (!open) {
      setCode('');
    }
  }, [open]);

  const handleSubmit = async () => {
    await onSubmit(code.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {blockedReason ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {blockedReason}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="student-link-code">Student link code</Label>
            <Input
              id="student-link-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={submitting}
              placeholder="Enter code from student"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Link Student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
