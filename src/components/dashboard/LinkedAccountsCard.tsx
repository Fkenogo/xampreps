import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, UserCheck, School } from 'lucide-react';

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

  useEffect(() => {
    const fetchLinkedAccounts = async () => {
      if (!user?.id) return;

      // Fetch links where this student is linked
      const { data: links, error } = await supabase
        .from('linked_accounts')
        .select('id, parent_or_school_id, linked_at')
        .eq('student_id', user.id);

      if (error) {
        console.error('Error fetching linked accounts:', error);
        setLoading(false);
        return;
      }

      if (links && links.length > 0) {
        const parentOrSchoolIds = links.map(l => l.parent_or_school_id);

        // Fetch profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', parentOrSchoolIds);

        // Fetch roles to determine if parent or school
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', parentOrSchoolIds);

        if (profiles) {
          const accounts: LinkedAccount[] = links.map(link => {
            const profile = profiles.find(p => p.id === link.parent_or_school_id);
            const role = roles?.find(r => r.user_id === link.parent_or_school_id);
            
            return {
              id: link.id,
              name: profile?.name || 'Unknown',
              email: profile?.email || '',
              type: role?.role === 'school' ? 'school' : 'parent',
              linkedAt: link.linked_at,
            };
          });
          setLinkedAccounts(accounts);
        }
      }
      setLoading(false);
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
          </div>
        ))}
      </div>
    </div>
  );
}
