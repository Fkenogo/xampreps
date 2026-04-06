import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  listLinkedAccountsFirebase,
  unlinkAccountFirebase,
} from '@/integrations/firebase/linking';
import { Users, UserCheck, School, Unlink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface LinkedAccount {
  id: string;
  name: string;
  email: string;
  type: 'parent' | 'school';
  linkedAt: string;
}

export default function LinkedAccountsCard() {
  const { user } = useAuth();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  const handleUnlink = async (linkId: string, name: string) => {
    if (!confirm(`Are you sure you want to unlink from ${name}?`)) return;
    setUnlinking(linkId);

    try {
      const result = await unlinkAccountFirebase(linkId);
      if (result.ok) {
        toast.success(`Unlinked from ${name}`);
        setLinkedAccounts((prev) => prev.filter((a) => a.id !== linkId));
      } else {
        toast.error('Failed to unlink account');
      }
    } catch (error) {
      console.error('Error unlinking Firebase account:', error);
      toast.error('Failed to unlink account');
    } finally {
      setUnlinking(null);
    }
  };

  useEffect(() => {
    const fetchLinkedAccounts = async () => {
      if (!user?.id) return;

      try {
        const response = await listLinkedAccountsFirebase();
        if (response.ok) {
          const accounts = response.items
            .filter((item) => item.type === 'parent' || item.type === 'school')
            .map((item) => ({
              id: item.id,
              name: item.name,
              email: item.email,
              type: item.type as 'parent' | 'school',
              linkedAt: item.linkedAt,
            }));
          setLinkedAccounts(accounts);
        } else {
          setLinkedAccounts([]);
        }
      } catch (error) {
        console.error('Error fetching Firebase linked accounts:', error);
        setLinkedAccounts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLinkedAccounts();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Linked Accounts</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (linkedAccounts.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Linked Accounts</h3>
      </div>
      
      <div className="space-y-3">
        {linkedAccounts.map((account) => (
          <div 
            key={account.id}
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              account.type === 'school' 
                ? 'bg-blue-500/20 text-blue-500'
                : 'bg-emerald-500/20 text-emerald-500'
            }`}>
              {account.type === 'school' ? (
                <School className="w-5 h-5" />
              ) : (
                <UserCheck className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{account.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{account.type}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              disabled={unlinking === account.id}
              onClick={() => handleUnlink(account.id, account.name)}
            >
              {unlinking === account.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Unlink className="w-4 h-4" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
