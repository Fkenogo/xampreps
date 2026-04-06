import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  searchLinkTargetFirebase,
  sendLinkRequestFirebase,
} from '@/integrations/firebase/linking';
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
  const { user } = useAuth();
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

    try {
      const result = await searchLinkTargetFirebase(email, targetRole);
      if (!result.ok || !result.target) {
        const reason = result.reason || 'not_found';
        if (reason === 'role_mismatch') {
          setError(`This account is not a ${getTargetLabel()} account`);
        } else if (reason === 'already_linked') {
          setError('You are already linked to this account');
        } else if (reason === 'pending_exists') {
          setError('A link request already exists between you and this user');
        } else if (reason === 'self') {
          setError('You cannot link your own account');
        } else {
          setError(`No ${getTargetLabel()} found with this email`);
        }
        setLoading(false);
        return;
      }

      setSearchResult({
        id: result.target.id,
        name: result.target.name,
        email: result.target.email,
      });
    } catch (searchError) {
      console.error('Firebase search link target error:', searchError);
      setError('Unable to search this user right now');
    }
    setLoading(false);
  };

  const handleSendRequest = async () => {
    if (!searchResult || !user?.id) return;

    setLoading(true);
    try {
      const result = await sendLinkRequestFirebase(searchResult.id);
      if (result.ok) {
        toast.success(`Link request sent to ${searchResult.name}!`);
        handleClose();
        onSuccess?.();
      } else {
        toast.error('Failed to send link request');
      }
    } catch (requestError) {
      console.error('Error sending Firebase link request:', requestError);
      toast.error('Failed to send link request');
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
