import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import RedeemLinkCodeDialog from '@/components/modals/RedeemLinkCodeDialog';
import SendLinkRequestDialog from '@/components/modals/SendLinkRequestDialog';
import GenerateLinkCodeDialog from '@/components/modals/GenerateLinkCodeDialog';
import {
  Users,
  Key,
  Send,
  School,
  UserCheck,
  Link2,
  Plus,
  Unlink,
  Loader2,
} from 'lucide-react';

interface LinkedAccount {
  id: string;
  name: string;
  email: string;
  type: 'parent' | 'school' | 'student';
  linkedAt: string;
}

export default function AccountLinkingSection() {
  const { user, role } = useAuth();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [showSendRequestDialog, setShowSendRequestDialog] = useState(false);
  const [showGenerateCodeDialog, setShowGenerateCodeDialog] = useState(false);
  const [requestTargetRole, setRequestTargetRole] = useState<'student' | 'parent' | 'school'>('parent');

  const fetchLinkedAccounts = async () => {
    if (!user?.id) return;

    let accounts: LinkedAccount[] = [];

    if (role === 'student') {
      // Students: fetch parents/schools linked to them
      const { data: links } = await supabase
        .from('linked_accounts')
        .select('id, parent_or_school_id, linked_at')
        .eq('student_id', user.id);

      if (links && links.length > 0) {
        const ids = links.map(l => l.parent_or_school_id);
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', ids);

        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', ids);

        accounts = links.map(link => {
          const profile = profiles?.find(p => p.id === link.parent_or_school_id);
          const userRole = roles?.find(r => r.user_id === link.parent_or_school_id);
          return {
            id: link.id,
            name: profile?.name || 'Unknown',
            email: profile?.email || '',
            type: userRole?.role === 'school' ? 'school' : 'parent',
            linkedAt: link.linked_at,
          };
        });
      }
    } else if (role === 'parent' || role === 'school') {
      // Parents/Schools: fetch students linked to them
      const { data: links } = await supabase
        .from('linked_accounts')
        .select('id, student_id, linked_at')
        .eq('parent_or_school_id', user.id);

      if (links && links.length > 0) {
        const ids = links.map(l => l.student_id);
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', ids);

        accounts = links.map(link => {
          const profile = profiles?.find(p => p.id === link.student_id);
          return {
            id: link.id,
            name: profile?.name || 'Unknown',
            email: profile?.email || '',
            type: 'student' as const,
            linkedAt: link.linked_at,
          };
        });
      }
    }

    setLinkedAccounts(accounts);
    setLoading(false);
  };

  useEffect(() => {
    fetchLinkedAccounts();
  }, [user?.id, role]);

  const handleSendRequest = (targetRole: 'student' | 'parent' | 'school') => {
    setRequestTargetRole(targetRole);
    setShowSendRequestDialog(true);
  };

  const handleUnlink = async (linkId: string, name: string) => {
    if (!confirm(`Are you sure you want to unlink from ${name}?`)) return;
    setUnlinking(linkId);
    const { error } = await supabase.from('linked_accounts').delete().eq('id', linkId);
    setUnlinking(null);
    if (error) {
      toast.error('Failed to unlink account');
    } else {
      toast.success(`Unlinked from ${name}`);
      setLinkedAccounts(prev => prev.filter(a => a.id !== linkId));
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'school':
        return <School className="w-5 h-5" />;
      case 'parent':
        return <UserCheck className="w-5 h-5" />;
      default:
        return <Users className="w-5 h-5" />;
    }
  };

  const getAccountColor = (type: string) => {
    switch (type) {
      case 'school':
        return 'bg-blue-500/20 text-blue-500';
      case 'parent':
        return 'bg-emerald-500/20 text-emerald-500';
      default:
        return 'bg-violet-500/20 text-violet-500';
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Linked Accounts
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage connections with {role === 'student' ? 'parents and schools' : 'students'}
          </p>
        </div>
      </div>

      {/* Linking Options */}
      <div className="grid sm:grid-cols-2 gap-3">
        {role === 'student' ? (
          <>
            <Button
              variant="outline"
              className="gap-2 h-auto py-4 justify-start"
              onClick={() => setShowRedeemDialog(true)}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">Enter Link Code</p>
                <p className="text-xs text-muted-foreground">Use code from parent/school</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="gap-2 h-auto py-4 justify-start"
              onClick={() => handleSendRequest('parent')}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Send className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-left">
                <p className="font-medium">Request Parent Link</p>
                <p className="text-xs text-muted-foreground">Send connection request</p>
              </div>
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              className="gap-2 h-auto py-4 justify-start"
              onClick={() => setShowGenerateCodeDialog(true)}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">Generate Link Code</p>
                <p className="text-xs text-muted-foreground">Create code for student</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="gap-2 h-auto py-4 justify-start"
              onClick={() => handleSendRequest('student')}
            >
              <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                <Send className="w-5 h-5 text-violet-500" />
              </div>
              <div className="text-left">
                <p className="font-medium">Send Link Request</p>
                <p className="text-xs text-muted-foreground">Request to link student</p>
              </div>
            </Button>
          </>
        )}
      </div>

      {/* Linked Accounts List */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Connected Accounts ({linkedAccounts.length})
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : linkedAccounts.length === 0 ? (
          <div className="text-center py-8 px-4 bg-muted/30 rounded-xl border border-dashed border-border">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No linked accounts yet
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {role === 'student'
                ? 'Enter a code or send a request to connect with your parent or school'
                : 'Generate a code or send a request to connect with students'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {linkedAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getAccountColor(account.type)}`}>
                  {getAccountIcon(account.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{account.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                </div>
                <span className="px-2 py-1 bg-muted rounded-full text-xs text-muted-foreground capitalize">
                  {account.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <RedeemLinkCodeDialog
        open={showRedeemDialog}
        onOpenChange={setShowRedeemDialog}
        onSuccess={fetchLinkedAccounts}
      />

      <SendLinkRequestDialog
        open={showSendRequestDialog}
        onOpenChange={setShowSendRequestDialog}
        targetRole={requestTargetRole}
        onSuccess={fetchLinkedAccounts}
      />

      <GenerateLinkCodeDialog
        open={showGenerateCodeDialog}
        onOpenChange={setShowGenerateCodeDialog}
        creatorType={role === 'school' ? 'school' : 'parent'}
      />
    </div>
  );
}
