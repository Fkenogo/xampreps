import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  onSuccess 
}: RedeemLinkCodeDialogProps) {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRedeem = async () => {
    if (!code.trim()) {
      setError('Please enter a code');
      return;
    }

    if (!user?.id) {
      setError('You must be logged in');
      return;
    }

    setLoading(true);
    setError(null);

    // Find the link code
    const { data: linkCode, error: findError } = await supabase
      .from('link_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .is('used_by', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (findError || !linkCode) {
      setError('Invalid or expired code. Please check and try again.');
      setLoading(false);
      return;
    }

    // Check if already linked
    const { data: existingLink } = await supabase
      .from('linked_accounts')
      .select('id')
      .eq('parent_or_school_id', linkCode.creator_id)
      .eq('student_id', user.id)
      .maybeSingle();

    if (existingLink) {
      setError('You are already linked to this account');
      setLoading(false);
      return;
    }

    // Mark code as used
    const { error: updateError } = await supabase
      .from('link_codes')
      .update({ 
        used_by: user.id, 
        used_at: new Date().toISOString() 
      })
      .eq('id', linkCode.id);

    if (updateError) {
      console.error('Error updating code:', updateError);
      setError('Failed to redeem code');
      setLoading(false);
      return;
    }

    // Create linked account
    const { error: linkError } = await supabase
      .from('linked_accounts')
      .insert({
        parent_or_school_id: linkCode.creator_id,
        student_id: user.id,
      });

    if (linkError) {
      console.error('Error creating link:', linkError);
      setError('Failed to link accounts');
      setLoading(false);
      return;
    }

    toast.success(`Successfully linked with ${linkCode.creator_type === 'parent' ? 'parent' : 'school'}!`);
    setCode('');
    onOpenChange(false);
    onSuccess?.();
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
