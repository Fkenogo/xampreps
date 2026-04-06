import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  generateLinkCodeFirebase,
  listActiveLinkCodesFirebase,
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { UserPlus, Mail, Search, Loader2, Users, Key, Copy, Check, RefreshCw, Clock } from 'lucide-react';

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface LinkCode {
  id: string;
  code: string;
  expiresAt: string;
  usedBy: string | null;
}

export default function AddStudentDialog({ open, onOpenChange, onSuccess }: AddStudentDialogProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<{ id: string; name: string; email: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeCodes, setActiveCodes] = useState<LinkCode[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchActiveCodes = async () => {
    if (!user?.id) return;
    try {
      const result = await listActiveLinkCodesFirebase();
      if (result.ok) {
        setActiveCodes(result.items || []);
      }
    } catch (error) {
      console.error('Error loading Firebase link codes:', error);
      toast.error('Failed to load active codes');
    }
  };

  const handleSearch = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    setSearchResult(null);
    setNotFound(false);

    try {
      const result = await searchLinkTargetFirebase(email, 'student');
      if (!result.ok || !result.target) {
        const reason = result.reason || 'not_found';
        if (reason === 'role_mismatch') {
          toast.error('This account is not a student account');
        } else if (reason === 'already_linked') {
          toast.error('This student is already linked to your school');
        } else if (reason === 'pending_exists') {
          toast.error('You already have a pending request for this student');
        } else {
          setNotFound(true);
        }
        setLoading(false);
        return;
      }
      setSearchResult({
        id: result.target.id,
        name: result.target.name,
        email: result.target.email,
      });
    } catch (error) {
      console.error('Firebase student search failed:', error);
      toast.error('Failed to search student');
    }
    setLoading(false);
  };

  const handleSendRequest = async () => {
    if (!searchResult || !user?.id) return;

    setLoading(true);

    try {
      const result = await sendLinkRequestFirebase(searchResult.id);
      if (result.ok) {
        toast.success('Link request sent to student');
        setEmail('');
        setSearchResult(null);
        onSuccess?.();
      } else {
        toast.error('Failed to send link request');
      }
    } catch (error) {
      console.error('Firebase send request failed:', error);
      toast.error('Failed to send link request');
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
      try {
        const result = await searchLinkTargetFirebase(studentEmail, 'student');
        if (!result.ok || !result.target) {
          failCount++;
          continue;
        }
        const requestResult = await sendLinkRequestFirebase(result.target.id);
        if (requestResult.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (_error) {
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

  const handleGenerateCode = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const result = await generateLinkCodeFirebase('school');
      if (result.ok) {
        toast.success('Link code generated!');
        await fetchActiveCodes();
      } else {
        toast.error('Failed to generate code');
      }
    } catch (error) {
      console.error('Error generating Firebase code:', error);
      toast.error('Failed to generate code');
    }
    setLoading(false);
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    toast.success('Code copied!');
    setTimeout(() => setCopied(null), 2000);
  };

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
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
            Add students to your school using codes or email
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="code" className="w-full" onValueChange={(v) => v === 'code' && fetchActiveCodes()}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="code" className="gap-2">
              <Key className="w-4 h-4" />
              Code
            </TabsTrigger>
            <TabsTrigger value="single" className="gap-2">
              <Mail className="w-4 h-4" />
              Single
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <Users className="w-4 h-4" />
              Bulk
            </TabsTrigger>
          </TabsList>

          <TabsContent value="code" className="space-y-4 py-4">
            <Button onClick={handleGenerateCode} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Generate School Code
            </Button>

            {activeCodes.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Active Codes</p>
                {activeCodes.map((linkCode) => (
                  <div key={linkCode.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                    <div>
                      <p className="font-mono text-lg font-bold tracking-widest text-foreground">{linkCode.code}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        <span>Expires in {getTimeRemaining(linkCode.expiresAt)}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => handleCopyCode(linkCode.code)}>
                      {copied === linkCode.code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">
                Share this code with students. They can enter it in their dashboard to join your school. Codes expire after 24 hours.
              </p>
            </div>
          </TabsContent>

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
                <p className="text-sm text-red-500">No student account found with this email.</p>
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
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
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
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Send Bulk Requests
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
