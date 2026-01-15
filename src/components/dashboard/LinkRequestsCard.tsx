import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  UserPlus, 
  Check, 
  X, 
  Loader2, 
  Users, 
  School,
  Clock,
  Send,
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type LinkStatus = Database['public']['Enums']['link_status'];

interface LinkRequest {
  id: string;
  requester_id: string;
  target_id: string;
  status: LinkStatus;
  created_at: string;
  requesterName: string;
  requesterEmail: string;
  requesterType: 'parent' | 'school';
  isIncoming: boolean;
  targetName?: string;
  targetEmail?: string;
}

export default function LinkRequestsCard() {
  const { user, role } = useAuth();
  const [requests, setRequests] = useState<LinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!user?.id) return;

    // Fetch all pending requests involving this user
    const { data: requestsData, error } = await supabase
      .from('link_requests')
      .select('*')
      .eq('status', 'pending')
      .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`);

    if (error) {
      console.error('Error fetching link requests:', error);
      setLoading(false);
      return;
    }

    if (requestsData && requestsData.length > 0) {
      // Get all unique user IDs to fetch profiles
      const userIds = [
        ...new Set([
          ...requestsData.map(r => r.requester_id),
          ...requestsData.map(r => r.target_id),
        ]),
      ];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const enrichedRequests: LinkRequest[] = requestsData.map(req => {
        const requesterProfile = profiles?.find(p => p.id === req.requester_id);
        const targetProfile = profiles?.find(p => p.id === req.target_id);
        const requesterRole = roles?.find(r => r.user_id === req.requester_id);
        
        return {
          id: req.id,
          requester_id: req.requester_id,
          target_id: req.target_id,
          status: req.status,
          created_at: req.created_at,
          requesterName: requesterProfile?.name || 'Unknown',
          requesterEmail: requesterProfile?.email || '',
          requesterType: requesterRole?.role === 'school' ? 'school' : 'parent',
          isIncoming: req.target_id === user.id,
          targetName: targetProfile?.name,
          targetEmail: targetProfile?.email,
        };
      });

      setRequests(enrichedRequests);
    } else {
      setRequests([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [user?.id]);

  const handleAccept = async (request: LinkRequest) => {
    setProcessingId(request.id);

    // Update request status
    const { error: updateError } = await supabase
      .from('link_requests')
      .update({ status: 'accepted' as LinkStatus, updated_at: new Date().toISOString() })
      .eq('id', request.id);

    if (updateError) {
      console.error('Error accepting request:', updateError);
      toast.error('Failed to accept request');
      setProcessingId(null);
      return;
    }

    // Create the linked account
    const { error: linkError } = await supabase
      .from('linked_accounts')
      .insert({
        parent_or_school_id: request.requester_id,
        student_id: request.target_id,
      });

    if (linkError) {
      console.error('Error creating link:', linkError);
      toast.error('Failed to create link');
    } else {
      toast.success(`Connected with ${request.requesterName}!`);
      fetchRequests();
    }
    setProcessingId(null);
  };

  const handleReject = async (request: LinkRequest) => {
    setProcessingId(request.id);

    const { error } = await supabase
      .from('link_requests')
      .update({ status: 'rejected' as LinkStatus, updated_at: new Date().toISOString() })
      .eq('id', request.id);

    if (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } else {
      toast.success('Request declined');
      fetchRequests();
    }
    setProcessingId(null);
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Link Requests</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  const incomingRequests = requests.filter(r => r.isIncoming);
  const outgoingRequests = requests.filter(r => !r.isIncoming);

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Link Requests</h3>
        <span className="ml-auto bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
          {requests.length} pending
        </span>
      </div>

      <div className="space-y-4">
        {/* Incoming Requests */}
        {incomingRequests.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Incoming Requests
            </p>
            {incomingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  request.requesterType === 'school'
                    ? 'bg-blue-500/20 text-blue-500'
                    : 'bg-violet-500/20 text-violet-500'
                }`}>
                  {request.requesterType === 'school' ? (
                    <School className="w-5 h-5" />
                  ) : (
                    <Users className="w-5 h-5" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {request.requesterName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{request.requesterType}</span>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>{getTimeAgo(request.created_at)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(request)}
                    disabled={processingId === request.id}
                    className="h-8 w-8 p-0"
                  >
                    {processingId === request.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(request)}
                    disabled={processingId === request.id}
                    className="h-8 w-8 p-0"
                  >
                    {processingId === request.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Outgoing Requests */}
        {outgoingRequests.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Sent Requests
            </p>
            {outgoingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border border-border/50"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Send className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {request.targetName || 'Student'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Pending acceptance</span>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>{getTimeAgo(request.created_at)}</span>
                  </div>
                </div>

                <span className="px-2 py-1 bg-amber-500/10 text-amber-600 rounded-full text-xs font-medium">
                  Pending
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
