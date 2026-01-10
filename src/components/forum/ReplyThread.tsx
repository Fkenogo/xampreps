import { Lock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ForumReply {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { name: string };
}

interface ReplyThreadProps {
  replies: ForumReply[];
  canPost: boolean;
  isLocked: boolean;
  replyContent: string;
  onReplyContentChange: (content: string) => void;
  onSubmitReply: () => void;
  submittingReply: boolean;
}

export default function ReplyThread({
  replies,
  canPost,
  isLocked,
  replyContent,
  onReplyContentChange,
  onSubmitReply,
  submittingReply,
}: ReplyThreadProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">
        Replies ({replies.length})
      </h3>

      {replies.map((reply) => (
        <div key={reply.id} className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {reply.author?.name || 'Anonymous'}
            </span>
            <span>•</span>
            <span>{format(new Date(reply.created_at), 'MMM d, yyyy h:mm a')}</span>
          </div>
          <p className="text-foreground">{reply.content}</p>
        </div>
      ))}

      {canPost && !isLocked && (
        <div className="bg-card rounded-xl border border-border p-4">
          <Textarea
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => onReplyContentChange(e.target.value)}
            className="mb-3"
            rows={3}
          />
          <Button
            onClick={onSubmitReply}
            disabled={submittingReply || !replyContent.trim()}
          >
            {submittingReply && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Post Reply
          </Button>
        </div>
      )}

      {isLocked && (
        <div className="bg-muted rounded-xl p-4 text-center text-muted-foreground">
          <Lock className="w-5 h-5 mx-auto mb-2" />
          This post is locked and no longer accepting replies
        </div>
      )}
    </div>
  );
}
