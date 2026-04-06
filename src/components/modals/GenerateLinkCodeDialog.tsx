import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateLinkCodeFirebase, listActiveLinkCodesFirebase } from '@/integrations/firebase/linking';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Key, Copy, Check, RefreshCw, Clock, Loader2 } from 'lucide-react';

interface GenerateLinkCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorType: 'parent' | 'school';
}

interface LinkCode {
  id: string;
  code: string;
  expiresAt: string;
  usedBy: string | null;
  usedAt: string | null;
  createdAt: string;
}

export default function GenerateLinkCodeDialog({
  open,
  onOpenChange,
  creatorType,
}: GenerateLinkCodeDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeCodes, setActiveCodes] = useState<LinkCode[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (open && user?.id) {
      fetchActiveCodes();
    }
  }, [open, user?.id]);

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

  const handleGenerateCode = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const result = await generateLinkCodeFirebase(creatorType);
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
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopied(null), 2000);
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Generate Link Code
          </DialogTitle>
          <DialogDescription>
            Generate a code to share with {creatorType === 'parent' ? 'your child' : 'students'}.
            They can enter this code to link their account with yours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Button
            onClick={handleGenerateCode}
            disabled={loading}
            className="w-full gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Generate New Code
          </Button>

          {activeCodes.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Active Codes</p>
              {activeCodes.map((linkCode) => (
                <div
                  key={linkCode.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-mono text-lg font-bold tracking-widest text-foreground">
                      {linkCode.code}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="w-3 h-3" />
                      <span>Expires in {getTimeRemaining(linkCode.expiresAt)}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyCode(linkCode.code)}
                  >
                    {copied === linkCode.code ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground">
              <strong>How it works:</strong>
              <br />
              1. Generate a code above
              <br />
              2. Share the code with {creatorType === 'parent' ? 'your child' : 'your students'}
              <br />
              3. They enter the code in their dashboard to link
              <br />
              4. Codes expire after 24 hours
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
