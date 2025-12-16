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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { UserPlus, Mail, Search, Loader2, Users } from 'lucide-react';

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function AddStudentDialog({ open, onOpenChange, onSuccess }: AddStudentDialogProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<{ id: string; name: string; email: string } | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    setSearchResult(null);
    setNotFound(false);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (!profile) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (role?.role !== 'student') {
      toast.error('This account is not a student account');
      setLoading(false);
      return;
    }

    const { data: existingLink } = await supabase
      .from('linked_accounts')
      .select('id')
      .eq('parent_or_school_id', user?.id)
      .eq('student_id', profile.id)
      .maybeSingle();

    if (existingLink) {
      toast.error('This student is already linked to your school');
      setLoading(false);
      return;
    }

    const { data: pendingRequest } = await supabase
      .from('link_requests')
      .select('id')
      .eq('requester_id', user?.id)
      .eq('target_id', profile.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingRequest) {
      toast.error('You already have a pending request for this student');
      setLoading(false);
      return;
    }

    setSearchResult(profile);
    setLoading(false);
  };

  const handleSendRequest = async () => {
    if (!searchResult || !user?.id) return;

    setLoading(true);

    const { error } = await supabase
      .from('link_requests')
      .insert({
        requester_id: user.id,
        target_id: searchResult.id,
        status: 'pending',
      });

    if (error) {
      toast.error('Failed to send link request');
    } else {
      toast.success('Link request sent to student');
      setEmail('');
      setSearchResult(null);
      onSuccess?.();
    }
    setLoading(false);
  };

  const handleBulkInvite = async () => {
    if (!bulkEmails.trim() || !user?.id) {
      toast.error('Please enter email addresses');
      return;
    }

    setLoading(true);
    const emails = bulkEmails.split(/[\n,]/).map(e => e.trim().toLowerCase()).filter(Boolean);
    
    let successCount = 0;
    let failCount = 0;

    for (const studentEmail of emails) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', studentEmail)
        .maybeSingle();

      if (profile) {
        const { data: existingLink } = await supabase
          .from('linked_accounts')
          .select('id')
          .eq('parent_or_school_id', user.id)
          .eq('student_id', profile.id)
          .maybeSingle();

        if (!existingLink) {
          const { error } = await supabase
            .from('link_requests')
            .insert({
              requester_id: user.id,
              target_id: profile.id,
              status: 'pending',
            });

          if (!error) successCount++;
          else failCount++;
        }
      } else {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Sent ${successCount} link request(s)`);
      setBulkEmails('');
      onSuccess?.();
    }
    if (failCount > 0) {
      toast.error(`${failCount} email(s) not found or already linked`);
    }
    setLoading(false);
  };

  const handleClose = () => {
    setEmail('');
    setBulkEmails('');
    setSearchResult(null);
    setNotFound(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Students
          </DialogTitle>
          <DialogDescription>
            Add students to your school by email
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="gap-2">
              <Mail className="w-4 h-4" />
              Single
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <Users className="w-4 h-4" />
              Bulk Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="student-email">Student Email</Label>
              <div className="flex gap-2">
                <Input
                  id="student-email"
                  type="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={loading} variant="secondary">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {notFound && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-500">
                  No student account found with this email.
                </p>
              </div>
            )}

            {searchResult && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-medium">
                    {searchResult.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{searchResult.name}</p>
                    <p className="text-sm text-muted-foreground">{searchResult.email}</p>
                  </div>
                </div>
                <Button onClick={handleSendRequest} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Send Link Request
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-emails">Student Emails</Label>
              <Textarea
                id="bulk-emails"
                placeholder="Enter emails separated by commas or new lines:&#10;student1@example.com&#10;student2@example.com"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Only students who have already registered will receive requests
              </p>
            </div>
            <Button onClick={handleBulkInvite} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Send Bulk Requests
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
