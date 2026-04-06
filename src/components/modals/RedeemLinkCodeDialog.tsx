import { useState } from 'react';
import { redeemLinkCodeFirebase } from '@/integrations/firebase/linking';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Key, Loader2, UserCheck, AlertCircle } from 'lucide-react';

interface RedeemLinkCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function RedeemLinkCodeDialog({
  open,
  onOpenChange,
  onSuccess,
}: RedeemLinkCodeDialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeSuccess = (message: string) => {
    toast.success(message);
    setCode('');
    onOpenChange(false);
    onSuccess?.();
  };

  const handleRedeem = async () => {
    const normalizedCode = code.toUpperCase().trim();
    if (!normalizedCode) {
      setError('Please enter a code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await redeemLinkCodeFirebase(normalizedCode);
      if (!result.ok) {
        setError('Invalid or expired code. Please check and try again.');
        return;
      }

      if (result.status === 'already_linked' || result.status === 'already_redeemed') {
        completeSuccess('Account was already linked.');
        return;
      }

      completeSuccess('Successfully linked account!');
    } catch (err) {
      console.error('Redeem error:', err);
      setError('Failed to redeem code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Enter Link Code
          </DialogTitle>
          <DialogDescription>
            Enter the code shared by your parent or school to link your accounts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="link-code">Link Code</Label>
            <Input
              id="link-code"
              type="text"
              placeholder="Enter 8-character code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
              className="font-mono text-center text-lg tracking-widest"
              maxLength={8}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <Button
            onClick={handleRedeem}
            disabled={loading || !code.trim()}
            className="w-full gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
            Link Account
          </Button>

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Ask your parent or school administrator for a link code.
              Once linked, they can view your learning progress.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
