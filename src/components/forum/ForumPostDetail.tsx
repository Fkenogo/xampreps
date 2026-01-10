import { Pin, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import ReplyThread from './ReplyThread';

interface ForumReply {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { name: string };
}

interface ForumPostDetailProps {
  post: {
    id: string;
    title: string;
    content: string;
    author_id: string;
    is_pinned: boolean;
    is_locked: boolean;
    tags: string[];
    created_at: string;
    author?: { name: string };
  };
  replies: ForumReply[];
  canPost: boolean;
  replyContent: string;
  onReplyContentChange: (content: string) => void;
  onSubmitReply: () => void;
  submittingReply: boolean;
  onBack: () => void;
}

export default function ForumPostDetail({
  post,
  replies,
  canPost,
  replyContent,
  onReplyContentChange,
  onSubmitReply,
  submittingReply,
  onBack,
}: ForumPostDetailProps) {
  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-1"
      >
        ← Back to posts
      </Button>

      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {post.is_pinned && (
                <Badge variant="secondary" className="text-xs">
                  <Pin className="w-3 h-3 mr-1" />
                  Pinned
                </Badge>
              )}
              {post.is_locked && (
                <Badge variant="secondary" className="text-xs text-amber-600">
                  <Lock className="w-3 h-3 mr-1" />
                  Locked
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {post.title}
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{post.author?.name || 'Anonymous'}</span>
              <span>•</span>
              <span>{format(new Date(post.created_at), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>

        <MarkdownRenderer content={post.content} />

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {post.tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <ReplyThread
        replies={replies}
        canPost={canPost}
        isLocked={post.is_locked}
        replyContent={replyContent}
        onReplyContentChange={onReplyContentChange}
        onSubmitReply={onSubmitReply}
        submittingReply={submittingReply}
      />
    </div>
  );
}
