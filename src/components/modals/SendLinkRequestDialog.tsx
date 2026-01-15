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
import { 
  Send, 
  Search, 
  Loader2, 
  UserCheck,
  AlertCircle,
  Mail,
} from 'lucide-react';

interface SendLinkRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetRole: 'student' | 'parent' | 'school';
  onSuccess?: () => void;
}

export default function SendLinkRequestDialog({
  open,
  onOpenChange,
  targetRole,
  onSuccess,
}: SendLinkRequestDialogProps) {
  const { user, role } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getTargetLabel = () => {
    switch (targetRole) {
      case 'student':
        return 'student';
      case 'parent':
        return 'parent';
      case 'school':
        return 'school';
      default:
        return 'user';
    }
  };

  const handleSearch = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setSearchResult(null);
    setError(null);

    // Find user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (profileError || !profile) {
      setError(`No ${getTargetLabel()} found with this email`);
      setLoading(false);
      return;
    }

    // Check if they have the correct role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (userRole?.role !== targetRole) {
      setError(`This account is not a ${getTargetLabel()} account`);
      setLoading(false);
      return;
    }

    // Check if already linked
    const { data: existingLink } = await supabase
      .from('linked_accounts')
      .select('id')
      .or(
        `and(parent_or_school_id.eq.${user?.id},student_id.eq.${profile.id}),and(parent_or_school_id.eq.${profile.id},student_id.eq.${user?.id})`
      )
      .maybeSingle();

    if (existingLink) {
      setError('You are already linked to this account');
      setLoading(false);
      return;
    }

    // Check for pending request
    const { data: pendingRequest } = await supabase
      .from('link_requests')
      .select('id')
      .or(
        `and(requester_id.eq.${user?.id},target_id.eq.${profile.id}),and(requester_id.eq.${profile.id},target_id.eq.${user?.id})`
      )
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingRequest) {
      setError('A link request already exists between you and this user');
      setLoading(false);
      return;
    }

    setSearchResult(profile);
    setLoading(false);
  };

  const handleSendRequest = async () => {
    if (!searchResult || !user?.id) return;

    setLoading(true);

    const { error: insertError } = await supabase
      .from('link_requests')
      .insert({
        requester_id: user.id,
        target_id: searchResult.id,
        status: 'pending',
      });

    if (insertError) {
      console.error('Error sending request:', insertError);
      toast.error('Failed to send link request');
    } else {
      toast.success(`Link request sent to ${searchResult.name}!`);
      handleClose();
      onSuccess?.();
    }
    setLoading(false);
  };

  const handleClose = () => {
    setEmail('');
    setSearchResult(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Connect with {getTargetLabel()}
          </DialogTitle>
          <DialogDescription>
            Send a connection request to link accounts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search-email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {getTargetLabel().charAt(0).toUpperCase() + getTargetLabel().slice(1)}'s Email
            </Label>
            <div className="flex gap-2">
              <Input
                id="search-email"
                type="email"
                placeholder={`Enter ${getTargetLabel()}'s email`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                  setSearchResult(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button 
                onClick={handleSearch} 
                disabled={loading} 
                variant="secondary"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {searchResult && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  {searchResult.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-foreground">{searchResult.name}</p>
                  <p className="text-sm text-muted-foreground">{searchResult.email}</p>
                </div>
              </div>
              <Button 
                onClick={handleSendRequest} 
                disabled={loading} 
                className="w-full gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Connection Request
              </Button>
            </div>
          )}

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              The {getTargetLabel()} will receive your request and can choose to accept or decline. 
              Once accepted, accounts will be linked.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
